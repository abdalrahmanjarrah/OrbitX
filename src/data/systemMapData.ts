/**
 * بيانات "خريطة النظام" — يمثل كل عنصر بطاقة/جدول صغير، والخطوط هي العلاقات.
 * الإحداثيات مراكز البطاقات داخل عالم 2600×1700 (نظام إحداثيات LTR دائم).
 */

export type NodeGroup = "app" | "logic" | "data" | "security" | "deploy";

export interface MapRow {
  label: string;
  value: string;
}

export interface MapNode {
  id: string;
  title: string;
  group: NodeGroup;
  icon: string;
  x: number;
  y: number;
  rows: MapRow[];
  desc: string;
}

export interface MapEdge {
  from: string;
  to: string;
  label?: string;
}

export interface GroupMeta {
  key: NodeGroup;
  label: string;
  ring: string;
  badge: string;
  glow: string;
}

export const WORLD = { w: 2600, h: 1700 };

export const GROUPS: GroupMeta[] = [
  {
    key: "app",
    label: "الواجهات والشاشات",
    ring: "border-indigo-400/40",
    badge: "text-indigo-300 bg-indigo-500/10",
    glow: "shadow-[0_0_40px_rgba(99,102,241,0.25)]",
  },
  {
    key: "logic",
    label: "المنطق ومحركات النقاط",
    ring: "border-cyan-400/40",
    badge: "text-cyan-300 bg-cyan-500/10",
    glow: "shadow-[0_0_40px_rgba(34,211,238,0.25)]",
  },
  {
    key: "data",
    label: "قاعدة البيانات",
    ring: "border-fuchsia-400/40",
    badge: "text-fuchsia-300 bg-fuchsia-500/10",
    glow: "shadow-[0_0_40px_rgba(232,121,249,0.25)]",
  },
  {
    key: "security",
    label: "الحماية والحصانة",
    ring: "border-emerald-400/40",
    badge: "text-emerald-300 bg-emerald-500/10",
    glow: "shadow-[0_0_40px_rgba(52,211,153,0.25)]",
  },
  {
    key: "deploy",
    label: "النشر والاستضافة",
    ring: "border-amber-400/40",
    badge: "text-amber-300 bg-amber-500/10",
    glow: "shadow-[0_0_40px_rgba(251,191,36,0.25)]",
  },
];

export const GROUPS_BY_KEY: Record<NodeGroup, GroupMeta> = Object.fromEntries(
  GROUPS.map((g) => [g.key, g]),
) as Record<NodeGroup, GroupMeta>;

export const NODES: MapNode[] = [
  {
    id: "orbitx",
    title: "الموقع · OrbitX",
    group: "app",
    icon: "Rocket",
    x: 1300,
    y: 430,
    rows: [
      { label: "الدور", value: "قلب النظام كله" },
      { label: " التسجيل", value: "Google أو زائر" },
      { label: "الخبرة", value: "XP من المهام والجلسات" },
    ],
    desc: "هنا نقطة البداية. المستخدم يفتح الموقع، يتسجل (Google أو وضع زائر)، ويجد لوحة تحكم فضائية فيها: المحطات، الجدول، النزالات، لوحة الصدارة، البروفايل... كل خانة هي 'صفحة' من صفحات المواقع الموجودة بالخريطة حولنا. البيانات تتدفق منها وإليها عبر قناة واحدة اسمها `documents`.",
  },
  {
    id: "home",
    title: "الشاشة · المحطات",
    group: "app",
    icon: "Home",
    x: 700,
    y: 260,
    rows: [
      { label: "task", value: "بدأ جلسة تركيز" },
      { label: "الحكمة", value: "مهام يومية + نقاط" },
      { label: "الشريط", value: "سلسلة الأيام 🔥" },
    ],
    desc: "باب التطبيق الرئيسي. من هنا يفتح المستخدم محطة، يعمل جلسة تركيز، ويشوف بطاقة عاداته اليومية اللي تكسبه XP. المحطات نفسها مخزنة كسطور داخل `documents` بمسار `rooms/...`.",
  },
  {
    id: "schedule",
    title: "الشاشة · الجدول",
    group: "app",
    icon: "Calendar",
    x: 1080,
    y: 230,
    rows: [
      { label: "الحفظ", value: "مسار schedule/:uid" },
      { label: "التقدم", value: "نسبة أسبوع حقيقية" },
      { label: "الحركة", value: "سحب وإفلات + ألوان" },
    ],
    desc: "جدول أسبوعي مرن: المهام تُجرّب وتُسحب بين الأيام، ولكل مهمة لون. التقدم المحرز يُحتسب من التواريخ الحقيقية للإنجاز (completedAt)، وكل صف يُحفظ داخل مستند المستخدم.",
  },
  {
    id: "challenges",
    title: "الشاشة · النزالات",
    group: "app",
    icon: "Swords",
    x: 870,
    y: 120,
    rows: [
      { label: "الفكرة", value: "تحدي تركيز 1v1" },
      { label: "الفائز", value: "يكسب XP وعدّاد" },
      { label: "البيانات", value: "challenges/..." },
    ],
    desc: "ساحة النزال بين صديقين: كل واحد يركّز، والخادم يتحقق من الفائز. الفائز يكسب نقاط XP عبر الدالة الآمنة فقط، وعدّاد انتصاراته (challengeWins) يزيد عند البروفايل.",
  },
  {
    id: "leaderboard",
    title: "الشاشة · لوحة الصدارة",
    group: "app",
    icon: "Trophy",
    x: 470,
    y: 480,
    rows: [
      { label: "مصدرها", value: "قراءة profiles/*" },
      { label: "القدوة", value: "أعلى XP أولاً" },
      { label: "الجمهور", value: "كل المسجلين" },
    ],
    desc: "ترتيب الروّاد حسب النقاط. لا يكتب مباشرة — يقرأ ملفات المستخدمين العامة (المسار `profiles/<id>`) ويعرضها متسلسلة، وهو ما يعني أن الـXP الصحيح يظهر تلقائياً متى كتبه النظام.",
  },
  {
    id: "profile",
    title: "الشاشة · البروفايل",
    group: "app",
    icon: "User",
    x: 560,
    y: 700,
    rows: [
      { label: "المجال", value: "emoji + الخلفية" },
      { label: "الحقيقي", value: "دقائق + انتصارات" },
      { label: "سلسلة", value: "أيام متتالية 🔥" },
    ],
    desc: "بطاقة الهوية: اسمك، شعارك، عدد الدقائق الحقيقية اللي ركّزتها (يتراكم من كل جلسة)، انتصارات النزالات، وسلسلة أيامك المتتالية. تُقرأ كلها من مستند المستخدم مباشرة.",
  },
  {
    id: "search",
    title: "الشاشة · بحث الروّاد",
    group: "app",
    icon: "Search",
    x: 1160,
    y: 520,
    rows: [
      { label: "البحث", value: "بحث بالاسم" },
      { label: "الدخول", value: "فتح ملف مستخدم" },
      { label: "البيانات", value: "قراءة profiles" },
    ],
    desc: "ابحث عن أي رائد أو الانضمام لمستخدم آخر. لا يعدّل شيئاً — يفتح الملفات العامة ويظهر لك صفحة البطاقة فضائية.",
  },
  {
    id: "discussions",
    title: "الشاشة · النقاشات",
    group: "app",
    icon: "MessageSquare",
    x: 1300,
    y: 640,
    rows: [
      { label: "المحتوى", value: "منشورات + ردود" },
      { label: "المسار", value: "discussions/..." },
      { label: "المشاعر", value: "تفاعلات" },
    ],
    desc: "ساحة الحوار الجماعي: منشور رئيسي وردود متفرعة. كل نقاش وردوده أسطر داخل `documents`، والحماية تمنع حذف محتوى غيرك.",
  },
  {
    id: "fleets",
    title: "الشاشة · الأساطيل",
    group: "app",
    icon: "Users",
    x: 1500,
    y: 700,
    rows: [
      { label: "الفريق", value: "مجموعة مترابطة" },
      { label: "XP الجماعي", value: "نقاط الأسطول" },
      { label: "المسار", value: "fleets/..." },
    ],
    desc: "أساطيل من الروّاد يتجمعون، وXP الأسطول يزيد تلقائياً مع كل منح XP من أي عضو — دائماً عبر الخادم، لا من المتصفح مباشرة.",
  },
  {
    id: "awareness",
    title: "الشاشة · إشارات الوعي",
    group: "app",
    icon: "Eye",
    x: 280,
    y: 240,
    rows: [
      { label: "الفكرة", value: "تنبيهات جماعية" },
      { label: "المسار", value: "awareness/..." },
    ],
    desc: "إشارات استيقاظ جماعية (مثل 'لحظة وعي') يبثها الفريق لأعضائه في منتصف جلسة تركيز — تعزز الارتباط دون مقاطعة.",
  },
  {
    id: "blackholes",
    title: "الشاشة · الثقوب السوداء",
    group: "app",
    icon: "BlackHole",
    x: 150,
    y: 460,
    rows: [
      { label: "الفكرة", value: "مهام صيانة عكسية" },
      { label: "المسار", value: "blackholes/..." },
    ],
    desc: "أسلوب 'مهام الدمار المحدود' — يختار المستخدم ثغرة ليعمل فيها، فيزيد XP ويتحسن الموقع معاً.",
  },
  {
    id: "admin",
    title: "الشاشة · الإدارة",
    group: "app",
    icon: "Shield",
    x: 1760,
    y: 240,
    rows: [
      { label: "الأهلية", value: "اسم في admins" },
      { label: "الصلاحيات", value: "إدارة وتنقيع" },
    ],
    desc: "لوحة المشرفين. الصلاحية ليست 'دور بروفايل' — الخادم يحددها: وجود بريدك في جدول `admins` هو ما يعطيك الأهلية، عبر الدالة is_admin_user.",
  },
  {
    id: "support",
    title: "الشاشة · الدعم",
    group: "app",
    icon: "LifeBuoy",
    x: 1820,
    y: 480,
    rows: [
      { label: "المهمة", value: "شركاء المستخدم" },
      { label: "المسار", value: "support/..." },
    ],
    desc: "نافذة الطلب والمساعدة: المستخدم يصف مشكلته، وتصل للإدارة لتجدول تعاملها.",
  },
  {
    id: "sessionEngine",
    title: "المحرّك · الجلسة والدقائق",
    group: "logic",
    icon: "Timer",
    x: 980,
    y: 900,
    rows: [
      { label: "الحالة", value: "يعمل/متوقف" },
      { label: "الدقائق", value: "totalFocusMinutes" },
      { label: "المعلومة", value: "عرض XP كل دقيقة" },
    ],
    desc: "هذا قلب 'جلسة التركيز': مؤقّت ذكي يحسب دقائق التركيز الفعلية، يراكمنها (totalFocusMinutes)، ويبلّغ نظام XP عند كل دقيقة لاضافة النقاط. لو ما خلّصت الجلسة للنهاية (لما تنشغل نافذة الإنجاز) ما بتتحسب.",
  },
  {
    id: "xpSystem",
    title: "النظام · XP والترقية",
    group: "logic",
    icon: "Zap",
    x: 1240,
    y: 930,
    rows: [
      { label: "المنشور", value: "requestXpGrant" },
      { label: "الصياغة", value: "callRpc('grant_xp')" },
      { label: "العملة", value: "XP فقط من الخادم" },
    ],
    desc: "البوابة الوحيدة للنقاط: لا متصفح يعدّل xp/level مباشرة. كل مكافأة تخرج 'طلب منح' → يستدعي دالة grant_xp على الخادم → الخادم يتأكد منك (uid) ومن السقوف ومن النطاق الزمني، ثم يكتب التغيير. هذا هو سبب أن التلاعب بالنقاط شبه مستحيل.",
  },
  {
    id: "streak",
    title: "النظام · سلسلة الأيام",
    group: "logic",
    icon: "Flame",
    x: 1580,
    y: 920,
    rows: [
      { label: "الشرط", value: "تركيز يومي متتالٍ" },
      { label: "المنحة", value: "مكافأة عبر grant_xp" },
    ],
    desc: "يحسب الاتساق اليومي: كل يوم تركّز فيه يزيد السلسلة، والانقطاع يعيدها للبداية. مكافأة السلسلة تصرف عبر نفس الدالة الآمنة، فلا يمكن 'تجعيد' السلسلة يدوياً.",
  },
  {
    id: "levelConfig",
    title: "النظام · المستويات",
    group: "logic",
    icon: "BarChart3",
    x: 1020,
    y: 1090,
    rows: [
      { label: "القاعدة", value: "عدد النقاط" },
      { label: "التوازي", value: "يطابق الخادم" },
    ],
    desc: "يعرف العميل كيف يُحسب المستوى من نقاط XP (جدول عتبات متدرج). المهم: الخادم عنده نفس الجدول بالضبط (level_for_xp)، فالمستوى المعروض مطابق حرفياً لما يسجّله النظام.",
  },
  {
    id: "referrals",
    title: "النظام · الدعوات",
    group: "logic",
    icon: "Gift",
    x: 1800,
    y: 820,
    rows: [
      { label: "الأصل", value: "رابط الدعوة ?invite=" },
      { label: "الأجر", value: "+100 XP لكل صديق" },
    ],
    desc: "عندما ينضم صديق من خلال رابطك، يُسجَّل 'من دعاك' في ملفه، والنظام يمنحك +100 XP عبر دالة آمنة مرة واحدة لكل صديق (بلا تكرار).",
  },
  {
    id: "timeChests",
    title: "النظام · صناديق الوقت",
    group: "logic",
    icon: "Hourglass",
    x: 1900,
    y: 640,
    rows: [
      { label: "الفكرة", value: "مكافآت جلسات ذات وقت" },
      { label: "النظام", value: "صناديق تفتح وقت" },
    ],
    desc: "مكافآت 'صناديق الوقت' — جلسات تُفتح بعيد المدة/الوقت، وكل صندوق مكافأة يمر بنفس خطة منح XP الآمنة.",
  },
  {
    id: "logistics",
    title: "التنقيط · إشعارات وواجهة",
    group: "logic",
    icon: "Bell",
    x: 700,
    y: 820,
    rows: [
      { label: "اللمعان", value: "رسائل إنجاز + أصوات" },
      { label: "الإشعارات", value: "Web Push" },
    ],
    desc: "طبقات 'الرفاهية': رسائل إنجاز مرحة، أصوات كونية، ودفع متصفح لإشعار المستخدم. لا تمس النقاط — فقط تجعل التجربة تلمع.",
  },
  {
    id: "documents",
    title: "البيانات · جدول documents",
    group: "data",
    icon: "Database",
    x: 1250,
    y: 1350,
    rows: [
      { label: "النمط", value: "مستندات (مسار/JSONB)" },
      { label: "المستخدم", value: "users/<uid>" },
      { label: "المحيط", value: "rooms/challenges/..." },
    ],
    desc: "المخزن الفعلي الوحيد للتطبيق (نمط فايرستور داخل قاعدة واحدة). كل 'كيان' هو سطر بمسار: users/<id>, rooms/<id>, challenges/<id>... والبيانات JSONB. هذا سر بساطة البنية: إضافة كيان = مسار جديد.",
  },
  {
    id: "admins",
    title: "البيانات · جدول admins",
    group: "data",
    icon: "UserCheck",
    x: 1010,
    y: 1460,
    rows: [
      { label: "الحقول", value: "البريد + صلاحية" },
      { label: "الدور", value: "تحديد المشرف" },
    ],
    desc: "جدول صغير منفصل 'من انضم للإدارة'. الدالة is_admin_user تقرأه خادمياً، وأي قرار إداري (حظر/تعديل/منح) يمر بتحقق منها.",
  },
  {
    id: "supabase",
    title: "البيانات · سحابة Supabase",
    group: "data",
    icon: "Cloud",
    x: 1700,
    y: 1400,
    rows: [
      { label: "التخزين", value: "PostgreSQL سحابي" },
      { label: "الحركة", value: "مفاتيح anon/service" },
    ],
    desc: "قاعدة البيانات السحابية الفعلية موزّعة للمشروع: تستضيف الجدولين وكل الدوال والسياسات، ويصلها التطبيق بمفتاح عام خفيف للمستخدمين العاديين.",
  },
  {
    id: "rpc",
    title: "الحماية · دوال RPC",
    group: "security",
    icon: "Cpu",
    x: 1300,
    y: 1560,
    rows: [
      { label: "grant_xp", value: "منح/خصم XP" },
      { label: "increment_document_field", value: "ترقيم حقول" },
      { label: "is_admin_user", value: "تحقق مشرف" },
    ],
    desc: "الدوال الثلاث الأهم على الخادم: grant_xp (الوحيدة التي تحرك XP مع قفل 45 ثانية + سقف 500) وincrement_document_field (ترقيم آمن) وis_admin_user (فحص الأهلية في admins). كلها SECURITY DEFINER أي تعمل بصلاحيات الخادم وليس المستخدم.",
  },
  {
    id: "rls",
    title: "الحماية · سياسات RLS",
    group: "security",
    icon: "Lock",
    x: 1600,
    y: 1570,
    rows: [
      { label: "العدد", value: "84 سياسة" },
      { label: "القصد", value: "قفل بالصف/بالعمود" },
    ],
    desc: "قواعد الحماية على مستوى الصفوف: من يقرأ ماذا، ومن يكتب ماذا. مثلاً قراءة بيانات مستخدم آخر ممنوعة إلا للمالك/المشرف، والقراءة المجهولة محصورة بالمحتوى العام (مثل التنقلات والتراخيص).",
  },
  {
    id: "trigger",
    title: "الحماية · مشغل الحقول",
    group: "security",
    icon: "AlertTriangle",
    x: 1850,
    y: 1500,
    rows: [
      { label: "المهمة", value: "حفظ xp/level" },
      { label: "الاستثناء", value: "دوال الخادم فقط" },
    ],
    desc: "مراقب (trigger) يمر على كل تعديل على users/profiles: لو حاول أي شيء تغيير xp/level/role خارج دوال الخادم → يرفض فوراً ('progression_fields_locked'). هكذا نضمن أن النقاط لا تُزوّر من المتصفح أبداً.",
  },
  {
    id: "workflow",
    title: "النشر · مبنى تلقائي",
    group: "deploy",
    icon: "GitBranch",
    x: 2130,
    y: 950,
    rows: [
      { label: "المشغل", value: "رفع إلى master" },
      { label: "خطوات", value: "build + publish" },
    ],
    desc: "عندما نرفع كوداً جديداً، يشتغل سير عمل آلي (GitHub Actions): يبني التطبيق، ويتأكد من النحاة والاختبارات، ثم يجهز ملفات النشر الجاهزة.",
  },
  {
    id: "pages",
    title: "النشر · موقع GitHub Pages",
    group: "deploy",
    icon: "Globe",
    x: 2130,
    y: 1150,
    rows: [
      { label: "الرابط", value: "/OrbitX../" },
      { label: "المصدر", value: "فرع النشر الجاهز" },
    ],
    desc: "الموطن العام للموقع: استضافة مجانية من GitHub تخدم الملفات الجاهزة. المشكلة التاريخية كانت أن 'فرع النشر' لدى المستودع الركود كان عالقاً — حُلّت برفع البناء الجديد على فرع حي (live) وإعادة توجيه النشر إليه.",
  },
];

export const EDGES: MapEdge[] = [
  { from: "orbitx", to: "home", label: "يفتح" },
  { from: "orbitx", to: "schedule" },
  { from: "orbitx", to: "challenges" },
  { from: "orbitx", to: "leaderboard" },
  { from: "orbitx", to: "profile" },
  { from: "orbitx", to: "search" },
  { from: "orbitx", to: "discussions" },
  { from: "orbitx", to: "fleets" },
  { from: "orbitx", to: "awareness" },
  { from: "orbitx", to: "blackholes" },
  { from: "orbitx", to: "admin" },
  { from: "orbitx", to: "support" },
  { from: "home", to: "sessionEngine", label: "يطلق جلسة" },
  { from: "home", to: "streak", label: "يزيدها" },
  { from: "sessionEngine", to: "xpSystem", label: "يحسب + يدعو" },
  { from: "xpSystem", to: "rpc", label: "رحلة RPC" },
  { from: "streak", to: "rpc" },
  { from: "referrals", to: "rpc" },
  { from: "challenges", to: "rpc", label: "جائزة الفائز" },
  { from: "rpc", to: "documents", label: "يكتب XP" },
  { from: "rpc", to: "trigger", label: "تحت حراسة" },
  { from: "rls", to: "documents", label: "يحرره" },
  { from: "admins", to: "rpc", label: "يغذي is_admin_user" },
  { from: "supabase", to: "documents", label: "يستضيف" },
  { from: "supabase", to: "rpc" },
  { from: "supabase", to: "rls" },
  { from: "levelConfig", to: "xpSystem" },
  { from: "logistics", to: "home" },
  { from: "timeChests", to: "rpc" },
  { from: "schedule", to: "documents", label: "يقرأ/يكتب" },
  { from: "leaderboard", to: "documents", label: "يقرأ" },
  { from: "profile", to: "documents", label: "يقرأ" },
  { from: "workflow", to: "pages", label: "ينشر البناء" },
  { from: "pages", to: "supabase", label: "يتصل في العميل" },
];