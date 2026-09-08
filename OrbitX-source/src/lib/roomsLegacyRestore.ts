// =============================================================================
// One-time resta out of the legacy localStorage fallback -> real rooms table.
//
// While the site ran in "fallback mode" (no real Supabase configured every write
// only reached the browser's own `orbitx_fallback_db`. Those stations never made
// it to the server, so once real Supabase came online they looked "lost".
//
// This module copies the CURRENT user's own rooms (creatorId === their uid) from
// the fallback store into the real `rooms` table exactly once, so nobody has to
// recreate their stations from scratch.
// =============================================================================

import { roomsDocToRow } from "./relationalRegistry";
import { getSupabase, isRealSupabase } from "../supabaseAdapter";

const RESTORE_FLAG = "orbitx_rooms_legacy_restored_v1";

interface FallbackRoomDoc {
  id: string;
  data: any;
}

const getFallbackRooms = (uid: string): FallbackRoomDoc[] => {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem("orbitx_fallback_db");
    if (!raw) return [];
    const docs = JSON.parse(raw);
    if (!Array.isArray(docs)) return [];
    return docs
      .filter(
        (d) =>
          d &&
          d.path === "rooms/" + d.id &&
          d.collection === "rooms" &&
          d.data &&
          d.data.creatorId === uid &&
          d.data.name,
      )
      .map((d) => ({ id: String(d.id), data: d.data }));
  } catch (e) {
    console.warn("[RoomsRestore] failed reading fallback store:", e);
    return [];
  }
};

export const restoreLegacyRoomsIfNeeded = async (uid: string): Promise<number> => {
  if (!isRealSupabase || !uid) return 0;
  try {
    if (window.localStorage.getItem(RESTORE_FLAG)) return 0;
    const legacy = getFallbackRooms(uid);
    if (legacy.length === 0) {
      window.localStorage.setItem(RESTORE_FLAG, "1");
      return 0;
    }

    const supabase = await getSupabase();
    const ids = legacy.map((r) => r.id);
    const { data: existing, error: listErr } = await supabase
      .from("rooms")
      .select("id")
      .in("id", ids);
    if (listErr) throw listErr;
    const already = new Set((existing || []).map((r: any) => String(r.id)));

    const toInsert = legacy
      .filter((r) => !already.has(r.id))
      .map((r) => ({ ...roomsDocToRow({ id: r.id, ...r.data }), updated_at: new Date().toISOString() }));

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase
        .from("rooms")
        .upsert(toInsert, { onConflict: "id", ignoreDuplicates: true });
      if (insErr) throw insErr;
    }

    window.localStorage.setItem(RESTORE_FLAG, "1");
    return toInsert.length;
  } catch (e) {
    // Non-fatal: never block home. Retry next load (flag not set on failure).
    console.warn("[RoomsRestore] restore skipped:", e);
    return 0;
  }
};