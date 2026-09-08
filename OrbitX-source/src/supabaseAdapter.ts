// The full Supabase SDK (auth + postgrest + realtime + storage) is lazy-loaded
// only when a data call actually happens, keeping it out of the initial bundle.
// Auth lives in ./supabaseAuth (auth-js only). The data client must be handed
// the SAME session as the auth client so PostgREST requests carry the user's
// access token; otherwise every read runs as an anonymous visitor and RLS
// policies that target the `authenticated` role return nothing.
import { authClient } from "./supabaseAuth";
import { RELATIONAL_MAP, rowToDoc, docPayloadForRel } from "./lib/relationalRegistry";
let _sbPromise: Promise<any> | null = null;
let _sbClient: any = null;

const syncSessionToDataClient = async (): Promise<void> => {
  try {
    const client = _sbClient;
    if (!client) return;
    const {
      data: { session },
    } = await authClient.getSession();
    if (session) {
      await client.auth.setSession(session);
    }
  } catch (e) {
    console.warn("[Supabase Compatibility] failed to sync auth session:", e);
  }
};

const getSupabase = (): Promise<any> => {
  if (!_sbPromise) {
    _sbPromise = (async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseAnonKey);
      _sbClient = client;
      await syncSessionToDataClient();
      return client;
    })();
  }
  return _sbPromise;
};

// Keep the data client's session in lockstep with the auth client so a login,
// logout or token refresh is immediately visible to all data reads.
if (typeof window !== "undefined") {
  authClient.onAuthStateChange((_event, session) => {
    if (!_sbClient) return;
    if (session) {
      _sbClient.auth.setSession(session).catch((e: any) =>
        console.warn("[Supabase Compatibility] session refresh failed:", e),
      );
    }
  });
}

// 1. Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-project-id.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

export const isRealSupabase = 
  import.meta.env.VITE_SUPABASE_URL && 
  !import.meta.env.VITE_SUPABASE_URL.includes("your-project-id") && 
  import.meta.env.VITE_SUPABASE_URL !== "https://your-project-id.supabase.co" &&
  import.meta.env.VITE_SUPABASE_ANON_KEY && 
  import.meta.env.VITE_SUPABASE_ANON_KEY !== "your-anon-key";

// True when the error means "RPC function not deployed yet" -> safe fallback
export const isRpcUnavailable = (err: any): boolean => {
  const code = String(err?.code || "");
  const msg = String(err?.message || "");
  return code === "PGRST202" || msg.includes("PGRST202") || msg.includes("Could not find the function");
};

// Server-side RPC helper. Returns { success, data, error }.
export const callRpc = async (fn: string, args: any) => {
  if (!isRealSupabase) {
    return { success: false, data: null, error: { code: "PGRST202", message: "RPC disabled (no real supabase)" } };
  }
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc(fn, args);
    return { success: !error, data, error };
  } catch (err) {
    return { success: false, data: null, error: err };
  }
};

// Server-verified admin check (admins table), with graceful fallback to the
// legacy hardcoded list while the security migration hasn't been applied yet.
const ADMIN_EMAILS = ["lumafashionhq@gmail.com", "abdalrahmanjarrah94@gmail.com", "abdalrahmanjarrah1@gmail.com"];
const adminEmailCache: Record<string, boolean> = {};
export const isAdminUser = async (email?: string | null): Promise<boolean> => {
  if (!email) return false;
  if (email in adminEmailCache) return adminEmailCache[email];

  if (isRealSupabase) {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from("admins")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      if (!error) {
        adminEmailCache[email] = !!data;
        return !!data;
      }
    } catch (e) {
      // table missing -> fall back below
    }
  }

  adminEmailCache[email] = ADMIN_EMAILS.includes(email);
  return adminEmailCache[email];
};

// Local storage fallback for seamless testing and offline-first persistence
export interface FallbackDoc {
  path: string;
  collection: string;
  id: string;
  data: any;
  updated_at: string;
}

const getLocalDocs = (): FallbackDoc[] => {
  try {
    const raw = localStorage.getItem("orbitx_fallback_db");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalDocs = (docs: FallbackDoc[]) => {
  try {
    localStorage.setItem("orbitx_fallback_db", JSON.stringify(docs));
    notifyListeners();
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
};

// In-memory optimistic cache: reads are instant, writes update UI immediately
// and persist to the network in the background.
const memoryDb = new Map<string, FallbackDoc>();
const collectionIndex = new Map<string, FallbackDoc[]>();
// Per-collection lazy hydration. Instead of downloading the entire documents
// table on first access, only the collections the app actually reads are
// fetched, each exactly once. This keeps logins light and bandwidth bounded
// as the table grows (sessions, messages, typing docs, ...).
const loadedScopes = new Set<string>();
const scopeLoadPromises = new Map<string, Promise<boolean>>();
const missingPaths = new Set<string>();

// --- Relational (users/profiles) bridge helpers ------------------------------
// These collections are served from real tables; everything else still lives in
// the `documents` fallback. Row timestamps arrive as ISO strings from PostgREST.
const isoOf = (v: any): string =>
  !v ? "" : typeof v === "string" ? v : new Date(v).toISOString();

const rowToCached = (scope: string, row: any): FallbackDoc => {
  const map = RELATIONAL_MAP[scope];
  return {
    path: scope + "/" + row[map.keyField],
    collection: scope,
    id: String(row[map.keyField]),
    data: rowToDoc(scope, row),
    updated_at: isoOf(row.updated_at),
  };
};

// One relational doc read; null on a genuine miss, throws on a server error.
const readRelDoc = async (collectionName: string, id: string): Promise<any | null> => {
  const map = RELATIONAL_MAP[collectionName];
  if (!map) return null;
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from(map.table)
    .select("*")
    .eq(map.keyField, id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

// Persist a users/profiles doc through the sanctioned RPC (server owns
// progression). Returns "ok" (persisted) | "missing" (RPC not deployed yet ->
// fall back to documents) | "error" (something failed -> keep locally).
const persistRelWrite = async (docRef: MockDocRef, docData: any): Promise<"ok" | "missing" | "error"> => {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.rpc("rel_register_user", {
      p_collection: docRef.collectionName,
      p_uid: docRef.id,
      p_doc: docPayloadForRel(docRef.collectionName, docData),
    });
    if (!error) return "ok";
    if (isRpcUnavailable(error)) return "missing";
    console.warn(`[Supabase Compatibility] relational persist failed on ${docRef.path}:`, error);
    return "error";
  } catch (e) {
    console.warn(`[Supabase Compatibility] relational persist threw on ${docRef.path}:`, e);
    return "error";
  }
};

const scopeKeyOfPath = (path: string): string => {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(0, i);
};

const isPathInLoadedScopes = (path: string): boolean => {
  for (const scope of loadedScopes) {
    if (path.startsWith(scope + "/")) return true;
  }
  return false;
};

const loadedCollectionNames = (): string[] =>
  Array.from(new Set(Array.from(loadedScopes).map((s) => s.slice(s.lastIndexOf("/") + 1))));

const rebuildIndex = () => {
  collectionIndex.clear();
  memoryDb.forEach(doc => {
    const list = collectionIndex.get(doc.collection);
    if (list) {
      list.push(doc);
    } else {
      collectionIndex.set(doc.collection, [doc]);
    }
  });
};

const setCached = (doc: FallbackDoc) => {
  memoryDb.set(doc.path, doc);
  missingPaths.delete(doc.path);
  const list = collectionIndex.get(doc.collection);
  if (list) {
    const i = list.findIndex(d => d.path === doc.path);
    if (i !== -1) {
      list[i] = doc;
    } else {
      list.push(doc);
    }
  } else {
    collectionIndex.set(doc.collection, [doc]);
  }
};

const removeCached = (doc: FallbackDoc) => {
  memoryDb.delete(doc.path);
  const list = collectionIndex.get(doc.collection);
  if (!list) return;
  const i = list.findIndex(d => d.path === doc.path);
  if (i !== -1) list.splice(i, 1);
};

// Fetch exactly one collection (not the whole table) and cache it in memory.
// Top-level collections are filtered by the collection column; nested ones are
// also filtered by their path prefix so we never pull sibling subcollections.
const ensureScopeLoaded = (colRef: MockColRef): Promise<boolean> => {
  const scope = colRef.path;
  if (loadedScopes.has(scope)) return Promise.resolve(true);
  const running = scopeLoadPromises.get(scope);
  if (running) return running;

  const p = (async (): Promise<boolean> => {
    try {
      const supabase = await getSupabase();

      // Relational collections (users / profiles): load the whole table once.
      if (RELATIONAL_MAP[scope] && !scope.includes("/")) {
        const map = RELATIONAL_MAP[scope];
        const { data, error } = await supabase.from(map.table).select("*");
        if (error) throw error;
        (data || []).forEach((row: any) => {
          if (row?.[map.keyField] == null) return;
          setCached(rowToCached(scope, row));
        });
        loadedScopes.add(scope);
        Array.from(missingPaths).forEach((pth) => {
          if (pth.startsWith(scope + "/")) missingPaths.delete(pth);
        });
        return true;
      }

      let builder: any = supabase
        .from("documents")
        .select("id, collection, path, data, updated_at")
        .eq("collection", colRef.collectionName);
      if (scope.includes("/")) {
        builder = builder.like("path", scope + "/%");
      }
      const { data, error } = await builder;
      if (error) throw error;
      (data || []).forEach((row: any) => {
        if (!row.path) return;
        setCached({
          path: row.path,
          collection: row.collection,
          id: row.id,
          data: row.data,
          updated_at: row.updated_at || ""
        });
      });
      loadedScopes.add(scope);
      Array.from(missingPaths).forEach((pth) => {
        if (pth.startsWith(scope + "/")) missingPaths.delete(pth);
      });
      return true;
    } catch (e) {
      console.warn(`[Supabase Compatibility] failed to load collection ${scope}:`, e);
      return false;
    } finally {
      scopeLoadPromises.delete(scope);
    }
  })();

  scopeLoadPromises.set(scope, p);
  return p;
};

// Single-doc server read used to merge writes safely when the doc isn't
// already in memory, so a partial update never wipes fields on the server.
const getServerDocData = async (path: string): Promise<any> => {
  try {
    const parts = path.split("/");
    const collectionName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];

    // Relational collections read from their real tables first.
    if (RELATIONAL_MAP[collectionName]) {
      const supabase = await getSupabase();
      const map = RELATIONAL_MAP[collectionName];
      const { data, error } = await supabase
        .from(map.table)
        .select("*")
        .eq(map.keyField, parts[parts.length - 1])
        .maybeSingle();
      if (error) throw error;
      return data ? rowToDoc(collectionName, data) : null;
    }

    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("documents")
      .select("data")
      .eq("path", path)
      .maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  } catch (e) {
    console.warn(`[Supabase Compatibility] server read failed for ${path}:`, e);
    return null;
  }
};

// Background sync watermark — only docs updated after this are re-fetched.
let lastSyncTime = 0;
let lastDeleteSweep = 0;

const refreshFromServer = async () => {
  try {
    if (loadedScopes.size === 0) return;
    const supabase = await getSupabase();
    const nowTs = Date.now();
    const sinceIso = new Date(lastSyncTime || 0).toISOString();
    const scopeCollections = loadedCollectionNames();
    const legacyCollections = scopeCollections.filter((c) => !RELATIONAL_MAP[c]);

    // 0) Relational delta sweep (users/profiles tables): rows changed since the
    //    last tick, then a slow deletion sweep kept for every scope.
    const relChanged: string[] = [];
    const relDeleted: string[] = [];
    for (const scope of Array.from(loadedScopes)) {
      if (!RELATIONAL_MAP[scope]) continue;
      const map = RELATIONAL_MAP[scope];
      const sweep = await supabase
        .from(map.table)
        .select("*")
        .gt("updated_at", sinceIso)
        .order("updated_at", { ascending: true })
        .limit(5000);
      if (sweep.error) throw sweep.error;
      (sweep.data || []).forEach((row: any) => {
        if (row?.[map.keyField] == null) return;
        const path = scope + "/" + row[map.keyField];
        const prev = memoryDb.get(path);
        const changedRemote = !prev || isoOf(prev.updated_at) !== isoOf(row.updated_at);
        if (changedRemote) {
          setCached(rowToCached(scope, row));
          missingPaths.delete(path);
          relChanged.push(path);
        }
      });
    }

    if (legacyCollections.length === 0) {
      // 1b) No documents-backed scopes are loaded: skip the legacy sweep.
      lastSyncTime = nowTs;
      rebuildIndex();
      notifyListeners(relChanged.length > 30 ? undefined : relChanged);
      return;
    }

    // 1) Delta sweep: metadata of ONLY docs that changed remotely since the
    //    last tick. Cost grows with real churn, never with total table size.
    const changed: string[] = [];
    const sweep = await supabase
      .from("documents")
      .select("id, collection, path, updated_at")
      .in("collection", legacyCollections)
      .gt("updated_at", sinceIso)
      .order("updated_at", { ascending: true })
      .limit(5000);
    if (sweep.error) throw sweep.error;

    const seen = new Set<string>();
    (sweep.data || []).forEach(row => {
      if (!row.path || !isPathInLoadedScopes(row.path)) return;
      seen.add(row.path);
      const prev = memoryDb.get(row.path);
      const changedRemote =
        !prev ||
        Date.parse(prev.updated_at || "") !== Date.parse(row.updated_at || "");
      if (changedRemote) {
        changed.push(row.path);
      }
    });

    // 2) Docs deleted remotely: full metadata sweep is expensive, so run it
    //    only every 10 minutes.
    if (nowTs - lastDeleteSweep > 10 * 60 * 1000) {
      lastDeleteSweep = nowTs;
      for (const scope of Array.from(loadedScopes)) {
        if (!RELATIONAL_MAP[scope]) continue;
        const map = RELATIONAL_MAP[scope];
        const all = await supabase.from(map.table).select(map.keyField);
        if (all.error) throw all.error;
        const alive = new Set<string>();
        (all.data || []).forEach((r: any) => {
          const id = r?.[map.keyField];
          if (id != null) alive.add(scope + "/" + id);
        });
        Array.from(memoryDb.keys()).forEach(path => {
          const segs = path.split("/");
          // Only top-level `scope/<id>` rows belong to the relational scope.
          if (segs.length === 2 && segs[0] === scope && !alive.has(path)) {
            memoryDb.delete(path);
            missingPaths.add(path);
            relDeleted.push(path);
          }
        });
      }
      const full = await supabase
        .from("documents")
        .select("path")
        .in("collection", legacyCollections);
      if (full.error) throw full.error;
      const alive = new Set<string>();
      (full.data || []).forEach((r: any) => {
        const p = r && r.path;
        if (p && isPathInLoadedScopes(p)) alive.add(p);
      });
      Array.from(memoryDb.keys()).forEach(path => {
        if (isPathInLoadedScopes(path) && !alive.has(path)) {
          changed.push(path);
          memoryDb.delete(path);
          missingPaths.add(path);
        }
      });
    }

    // 3) Only fetch full payloads for docs that actually changed remotely
    if (changed.length > 0) {
      let fetched: any[] = [];
      if (changed.length > 500) {
        const all = await supabase
          .from("documents")
          .select("id, collection, path, data, updated_at")
          .in("collection", legacyCollections);
        if (all.error) throw all.error;
        fetched = all.data || [];
      } else {
        const full = await supabase
          .from("documents")
          .select("id, collection, path, data, updated_at")
          .in("path", changed);
        if (full.error) throw full.error;
        fetched = full.data || [];
      }
      fetched.forEach(row => {
        if (!row.path) return;
        memoryDb.set(row.path, {
          path: row.path,
          collection: row.collection,
          id: row.id,
          data: row.data,
          updated_at: row.updated_at || ""
        });
        missingPaths.delete(row.path);
      });
    }

    lastSyncTime = nowTs;
    rebuildIndex();
    // Only re-render listeners whose data actually changed
    const allChanged = changed.concat(relChanged).concat(relDeleted);
    notifyListeners(allChanged.length > 30 ? undefined : allChanged);
  } catch (e) {
    console.warn("[Supabase Compatibility] background refresh failed:", e);
  }
};

const getCachedDocs = (colRef: MockColRef): FallbackDoc[] => {
  const base = collectionIndex.get(colRef.collectionName) || [];
  if (!colRef.path.includes("/")) {
    return base;
  }
  const prefix = colRef.path + "/";
  return base.filter(d => d.path.startsWith(prefix));
};

const listeners = new Set<{ cb: () => void; path: string }>();

let notifyTimer: any = null;
const notifyPending = new Set<{ cb: () => void; path: string }>();
const notifyListeners = (writtenPath?: string | string[]) => {
  const paths = Array.isArray(writtenPath) ? writtenPath : writtenPath ? [writtenPath] : null;
  listeners.forEach(l => {
    if (!paths) {
      notifyPending.add(l);
    } else if (paths.some(p =>
      l.path === p ||
      p.startsWith(l.path + "/") ||
      l.path.startsWith(p + "/")
    )) {
      notifyPending.add(l);
    }
  });

  if (notifyTimer) return;
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    const batch = Array.from(notifyPending);
    notifyPending.clear();
    batch.forEach(l => {
      try {
        l.cb();
      } catch (e) {
        console.error("Error in onSnapshot listener callback:", e);
      }
    });
  }, 80);
};

// 2. Firestore Sentinel FieldValues Mock
export class MockFieldValue {
  constructor(public type: "arrayUnion" | "arrayRemove" | "increment" | "serverTimestamp" | "deleteField", public payload?: any) {}
}

export class FirestoreError extends Error {
  constructor(message?: string, public code?: string) {
    super(message);
    this.name = "FirestoreError";
  }
}

export const arrayUnion = (...values: any[]) => new MockFieldValue("arrayUnion", values);
export const arrayRemove = (...values: any[]) => new MockFieldValue("arrayRemove", values);
export const increment = (n: number) => new MockFieldValue("increment", n);
export const serverTimestamp = () => new MockFieldValue("serverTimestamp");
export const deleteField = () => new MockFieldValue("deleteField");

// Helper to apply FieldValue updates to local JSON data
function applyFieldValues(existing: any, updates: any): any {
  if (!existing) existing = {};
  const result = { ...existing };

  for (const key in updates) {
    const val = updates[key];
    if (val instanceof MockFieldValue) {
      if (val.type === "serverTimestamp") {
        result[key] = new Date().toISOString();
      } else if (val.type === "deleteField") {
        delete result[key];
      } else if (val.type === "increment") {
        const current = Number(result[key]) || 0;
        result[key] = current + (val.payload || 0);
      } else if (val.type === "arrayUnion") {
        const current = Array.isArray(result[key]) ? result[key] : [];
        const toAdd = val.payload || [];
        const merged = [...current];
        for (const item of toAdd) {
          // Prevent duplicates by serializing objects or matching primitives
          const exists = merged.some(existingItem => 
            JSON.stringify(existingItem) === JSON.stringify(item)
          );
          if (!exists) merged.push(item);
        }
        result[key] = merged;
      } else if (val.type === "arrayRemove") {
        const current = Array.isArray(result[key]) ? result[key] : [];
        const toRemove = val.payload || [];
        result[key] = current.filter(existingItem => 
          !toRemove.some((remItem: any) => JSON.stringify(remItem) === JSON.stringify(existingItem))
        );
      }
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      result[key] = applyFieldValues(result[key], val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

// 3. Firestore References & Query Representation
export class MockDocRef {
  constructor(public db: any, public path: string, public id: string, public collectionName: string) {}
}

export class MockColRef {
  constructor(public db: any, public path: string, public collectionName: string) {}
}

export class MockQuery {
  constructor(public colRef: MockColRef, public constraints: any[] = []) {}
}

// Builders
export const doc = (parent: any, ...segments: string[]): MockDocRef => {
  let fullPath = "";
  if (parent instanceof MockColRef) {
    fullPath = parent.path + "/" + segments.join("/");
  } else {
    // parent is db, segments is [colName, docId] or nested
    fullPath = segments.join("/");
  }
  const parts = fullPath.split("/");
  const collectionName = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  const id = parts[parts.length - 1];
  return new MockDocRef(null, fullPath, id, collectionName);
};

export const collection = (db: any, ...segments: string[]): MockColRef => {
  const fullPath = segments.join("/");
  const collectionName = segments[segments.length - 1];
  return new MockColRef(null, fullPath, collectionName);
};

export const query = (colRef: MockColRef, ...constraints: any[]): MockQuery => {
  return new MockQuery(colRef, constraints);
};

// Query Constraints
export const where = (field: any, op: string, value: any) => ({
  type: "where",
  field: typeof field === "function" ? field() : String(field),
  op,
  value
});
export const orderBy = (field: string, direction: "asc" | "desc" = "asc") => ({ type: "orderBy", field, direction });
export const limit = (n: number) => ({ type: "limit", n });
export const documentId = () => "__documentId__";

// 4. Snapshots Emulation
export class MockDocSnapshot {
  constructor(private _exists: boolean, private _id: string, private _data: any, public ref: MockDocRef | null = null) {}
  id = this._id;
  exists() { return this._exists; }
  data() { return this._data || null; }
  get(field: string) { return this._data ? this._data[field] : undefined; }
}

export class MockQuerySnapshot {
  constructor(public docs: MockDocSnapshot[]) {}
  get empty() { return this.docs.length === 0; }
  get size() { return this.docs.length; }
  forEach(callback: (doc: MockDocSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

// 5. Database CRUD APIs (Using Single 'documents' JSONB Table) with Offline Fallback
export const getDoc = async (docRef: MockDocRef): Promise<MockDocSnapshot> => {
  const fromLocal = (): MockDocSnapshot => {
    const local = getLocalDocs().find(d => d.path === docRef.path);
    if (!local) {
      return new MockDocSnapshot(false, docRef.id, null, docRef);
    }
    return new MockDocSnapshot(true, docRef.id, local.data, docRef);
  };

  if (!isRealSupabase) {
    return fromLocal();
  }

  // Fast path: single-doc read must NOT download the whole table. Fetch just
  // this one path directly; the collection it belongs to loads lazily when the
  // app actually queries it.
  const cached = memoryDb.get(docRef.path);
  if (cached && cached.data != null) {
    return new MockDocSnapshot(true, docRef.id, cached.data, docRef);
  }
  if (missingPaths.has(docRef.path) || loadedScopes.has(scopeKeyOfPath(docRef.path))) {
    return new MockDocSnapshot(false, docRef.id, null, docRef);
  }

  // Relational collections read straight from their table (users/profiles).
  if (RELATIONAL_MAP[docRef.collectionName]) {
    try {
      const row = await readRelDoc(docRef.collectionName, docRef.id);
      if (row) {
        setCached(rowToCached(docRef.collectionName, row));
        return new MockDocSnapshot(true, docRef.id, rowToDoc(docRef.collectionName, row), docRef);
      }
      missingPaths.add(docRef.path);
    } catch (e) {
      console.warn(`[Supabase Compatibility] relational getDoc failed for ${docRef.path}:`, e);
    }
    return fromLocal();
  }

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("documents")
      .select("id, collection, path, data, updated_at")
      .eq("path", docRef.path)
      .maybeSingle();
    if (!error && data) {
      setCached({
        path: data.path,
        collection: data.collection,
        id: data.id,
        data: data.data,
        updated_at: data.updated_at || ""
      });
      return new MockDocSnapshot(true, docRef.id, data.data, docRef);
    }
    // If this doc truly does not exist server-side, record the miss so the
    // exact doc we queried won't hit the network again; a scope load, a
    // refresh or a write to this path will correct it.
    if (!error) {
      missingPaths.add(docRef.path);
    }
  } catch (e) {
    console.warn(`[Supabase Compatibility] direct getDoc failed for ${docRef.path}:`, e);
  }

  return fromLocal();
};

export const getDocs = async (queryOrCol: MockColRef | MockQuery): Promise<MockQuerySnapshot> => {
  const colRef = queryOrCol instanceof MockColRef ? queryOrCol : queryOrCol.colRef;
  const constraints = queryOrCol instanceof MockQuery ? queryOrCol.constraints : [];

  const runInMemoryFilter = (rawDocs: FallbackDoc[]) => {
    let documents = rawDocs
      .filter(d => d.collection === colRef.collectionName)
      .map(row => ({
        id: row.id,
        data: row.data,
        path: row.path
      }));

    // If query is for a subcollection, match path
    if (colRef.path.includes("/")) {
      const prefix = colRef.path + "/";
      documents = documents.filter(d => d.path.startsWith(prefix));
    }

    // Apply where constraints
    for (const constraint of constraints) {
      if (constraint.type === "where") {
        const { field, op, value } = constraint;
        documents = documents.filter(doc => {
          const docVal = field === "__documentId__" ? doc.id : (doc.data ? doc.data[field] : undefined);
          if (op === "==") return docVal === value;
          if (op === "!=") return docVal !== value;
          if (op === ">") return docVal > value;
          if (op === "<") return docVal < value;
          if (op === ">=") return docVal >= value;
          if (op === "<=") return docVal <= value;
          if (op === "array-contains") return Array.isArray(docVal) && docVal.includes(value);
          if (op === "in") return Array.isArray(value) && value.includes(docVal);
          return true;
        });
      }
    }

    // Apply ordering constraints
    const orderConstraint = constraints.find(c => c.type === "orderBy");
    if (orderConstraint) {
      const { field, direction } = orderConstraint;
      documents.sort((a, b) => {
        const valA = a.data ? a.data[field] : undefined;
        const valB = b.data ? b.data[field] : undefined;
        if (valA === valB) return 0;
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        const comp = valA > valB ? 1 : -1;
        return direction === "asc" ? comp : -comp;
      });
    }

    // Apply limit
    const limitConstraint = constraints.find(c => c.type === "limit");
    if (limitConstraint) {
      documents = documents.slice(0, limitConstraint.n);
    }

    const snapshots = documents.map(d => new MockDocSnapshot(true, d.id, d.data, doc(colRef, d.id)));
    return new MockQuerySnapshot(snapshots);
  };

  if (!isRealSupabase) {
    return runInMemoryFilter(getLocalDocs());
  }

  const loaded = await ensureScopeLoaded(colRef);
  if (loaded) {
    return runInMemoryFilter(getCachedDocs(colRef));
  }
  return runInMemoryFilter(getLocalDocs());
};

// Top-level increment() sentinels inside an update payload
const extractIncrementFields = (updates: any): { field: string; amount: number }[] => {
  const out: { field: string; amount: number }[] = [];
  for (const key in updates) {
    const val = updates[key];
    if (val instanceof MockFieldValue && val.type === "increment") {
      out.push({ field: key, amount: Number(val.payload) || 0 });
    }
  }
  return out;
};

// Persist a write that contains increment() sentinels. Increments are applied
// ATOMICALLY on the server via the increment_document_field RPC (never as a
// client-computed sum, which causes lost updates). Non-increment fields are
// then written as a partial document so the server's incremented value is
// never overwritten. Returns true when fully handled server-side.
const persistIncremental = async (docRef: MockDocRef, updates: any, finalData: any): Promise<boolean> => {
  const increments = extractIncrementFields(updates);
  if (increments.length === 0) return false;

  const supabase = await getSupabase();
  for (const inc of increments) {
    const { error } = await supabase.rpc("increment_document_field", {
      p_path: docRef.path,
      p_field: inc.field,
      p_amount: inc.amount,
    });
    if (error) {
      if (!isRpcUnavailable(error)) {
        console.warn(`[Supabase Compatibility] atomic increment failed on ${docRef.path}.${inc.field}:`, error);
      }
      return false; // fall back to the legacy whole-document write
    }
  }

  const nonIncFields = Object.keys(updates).filter(
    (k) => !(updates[k] instanceof MockFieldValue && updates[k].type === "increment"),
  );
  if (nonIncFields.length === 0) return true; // increments only -> nothing else to persist

  const nonIncData: any = { ...finalData };
  for (const inc of increments) delete nonIncData[inc.field];

  const { error } = await supabase
    .from("documents")
    .upsert({
      path: docRef.path,
      collection: docRef.collectionName,
      id: docRef.id,
      data: nonIncData,
      updated_at: new Date().toISOString()
    }, { onConflict: "path" });

  if (error) {
    console.warn(`[Supabase Compatibility] partial write failed on ${docRef.path}:`, error);
    return false;
  }
  return true;
};

export const setDoc = async (docRef: MockDocRef, data: any, options?: { merge?: boolean }): Promise<void> => {
  const applyLocalSet = () => {
    const localDocs = getLocalDocs();
    const index = localDocs.findIndex(d => d.path === docRef.path);
    let finalData = data;
    if (options?.merge && index !== -1) {
      finalData = applyFieldValues(localDocs[index].data, data);
    } else {
      finalData = applyFieldValues({}, data);
    }

    const newDoc: FallbackDoc = {
      path: docRef.path,
      collection: docRef.collectionName,
      id: docRef.id,
      data: finalData,
      updated_at: new Date().toISOString()
    };

    if (index !== -1) {
      localDocs[index] = newDoc;
    } else {
      localDocs.push(newDoc);
    }
    saveLocalDocs(localDocs);
  };

  if (!isRealSupabase) {
    applyLocalSet();
    return;
  }

  let finalData = data;
  if (options?.merge) {
    const current = memoryDb.get(docRef.path);
    let base = current?.data;
    if (base == null && !missingPaths.has(docRef.path)) {
      const serverData = await getServerDocData(docRef.path);
      base = serverData != null ? serverData : getLocalDocs().find(d => d.path === docRef.path)?.data;
    }
    finalData = applyFieldValues(base || {}, data);
  } else {
    finalData = applyFieldValues({}, data);
  }

  // Optimistic commit: update UI instantly, persist to network in the background
  setCached({
    path: docRef.path,
    collection: docRef.collectionName,
    id: docRef.id,
    data: finalData,
    updated_at: new Date().toISOString()
  });
  notifyListeners(docRef.path);

  // Relational collections persist through the sanctioned RPC.
  if (RELATIONAL_MAP[docRef.collectionName]) {
    const res = await persistRelWrite(docRef, finalData);
    if (res === "ok") return;
    if (res === "error") {
      applyLocalSet();
      return;
    }
    // res === "missing" -> migration not applied yet, fall back to documents
  }

  if (options?.merge) {
    const handled = await persistIncremental(docRef, data, finalData);
    if (handled) return;
  }

  try {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from("documents")
      .upsert({
        path: docRef.path,
        collection: docRef.collectionName,
        id: docRef.id,
        data: finalData,
        updated_at: new Date().toISOString()
      }, { onConflict: "path" });

    if (error) throw error;
  } catch (err) {
    console.warn(`[Supabase Compatibility] setDoc failed on ${docRef.path}, storing locally:`, err);
    applyLocalSet();
  }
};

export const updateDoc = async (docRef: MockDocRef, updates: any): Promise<void> => {
  const applyLocalUpdate = () => {
    const localDocs = getLocalDocs();
    const index = localDocs.findIndex(d => d.path === docRef.path);
    const currentData = index !== -1 ? localDocs[index].data : {};
    const finalData = applyFieldValues(currentData, updates);

    const newDoc: FallbackDoc = {
      path: docRef.path,
      collection: docRef.collectionName,
      id: docRef.id,
      data: finalData,
      updated_at: new Date().toISOString()
    };

    if (index !== -1) {
      localDocs[index] = newDoc;
    } else {
      localDocs.push(newDoc);
    }
    saveLocalDocs(localDocs);
  };

  if (!isRealSupabase) {
    applyLocalUpdate();
    return;
  }

  const current = memoryDb.get(docRef.path);
  let currentData = current?.data;
  if (currentData == null && !missingPaths.has(docRef.path)) {
    const serverData = await getServerDocData(docRef.path);
    currentData = serverData != null ? serverData : getLocalDocs().find(d => d.path === docRef.path)?.data;
  }
  const finalData = applyFieldValues(currentData || {}, updates);

  // Optimistic commit: update UI instantly, persist to network in the background
  setCached({
    path: docRef.path,
    collection: docRef.collectionName,
    id: docRef.id,
    data: finalData,
    updated_at: new Date().toISOString()
  });
  notifyListeners(docRef.path);

  // Relational collections persist through the sanctioned RPC.
  if (RELATIONAL_MAP[docRef.collectionName]) {
    const res = await persistRelWrite(docRef, finalData);
    if (res === "ok") return;
    if (res === "error") {
      applyLocalUpdate();
      return;
    }
    // res === "missing" -> migration not applied yet, fall back to documents
  }

  const handled = await persistIncremental(docRef, updates, finalData);
  if (handled) return;

  try {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from("documents")
      .upsert({
        path: docRef.path,
        collection: docRef.collectionName,
        id: docRef.id,
        data: finalData,
        updated_at: new Date().toISOString()
      }, { onConflict: "path" });

    if (error) throw error;
  } catch (err) {
    console.warn(`[Supabase Compatibility] updateDoc failed on ${docRef.path}, storing locally:`, err);
    applyLocalUpdate();
  }
};

export const addDoc = async (colRef: MockColRef, data: any): Promise<MockDocRef> => {
  const randomId = "id_" + Math.random().toString(36).substr(2, 9);
  const docRef = doc(colRef, randomId);
  await setDoc(docRef, data);
  return docRef;
};

export const deleteDoc = async (docRef: MockDocRef): Promise<void> => {
  const applyLocalDelete = () => {
    const localDocs = getLocalDocs();
    const filtered = localDocs.filter(d => d.path !== docRef.path);
    saveLocalDocs(filtered);
  };

  if (!isRealSupabase) {
    applyLocalDelete();
    return;
  }

  // Optimistic delete: update UI instantly, persist to network in the background
  const existing = memoryDb.get(docRef.path);
  if (existing) {
    removeCached(existing);
  } else {
    memoryDb.delete(docRef.path);
  }
  missingPaths.add(docRef.path);
  notifyListeners(docRef.path);

  try {
    const supabase = await getSupabase();

    // Relational collections delete from their real table.
    if (RELATIONAL_MAP[docRef.collectionName]) {
      const map = RELATIONAL_MAP[docRef.collectionName];
      const { error } = await supabase
        .from(map.table)
        .delete()
        .eq(map.keyField, docRef.id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("path", docRef.path);

    if (error) throw error;
  } catch (err) {
    console.warn(`[Supabase Compatibility] deleteDoc failed on ${docRef.path}, removing locally:`, err);
    applyLocalDelete();
  }
};

// Realtime-free snapshot listener with local event-pubsub and resource-friendly smart polling
const getListenerPath = (queryOrDoc: MockDocRef | MockColRef | MockQuery): string => {
  if (queryOrDoc instanceof MockDocRef) return queryOrDoc.path;
  if (queryOrDoc instanceof MockColRef) return queryOrDoc.path;
  return queryOrDoc.colRef.path;
};

// Diff-based docChanges() support: remembers the last set of doc ids per listener
// path and reports added/removed docs on the next snapshot.
const snapshotDocHistory = new Map<string, string[]>();

const attachDocChanges = (path: string, snap: MockQuerySnapshot): MockQuerySnapshot => {
  const prevIds = snapshotDocHistory.get(path) || [];
  const curIds = snap.docs.map(d => d.id);
  snapshotDocHistory.set(path, curIds);
  (snap as any).docChanges = () => {
    const changes: any[] = [];
    curIds.forEach(id => {
      if (!prevIds.includes(id)) {
        const d = snap.docs.find(x => x.id === id);
        changes.push({ type: "added", doc: { id, data: () => (d ? d.data() : null) } });
      }
    });
    prevIds.forEach(id => {
      if (!curIds.includes(id)) {
        changes.push({ type: "removed", doc: { id, data: () => null } });
      }
    });
    return changes;
  };
  return snap;
};

export const onSnapshot = (
  queryOrDoc: MockDocRef | MockColRef | MockQuery,
  onNext: (snap: any) => void,
  onError?: (err: any) => void
) => {
  const isDoc = queryOrDoc instanceof MockDocRef;
  const listenerPath = getListenerPath(queryOrDoc);

  // 1. Fire initial data load
  if (isDoc) {
    getDoc(queryOrDoc as MockDocRef).then(onNext).catch(onError);
  } else {
    getDocs(queryOrDoc as MockColRef | MockQuery)
      .then((s) => attachDocChanges(listenerPath, s))
      .then(onNext)
      .catch(onError);
  }

  // Always register local callback to allow instant client-side updates upon local writes
  const localCb = () => {
    if (isDoc) {
      getDoc(queryOrDoc as MockDocRef).then(onNext).catch(onError);
    } else {
      getDocs(queryOrDoc as MockColRef | MockQuery)
        .then((s) => attachDocChanges(listenerPath, s))
        .then(onNext)
        .catch(onError);
    }
  };
  const listener = { cb: localCb, path: listenerPath };
  listeners.add(listener);

  // Return unsubscribe handler
  return () => {
    listeners.delete(listener);
  };
};

// Global refresh: one gentle request every 45s (only while the window is focused
// and at least one listener is active) catches remote changes for all listeners
// at once instead of polling per listener.
if (isRealSupabase) {
  setInterval(() => {
    if (listeners.size === 0) {
      return;
    }
    if (typeof document !== "undefined" && document.hidden) {
      return;
    }
    refreshFromServer();
  }, 45000);
}

// Transactions Support (Simple Lock-free execution wrapper)
export const runTransaction = async (dbInstance: any, updateFunction: (transaction: any) => Promise<any>): Promise<any> => {
  const transactionObj = {
    get: async (docRef: MockDocRef) => getDoc(docRef),
    set: async (docRef: MockDocRef, data: any, options?: any) => setDoc(docRef, data, options),
    update: async (docRef: MockDocRef, data: any) => updateDoc(docRef, data),
    delete: async (docRef: MockDocRef) => deleteDoc(docRef)
  };
  return await updateFunction(transactionObj);
};

export const writeBatch = (_dbInstance?: any) => {
  const operations: (() => Promise<void>)[] = [];
  return {
    set: (docRef: MockDocRef, data: any, options?: any) => {
      operations.push(() => setDoc(docRef, data, options));
    },
    update: (docRef: MockDocRef, data: any) => {
      operations.push(() => updateDoc(docRef, data));
    },
    delete: (docRef: MockDocRef) => {
      operations.push(() => deleteDoc(docRef));
    },
    commit: async () => {
      for (const op of operations) {
        await op();
      }
    }
  };
};


// 6. Auth Emulation APIs — implemented in ./supabaseAuth (auth-js only) to
// keep the full Supabase SDK out of the initial bundle. Re-exported here so
// firebase.ts and other call sites keep working unchanged.
export {
  auth,
  getAuth,
  mapSupabaseUser,
  signInWithPopup,
  signOut,
  signInAnonymously,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  updateEmail,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  OAuthProvider,
  EmailAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
} from "./supabaseAuth";

// 7. Global Exports
export const db = {};
export const initializeApp = (_config?: any) => ({});
export const getFirestore = (_app?: any, _databaseId?: any) => db;
export const initializeFirestore = (_app?: any, _settings?: any, _databaseId?: any) => db;
export const disableNetwork = async () => {};
export const getDocFromServer = getDoc;
