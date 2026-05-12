const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(/coins\?: number;\n/g, '');
code = code.replace(/inventory\?: any\[\];\n/g, '');
code = code.replace(/equippedItems\?: any;\n/g, '');
code = code.replace(/coins: userData\.coins \|\| 0,\n/g, '');
code = code.replace(/inventory: userData\.inventory \|\| \[\],\n/g, '');
code = code.replace(/equippedItems: userData\.equippedItems \|\| \{\}\n/g, '');
code = code.replace(/const coinsEarned = Math\.floor\(regularXp \/ 10\);\n/g, '');
code = code.replace(/coins: increment\(coinsEarned\),\n/g, '');
code = code.replace(/<div className="text-\[10px\] text-gray-400">🪙 \{u\.coins \|\| 0\} \| 💖 \{u\.hearts \|\| 0\} \| 🚀 ج\{u\.level\} \(\{u\.xp\}\)<\/div>/g, '<div className="text-[10px] text-gray-400">💖 {u.hearts || 0} | 🚀 ج{u.level} ({u.xp})</div>');

code = code.replace(/<div className="space-y-2">\s*<label className="text-sm font-bold text-gray-400 block text-right">الكوينز \(🪙\)<\/label>\s*<input\s*type="number"\s*value=\{editingUser.coins \|\| 0\}\s*onChange=\{\(e\) => setEditingUser\(\{ \.\.\.editingUser, coins: parseInt\(e.target.value\) \|\| 0 \}\)\}\s*className="w-full bg-white\/5 border border-white\/10 rounded-xl px-4 py-3 text-white text-right focus:outline-none focus:border-indigo-500"\s*dir="rtl"\s*\/>\s*<\/div>/g, '');
code = code.replace(/coins: editingUser.coins,\n/g, '');

fs.writeFileSync('src/App.tsx', code);
