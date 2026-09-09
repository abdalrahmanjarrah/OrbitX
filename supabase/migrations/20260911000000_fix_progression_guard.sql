-- =============================================================================
-- OrbitX — المرحلة 42: إصلاح حارس التقدّم (قفل مباشر حقيقي)
-- =============================================================================
-- المشكلة:
--   حارس التقدّم (protect_progression_rel) كان شرطه معكوساً:
--   AND current_setting('app.progression_allowed', true) <> '1'
--   عندما لا يكون العلم مضبوطاً (الحالة الطبيعية لأي تعديل مباشر من المتصفح)
--   تعود الدالة بـ NULL فيُتجاهَل الحارس، فيصبح مفتوحاً:
--   أي مستخدم قادر أن يعدّل users.<uid> مباشرة عبر Rest API
--   ويغيّر xp أو level أو coins أو hearts أو role بلا رادع.
-- الحل:
--   يعمل القفل افتراضياً: COALESCE(..., '0') <> '1'
--   أي لا يُسمح بتغيير أعمدة التقدّم إلا إذا كان العلم مضبوطاً صراحةً على '1'
--   (وهو ما تفعله دوال الخادم الموثوقة grant_xp / grant_challenge_reward /
--   purchase_item_deduct / admin_set_xp قبل كتابتها)، أو لحسابات الأدمن.
--   وشملنا أيضاً coins و hearts ضمن الأعمدة المغلقة.
-- =============================================================================

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