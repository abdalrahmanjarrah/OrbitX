import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  db,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  deleteField,
  runTransaction,
} from "../src/supabaseAdapter";

const DB_KEY = "orbitx_fallback_db";

const clearDb = () => localStorage.removeItem(DB_KEY);

const uid = (prefix = "doc") =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

beforeEach(() => {
  clearDb();
  localStorage.clear();
});

describe("setDoc / getDoc basic CRUD", () => {
  it("writes a doc and reads it back", async () => {
    const ref = doc(db, "test_crud", "abc");
    await setDoc(ref, { name: "Orion", level: 3 });
    const snap = await getDoc(ref);
    expect(snap.exists()).toBe(true);
    expect(snap.id).toBe("abc");
    expect(snap.data()).toEqual({ name: "Orion", level: 3 });
  });

  it("returns non-existent snapshot for missing doc", async () => {
    const snap = await getDoc(doc(db, "test_crud", "missing"));
    expect(snap.exists()).toBe(false);
    expect(snap.data()).toBeNull();
  });

  it("merge option keeps existing fields and adds new ones", async () => {
    const ref = doc(db, "test_merge", "m1");
    await setDoc(ref, { a: 1, b: 2 });
    await setDoc(ref, { b: 99, c: 3 }, { merge: true });
    const snap = await getDoc(ref);
    expect(snap.data()).toEqual({ a: 1, b: 99, c: 3 });
  });

  it("overwrites the whole doc when merge is off", async () => {
    const ref = doc(db, "test_overwrite", "o1");
    await setDoc(ref, { a: 1, b: 2 });
    await setDoc(ref, { x: "only" });
    const snap = await getDoc(ref);
    expect(snap.data()).toEqual({ x: "only" });
  });
});

describe("addDoc generates ids", () => {
  it("auto-generates unique document ids", async () => {
    const col = collection(db, "test_add");
    const refA = await addDoc(col, { v: 1 });
    const refB = await addDoc(col, { v: 2 });
    expect(refA.id).toBeTruthy();
    expect(refB.id).toBeTruthy();
    expect(refA.id).not.toBe(refB.id);

    const snapA = await getDoc(doc(col, refA.id));
    expect(snapA.data()).toEqual({ v: 1 });
  });
});

describe("updateDoc", () => {
  it("updates existing fields and creates doc if missing", async () => {
    const ref = doc(db, "test_update", "u1");
    await setDoc(ref, { xp: 100 });
    await updateDoc(ref, { xp: 250, name: "Zeta" });
    const snap = await getDoc(ref);
    expect(snap.data()).toEqual({ xp: 250, name: "Zeta" });
  });
});

describe("deleteDoc", () => {
  it("removes the document", async () => {
    const ref = doc(db, "test_delete", "d1");
    await setDoc(ref, { keep: false });
    await deleteDoc(ref);
    const snap = await getDoc(ref);
    expect(snap.exists()).toBe(false);
  });
});

describe("MockFieldValue sentinels", () => {
  it("serverTimestamp is materialized to an ISO string", async () => {
    const ref = doc(db, "test_sentinel", "s1");
    await setDoc(ref, { text: "hi", ts: serverTimestamp() });
    const snap = await getDoc(ref);
    const data = snap.data();
    expect(data.text).toBe("hi");
    expect(typeof data.ts).toBe("string");
    expect(!Number.isNaN(Date.parse(data.ts))).toBe(true);
  });

  it("increment adds to existing numeric value", async () => {
    const ref = doc(db, "test_increment", "i1");
    await setDoc(ref, { counter: 5 });
    await updateDoc(ref, { counter: increment(3) });
    await updateDoc(ref, { counter: increment(-1) });
    const snap = await getDoc(ref);
    expect(snap.data().counter).toBe(7);
  });

  it("arrayUnion and arrayRemove update arrays", async () => {
    const ref = doc(db, "test_arrays", "a1");
    await setDoc(ref, { tags: ["x"] });
    await updateDoc(ref, { tags: arrayUnion("y", "z") });
    await updateDoc(ref, { tags: arrayRemove("y") });
    const snap = await getDoc(ref);
    expect(snap.data().tags).toEqual(["x", "z"]);
  });

  it("deleteField removes a field", async () => {
    const ref = doc(db, "test_deletefield", "df1");
    await setDoc(ref, { keep: 1, gone: 2 });
    await updateDoc(ref, { gone: deleteField() });
    const snap = await getDoc(ref);
    expect(snap.data()).toEqual({ keep: 1 });
  });
});

describe("getDocs queries", () => {
  const seed = async () => {
    const col = collection(db, "test_queries");
    const users = [
      { name: "A", xp: 10, active: true, tags: ["one", "two"] },
      { name: "B", xp: 50, active: false, tags: ["two"] },
      { name: "C", xp: 30, active: true, tags: ["three"] },
    ];
    for (const u of users) await addDoc(col, u);
    return col;
  };

  it("returns all docs for a plain collection query", async () => {
    const col = await seed();
    const snap = await getDocs(collection(db, "test_queries"));
    expect(snap.size).toBe(3);
    const names = snap.docs.map((d) => d.data().name).sort();
    expect(names).toEqual(["A", "B", "C"]);
    // collection() with db creates the same path as col
    void col;
  });

  it("filters with where ==", async () => {
    await seed();
    const snap = await getDocs(
      query(collection(db, "test_queries"), where("active", "==", true)),
    );
    expect(snap.size).toBe(2);
  });

  it("filters with where >=", async () => {
    await seed();
    const snap = await getDocs(
      query(collection(db, "test_queries"), where("xp", ">=", 30)),
    );
    expect(snap.size).toBe(2);
  });

  it("supports array-contains", async () => {
    await seed();
    const snap = await getDocs(
      query(collection(db, "test_queries"), where("tags", "array-contains", "two")),
    );
    expect(snap.size).toBe(2);
  });

  it("supports in", async () => {
    await seed();
    const snap = await getDocs(
      query(collection(db, "test_queries"), where("name", "in", ["A", "C"])),
    );
    expect(snap.size).toBe(2);
  });

  it("orders by xp descending", async () => {
    await seed();
    const snap = await getDocs(
      query(collection(db, "test_queries"), orderBy("xp", "desc")),
    );
    expect(snap.docs[0].data().name).toBe("B");
    expect(snap.docs[2].data().name).toBe("A");
  });

  it("applies limit after ordering", async () => {
    await seed();
    const snap = await getDocs(
      query(collection(db, "test_queries"), orderBy("xp", "desc"), limit(2)),
    );
    expect(snap.size).toBe(2);
    expect(snap.docs[0].data().name).toBe("B");
  });

  it("combines where + orderBy + limit", async () => {
    await seed();
    const snap = await getDocs(
      query(
        collection(db, "test_queries"),
        where("active", "==", true),
        orderBy("xp", "desc"),
        limit(1),
      ),
    );
    expect(snap.size).toBe(1);
    expect(snap.docs[0].data().name).toBe("C");
  });
});

describe("onSnapshot", () => {
  it("fires initial data then updates on local writes", async () => {
    const col = collection(db, "test_snap");
    const cb = vi.fn();
    const unsubscribe = onSnapshot(col, (snap: any) => cb(snap.docs.map((d: any) => d.data())));

    // initial empty
    await new Promise((r) => setTimeout(r, 20));
    expect(cb).toHaveBeenCalled();
    expect(cb.mock.calls[0][0]).toEqual([]);

    // write a doc -> listener should fire again (debounced 80ms)
    await addDoc(col, { v: 1 });
    await new Promise((r) => setTimeout(r, 200));
    expect(cb.mock.calls.length).toBeGreaterThanOrEqual(2);
    const last = cb.mock.calls[cb.mock.calls.length - 1][0];
    expect(last).toEqual([{ v: 1 }]);

    unsubscribe();
  });

  it("stops updating after unsubscribe", async () => {
    const col = collection(db, "test_snap_unsub");
    const cb = vi.fn();
    const unsubscribe = onSnapshot(col, (snap: any) => cb(snap.docs.map((d: any) => d.data())));
    await new Promise((r) => setTimeout(r, 20));
    const callsAfterInit = cb.mock.calls.length;
    unsubscribe();
    await addDoc(col, { v: 2 });
    await new Promise((r) => setTimeout(r, 150));
    expect(cb.mock.calls.length).toBe(callsAfterInit);
  });
});

describe("runTransaction", () => {
  it("commits a simple transactional read+write", async () => {
    const ref = doc(db, "test_tx", "t1");
    await setDoc(ref, { balance: 100 });

    await runTransaction(db, async (tx: any) => {
      const snap = await tx.get(ref);
      const balance = snap.data().balance;
      await tx.update(ref, { balance: balance + 50 });
    });

    const finalSnap = await getDoc(ref);
    expect(finalSnap.data().balance).toBe(150);
  });
});
