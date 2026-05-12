import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const newContent = `
      {/* --- NEW IDEAS SECTIONS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto w-full mb-4">
        
        {/* Idea 1: Space Academy */}
        <motion.div 
          variants={bentoItem}
          whileHover={bentoHover}
          className="p-6 rounded-3xl glass border-indigo-400/20 relative overflow-hidden group cursor-pointer transition-all"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <BookOpen size={80} />
          </div>
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 shadow-inner">
                <BookOpen size={20} />
              </div>
              <h3 className="font-bold text-lg text-white">أكاديمية الفضاء</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4 line-clamp-2 leading-relaxed">
              اقرأ مقال اليوم: "كيف تتغلب على التشتت في العالم الرقمي؟ استراتيجيات رواد الفضاء لإدارة الوقت."
            </p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full flex items-center gap-1"><BookOpen size={12}/> ١٢٠ قراءة</span>
              <button className="text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 px-4 py-1.5 rounded-xl text-sm font-bold transition-colors shadow-[0_0_10px_rgba(99,102,241,0.2)]">اقرأ الآن</button>
            </div>
          </div>
        </motion.div>

        {/* Idea 2: Daily Missions */}
        <motion.div 
          variants={bentoItem}
          whileHover={bentoHover}
          className="p-6 rounded-3xl glass border-emerald-400/20 relative overflow-hidden group cursor-pointer transition-all"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <Target size={80} className="text-emerald-500" />
          </div>
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 shadow-inner">
                <Target size={20} />
              </div>
              <h3 className="font-bold text-lg text-white">المهام اليومية</h3>
            </div>
            
            <div className="space-y-3 mb-4 text-sm flex-1">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                  <CheckCircle size={12} className="text-emerald-400" />
                </div>
                <span className="text-gray-300">أكمل جلسة تركيز واحدة</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"></div>
                <span className="text-gray-500">انضم إلى نقاش فضائي</span>
              </div>
            </div>
            
            <div className="mt-auto">
              <div className="w-full bg-black/40 shadow-inner h-2.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-green-400 h-full w-1/2 relative">
                   <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500">مكتمل ٥٠٪</span>
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]"><Award size={14}/> +١٥٠ XP</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Idea 3: The Observatory */}
        <motion.div 
          variants={bentoItem}
          whileHover={bentoHover}
          className="p-6 rounded-3xl glass border-fuchsia-400/20 relative overflow-hidden group cursor-pointer transition-all"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <Telescope size={80} className="text-fuchsia-500" />
          </div>
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-fuchsia-500/20 text-fuchsia-400 shadow-inner">
                  <Telescope size={20} />
                </div>
                <h3 className="font-bold text-lg text-white">المرصد الفلكي</h3>
              </div>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-fuchsia-500 shadow-[0_0_8px_#d946ef]"></span>
              </span>
            </div>
            <p className="text-sm font-bold text-white mb-1 tracking-wide">
              تحديث النظام المداري v2.0
            </p>
            <p className="text-xs text-gray-400 mb-6 line-clamp-2 leading-relaxed">
              تم تحسين استقرار المحطات وإضافة مهام يومية لاكتساب المزيد من نقاط الخبرة وارتقاء مستواك الفضائي.
            </p>
            <button className="mt-auto w-full text-center text-fuchsia-300 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-[0_0_10px_rgba(217,70,239,0.2)]">
              عرض التفاصيل
            </button>
          </div>
        </motion.div>
      </div>

      {/* Main Grid */}`;

content = content.replace('{/* Main Grid */}', newContent);

fs.writeFileSync('src/App.tsx', content, 'utf8');
console.log('Injected new sections!');
