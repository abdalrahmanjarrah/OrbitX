const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

const blackHoleComponent = `
export function BlackHolesView({ user }: { user: UserData }) {
  const [globalProgress, setGlobalProgress] = useState(0);
  const targetGoal = 1000;
  
  // calculate total focus sessions from all users
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let totalSessions = 0;
        usersSnapshot.forEach(doc => {
          totalSessions += doc.data().totalFocusSessions || 0;
        });
        // Let's say 1 session is 25 minutes = 0.41 hours
        let totalHours = totalSessions * 0.41;
        // Start it high for demo purposes so it looks active
        totalHours += 560; // base demo hours
        setGlobalProgress(Math.floor(totalHours));
      } catch (e) {
        console.error("Failed to fetch black hole progress", e);
      }
    };
    fetchProgress();
  }, []);

  const progressPercent = Math.min((globalProgress / targetGoal) * 100, 100);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in relative z-10 px-4 md:px-0">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-2xl border border-violet-500/30 text-violet-400">
          <Target size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight text-white">تحدي الثقب الأسود</h2>
          <p className="text-indigo-200 mt-1">تحديات جماعية أسبوعية لفك تشفير المعارف الكونية.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 relative p-8 bg-black/60 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
          {/* Animated Black Hole Background */}
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
            <motion.div 
               animate={{ rotate: 360, scale: [1, 1.05, 1] }} 
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="absolute w-[400px] h-[400px] rounded-full"
               style={{
                 background: 'radial-gradient(circle, rgba(0,0,0,1) 10%, rgba(139,92,246,0.3) 40%, rgba(0,0,0,0) 70%)',
                 boxShadow: '0 0 100px 20px rgba(139,92,246,0.2)'
               }}
            />
            <motion.div 
               animate={{ rotate: -360 }} 
               transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
               className="absolute w-[300px] h-[300px] rounded-full border border-violet-500/20 border-dashed"
            />
             <motion.div 
               animate={{ rotate: 360 }} 
               transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
               className="absolute w-[200px] h-[200px] rounded-full border border-fuchsia-500/30 border-dotted"
            />
          </div>
          
          <div className="z-10 text-center flex flex-col items-center">
            <div className="w-24 h-24 mb-6 rounded-full bg-black border-4 border-violet-500/50 shadow-[0_0_50px_rgba(139,92,246,0.8)] flex items-center justify-center relative">
               <span className="text-2xl font-bold text-white relative z-10">{progressPercent.toFixed(1)}%</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 line-clamp-2 leading-snug">
               تحدي هذا الأسبوع: شفرة النجم المفقود
            </h3>
            <p className="text-indigo-200 mb-8 max-w-md">
              يجب على جميع رواد الفضاء في المنصة تجميع 1000 ساعة تركيز هذا الأسبوع معاً لفك تشفير مقالة سرية جديدة في قسم الوعي الكوني.
            </p>
            
            <div className="w-full max-w-md bg-black/50 rounded-full h-4 border border-white/10 overflow-hidden relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: \`\${progressPercent}%\` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)]"
              />
            </div>
            <div className="flex justify-between w-full max-w-md mt-2 text-sm">
               <span className="text-violet-400 font-bold">{globalProgress} ساعة</span>
               <span className="text-gray-500">{targetGoal} ساعة</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-[#0f1123]/80 backdrop-blur-md rounded-3xl border border-white/5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Award size={20} className="text-fuchsia-400" />
              الجائزة المتوقعة
            </h3>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-4">
               <div className="p-2 bg-black/50 rounded-xl">
                  <Lock size={24} className="text-gray-400" />
               </div>
               <div>
                 <h4 className="text-white font-bold mb-1">ملف مشفر (#X-99)</h4>
                 <p className="text-xs text-gray-400 leading-relaxed">
                   يحتوي هذا الملف على حقائق قوية مخفية في طبقات الويب المظلمة. يتطلب تعاون الجميع!
                 </p>
               </div>
            </div>
          </div>
          
          <div className="p-6 bg-[#0f1123]/80 backdrop-blur-md rounded-3xl border border-white/5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Flame size={20} className="text-orange-400" />
              أفضل المساهمين
            </h3>
            <div className="space-y-3">
               {[
                 { name: "أحمد", hours: 12, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=ahmed" },
                 { name: "سارة", hours: 9, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=sara" },
                 { name: "محمد", hours: 8, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=mo" },
               ].map((usr, i) => (
                 <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-gray-500 w-4">{i + 1}</div>
                      <img src={usr.avatar} alt={usr.name} className="w-8 h-8 rounded-full bg-black/50" />
                      <span className="text-sm text-gray-200">{usr.name}</span>
                    </div>
                    <span className="text-xs text-fuchsia-400 font-bold">{usr.hours} س</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

// Insert the component before AwarenessView
appTsx = appTsx.replace('export function AwarenessView', blackHoleComponent + '\nexport function AwarenessView');

// Add navigation item
appTsx = appTsx.replace(
  `activeTab === 'awareness'>('home');`,
  `activeTab === 'awareness' | 'blackholes'>('home');`
);

appTsx = appTsx.replace(
  `            <NavLink className="tour-step-awareness" icon={<Radio size={16} />} label="الوعي الكوني" 
              active={activeTab === 'awareness'} 
              onClick={() => handleTabChange('awareness')}
            />`,
  `            <NavLink className="tour-step-awareness" icon={<Radio size={16} />} label="الوعي الكوني" 
              active={activeTab === 'awareness'} 
              onClick={() => handleTabChange('awareness')}
            />
            <NavLink icon={<Target size={16} />} label="الثقوب السوداء" 
              active={activeTab === 'blackholes'}
              onClick={() => handleTabChange('blackholes')}
            />`
);

appTsx = appTsx.replace(
  `              <NavLink 
                icon={<Radio size={18} />} 
                label="الوعي الكوني" 
                active={activeTab === 'awareness'} 
                onClick={() => handleTabChange('awareness')}
                className="w-full justify-start px-4 py-3 text-base"
              />`,
  `              <NavLink 
                icon={<Radio size={18} />} 
                label="الوعي الكوني" 
                active={activeTab === 'awareness'} 
                onClick={() => handleTabChange('awareness')}
                className="w-full justify-start px-4 py-3 text-base"
              />
              <NavLink 
                icon={<Target size={18} />} 
                label="الثقوب السوداء" 
                active={activeTab === 'blackholes'} 
                onClick={() => handleTabChange('blackholes')}
                className="w-full justify-start px-4 py-3 text-base"
              />`
);

appTsx = appTsx.replace(
  `{activeTab === 'awareness' && <AwarenessView user={user} />}`,
  `{activeTab === 'awareness' && <AwarenessView user={user} />}\n          {activeTab === 'blackholes' && <BlackHolesView user={user} />}`
);

fs.writeFileSync('src/App.tsx', appTsx, 'utf8');
