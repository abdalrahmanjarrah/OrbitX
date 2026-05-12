import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace from function AvatarPreview down to before function App()
code = code.replace(/function AvatarPreview\([\s\S]*?(?=function App\(\) \{)/, '');

// Also remove showShop and shop items references
code = code.replace(/const \[showShop, setShowShop\] = useState\(false\);\n/g, '');

// Remove UI Store buttons
code = code.replace(/\{showShop && \([\s\S]*?onClose=\{.*?setShowShop\(false\).*?\}[\s\S]*?\/>\n\s*\}/g, '');

fs.writeFileSync('src/App.tsx', code);
console.log("Replaced successfully!");
