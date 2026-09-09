import React from "react";
import { Zap, Swords, Trophy } from "lucide-react";

export const HowChallengesWork: React.FC = () => {
  return (
    <div className="p-4 rounded-2xl border border-white/5 bg-space-dark/30 text-center max-w-2xl mx-auto">
      <p className="text-xs text-gray-400 leading-relaxed flex flex-col items-center gap-2">
        <span className="inline-flex items-center gap-1 text-rose-300 font-bold">
          <Zap size={14} className="text-rose-400" />
          معلومة سريعة
        </span>
        أرسل طلب نزال لأي زميل بمدة تحددها أنت، وعندما يقبله، يدخل الطرفان الحلبة: كل دقيقة تركيز تجمعها بأي محطة تتحول لنقطة، والأكثر تركيزاً عند انتهاء المدة يرفع راية النزال ويحصد الجوائز 🏆.
      </p>
    </div>
  );
};

