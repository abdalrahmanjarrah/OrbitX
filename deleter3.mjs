import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// remove coins from initialization
code = code.replace(/coins: 500,\n\s*/g, '');

// remove showShop modal reference if it exists
code = code.replace(/\{showShop && \([\s\S]*?onClose=\{.*?setShowShop\(false\).*?\}[\s\S]*?\/>\s*\}/g, '');

// remove coins UI in dashboard
code = code.replace(/<button className="flex items-center gap-2 bg-gradient-to-r from-yellow-500\/20 to-orange-500\/20 text-yellow-500 px-4 py-2 rounded-xl font-bold hover:scale-105 transition-transform" onClick=\{.*?setShowShop.*?\}>\s*<Store size=\{18\} \/>\s*\{userData\.coins\}\s*<\/button>/g, '');

code = code.replace(/<div className="flex items-center gap-2 text-yellow-500 font-bold">\s*<Store size=\{16\} \/>\s*\{user\.coins\}\s*<\/div>/g, '');

// Any lingering showShop
code = code.replace(/\{showShop && \([\s\S]*?<\/ShopModal>\s*\}/g, '');
code = code.replace(/onClick=\{.*?setShowShop\(true\).*?\}/g, '');

fs.writeFileSync('src/App.tsx', code);
console.log("Replaced successfully!");
