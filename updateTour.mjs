import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetTour = /const getTourSteps = \(isMobile: boolean\): any\[\] => \{[\s\S]*?\];\n\s*\};\n/m;
const replacementTour = `const getTourSteps = (isMobile: boolean): any[] => {
  const commonSteps = [
    {
      target: '.tour-step-profile',
      content: 'هذا ملفك الشخصي. يمكنك تعديل معلوماتك ومتابعة تقدمك وإظهار الأوسمة التي حصلت عليها.',
    },
    {
      target: '.tour-step-stats',
      content: 'هنا يمكنك متابعة مستوى الحماس (القلوب) التي تكسبها بالتركيز. حافظ عليها من خلال الاستمرار وعدم الهروب من المهام!',
    },
    {
      target: '.tour-step-notifications',
      content: 'تابع كل الإشعارات المهمة من أصدقائك، سواء كانت طلبات صداقة، تحديات، أو رسائل.',
    }
  ];

  if (isMobile) {
    return [
      {
        target: 'body',
        content: 'مرحباً بك في أوربت! هذه الجولة ستشرح لك أقسام التطبيق بحسب طلبك. تذكر أنه يمكنك إيقاف الجولة أو تخطيها في أي وقت من زر "تخطي".',
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '.tour-step-menu',
        content: 'من هذه القائمة الجانبية يمكنك التنقل بين كل الأقسام بكل سهولة (بحيث يمكنك الوصول للغرف الدراسية، الشات العام، المتصدرين، والنقاشات...).',
        disableBeacon: true,
      },
      ...commonSteps
    ];
  }

  return [
    {
      target: 'body',
      content: 'مرحباً بك في أوربت! هذه الجولة ستشرح لك أقسام التطبيق بالكامل. تذكر أنه يمكنك إيقاف الجولة في أي وقت بالضغط على زر "تخطي".',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-step-home',
      content: 'لوحة التحكم والمحطة الفضائية الخاصة بك. من هنا يمكنك استكشاف الغرف الدراسية المختلفة وبدء رحلة التركيز.',
      disableBeacon: true,
    },
    {
      target: '.tour-step-chat',
      content: 'الشات العام: تواصل مع جميع رواد الفضاء المتواجدين حالياً وشارك أفكارك وتحدياتك مع المجتمع.',
    },
    {
      target: '.tour-step-discussions',
      content: 'ساحة النقاش: اطرح أسئلتك الأكاديمية وشارك في نقاشات هادفة للتبادل العلمي.',
    },
    {
      target: '.tour-step-schedule',
      content: 'جدول المهام: نظم وقتك وموادك الدراسية هنا لتتمكن من إدارتها بفاعلية.',
    },
    {
      target: '.tour-step-leaderboard',
      content: 'لوحة المتصدرين: هنا يظهر أمهر الرواد وأكثرهم إنجازاً! اجتهد لتصل إلى المركز الأول.',
    },
    {
      target: '.tour-step-awareness',
      content: 'الوعي الكوني: قسم خاص لحل الألغاز وفك الشيفرات وكسب نقاط خبرة إضافية.',
    },
    ...commonSteps
  ];
};
`;

code = code.replace(targetTour, replacementTour);
fs.writeFileSync('src/App.tsx', code);
