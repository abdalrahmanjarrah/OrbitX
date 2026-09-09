# دليل الاستمرار (HANDOFF) — OrbitX

> هذا الملف كتبه الذكاء الاصطناعي في جلسة العمل الأخيرة حتى يستطيع أي دردشة جديدة
> (session جديدة) أن تكمّل من حيث توقّفنا **بدون** أن يشرح المستخدم كل شيء من الأول.
> اقرأه كاملاً أول ما تفتح الدردشة، وبعد آخر جلسة **قِسّمه إلى /tmp** أو اكتب فيه بآخر ما
> عملت حتى يبقى محدَّث دائماً.

---

## 1. مين المستخدم؟ (الأهم للتواصل)

- الاسم: **عبدالرحمن (Abdalrahman)** — يتكلم **عربي عامي شام/أردني** (اللهجة العامية).
- **مبتدئ تماماً** في البرمجة والأمن السيبراني والشبكات. يضايقه الشرح الطويل التقني والمكرر.
- يفضّل شرحاً بسيطاً بثلاث طبقات ("يعني ×3") — من الأبسط للأعمق — وبلغة بسيطة جداً.
- اسم الجهاز: `abdalrahmanPC` / البيئة `oem` — واجهة **Cinnamon**، طرفية **gnome-terminal**.
- يفضّل أن نتعامل كـ"مهندس منتج" — نفكّر وننفّذ وحدنا بأسلوب احترافي، ونفسّر له النتيجة بلغة بسيطة، **بدون** سؤاله تفاصيل تقنية كثيرة.
- **قاعدة مهمة**: آخر كل مهمة، حدّث ملف `ماذا-حدث.md` باللغة البسيطة، واشرح له "ما المشكلة؟ ليش عملتها؟ إيش يستفيد؟".

---

## 2. ما هو المشروع؟

**OrbitX** — تطبيق "دراسة وتركيز" (تطبيق بواجهة ويب) بنكهة فضائية/كونية سينمائية:
- يسجّل جلسات تركيز (Focus) ويجمع نقاط خبرة (XP) ومستويات ورتب وأوسمة.
- فيه أساطيل (flotillas) من المستخدمين، لوحة متصدرين، تحديات، واجهة عربية.
- مشروع React + Vite + TypeScript + Supabase (JSONB + RLS). مبني أيضاً على React Three Fiber.
- **المرجع الرسمي الحالي**: مجلد المشروع على القرص هو `OrbitX-source/` (وليس `OrbitX` أو `OrbitX-new` الأقدم).

---

## 3. أهم شيء حصل في آخر جلسة: مشكلة "المجرة" وGit/GitHub (حاسمة!)

### المشكلة
أضفنا "مجرة درب التبانة" التفاعلية (WebGL / three.js) كواجهة رئيسية (Hero) للصفحة التسويقية.
بعد الرفع، **المجرة ما كانت تظهر على الموقع الحي**. المستخدم ظل يسأل "ليش الهيرو مش مبين؟".

### السبب الجذري (معقّد — مهم جداً لفهمه)
المستخدم عنده **عدة Repos بنفس الاسم تقريباً** بسبب نقاط (`.`) في نهاية الأسماء. المشروع الحقيقي ذو الحجم الكبير كان يُظن أنه `OrbitX..` (نقطتان). اتضح الآتي:

1. **Git "يقصّ" النقاط المتتالية في نهاية اسم الـ repo** في رابط الرفع.
   - الرابط `https://github.com/.../OrbitX..git` يُجريد فيه git النقطتين `..` فيتحوّل فعلياً إلى **`OrbitX.`** (نقطة واحدة) عند الرفع والقراءة عبر بروتوكول git.
2. لذلك **رفعنا في أول مرة ذهب بالخطأ إلى الـ repo `OrbitX.`** وليس `OrbitX..` (الذي يبني منه الموقع الحي).
3. **GitHub Web/API/Pages** من جهة أخرى يتعامل مع `OrbitX..` كاسم repo حقيقي منفصل، ويبقى عند الكود القديم *بدون* المجرة.
4. لهذا **الموقع الحي `https://abdalrahmanjarrah.github.io/OrbitX../` لم يكن يعرض المجرة** — لأنه مبني من الـ repo `OrbitX..` الذي لم يصلها الرفع.

### الحل (تم تنفيذه بنجاح)
- اكتشفنا أن ترميز النقاط بـ `%2E%2E` يمنع git من قصّها، فيصل git بالفعل إلى الـ repo الحقيقي `OrbitX..`.
- أضفنا remote جديد في مشروع `OrbitX-source`:
  `git remote add dotdot https://github.com/abdalrahmanjarrah/OrbitX%2E%2E.git`
- رفعنا main إلى remote `dotdot`:
  `git push dotdot main` → النتيجة `e212fba..ed46c3b main -> main`
- شغّلنا الـ workflow يدوياً باسم الـ repo المرمّز:
  `gh workflow run "Deploy to GitHub Pages" --repo "abdalrahmanjarrah/OrbitX%2E%2E" --ref main`
- **البناء نجح**: "Deploy to GitHub Pages → completed success" على commit `ed46c3b`.
- **التحقق النهائي**: `https://abdalrahmanjarrah.github.io/OrbitX../galaxy/index.html` يعطي **HTTP 200** (كان 404 قبل الحل).

### الحالة النهائية للموقع الحي
- **الموقع الحي**: `https://abdalrahmanjarrah.github.io/OrbitX../` (واجهة) — الآن يعرض المجرة.
- **السيرفر الكامل**: `https://orbitx-server-fz2g.onrender.com/` (React build + server). تم أيضاً "Auto-deploy to Render" بنجاح على `ed46c3b`.
- **المجرة موجودة الآن على الـ repo الصحيح** في مجلد `public/galaxy/` (الذي ترفعه Pages).

---

## 4. حالة Git/GitHub الحالية (مهم جداً — تحقق قبل أي رفع!)

### الحسابات (GH accounts)
- المستخدم عنده **حسبان** على GitHub:
  1. `abdalrahmanjarrah` (الأول) — **مالك الـ repos ومالك المشروع الفعلي**.
  2. `madrekjo` (الثاني).
- **الحساب النشط حالياً في `gh`**: `abdalrahmanjarrah` (تم تبديله في آخر جلسة).
  - تحقق دائماً قبل الرفع: `gh api user --jq .login` يجب أن يُرجع `abdalrahmanjarrah`.
  - إن ظهر `madrekjo` فالمشروع `OrbitX..` لا يملكه، والرفع سيفشل بـ 403.
  - للتبديل: `gh auth switch --user abdalrahmanjarrah`.
- **صلاحية الـ workflow مضافة** للحساب `abdalrahmanjarrah` (تمت عبر `gh auth refresh -s workflow`).
  - ضرورية لأن الـ repo فيه GitHub Actions (workflows). بدونها يرفض GitHub أي رفع يمس ملفات `.github/workflows/`.

### الـ remotes في مشروع `OrbitX-source` (الحالية)
- `origin` → `https://github.com/abdalrahmanjarrah/OrbitX..git` (يُجرّد إلى `OrbitX.` — استخدمه بحذر، هو الذي وقعنا به).
- `dotdot` → `https://github.com/abdalrahmanjarrah/OrbitX%2E%2E.git` (هذا الصحيح — يصل فعلياً للـ repo الحقيقي `OrbitX..` اللي يبني منه الموقع).

### القاعدة الذهبية للرفع إلى الموقع الحي
- **الـ repo الصحيح الذي يبني منه الموقع هو `OrbitX..` (بـ %2E%2E مرمّزة)** عبر remote `dotdot`.
- **لا تعتمد على `origin`** إلا بعد فهم أن git يجريد النقاط وقد يذهب لـ `OrbitX.` الخاطئ.

---

## 5. آخر commit وكل ما تم في آخر جلسة

**آخر commit**: `ed46c3b` — "feat: interactive Milky Way galaxy hero + comprehensive fixes"
(الموجود على كلا الـ main: origin و dotdot).

الملفات المهمة اللي غُيّرت في آخر جلسة (كلها مرقوعة):
- `src/components/GalaxyHero.tsx` — غلاف (wrapper) للمجرة مع تحميل كسول (lazy) عبر IntersectionObserver، ارتفاع 100vh.
- `public/galaxy/` — ملفات المجرة الفعلية (index.html + images/ + vendor/)، ~79MB.
- `src/components/LandingPage.tsx` — المجرة أول قسم، ثم النص التسويقي، وحذف النظام الشمسي القديم ورتبه.
- `src/views/QuranPlayer.tsx` — تنظيف الاستيرادات الزائدة (كان يستورد كل المكونات).
- `src/views/ProfileView.tsx` — زر تبديل الثيم.
- `src/views/LeaderboardView.tsx` + `src/components/UserSearchView.tsx` — حالات تحميل/خطأ/فارغة.
- `.gitignore` — أضفنا `secrets.env`.

---

## 6. قائمة المهام المتبقية / الخطوات التالية

1. **التحدّث لملف `ماذا-حدث.md`**: أضف وصف هذه الجلسة باللغة البسيطة (المجرة + مشكلة النقاط وحلها). (قد يكون فعلاً مضافاً جزئياً — تحقق.)
2. **إصلاح الـ workflow اليومي "Daily reminder push"** (الـ X الحمراء في تبويب Actions):
   - يعمل يومياً ويغشت لأن secret باسم **`REMINDER_URL` غير مضبوط** في إعدادات الـ repo.
   - السبب: ملف `.github/workflows/daily-reminder.yml` يراجعه بالكامل: "REMINDER_URL secret is not set" ثم `exit 1`.
   - الحل: أضف secret باسم `REMINDER_URL` في GitHub → repo `OrbitX..` → Settings → Secrets and variables → Actions.
   - القيمة: رابط يُشغّل إشعار اليومي على السيرفر، مثل `https://orbitx-server-fz2g.onrender.com/api/push/daily-reminder?secret=<قيمة_سرية>`.
   - **ملاحظة**: هذا الـ endpoint موجود فعلاً في `server.ts:600` (`app.post("/api/push/daily-reminder", ...)`).
3. **تنبيه أمني معلّق (مهم)**: المستخدم شارك مفتاح `service_role` الخاص بـ Supabase في الدردشة القديمة، و`secrets.env` فيه أسرار. يجب أن **يعكسه (revoke/rotate)** من لوحة Supabase. `secrets.env` مضاف لـ `.gitignore` فلا يسرب عبر git.
4. **ترخيص المجرة** (معلّق، المستخدم قرر التأجيل): المجلة مصدرها "Galaxy Explorer" تحت **PolyForm Noncommercial License 1.0.0** — مجانية للدراسة والبحث، لكن **الاستخدام التجاري يتطلب ترخيصاً منفصلاً** من المؤلف (Justin Zhang عبر GitHub). إذا نوى المستخدم كسب المال من OrbitX فلابد أن يطلب ترخيصاً لاحقاً.

---

## 7. أوامر مفيدة (مرجع سريع)

```bash
# رفع الكود إلى الـ repo الصحيح (الذي يبني الموقع)
git add -A
git commit -m "رسالتك"
git push dotdot main          # الـ remote الصحيح (OrbitX.. عبر %2E%2E)
git push origin main          # ⚠️ origin يجريد النقاط وقد يذهب لـ OrbitX. — تحقق قبل استخدامه

# تشغيل الـ deploy يدوياً (بعد أي رفع للكود الجديد) حتى يبنى الموقع
gh workflow run "Deploy to GitHub Pages" --repo "abdalrahmanjarrah/OrbitX%2E%2E" --ref main

# مراقبة حالة الـ workflows
gh api "repos/abdalrahmanjarrah/OrbitX%2E%2E/actions/runs?per_page=5" \
  --jq '.workflow_runs[] | "\(.name) | \(.status) | \(.conclusion) | \(.head_sha[0:7]) | \(.created_at)"'

# التحقق من الحساب النشط (يجب أن يكون abdalrahmanjarrah)
gh api user --jq .login

# بناء المشروع محلياً للتحقق
cd "OrbitX-source" && npm run build
```

---

## 8. ملاحظات فنية عامة للمشروع

- البناء: `npm run build` (يشمل `vite build` + حزم السيرفر esbuild إلى `dist/server.cjs`).
- الاختبارات: `npm test` (vitest) — كانت 37/37 ناجحة قبل آخر تعديلات.
- `npm run lint` = `tsc --noEmit` (تحقق من الأنواع).
- بنية البيانات: **Supabase JSONB + RLS** (المستخدم قرر **عدم** الانتقال إلى schema علائقية).
- الرموز الزخرفية: المشروع يحافظ على جمالية كونية سينمائية، استجابات عالية على كل الشاشات، وبلا حلقة عروض infinite أو تسريب ذاكرة.
