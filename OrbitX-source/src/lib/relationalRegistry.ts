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
  // For subcollections (users/<uid>/notifications, rooms/<id>/messages, ...)
  // the parent id lives in a column (recipientid, roomid, userid, ...).
  parentIdColumn?: string;
  // Delta-sync column; defaults to "updated_at". Some tables only have
  // created_at (inserts) or a BIGINT timestamp (friends).
  syncCol?: string;
  syncIsMs?: boolean;
  rowToDoc: (row: any) => any;
  docToRow: (doc: any, path?: string) => any;
}

const parentOf = (path?: string): string | null => {
  if (!path) return null;
  const seg = path.split("/");
  return seg.length >= 2 ? seg[1] : null;
};

// ---- admin / system tables -------------------------------------------------

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
  createdat: typeof doc.createdAt === "number" ? doc.createdAt : toMs(doc.createdAt) ?? Date.now(),
  extra: {
    expiresAt:
      typeof doc.expiresAt === "number" ? doc.expiresAt : Date.now() + 10 * 60 * 1000,
  },
});

const advicesRowToDoc = (row: any): any => ({
  id: row.id,
  text: row.text || "",
  timestamp: row.timestamp ?? 0,
});
const advicesDocToRow = (doc: any): any => ({
  id: doc.id,
  text: doc.text ?? "",
  timestamp: toMs(doc.timestamp) ?? 0,
  extra: {},
});

const systemRowToDoc = (row: any): any => {
  const doc: any = { id: row.key };
  if (row.value && typeof row.value === "object") {
    for (const k of Object.keys(row.value)) doc[k] = (row.value as any)[k];
  }
  return doc;
};
const systemDocToRow = (doc: any): any => {
  const value: any = {};
  for (const k of Object.keys(doc || {})) {
    if (k === "id" || k === "_") continue;
    value[k] = doc[k];
  }
  return { key: doc.id, value };
};

// ---- top-level content tables ---------------------------------------------

const challengesDocToRow = (doc: any): any => {
  const row: any = { id: doc.id, extra: {} };
  if (doc.challengerId != null) row.challengerid = doc.challengerId;
  if (doc.challengerName != null) row.challengername = doc.challengerName;
  if (doc.challengerPhoto != null) row.challengerphoto = doc.challengerPhoto ?? null;
  if (doc.challengedId != null) row.challengedid = doc.challengedId;
  if (doc.challengedName != null) row.challengedname = doc.challengedName;
  if (doc.challengedPhoto != null) row.challengedphoto = doc.challengedPhoto ?? null;
  if (doc.status != null) row.status = doc.status;
  if (doc.createdAt != null) row.createdat = toMs(doc.createdAt) ?? 0;
  if (doc.startTime != null) row.starttime = toMs(doc.startTime);
  if (doc.durationMinutes != null) row.durationminutes = doc.durationMinutes;
  if (doc.progressPlayer1 != null) row.progressplayer1 = doc.progressPlayer1 ?? 0;
  if (doc.progressPlayer2 != null) row.progressplayer2 = doc.progressPlayer2 ?? 0;
  if (doc.winnerId != null) row.winnerid = doc.winnerId ?? null;
  if (doc.rewardsClaimed != null) row.rewardsclaimed = Array.isArray(doc.rewardsClaimed) ? doc.rewardsClaimed : [];
  if (doc.rewardClaimedAt != null) row.rewardclaimedat = toMs(doc.rewardClaimedAt);
  if (doc.completedAt != null) row.completedat = toMs(doc.completedAt);
  return row;
};
const challengesRowToDoc = (row: any): any => {
  const doc: any = {
    id: row.id,
    challengerId: row.challengerid || "",
    challengerName: row.challengername || "",
    challengedId: row.challengedid || "",
    challengedName: row.challengedname || "",
    status: row.status || "pending",
    createdAt: row.createdat ?? 0,
    durationMinutes: row.durationminutes ?? 60,
    progressPlayer1: row.progressplayer1 ?? 0,
    progressPlayer2: row.progressplayer2 ?? 0,
    rewardsClaimed: Array.isArray(row.rewardsclaimed) ? row.rewardsclaimed : [],
  };
  if (row.challengerphoto != null) doc.challengerPhoto = row.challengerphoto;
  if (row.challengedphoto != null) doc.challengedPhoto = row.challengedphoto;
  if (row.starttime != null) doc.startTime = row.starttime;
  if (row.winnerid != null) doc.winnerId = row.winnerid;
  if (row.rewardclaimedat != null) doc.rewardClaimedAt = row.rewardclaimedat;
  if (row.completedat != null) doc.completedAt = row.completedat;
  if (row.extra && typeof row.extra === "object")
    for (const k of Object.keys(row.extra)) if (!(k in doc)) doc[k] = row.extra[k];
  return doc;
};

const discussionsDocToRow = (doc: any): any => {
  const row: any = { id: doc.id, extra: {} };
  if (doc.title != null) row.title = doc.title;
  if (doc.content != null) row.content = doc.content;
  if (doc.userId != null) row.userid = doc.userId;
  if (doc.userName != null) row.username = doc.userName;
  if (doc.userPhoto != null) row.userphoto = doc.userPhoto ?? null;
  if (doc.category != null) row.category = doc.category ?? null;
  if (doc.repliesCount != null) row.repliescount = doc.repliesCount ?? 0;
  if (doc.likesCount != null) row.likescount = doc.likesCount ?? 0;
  if (doc.likedBy != null) row.likedby = Array.isArray(doc.likedBy) ? doc.likedBy : [];
  if (doc.timestamp != null) row.timestamp = toMs(doc.timestamp) ?? 0;
  return row;
};
const discussionsRowToDoc = (row: any): any => {
  const doc: any = {
    id: row.id,
    title: row.title || "",
    content: row.content || "",
    userId: row.userid || "",
    userName: row.username || "",
    repliesCount: row.repliescount ?? 0,
    likesCount: row.likescount ?? 0,
    likedBy: Array.isArray(row.likedby) ? row.likedby : [],
    timestamp: row.timestamp ?? 0,
  };
  if (row.userphoto != null) doc.userPhoto = row.userphoto;
  if (row.category != null) doc.category = row.category;
  if (row.extra && typeof row.extra === "object")
    for (const k of Object.keys(row.extra)) if (!(k in doc)) doc[k] = row.extra[k];
  return doc;
};

const repliesDocToRow = (doc: any, path?: string): any => {
  const row: any = { id: doc.id, discussionid: parentOf(path) || "", extra: {} };
  if (doc.text != null) row.text = doc.text;
  if (doc.userId != null) row.userid = doc.userId;
  if (doc.userName != null) row.username = doc.userName;
  if (doc.userPhoto != null) row.userphoto = doc.userPhoto ?? null;
  if (doc.timestamp != null) row.timestamp = toMs(doc.timestamp) ?? 0;
  return row;
};
const repliesRowToDoc = (row: any): any => {
  const doc: any = {
    id: row.id,
    discussionId: row.discussionid || "",
    text: row.text || "",
    userId: row.userid || "",
    userName: row.username || "",
    timestamp: row.timestamp ?? 0,
  };
  if (row.userphoto != null) doc.userPhoto = row.userphoto;
  if (row.extra && typeof row.extra === "object")
    for (const k of Object.keys(row.extra)) if (!(k in doc)) doc[k] = row.extra[k];
  return doc;
};

const fleetsDocToRow = (doc: any): any => {
  const row: any = { id: doc.id, extra: {} };
  if (doc.name != null) row.name = doc.name;
  if (doc.description != null) row.description = doc.description ?? null;
  if (doc.ownerId != null) row.ownerid = doc.ownerId;
  if (doc.members != null) row.members = Array.isArray(doc.members) ? doc.members : [];
  if (doc.coAdmins != null) row.coadmins = Array.isArray(doc.coAdmins) ? doc.coAdmins : [];
  if (doc.invites != null) row.invites = Array.isArray(doc.invites) ? doc.invites : [];
  if (doc.logo != null) row.logo = doc.logo ?? null;
  if (doc.totalFocusHours != null) row.totalfocushours = doc.totalFocusHours ?? 0;
  if (doc.xp != null) row.xp = doc.xp ?? 0;
  return row;
};
const fleetsRowToDoc = (row: any): any => {
  const doc: any = {
    id: row.id,
    name: row.name || "",
    ownerId: row.ownerid || "",
    members: Array.isArray(row.members) ? row.members : [],
    coAdmins: Array.isArray(row.coadmins) ? row.coadmins : [],
    invites: Array.isArray(row.invites) ? row.invites : [],
  };
  if (row.description != null) doc.description = row.description;
  if (row.logo != null) doc.logo = row.logo;
  if (row.totalfocushours != null) doc.totalFocusHours = row.totalfocushours;
  if (row.xp != null) doc.xp = row.xp;
  if (row.extra && typeof row.extra === "object")
    for (const k of Object.keys(row.extra)) if (!(k in doc)) doc[k] = row.extra[k];
  return doc;
};

const suggestionsDocToRow = (doc: any): any => {
  const row: any = { id: doc.id, extra: {} };
  if (doc.userId != null) row.userid = doc.userId;
  if (doc.userName != null) row.username = doc.userName;
  if (doc.text != null) row.text = doc.text;
  if (doc.reply != null) row.reply = doc.reply ?? null;
  if (doc.repliedAt != null) row.repliedat = toMs(doc.repliedAt);
  if (doc.timestamp != null) row.timestamp = toMs(doc.timestamp) ?? 0;
  return row;
};
const suggestionsRowToDoc = (row: any): any => {
  const doc: any = {
    id: row.id,
    userId: row.userid || "",
    userName: row.username || "",
    text: row.text || "",
    timestamp: row.timestamp ?? 0,
  };
  if (row.reply != null) doc.reply = row.reply;
  if (row.repliedat != null) doc.repliedAt = row.repliedat;
  if (row.extra && typeof row.extra === "object")
    for (const k of Object.keys(row.extra)) if (!(k in doc)) doc[k] = row.extra[k];
  return doc;
};

const exhibitionsDocToRow = (doc: any): any => ({
  id: doc.id,
  userid: doc.userId ?? "",
  username: doc.userName ?? "",
  url: doc.url ?? "",
  timestamp: toMs(doc.timestamp) ?? 0,
  extra: {},
});
const exhibitionsRowToDoc = (row: any): any => ({
  id: row.id,
  userId: row.userid || "",
  userName: row.username || "",
  url: row.url || "",
  timestamp: row.timestamp ?? 0,
});

const supportTicketsDocToRow = (doc: any): any => {
  const row: any = { id: doc.id, extra: {} };
  if (doc.userId != null) row.userid = doc.userId;
  if (doc.userName != null) row.username = doc.userName;
  if (doc.status != null) row.status = doc.status;
  if (doc.lastMessage != null) row.lastmessage = doc.lastMessage ?? null;
  if (doc.messages != null) row.messages = Array.isArray(doc.messages) ? doc.messages : [];
  if (doc.updatedAt != null) row.updatedat = toMs(doc.updatedAt);
  return row;
};
const supportTicketsRowToDoc = (row: any): any => {
  const doc: any = {
    id: row.id,
    userId: row.userid || "",
    userName: row.username || "",
    status: row.status || "open",
  };
  if (row.lastmessage != null) doc.lastMessage = row.lastmessage;
  if (row.messages != null) doc.messages = Array.isArray(row.messages) ? row.messages : [];
  if (row.updatedat != null) doc.updatedAt = row.updatedat;
  if (row.extra && typeof row.extra === "object")
    for (const k of Object.keys(row.extra)) if (!(k in doc)) doc[k] = row.extra[k];
  return doc;
};

const appUpdatesDocToRow = (doc: any): any => {
  const row: any = { id: doc.id, extra: {} };
  if (doc.title != null) row.title = doc.title;
  if (doc.version != null) row.version = doc.version ?? null;
  if (doc.description != null) row.description = doc.description ?? null;
  if (doc.adminId != null) row.adminid = doc.adminId ?? null;
  if (doc.published != null) row.published = doc.published ?? true;
  if (doc.createdAt != null) row.createdat = toMs(doc.createdAt);
  return row;
};
const appUpdatesRowToDoc = (row: any): any => {
  const doc: any = { id: row.id, title: row.title || "" };
  if (row.version != null) doc.version = row.version;
  if (row.description != null) doc.description = row.description;
  if (row.adminid != null) doc.adminId = row.adminid;
  if (row.published != null) doc.published = row.published;
  if (row.createdat != null) doc.createdAt = row.createdat;
  if (row.extra && typeof row.extra === "object")
    for (const k of Object.keys(row.extra)) if (!(k in doc)) doc[k] = row.extra[k];
  return doc;
};

const globalNotifDocToRow = (doc: any): any => ({
  id: doc.id,
  title: doc.title ?? null,
  content: doc.content ?? null,
  timestamp: toMs(doc.timestamp) ?? 0,
  extra: {},
});
const globalNotifRowToDoc = (row: any): any => ({
  id: row.id,
  title: row.title ?? "",
  content: row.content ?? "",
  timestamp: row.timestamp ?? 0,
});

const awarenessDocToRow = (doc: any): any => {
  const row: any = { id: doc.id, extra: {} };
  if (doc.title != null) row.title = doc.title;
  if (doc.content != null) row.content = doc.content;
  if (doc.category != null) row.category = doc.category ?? null;
  if (doc.userId != null) row.userid = doc.userId;
  if (doc.views != null) row.views = doc.views ?? 0;
  if (doc.likes != null) row.likes = doc.likes ?? 0;
  if (doc.timestamp != null) row.timestamp = toMs(doc.timestamp) ?? 0;
  return row;
};
const awarenessRowToDoc = (row: any): any => {
  const doc: any = {
    id: row.id,
    title: row.title || "",
    content: row.content || "",
    userId: row.userid || "",
    views: row.views ?? 0,
    likes: row.likes ?? 0,
    timestamp: row.timestamp ?? 0,
  };
  if (row.category != null) doc.category = row.category;
  if (row.extra && typeof row.extra === "object")
    for (const k of Object.keys(row.extra)) if (!(k in doc)) doc[k] = row.extra[k];
  return doc;
};

// ---- subcollection tables --------------------------------------------------

const notificationsDocToRow = (doc: any, path?: string): any => {
  const row: any = {
    id: doc.id,
    recipientid: parentOf(path) || doc.recipientId || "",
    extra: {},
  };
  if (doc.senderId != null) row.senderid = doc.senderId ?? null;
  if (doc.type != null) row.type = doc.type;
  if (doc.content != null) row.content = doc.content;
  if (doc.read != null) row.read = doc.read ?? false;
  if (doc.timestamp != null) row.timestamp = toMs(doc.timestamp) ?? 0;
  return row;
};
const notificationsRowToDoc = (row: any): any => {
  const doc: any = {
    id: row.id,
    recipientId: row.recipientid || "",
    type: row.type || "",
    content: row.content || "",
    read: row.read ?? false,
    timestamp: row.timestamp ?? 0,
  };
  if (row.senderid != null) doc.senderId = row.senderid;
  if (row.extra && typeof row.extra === "object")
    for (const k of Object.keys(row.extra)) if (!(k in doc)) doc[k] = row.extra[k];
  return doc;
};

const friendsDocToRow = (doc: any, path?: string): any => ({
  user_id: parentOf(path) || doc.userId || "",
  friend_id: doc.id,
  timestamp: toMs(doc.timestamp) ?? 0,
  extra: {},
});
const friendsRowToDoc = (row: any): any => ({
  id: row.friend_id,
  userId: row.user_id,
  timestamp: row.timestamp ?? 0,
});

const scheduleDocToRow = (doc: any, path?: string): any => {
  const row: any = {
    id: doc.id,
    userid: parentOf(path) || doc.userId || "",
    extra: {},
  };
  for (const k of ["day", "time", "task", "priority", "category", "color"]) {
    if (doc[k] != null) (row as any)[k] = doc[k];
  }
  if (doc.completed != null) row.completed = doc.completed ?? false;
  if (doc.duration != null) row.duration = doc.duration;
  if (doc.timestamp != null) row.timestamp = toMs(doc.timestamp);
  return row;
};
const scheduleRowToDoc = (row: any): any => {
  const doc: any = {
    id: row.id,
    userId: row.userid || "",
    day: row.day || "",
    time: row.time || "",
    task: row.task || "",
    completed: row.completed ?? false,
  };
  if (row.priority != null) doc.priority = row.priority;
  if (row.category != null) doc.category = row.category;
  if (row.duration != null) doc.duration = row.duration;
  if (row.color != null) doc.color = row.color;
  if (row.timestamp != null) doc.timestamp = row.timestamp;
  if (row.extra && typeof row.extra === "object")
    for (const k of Object.keys(row.extra)) if (!(k in doc)) doc[k] = row.extra[k];
  return doc;
};

const roomMessagesDocToRow = (doc: any, path?: string): any => {
  const row: any = {
    id: doc.id,
    roomid: parentOf(path) || doc.roomId || "",
    extra: {},
  };
  if (doc.text != null) row.text = doc.text;
  if (doc.type != null) row.type = doc.type;
  if (doc.userId != null) row.userid = doc.userId;
  if (doc.userName != null) row.username = doc.userName;
  if (doc.userPhoto != null) row.userphoto = doc.userPhoto ?? null;
  if (doc.userRankTitle != null) row.userranktitle = doc.userRankTitle ?? null;
  if (doc.userRankColor != null) row.userrankcolor = doc.userRankColor ?? null;
  if (doc.userRankIcon != null) row.userrankicon = doc.userRankIcon ?? null;
  if (doc.timestamp != null) row.timestamp = toMs(doc.timestamp) ?? 0;
  return row;
};
const roomMessagesRowToDoc = (row: any): any => {
  const doc: any = {
    id: row.id,
    roomId: row.roomid || "",
    text: row.text || "",
    type: row.type || "text",
    userId: row.userid || "",
    userName: row.username || "",
    timestamp: row.timestamp ?? 0,
  };
  if (row.userphoto != null) doc.userPhoto = row.userphoto;
  if (row.userranktitle != null) doc.userRankTitle = row.userranktitle;
  if (row.userrankcolor != null) doc.userRankColor = row.userrankcolor;
  if (row.userrankicon != null) doc.userRankIcon = row.userrankicon;
  if (row.extra && typeof row.extra === "object")
    for (const k of Object.keys(row.extra)) if (!(k in doc)) doc[k] = row.extra[k];
  return doc;
};

const errorsRowToDoc = (row: any): any => {
  const doc: any = {
    id: row.id,
    source: row.source || "",
    message: row.message || "",
    count: row.count ?? 1,
    ts: row.ts ?? 0,
  };
  if (row.uid != null) doc.uid = row.uid;
  if (row.username != null) doc.userName = row.username;
  if (row.context != null) doc.context = row.context;
  if (row.stack != null) doc.stack = row.stack;
  if (row.url != null) doc.url = row.url;
  if (row.useragent != null) doc.userAgent = row.useragent;
  if (row.createdat != null) doc.createdAt = row.createdat;
  if (row.extra && typeof row.extra === "object")
    for (const k of Object.keys(row.extra)) if (!(k in doc)) doc[k] = row.extra[k];
  return doc;
};

const roomMs = (v: any): number | null => toMs(v);

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
    syncCol: "created_at",
    rowToDoc: adminAlertsRowToDoc,
    docToRow: adminAlertsDocToRow,
  },
  rooms: {
    table: "rooms",
    keyField: "id",
    rowToDoc: roomsRowToDoc,
    docToRow: roomsDocToRow,
  },
  challenges: {
    table: "challenges",
    keyField: "id",
    rowToDoc: challengesRowToDoc,
    docToRow: challengesDocToRow,
  },
  discussions: {
    table: "discussions",
    keyField: "id",
    rowToDoc: discussionsRowToDoc,
    docToRow: discussionsDocToRow,
  },
  fleets: {
    table: "fleets",
    keyField: "id",
    rowToDoc: fleetsRowToDoc,
    docToRow: fleetsDocToRow,
  },
  suggestions: {
    table: "suggestions",
    keyField: "id",
    syncCol: "created_at",
    rowToDoc: suggestionsRowToDoc,
    docToRow: suggestionsDocToRow,
  },
  exhibitions: {
    table: "exhibitions",
    keyField: "id",
    syncCol: "created_at",
    rowToDoc: exhibitionsRowToDoc,
    docToRow: exhibitionsDocToRow,
  },
  support_tickets: {
    table: "support_tickets",
    keyField: "id",
    syncCol: "created_at",
    rowToDoc: supportTicketsRowToDoc,
    docToRow: supportTicketsDocToRow,
  },
  app_updates: {
    table: "app_updates",
    keyField: "id",
    syncCol: "created_at",
    rowToDoc: appUpdatesRowToDoc,
    docToRow: appUpdatesDocToRow,
  },
  global_notifications: {
    table: "global_notifications",
    keyField: "id",
    syncCol: "created_at",
    rowToDoc: globalNotifRowToDoc,
    docToRow: globalNotifDocToRow,
  },
  awareness_signals: {
    table: "awareness_signals",
    keyField: "id",
    syncCol: "created_at",
    rowToDoc: awarenessRowToDoc,
    docToRow: awarenessDocToRow,
  },
  advices: {
    table: "advices",
    keyField: "id",
    syncCol: "created_at",
    rowToDoc: advicesRowToDoc,
    docToRow: advicesDocToRow,
  },
  system: {
    table: "system",
    keyField: "key",
    rowToDoc: systemRowToDoc,
    docToRow: systemDocToRow,
  },
  errors: {
    table: "errors",
    keyField: "id",
    syncCol: "created_at",
    rowToDoc: errorsRowToDoc,
    docToRow: (doc: any) => ({ id: doc.id }),
  },
};

// Subcollection bridges: match a full scope like "rooms/<id>/messages".
export const SUBSCOPE_BRIDGES: { match: (seg: string[]) => boolean; bridge: TableCollectionMap }[] = [
  {
    match: (s) => s.length === 3 && s[0] === "rooms" && s[2] === "messages",
    bridge: {
      table: "room_messages",
      keyField: "id",
      parentIdColumn: "roomid",
      syncCol: "created_at",
      rowToDoc: roomMessagesRowToDoc,
      docToRow: roomMessagesDocToRow,
    },
  },
  {
    match: (s) => s.length === 3 && s[0] === "discussions" && s[2] === "replies",
    bridge: {
      table: "discussion_replies",
      keyField: "id",
      parentIdColumn: "discussionid",
      syncCol: "created_at",
      rowToDoc: repliesRowToDoc,
      docToRow: repliesDocToRow,
    },
  },
  {
    match: (s) => s.length === 3 && s[0] === "users" && s[2] === "notifications",
    bridge: {
      table: "notifications",
      keyField: "id",
      parentIdColumn: "recipientid",
      syncCol: "created_at",
      rowToDoc: notificationsRowToDoc,
      docToRow: notificationsDocToRow,
    },
  },
  {
    match: (s) => s.length === 3 && s[0] === "users" && s[2] === "friends",
    bridge: {
      table: "friends",
      keyField: "friend_id",
      parentIdColumn: "user_id",
      syncCol: "timestamp",
      syncIsMs: true,
      rowToDoc: friendsRowToDoc,
      docToRow: friendsDocToRow,
    },
  },
  {
    match: (s) => s.length === 3 && s[0] === "users" && s[2] === "schedule",
    bridge: {
      table: "schedules",
      keyField: "id",
      parentIdColumn: "userid",
      syncCol: "created_at",
      rowToDoc: scheduleRowToDoc,
      docToRow: scheduleDocToRow,
    },
  },
];

export const getTableBridge = (scope: string): TableCollectionMap | null => {
  if (!scope) return null;
  if (!scope.includes("/")) return TABLE_COLLECTIONS[scope] || null;
  const seg = scope.split("/");
  for (const item of SUBSCOPE_BRIDGES) {
    if (item.match(seg)) return item.bridge;
  }
  return null;
};

export const toMs = (v: any): number | null => {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && typeof v.seconds === "number") {
    return v.seconds * 1000 + (v.nanoseconds ? v.nanoseconds / 1e6 : 0);
  }
  const n = Date.parse(String(v));
  return Number.isNaN(n) ? null : n;
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