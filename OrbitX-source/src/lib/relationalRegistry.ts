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