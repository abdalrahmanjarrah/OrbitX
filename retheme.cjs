const fs = require('fs');

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  // Backgrounds
  { from: /bg-\[\#050510\]/g, to: 'bg-white' },
  { from: /bg-\[\#0a0a1a\]/g, to: 'bg-slate-50' },
  { from: /bg-\[\#1a1a2e\]/g, to: 'bg-white' },
  { from: /bg-space-dark/g, to: 'bg-slate-50' },
  { from: /bg-black\/40/g, to: 'bg-slate-100/80 shadow-inner' },
  { from: /bg-black\/20/g, to: 'bg-slate-50/80' },
  
  // Specific glass and borders
  { from: /bg-white\/5/g, to: 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]' },
  { from: /bg-white\/10/g, to: 'bg-slate-100' },
  { from: /border-white\/5/g, to: 'border-slate-100' },
  { from: /border-white\/10/g, to: 'border-slate-200' },
  { from: /border-white\/20/g, to: 'border-slate-200' },
  
  // Text colors
  { from: /text-white/g, to: 'text-slate-800' },
  { from: /text-white\/60/g, to: 'text-slate-500' },
  { from: /text-gray-400/g, to: 'text-slate-500' },
  { from: /text-gray-300/g, to: 'text-slate-600' },
  { from: /text-gray-500/g, to: 'text-slate-400' },
  { from: /text-gray-200/g, to: 'text-slate-700' },
  
  // Accents (Purple -> Emerald/Teal for Zen Nature)
  { from: /purple-500/g, to: 'teal-500' },
  { from: /purple-400/g, to: 'teal-600' }, 
  { from: /purple-600/g, to: 'teal-600' },
  { from: /purple-700/g, to: 'teal-700' },
  { from: /shadow-purple-900\/20/g, to: 'shadow-teal-900\/5' },
  { from: /shadow-purple-600\/20/g, to: 'shadow-teal-500\/10' },
  { from: /bg-purple-500\/20/g, to: 'bg-teal-50' },
  { from: /bg-purple-500\/10/g, to: 'bg-teal-50' },
  { from: /ring-purple-500\/50/g, to: 'ring-teal-500\/30' },
  { from: /from-purple-600/g, to: 'from-teal-500' },
  { from: /to-blue-600/g, to: 'to-emerald-500' },
  { from: /from-purple-500/g, to: 'from-teal-400' },
  { from: /to-cyan-400/g, to: 'to-emerald-400' },
  { from: /to-cyan-500/g, to: 'to-emerald-400' },
  { from: /selection:bg-purple-500\/30/g, to: 'selection:bg-teal-500\/20' },
  
  // Shadows to make it Bento-like
  { from: /shadow-2xl/g, to: 'shadow-[0_8px_30px_rgb(0,0,0,0.04)]' },
  { from: /shadow-xl/g, to: 'shadow-[0_4px_20px_rgb(0,0,0,0.03)]' },
  { from: /shadow-lg/g, to: 'shadow-sm' },
  
  // Glass effects mapping
  { from: /backdrop-blur-xl/g, to: 'backdrop-blur-2xl' },
  { from: /backdrop-blur-md/g, to: 'backdrop-blur-xl bg-white/80' },
  { from: /backdrop-blur-sm/g, to: 'backdrop-blur-lg bg-white/60' },

  // Remove components
  { from: /<StarBackground \/>/g, to: '' },
  { from: /<MeteorEffect[^>]*\/>/g, to: '' },
  { from: /<MeteorEffect \/>/g, to: '' },
  { from: /import StarBackground from '\.\/components\/StarBackground';/g, to: '' },
  { from: /import MeteorEffect from '\.\/components\/MeteorEffect';/g, to: '' }
];

replacements.forEach(r => {
  content = content.replace(r.from, r.to);
});

fs.writeFileSync(file, content, 'utf8');
console.log('App.tsx rethemed successfully.');
