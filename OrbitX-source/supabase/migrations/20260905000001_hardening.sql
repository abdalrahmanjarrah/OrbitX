-- ============================================================================
-- ORBITX — SUPABASE SECURITY HARDENING MIGRATION
-- ============================================================================
-- يعمل هذا الملف على نقل قواعد الأمان (Security Rules) الخاصة بـ Firestore
-- (firestore.rules) إلى طبقة الحماية في Supabase (Row Level Security).
--
-- ماذا يغيّر؟
--   1. يَحذف كل سياسات RLS الحالية (كانت واسعة جداً: أي مستخدم مسجّل يستطيع
--      تعديل مستندات النظام، الأخطاء، الغرف، التحديات، إلخ).
--   2. ينشئ سياسات صارمة جديدة مطابقة لقواعد Firestore:
--        - المستخدم يعدّل مستندات نفسه فقط (مع حماية xp/coins/level/role).
--        - مشرف فقط يعدّل system/advices/app_updates/admin_alerts/errors ...
--        - المشارك فقط يعدّل الغرفة/الأسطول/التحدي، وبحقول محدودة.
--   3. يُحصّن دالة increment_document_field حتى لا يستطيع أحد زيادة xp/coins
--      أو حقول لا تخصّه عبر الإزاحة الذرية.
--   4. يزيل الـ trigger القديم (protect_progression_fields) لأن الحماية أصبحت
--      مضمونة داخل سياسات RLS، وكان سيُعطّل دوال XP الآمنة.
--
-- طريقة الاستخدام:
--   1. افتح Supabase Dashboard → SQL Editor.
--   2. الصق هذا الملف كاملاً واشغّله (Run).
--   3. جرّب التطبيق (دخول، غرفة، تحدّي، أسطول، تعديل ملفك الشخصي).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) حذف كل سياسات RLS الموجودة (نبدأ من صفحة نظيفة)
-- ============================================================================
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'documents'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.documents', pol.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- 2) إزالة الـ trigger القديم الذي كان يمنع تعديل xp/coins/level/role.
--    الحماية الآن داخل سياسات RLS نفسها، وهذا الـ trigger كان سيوقف
--    دوال الـ XP الآمنة (SECURITY DEFINER).
-- ============================================================================
DROP TRIGGER IF EXISTS trg_protect_progression_fields ON public.documents;
DROP TRIGGER IF EXISTS trg_protect_progression ON public.documents;
DROP TRIGGER IF EXISTS trg_protect_coins ON public.documents;
DROP FUNCTION IF EXISTS public.protect_progression_fields();

-- ============================================================================
-- 3) دوال مساعدة لسياسات RLS
-- ============================================================================

-- قراءة محتوى المستند الحالي (القديم) من داخل سياسة UPDATE.
-- SECURITY DEFINER حتى لا تحدث حلقة تكرار (recursion) مع RLS.
CREATE OR REPLACE FUNCTION public.doc_old_data(p_path text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT data FROM public.documents WHERE path = p_path $$;

-- مفاتيح (حقول) تغيّرت قيمتها أو أُضيفت أو حُذفت بين القديم والجديد.
-- (مثل affectedKeys() في Firestore: يقارن القيم الفعلية وليس الأسماء فقط)
CREATE OR REPLACE FUNCTION public.changed_keys(old_data jsonb, new_data jsonb)
RETURNS text[]
LANGUAGE sql IMMUTABLE
AS $$
    SELECT ARRAY(
        SELECT COALESCE(n.key, o.key)
        FROM jsonb_each(new_data) n
        FULL JOIN jsonb_each(old_data) o USING (key)
        WHERE n.value IS DISTINCT FROM o.value
    )
$$;

-- مفاتيح (حقول) حُذفت من الجديد وكانت موجودة في القديم.
CREATE OR REPLACE FUNCTION public.removed_keys(old_data jsonb, new_data jsonb)
RETURNS text[]
LANGUAGE sql IMMUTABLE
AS $$
    SELECT ARRAY(
        SELECT o.key FROM jsonb_each(old_data) o
        EXCEPT
        SELECT n.key FROM jsonb_each(new_data) n
    )
$$;

-- هل كل الحقول المتغيّرة ضمن القائمة المسموحة فقط؟ (مثل diff.hasOnly في Firestore)
CREATE OR REPLACE FUNCTION public.has_only(old_data jsonb, new_data jsonb, allowed text[])
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
    SELECT
        NOT EXISTS (
            SELECT 1 FROM unnest(public.changed_keys(old_data, new_data)) k
            WHERE k <> ALL(allowed)
        )
        AND NOT EXISTS (
            SELECT 1 FROM unnest(public.removed_keys(old_data, new_data)) k
            WHERE k <> ALL(allowed)
        )
$$;

-- عناصر أُضيفت إلى مصفوفة (مثل participants بعد الانضمام)
CREATE OR REPLACE FUNCTION public.arr_added(old_arr jsonb, new_arr jsonb)
RETURNS jsonb
LANGUAGE sql IMMUTABLE
AS $$
    SELECT COALESCE(
        (SELECT jsonb_agg(v)
         FROM jsonb_array_elements_text(new_arr) v
         WHERE NOT v IN (SELECT jsonb_array_elements_text(old_arr))),
        '[]'::jsonb
    )
$$;

-- عناصر حُذفت من مصفوفة (مثل participants بعد المغادرة)
CREATE OR REPLACE FUNCTION public.arr_removed(old_arr jsonb, new_arr jsonb)
RETURNS jsonb
LANGUAGE sql IMMUTABLE
AS $$
    SELECT COALESCE(
        (SELECT jsonb_agg(v)
         FROM jsonb_array_elements_text(old_arr) v
         WHERE NOT v IN (SELECT jsonb_array_elements_text(new_arr))),
        '[]'::jsonb
    )
$$;

-- هل كل عناصر المصفوفة ضمن القائمة المسموحة؟
CREATE OR REPLACE FUNCTION public.arr_subset(arr jsonb, allowed text[])
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
    SELECT NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(arr) v
        WHERE v <> ALL(allowed)
    )
$$;

-- هل المستخدم المحدد عضو/موجود في حقل معين داخل مستند؟ (قراءة من أي مستند)
CREATE OR REPLACE FUNCTION public.doc_field_contains(p_path text, p_field text, p_uid text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE(data->p_field @> to_jsonb(p_uid), false)
    FROM public.documents
    WHERE path = p_path
$$;

-- هل المستخدم الحالي غير محظور؟ (يقرأ users/{uid}.banned)
-- إذا لم يوجد المستند: يُعتبر غير محظور (مثل Firestore).
CREATE OR REPLACE FUNCTION public.is_not_banned()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE((data->>'banned')::boolean, false) IS NOT TRUE
    FROM public.documents
    WHERE path = 'users/' || auth.uid()::text
$$;

-- حارس XP: لا يسمح إلا بزيادة ≤200 أو نقصان ≤5000 أو دون تغيير
CREATE OR REPLACE FUNCTION public.xp_guard_ok(old_data jsonb, new_data jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
    SELECT (
        (COALESCE((new_data->>'xp')::bigint, 0) = COALESCE((old_data->>'xp')::bigint, 0))
        OR (
            COALESCE((new_data->>'xp')::bigint, 0) <= 200
            AND COALESCE((old_data->>'xp')::bigint, 0) = 0
            AND COALESCE((old_data->>'level')::bigint, 1) = 1
        )
        OR (
            COALESCE((new_data->>'xp')::bigint, 0) > COALESCE((old_data->>'xp')::bigint, 0)
            AND COALESCE((new_data->>'xp')::bigint, 0) < COALESCE((old_data->>'xp')::bigint, 0) + 201
            AND COALESCE((old_data->>'xp')::bigint, 0) <> 0
        )
        OR (
            COALESCE((new_data->>'xp')::bigint, 0) < COALESCE((old_data->>'xp')::bigint, 0)
            AND COALESCE((new_data->>'xp')::bigint, 0) > COALESCE((old_data->>'xp')::bigint, 0) - 5001
            AND COALESCE((old_data->>'xp')::bigint, 0) <> 0
        )
    )
$$;

-- حارس العملات: لا يسمح إلا بزيادة ≤100 أو دون تغيير
CREATE OR REPLACE FUNCTION public.coins_guard_ok(old_data jsonb, new_data jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
    SELECT (
        (COALESCE((new_data->>'coins')::bigint, 0) = COALESCE((old_data->>'coins')::bigint, 0))
        OR (
            COALESCE((new_data->>'coins')::bigint, 0) <= 100
            AND COALESCE((old_data->>'coins')::bigint, 0) = 0
        )
        OR (
            COALESCE((new_data->>'coins')::bigint, 0) > COALESCE((old_data->>'coins')::bigint, 0)
            AND COALESCE((new_data->>'coins')::bigint, 0) < COALESCE((old_data->>'coins')::bigint, 0) + 101
            AND COALESCE((old_data->>'coins')::bigint, 0) <> 0
        )
    )
$$;

-- هل المستوى متوافق مع XP؟ (بنفس جدول levelConfig.ts عبر level_for_xp)
CREATE OR REPLACE FUNCTION public.level_anchored_ok(old_data jsonb, new_data jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
    SELECT (
        COALESCE((new_data->>'level')::bigint, 1)
            = public.level_for_xp(COALESCE((new_data->>'xp')::bigint, 0))
        OR (
            (new_data->>'level') IS NULL
            AND (old_data->>'level') IS NULL
            AND (new_data->>'xp') IS NOT DISTINCT FROM (old_data->>'xp')
        )
    )
$$;

-- حقول المستخدم التي لا يجوز تغييرها إطلاقاً في التحديث
-- (مطابقة لقواعد Firestore: uid / email / role / banned)
CREATE OR REPLACE FUNCTION public.user_immutables_ok(old_data jsonb, new_data jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
    SELECT
        (new_data->>'uid')       IS NOT DISTINCT FROM (old_data->>'uid')
        AND (new_data->>'email')  IS NOT DISTINCT FROM (old_data->>'email')
        AND (new_data->>'role')   IS NOT DISTINCT FROM (old_data->>'role')
        AND (new_data->>'banned') IS NOT DISTINCT FROM (old_data->>'banned')
$$;

-- حقول الملف الشخصي التي لا يجوز تغييرها
CREATE OR REPLACE FUNCTION public.profile_immutables_ok(old_data jsonb, new_data jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
    SELECT
        (new_data->>'uid')   IS NOT DISTINCT FROM (old_data->>'uid')
        AND (new_data->>'role')   IS NOT DISTINCT FROM (old_data->>'role')
        AND (new_data->>'banned') IS NOT DISTINCT FROM (old_data->>'banned')
$$;

-- هل هذا المستند ملك المستخدم الحالي؟
CREATE OR REPLACE FUNCTION public.is_own_doc(p_path text)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
    SELECT split_part(p_path, '/', 2) = auth.uid()::text
$$;

-- ============================================================================
-- 4) سياسات SELECT (القراءة) — مطابقة لقواعد Firestore
-- ============================================================================

-- users/{uid} والمجموعة الخاصة schedule: المالك أو المشرف فقط
CREATE POLICY "sel_users_owner"
ON public.documents FOR SELECT TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 2) = auth.uid()::text
        AND split_part(path, '/', 3) IN ('', 'schedule')
    )
);

-- users/{uid}/friends: أي مستخدم مسجّل
CREATE POLICY "sel_users_friends"
ON public.documents FOR SELECT TO authenticated
USING (
    split_part(path, '/', 1) = 'users'
    AND split_part(path, '/', 3) = 'friends'
);

-- users/{uid}/notifications: المالك أو المرسل (حتى يعمل إنشاء الإشعارات
-- عبر upsert) أو المشرف
CREATE POLICY "sel_users_notifications"
ON public.documents FOR SELECT TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 3) = 'notifications'
        AND (
            split_part(path, '/', 2) = auth.uid()::text
            OR data->>'senderId' = auth.uid()::text
        )
    )
);

-- profiles: أي مستخدم مسجّل
CREATE POLICY "sel_profiles"
ON public.documents FOR SELECT TO authenticated
USING (split_part(path, '/', 1) = 'profiles');

-- rooms (والغرف الفرعية messages / typing): أي مستخدم مسجّل
-- (ملاحظة: signals مستثناة هنا — لها سياسة منفصلة للمرسل/المستقبل فقط)
CREATE POLICY "sel_rooms"
ON public.documents FOR SELECT TO authenticated
USING (
    split_part(path, '/', 1) = 'rooms'
    AND split_part(path, '/', 3) <> 'signals'
);

-- rooms/{id}/signals: المرسل أو المستقبل فقط (أو المشرف)
CREATE POLICY "sel_room_signals"
ON public.documents FOR SELECT TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'rooms'
        AND split_part(path, '/', 3) = 'signals'
        AND (data->>'receiver' = auth.uid()::text OR data->>'sender' = auth.uid()::text)
    )
);

-- chat_typing (مهجور): أي مستخدم مسجّل يقرأ
CREATE POLICY "sel_chat_typing"
ON public.documents FOR SELECT TO authenticated
USING (split_part(path, '/', 1) = 'chat_typing');

-- fleets (غير الرسائل): أي مستخدم مسجّل
CREATE POLICY "sel_fleets"
ON public.documents FOR SELECT TO authenticated
USING (
    split_part(path, '/', 1) = 'fleets'
    AND split_part(path, '/', 3) <> 'messages'
);

-- fleets/{id}/messages: الأعضاء أو المشرف
CREATE POLICY "sel_fleet_messages"
ON public.documents FOR SELECT TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'fleets'
        AND split_part(path, '/', 3) = 'messages'
        AND public.doc_field_contains('fleets/' || split_part(path, '/', 2), 'members', auth.uid()::text)
    )
);

-- challenges: المشاركون أو المشرف
CREATE POLICY "sel_challenges"
ON public.documents FOR SELECT TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'challenges'
        AND (data->>'challengerId' = auth.uid()::text OR data->>'challengedId' = auth.uid()::text)
    )
);

-- discussions و replies: أي مستخدم مسجّل
CREATE POLICY "sel_discussions"
ON public.documents FOR SELECT TO authenticated
USING (split_part(path, '/', 1) = 'discussions');

-- exhibitions / suggestions / awareness_signals: أي مستخدم مسجّل
CREATE POLICY "sel_exhibitions"
ON public.documents FOR SELECT TO authenticated
USING (split_part(path, '/', 1) = 'exhibitions');

CREATE POLICY "sel_suggestions"
ON public.documents FOR SELECT TO authenticated
USING (split_part(path, '/', 1) = 'suggestions');

CREATE POLICY "sel_awareness_signals"
ON public.documents FOR SELECT TO authenticated
USING (split_part(path, '/', 1) = 'awareness_signals');

-- support_tickets: الكاتب أو المشرف
CREATE POLICY "sel_support_tickets"
ON public.documents FOR SELECT TO authenticated
USING (
    public.is_admin_user()
    OR (split_part(path, '/', 1) = 'support_tickets' AND data->>'userId' = auth.uid()::text)
);

-- system / advices / app_updates / global_notifications: أي مستخدم مسجّل
CREATE POLICY "sel_admin_read_collections"
ON public.documents FOR SELECT TO authenticated
USING (split_part(path, '/', 1) IN ('system', 'advices', 'app_updates', 'global_notifications'));

-- admin_alerts: عام (حتى لغير المسجّلين)
CREATE POLICY "sel_admin_alerts_public"
ON public.documents FOR SELECT TO PUBLIC
USING (split_part(path, '/', 1) = 'admin_alerts');

-- errors: صاحب البلاغ أو المشرف
CREATE POLICY "sel_errors"
ON public.documents FOR SELECT TO authenticated
USING (
    public.is_admin_user()
    OR (split_part(path, '/', 1) = 'errors' AND data->>'uid' = auth.uid()::text)
);

-- global_chat (مهجور): أي مستخدم مسجّل
CREATE POLICY "sel_global_chat"
ON public.documents FOR SELECT TO authenticated
USING (split_part(path, '/', 1) = 'global_chat');

-- worlds + items + players: أي مستخدم مسجّل
CREATE POLICY "sel_worlds"
ON public.documents FOR SELECT TO authenticated
USING (split_part(path, '/', 1) IN ('worlds', 'items', 'players'));

-- test: عام
CREATE POLICY "sel_test_public"
ON public.documents FOR SELECT TO PUBLIC
USING (split_part(path, '/', 1) = 'test');

-- ============================================================================
-- 5) سياسات INSERT — واسعة بالمسار فقط (لأن upsert يفحص INSERT حتى عند
--    تحديث مستند موجود)، بينما التحقق الفعلي في سياسات UPDATE/DELETE/SELECT.
-- ============================================================================

-- users/{uid}: مالك المستند فقط
CREATE POLICY "ins_users"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'users'
    AND split_part(path, '/', 2) = auth.uid()::text
    AND split_part(path, '/', 3) = ''
);

-- users/{uid}/schedule: المالك أو المشرف
CREATE POLICY "ins_users_schedule"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 2) = auth.uid()::text
        AND split_part(path, '/', 3) = 'schedule'
    )
);

-- users/{uid}/notifications: أي مستخدم مسجّل (ليتمكن من إشعار الآخرين)
CREATE POLICY "ins_users_notifications"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'users'
    AND split_part(path, '/', 3) = 'notifications'
);

-- users/{uid}/friends/{fid}: أحد الطرفين (المالك أو الصديق) أو المشرف
CREATE POLICY "ins_users_friends"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'users'
    AND split_part(path, '/', 3) = 'friends'
    AND (
        split_part(path, '/', 2) = auth.uid()::text
        OR split_part(path, '/', 4) = auth.uid()::text
        OR public.is_admin_user()
    )
);

-- profiles: المالك أو المشرف
CREATE POLICY "ins_profiles"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'profiles'
        AND split_part(path, '/', 2) = auth.uid()::text
        AND split_part(path, '/', 3) = ''
    )
);

-- rooms: إنشاء غرفة — الصانع نفسه (كما في قواعد Firestore: creatorId == uid)
CREATE POLICY "ins_rooms"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'rooms'
    AND split_part(path, '/', 3) = ''
    AND data->>'creatorId' = auth.uid()::text
);

-- rooms/{id}/messages: عضو الغرفة فقط (المرسل = نفسه أو "system")
CREATE POLICY "ins_room_messages"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'rooms'
    AND split_part(path, '/', 3) = 'messages'
    AND public.doc_field_contains('rooms/' || split_part(path, '/', 2), 'participants', auth.uid()::text)
    AND (data->>'userId' = auth.uid()::text OR data->>'userId' = 'system')
);

-- rooms/{id}/typing/{uid}: الكاتب نفسه وعضو في الغرفة
CREATE POLICY "ins_room_typing"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'rooms'
    AND split_part(path, '/', 3) = 'typing'
    AND split_part(path, '/', 4) = auth.uid()::text
    AND public.doc_field_contains('rooms/' || split_part(path, '/', 2), 'participants', auth.uid()::text)
);

-- fleets: إنشاء أسطول — الصانع نفسه والمالك عضو (كما في قواعد Firestore)
CREATE POLICY "ins_fleets"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'fleets'
    AND split_part(path, '/', 3) = ''
    AND data->>'ownerId' = auth.uid()::text
    AND data->'members' @> to_jsonb(auth.uid()::text)
);

-- fleets/{id}/messages: عضو الأسطول والمرسل نفسه أو "system"
CREATE POLICY "ins_fleet_messages"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'fleets'
    AND split_part(path, '/', 3) = 'messages'
    AND public.doc_field_contains('fleets/' || split_part(path, '/', 2), 'members', auth.uid()::text)
    AND (data->>'userId' = auth.uid()::text OR data->>'userId' = 'system')
);

-- challenges: إنشاء تحدٍّ — المتحدي نفسه (كما في قواعد Firestore)
CREATE POLICY "ins_challenges"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'challenges'
    AND split_part(path, '/', 3) = ''
    AND data->>'challengerId' = auth.uid()::text
);

-- discussions: الكاتب نفسه أو المشرف
CREATE POLICY "ins_discussions"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'discussions'
    AND (data->>'userId' = auth.uid()::text OR public.is_admin_user())
);

-- replies: الكاتب نفسه أو المشرف
CREATE POLICY "ins_replies"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'discussions'
    AND split_part(path, '/', 3) = 'replies'
    AND (data->>'userId' = auth.uid()::text OR public.is_admin_user())
);

-- exhibitions: الكاتب أو المشرف
CREATE POLICY "ins_exhibitions"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'exhibitions'
    AND (data->>'userId' = auth.uid()::text OR public.is_admin_user())
);

-- suggestions: الكاتب أو المشرف
CREATE POLICY "ins_suggestions"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'suggestions'
    AND (data->>'userId' = auth.uid()::text OR public.is_admin_user())
);

-- support_tickets: الكاتب أو المشرف
CREATE POLICY "ins_support_tickets"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'support_tickets'
    AND (data->>'userId' = auth.uid()::text OR public.is_admin_user())
);

-- awareness_signals: المشرف فقط (مثل Firestore)
CREATE POLICY "ins_awareness_signals"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'awareness_signals'
    AND public.is_admin_user()
);

-- system / advices / app_updates / global_notifications / admin_alerts: المشرف فقط
CREATE POLICY "ins_admin_collections"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) IN ('system', 'advices', 'app_updates', 'global_notifications', 'admin_alerts')
    AND public.is_admin_user()
);

-- errors: أي مستخدم مسجّل (حتى يعمل نظام الإبلاغ عن الأخطاء)
CREATE POLICY "ins_errors"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (split_part(path, '/', 1) = 'errors');

-- global_chat (مهجور): الكاتب نفسه أو المشرف
CREATE POLICY "ins_global_chat"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'global_chat'
    AND (data->>'userId' = auth.uid()::text OR public.is_admin_user())
);

-- chat_typing (مهجور): الكاتب نفسه
CREATE POLICY "ins_chat_typing"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) = 'chat_typing'
    AND split_part(path, '/', 2) = auth.uid()::text
);

-- worlds + items + players: المشرف أو صاحب العالم
CREATE POLICY "ins_worlds"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
    split_part(path, '/', 1) IN ('worlds', 'items', 'players')
    AND (public.is_admin_user() OR split_part(path, '/', 2) = auth.uid()::text)
);

-- test: قراءة عامة فقط (لا كتابة — مثل قواعد Firestore الأصلية)
-- ============================================================================
-- 6) سياسات UPDATE — هنا يقع التحقق الفعلي الصارم (مطابق لـ Firestore)
-- ============================================================================

-- users/{uid}: المالك فقط + عدم تغيير الحقول المحمية + حراس xp/coins/level،
-- أو أي مستخدم يغيّر friendsCount ±1 فقط (التدفق العلائقي للصداقات — مثل Firestore)
CREATE POLICY "upd_users"
ON public.documents FOR UPDATE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 2) = auth.uid()::text
        AND split_part(path, '/', 3) = ''
    )
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 3) = ''
        AND public.has_only(public.doc_old_data(path), data, ARRAY['friendsCount'])
    )
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 2) = auth.uid()::text
        AND split_part(path, '/', 3) = ''
        AND public.is_not_banned()
        AND public.user_immutables_ok(public.doc_old_data(path), data)
        AND public.xp_guard_ok(public.doc_old_data(path), data)
        AND public.coins_guard_ok(public.doc_old_data(path), data)
        AND public.level_anchored_ok(public.doc_old_data(path), data)
    )
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 3) = ''
        AND public.has_only(public.doc_old_data(path), data, ARRAY['friendsCount'])
        AND abs(
            COALESCE((data->>'friendsCount')::bigint, 0)
            - COALESCE((public.doc_old_data(path)->>'friendsCount')::bigint, 0)
        ) = 1
    )
);

-- profiles: المالك فقط + الحقول المحمية + الحراس
CREATE POLICY "upd_profiles"
ON public.documents FOR UPDATE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'profiles'
        AND split_part(path, '/', 2) = auth.uid()::text
        AND split_part(path, '/', 3) = ''
    )
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'profiles'
        AND split_part(path, '/', 2) = auth.uid()::text
        AND split_part(path, '/', 3) = ''
        AND public.is_not_banned()
        AND public.profile_immutables_ok(public.doc_old_data(path), data)
        AND public.xp_guard_ok(public.doc_old_data(path), data)
        AND public.coins_guard_ok(public.doc_old_data(path), data)
        AND public.level_anchored_ok(public.doc_old_data(path), data)
    )
);

-- users/{uid}/notifications: المالك فقط، ولا يغيّر إلا "read"
CREATE POLICY "upd_users_notifications"
ON public.documents FOR UPDATE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 3) = 'notifications'
        AND split_part(path, '/', 2) = auth.uid()::text
    )
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 3) = 'notifications'
        AND split_part(path, '/', 2) = auth.uid()::text
        AND public.has_only(public.doc_old_data(path), data, ARRAY['read'])
    )
);

-- users/{uid}/friends: أحد الطرفين أو المشرف
CREATE POLICY "upd_users_friends"
ON public.documents FOR UPDATE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 3) = 'friends'
        AND (split_part(path, '/', 2) = auth.uid()::text OR split_part(path, '/', 4) = auth.uid()::text)
    )
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 3) = 'friends'
        AND (split_part(path, '/', 2) = auth.uid()::text OR split_part(path, '/', 4) = auth.uid()::text)
    )
);

-- users/{uid}/schedule: المالك أو المشرف
CREATE POLICY "upd_users_schedule"
ON public.documents FOR UPDATE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 2) = auth.uid()::text
        AND split_part(path, '/', 3) = 'schedule'
    )
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 2) = auth.uid()::text
        AND split_part(path, '/', 3) = 'schedule'
    )
);

-- rooms: المشرف، أو الصانع (تعديل كامل مع ثبات creatorId/createdAt)،
-- أو انضمام/مغادرة الذات، أو التحكم بالمؤقت (عضو)
CREATE POLICY "upd_rooms"
ON public.documents FOR UPDATE TO authenticated
USING (
    split_part(path, '/', 1) = 'rooms'
    AND split_part(path, '/', 3) = ''
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'rooms'
        AND split_part(path, '/', 3) = ''
        AND public.is_not_banned()
        AND (
            -- الصانع يعدّل أي شيء (مع ثبات هوية الصانع ووقت الإنشاء)
            (
                data->>'creatorId' = auth.uid()::text
                AND public.doc_old_data(path)->>'creatorId' = auth.uid()::text
                AND (data->>'createdAt') IS NOT DISTINCT FROM (public.doc_old_data(path)->>'createdAt')
            )
            OR
            -- انضمام/مغادرة الذات فقط
            (
                public.has_only(public.doc_old_data(path), data,
                                ARRAY['participants', 'emptyAt', 'hostId', 'timerStatus'])
                AND public.arr_subset(
                        public.arr_added(public.doc_old_data(path)->'participants', data->'participants'),
                        ARRAY[auth.uid()::text])
                AND public.arr_subset(
                        public.arr_removed(public.doc_old_data(path)->'participants', data->'participants'),
                        ARRAY[auth.uid()::text])
            )
            OR
            -- التحكم بالمؤقت (عضو في الغرفة)
            (
                public.has_only(public.doc_old_data(path), data,
                                ARRAY['timerStatus', 'startTime', 'accumulatedFocusSeconds'])
                AND public.doc_field_contains(path, 'participants', auth.uid()::text)
            )
        )
    )
);

-- rooms/{id}/messages: لا تحديث في قواعد Firestore الأصلية (إنشاء/حذف فقط)
-- لذلك لا توجد سياسة UPDATE لرسائل الغرف — تُرفض من RLS تلقائياً.

-- rooms/{id}/typing/{uid}: الكاتب نفسه
CREATE POLICY "upd_room_typing"
ON public.documents FOR UPDATE TO authenticated
USING (
    split_part(path, '/', 1) = 'rooms'
    AND split_part(path, '/', 3) = 'typing'
    AND split_part(path, '/', 4) = auth.uid()::text
)
WITH CHECK (
    split_part(path, '/', 1) = 'rooms'
    AND split_part(path, '/', 3) = 'typing'
    AND split_part(path, '/', 4) = auth.uid()::text
);

-- fleets: المشرف، أو المالك (تعديل كامل)، أو العضو (xp/totalFocusHours فقط،
-- أو تعديل members/coAdmins بإضافة/إزالة الذات فقط)
CREATE POLICY "upd_fleets"
ON public.documents FOR UPDATE TO authenticated
USING (
    split_part(path, '/', 1) = 'fleets'
    AND split_part(path, '/', 3) = ''
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'fleets'
        AND split_part(path, '/', 3) = ''
        AND public.is_not_banned()
        AND (
            -- المالك يعدّل أي شيء (ثبات ownerId/createdAt)
            (
                data->>'ownerId' = auth.uid()::text
                AND public.doc_old_data(path)->>'ownerId' = auth.uid()::text
                AND (data->>'createdAt') IS NOT DISTINCT FROM (public.doc_old_data(path)->>'createdAt')
            )
            OR
            -- العضو: إما xp/totalFocusHours (ضمن حد)، أو تعديل members/coAdmins للذات فقط
            (
                (
                    public.doc_field_contains(path, 'members', auth.uid()::text)
                    OR COALESCE(data->'members' @> to_jsonb(auth.uid()::text), false)
                )
                AND (
                    (
                        public.has_only(public.doc_old_data(path), data, ARRAY['xp', 'totalFocusHours'])
                        AND COALESCE((data->>'xp')::bigint, 0)
                            <= COALESCE((public.doc_old_data(path)->>'xp')::bigint, 0) + 200
                    )
                    OR
                    (
                        public.has_only(public.doc_old_data(path), data, ARRAY['members', 'coAdmins'])
                        AND public.arr_subset(
                                public.arr_added(public.doc_old_data(path)->'members', data->'members'),
                                ARRAY[auth.uid()::text])
                        AND public.arr_subset(
                                public.arr_removed(public.doc_old_data(path)->'members', data->'members'),
                                ARRAY[auth.uid()::text])
                        AND public.arr_subset(
                                public.arr_added(public.doc_old_data(path)->'coAdmins', data->'coAdmins'),
                                ARRAY[auth.uid()::text])
                        AND public.arr_subset(
                                public.arr_removed(public.doc_old_data(path)->'coAdmins', data->'coAdmins'),
                                ARRAY[auth.uid()::text])
                    )
                )
            )
        )
    )
);

-- fleets/{id}/messages: لا تحديث في قواعد Firestore الأصلية (إنشاء/حذف فقط)
-- لذلك لا توجد سياسة UPDATE لرسائل الأساطيل — تُرفض من RLS تلقائياً.

-- challenges: المشاركون فقط، بفروع مطابقة تماماً لقواعد Firestore
--   (1) القبول/الرفض: المتحدَّى فقط يغيّر status
--   (2) الإكمال: أحد الطرفين يغيّر status+winnerId مع status = 'completed'
--   (3) التقدم: كل طرف يحدّث تقدمه هو فقط
--   (4) استلام الجائزة: أحد الطرفين يغيّر rewardsClaimed
CREATE POLICY "upd_challenges"
ON public.documents FOR UPDATE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'challenges'
        AND split_part(path, '/', 3) = ''
        AND (data->>'challengerId' = auth.uid()::text OR data->>'challengedId' = auth.uid()::text)
    )
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'challenges'
        AND split_part(path, '/', 3) = ''
        AND (data->>'challengerId' = auth.uid()::text OR data->>'challengedId' = auth.uid()::text)
        AND (data->>'challengerId') IS NOT DISTINCT FROM (public.doc_old_data(path)->>'challengerId')
        AND (data->>'challengedId') IS NOT DISTINCT FROM (public.doc_old_data(path)->>'challengedId')
        AND (data->>'createdAt') IS NOT DISTINCT FROM (public.doc_old_data(path)->>'createdAt')
        AND (
            -- (1) القبول/الرفض: المتحدَّى فقط يغيّر status
            (
                data->>'challengedId' = auth.uid()::text
                AND public.has_only(public.doc_old_data(path), data, ARRAY['status'])
            )
            OR
            -- (2) الإكمال: أحد الطرفين يغيّر status+winnerId مع status = 'completed'
            (
                public.has_only(public.doc_old_data(path), data, ARRAY['status', 'winnerId'])
                AND data->>'status' = 'completed'
                AND data->>'winnerId' IS NOT NULL
            )
            OR
            -- (3) التقدم: المتحدي يحدّث progressPlayer1 فقط، والمتحدَّى progressPlayer2 فقط
            (
                data->>'challengerId' = auth.uid()::text
                AND public.has_only(public.doc_old_data(path), data, ARRAY['progressPlayer1'])
            )
            OR
            (
                data->>'challengedId' = auth.uid()::text
                AND public.has_only(public.doc_old_data(path), data, ARRAY['progressPlayer2'])
            )
            OR
            -- (4) استلام الجائزة: أحد الطرفين يغيّر rewardsClaimed فقط
            (
                public.has_only(public.doc_old_data(path), data, ARRAY['rewardsClaimed'])
            )
        )
    )
);

-- discussions: المشرف، أو زيادة views، أو likes/replies بحد ±1، أو الكاتب يغيّر الصورة فقط
CREATE POLICY "upd_discussions"
ON public.documents FOR UPDATE TO authenticated
USING (
    split_part(path, '/', 1) = 'discussions'
    AND split_part(path, '/', 3) = ''
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'discussions'
        AND split_part(path, '/', 3) = ''
        AND public.is_not_banned()
        AND (
            -- زيادة المشاهدات فقط
            (
                public.has_only(public.doc_old_data(path), data, ARRAY['views'])
                AND COALESCE((data->>'views')::bigint, 0) > COALESCE((public.doc_old_data(path)->>'views')::bigint, 0)
            )
            OR
            -- likes (مع قائمة likedBy) / replies (مع lastActivity) بحد ±1
            (
                public.has_only(public.doc_old_data(path), data, ARRAY['likedBy', 'likesCount'])
                AND abs(COALESCE((data->>'likesCount')::bigint, 0) - COALESCE((public.doc_old_data(path)->>'likesCount')::bigint, 0)) <= 1
                AND (data->>'repliesCount') IS NOT DISTINCT FROM (public.doc_old_data(path)->>'repliesCount')
            )
            OR
            (
                public.has_only(public.doc_old_data(path), data, ARRAY['repliesCount', 'lastActivity'])
                AND abs(COALESCE((data->>'repliesCount')::bigint, 0) - COALESCE((public.doc_old_data(path)->>'repliesCount')::bigint, 0)) <= 1
                AND (data->>'likesCount') IS NOT DISTINCT FROM (public.doc_old_data(path)->>'likesCount')
            )
            OR
            -- الكاتب يغيّر صورة الملف فقط
            (
                data->>'userId' = auth.uid()::text
                AND public.has_only(public.doc_old_data(path), data, ARRAY['userPhoto'])
            )
        )
    )
);

-- replies: الكاتب يغيّر الصورة فقط، أو المشرف
CREATE POLICY "upd_replies"
ON public.documents FOR UPDATE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'discussions'
        AND split_part(path, '/', 3) = 'replies'
        AND data->>'userId' = auth.uid()::text
    )
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'discussions'
        AND split_part(path, '/', 3) = 'replies'
        AND data->>'userId' = auth.uid()::text
        AND public.has_only(public.doc_old_data(path), data, ARRAY['userPhoto'])
    )
);

-- exhibitions: لا تحديث في قواعد Firestore الأصلية (قراءة/إنشاء/حذف فقط)
-- لذلك لا توجد سياسة UPDATE للمعارض — تُرفض من RLS تلقائياً.

-- suggestions: الكاتب يغيّر الصورة فقط، أو المشرف
CREATE POLICY "upd_suggestions"
ON public.documents FOR UPDATE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'suggestions'
        AND data->>'userId' = auth.uid()::text
    )
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'suggestions'
        AND data->>'userId' = auth.uid()::text
        AND public.has_only(public.doc_old_data(path), data, ARRAY['userPhoto'])
    )
);

-- awareness_signals: المشرف، أو أي مسجّل (views/likes فقط)
CREATE POLICY "upd_awareness_signals"
ON public.documents FOR UPDATE TO authenticated
USING (split_part(path, '/', 1) = 'awareness_signals')
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'awareness_signals'
        AND public.has_only(public.doc_old_data(path), data, ARRAY['views', 'likes'])
    )
);

-- support_tickets: الكاتب أو المشرف (مع ثبات ملكية التذكرة)
CREATE POLICY "upd_support_tickets"
ON public.documents FOR UPDATE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'support_tickets'
        AND data->>'userId' = auth.uid()::text
    )
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'support_tickets'
        AND data->>'userId' = auth.uid()::text
        AND (data->>'userId') IS NOT DISTINCT FROM (public.doc_old_data(path)->>'userId')
    )
);

-- system / advices / app_updates / global_notifications / admin_alerts: المشرف فقط
CREATE POLICY "upd_admin_collections"
ON public.documents FOR UPDATE TO authenticated
USING (
    split_part(path, '/', 1) IN ('system', 'advices', 'app_updates', 'global_notifications', 'admin_alerts')
    AND public.is_admin_user()
)
WITH CHECK (
    split_part(path, '/', 1) IN ('system', 'advices', 'app_updates', 'global_notifications', 'admin_alerts')
    AND public.is_admin_user()
);

-- errors: صاحب البلاغ يغيّر count/lastAt فقط، أو المشرف
CREATE POLICY "upd_errors"
ON public.documents FOR UPDATE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'errors'
        AND data->>'uid' = auth.uid()::text
    )
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'errors'
        AND data->>'uid' = auth.uid()::text
        AND public.has_only(public.doc_old_data(path), data, ARRAY['count', 'lastAt'])
    )
);

-- global_chat (مهجور): الكاتب يغيّر الصورة فقط، أو likes/comments فقط، أو المشرف
CREATE POLICY "upd_global_chat"
ON public.documents FOR UPDATE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'global_chat'
        AND data->>'userId' = auth.uid()::text
    )
)
WITH CHECK (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'global_chat'
        AND (
            public.has_only(public.doc_old_data(path), data, ARRAY['userPhoto'])
            OR public.has_only(public.doc_old_data(path), data, ARRAY['likes'])
            OR public.has_only(public.doc_old_data(path), data, ARRAY['comments'])
        )
    )
);

-- chat_typing (مهجور): الكاتب نفسه
CREATE POLICY "upd_chat_typing"
ON public.documents FOR UPDATE TO authenticated
USING (
    split_part(path, '/', 1) = 'chat_typing'
    AND split_part(path, '/', 2) = auth.uid()::text
)
WITH CHECK (
    split_part(path, '/', 1) = 'chat_typing'
    AND split_part(path, '/', 2) = auth.uid()::text
);

-- worlds + items + players: المشرف أو صاحب العالم
CREATE POLICY "upd_worlds"
ON public.documents FOR UPDATE TO authenticated
USING (
    split_part(path, '/', 1) IN ('worlds', 'items', 'players')
    AND (public.is_admin_user() OR split_part(path, '/', 2) = auth.uid()::text)
)
WITH CHECK (
    split_part(path, '/', 1) IN ('worlds', 'items', 'players')
    AND (public.is_admin_user() OR split_part(path, '/', 2) = auth.uid()::text)
);

-- ============================================================================
-- 7) سياسات DELETE
-- ============================================================================

CREATE POLICY "del_users"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 2) = auth.uid()::text
        AND split_part(path, '/', 3) = ''
    )
);

CREATE POLICY "del_profiles"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'profiles'
        AND split_part(path, '/', 2) = auth.uid()::text
        AND split_part(path, '/', 3) = ''
    )
);

CREATE POLICY "del_users_schedule"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 2) = auth.uid()::text
        AND split_part(path, '/', 3) = 'schedule'
    )
);

CREATE POLICY "del_users_friends"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 3) = 'friends'
        AND (split_part(path, '/', 2) = auth.uid()::text OR split_part(path, '/', 4) = auth.uid()::text)
    )
);

CREATE POLICY "del_users_notifications"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'users'
        AND split_part(path, '/', 3) = 'notifications'
        AND split_part(path, '/', 2) = auth.uid()::text
    )
);

CREATE POLICY "del_rooms"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'rooms'
        AND split_part(path, '/', 3) = ''
        AND data->>'creatorId' = auth.uid()::text
    )
);

CREATE POLICY "del_room_messages"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'rooms'
        AND split_part(path, '/', 3) = 'messages'
        AND data->>'userId' = auth.uid()::text
    )
);

CREATE POLICY "del_room_typing"
ON public.documents FOR DELETE TO authenticated
USING (
    split_part(path, '/', 1) = 'rooms'
    AND split_part(path, '/', 3) = 'typing'
    AND split_part(path, '/', 4) = auth.uid()::text
);

CREATE POLICY "del_chat_typing"
ON public.documents FOR DELETE TO authenticated
USING (
    split_part(path, '/', 1) = 'chat_typing'
    AND split_part(path, '/', 2) = auth.uid()::text
);

CREATE POLICY "del_fleets"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'fleets'
        AND split_part(path, '/', 3) = ''
        AND data->>'ownerId' = auth.uid()::text
    )
);

CREATE POLICY "del_fleet_messages"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'fleets'
        AND split_part(path, '/', 3) = 'messages'
        AND data->>'userId' = auth.uid()::text
    )
);

CREATE POLICY "del_challenges"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'challenges'
        AND split_part(path, '/', 3) = ''
        AND (data->>'challengerId' = auth.uid()::text OR data->>'challengedId' = auth.uid()::text)
    )
);

CREATE POLICY "del_discussions"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'discussions'
        AND split_part(path, '/', 3) = ''
        AND data->>'userId' = auth.uid()::text
    )
);

CREATE POLICY "del_replies"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'discussions'
        AND split_part(path, '/', 3) = 'replies'
        AND data->>'userId' = auth.uid()::text
    )
);

CREATE POLICY "del_exhibitions"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'exhibitions'
        AND data->>'userId' = auth.uid()::text
    )
);

CREATE POLICY "del_suggestions"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'suggestions'
        AND data->>'userId' = auth.uid()::text
    )
);

CREATE POLICY "del_awareness_signals"
ON public.documents FOR DELETE TO authenticated
USING (
    split_part(path, '/', 1) = 'awareness_signals'
    AND public.is_admin_user()
);

CREATE POLICY "del_support_tickets"
ON public.documents FOR DELETE TO authenticated
USING (
    split_part(path, '/', 1) = 'support_tickets'
    AND public.is_admin_user()
);

CREATE POLICY "del_admin_collections"
ON public.documents FOR DELETE TO authenticated
USING (
    split_part(path, '/', 1) IN ('system', 'advices', 'app_updates', 'global_notifications', 'admin_alerts')
    AND public.is_admin_user()
);

CREATE POLICY "del_errors"
ON public.documents FOR DELETE TO authenticated
USING (
    split_part(path, '/', 1) = 'errors'
    AND public.is_admin_user()
);

CREATE POLICY "del_global_chat"
ON public.documents FOR DELETE TO authenticated
USING (
    public.is_admin_user()
    OR (
        split_part(path, '/', 1) = 'global_chat'
        AND data->>'userId' = auth.uid()::text
    )
);

CREATE POLICY "del_worlds"
ON public.documents FOR DELETE TO authenticated
USING (
    split_part(path, '/', 1) IN ('worlds', 'items', 'players')
    AND (public.is_admin_user() OR split_part(path, '/', 2) = auth.uid()::text)
);

-- ============================================================================
-- 8) تحصين دالة الإزاحة الذرية increment_document_field
--    تسمح فقط بالحقول والمسارات المسموحة لكل مجموعة.
--
--    مهم: نُسقط أولاً أي نسخة قديمة (كانت بصيغة bigint ولم تفحص الأذونات
--    ولم تسمح بالقيم الكسرية مثل 25/60 لساعات التركيز) حتى لا يبقى
--    overload قديم يعمل بالتوازي.
-- ============================================================================
DROP FUNCTION IF EXISTS public.increment_document_field(text, text, bigint);
DROP FUNCTION IF EXISTS public.increment_document_field(text, text, int);
DROP FUNCTION IF EXISTS public.increment_document_field(text, text, numeric);

CREATE OR REPLACE FUNCTION public.increment_document_field(
    p_path text,
    p_field text,
    p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    current_val numeric;
    new_val numeric;
    is_own boolean;
BEGIN
    -- 1) منع أي زيادة مباشرة على حقول التقدم (xp/level/role/coins) —
    --    التقدم يُمنح فقط عبر دوال RPC الآمنة (grant_xp وما شابهها)
    IF p_field IN ('xp', 'level', 'role', 'coins')
       OR p_path LIKE '%/xp%' OR p_path LIKE '%/level%' OR p_path LIKE '%/role%'
    THEN
        RETURN jsonb_build_object('success', false, 'error', 'xp_guarded');
    END IF;

    -- 2) يجب أن يكون هناك مستخدم (أو مشرف)
    IF auth.uid() IS NULL AND NOT public.is_admin_user() THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;

    is_own := (split_part(p_path, '/', 1) IN ('users', 'profiles'))
              AND (split_part(p_path, '/', 2) = auth.uid()::text);

    -- 3) مصفوفة الإذن لكل حقل/مسار
    IF p_field = 'friendsCount' AND p_path ~ '^users/[^/]+$' THEN
        IF abs(p_amount) > 1 THEN
            RETURN jsonb_build_object('success', false, 'error', 'amount_too_large');
        END IF;

    ELSIF p_field = 'totalFocusSessions' AND is_own THEN
        IF p_amount <> 1 THEN
            RETURN jsonb_build_object('success', false, 'error', 'amount_too_large');
        END IF;

    ELSIF p_field IN ('totalFocusSeconds', 'accumulatedFocusSeconds')
          AND p_path ~ '^users/[^/]+/totalFocus/[^/]+$' AND is_own THEN
        IF p_amount <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'amount_too_large');
        END IF;

    ELSIF p_field = 'totalFocusHours' AND p_path ~ '^fleets/[^/]+$' THEN
        IF NOT (public.is_admin_user()
                OR public.doc_field_contains(p_path, 'members', auth.uid()::text)) THEN
            RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
        END IF;
        IF p_amount <= 0 OR p_amount > 24 THEN
            RETURN jsonb_build_object('success', false, 'error', 'amount_too_large');
        END IF;

    ELSIF p_field IN ('progressPlayer1', 'progressPlayer2')
          AND p_path ~ '^challenges/[^/]+$' THEN
        IF NOT (public.is_admin_user()
                OR (p_field = 'progressPlayer1' AND public.doc_field_contains(p_path, 'challengerId', auth.uid()::text))
                OR (p_field = 'progressPlayer2' AND public.doc_field_contains(p_path, 'challengedId', auth.uid()::text))) THEN
            RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
        END IF;
        IF p_amount <= 0 OR p_amount > 200 THEN
            RETURN jsonb_build_object('success', false, 'error', 'amount_too_large');
        END IF;

    ELSIF p_field IN ('likesCount', 'repliesCount') AND p_path ~ '^discussions/[^/]+$' THEN
        IF abs(p_amount) > 1 THEN
            RETURN jsonb_build_object('success', false, 'error', 'amount_too_large');
        END IF;

    ELSIF p_field = 'views' AND p_path ~ '^awareness_signals/[^/]+$' THEN
        IF p_amount <> 1 THEN
            RETURN jsonb_build_object('success', false, 'error', 'amount_too_large');
        END IF;

    ELSIF p_field = 'likes' AND p_path ~ '^awareness_signals/[^/]+$' THEN
        IF abs(p_amount) > 1 THEN
            RETURN jsonb_build_object('success', false, 'error', 'amount_too_large');
        END IF;

    ELSIF p_field = 'count' AND p_path ~ '^errors/[^/]+$' THEN
        -- صاحب البلاغ (uid = نفسه) أو المشرف فقط يزيد عدّاد الخطأ
        IF NOT (public.is_admin_user()
                OR public.doc_field_contains(p_path, 'uid', auth.uid()::text)) THEN
            RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
        END IF;
        IF p_amount <> 1 THEN
            RETURN jsonb_build_object('success', false, 'error', 'amount_too_large');
        END IF;

    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'field_not_whitelisted');
    END IF;

    -- 4) تنفيذ الإزاحة الذرية
    SELECT (data->>p_field)::numeric INTO current_val
    FROM public.documents
    WHERE path = p_path;

    new_val := COALESCE(current_val, 0) + p_amount;

    UPDATE public.documents
    SET data = jsonb_set(data, ('{' || p_field || '}'), to_jsonb(new_val)),
        updated_at = now()
    WHERE path = p_path;

    RETURN jsonb_build_object('success', true, 'value', new_val);
END;
$$;

-- منح التنفيذ للمستخدمين المسجّلين على الصيغة الجديدة (numeric)
GRANT EXECUTE ON FUNCTION public.increment_document_field(text, text, numeric) TO authenticated;

-- ============================================================================
-- 9) تسجيل عدد السياسات لمراجعة سريعة
-- ============================================================================
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'documents'
ORDER BY cmd, policyname;

COMMIT;
