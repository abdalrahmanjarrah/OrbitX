const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// We are going to apply a "Bento Grid / Split Layout" structure to the Dashboard (HomeView)
// Currently, HomeView has a Welcome Header (2 columns, then 1 column challenge), then "Active Rooms" (3 cols) and "Sidebar: Active Users" (1 col)
// Let's refine the styling to make it feel more "Software/SaaS Bento" but with the Soft Space colors.

// 1. the welcome header:
// from grid-cols-1 lg:grid-cols-3
// to grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 

content = content.replace(
  /<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">/,
  '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">'
);
content = content.replace(
  /<div className="lg:col-span-2 p-8 rounded-\[2\.5rem\] glass relative overflow-hidden group">/,
  '<div className="md:col-span-2 lg:col-span-3 p-8 rounded-3xl glass relative overflow-hidden group flex flex-col justify-center">'
);
content = content.replace(
  /<div className="p-8 rounded-\[2\.5rem\] glass border-indigo-400\/20 flex flex-col justify-between text-right">/,
  '<div className="p-6 rounded-3xl glass border-indigo-400/20 flex flex-col justify-between text-right">'
);

// 2. The main grid structure:
content = content.replace(
  /<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">/,
  '<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 max-w-7xl mx-auto w-full">'
);
content = content.replace(
  /<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">/,
  '<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">'
);

// 3. Roundings adjustments to make it uniform Bento style:
content = content.replace(/rounded-\[2\.5rem\]/g, 'rounded-3xl');

// 4. Update the Nav styling to be a floating pill instead of full top bar
content = content.replace(
  /<nav className="z-50 flex items-center justify-between px-8 py-4 glass border-b border-white\/5 sticky top-0">/,
  '<nav className="z-50 flex items-center justify-between px-6 py-3 max-w-5xl mx-auto glass rounded-full border border-white/5 sticky top-4 mb-8 mt-2 shadow-2xl shadow-indigo-900/20">'
);
content = content.replace(/px-8 py-4 glass border-b/g, 'px-8 py-4 glass rounded-full border');

// 5. Card style:
content = content.replace(
  /className="aspect-square rounded-2xl overflow-hidden/g,
  'className="aspect-square rounded-3xl overflow-hidden'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Layout redesigned successfully.');
