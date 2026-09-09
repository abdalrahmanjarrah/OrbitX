-- =========================================================================
-- ORBITX SUPABASE DATABASE SCHEMA MIGRATION SCRIPT
-- =========================================================================
-- Description: This script sets up a highly optimized, fully compatible
-- NoSQL-on-PostgreSQL compatibility layer using JSONB storage.
-- It maps all hierarchical Firestore collections (including subcollections)
-- onto a single high-performance 'documents' table.
--
-- Instructions:
-- 1. Go to your Supabase Dashboard: https://supabase.com
-- 2. Select your OrbitX project.
-- 3. Click on "SQL Editor" in the left-hand sidebar navigation.
-- 4. Create a "New Query", paste this entire script, and click "Run".
-- =========================================================================

-- 1. Create the unified documents table
CREATE TABLE IF NOT EXISTS public.documents (
    path TEXT PRIMARY KEY,                       -- Full unique path of document (e.g. "users/123", "rooms/room_abc/messages/msg_xyz")
    collection TEXT NOT NULL,                    -- The parent collection name (e.g. "users", "global_chat", "messages")
    id TEXT NOT NULL,                            -- Only the document ID portion (e.g. "123", "msg_xyz")
    data JSONB NOT NULL DEFAULT '{}'::jsonb,     -- Flexible document fields stored as high-performance binary JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add high-performance indexes
-- Index for lightning-fast queries by collection (e.g. fetching all posts in global_chat)
CREATE INDEX IF NOT EXISTS idx_documents_collection ON public.documents(collection);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON public.documents(updated_at);

-- GIN (Generalized Inverted Index) for high-performance key searches inside JSONB data fields (e.g., where 'userId' == 'xyz')
CREATE INDEX IF NOT EXISTS idx_documents_data_gin ON public.documents USING gin (data);

-- 3. Enable Realtime Replication for the table
-- This enables live instant chat updates, active study room timers, and visual focus metrics!
-- (Guarded so re-running the migration doesn't fail when the table is already in the publication.)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'documents'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
    END IF;
END $$;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 4b. Admin accounts table + helper functions used by the policies below.
-- MUST be created before the policies that reference them.
CREATE TABLE IF NOT EXISTS public.admins (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.admins (email) VALUES
    ('lumafashionhq@gmail.com'),
    ('abdalrahmanjarrah94@gmail.com'),
    ('abdalrahmanjarrah1@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Removed from admins by owner request: abdalrhmanmaaith24@gmail.com
DELETE FROM public.admins WHERE email = 'abdalrhmanmaaith24@gmail.com';

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_readable" ON public.admins;
CREATE POLICY "admins_readable" ON public.admins FOR SELECT USING (true);

-- Owner of a Firestore-style path = second segment ("users/abc/..." -> "abc")
CREATE OR REPLACE FUNCTION public.doc_owner(p_path text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$ SELECT split_part(p_path, '/', 2) $$;

-- Is the current request's JWT an admin?
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE email = COALESCE(auth.jwt() ->> 'email', '')
  )
$$;

-- 5. SECURE access policies for the compat layer
-- -------------------------------------------------------------------------
-- Read: anyone may read (leaderboards and public metadata are client-rendered;
-- the anon key is visible in the browser anyway).
DROP POLICY IF EXISTS "Allow public read access" ON public.documents;
DROP POLICY IF EXISTS "Allow public write mutations" ON public.documents;
DROP POLICY IF EXISTS "Allow public update mutations" ON public.documents;
DROP POLICY IF EXISTS "Allow public delete mutations" ON public.documents;
DROP POLICY IF EXISTS "mutate_shared_collections" ON public.documents;
DROP POLICY IF EXISTS "mutate_users_subcollections" ON public.documents;
DROP POLICY IF EXISTS "insert_users_subcollections" ON public.documents;
DROP POLICY IF EXISTS "update_delete_users_sub_owner" ON public.documents;
DROP POLICY IF EXISTS "insert_profiles_subcollections" ON public.documents;
DROP POLICY IF EXISTS "update_delete_profiles_sub_owner" ON public.documents;
DROP POLICY IF EXISTS "insert_shared_collections" ON public.documents;
DROP POLICY IF EXISTS "update_delete_shared_collaborative" ON public.documents;
DROP POLICY IF EXISTS "delete_shared_collaborative" ON public.documents;
DROP POLICY IF EXISTS "update_delete_user_owned" ON public.documents;
DROP POLICY IF EXISTS "delete_user_owned" ON public.documents;
DROP POLICY IF EXISTS "allow_read_all" ON public.documents;
DROP POLICY IF EXISTS "mutate_users_owner" ON public.documents;
DROP POLICY IF EXISTS "mutate_profiles_owner" ON public.documents;
DROP POLICY IF EXISTS "delete_users_sub_owner" ON public.documents;
DROP POLICY IF EXISTS "delete_profiles_sub_owner" ON public.documents;
DROP POLICY IF EXISTS "mutate_admin_collections" ON public.documents;
DROP POLICY IF EXISTS "mutate_admins_manage_users" ON public.documents;

CREATE POLICY "allow_read_all"
ON public.documents
FOR SELECT
USING (true);

-- MUTATIONS REQUIRE AUTHENTICATION. Anonymous visitors can no longer create,
-- edit or delete anything.
--
-- users/{uid} and profiles/{uid} top-level docs: owner (or admin) only.
CREATE POLICY "mutate_users_owner"
ON public.documents
FOR ALL
USING (path ~ '^users/[^/]+$' AND public.doc_owner(path) = auth.uid()::text)
WITH CHECK (path ~ '^users/[^/]+$' AND public.doc_owner(path) = auth.uid()::text);

CREATE POLICY "mutate_profiles_owner"
ON public.documents
FOR ALL
USING (path ~ '^profiles/[^/]+$' AND public.doc_owner(path) = auth.uid()::text)
WITH CHECK (path ~ '^profiles/[^/]+$' AND public.doc_owner(path) = auth.uid()::text);

-- users/{uid}/... and profiles/{uid}/... subcollections:
--   INSERT is allowed cross-user by design (challenge/duel notifications are
--   written to another user's inbox, friend requests arrive in a subcollection).
--   UPDATE/DELETE are OWNER-ONLY so nobody can tamper with your notifications,
--   friends list or schedule.
CREATE POLICY "insert_users_subcollections"
ON public.documents
FOR INSERT
WITH CHECK (path ~ '^users/[^/]+/[^/]+/' AND auth.uid() IS NOT NULL);

CREATE POLICY "update_delete_users_sub_owner"
ON public.documents
FOR UPDATE
USING (path ~ '^users/[^/]+/[^/]+/' AND public.doc_owner(path) = auth.uid()::text);

CREATE POLICY "delete_users_sub_owner"
ON public.documents
FOR DELETE
USING (path ~ '^users/[^/]+/[^/]+/' AND public.doc_owner(path) = auth.uid()::text);

CREATE POLICY "insert_profiles_subcollections"
ON public.documents
FOR INSERT
WITH CHECK (path ~ '^profiles/[^/]+/[^/]+/' AND auth.uid() IS NOT NULL);

CREATE POLICY "update_delete_profiles_sub_owner"
ON public.documents
FOR UPDATE
USING (path ~ '^profiles/[^/]+/[^/]+/' AND public.doc_owner(path) = auth.uid()::text);

CREATE POLICY "delete_profiles_sub_owner"
ON public.documents
FOR DELETE
USING (path ~ '^profiles/[^/]+/[^/]+/' AND public.doc_owner(path) = auth.uid()::text);

-- Admin-only collections (system settings, alerts, updates, announcements,
-- advice content). Only accounts listed in the admins table can touch them.
CREATE POLICY "mutate_admin_collections"
ON public.documents
FOR ALL
USING (public.is_admin_user() AND (
  path LIKE 'system/%' OR path LIKE 'admin_alerts/%' OR
  path LIKE 'app_updates/%' OR path LIKE 'global_notifications/%' OR
  path LIKE 'advices/%' OR path LIKE 'errors/%'))
WITH CHECK (public.is_admin_user() AND (
  path LIKE 'system/%' OR path LIKE 'admin_alerts/%' OR
  path LIKE 'app_updates/%' OR path LIKE 'global_notifications/%' OR
  path LIKE 'advices/%' OR path LIKE 'errors/%'));

-- Admins may also manage any user/profile document (banning, XP fixes...).
CREATE POLICY "mutate_admins_manage_users"
ON public.documents
FOR ALL
USING (public.is_admin_user() AND (path LIKE 'users/%' OR path LIKE 'profiles/%'))
WITH CHECK (public.is_admin_user() AND (path LIKE 'users/%' OR path LIKE 'profiles/%'));

-- Shared collections split into two groups:
--  (a) COLLABORATIVE docs (rooms, challenges, fleets, worlds, ...): any
--      authenticated user may INSERT, UPDATE and DELETE. Rooms are updated by
--      every participant, challenges by both duellists.
--  (b) USER-OWNED docs (global_chat, discussions + replies, suggestions,
--      exhibitions, awareness_signals, support_tickets): INSERT by any
--      authenticated user, but UPDATE/DELETE only by the author (matched on
--      the "userId" field) so nobody can erase/edit another user's content.
CREATE POLICY "insert_shared_collections"
ON public.documents
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL
  AND path NOT LIKE 'users/%'
  AND path NOT LIKE 'profiles/%'
  AND path NOT LIKE 'system/%'
  AND path NOT LIKE 'admin_alerts/%'
  AND path NOT LIKE 'app_updates/%'
  AND path NOT LIKE 'global_notifications/%'
  AND path NOT LIKE 'advices/%');

CREATE POLICY "update_delete_shared_collaborative"
ON public.documents
FOR UPDATE
USING (auth.uid() IS NOT NULL
  AND path NOT LIKE 'users/%'
  AND path NOT LIKE 'profiles/%'
  AND path NOT LIKE 'system/%'
  AND path NOT LIKE 'admin_alerts/%'
  AND path NOT LIKE 'app_updates/%'
  AND path NOT LIKE 'global_notifications/%'
  AND path NOT LIKE 'advices/%'
  AND path NOT LIKE 'global_chat/%'
  AND path NOT LIKE 'discussions/%'
  AND path NOT LIKE 'suggestions/%'
  AND path NOT LIKE 'exhibitions/%'
  AND path NOT LIKE 'awareness_signals/%'
  AND path NOT LIKE 'support_tickets/%');

CREATE POLICY "delete_shared_collaborative"
ON public.documents
FOR DELETE
USING (auth.uid() IS NOT NULL
  AND path NOT LIKE 'users/%'
  AND path NOT LIKE 'profiles/%'
  AND path NOT LIKE 'system/%'
  AND path NOT LIKE 'admin_alerts/%'
  AND path NOT LIKE 'app_updates/%'
  AND path NOT LIKE 'global_notifications/%'
  AND path NOT LIKE 'advices/%'
  AND path NOT LIKE 'global_chat/%'
  AND path NOT LIKE 'discussions/%'
  AND path NOT LIKE 'suggestions/%'
  AND path NOT LIKE 'exhibitions/%'
  AND path NOT LIKE 'awareness_signals/%'
  AND path NOT LIKE 'support_tickets/%'
  AND path NOT LIKE 'errors/%');

CREATE POLICY "update_delete_user_owned"
ON public.documents
FOR UPDATE
USING ((path LIKE 'global_chat/%' OR path LIKE 'discussions/%'
    OR path LIKE 'suggestions/%' OR path LIKE 'exhibitions/%'
    OR path LIKE 'awareness_signals/%' OR path LIKE 'support_tickets/%')
  AND ((data ->> 'userId') = auth.uid()::text OR public.is_admin_user()));

CREATE POLICY "delete_user_owned"
ON public.documents
FOR DELETE
USING ((path LIKE 'global_chat/%' OR path LIKE 'discussions/%'
    OR path LIKE 'suggestions/%' OR path LIKE 'exhibitions/%'
    OR path LIKE 'awareness_signals/%' OR path LIKE 'support_tickets/%')
  AND ((data ->> 'userId') = auth.uid()::text OR public.is_admin_user()));

-- 6. Automatically update 'updated_at' column on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_documents_timestamp ON public.documents;
CREATE OR REPLACE TRIGGER trigger_update_documents_timestamp
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 7. PROGRESSION FIELD PROTECTION (XP / LEVEL / ROLE)
-- -------------------------------------------------------------------------
-- Clients may update their own users/profiles docs freely EXCEPT the
-- progression fields (xp, level, role). Those can only change through the
-- SECURITY DEFINER functions below (grant_xp, grant_challenge_reward,
-- admin_set_xp) or by an actual admin account. This makes XP/level/role
-- tampering server-controlled instead of client-controlled.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.protect_progression_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.path ~ '^users/[^/]+$' OR NEW.path ~ '^profiles/[^/]+$' THEN
    IF current_setting('app.progression_allowed', true) = '1' THEN
      RETURN NEW;
    END IF;
    IF public.is_admin_user() THEN
      RETURN NEW;
    END IF;
    IF (OLD.data ->> 'xp') IS DISTINCT FROM (NEW.data ->> 'xp')
       OR (OLD.data ->> 'level') IS DISTINCT FROM (NEW.data ->> 'level')
       OR (OLD.data ->> 'role') IS DISTINCT FROM (NEW.data ->> 'role') THEN
      RAISE EXCEPTION 'progression_fields_locked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_progression ON public.documents;
CREATE TRIGGER trg_protect_progression
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_progression_fields();

-- =========================================================================
-- 8. SERVER-SIDE XP ENGINE (SECURITY DEFINER)
-- -------------------------------------------------------------------------
-- These functions run with elevated privileges, verify the caller, and apply
-- atomic JSONB updates + server-side cooldowns. The protection trigger above
-- only lets these (or admins) modify xp/level/role.
-- =========================================================================

-- level_for_xp: computes the level from total XP using the SAME cumulative
-- threshold table as the client (src/lib/levelConfig.ts). Keeps the server
-- in perfect sync with the UI level bar, unlike the old floor(xp/1000)+1.
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

GRANT EXECUTE ON FUNCTION public.level_for_xp(bigint) TO authenticated;

-- grant_xp: server-verified XP grant/deduct with cooldown + level recalc
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
    -- Time chests are exempt: they are tiny, self-imposed, once-per-cycle
    -- rewards (≤ 2/h) tracked locally per user, so the 60s throttle wrongly
    -- rejected the 2nd–5th chest claimed in one sitting.
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
    v_level := public.level_for_xp(v_new_xp);

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

GRANT EXECUTE ON FUNCTION public.grant_xp(text, text, text, boolean, bigint, text, boolean) TO authenticated;

-- grant_challenge_reward: server-verified challenge win rewards
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

GRANT EXECUTE ON FUNCTION public.grant_challenge_reward(text, text) TO authenticated;

-- purchase_item_deduct: server-verified store purchase (prevents negative XP)
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
    v_row public.documents%ROWTYPE;
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

    SELECT * INTO v_row
    FROM public.documents
    WHERE path = 'users/' || p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_user');
    END IF;

    v_old_xp := COALESCE((v_row.data ->> 'xp')::bigint, 0);
    IF v_old_xp < p_price THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient');
    END IF;

    v_new_xp := v_old_xp - p_price;
    v_level := public.level_for_xp(v_new_xp);

    v_row.data := jsonb_set(jsonb_set(v_row.data, '{xp}', to_jsonb(v_new_xp)), '{level}', to_jsonb(v_level));

    PERFORM set_config('app.progression_allowed', '1', true);
    UPDATE public.documents
    SET data = v_row.data, updated_at = now()
    WHERE path = v_row.path;

    UPDATE public.documents
    SET data = jsonb_set(
            jsonb_set(data, '{xp}', to_jsonb(v_new_xp)),
            '{level}', to_jsonb(v_level)
        ), updated_at = now()
    WHERE path = 'profiles/' || p_user_id;

    RETURN jsonb_build_object('success', true, 'xp', v_new_xp, 'level', v_level);
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_item_deduct(text, bigint) TO authenticated;

-- admin_set_xp: absolute XP/level override, admins only
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

    UPDATE public.documents
    SET data = jsonb_set(jsonb_set(data, '{xp}', to_jsonb(p_xp)), '{level}', to_jsonb(v_level)),
        updated_at = now()
    WHERE path = 'users/' || p_user_id;

    UPDATE public.documents
    SET data = jsonb_set(jsonb_set(data, '{xp}', to_jsonb(p_xp)), '{level}', to_jsonb(v_level)),
        updated_at = now()
    WHERE path = 'profiles/' || p_user_id;

    RETURN jsonb_build_object('success', true, 'xp', p_xp, 'level', v_level);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_xp(text, bigint, bigint) TO authenticated;

-- increment_document_field: generic atomic counter used by the client adapter
-- for any increment(...) sentinel. Never touches xp/level/role on users/profiles.
CREATE OR REPLACE FUNCTION public.increment_document_field(
    p_path text,
    p_field text,
    p_amount bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid text := auth.uid()::text;
    v_row public.documents%ROWTYPE;
    v_new bigint;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    -- Admin-only collections
    IF p_path ~ '^(system|admin_alerts|app_updates|global_notifications|advices)/'
       AND NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'forbidden';
    END IF;

    -- users/profiles docs: progression fields are off-limits except through grant_xp
    IF (p_path ~ '^users/[^/]+$' OR p_path ~ '^profiles/[^/]+$')
       AND p_field IN ('xp', 'level', 'role')
       AND NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'use_grant_xp';
    END IF;

    SELECT * INTO v_row
    FROM public.documents
    WHERE path = p_path
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'no_doc');
    END IF;

    v_new := COALESCE((v_row.data ->> p_field)::bigint, 0) + p_amount;
    v_row.data := jsonb_set(v_row.data, ARRAY[p_field], to_jsonb(v_new));

    PERFORM set_config('app.progression_allowed', '1', true);
    UPDATE public.documents
    SET data = v_row.data, updated_at = now()
    WHERE path = v_row.path;

    RETURN jsonb_build_object('success', true, 'value', v_new);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_document_field(text, text, bigint) TO authenticated;

-- =========================================================================
-- Done! Your Supabase Postgres database is now ready for OrbitX.
-- =========================================================================
