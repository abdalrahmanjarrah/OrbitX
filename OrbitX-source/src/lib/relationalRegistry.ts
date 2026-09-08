// =============================================================================
// Relational Registry — the bridge between Firestore-style app collections and
// the relational tables created by 20260909000000_relational_complete.sql
//
// Only top-level collections listed here are served from real tables today.
// Everything else keeps using the legacy `documents` JSONB fallback, so this
// migration is additive and safe: users + profiles move first (fixes the chest
// XP visibility bug), the rest can follow table by table later.
// =============================================================================

export interface RelationMap {
  table: string;
  keyField: string;
  // Exact Firestore field name per relational column (reverse-camelCase is
  // lossy, so the mapping is explicit).
  columns: Record<string, string>;
  // Fields that must NEVER come from the client (server-authoritative):
  progression: string[];
}

export const USERS_COLUMNS: Record<string, string> = {
  uid: "uid",
  displayname: "displayName",
  email: "email",
  photourl: "photoURL",
  bio: "bio",
  level: "level",
  xp: "xp",
  hearts: "hearts",
  coins: "coins",
  role: "role",
  missionrole: "missionRole",
  completedwizard: "completedWizard",
  dailyfocustarget: "dailyFocusTarget",
  inventory: "inventory",
  items: "items",
  equippeditems: "equippedItems",
  badges: "badges",
  friendscount: "friendsCount",
  banned: "banned",
  currentactivity: "currentActivity",
  streak: "streak",
  lastactivetime: "lastActiveTime",
  lastactivedate: "lastActiveDate",
  lastdailyreward: "lastDailyReward",
  laststudydate: "lastStudyDate",
  totalfocustime: "totalFocusTime",
  totalfocusminutes: "totalFocusMinutes",
  focussessions: "focusSessions",
  totalfocussessions: "totalFocusSessions",
  fleetid: "fleetId",
  fleetinvites: "fleetInvites",
  challengewins: "challengeWins",
  challengechampexpiry: "challengeChampExpiry",
  isguest: "isGuest",
  weekstart: "weekStart",
  weekfocusminutes: "weekFocusMinutes",
  weeksessions: "weekSessions",
  blackholeclaimedweek: "blackHoleClaimedWeek",
  invitedby: "invitedBy",
  referralsrewarded: "referralsRewarded",
  timechests: "timeChests",
  extra: "extra",
};

export const PROFILES_COLUMNS: Record<string, string> = {
  uid: "uid",
  displayname: "displayName",
  photourl: "photoURL",
  bio: "bio",
  level: "level",
  xp: "xp",
  role: "role",
  streak: "streak",
  friendscount: "friendsCount",
  banned: "banned",
  currentactivity: "currentActivity",
  lastactivetime: "lastActiveTime",
  lastactivedate: "lastActiveDate",
  totalfocussessions: "totalFocusSessions",
  missionrole: "missionRole",
  badges: "badges",
  extra: "extra",
};

// =============================================================================
// Table-backed collections — the same bridge for collections that live on a
// dedicated relational table (not the documents JSONB fallback) but DON'T go
// through the users/profiles RPC. admin_alerts is the first migration target.
// =============================================================================

export interface TableCollectionMap {
  table: string;
  keyField: string;
  rowToDoc: (row: any) => any;
  docToRow: (doc: any) => any;
}

const adminAlertsRowToDoc = (row: any): any => ({
  id: row.id,
  adminId: row.adminid || "",
  message: row.message || "",
  createdAt: row.createdat ?? 0,
  expiresAt: row.extra?.expiresAt ?? 0,
});

const adminAlertsDocToRow = (doc: any): any => ({
  id: doc.id,
  adminid: doc.adminId || "",
  message: doc.message || "",
  createdat: typeof doc.createdAt === "number" ? doc.createdAt : Date.now(),
  extra: {
    expiresAt:
      typeof doc.expiresAt === "number" ? doc.expiresAt : Date.now() + 10 * 60 * 1000,
  },
});

const roomMs = (v: any): number | null => {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && typeof v.seconds === "number") {
    return v.seconds * 1000 + (v.nanoseconds ? v.nanoseconds / 1e6 : 0);
  }
  const n = Date.parse(String(v));
  return Number.isNaN(n) ? null : n;
};

export const roomsRowToDoc = (row: any): any => {
  const doc: any = {
    id: row.id,
    name: row.name || "",
    task: row.task || "",
    creatorId: row.creatorid || "",
    creatorName: row.creatorname || "",
    participants: Array.isArray(row.participants) ? row.participants : [],
    maxParticipants: row.maxparticipants ?? 8,
    timerStatus: row.timerstatus || "idle",
    timerDuration: row.timerduration ?? 25,
    breakDuration: row.breakduration ?? 5,
    isChatLocked: row.ischatlocked ?? false,
    isPrivate: row.isprivate ?? false,
    isChallenge: row.ischallenge ?? false,
  };
  if (row.imageurl !== null && row.imageurl !== undefined) doc.imageUrl = row.imageurl;
  if (row.hostid !== null && row.hostid !== undefined) doc.hostId = row.hostid;
  if (row.starttime !== null && row.starttime !== undefined) doc.startTime = row.starttime;
  if (row.createdat !== null && row.createdat !== undefined) doc.createdAt = row.createdat;
  if (row.emptyat !== null && row.emptyat !== undefined) doc.emptyAt = row.emptyat;
  if (row.sharednotes !== null && row.sharednotes !== undefined) doc.sharedNotes = row.sharednotes;
  if (row.accumulatedfocusseconds !== null && row.accumulatedfocusseconds !== undefined)
    doc.accumulatedFocusSeconds = row.accumulatedfocusseconds;
  if (row.joincode !== null && row.joincode !== undefined) doc.joinCode = row.joincode;
  if (row.challengeid !== null && row.challengeid !== undefined) doc.challengeId = row.challengeid;
  if (row.challengedurationminutes !== null && row.challengedurationminutes !== undefined)
    doc.challengeDurationMinutes = row.challengedurationminutes;
  if (row.updated_at) doc.updatedAt = row.updated_at;
  if (row.extra && typeof row.extra === "object") {
    for (const k of Object.keys(row.extra)) {
      if (!(k in doc)) doc[k] = row.extra[k];
    }
  }
  return doc;
};

const KNOWN_ROOM_KEYS = new Set([
  "id", "name", "task", "imageUrl", "creatorId", "creatorName", "hostId",
  "participants", "maxParticipants", "timerStatus", "timerDuration", "breakDuration",
  "startTime", "createdAt", "emptyAt", "sharedNotes", "accumulatedFocusSeconds",
  "isChatLocked", "isPrivate", "joinCode", "isChallenge", "challengeId",
  "challengeDurationMinutes", "extra", "updatedAt",
]);

export const roomsDocToRow = (doc: any): any => {
  const row: any = {
    id: doc.id,
    name: doc.name ?? "",
    task: doc.task ?? "",
    creatorid: doc.creatorId ?? "",
    creatorname: doc.creatorName ?? "",
    participants: Array.isArray(doc.participants) ? doc.participants : [],
    maxparticipants: doc.maxParticipants ?? 8,
    timerstatus: doc.timerStatus ?? "idle",
    timerduration: doc.timerDuration ?? 25,
    breakduration: doc.breakDuration ?? 5,
    ischatlocked: doc.isChatLocked ?? false,
    isprivate: doc.isPrivate ?? false,
    ischallenge: doc.isChallenge ?? false,
  };
  if ("imageUrl" in doc) row.imageurl = doc.imageUrl;
  if ("hostId" in doc) row.hostid = doc.hostId ?? null;
  if ("startTime" in doc) row.starttime = roomMs(doc.startTime);
  if ("createdAt" in doc) row.createdat = roomMs(doc.createdAt);
  row.emptyat = roomMs(doc.emptyAt);
  if ("sharedNotes" in doc) row.sharednotes = doc.sharedNotes ?? null;
  if ("accumulatedFocusSeconds" in doc) row.accumulatedfocusseconds = doc.accumulatedFocusSeconds ?? null;
  if ("joinCode" in doc) row.joincode = doc.joinCode ?? null;
  if ("challengeId" in doc) row.challengeid = doc.challengeId ?? null;
  if ("challengeDurationMinutes" in doc) row.challengedurationminutes = doc.challengeDurationMinutes ?? null;
  const extra: any = {};
  for (const k of Object.keys(doc)) {
    if (KNOWN_ROOM_KEYS.has(k)) continue;
    extra[k] = doc[k];
  }
  row.extra = extra;
  return row;
};

export const TABLE_COLLECTIONS: Record<string, TableCollectionMap> = {
  admin_alerts: {
    table: "admin_alerts",
    keyField: "id",
    rowToDoc: adminAlertsRowToDoc,
    docToRow: adminAlertsDocToRow,
  },
  rooms: {
    table: "rooms",
    keyField: "id",
    rowToDoc: roomsRowToDoc,
    docToRow: roomsDocToRow,
  },
};

export const RELATIONAL_MAP: Record<string, RelationMap> = {
  users: {
    table: "users",
    keyField: "uid",
    columns: USERS_COLUMNS,
    progression: ["xp", "level", "coins", "hearts", "lastXpUpdate", "lastFocusXpUpdate", "lastForcedGrantAt"],
  },
  profiles: {
    table: "profiles",
    keyField: "uid",
    columns: PROFILES_COLUMNS,
    progression: ["xp", "level"],
  },
};

export const isRelationalCollection = (collection: string): boolean =>
  !!RELATIONAL_MAP[collection];

// Relational row -> Firestore-style document (with extra merged back).
export const rowToDoc = (collection: string, row: any): any => {
  const map = RELATIONAL_MAP[collection];
  if (!map || !row) return row || null;
  const doc: any = {};
  for (const col of Object.keys(map.columns)) {
    if (row[col] === undefined || row[col] === null) continue;
    if (col === "extra") continue;
    doc[map.columns[col]] = row[col];
  }
  const extra = row.extra;
  if (extra && typeof extra === "object") {
    for (const k of Object.keys(extra)) {
      if (!(k in doc)) doc[k] = extra[k];
    }
  }
  return doc;
};

// Firestore-style document -> JSON payload for the rel_register_user RPC.
// Progression + role fields are dropped (the server owns them), unknown fields
// are pushed into `extra`.
export const docPayloadForRel = (collection: string, doc: any): any => {
  const map = RELATIONAL_MAP[collection];
  if (!map) return doc || null;
  const payload: any = {};
  const extra: any = {};
  for (const key of Object.keys(doc || {})) {
    if (!key || key === "extra") continue;
    const col = key.toLowerCase();
    const known = map.columns[col];
    if (known && !map.progression.includes(known) && known !== "role") {
      payload[col] = doc[key];
    } else {
      const realName = map.columns[col];
      if (realName && realName !== "role") {
        // Mapped column but progression/ID-less -> kept out of the payload
        // (server decides). Nothing to add here.
      } else if (key !== "uid" && key !== "role") {
        extra[key] = doc[key];
      }
    }
  }
  if (Object.keys(extra).length > 0) payload.extra = extra;
  return payload;
};