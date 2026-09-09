export interface CompletionMessageDetail {
  title: string;
  quote: string;
  badge: string;
}

export const COSMIC_COMPLETION_MESSAGES: CompletionMessageDetail[] = [
  {
    title: "أحسنت! أنهيت الجولة 🚀",
    quote: "اعتبر هذه الجولة إنجازاً له عنوان، موضوعك وصلك أشواطاً مع كل دقيقة تركيز. النقاط نزلت على حسابك — كمّل على هذا المنوال.",
    badge: "جولة منجزة"
  },
  {
    title: "تركيز رائع! 🌟",
    quote: "قعدت مع نفسك ودرست بتركيز حقيقي. الـ XP اللي كسبته هي متراكمة مع كل دقيقة قضيتها، وهيك بتتقدم مستوى ورا مستوى.",
    badge: "جلسة ناجحة"
  },
  {
    title: "جولة مفيدة، نقاطك وصلت 🎯",
    quote: "افتتحت شوطاً معرفياً جديداً وعدّيته للنهاية. نقاط الخبرة تضاف كل ما درست بتركيز، وما بتضاع إلها إنك غمزت.",
    badge: "إنجاز تسجيلي"
  },
  {
    title: "خلّصتها بنجاح ✅",
    quote: "المدة اللي خططت لها انتهت وأنت بتركيز كامل. تذكر: كل دقيقة تركيز = نقطة XP حقيقية على حسابك.",
    badge: "التزام ممتاز"
  },
  {
    title: "جولة خارقة! ⚡",
    quote: "صرحت بجولتك للمسرح وتابعتها بالتزام حتى النهاية. هيك الجداول والتعقب بيصيروا أحلى وأشجع.",
    badge: "أداء ثابت"
  }
];

export function getRandomCosmicMessage(durationMinutes: number): CompletionMessageDetail {
  const index = Math.floor((durationMinutes + Date.now()) % COSMIC_COMPLETION_MESSAGES.length);
  return COSMIC_COMPLETION_MESSAGES[index];
}