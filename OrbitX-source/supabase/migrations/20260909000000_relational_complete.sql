-- =========================================================================
-- ORBITX — RELATIONAL COMPLETE (ملف واحد شامل)
-- =========================================================================
-- شو بيعمل هذا الملف؟
--   1) ينشئ الجداول الكاملة للنظام (المستخدم، المحطات، النزالات، الأساطيل،
--      النقاشات، الإعلامات، الصداقات، ... إلخ) بدلاً من جدول documents.
--   2) يضيف كل "القواعد الذهبية" للأمان مرة واحدة:
--      • RLS: القراءة للكل، الكتابة لصاحب المحتوى، والجداول الحسّاسة مقفولة.
--      • قفل الرصيد: لا أحد يعدّل xp/level/role مباشرة — فقط عبر الدوال المحمية.
--      • تسليم قيادة الأسطول تلقائياً عند خروج القائد.
--      • دوال SECURITY DEFINER (grant_xp + رفيقاتها) بكل كوابح منع الغش.
--      • إعفاء صناديق الوقت (time_chest) من خنق الدقائق.
--
-- طريقة الاستخدام: SQL Editor في Supabase → الصق الملف كاملاً → Run.
-- يمكن إعادة تشغيله بأمان أكثر من مرة.
-- =========================================================================

BEGIN;

-- =========================================================================
-- 0) الأساسيات: جدول الأدمن + دوال التحقق المسبقة
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.admins (
    id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email     text UNIQUE NOT NULL,
    name      text,
    created_at timestamptz DEFAULT now()
);


INSERT INTO public.admins (email) VALUES
    ('lumafashionhq@gmail.com'),
    ('abdalrahmanjarrah94@gmail.com'),
    ('abdalrahmanjarrah1@gmail.com')
ON CONFLICT (email) DO NOTHING;


ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_readable" ON public.admins;

CREATE POLICY "admins_readable" ON public.admins FOR SELECT USING (true);
-- هل الطلب الحالي لجلسة أدمن؟ (تُستعمل داخل السياسات والدوال)

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE email = COALESCE(auth.jwt() ->> 'email', '')
  )
$$;

-- مستوى المستخدم من XP (نفس جدول المستويات في الواجهة)

CREATE OR REPLACE FUNCTION public.level_for_xp(p_xp bigint)
RETURNS bigint
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_levels bigint[] := ARRAY[0,500,1200,2100,3200,4500,6000,7700,9600,12000,14800,17800,21000,24400,28000,32000,36200,40600,45200,50000,55600,61200,66800,72400,78000,84400,90800,97200,103600,110000,117600,125200,132800,140400,148000,156400,164800,173200,181600,190000,198600,207200,215800,224400,233000,242400,251800,261200,270600,280000,289800,299600,309400,319200,329000,339200,349400,359600,369800,380000,389800,399600,409400,419200,429000,439200,449400,459600,469800,480000,489800,499600,509400,519200,529000,539200,549400,559600,569800,580000,589800,599600,609400,619200,629000,639200,649400,659600,669800,680000,691800,703600,715400,727200,739000,751200,763400,775600,787800,800000];
    v_i int;
BEGIN
    FOR v_i IN 1..array_length(v_levels, 1) LOOP
        IF p_xp < v_levels[v_i] THEN
            RETURN (v_i - 1)::bigint;
        END IF;
    END LOOP;
    RETURN array_length(v_levels, 1)::bigint;
END;
$$;

-- =========================================================================
-- 1) الجداول الكاملة
-- =========================================================================

-- 1.1) المستخدمين — حساب الرحّالة الشخصي والحسّاس

CREATE TABLE IF NOT EXISTS public.users (
    uid                TEXT PRIMARY KEY,
    displayname        TEXT NOT NULL DEFAULT '',
    email              TEXT,
    photourl           TEXT,
    bio                TEXT,
    level              INTEGER NOT NULL DEFAULT 1,
    xp                 BIGINT NOT NULL DEFAULT 0,
    hearts             INTEGER NOT NULL DEFAULT 5,
    coins              BIGINT NOT NULL DEFAULT 100,
    role               TEXT NOT NULL DEFAULT 'user',
    missionrole        TEXT,
    completedwizard    BOOLEAN DEFAULT FALSE,
    dailyfocustarget   INTEGER,
    inventory          JSONB NOT NULL DEFAULT '[]'::jsonb,
    items              JSONB NOT NULL DEFAULT '[]'::jsonb,
    equippeditems      JSONB NOT NULL DEFAULT '{}'::jsonb,
    badges             JSONB NOT NULL DEFAULT '[]'::jsonb,
    friendscount       INTEGER NOT NULL DEFAULT 0,
    banned             BOOLEAN NOT NULL DEFAULT FALSE,
    currentactivity    TEXT,
    streak             INTEGER NOT NULL DEFAULT 0,
    lastactivetime     BIGINT,
    lastactivedate     TEXT,
    lastdailyreward    TEXT,
    laststudydate      TEXT,
    totalfocustime     BIGINT,
    totalfocusminutes  BIGINT,
    focussessions      INTEGER,
    totalfocussessions INTEGER,
    fleetid            TEXT,
    fleetinvites       JSONB NOT NULL DEFAULT '[]'::jsonb,
    challengewins      INTEGER NOT NULL DEFAULT 0,
    challengechampexpiry BIGINT,
    isguest            BOOLEAN NOT NULL DEFAULT FALSE,
    weekstart          TEXT,
    weekfocusminutes   INTEGER NOT NULL DEFAULT 0,
    weeksessions       INTEGER NOT NULL DEFAULT 0,
    blackholeclaimedweek TEXT,
    invitedby          TEXT,
    referralsrewarded  JSONB NOT NULL DEFAULT '[]'::jsonb,
    timechests         JSONB,
    lastxpupdate       BIGINT,
    lastfocusxpupdate  BIGINT,
    lastforcedgrantat  BIGINT,
    extra              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_xp            ON public.users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_level         ON public.users(level DESC);
CREATE INDEX IF NOT EXISTS idx_users_fleet_id      ON public.users(fleetid);
CREATE INDEX IF NOT EXISTS idx_users_last_active   ON public.users(lastactivetime DESC);
CREATE INDEX IF NOT EXISTS idx_users_email         ON public.users(email);

-- 1.2) ملامح عامة — لوحة الصدارة ورادار الحضور

CREATE TABLE IF NOT EXISTS public.profiles (
    uid            TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
    displayname    TEXT NOT NULL DEFAULT '',
    photourl       TEXT,
    bio            TEXT,
    level          INTEGER NOT NULL DEFAULT 1,
    xp             BIGINT NOT NULL DEFAULT 0,
    role           TEXT NOT NULL DEFAULT 'user',
    streak         INTEGER NOT NULL DEFAULT 0,
    friendscount   INTEGER NOT NULL DEFAULT 0,
    banned         BOOLEAN NOT NULL DEFAULT FALSE,
    currentactivity TEXT,
    lastactivetime BIGINT,
    lastactivedate TEXT,
    totalfocussessions INTEGER,
    missionrole    TEXT,
    badges         JSONB NOT NULL DEFAULT '[]'::jsonb,
    extra          JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_xp     ON public.profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(lastactivetime DESC);

-- 1.3) الأساطيل

CREATE TABLE IF NOT EXISTS public.fleets (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL DEFAULT '',
    description       TEXT,
    ownerid           TEXT NOT NULL,
    members           JSONB NOT NULL DEFAULT '[]'::jsonb,
    coadmins          JSONB NOT NULL DEFAULT '[]'::jsonb,
    invites           JSONB NOT NULL DEFAULT '[]'::jsonb,
    logo              TEXT,
    totalfocushours   BIGINT NOT NULL DEFAULT 0,
    xp                BIGINT NOT NULL DEFAULT 0,
    extra             JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fleets_xp ON public.fleets(xp DESC);

-- 1.4) محطات التركيز (الغرف)

CREATE TABLE IF NOT EXISTS public.rooms (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL DEFAULT '',
    task                  TEXT NOT NULL DEFAULT '',
    imageurl              TEXT,
    creatorid             TEXT NOT NULL,
    creatorname           TEXT NOT NULL DEFAULT '',
    hostid                TEXT,
    participants          JSONB NOT NULL DEFAULT '[]'::jsonb,
    maxparticipants       INTEGER NOT NULL DEFAULT 8,
    timerstatus           TEXT NOT NULL DEFAULT 'idle',
    timerduration         INTEGER NOT NULL DEFAULT 25,
    breakduration         INTEGER NOT NULL DEFAULT 5,
    starttime             BIGINT,
    createdat             BIGINT,
    emptyat               BIGINT,
    sharednotes           TEXT,
    accumulatedfocusseconds BIGINT,
    ischatlocked          BOOLEAN NOT NULL DEFAULT FALSE,
    isprivate             BOOLEAN NOT NULL DEFAULT FALSE,
    joincode              TEXT,
    ischallenge           BOOLEAN NOT NULL DEFAULT FALSE,
    challengeid           TEXT,
    challengedurationminutes INTEGER,
    extra                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_status    ON public.rooms(timerstatus);
CREATE INDEX IF NOT EXISTS idx_rooms_private   ON public.rooms(isprivate);

-- 1.5) رسائل المحطات

CREATE TABLE IF NOT EXISTS public.room_messages (
    id            TEXT PRIMARY KEY,
    roomid        TEXT NOT NULL,
    text          TEXT NOT NULL DEFAULT '',
    userid        TEXT NOT NULL DEFAULT '',
    username      TEXT NOT NULL DEFAULT '',
    userphoto     TEXT,
    userranktitle TEXT,
    userrankcolor TEXT,
    userrankicon  TEXT,
    type          TEXT NOT NULL DEFAULT 'text',
    timestamp     BIGINT NOT NULL DEFAULT 0,
    extra         JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room_time
    ON public.room_messages(roomid, timestamp DESC);

-- 1.6) النزالات (التحديات)

CREATE TABLE IF NOT EXISTS public.challenges (
    id                TEXT PRIMARY KEY,
    challengerid      TEXT NOT NULL DEFAULT '',
    challengername    TEXT NOT NULL DEFAULT '',
    challengerphoto   TEXT,
    challengedid      TEXT NOT NULL DEFAULT '',
    challengedname    TEXT NOT NULL DEFAULT '',
    challengedphoto   TEXT,
    status            TEXT NOT NULL DEFAULT 'pending',
    createdat         BIGINT NOT NULL DEFAULT 0,
    starttime         BIGINT,
    durationminutes   INTEGER NOT NULL DEFAULT 60,
    progressplayer1   BIGINT NOT NULL DEFAULT 0,
    progressplayer2   BIGINT NOT NULL DEFAULT 0,
    winnerid          TEXT,
    rewardsclaimed    JSONB NOT NULL DEFAULT '[]'::jsonb,
    rewardclaimedat   BIGINT,
    extra             JSONB NOT NULL DEFAULT '{}'::jsonb,
    completedat       BIGINT,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_creator   ON public.challenges(challengerid);
CREATE INDEX IF NOT EXISTS idx_challenges_opponent  ON public.challenges(challengedid);
CREATE INDEX IF NOT EXISTS idx_challenges_status    ON public.challenges(status);

-- 1.7) النقاشات + الردود

CREATE TABLE IF NOT EXISTS public.discussions (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL DEFAULT '',
    content      TEXT NOT NULL DEFAULT '',
    userid       TEXT NOT NULL DEFAULT '',
    username     TEXT NOT NULL DEFAULT '',
    userphoto    TEXT,
    category     TEXT,
    repliescount INTEGER NOT NULL DEFAULT 0,
    likescount   INTEGER NOT NULL DEFAULT 0,
    likedby      JSONB NOT NULL DEFAULT '[]'::jsonb,
    timestamp    BIGINT NOT NULL DEFAULT 0,
    extra        JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discussions_category ON public.discussions(category);
CREATE INDEX IF NOT EXISTS idx_discussions_time     ON public.discussions(timestamp DESC);


CREATE TABLE IF NOT EXISTS public.discussion_replies (
    id           TEXT PRIMARY KEY,
    discussionid TEXT NOT NULL,
    text         TEXT NOT NULL DEFAULT '',
    userid       TEXT NOT NULL DEFAULT '',
    username     TEXT NOT NULL DEFAULT '',
    userphoto    TEXT,
    timestamp    BIGINT NOT NULL DEFAULT 0,
    extra        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_replies_discussion ON public.discussion_replies(discussionid, timestamp ASC);

-- 1.8) الجدول الدراسي

CREATE TABLE IF NOT EXISTS public.schedules (
    id        TEXT PRIMARY KEY,
    userid    TEXT NOT NULL DEFAULT '',
    day       TEXT NOT NULL DEFAULT '',
    time      TEXT NOT NULL DEFAULT '',
    task      TEXT NOT NULL DEFAULT '',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    priority  TEXT,
    category  TEXT,
    duration  INTEGER,
    color     TEXT,
    timestamp BIGINT,
    extra     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedules_user ON public.schedules(userid, day);

-- 1.9) الإعلامات (العلبة)

CREATE TABLE IF NOT EXISTS public.notifications (
    id          TEXT PRIMARY KEY,
    recipientid TEXT NOT NULL,
    senderid    TEXT,
    type        TEXT NOT NULL DEFAULT '',
    content     TEXT NOT NULL DEFAULT '',
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp   BIGINT NOT NULL DEFAULT 0,
    extra       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
    ON public.notifications(recipientid, read) WHERE read = FALSE;

-- 1.10) الصداقات (علاقة باتجاه واحد؛ يقبل الطرفان ويُكتب اتجيانياً)

CREATE TABLE IF NOT EXISTS public.friends (
    user_id    TEXT NOT NULL,
    friend_id  TEXT NOT NULL,
    timestamp  BIGINT NOT NULL DEFAULT 0,
    extra      JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_friend ON public.friends(friend_id);

-- 1.11) معرض الإنجازات

CREATE TABLE IF NOT EXISTS public.exhibitions (
    id        TEXT PRIMARY KEY,
    userid    TEXT NOT NULL DEFAULT '',
    username  TEXT NOT NULL DEFAULT '',
    url       TEXT NOT NULL DEFAULT '',
    timestamp BIGINT NOT NULL DEFAULT 0,
    extra     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exhibitions_time ON public.exhibitions(timestamp DESC);

-- 1.12) الاقتراحات + تذاكر الدعم

CREATE TABLE IF NOT EXISTS public.suggestions (
    id        TEXT PRIMARY KEY,
    userid    TEXT NOT NULL DEFAULT '',
    username  TEXT NOT NULL DEFAULT '',
    text      TEXT NOT NULL DEFAULT '',
    reply     TEXT,
    repliedat BIGINT,
    timestamp BIGINT NOT NULL DEFAULT 0,
    extra     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.support_tickets (
    id          TEXT PRIMARY KEY,
    userid      TEXT NOT NULL DEFAULT '',
    username    TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'open',
    lastmessage TEXT,
    messages    JSONB NOT NULL DEFAULT '[]'::jsonb,
    updatedat   BIGINT,
    extra       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.13) سجل الأخطاء (الكتابة مقفولة — فقط عبر دالة آمنة)

CREATE TABLE IF NOT EXISTS public.errors (
    id         TEXT PRIMARY KEY,
    uid        TEXT,
    username   TEXT,
    message    TEXT NOT NULL DEFAULT '',
    context    TEXT,
    source     TEXT,
    stack      TEXT,
    url        TEXT,
    useragent  TEXT,
    count      INTEGER NOT NULL DEFAULT 1,
    ts         BIGINT NOT NULL DEFAULT 0,
    createdat  BIGINT,
    extra      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.14) تنبيهات الأدمن + تحديثات التطبيق + إعلامات عامة + نصيحة اليوم

CREATE TABLE IF NOT EXISTS public.admin_alerts (
    id         TEXT PRIMARY KEY,
    adminid    TEXT NOT NULL DEFAULT '',
    message    TEXT NOT NULL DEFAULT '',
    createdat  BIGINT,
    extra      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.app_updates (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL DEFAULT '',
    version     TEXT,
    description TEXT,
    adminid     TEXT,
    published   BOOLEAN NOT NULL DEFAULT TRUE,
    createdat   BIGINT,
    extra       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.global_notifications (
    id         TEXT PRIMARY KEY,
    title      TEXT,
    content    TEXT,
    timestamp  BIGINT NOT NULL DEFAULT 0,
    extra      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.advices (
    id         TEXT PRIMARY KEY,
    text       TEXT NOT NULL DEFAULT '',
    timestamp  BIGINT NOT NULL DEFAULT 0,
    extra      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.15) إشارات التوعية

CREATE TABLE IF NOT EXISTS public.awareness_signals (
    id        TEXT PRIMARY KEY,
    title     TEXT NOT NULL DEFAULT '',
    content   TEXT NOT NULL DEFAULT '',
    category  TEXT,
    userid    TEXT NOT NULL DEFAULT '',
    views     INTEGER NOT NULL DEFAULT 0,
    likes     INTEGER NOT NULL DEFAULT 0,
    timestamp BIGINT NOT NULL DEFAULT 0,
    extra     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.16) النظام العام + اشتراكات الإشعارات

CREATE TABLE IF NOT EXISTS public.system (
    key        TEXT PRIMARY KEY,
    value      JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    endpoint  TEXT PRIMARY KEY,
    userid    TEXT NOT NULL DEFAULT '',
    data      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_user ON public.push_subscriptions(userid);

-- =========================================================================
-- 2) القواعد: التحديث التلقائي + قفل الرصيد + تسليم قيادة الأسطول
-- =========================================================================

-- 2.1) تحديث updated_at التلقائي

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users','profiles','fleets','rooms','challenges','discussions',
        'suggestions','system'
    ] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', t, t);
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

-- 2.2) قفل الرصيد — xp/level/role لا تُعدّل مباشرة أبداً،
--     فقط عبر الدوال المحمية أو حسابات الأدمن.

CREATE OR REPLACE FUNCTION public.protect_progression_rel()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_old jsonb := to_jsonb(OLD);
    v_new jsonb := to_jsonb(NEW);
BEGIN
  IF NEW.uid = OLD.uid
     AND NOT public.is_admin_user()
     AND COALESCE(current_setting('app.progression_allowed', true), '0') <> '1' THEN
    IF (v_old ? 'xp'     AND (v_old ->> 'xp')     IS DISTINCT FROM (v_new ->> 'xp'))
       OR (v_old ? 'level'  AND (v_old ->> 'level')  IS DISTINCT FROM (v_new ->> 'level'))
       OR (v_old ? 'coins'  AND (v_old ->> 'coins')  IS DISTINCT FROM (v_new ->> 'coins'))
       OR (v_old ? 'hearts' AND (v_old ->> 'hearts') IS DISTINCT FROM (v_new ->> 'hearts'))
       OR (v_old ? 'role'   AND (v_old ->> 'role')   IS DISTINCT FROM (v_new ->> 'role')) THEN
      RAISE EXCEPTION 'progression_fields_locked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_protect_progression_users ON public.users;

DROP TRIGGER IF EXISTS trg_protect_progression_profiles ON public.profiles;
CREATE TRIGGER trg_protect_progression_users
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.protect_progression_rel();
CREATE TRIGGER trg_protect_progression_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_progression_rel();

-- 2.3) تسليم قيادة الأسطول تلقائياً — إن خرج القائد من الأعضاء أصبح
--     الأسطول بلا قائد، لذا تُنقل القيادة فوراً:
--     أ) لنائب الرئيس (أول co-admin ما زال عضواً).
--     ب) ثم لأقدم عضو متبقٍّ.
--     ويُزال القائد القديم من قائمة النواب إن كان نائباً.

CREATE OR REPLACE FUNCTION public.fleet_owner_handover()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    old_owner text;
    heir      text;
    members   jsonb;
    co_admins jsonb;
BEGIN
    old_owner := NEW.ownerid;
    IF old_owner IS NULL OR old_owner = '' THEN
        RETURN NEW;
    END IF;

    members   := COALESCE(NEW.members, '[]'::jsonb);
    co_admins := COALESCE(NEW.coadmins, '[]'::jsonb);

    IF members @> to_jsonb(old_owner) THEN
        RETURN NEW;
    END IF;

    SELECT m INTO heir
    FROM jsonb_array_elements_text(co_admins) WITH ORDINALITY AS t(m, ord)
    WHERE members @> to_jsonb(m)
    ORDER BY ord
    LIMIT 1;

    IF heir IS NULL THEN
        SELECT m INTO heir
        FROM jsonb_array_elements_text(members) AS m
        LIMIT 1;
    END IF;

    IF heir IS NOT NULL THEN
        NEW.ownerid := heir;
        IF co_admins @> to_jsonb(old_owner) THEN
            NEW.coadmins := (SELECT COALESCE(jsonb_agg(c), '[]'::jsonb)
                             FROM jsonb_array_elements_text(co_admins) AS c
                             WHERE c <> old_owner);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_fleet_owner_handover ON public.fleets;
CREATE TRIGGER trg_fleet_owner_handover
BEFORE UPDATE ON public.fleets
FOR EACH ROW
EXECUTE FUNCTION public.fleet_owner_handover();

-- =========================================================================
-- 3) ROW LEVEL SECURITY — كل قواعد الوصول
--    القراءة العامة، الكتابة لصاحب المحتوى، والجداول الحسّاسة مقفولة.
-- =========================================================================

ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fleets               ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.rooms                ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.room_messages        ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.challenges           ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.discussions          ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.discussion_replies   ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.schedules            ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.friends              ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exhibitions          ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.suggestions          ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.support_tickets      ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.errors               ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_alerts         ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.app_updates          ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.global_notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.awareness_signals    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.advices              ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.system               ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.push_subscriptions   ENABLE ROW LEVEL SECURITY;

-- 3.1) القراءة العامة

DROP POLICY IF EXISTS "rel_select_all_users"    ON public.users;

DROP POLICY IF EXISTS "rel_select_all_profiles" ON public.profiles;

DROP POLICY IF EXISTS "rel_select_all_rooms"    ON public.rooms;

DROP POLICY IF EXISTS "rel_select_room_msgs"    ON public.room_messages;

DROP POLICY IF EXISTS "rel_select_discussions"  ON public.discussions;

DROP POLICY IF EXISTS "rel_select_replies"      ON public.discussion_replies;

DROP POLICY IF EXISTS "rel_select_advices"      ON public.advices;

DROP POLICY IF EXISTS "rel_select_awareness"    ON public.awareness_signals;

DROP POLICY IF EXISTS "rel_select_exhibitions"  ON public.exhibitions;

DROP POLICY IF EXISTS "rel_select_challenges"   ON public.challenges;

DROP POLICY IF EXISTS "rel_select_fleets"       ON public.fleets;

DROP POLICY IF EXISTS "rel_select_suggestions"  ON public.suggestions;

DROP POLICY IF EXISTS "rel_select_system"       ON public.system;

DROP POLICY IF EXISTS "rel_select_errors"       ON public.errors;


CREATE POLICY "rel_select_all_users"    ON public.users                FOR SELECT USING (true);
CREATE POLICY "rel_select_all_profiles" ON public.profiles             FOR SELECT USING (true);
CREATE POLICY "rel_select_all_rooms"    ON public.rooms                FOR SELECT USING (true);
CREATE POLICY "rel_select_room_msgs"    ON public.room_messages        FOR SELECT USING (true);
CREATE POLICY "rel_select_discussions"  ON public.discussions          FOR SELECT USING (true);
CREATE POLICY "rel_select_replies"      ON public.discussion_replies   FOR SELECT USING (true);
CREATE POLICY "rel_select_advices"      ON public.advices              FOR SELECT USING (true);
CREATE POLICY "rel_select_awareness"    ON public.awareness_signals    FOR SELECT USING (true);
CREATE POLICY "rel_select_exhibitions"  ON public.exhibitions          FOR SELECT USING (true);
CREATE POLICY "rel_select_challenges"   ON public.challenges           FOR SELECT USING (true);
CREATE POLICY "rel_select_fleets"       ON public.fleets               FOR SELECT USING (true);
CREATE POLICY "rel_select_suggestions"  ON public.suggestions          FOR SELECT USING (true);
CREATE POLICY "rel_select_system"       ON public.system               FOR SELECT USING (true);
CREATE POLICY "rel_select_errors"       ON public.errors               FOR SELECT USING (true);
-- 3.2) المستخدم: يكتب ملفه فقط

DROP POLICY IF EXISTS "rel_insert_own_users" ON public.users;

CREATE POLICY "rel_insert_own_users"
    ON public.users FOR INSERT WITH CHECK (auth.uid()::text = uid);

DROP POLICY IF EXISTS "rel_update_own_users" ON public.users;

CREATE POLICY "rel_update_own_users"
    ON public.users FOR UPDATE USING (auth.uid()::text = uid) WITH CHECK (auth.uid()::text = uid);

-- 3.3) الملامح: المالك فقط

DROP POLICY IF EXISTS "rel_insert_own_profiles" ON public.profiles;

CREATE POLICY "rel_insert_own_profiles"
    ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = uid);

DROP POLICY IF EXISTS "rel_update_own_profiles" ON public.profiles;

CREATE POLICY "rel_update_own_profiles"
    ON public.profiles FOR UPDATE USING (auth.uid()::text = uid) WITH CHECK (auth.uid()::text = uid);

-- 3.4) الرسائل: المرسل يكتب رسالته

DROP POLICY IF EXISTS "rel_insert_own_msgs" ON public.room_messages;

CREATE POLICY "rel_insert_own_msgs"
    ON public.room_messages FOR INSERT WITH CHECK (auth.uid()::text = userid);

DROP POLICY IF EXISTS "rel_update_own_msgs" ON public.room_messages;

CREATE POLICY "rel_update_own_msgs"
    ON public.room_messages FOR UPDATE USING (auth.uid()::text = userid);

DROP POLICY IF EXISTS "rel_owned_del_msgs" ON public.room_messages;

CREATE POLICY "rel_owned_del_msgs"
    ON public.room_messages FOR DELETE USING (auth.uid()::text = userid OR public.is_admin_user());

-- 3.5) الإعلامات: أي مستخدم مسجّل يضع إشعاراً (النزال يكتب في علبة الطرف
--     الآخر)، والقراءة/التعديل/الحذف للمستلم فقط.

DROP POLICY IF EXISTS "rel_sel_own_notifications" ON public.notifications;

CREATE POLICY "rel_sel_own_notifications"
    ON public.notifications FOR SELECT USING (auth.uid()::text = recipientid OR public.is_admin_user());

DROP POLICY IF EXISTS "rel_insert_any_notifications" ON public.notifications;

CREATE POLICY "rel_insert_any_notifications"
    ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rel_upd_own_notifications" ON public.notifications;

CREATE POLICY "rel_upd_own_notifications"
    ON public.notifications FOR UPDATE USING (auth.uid()::text = recipientid OR public.is_admin_user());

DROP POLICY IF EXISTS "rel_del_own_notifications" ON public.notifications;

CREATE POLICY "rel_del_own_notifications"
    ON public.notifications FOR DELETE USING (auth.uid()::text = recipientid OR public.is_admin_user());

-- 3.6) الصداقات: أي مسجل يشكّل الصداقة (كتابة اتجانية للطرفين، لأن القبول
--     يكتب سطراً في قائمة قبل وعلى السطر المقابل لقائله)، والقراءة لما يخصّني.

DROP POLICY IF EXISTS "rel_sel_own_friends" ON public.friends;

CREATE POLICY "rel_sel_own_friends"
    ON public.friends FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "rel_insert_any_friends" ON public.friends;

CREATE POLICY "rel_insert_any_friends"
    ON public.friends FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rel_del_own_friends" ON public.friends;

CREATE POLICY "rel_del_own_friends"
    ON public.friends FOR DELETE USING (auth.uid()::text = user_id);

-- 3.7) الجدول الدراسي والاشتراكات: المالك فقط

DROP POLICY IF EXISTS "rel_own_schedules" ON public.schedules;

CREATE POLICY "rel_own_schedules"
    ON public.schedules FOR ALL USING (auth.uid()::text = userid) WITH CHECK (auth.uid()::text = userid);

DROP POLICY IF EXISTS "rel_own_pushes" ON public.push_subscriptions;

CREATE POLICY "rel_own_pushes"
    ON public.push_subscriptions FOR ALL USING (auth.uid()::text = userid) WITH CHECK (auth.uid()::text = userid);

-- 3.8) الجداول التعاونية (المحطات / النزالات / الأساطيل):
--     أي مستخدم مسجل يبني ويحدّث — كل مشارك يحدّث الغرفة والنزال.

DROP POLICY IF EXISTS "rel_collab_rooms" ON public.rooms;

CREATE POLICY "rel_collab_rooms"
    ON public.rooms FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rel_collab_challenges" ON public.challenges;

CREATE POLICY "rel_collab_challenges"
    ON public.challenges FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rel_collab_fleets" ON public.fleets;

CREATE POLICY "rel_collab_fleets"
    ON public.fleets FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 3.9) محتوى أصحاب/أصحابه (النقاشات والردود والاقتراحات والمعرض وإشارات
--     التوعية والتذاكر): الإضافة لأي مسجل تعديلاً، والتعديل/الحذف للمؤلف أو الأدمن.

DROP POLICY IF EXISTS "rel_owned_insert_generic" ON public.discussions;

CREATE POLICY "rel_owned_insert_generic"
    ON public.discussions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rel_owned_insert_generic_r" ON public.discussion_replies;

CREATE POLICY "rel_owned_insert_generic_r"
    ON public.discussion_replies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rel_owned_insert_sugg" ON public.suggestions;

CREATE POLICY "rel_owned_insert_sugg"
    ON public.suggestions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rel_owned_insert_exhib" ON public.exhibitions;

CREATE POLICY "rel_owned_insert_exhib"
    ON public.exhibitions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rel_owned_insert_aware" ON public.awareness_signals;

CREATE POLICY "rel_owned_insert_aware"
    ON public.awareness_signals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rel_owned_insert_tickets" ON public.support_tickets;

CREATE POLICY "rel_owned_insert_tickets"
    ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rel_owned_mutate_generic" ON public.discussions;

CREATE POLICY "rel_owned_mutate_generic"
    ON public.discussions FOR UPDATE USING (auth.uid()::text = userid OR public.is_admin_user());

DROP POLICY IF EXISTS "rel_owned_mutate_generic_r" ON public.discussion_replies;

CREATE POLICY "rel_owned_mutate_generic_r"
    ON public.discussion_replies FOR UPDATE USING (auth.uid()::text = userid OR public.is_admin_user());

DROP POLICY IF EXISTS "rel_owned_mutate_sugg" ON public.suggestions;

CREATE POLICY "rel_owned_mutate_sugg"
    ON public.suggestions FOR UPDATE USING (auth.uid()::text = userid OR public.is_admin_user());

DROP POLICY IF EXISTS "rel_owned_mutate_exhib" ON public.exhibitions;

CREATE POLICY "rel_owned_mutate_exhib"
    ON public.exhibitions FOR UPDATE USING (auth.uid()::text = userid OR public.is_admin_user());

DROP POLICY IF EXISTS "rel_owned_mutate_aware" ON public.awareness_signals;

CREATE POLICY "rel_owned_mutate_aware"
    ON public.awareness_signals FOR UPDATE USING (auth.uid()::text = userid OR public.is_admin_user());

DROP POLICY IF EXISTS "rel_owned_mutate_tickets" ON public.support_tickets;

CREATE POLICY "rel_owned_mutate_tickets"
    ON public.support_tickets FOR UPDATE USING (auth.uid()::text = userid OR public.is_admin_user());

DROP POLICY IF EXISTS "rel_owned_del_generic" ON public.discussions;

CREATE POLICY "rel_owned_del_generic"
    ON public.discussions FOR DELETE USING (auth.uid()::text = userid OR public.is_admin_user());

DROP POLICY IF EXISTS "rel_owned_del_generic_r" ON public.discussion_replies;

CREATE POLICY "rel_owned_del_generic_r"
    ON public.discussion_replies FOR DELETE USING (auth.uid()::text = userid OR public.is_admin_user());

DROP POLICY IF EXISTS "rel_owned_del_sugg" ON public.suggestions;

CREATE POLICY "rel_owned_del_sugg"
    ON public.suggestions FOR DELETE USING (auth.uid()::text = userid OR public.is_admin_user());

DROP POLICY IF EXISTS "rel_owned_del_exhib" ON public.exhibitions;

CREATE POLICY "rel_owned_del_exhib"
    ON public.exhibitions FOR DELETE USING (auth.uid()::text = userid OR public.is_admin_user());

DROP POLICY IF EXISTS "rel_owned_del_aware" ON public.awareness_signals;

CREATE POLICY "rel_owned_del_aware"
    ON public.awareness_signals FOR DELETE USING (auth.uid()::text = userid OR public.is_admin_user());

DROP POLICY IF EXISTS "rel_owned_del_tickets" ON public.support_tickets;

CREATE POLICY "rel_owned_del_tickets"
    ON public.support_tickets FOR DELETE USING (auth.uid()::text = userid OR public.is_admin_user());

-- 3.10) التذاكر: القراءة للمالك أو الأدمن

DROP POLICY IF EXISTS "rel_sel_tickets" ON public.support_tickets;

CREATE POLICY "rel_sel_tickets"
    ON public.support_tickets FOR SELECT USING (userid = auth.uid()::text OR public.is_admin_user());

-- 3.11) جداول الأدمن (النظام / التنبيهات / التحديثات / الإعلام العام / النصيحة):
--     قراءة للجميع، كتابة للأدمن فقط.

DROP POLICY IF EXISTS "rel_sel_admin_tables" ON public.admin_alerts;
DROP POLICY IF EXISTS "rel_sel_updates"      ON public.app_updates;
DROP POLICY IF EXISTS "rel_sel_globals"      ON public.global_notifications;
DROP POLICY IF EXISTS "rel_sel_advices2"     ON public.advices;
DROP POLICY IF EXISTS "rel_sel_system2"      ON public.system;

CREATE POLICY "rel_sel_admin_tables"
    ON public.admin_alerts FOR SELECT USING (true);
CREATE POLICY "rel_sel_updates"
    ON public.app_updates FOR SELECT USING (true);
CREATE POLICY "rel_sel_globals"
    ON public.global_notifications FOR SELECT USING (true);
CREATE POLICY "rel_sel_advices2"
    ON public.advices FOR SELECT USING (true);
CREATE POLICY "rel_sel_system2"
    ON public.system FOR SELECT USING (true);

DROP POLICY IF EXISTS "rel_admin_write_alerts" ON public.admin_alerts;

CREATE POLICY "rel_admin_write_alerts" ON public.admin_alerts FOR INSERT WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "rel_admin_write_updates" ON public.app_updates;

CREATE POLICY "rel_admin_write_updates" ON public.app_updates FOR INSERT WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "rel_admin_write_globals" ON public.global_notifications;

CREATE POLICY "rel_admin_write_globals" ON public.global_notifications FOR INSERT WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "rel_admin_write_advices" ON public.advices;

CREATE POLICY "rel_admin_write_advices" ON public.advices FOR INSERT WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "rel_admin_write_system" ON public.system;

CREATE POLICY "rel_admin_write_system" ON public.system FOR INSERT WITH CHECK (public.is_admin_user());

-- 3.12) الأدمن يدير أي مستخدم/ملف (تبليغ، تصليح رصيد...)

DROP POLICY IF EXISTS "rel_admin_manage_users" ON public.users;

CREATE POLICY "rel_admin_manage_users"
    ON public.users FOR ALL USING (public.is_admin_user());

DROP POLICY IF EXISTS "rel_admin_manage_profiles" ON public.profiles;

CREATE POLICY "rel_admin_manage_profiles"
    ON public.profiles FOR ALL USING (public.is_admin_user());

-- 3.13) جدول errors: لا كتابة مباشرة — كله عبر دالة log_error

REVOKE INSERT, UPDATE, DELETE ON public.errors FROM authenticated;

-- =========================================================================
-- 4) الدوال المحمية (SECURITY DEFINER) — كل منطق الرصيد والمعاملات
--    هذه الدوال تعمل بصلاحية مرفوعة لكنها تتحقق من المتصل أولاً.
-- =========================================================================

-- 4.1) تسجيل الأخطاء (ليستقرئها الأدمن من لوحة الإدارة)

CREATE OR REPLACE FUNCTION public.log_error(
    p_data jsonb,
    p_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id text := p_id;
BEGIN
    IF v_id IS NULL THEN
        v_id := gen_random_uuid()::text;
        INSERT INTO public.errors (id, uid, username, message, context, stack, url, useragent, count, ts, createdat, extra)
        VALUES (
            v_id,
            p_data ->> 'uid',
            p_data ->> 'username',
            COALESCE(p_data ->> 'message', ''),
            p_data ->> 'context',
            p_data ->> 'stack',
            p_data ->> 'url',
            p_data ->> 'useragent',
            GREATEST(COALESCE((p_data ->> 'count')::int, 1), 1),
            COALESCE((p_data ->> 'ts')::bigint, (extract(epoch FROM now()) * 1000)::bigint),
            (p_data ->> 'createdat'),
            COALESCE(p_data -> 'extra', '{}'::jsonb)
        );
    ELSE
        UPDATE public.errors
        SET count = count + 1,
            ts = COALESCE((p_data ->> 'ts')::bigint, ts),
            created_at = now()
        WHERE id = v_id;
        IF NOT FOUND THEN
            INSERT INTO public.errors (id, uid, username, message, context, stack, url, useragent, count, ts, createdat, extra)
            VALUES (
                v_id,
                p_data ->> 'uid',
                p_data ->> 'username',
                COALESCE(p_data ->> 'message', ''),
                p_data ->> 'context',
                p_data ->> 'stack',
                p_data ->> 'url',
                p_data ->> 'useragent',
                1,
                COALESCE((p_data ->> 'ts')::bigint, (extract(epoch FROM now()) * 1000)::bigint),
                (p_data ->> 'createdat'),
                COALESCE(p_data -> 'extra', '{}'::jsonb)
            );
        END IF;
    END IF;
    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;


CREATE OR REPLACE FUNCTION public.bump_error_count(
    p_id text,
    p_last_at bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.errors
    SET count = count + 1,
        ts = p_last_at,
        created_at = now()
    WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

-- 4.2) grant_xp — منح/خصم XP بتحقق خادمي، بفترة تبريد، وبكوابح من الغش.
--     نقاط القواعد الذهبية:
--       • لا تساعد على نفسك إلا بدفع سليم وسقف منح (500) وتجاوز محدود (120).
--       • فترة تبريد 45 ثانية بين المنح المتتالية (focus و غير focus منفصلتين).
--       • نسخ إلزامية بين طرق اللعب والتحديات بلا تجاوزات من الغشاشين.
--       • صناديق الوقت (time_chest) معفاة من خنق الدقيقة الواحدة.

CREATE OR REPLACE FUNCTION public.grant_xp(
    p_user_id text,
    p_fleet_id text DEFAULT NULL,
    p_challenge_id text DEFAULT NULL,
    p_is_player1 boolean DEFAULT false,
    p_amount bigint DEFAULT 0,
    p_source text DEFAULT '',
    p_force boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid text := auth.uid()::text;
    v_user public.users%ROWTYPE;
    v_old_xp bigint;
    v_new_xp bigint;
    v_level bigint;
    v_now bigint := (extract(epoch FROM now()) * 1000)::bigint;
    v_is_focus boolean := p_source LIKE '%Focus Interval Loop%';
    v_blocked boolean := false;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;
    IF p_amount = 0 THEN
        RETURN jsonb_build_object('success', true, 'blocked', false, 'amount', 0);
    END IF;

    -- لا تساعد إلا نفسك، أو الأدمن يساعد أي أحد
    IF v_uid <> p_user_id AND NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    -- سقف منح لكل استدعاء
    IF NOT public.is_admin_user() AND abs(p_amount) > 500 THEN
        RAISE EXCEPTION 'exceeds_grant_limit';
    END IF;

    -- القوي (تجاوز التبريد) للمكافآت الصغيرة فقط ≤ 120
    IF NOT public.is_admin_user() AND p_force AND p_amount > 120 THEN
        RAISE EXCEPTION 'force_bypass_forbidden';
    END IF;

    SELECT * INTO v_user
    FROM public.users
    WHERE uid = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'blocked', false, 'error', 'no_user');
    END IF;

    v_old_xp := COALESCE(v_user.xp, 0);

    -- فترة التبريد 45 ثانية إلا إذا كان التجاوز صريحاً
    IF NOT p_force AND p_amount > 0 THEN
        IF v_is_focus THEN
            IF v_now - COALESCE(v_user.lastfocusxpupdate, 0) < 45000 THEN
                v_blocked := true;
            END IF;
        ELSE
            IF v_now - COALESCE(v_user.lastxpupdate, 0) < 45000 THEN
                v_blocked := true;
            END IF;
        END IF;
    END IF;

    -- خنق التجاوزات القوية لمرة كل دقيقة — مع إعفاء صناديق الوقت
    IF NOT v_blocked AND NOT public.is_admin_user() AND p_force AND p_amount > 0
       AND p_source <> 'time_chest' THEN
        IF v_now - COALESCE(v_user.lastforcedgrantat, 0) < 60000 THEN
            v_blocked := true;
        END IF;
    END IF;

    IF v_blocked THEN
        RETURN jsonb_build_object('success', false, 'blocked', true, 'amount', p_amount);
    END IF;

    v_new_xp := v_old_xp + p_amount;
    v_level := public.level_for_xp(v_new_xp);

    PERFORM set_config('app.progression_allowed', '1', true);
    UPDATE public.users
    SET xp = v_new_xp,
        level = v_level,
        lastxpupdate = CASE WHEN p_amount > 0 THEN v_now ELSE lastxpupdate END,
        lastfocusxpupdate = CASE WHEN p_amount > 0 AND v_is_focus THEN v_now ELSE lastfocusxpupdate END,
        lastforcedgrantat = CASE WHEN p_amount > 0 AND p_force AND NOT public.is_admin_user()
                                 THEN v_now ELSE lastforcedgrantat END
    WHERE uid = p_user_id;

    -- مرآة للوحة الصدارة
    UPDATE public.profiles
    SET xp = v_new_xp,
        level = v_level
    WHERE uid = p_user_id;

    -- تقدم الأسطول
    IF p_fleet_id IS NOT NULL THEN
        UPDATE public.fleets
        SET xp = COALESCE(xp, 0) + p_amount
        WHERE id = p_fleet_id;
    END IF;

    -- تقدم النزال
    IF p_challenge_id IS NOT NULL THEN
        IF p_is_player1 THEN
            UPDATE public.challenges SET progressplayer1 = COALESCE(progressplayer1, 0) + p_amount
            WHERE id = p_challenge_id;
        ELSE
            UPDATE public.challenges SET progressplayer2 = COALESCE(progressplayer2, 0) + p_amount
            WHERE id = p_challenge_id;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'blocked', false, 'amount', p_amount, 'xp', v_new_xp, 'level', v_level);
END;
$$;

-- 4.3) جائزة الفائز بالنزال — فقط بعد الاكتمال، للفائز الحقيقي، ومرة واحدة

CREATE OR REPLACE FUNCTION public.grant_challenge_reward(
    p_challenge_id text,
    p_winner_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid text := auth.uid()::text;
    v_ch public.challenges%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    SELECT * INTO v_ch
    FROM public.challenges
    WHERE id = p_challenge_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'no_challenge');
    END IF;

    IF NOT public.is_admin_user()
       AND v_uid <> v_ch.challengerid AND v_uid <> v_ch.challengedid THEN
        RAISE EXCEPTION 'forbidden';
    END IF;
    IF p_winner_id <> v_ch.challengerid AND p_winner_id <> v_ch.challengedid THEN
        RAISE EXCEPTION 'invalid_winner';
    END IF;

    IF v_ch.status <> 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_completed');
    END IF;
    IF v_ch.winnerid <> p_winner_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_winner');
    END IF;
    IF v_ch.rewardclaimedat IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_rewarded');
    END IF;

    PERFORM public.grant_xp(p_winner_id, NULL, NULL, false, 100, 'challenge_win', true);

    PERFORM set_config('app.progression_allowed', '1', true);

    UPDATE public.users
    SET coins = COALESCE(coins, 0) + 50,
        badges = CASE WHEN badges @> '["challenge_champ"]'::jsonb
                      THEN badges ELSE COALESCE(badges, '[]'::jsonb) || '["challenge_champ"]'::jsonb END,
        challengechampexpiry = (extract(epoch FROM now()) * 1000)::bigint + 7 * 24 * 60 * 60 * 1000
    WHERE uid = p_winner_id;

    UPDATE public.profiles
    SET badges = CASE WHEN badges @> '["challenge_champ"]'::jsonb
                      THEN badges ELSE COALESCE(badges, '[]'::jsonb) || '["challenge_champ"]'::jsonb END
    WHERE uid = p_winner_id;

    UPDATE public.challenges
    SET rewardclaimedat = (extract(epoch FROM now()) * 1000)::bigint
    WHERE id = p_challenge_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4.4) شراء من متجر المتجر — يمنع الرصيد السالب

CREATE OR REPLACE FUNCTION public.purchase_item_deduct(
    p_user_id text,
    p_price bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid text := auth.uid()::text;
    v_old_xp bigint;
    v_new_xp bigint;
    v_level bigint;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;
    IF v_uid <> p_user_id AND NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'forbidden';
    END IF;
    IF p_price <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_price');
    END IF;

    SELECT COALESCE(xp, 0) INTO v_old_xp
    FROM public.users
    WHERE uid = p_user_id
    FOR UPDATE;

    IF v_old_xp < p_price THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient');
    END IF;

    v_new_xp := v_old_xp - p_price;
    v_level := public.level_for_xp(v_new_xp);

    PERFORM set_config('app.progression_allowed', '1', true);
    UPDATE public.users
    SET xp = v_new_xp, level = v_level
    WHERE uid = p_user_id;

    UPDATE public.profiles
    SET xp = v_new_xp, level = v_level
    WHERE uid = p_user_id;

    RETURN jsonb_build_object('success', true, 'xp', v_new_xp, 'level', v_level);
END;
$$;

-- 4.5) تعديل رصيد مطلق — الأدمن فقط

CREATE OR REPLACE FUNCTION public.admin_set_xp(
    p_user_id text,
    p_xp bigint,
    p_level bigint DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_level bigint := p_level;
BEGIN
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    IF v_level IS NULL THEN
        v_level := public.level_for_xp(p_xp);
    END IF;

    PERFORM set_config('app.progression_allowed', '1', true);

    UPDATE public.users SET xp = p_xp, level = v_level WHERE uid = p_user_id;
    UPDATE public.profiles SET xp = p_xp, level = v_level WHERE uid = p_user_id;

    RETURN jsonb_build_object('success', true, 'xp', p_xp, 'level', v_level);
END;
$$;

-- 4.6) عدّاد آمن بأبيض قائمة — لا SQL ديناميكي، ولا يمسّ xp/level/coins

CREATE OR REPLACE FUNCTION public.rel_increment(
    p_table text,
    p_id text,
    p_field text,
    p_amount bigint DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid text := auth.uid()::text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    CASE (p_table, p_field)
        WHEN ('discussions', 'likescount') THEN
            UPDATE public.discussions SET likescount = likescount + p_amount WHERE id = p_id;
        WHEN ('discussions', 'repliescount') THEN
            UPDATE public.discussions SET repliescount = repliescount + p_amount WHERE id = p_id;
        WHEN ('awareness_signals', 'views') THEN
            UPDATE public.awareness_signals SET views = views + p_amount WHERE id = p_id;
        WHEN ('awareness_signals', 'likes') THEN
            UPDATE public.awareness_signals SET likes = likes + p_amount WHERE id = p_id;
        WHEN ('challenges', 'progressplayer1') THEN
            UPDATE public.challenges SET progressplayer1 = COALESCE(progressplayer1, 0) + p_amount WHERE id = p_id;
        WHEN ('challenges', 'progressplayer2') THEN
            UPDATE public.challenges SET progressplayer2 = COALESCE(progressplayer2, 0) + p_amount WHERE id = p_id;
        ELSE
            RAISE EXCEPTION 'increment_not_allowed';
    END CASE;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- =========================================================================
-- 5) الصلاحيات (GRANTs)
-- =========================================================================

GRANT EXECUTE ON FUNCTION public.level_for_xp(bigint) TO authenticated;

GRANT EXECUTE ON FUNCTION public.log_error(jsonb, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.bump_error_count(text, bigint) TO authenticated;

GRANT EXECUTE ON FUNCTION public.grant_xp(text, text, text, boolean, bigint, text, boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION public.grant_challenge_reward(text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.purchase_item_deduct(text, bigint) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_set_xp(text, bigint, bigint) TO authenticated;

GRANT EXECUTE ON FUNCTION public.rel_increment(text, text, text, bigint) TO authenticated;


GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

GRANT SELECT, UPDATE, INSERT, DELETE ON public.users, public.profiles, public.rooms, public.challenges,
     public.discussions, public.discussion_replies, public.fleets, public.schedules,
     public.notifications, public.friends, public.exhibitions, public.suggestions,
     public.support_tickets, public.admin_alerts, public.app_updates,
     public.global_notifications, public.awareness_signals, public.advices,
     public.room_messages, public.system, public.push_subscriptions
     TO authenticated;

-- =========================================================================
-- 6) Realtime للأجداول الحية (المحطات والرسائل والنزالات والإعلامات والنقاشات)
-- =========================================================================

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['rooms','room_messages','challenges','notifications','discussions'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END;
$$;

COMMIT;
