-- ============================================================================
-- OrbitX — Anti-Cheat Migration (مكافحة الغش)
-- ============================================================================
-- يغلق هذا الملف ثغرات أمنية خطيرة في نظام النقاط XP والتحديات:
--
--   1. grant_xp: كان أي مستخدم يستطيع منح نفسه XP لا نهائي عبر
--      callRpc('grant_xp', { p_amount: 999999999, p_force: true }).
--      الآن: حد أقصى لكل نداء (500)، والقوة (p_force) محصورة بمكافآت صغيرة
--      (≤ 120) أو خصومات، مع مهلة دقيقة واحدة للمنح القسري.
--
--   2. grant_challenge_reward: كان أي مشارك يستطيع أخذ الجائزة في أي وقت
--      (100 XP + 50 عملة + شارة) حتى لو خسر.
--      الآن: لا تصرف إلا بعد اكتمال التحدي، للفائز الفعلي، ومرة واحدة فقط.
--
-- الملف قابل لإعادة التشغيل بأمان (يستخدم CREATE OR REPLACE).
--
-- خطوة التشغيل: افتح Supabase Dashboard ← SQL Editor ← الصق الكل ← Run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) grant_xp — إصدار محصّن
-- ----------------------------------------------------------------------------
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
    v_row public.documents%ROWTYPE;
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

    -- Only allow granting XP to yourself, or admins granting to anyone.
    IF v_uid <> p_user_id AND NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    -- ANTI-CHEAT: per-call cap — no client can inflate XP wholesale
    -- (used to be: grant_xp(self, 999999999, p_force => true)).
    IF NOT public.is_admin_user() AND abs(p_amount) > 500 THEN
        RAISE EXCEPTION 'exceeds_grant_limit';
    END IF;

    -- ANTI-CHEAT: p_force (bypass-lock) is reserved for small one-time rewards
    -- (≤ 120 XP, matching MAX_XP_PER_SESSION) or penalties (negative amounts).
    -- Large forced grants are admin-only.
    IF NOT public.is_admin_user() AND p_force AND p_amount > 120 THEN
        RAISE EXCEPTION 'force_bypass_forbidden';
    END IF;

    SELECT * INTO v_row
    FROM public.documents
    WHERE path = 'users/' || p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'blocked', false, 'error', 'no_user');
    END IF;

    v_old_xp := COALESCE((v_row.data ->> 'xp')::bigint, 0);

    -- Cooldown (45s) on positive grants, unless explicitly forced.
    IF NOT p_force AND p_amount > 0 THEN
        IF v_is_focus THEN
            IF v_now - COALESCE((v_row.data ->> 'lastFocusXpUpdate')::bigint, 0) < 45000 THEN
                v_blocked := true;
            END IF;
        ELSE
            IF v_now - COALESCE((v_row.data ->> 'lastXpUpdate')::bigint, 0) < 45000 THEN
                v_blocked := true;
            END IF;
        END IF;
    END IF;

    -- ANTI-CHEAT: forced (bypass-lock) positive grants from non-admins are
    -- throttled to one per minute as well, so a script cannot farm XP endlessly.
    -- Time chests are exempt: tiny, self-imposed, once-per-cycle rewards (≤ 2/h)
    -- tracked locally per user, so the 60s throttle wrongly rejected the
    -- 2nd–5th chest claimed in one sitting.
    IF NOT v_blocked AND NOT public.is_admin_user() AND p_force AND p_amount > 0
       AND p_source <> 'time_chest' THEN
        IF v_now - COALESCE((v_row.data ->> 'lastForcedGrantAt')::bigint, 0) < 60000 THEN
            v_blocked := true;
        END IF;
    END IF;

    IF v_blocked THEN
        RETURN jsonb_build_object('success', false, 'blocked', true, 'amount', p_amount);
    END IF;

    v_new_xp := v_old_xp + p_amount;
    v_level := floor(v_new_xp / 1000) + 1;

    v_row.data := jsonb_set(v_row.data, '{xp}', to_jsonb(v_new_xp));
    v_row.data := jsonb_set(v_row.data, '{level}', to_jsonb(v_level));
    IF p_amount > 0 THEN
        v_row.data := jsonb_set(v_row.data, '{lastXpUpdate}', to_jsonb(v_now));
        IF v_is_focus THEN
            v_row.data := jsonb_set(v_row.data, '{lastFocusXpUpdate}', to_jsonb(v_now));
        END IF;
        IF p_force AND NOT public.is_admin_user() THEN
            v_row.data := jsonb_set(v_row.data, '{lastForcedGrantAt}', to_jsonb(v_now));
        END IF;
    END IF;

    PERFORM set_config('app.progression_allowed', '1', true);
    UPDATE public.documents
    SET data = v_row.data, updated_at = now()
    WHERE path = v_row.path;

    -- Mirror XP/level to the public profile so the leaderboard sees it too.
    UPDATE public.documents
    SET data = jsonb_set(
            jsonb_set(data, '{xp}', to_jsonb(v_new_xp)),
            '{level}', to_jsonb(v_level)
        ), updated_at = now()
    WHERE path = 'profiles/' || p_user_id;

    -- Fleet progress
    IF p_fleet_id IS NOT NULL THEN
        UPDATE public.documents
        SET data = jsonb_set(
                data,
                '{xp}',
                to_jsonb(COALESCE((data ->> 'xp')::bigint, 0) + p_amount)
            ), updated_at = now()
        WHERE path = 'fleets/' || p_fleet_id;
    END IF;

    -- Challenge progress
    IF p_challenge_id IS NOT NULL THEN
        UPDATE public.documents
        SET data = jsonb_set(
                data,
                ARRAY[CASE WHEN p_is_player1 THEN 'progressPlayer1' ELSE 'progressPlayer2' END],
                to_jsonb(
                    COALESCE(
                        (data #>> ARRAY[CASE WHEN p_is_player1 THEN 'progressPlayer1' ELSE 'progressPlayer2' END])::bigint,
                        0
                    ) + p_amount
                )
            ), updated_at = now()
        WHERE path = 'challenges/' || p_challenge_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'blocked', false, 'amount', p_amount, 'xp', v_new_xp, 'level', v_level);
END;
$$;

-- ----------------------------------------------------------------------------
-- 2) grant_challenge_reward — إصدار محصّن
-- ----------------------------------------------------------------------------
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
    v_ch public.documents%ROWTYPE;
    v_challenger text;
    v_challenged text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    SELECT * INTO v_ch
    FROM public.documents
    WHERE path = 'challenges/' || p_challenge_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'no_challenge');
    END IF;

    v_challenger := v_ch.data ->> 'challengerId';
    v_challenged := v_ch.data ->> 'challengedId';

    -- Caller must be a participant (or an admin) and the winner must be real.
    IF NOT public.is_admin_user()
       AND v_uid <> v_challenger AND v_uid <> v_challenged THEN
        RAISE EXCEPTION 'forbidden';
    END IF;
    IF p_winner_id <> v_challenger AND p_winner_id <> v_challenged THEN
        RAISE EXCEPTION 'invalid_winner';
    END IF;

    -- ANTI-CHEAT: rewards only after the challenge is truly completed, only for
    -- the recorded winner, and only once.
    IF (v_ch.data ->> 'status') <> 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_completed');
    END IF;
    IF (v_ch.data ->> 'winnerId') <> p_winner_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_winner');
    END IF;
    IF (v_ch.data ->> 'rewardClaimedAt') IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_rewarded');
    END IF;

    PERFORM public.grant_xp(p_winner_id, NULL, NULL, false, 100, 'challenge_win', true);

    PERFORM set_config('app.progression_allowed', '1', true);

    -- Winner: users doc (coins, badge, expiry) + profiles doc (badge, xp already done above)
    UPDATE public.documents
    SET data = jsonb_set(
            jsonb_set(
                jsonb_set(
                    data,
                    '{coins}',
                    to_jsonb(COALESCE((data ->> 'coins')::bigint, 0) + 50)
                ),
                '{badges}',
                CASE WHEN data -> 'badges' @> '["challenge_champ"]'::jsonb
                     THEN data -> 'badges'
                     ELSE COALESCE(data -> 'badges', '[]'::jsonb) || '["challenge_champ"]'::jsonb
                END
            ),
            '{challengeChampExpiry}',
            to_jsonb((extract(epoch FROM now()) * 1000)::bigint + 7 * 24 * 60 * 60 * 1000)
        ), updated_at = now()
    WHERE path = 'users/' || p_winner_id;

    UPDATE public.documents
    SET data = jsonb_set(
            data,
            '{badges}',
            CASE WHEN data -> 'badges' @> '["challenge_champ"]'::jsonb
                 THEN data -> 'badges'
                 ELSE COALESCE(data -> 'badges', '[]'::jsonb) || '["challenge_champ"]'::jsonb
            END
        ), updated_at = now()
    WHERE path = 'profiles/' || p_winner_id;

    -- ANTI-CHEAT: mark the reward as claimed so the winner cannot double-claim.
    UPDATE public.documents
    SET data = jsonb_set(data, '{rewardClaimedAt}', to_jsonb((extract(epoch FROM now()) * 1000)::bigint)),
        updated_at = now()
    WHERE path = 'challenges/' || p_challenge_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- ----------------------------------------------------------------------------
-- ملاحظة أمان إضافية:
-- إذا لم يكن ملف supabase_hardening_migration.sql قد شُغّل بعد على قاعدة
-- البيانات، فيجب تشغيله أيضاً لأنه يغلق ثغرات RLS أخرى (حذف غرف الآخرين،
-- الكتابة المباشرة على xp/level/coins/role، إلخ). يمكنك تشغيله الآن أو لاحقاً
-- قبل الإطلاق.
-- ============================================================================
