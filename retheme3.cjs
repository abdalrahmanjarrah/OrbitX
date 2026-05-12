const fs = require('fs');

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  // Backgrounds reverting from Light to Soft Dark Space
  { from: /bg-white/g, to: 'bg-[#0a0b16]' },
  { from: /bg-slate-50/g, to: 'bg-space-dark' }, // maps to var(--color-space-dark) which is #0a0b16
  { from: /bg-slate-100/g, to: 'bg-white/5' },
  { from: /bg-slate-200/g, to: 'bg-white/10' },
  { from: /bg-slate-900\/20/g, to: 'bg-black/60' },
  { from: /bg-slate-900\/30/g, to: 'bg-black/80' },
  
  // Specific glass and borders replacing light theme things
  { from: /border-slate-100/g, to: 'border-white/5' },
  { from: /border-slate-200/g, to: 'border-white/10' },
  { from: /border-slate-300/g, to: 'border-white/20' },
  
  // Text colors
  { from: /text-slate-800/g, to: 'text-white' },
  { from: /text-slate-700/g, to: 'text-gray-200' },
  { from: /text-slate-600/g, to: 'text-gray-300' },
  { from: /text-slate-500/g, to: 'text-gray-400' },
  { from: /text-slate-400/g, to: 'text-gray-500' },
  
  // Accents (Teal/Emerald -> Soft Space Indigo/Pink)
  { from: /bg-teal-50/g, to: 'bg-indigo-500/20' },
  { from: /teal-700/g, to: 'indigo-700' },
  { from: /teal-600/g, to: 'indigo-500' }, 
  { from: /teal-500/g, to: 'indigo-400' },
  { from: /teal-400/g, to: 'indigo-400' },
  
  { from: /emerald-500/g, to: 'fuchsia-400' },
  { from: /emerald-400/g, to: 'fuchsia-400' },
  
  // Gradients and rings updates
  { from: /from-teal-500/g, to: 'from-indigo-500' },
  { from: /to-emerald-500/g, to: 'to-fuchsia-500' },
  { from: /from-teal-400/g, to: 'from-indigo-400' },
  { from: /to-emerald-400/g, to: 'to-fuchsia-400' },
  { from: /selection:bg-teal-500\/20/g, to: 'selection:bg-fuchsia-500/30' },
  { from: /ring-teal-500\/30/g, to: 'ring-indigo-500/50' },
  
  // Shadows to make it dreamy
  { from: /shadow-teal-900\/5/g, to: 'shadow-indigo-900/40' },
  { from: /shadow-teal-500\/10/g, to: 'shadow-fuchsia-500/20' },
  { from: /shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\]/g, to: 'shadow-2xl shadow-indigo-900/20' },
  { from: /shadow-\[0_4px_20px_rgb\(0,0,0,0\.03\)\]/g, to: 'shadow-xl shadow-fuchsia-900/10' },
  { from: /shadow-\[0_2px_10px_rgba\(0,0,0,0\.02\)\]/g, to: 'shadow-lg shadow-indigo-900/10' },

  // Glass effects mapping
  { from: /backdrop-blur-2xl/g, to: 'backdrop-blur-xl' },
  { from: /backdrop-blur-xl bg-white\/80/g, to: 'backdrop-blur-md bg-white/5' },
  { from: /backdrop-blur-lg bg-white\/60/g, to: 'backdrop-blur-sm bg-white/5' }
];

replacements.forEach(r => {
  content = content.replace(r.from, r.to);
});

// Since we removed StarBackground, let's inject it back
// find imports:
if (!content.includes("import StarBackground")) {
  content = content.replace(
    "import { motion, AnimatePresence } from 'framer-motion';",
    "import { motion, AnimatePresence } from 'framer-motion';\nimport StarBackground from './components/StarBackground';"
  );
}

// Re-inject StarBackground into the main layout wrappers
// We can find <div className="min-h-screen relative overflow-x-hidden selection:bg-fuchsia-500/30"> (LandingPage)
// and <div className="min-h-screen relative flex flex-col" dir="rtl"> (StudyRoomView)
// and <div className="min-h-screen relative flex flex-col overflow-hidden" dir="rtl"> (Dashboard)
content = content.replace(
  /<div className="atmosphere-bg" \/>/g,
  '<StarBackground />\n      <div className="atmosphere-bg" />'
);

fs.writeFileSync(file, content, 'utf8');
console.log('App.tsx Soft Space rethemed successfully.');
