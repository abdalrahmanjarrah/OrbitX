#!/usr/bin/env python3
"""Copy legacy `documents` rows into the dedicated relational tables.

One-time migration helper. Pure PostgREST (service_role) so it bypasses RLS.
Idempotent: every table is pre-checked and only missing rows are upserted.
Nothing is ever deleted from `documents` (kept as a rollback).

Usage:
  python3 scripts/copy_legacy_to_tables.py                     # copy everything
  python3 scripts/copy_legacy_to_tables.py rooms errors        # copy a subset
"""
import datetime
import json
import os
import sys
import time
import urllib.request
import urllib.error

BASE = os.environ.get("ORBITX_BASE", "https://oqkwqsivajswzjvwnnvn.supabase.co")


def load_service_key():
    here = os.path.dirname(os.path.abspath(__file__))
    cands = [
        os.path.join(os.path.dirname(here), "secrets.env"),
        "/home/oem/المستندات/New OpenCode Project/OrbitX-source/secrets.env",
    ]
    for cand in cands:
        if os.path.exists(cand):
            line = open(cand, encoding="utf-8").readline().strip()
            if "=" in line:
                return line.split("=", 1)[1].strip().strip('"').strip("'")
            return line
    raise SystemExit("secrets.env (service_role) not found")


SERVICE_KEY = load_service_key()
HDRS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}


def req(method, path, payload=None, prefer=None, expect=200):
    url = BASE + path
    headers = dict(HDRS)
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            body = resp.read()
            if resp.status != expect:
                raise SystemExit(f"{method} {path} -> HTTP {resp.status}: {body[:400]}")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path} -> HTTP {e.code}: {e.read()[:400]}")


def ms(v):
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return int(v)
    if isinstance(v, dict):  # Firestore Timestamp {seconds, nanoseconds}
        return int(float(v.get("seconds", 0)) * 1000 + float(v.get("nanoseconds", 0)) / 1e6)
    s = str(v)
    try:
        return int(datetime.datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp() * 1000)
    except Exception:
        return None


def pick(doc, *keys, default=None):
    for k in keys:
        if isinstance(doc, dict) and k in doc and doc[k] is not None:
            return doc[k]
    return default


def flag(v, d=False):
    if v is None:
        return d
    if isinstance(v, str):
        return v.lower() in ("true", "1", "yes")
    return bool(v)


def build_doc(doc, fields, path=None):
    """fields: {column: (docKey..., [conv, [default]])}"""
    mapped, row = set(), {}
    for col, spec in fields.items():
        spec = list(spec)
        conv = default = None
        if spec and callable(spec[-1]):
            conv = spec.pop()
            if spec and not isinstance(spec[-1], str):
                default = spec.pop()
        elif spec and not isinstance(spec[-1], str):
            default = spec.pop()
            if spec and callable(spec[-1]):
                conv = spec.pop()
        mapped.update(k for k in spec if isinstance(k, str))
        v = pick(doc, *spec)
        if v is None and path:
            v = _path_fallback(col, path)
        if v is None:
            if default is not None:
                row[col] = default
            continue
        row[col] = conv(v) if conv else v
    row["extra"] = {k: x for k, x in doc.items() if k not in mapped and k != "id"}
    return row


def _path_fallback(col, path):
    parts = path.split("/")
    if col == "userid" and len(parts) >= 2 and parts[0] == "users":
        return parts[1]
    if col == "roomid" and len(parts) >= 2 and parts[0] == "rooms":
        return parts[1]
    if col == "discussionid" and len(parts) >= 2 and parts[0] == "discussions":
        return parts[1]
    if col == "recipientid" and len(parts) >= 2 and parts[0] == "users":
        return parts[1]
    if col == "friend_id" and len(parts) >= 4:
        return parts[3]
    return None


def build_user(doc, path=None):
    mapped = {
        "uid", "displayName", "photoURL", "email", "bio", "level", "xp", "hearts",
        "coins", "role", "missionRole", "completedWizard", "dailyFocusTarget",
        "inventory", "items", "equippedItems", "badges", "friendsCount",
        "banned", "currentActivity", "streak", "lastActiveTime", "lastActiveDate",
        "lastDailyReward", "lastStudyDate", "totalFocusTime", "totalFocusMinutes",
        "focusSessions", "totalFocusSessions", "fleetId", "fleetInvites",
        "challengeWins", "challengeChampExpiry", "isGuest", "weekStart",
        "weekFocusMinutes", "weekSessions", "blackholeClaimedWeek", "invitedBy",
        "referralsRewarded", "timeChests", "lastXpUpdate", "lastFocusXpUpdate",
        "lastForcedGrantAt", "extra", "updatedAt", "updated_at",
    }
    return {
        "uid": pick(doc, "uid") or doc.get("id"),
        "displayname": pick(doc, "displayName", "displayname", default=""),
        "email": pick(doc, "email"),
        "photourl": pick(doc, "photoURL", "photourl"),
        "bio": pick(doc, "bio"),
        "level": pick(doc, "level", default=1),
        "xp": pick(doc, "xp", default=0),
        "hearts": pick(doc, "hearts", default=5),
        "coins": pick(doc, "coins", default=100),
        "role": pick(doc, "role", default="user"),
        "missionrole": pick(doc, "missionRole", "missionrole"),
        "completedwizard": pick(doc, "completedWizard", "completedwizard", default=False),
        "dailyfocustarget": pick(doc, "dailyFocusTarget", "dailyfocustarget"),
        "inventory": pick(doc, "inventory", default=[]),
        "items": pick(doc, "items", default=[]),
        "equippeditems": pick(doc, "equippedItems", "equippeditems", default={}),
        "badges": pick(doc, "badges", default=[]),
        "friendscount": pick(doc, "friendsCount", "friendscount", default=0),
        "banned": pick(doc, "banned", default=False),
        "currentactivity": pick(doc, "currentActivity", "currentactivity"),
        "streak": pick(doc, "streak", default=0),
        "lastactivetime": ms(pick(doc, "lastActiveTime", "lastactivetime")),
        "lastactivedate": pick(doc, "lastActiveDate", "lastactivedate"),
        "lastdailyreward": pick(doc, "lastDailyReward", "lastdailyreward"),
        "laststudydate": pick(doc, "lastStudyDate", "laststudydate"),
        "totalfocustime": ms(pick(doc, "totalFocusTime", "totalfocustime")),
        "totalfocusminutes": pick(doc, "totalFocusMinutes", "totalfocusminutes"),
        "focussessions": pick(doc, "focusSessions", "focussessions"),
        "totalfocussessions": pick(doc, "totalFocusSessions", "totalfocussessions"),
        "fleetid": pick(doc, "fleetId", "fleetid"),
        "fleetinvites": pick(doc, "fleetInvites", "fleetinvites", default=[]),
        "challengewins": pick(doc, "challengeWins", "challengewins", default=0),
        "challengechampexpiry": ms(pick(doc, "challengeChampExpiry", "challengechampexpiry")),
        "isguest": pick(doc, "isGuest", "isguest", default=False),
        "weekstart": pick(doc, "weekStart", "weekstart"),
        "weekfocusminutes": pick(doc, "weekFocusMinutes", "weekfocusminutes", default=0),
        "weeksessions": pick(doc, "weekSessions", "weeksessions", default=0),
        "blackholeclaimedweek": pick(doc, "blackholeClaimedWeek", "blackholeclaimedweek"),
        "invitedby": pick(doc, "invitedBy", "invitedby"),
        "referralsrewarded": pick(doc, "referralsRewarded", "referralsrewarded", default=[]),
        "timechests": pick(doc, "timeChests", "timechests"),
        "lastxpupdate": ms(pick(doc, "lastXpUpdate", "lastxpupdate")),
        "lastfocusxpupdate": ms(pick(doc, "lastFocusXpUpdate", "lastfocusxpupdate")),
        "lastforcedgrantat": ms(pick(doc, "lastForcedGrantAt", "lastforcedgrantat")),
        "extra": {k: x for k, x in doc.items() if k not in mapped},
        "created_at": pick(doc, "createdAt", "created_at"),
        "updated_at": pick(doc, "updatedAt", "updated_at"),
    }


def build_profile(doc, path=None):
    mapped = {
        "uid", "displayName", "photoURL", "bio", "level", "xp", "role", "streak",
        "friendsCount", "banned", "currentActivity", "lastActiveTime",
        "lastActiveDate", "totalFocusSessions", "missionRole", "badges",
        "extra", "updatedAt", "updated_at",
    }
    return {
        "uid": pick(doc, "uid") or doc.get("id"),
        "displayname": pick(doc, "displayName", "displayname", default=""),
        "photourl": pick(doc, "photoURL", "photourl"),
        "bio": pick(doc, "bio"),
        "level": pick(doc, "level", default=1),
        "xp": pick(doc, "xp", default=0),
        "role": pick(doc, "role", default="user"),
        "streak": pick(doc, "streak", default=0),
        "friendscount": pick(doc, "friendsCount", "friendscount", default=0),
        "banned": pick(doc, "banned", default=False),
        "currentactivity": pick(doc, "currentActivity", "currentactivity"),
        "lastactivetime": ms(pick(doc, "lastActiveTime", "lastactivetime")),
        "lastactivedate": pick(doc, "lastActiveDate", "lastactivedate"),
        "totalfocussessions": pick(doc, "totalFocusSessions", "totalfocussessions"),
        "missionrole": pick(doc, "missionRole", "missionrole"),
        "badges": pick(doc, "badges", default=[]),
        "extra": {k: x for k, x in doc.items() if k not in mapped},
        "updated_at": pick(doc, "updatedAt", "updated_at"),
    }


BUILDERS = {
    "users": {"table": "users", "key": "uid", "deps": [], "build": build_user},
    "profiles": {"table": "profiles", "key": "uid", "deps": ["users"], "build": build_profile},
    "rooms": {"table": "rooms", "key": "id", "deps": [], "build": lambda d, p=None: build_doc(d, {
        "id": ("id",), "name": ("name",), "task": ("task",),
        "imageurl": ("imageUrl", "imageurl"),
        "creatorid": ("creatorId", "creatorid"),
        "creatorname": ("creatorName", "creatorname"),
        "hostid": ("hostId", "hostid"),
        "participants": ("participants",),
        "maxparticipants": ("maxParticipants", "maxparticipants"),
        "timerstatus": ("timerStatus", "timerstatus"),
        "timerduration": ("timerDuration", "timerduration"),
        "breakduration": ("breakDuration", "breakduration"),
        "starttime": ("startTime", "starttime", ms),
        "createdat": ("createdAt", "createdat", ms),
        "emptyat": ("emptyAt", "emptyat", ms),
        "sharednotes": ("sharedNotes", "sharednotes"),
        "accumulatedfocusseconds": ("accumulatedFocusSeconds", "accumulatedfocusseconds"),
        "ischatlocked": ("isChatLocked", "ischatlocked", flag, False),
        "isprivate": ("isPrivate", "isprivate", flag, False),
        "joincode": ("joinCode", "joincode"),
        "ischallenge": ("isChallenge", "ischallenge", flag, False),
        "challengeid": ("challengeId", "challengeid"),
        "challengedurationminutes": ("challengeDurationMinutes", "challengedurationminutes"),
    }, p)},
    "messages": {"table": "room_messages", "key": "id", "deps": [],
                 "path_filter": lambda p: p.startswith("rooms/"),
                 "build": lambda d, p=None: build_doc(d, {
                    "id": ("id",), "roomid": ("roomId", "roomid"),
                    "text": ("text",), "userid": ("userId", "userid"),
                    "username": ("userName", "username"),
                    "userphoto": ("userPhoto", "userphoto"),
                    "userranktitle": ("userRankTitle", "userranktitle"),
                    "userrankcolor": ("userRankColor", "userrankcolor"),
                    "userrankicon": ("userRankIcon", "userrankicon"),
                    "type": ("type",), "timestamp": ("timestamp", ms, 0),
                 }, p)},
    "fleets": {"table": "fleets", "key": "id", "deps": [], "build": lambda d, p=None: build_doc(d, {
        "id": ("id",), "name": ("name",), "description": ("description",),
        "ownerid": ("ownerId", "ownerid"),
        "members": ("members",), "coadmins": ("coAdmins", "coadmins"),
        "invites": ("invites",), "logo": ("logo",),
        "totalfocushours": ("totalFocusHours", "totalfocushours", int),
        "xp": ("xp", int),
    }, p)},
    "challenges": {"table": "challenges", "key": "id", "deps": [], "build": lambda d, p=None: build_doc(d, {
        "id": ("id",), "challengerid": ("challengerId", "challengerid"),
        "challengername": ("challengerName", "challengername"),
        "challengerphoto": ("challengerPhoto", "challengerphoto"),
        "challengedid": ("challengedId", "challengedid"),
        "challengedname": ("challengedName", "challengedname"),
        "challengedphoto": ("challengedPhoto", "challengedphoto"),
        "status": ("status",), "createdat": ("createdAt", "createdat", ms),
        "starttime": ("startTime", "starttime", ms),
        "durationminutes": ("durationMinutes", "durationminutes"),
        "progressplayer1": ("progressPlayer1", "progressplayer1"),
        "progressplayer2": ("progressPlayer2", "progressplayer2"),
        "winnerid": ("winnerId", "winnerid"),
        "rewardsclaimed": ("rewardsClaimed", "rewardsclaimed"),
        "rewardclaimedat": ("rewardClaimedAt", "rewardclaimedat", ms),
        "completedat": ("completedAt", "completedat", ms),
    }, p)},
    "discussions": {"table": "discussions", "key": "id", "deps": [], "build": lambda d, p=None: build_doc(d, {
        "id": ("id",), "title": ("title",), "content": ("content",),
        "userid": ("userId", "userid"), "username": ("userName", "username"),
        "userphoto": ("userPhoto", "userphoto"), "category": ("category",),
        "repliescount": ("repliesCount", "repliescount", 0),
        "likescount": ("likesCount", "likescount", 0),
        "likedby": ("likedBy", "likedby"), "timestamp": ("timestamp", ms, 0),
    }, p)},
    "replies": {"table": "discussion_replies", "key": "id", "deps": [],
                "path_filter": lambda p: p.startswith("discussions/"),
                "build": lambda d, p=None: build_doc(d, {
                    "id": ("id",), "discussionid": ("discussionId", "discussionid"),
                    "text": ("text",), "userid": ("userId", "userid"),
                    "username": ("userName", "username"),
                    "userphoto": ("userPhoto", "userphoto"),
                    "timestamp": ("timestamp", ms, 0),
                }, p)},
    "schedule": {"table": "schedules", "key": "id", "deps": [],
                 "path_filter": lambda p: p.startswith("users/") and "/schedule/" in p,
                 "build": lambda d, p=None: build_doc(d, {
                    "id": ("id",), "userid": ("userId", "userid"),
                    "day": ("day",), "time": ("time",), "task": ("task",),
                    "completed": ("completed", flag, False),
                    "priority": ("priority",), "category": ("category",),
                    "duration": ("duration",), "color": ("color",),
                    "timestamp": ("timestamp", ms),
                 }, p)},
    "notifications": {"table": "notifications", "key": "id", "deps": [],
                      "path_filter": lambda p: p.startswith("users/") and "/notifications/" in p,
                      "build": lambda d, p=None: build_doc(d, {
                        "id": ("id",), "recipientid": ("recipientId", "recipientid"),
                        "senderid": ("senderId", "senderid"),
                        "type": ("type",),
                        "content": ("content", "message", "text"),
                        "read": ("read", flag, False),
                        "timestamp": ("timestamp", ms, 0),
                      }, p)},
    "friends": {"table": "friends", "key": "friend_id", "composite": True, "deps": [],
                "path_filter": lambda p: p.startswith("users/") and "/friends/" in p,
                "build": lambda d, p=None: {
                    "user_id": pick(d, "userId", "userid") or p.split("/")[1],
                    "friend_id": p.split("/")[3],
                    "timestamp": ms(pick(d, "timestamp")) or 0,
                    "extra": {k: x for k, x in d.items() if k not in ("userId", "userid", "timestamp")},
                }},
    "exhibitions": {"table": "exhibitions", "key": "id", "deps": [], "build": lambda d, p=None: build_doc(d, {
        "id": ("id",), "userid": ("userId", "userid"), "username": ("userName", "username"),
        "url": ("url",), "timestamp": ("timestamp", ms, 0),
    }, p)},
    "suggestions": {"table": "suggestions", "key": "id", "deps": [], "build": lambda d, p=None: build_doc(d, {
        "id": ("id",), "userid": ("userId", "userid"), "username": ("userName", "username"),
        "text": ("text",), "reply": ("reply",), "repliedat": ("repliedAt", "repliedat", ms),
        "timestamp": ("timestamp", ms, 0),
    }, p)},
    "support_tickets": {"table": "support_tickets", "key": "id", "deps": [], "build": lambda d, p=None: build_doc(d, {
        "id": ("id",), "userid": ("userId", "userid"), "username": ("userName", "username"),
        "status": ("status",), "lastmessage": ("lastMessage", "lastmessage"),
        "messages": ("messages",), "updatedat": ("updatedAt", "updatedat", ms),
    }, p)},
    "app_updates": {"table": "app_updates", "key": "id", "deps": [], "build": lambda d, p=None: build_doc(d, {
        "id": ("id",), "title": ("title",), "version": ("version",),
        "description": ("description",), "adminid": ("adminId", "adminid"),
        "published": ("published", flag, True),
    }, p)},
    "global_notifications": {"table": "global_notifications", "key": "id", "deps": [], "build": lambda d, p=None: build_doc(d, {
        "id": ("id",), "title": ("title",), "content": ("content",),
        "timestamp": ("timestamp", ms, 0),
    }, p)},
    "advices": {"table": "advices", "key": "id", "deps": [], "build": lambda d, p=None: build_doc(d, {
        "id": ("id",), "text": ("text",), "timestamp": ("timestamp", ms, 0),
    }, p)},
    "awareness_signals": {"table": "awareness_signals", "key": "id", "deps": [], "build": lambda d, p=None: build_doc(d, {
        "id": ("id",), "title": ("title",), "content": ("content",),
        "category": ("category",), "userid": ("userId", "userid"),
        "views": ("views", 0), "likes": ("likes", 0),
        "timestamp": ("timestamp", ms, 0),
    }, p)},
    "system": {"table": "system", "key": "key", "deps": [], "build": lambda d, p=None: {
        "key": pick(d, "id"),
        "value": {k: x for k, x in d.items() if k not in ("id", "updatedAt", "updated_at")},
    }},
    "errors": {"table": "errors", "key": "id", "deps": [], "build": lambda d, p=None: build_doc(d, {
        "id": ("id",), "uid": ("uid",), "username": ("userName", "username"),
        "message": ("message",), "context": ("context",), "source": ("source",),
        "stack": ("stack",), "url": ("url",), "useragent": ("userAgent", "useragent"),
        "count": ("count", 1), "ts": ("ts", ms, 0), "createdat": ("createdAt", "createdat", ms),
    }, p)},
}


def existing(table, key, composite=False):
    sel = "user_id,friend_id" if composite else key
    rows = req("GET", f"/rest/v1/{table}?select={sel}&limit=100000&offset=0") or []
    return {(r["user_id"], r["friend_id"]) for r in rows} if composite else {str(r[key]) for r in rows}


def upsert(spec, rows):
    table = spec["table"]
    print(f"  -> upsert {len(rows)} row(s) into {table} ...", flush=True)
    merged = {}
    for r in rows:
        k = (r["user_id"], r["friend_id"]) if spec.get("composite") else r[spec["key"]]
        merged[str(k)] = r
    batch = list(merged.values())
    for i, r in enumerate(batch, 1):
        for attempt in range(4):
            try:
                req("POST", f"/rest/v1/{table}", r,
                    prefer="resolution=merge-duplicates,return=minimal", expect=201)
                break
            except (SystemExit, urllib.error.URLError, ConnectionError) as e:
                if attempt >= 3:
                    print(f"    !! row {i} failed after retries: {e}", flush=True)
                    time.sleep(0.4)
                    continue
                time.sleep(1.0 + attempt)
        if i % 10 == 0:
            print(f"    ...{i}/{len(batch)}", flush=True)


def main():
    only = set(sys.argv[1:])
    cols = sorted(set(BUILDERS) & only) if only else sorted(BUILDERS.keys())
    print(f"Target: {BASE}")
    print(f"Collections to copy: {cols}")
    all_docs = req("GET", "/rest/v1/documents?select=id,collection,path,data&limit=100000") or []
    by_col = {}
    for d in all_docs:
        by_col.setdefault(d.get("collection"), []).append(d)
    for col in sorted(by_col):
        print(f"  documents[{col}] = {len(by_col[col])} rows")

    user_ids = set()
    for col in cols:
        spec = BUILDERS[col]
        docs = by_col.get(col, [])
        if spec.get("path_filter"):
            docs = [d for d in docs if spec["path_filter"](d.get("path", ""))]
        print(f"\n[{col}] -> {spec['table']}: {len(docs)} eligible")
        if not docs:
            continue
        print("  fetching existing keys ...", flush=True)
        keys = existing(spec["table"], spec["key"], spec.get("composite", False))
        rows = []
        for d in docs:
            data = d.get("data") or {}
            if spec.get("composite"):
                k = (pick(data, "userId", "userid") or d.get("path", "").split("/")[1],
                     d.get("path", "").split("/")[3])
                if k in keys:
                    continue
            else:
                doc_id = data.get("id") or d["id"]
                if str(doc_id) in keys:
                    continue
            r = spec["build"](data, d.get("path", ""))
            if spec.get("composite"):
                keyv = (r.get("user_id"), r.get("friend_id"))
            else:
                if r.get(spec["key"]) is None:
                    r[spec["key"]] = d["id"]
                keyv = r.get(spec["key"])
            if not r or keyv is None or (isinstance(keyv, tuple) and None in keyv):
                print(f"  !! skipped {d['path']}: missing key")
                continue
            rows.append(r)
            keys.add(str(keyv))

        if spec["table"] == "profiles":
            if not user_ids:
                user_ids = existing("users", "uid")
            gone = [r for r in rows if r["uid"] not in user_ids]
            rows = [r for r in rows if r["uid"] in user_ids]
            if gone:
                print("  !! skipped profiles without a users row: "
                      + ", ".join(r["uid"] for r in gone[:20]))
        elif spec["table"] == "users":
            user_ids = {r["uid"] for r in rows} | user_ids

        if rows:
            upsert(spec, rows)
        print("  done")


if __name__ == "__main__":
    main()