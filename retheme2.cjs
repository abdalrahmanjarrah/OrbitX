const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  { from: /bg-black\/80/g, to: 'bg-slate-900/30' },
  { from: /bg-black\/60/g, to: 'bg-slate-900/20' },
  { from: /bg-black\/50/g, to: 'bg-slate-900/20' },
  { from: /bg-black/g, to: 'bg-white' },
  { from: /text-gray-100/g, to: 'text-slate-800' }
];

replacements.forEach(r => content = content.replace(r.from, r.to));
fs.writeFileSync(file, content, 'utf8');
