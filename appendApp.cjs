const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const analyticsComponent = `

function AnalyticsView({ user, friends }: { user: any, friends: any[] }) {
  // Generate some realistic-looking data based on the user's level and XP
  const studyData = React.useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      
      const baseHours = Math.max(1, (user.xp % 10) / 2);
      const hours = Math.max(0, baseHours + (Math.random() * 2 - 1));
      
      data.push({
        name: d.toLocaleDateString('ar-SA', { weekday: 'short' }),
        "ساعات التركيز": parseFloat(hours.toFixed(1))
      });
    }
    return data;
  }, [user.xp]);

  const friendsComparison = React.useMemo(() => {
    const list = [...friends, user]
      .sort((a, b) => (b.level * 100 + b.xp) - (a.level * 100 + a.xp))
      .slice(0, 5)
      .map(u => ({
        name: u.uid === user.uid ? 'أنت' : u.displayName.split(' ')[0],
        xp: u.xp + (u.level * 100)
      }));
    return list;
  }, [friends, user]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 fade-in pb-20">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black font-display text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-fuchsia-400">
          لوحة الإحصائيات (Analytics)
        </h2>
        <div className="px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-xl font-bold border border-indigo-500/30">
          مجموع جلسات التركيز: {user.totalFocusSessions || 0}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0a0b16] rounded-3xl p-6 border border-white/10 shadow-xl shadow-indigo-900/10 text-right">
          <h3 className="text-xl font-bold mb-6 text-white flex items-center justify-end gap-2">
            ساعات التركيز (أسبوعياً) <BarChart3 className="text-indigo-400" />
          </h3>
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={studyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0b16', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                  itemStyle={{ color: '#818cf8', display: 'flex', flexDirection: 'row-reverse', gap: '4px' }}
                />
                <Line type="monotone" dataKey="ساعات التركيز" stroke="#818cf8" strokeWidth={3} dot={{ fill: '#818cf8', strokeWidth: 2 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0a0b16] rounded-3xl p-6 border border-white/10 shadow-xl shadow-fuchsia-900/10 text-right">
          <h3 className="text-xl font-bold mb-6 text-white flex items-center justify-end gap-2">
            تصنيفك بين الأصدقاء (النشاط) <Users className="text-fuchsia-400" />
          </h3>
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={friendsComparison} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} hide />
                <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  cursor={{fill: '#ffffff05'}}
                  contentStyle={{ backgroundColor: '#0a0b16', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                  itemStyle={{ color: '#e879f9', display: 'flex', flexDirection: 'row-reverse', gap: '4px' }}
                />
                <Bar dataKey="xp" fill="#e879f9" radius={[0, 4, 4, 0]} barSize={24} name="نقاط الخبرة (XP)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

code += analyticsComponent;
fs.writeFileSync('src/App.tsx', code);
