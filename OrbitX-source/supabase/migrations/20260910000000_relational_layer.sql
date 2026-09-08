-- =============================================================================
-- OrbitX — المرحلة 39 ب: التفعيل الحقيقي لجدولي users/profiles العلائقية
-- =============================================================================
-- ماذا يفعل هذا الملف؟
--   1) ينقل بيانات المستخدمين والملفات من جدول documents (التخزين القديم
--      بنمط فايرستور) إلى الجداول العلائقية الحقيقية public.users و public.profiles
--      مرة واحدة (نقل لمرة واحدة — من بعدها يتوقف التطبيق عن تكرارها).
--   2) يضيف دالة rel_register_user الآمنة التي تسمح للتطبيق بإنشاء/تحديث
--      مستخدمه أو ملفه من المتصفح دون المساس بالنقاط/المستوى/الدور
--      (Progression) التي يملك الخادم حصراً (تُمنح عبر دوال grant_xp وغيرها).
--   3) لا يلمس أي ملف/جدول آخر — كل ما عدا users/profiles يبقى كما هو.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) دوال تحويل آمنة — بعض السجلات القديمة خزّنت أرقاماً كسرية مثل
--    1788001320891.5 (كانت تُحسب بفارق زمني كسري على بعض الأجهزة)، والعمود
--    bigint يرفض الكسر. هذه الدوال تقرّب الكسر وتتجاهل أي نص غير رقمي برشاقة.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rel_number(text) RETURNS numeric
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT CASE
        WHEN $1 ~ '^[+-]?[0-9]+(\.[0-9]+)?$' THEN $1::numeric
        ELSE NULL
    END;
$$;

CREATE OR REPLACE FUNCTION public.rel_bigint(text) RETURNS bigint
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT round(public.rel_number($1))::bigint;
$$;

CREATE OR REPLACE FUNCTION public.rel_int(text) RETURNS integer
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT round(public.rel_number($1))::integer;
$$;

CREATE OR REPLACE FUNCTION public.rel_bool(text) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT CASE
        WHEN $1 IS NULL THEN NULL
        WHEN lower($1) IN ('true','t','1','yes','y') THEN true
        WHEN lower($1) IN ('false','f','0','no','n') THEN false
        ELSE NULL
    END;
$$;

-- -----------------------------------------------------------------------------
-- 2) النقل لمرة واحدة: تعبئة public.users من documents (collection='users')
-- -----------------------------------------------------------------------------
DO $backfill$
DECLARE
    v_known text[] := ARRAY[
        'uid','displayName','email','photoURL','bio','level','xp','hearts','coins',
        'role','missionRole','completedWizard','dailyFocusTarget','inventory','items',
        'equippedItems','badges','friendsCount','banned','currentActivity','streak',
        'lastActiveTime','lastActiveDate','lastDailyReward','lastStudyDate',
        'totalFocusTime','totalFocusMinutes','focusSessions','totalFocusSessions',
        'fleetId','fleetInvites','challengeWins','challengeChampExpiry','isGuest',
        'weekStart','weekFocusMinutes','weekSessions','blackHoleClaimedWeek',
        'invitedBy','referralsRewarded','timeChests','lastXpUpdate',
        'lastFocusXpUpdate','lastForcedGrantAt','extra'
    ];
BEGIN
    INSERT INTO public.users (
        uid, displayname, email, photourl, bio, level, xp, hearts, coins, role,
        missionrole, completedwizard, dailyfocustarget, inventory, items,
        equippeditems, badges, friendscount, banned, currentactivity, streak,
        lastactivetime, lastactivedate, lastdailyreward, laststudydate,
        totalfocustime, totalfocusminutes, focussessions, totalfocussessions,
        fleetid, fleetinvites, challengewins, challengechampexpiry, isguest,
        weekstart, weekfocusminutes, weeksessions, blackholeclaimedweek, invitedby,
        referralsrewarded, timechests, lastxpupdate, lastfocusxpupdate,
        lastforcedgrantat, extra
    )
    SELECT
        COALESCE(d.data->>'uid', split_part(d.path, '/', 2)),
        COALESCE(d.data->>'displayName', ''),
        d.data->>'email',
        d.data->>'photoURL',
        d.data->>'bio',
        COALESCE(rel_int(d.data->>'level'), 1),
        COALESCE(rel_bigint(d.data->>'xp'), 0),
        COALESCE(rel_int(d.data->>'hearts'), 5),
        COALESCE(rel_bigint(d.data->>'coins'), 100),
        COALESCE(d.data->>'role', 'user'),
        d.data->>'missionRole',
        COALESCE(rel_bool(d.data->>'completedWizard'), false),
        rel_int(d.data->>'dailyFocusTarget'),
        COALESCE(d.data->'inventory', '[]'::jsonb),
        COALESCE(d.data->'items', '[]'::jsonb),
        COALESCE(d.data->'equippedItems', '{}'::jsonb),
        COALESCE(d.data->'badges', '[]'::jsonb),
        COALESCE(rel_int(d.data->>'friendsCount'), 0),
        COALESCE(rel_bool(d.data->>'banned'), false),
        d.data->>'currentActivity',
        COALESCE(rel_int(d.data->>'streak'), 0),
        COALESCE(rel_bigint(d.data->>'lastActiveTime'), (extract(epoch FROM now()) * 1000)::bigint),
        d.data->>'lastActiveDate',
        d.data->>'lastDailyReward',
        d.data->>'lastStudyDate',
        rel_bigint(d.data->>'totalFocusTime'),
        rel_bigint(d.data->>'totalFocusMinutes'),
        rel_int(d.data->>'focusSessions'),
        rel_int(d.data->>'totalFocusSessions'),
        d.data->>'fleetId',
        COALESCE(d.data->'fleetInvites', '[]'::jsonb),
        COALESCE(rel_int(d.data->>'challengeWins'), 0),
        rel_bigint(d.data->>'challengeChampExpiry'),
        COALESCE(rel_bool(d.data->>'isGuest'), false),
        d.data->>'weekStart',
        COALESCE(rel_int(d.data->>'weekFocusMinutes'), 0),
        COALESCE(rel_int(d.data->>'weekSessions'), 0),
        d.data->>'blackHoleClaimedWeek',
        d.data->>'invitedBy',
        COALESCE(d.data->'referralsRewarded', '[]'::jsonb),
        d.data->'timeChests',
        rel_bigint(d.data->>'lastXpUpdate'),
        rel_bigint(d.data->>'lastFocusXpUpdate'),
        rel_bigint(d.data->>'lastForcedGrantAt'),
        COALESCE(d.data - v_known, '{}'::jsonb)
    FROM public.documents d
    WHERE d.collection = 'users'
      AND COALESCE(d.data->>'uid', d.path) IS NOT NULL
    ON CONFLICT (uid) DO UPDATE SET
        displayname     = EXCLUDED.displayname,
        email           = EXCLUDED.email,
        photourl        = EXCLUDED.photourl,
        bio             = EXCLUDED.bio,
        level           = EXCLUDED.level,
        xp              = EXCLUDED.xp,
        hearts          = EXCLUDED.hearts,
        coins           = EXCLUDED.coins,
        role            = EXCLUDED.role,
        missionrole     = EXCLUDED.missionrole,
        completedwizard = EXCLUDED.completedwizard,
        dailyfocustarget = EXCLUDED.dailyfocustarget,
        inventory       = EXCLUDED.inventory,
        items           = EXCLUDED.items,
        equippeditems   = EXCLUDED.equippeditems,
        badges          = EXCLUDED.badges,
        friendscount    = EXCLUDED.friendscount,
        banned          = EXCLUDED.banned,
        currentactivity = EXCLUDED.currentactivity,
        streak          = EXCLUDED.streak,
        lastactivetime  = EXCLUDED.lastactivetime,
        lastactivedate  = EXCLUDED.lastactivedate,
        lastdailyreward = EXCLUDED.lastdailyreward,
        laststudydate   = EXCLUDED.laststudydate,
        totalfocustime  = EXCLUDED.totalfocustime,
        totalfocusminutes = EXCLUDED.totalfocusminutes,
        focussessions   = EXCLUDED.focussessions,
        totalfocussessions = EXCLUDED.totalfocussessions,
        fleetid         = EXCLUDED.fleetid,
        fleetinvites    = EXCLUDED.fleetinvites,
        challengewins   = EXCLUDED.challengewins,
        challengechampexpiry = EXCLUDED.challengechampexpiry,
        isguest         = EXCLUDED.isguest,
        weekstart       = EXCLUDED.weekstart,
        weekfocusminutes = EXCLUDED.weekfocusminutes,
        weeksessions    = EXCLUDED.weeksessions,
        blackholeclaimedweek = EXCLUDED.blackholeclaimedweek,
        invitedby       = EXCLUDED.invitedby,
        referralsrewarded = EXCLUDED.referralsrewarded,
        timechests      = EXCLUDED.timechests,
        lastxpupdate    = EXCLUDED.lastxpupdate,
        lastfocusxpupdate = EXCLUDED.lastfocusxpupdate,
        lastforcedgrantat = EXCLUDED.lastforcedgrantat,
        extra           = COALESCE(EXCLUDED.extra, '{}'::jsonb),
        updated_at      = now();

    RAISE NOTICE 'rel_backfill users: %', (SELECT count(*) FROM public.users);
END
$backfill$;

-- -----------------------------------------------------------------------------
-- 2) النقل لمرة واحدة: تعبئة public.profiles من documents
-- -----------------------------------------------------------------------------
DO $backfillProfiles$
DECLARE
    v_known text[] := ARRAY[
        'uid','displayName','photoURL','bio','level','xp','role','streak',
        'friendsCount','banned','currentActivity','lastActiveTime','lastActiveDate',
        'totalFocusSessions','missionRole','badges','extra'
    ];
BEGIN
    INSERT INTO public.profiles (
        uid, displayname, photourl, bio, level, xp, role, streak, friendscount,
        banned, currentactivity, lastactivetime, lastactivedate,
        totalfocussessions, missionrole, badges, extra
    )
    SELECT
        COALESCE(d.data->>'uid', split_part(d.path, '/', 2)),
        COALESCE(d.data->>'displayName', ''),
        d.data->>'photoURL',
        d.data->>'bio',
        COALESCE(rel_int(d.data->>'level'), 1),
        COALESCE(rel_bigint(d.data->>'xp'), 0),
        COALESCE(d.data->>'role', 'user'),
        COALESCE(rel_int(d.data->>'streak'), 0),
        COALESCE(rel_int(d.data->>'friendsCount'), 0),
        COALESCE(rel_bool(d.data->>'banned'), false),
        d.data->>'currentActivity',
        COALESCE(rel_bigint(d.data->>'lastActiveTime'), (extract(epoch FROM now()) * 1000)::bigint),
        d.data->>'lastActiveDate',
        rel_int(d.data->>'totalFocusSessions'),
        d.data->>'missionRole',
        COALESCE(d.data->'badges', '[]'::jsonb),
        COALESCE(d.data - v_known, '{}'::jsonb)
    FROM public.documents d
    WHERE d.collection = 'profiles'
      AND COALESCE(d.data->>'uid', d.path) IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.users u WHERE u.uid = COALESCE(d.data->>'uid', split_part(d.path, '/', 2)))
    ON CONFLICT (uid) DO UPDATE SET
        displayname     = EXCLUDED.displayname,
        photourl        = EXCLUDED.photourl,
        bio             = EXCLUDED.bio,
        level           = EXCLUDED.level,
        xp              = EXCLUDED.xp,
        role            = EXCLUDED.role,
        streak          = EXCLUDED.streak,
        friendscount    = EXCLUDED.friendscount,
        banned          = EXCLUDED.banned,
        currentactivity = EXCLUDED.currentactivity,
        lastactivetime  = EXCLUDED.lastactivetime,
        lastactivedate  = EXCLUDED.lastactivedate,
        totalfocussessions = EXCLUDED.totalfocussessions,
        missionrole     = EXCLUDED.missionrole,
        badges          = EXCLUDED.badges,
        extra           = COALESCE(EXCLUDED.extra, '{}'::jsonb),
        updated_at      = now();

    RAISE NOTICE 'rel_backfill profiles: %', (SELECT count(*) FROM public.profiles);
END
$backfillProfiles$;

-- -----------------------------------------------------------------------------
-- 3) دالة rel_register_user — إنشاء/تحديث المستخدم أو ملفه بأمان
-- -----------------------------------------------------------------------------
-- تُدعى من supabaseAdapter.ts في كل كتابة على users/uid أو profiles/uid.
-- تقبل الحقول العامة (الاسم، الصورة، النشاط الحالي، ...) لكنها **لا تقبل**
-- أبداً xp / level / coins / hearts / role من المتصفح: الدور يُقرَّر من جدول
-- admins، والتقدّم لا يتحرك إلا عبر دوال الخادم (grant_xp ...).
-- الأعمدة غير المعروفة تُدمج في عمود extra دون أن تمس شيئاً.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rel_register_user(
    p_collection text,
    p_uid text,
    p_doc jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid text := auth.uid()::text;
    v_admin boolean := false;
    v_keys text[] := '{}'::text[];
    v_clean jsonb := '{}'::jsonb;
    v_new public.users;
    v_new_p public.profiles;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    IF p_uid IS NULL OR p_uid = '' THEN
        p_uid := v_uid;
    END IF;

    IF p_uid <> v_uid AND NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    v_admin := public.is_admin_user();

    -- ---------- مقبولات users (بدون xp/level/coins/hearts/role) ----------
    IF p_collection = 'users' THEN
        v_keys := ARRAY[
            'uid','displayname','email','photourl','bio','missionrole',
            'completedwizard','dailyfocustarget','inventory','items',
            'equippeditems','badges','friendscount','banned','currentactivity',
            'streak','lastactivetime','lastactivedate','lastdailyreward',
            'laststudydate','totalfocustime','totalfocusminutes','focussessions',
            'totalfocussessions','fleetid','fleetinvites','challengewins',
            'challengechampexpiry','isguest','weekstart','weekfocusminutes',
            'weeksessions','blackholeclaimedweek','invitedby','referralsrewarded',
            'timechests','extra'
        ];

        -- قوّس المفاتيح أولاً: قد يرسل المتصفح displayName بدل displayname
        SELECT jsonb_object_agg(lower(e.k), e.v) INTO v_clean
        FROM jsonb_each(p_doc) AS e(k, v)
        WHERE jsonb_typeof(e.v) <> 'null';

        SELECT jsonb_object_agg(k, v_clean -> k) INTO v_clean
        FROM unnest(v_keys) AS k
        WHERE v_clean ? k;

        -- قرّب أي رقم كسري (بعضا الأجهزة يرسل أرقاماً مثل 1788001320891.5)
        SELECT jsonb_object_agg(
                   e.k,
                   CASE
                       WHEN jsonb_typeof(e.v) = 'number' THEN to_jsonb(round((e.v #>> '{}')::numeric))
                       WHEN jsonb_typeof(e.v) = 'string' AND (e.v #>> '{}') ~ '^[+-]?[0-9]+(\.[0-9]+)?$'
                            THEN to_jsonb(round((e.v #>> '{}')::numeric))
                       ELSE e.v
                   END
               ) INTO v_clean
        FROM jsonb_each(v_clean) AS e(k, v)
        WHERE jsonb_typeof(e.v) <> 'null';

        SELECT * INTO v_new
        FROM jsonb_populate_record(NULL::public.users, v_clean);

        INSERT INTO public.users (
            uid, displayname, email, photourl, bio, level, xp, hearts, coins,
            role, missionrole, completedwizard, dailyfocustarget, inventory,
            items, equippeditems, badges, friendscount, banned, currentactivity,
            streak, lastactivetime, lastactivedate, isguest, extra
        ) VALUES (
            COALESCE(v_new.uid, p_uid),
            COALESCE(v_new.displayname, ''),
            v_new.email,
            v_new.photourl,
            v_new.bio,
            1, 0, 5, 100,
            CASE WHEN v_admin THEN 'admin' ELSE 'user' END,
            v_new.missionrole,
            COALESCE(v_new.completedwizard, false),
            v_new.dailyfocustarget,
            COALESCE(v_new.inventory, '[]'::jsonb),
            COALESCE(v_new.items, '[]'::jsonb),
            COALESCE(v_new.equippeditems, '{}'::jsonb),
            COALESCE(v_new.badges, '[]'::jsonb),
            COALESCE(v_new.friendscount, 0),
            COALESCE(v_new.banned, false),
            v_new.currentactivity,
            COALESCE(v_new.streak, 0),
            v_new.lastactivetime,
            v_new.lastactivedate,
            COALESCE(v_new.isguest, false),
            COALESCE(v_new.extra, '{}'::jsonb)
        )
        ON CONFLICT (uid) DO UPDATE SET
            displayname      = COALESCE(EXCLUDED.displayname, public.users.displayname),
            email            = COALESCE(EXCLUDED.email, public.users.email),
            photourl         = COALESCE(EXCLUDED.photourl, public.users.photourl),
            bio              = COALESCE(EXCLUDED.bio, public.users.bio),
            missionrole      = COALESCE(EXCLUDED.missionrole, public.users.missionrole),
            completedwizard  = COALESCE(EXCLUDED.completedwizard, public.users.completedwizard),
            dailyfocustarget = COALESCE(EXCLUDED.dailyfocustarget, public.users.dailyfocustarget),
            inventory        = COALESCE(EXCLUDED.inventory, public.users.inventory),
            items            = COALESCE(EXCLUDED.items, public.users.items),
            equippeditems    = COALESCE(EXCLUDED.equippeditems, public.users.equippeditems),
            badges           = COALESCE(EXCLUDED.badges, public.users.badges),
            friendscount     = COALESCE(EXCLUDED.friendscount, public.users.friendscount),
            banned           = COALESCE(EXCLUDED.banned, public.users.banned),
            currentactivity  = COALESCE(EXCLUDED.currentactivity, public.users.currentactivity),
            streak           = COALESCE(EXCLUDED.streak, public.users.streak),
            lastactivetime   = GREATEST(
                                   COALESCE(EXCLUDED.lastactivetime, public.users.lastactivetime),
                                   COALESCE(public.users.lastactivetime, 0)),
            lastactivedate   = COALESCE(EXCLUDED.lastactivedate, public.users.lastactivedate),
            lastdailyreward  = COALESCE(EXCLUDED.lastdailyreward, public.users.lastdailyreward),
            laststudydate    = COALESCE(EXCLUDED.laststudydate, public.users.laststudydate),
            totalfocustime   = COALESCE(EXCLUDED.totalfocustime, public.users.totalfocustime),
            totalfocusminutes = COALESCE(EXCLUDED.totalfocusminutes, public.users.totalfocusminutes),
            focussessions    = COALESCE(EXCLUDED.focussessions, public.users.focussessions),
            totalfocussessions = COALESCE(EXCLUDED.totalfocussessions, public.users.totalfocussessions),
            fleetid          = COALESCE(EXCLUDED.fleetid, public.users.fleetid),
            fleetinvites     = COALESCE(EXCLUDED.fleetinvites, public.users.fleetinvites),
            challengewins    = COALESCE(EXCLUDED.challengewins, public.users.challengewins),
            challengechampexpiry = COALESCE(EXCLUDED.challengechampexpiry, public.users.challengechampexpiry),
            isguest          = COALESCE(EXCLUDED.isguest, public.users.isguest),
            weekstart        = COALESCE(EXCLUDED.weekstart, public.users.weekstart),
            weekfocusminutes = COALESCE(EXCLUDED.weekfocusminutes, public.users.weekfocusminutes),
            weeksessions     = COALESCE(EXCLUDED.weeksessions, public.users.weeksessions),
            blackholeclaimedweek = COALESCE(EXCLUDED.blackholeclaimedweek, public.users.blackholeclaimedweek),
            invitedby        = COALESCE(EXCLUDED.invitedby, public.users.invitedby),
            referralsrewarded = COALESCE(EXCLUDED.referralsrewarded, public.users.referralsrewarded),
            timechests       = COALESCE(EXCLUDED.timechests, public.users.timechests),
            extra            = CASE WHEN EXCLUDED.extra IS NOT NULL
                                    THEN COALESCE(public.users.extra, '{}'::jsonb) || EXCLUDED.extra
                                    ELSE public.users.extra END,
            updated_at       = now(),
            role             = CASE WHEN v_admin THEN 'admin' ELSE public.users.role END;

        RETURN jsonb_build_object('success', true, 'uid', p_uid);

    -- ---------------- مقبولات profiles ----------------
    ELSIF p_collection = 'profiles' THEN
        IF NOT EXISTS (SELECT 1 FROM public.users WHERE uid = p_uid) THEN
            INSERT INTO public.users (uid, role)
            VALUES (p_uid, CASE WHEN v_admin THEN 'admin' ELSE 'user' END)
            ON CONFLICT (uid) DO NOTHING;
        END IF;

        v_keys := ARRAY[
            'uid','displayname','photourl','bio','streak','friendscount',
            'banned','currentactivity','lastactivetime','lastactivedate',
            'totalfocussessions','missionrole','badges','extra'
        ];

        -- قوّس المفاتيح أولاً: قد يرسل المتصفح displayName بدل displayname
        SELECT jsonb_object_agg(lower(e.k), e.v) INTO v_clean
        FROM jsonb_each(p_doc) AS e(k, v)
        WHERE jsonb_typeof(e.v) <> 'null';

        SELECT jsonb_object_agg(k, v_clean -> k) INTO v_clean
        FROM unnest(v_keys) AS k
        WHERE v_clean ? k;

        -- قرّب أي رقم كسري قبل التعبئة
        SELECT jsonb_object_agg(
                   e.k,
                   CASE
                       WHEN jsonb_typeof(e.v) = 'number' THEN to_jsonb(round((e.v #>> '{}')::numeric))
                       WHEN jsonb_typeof(e.v) = 'string' AND (e.v #>> '{}') ~ '^[+-]?[0-9]+(\.[0-9]+)?$'
                            THEN to_jsonb(round((e.v #>> '{}')::numeric))
                       ELSE e.v
                   END
               ) INTO v_clean
        FROM jsonb_each(v_clean) AS e(k, v)
        WHERE jsonb_typeof(e.v) <> 'null';

        SELECT * INTO v_new_p
        FROM jsonb_populate_record(NULL::public.profiles, v_clean);

        INSERT INTO public.profiles (
            uid, displayname, photourl, bio, level, xp, role, streak,
            friendscount, banned, currentactivity, lastactivetime,
            lastactivedate, totalfocussessions, missionrole, badges, extra
        ) VALUES (
            COALESCE(v_new_p.uid, p_uid),
            COALESCE(v_new_p.displayname, ''),
            v_new_p.photourl,
            v_new_p.bio,
            1, 0,
            CASE WHEN v_admin THEN 'admin' ELSE 'user' END,
            COALESCE(v_new_p.streak, 0),
            COALESCE(v_new_p.friendscount, 0),
            COALESCE(v_new_p.banned, false),
            v_new_p.currentactivity,
            v_new_p.lastactivetime,
            v_new_p.lastactivedate,
            v_new_p.totalfocussessions,
            v_new_p.missionrole,
            COALESCE(v_new_p.badges, '[]'::jsonb),
            COALESCE(v_new_p.extra, '{}'::jsonb)
        )
        ON CONFLICT (uid) DO UPDATE SET
            displayname      = COALESCE(EXCLUDED.displayname, public.profiles.displayname),
            photourl         = COALESCE(EXCLUDED.photourl, public.profiles.photourl),
            bio              = COALESCE(EXCLUDED.bio, public.profiles.bio),
            streak           = COALESCE(EXCLUDED.streak, public.profiles.streak),
            friendscount     = COALESCE(EXCLUDED.friendscount, public.profiles.friendscount),
            banned           = COALESCE(EXCLUDED.banned, public.profiles.banned),
            currentactivity  = COALESCE(EXCLUDED.currentactivity, public.profiles.currentactivity),
            lastactivetime   = GREATEST(
                                   COALESCE(EXCLUDED.lastactivetime, public.profiles.lastactivetime),
                                   COALESCE(public.profiles.lastactivetime, 0)),
            lastactivedate   = COALESCE(EXCLUDED.lastactivedate, public.profiles.lastactivedate),
            totalfocussessions = COALESCE(EXCLUDED.totalfocussessions, public.profiles.totalfocussessions),
            missionrole      = COALESCE(EXCLUDED.missionrole, public.profiles.missionrole),
            badges           = COALESCE(EXCLUDED.badges, public.profiles.badges),
            extra            = CASE WHEN EXCLUDED.extra IS NOT NULL
                                    THEN COALESCE(public.profiles.extra, '{}'::jsonb) || EXCLUDED.extra
                                    ELSE public.profiles.extra END,
            updated_at       = now(),
            role             = CASE WHEN v_admin THEN 'admin' ELSE public.profiles.role END;

        RETURN jsonb_build_object('success', true, 'uid', p_uid);

    ELSE
        RAISE EXCEPTION 'unknown_collection';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rel_register_user(text, text, jsonb) TO authenticated;