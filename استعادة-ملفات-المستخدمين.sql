-- =========================================================================
-- استعادة مستندات users/{uid} من البروفايلات الموجودة (إنشاء + إصلاح)
-- =========================================================================
-- المشكلة: مجموعة "users" كانت فارغة أو مكتوبة بقيم صفرية (xp:0, level:1)
-- من الكود القديم، لذلك كان يعامل كل دخول كمستخدم جديد ويصفّر الحساب.
-- هذا السكربت:
--   1) ينشئ مستندات users/{uid} المفقودة من البروفايلات السليمة.
--   2) يصلح المستندات الموجودة الصفرية (level=1 و xp<=0) من البروفايل
--      حتى لا يبقى أي حساب صفرياً.
-- لن يمسّ أي حساب له XP حقيقي في ملفه (حماية كاملة).
--
-- التشغيل:
--   1. لوحة Supabase Dashboard → SQL Editor → New Query
--   2. الصق هذا الكود وشغّله.
-- =========================================================================

-- 1) إنشاء المستندات المفقودة
INSERT INTO public.documents (path, collection, id, data, created_at, updated_at)
SELECT
  'users/' || p.id,
  'users',
  p.id,
  jsonb_build_object(
    'uid',                p.id,
    'displayName',        COALESCE(p.data->>'displayName', 'رائد فضاء'),
    'email',              COALESCE(p.data->>'email', ''),
    'photoURL',           COALESCE(p.data->>'photoURL', ''),
    'bio',                COALESCE(p.data->>'bio', ''),
    'level',              COALESCE((p.data->>'level')::int, 1),
    'xp',                 COALESCE((p.data->>'xp')::int, 0),
    'role',               COALESCE(p.data->>'role', 'user'),
    'friendsCount',       COALESCE((p.data->>'friendsCount')::int, 0),
    'banned',             COALESCE((p.data->>'banned')::boolean, false),
    'currentActivity',    COALESCE(p.data->>'currentActivity', 'في لوحة التحكم'),
    'streak',             COALESCE((p.data->>'streak')::int, 1),
    'lastActiveDate',     COALESCE(p.data->>'lastActiveDate', CURRENT_DATE::text),
    'lastActiveTime',     COALESCE((p.data->>'lastActiveTime')::bigint, 0),
    'missionRole',        p.data->>'missionRole',
    'completedWizard',    COALESCE((p.data->>'completedWizard')::boolean, false),
    'totalFocusSessions', COALESCE((p.data->>'totalFocusSessions')::int, 0)
  ),
  COALESCE(p.created_at, now()),
  COALESCE(p.updated_at, now())
FROM public.documents p
WHERE p.collection = 'profiles'
  AND p.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.documents u
    WHERE u.collection = 'users' AND u.id = p.id
  );

-- 2) إصلاح المستندات الموجودة الصفرية (level=1 و xp<=0) من البروفايل
UPDATE public.documents u
SET data = jsonb_build_object(
      'uid',                u.id,
      'displayName',        COALESCE(p.data->>'displayName', COALESCE(u.data->>'displayName', 'رائد فضاء')),
      'email',              COALESCE(u.data->>'email', COALESCE(p.data->>'email', '')),
      'photoURL',           COALESCE(p.data->>'photoURL', COALESCE(u.data->>'photoURL', '')),
      'bio',                COALESCE(p.data->>'bio', COALESCE(u.data->>'bio', '')),
      'level',              COALESCE((p.data->>'level')::int, COALESCE((u.data->>'level')::int, 1)),
      'xp',                 COALESCE((p.data->>'xp')::int, COALESCE((u.data->>'xp')::int, 0)),
      'role',               COALESCE(p.data->>'role', COALESCE(u.data->>'role', 'user')),
      'friendsCount',       COALESCE((p.data->>'friendsCount')::int, COALESCE((u.data->>'friendsCount')::int, 0)),
      'banned',             COALESCE((p.data->>'banned')::boolean, COALESCE((u.data->>'banned')::boolean, false)),
      'currentActivity',    COALESCE(u.data->>'currentActivity', 'في لوحة التحكم'),
      'streak',             COALESCE((p.data->>'streak')::int, COALESCE((u.data->>'streak')::int, 1)),
      'lastActiveDate',     COALESCE(p.data->>'lastActiveDate', COALESCE(u.data->>'lastActiveDate', CURRENT_DATE::text)),
      'lastActiveTime',     COALESCE((p.data->>'lastActiveTime')::bigint, COALESCE((u.data->>'lastActiveTime')::bigint, 0)),
      'missionRole',        COALESCE(p.data->>'missionRole', u.data->>'missionRole'),
      'completedWizard',    COALESCE((p.data->>'completedWizard')::boolean, COALESCE((u.data->>'completedWizard')::boolean, false)),
      'totalFocusSessions', COALESCE((p.data->>'totalFocusSessions')::int, COALESCE((u.data->>'totalFocusSessions')::int, 0))
    ),
    updated_at = now()
FROM public.documents p
WHERE u.collection = 'users'
  AND p.collection = 'profiles'
  AND p.id = u.id
  AND COALESCE((u.data->>'level')::int, 1) = 1
  AND COALESCE((u.data->>'xp')::int, 0) <= 0;

-- التحقق: كم مستند users/ أصبح موجوداً؟
SELECT collection, COUNT(*) FROM public.documents
WHERE collection IN ('users', 'profiles')
GROUP BY collection ORDER BY collection;
