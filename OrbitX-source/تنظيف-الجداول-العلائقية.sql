-- ============================================================
-- تنظيف الجداول العلائقية القديمة (من نسخة OrbitX-new التجريبية)
-- الموقع الحالي (OrbitX-source) لا يستخدم هذه الجداول إطلاقاً.
-- تنبيه: هذا الحذف نهائي — لا يمكن التراجع عنه بعد التشغيل.
-- ============================================================

-- 1) حذف مشغل التسجيل أولاً (حتى لا ينكسر تسجيل المستخدمين الجدد)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2) حذف الجداول العلائقية القديمة
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.room_messages CASCADE;
DROP TABLE IF EXISTS public.global_chat CASCADE;
DROP TABLE IF EXISTS public.exhibitions CASCADE;
DROP TABLE IF EXISTS public.suggestions CASCADE;
DROP TABLE IF EXISTS public.awareness_signals CASCADE;
DROP TABLE IF EXISTS public.black_holes CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.ticket_messages CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.schedule_items CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.discussion_likes CASCADE;
DROP TABLE IF EXISTS public.discussion_replies CASCADE;
DROP TABLE IF EXISTS public.discussions CASCADE;
DROP TABLE IF EXISTS public.challenge_participants CASCADE;
DROP TABLE IF EXISTS public.challenges CASCADE;
DROP TABLE IF EXISTS public.fleet_members CASCADE;
DROP TABLE IF EXISTS public.fleets CASCADE;
DROP TABLE IF EXISTS public.room_members CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
