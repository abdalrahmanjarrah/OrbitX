-- ============================================================================
-- ORBITX — FLEET OWNER HANDOVER MIGRATION (server-side safety net)
-- ============================================================================
-- ماذا يغيّر؟
--   عندما يغادر رئيس الأسطول (أو يُزال من قائمة الأعضاء) يبقى الأسطول بلا قائد.
--   العميل (FleetsView.tsx) يتعامل مع هذا: عند المغادرة يُسلَّم القيادة تلقائياً
--   إلى نائب الرئيس ثم إلى أقدم عضو. لكن إن حصل أي تحديث جانبي آخر أزال الرئيس
--   من الأعضاء، يقف الأسطول ميتاً بلا قائد.
--
--   هذا الملف يضيف حاجز أمان على مستوى قاعدة البيانات:
--     1. قبل كل تحديث لمستند أسطول، إذا لم يعد الرئيس القديم ضمن قائمة
--        الأعضاء (members) → تُنقل القيادة فوراً إلى:
--          a) نائب الرئيس: أول co-admin ما زال عضواً في الأسطول.
--          b) فإن لم يوجد نائب → أقدم عضو متبقٍّ (أول عنصر في members،
--             لأن القائمة تحافظ على ترتيب الانضمام).
--     2. الرئيس القديم يُزال أيضاً من قائمة النواب (coAdmins) إن كان موجوداً.
--
-- طريقة الاستخدام:
--   1. افتح Supabase Dashboard → SQL Editor.
--   2. الصق هذا الملف كاملاً واشغّله (Run).
--   3. يمكن إعادة تشغيله بأمان أكثر من مرة (يقوم بحذف نسخه القديمة أولاً).
-- ============================================================================

BEGIN;

-- 1) إزالة أي نسخة قديمة من الدالة والـ trigger (تشغيل آمن متكرر)
DROP TRIGGER IF EXISTS trg_fleet_owner_handover ON public.documents;
DROP FUNCTION IF EXISTS public.fleet_owner_handover();

-- 2) دالة نقل القيادة
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
    -- نطبّق فقط على مستندات الأساطيل
    IF OLD.collection <> 'fleets' THEN
        RETURN NEW;
    END IF;

    old_owner := NEW.data->>'ownerId';
    IF old_owner IS NULL OR old_owner = '' THEN
        RETURN NEW;
    END IF;

    members   := COALESCE(NEW.data->'members', '[]'::jsonb);
    co_admins := COALESCE(NEW.data->'coAdmins', '[]'::jsonb);

    -- إذا ما زال الرئيس عضواً في الأسطول فلا داعي لأي تغيير
    IF members @> to_jsonb(old_owner) THEN
        RETURN NEW;
    END IF;

    -- أ) نائب الرئيس: أول co-admin لا يزال عضواً (بترتيب قائمة النواب)
    SELECT m INTO heir
    FROM jsonb_array_elements_text(co_admins) WITH ORDINALITY AS t(m, ord)
    WHERE members @> to_jsonb(m)
    ORDER BY ord
    LIMIT 1;

    -- ب) إن لم يوجد نائب → أقدم عضو متبقٍّ (أول عنصر في members)
    IF heir IS NULL THEN
        SELECT m INTO heir
        FROM jsonb_array_elements_text(members) AS m
        LIMIT 1;
    END IF;

    IF heir IS NOT NULL THEN
        -- نقل القيادة إلى الوريث
        NEW.data := jsonb_set(NEW.data, '{ownerId}', to_jsonb(heir));

        -- الرئيس القديم لم يعد نائباً
        IF co_admins @> to_jsonb(old_owner) THEN
            NEW.data := jsonb_set(
                NEW.data,
                '{coAdmins}',
                (SELECT COALESCE(jsonb_agg(c), '[]'::jsonb)
                 FROM jsonb_array_elements_text(co_admins) AS c
                 WHERE c <> old_owner)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 3) ربط الدالة بالتحديث فقط — لا نتدخل في حذف الأسطول نهائياً
CREATE TRIGGER trg_fleet_owner_handover
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.fleet_owner_handover();

COMMIT;
