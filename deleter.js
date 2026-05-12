const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace from function AvatarPreview down to before function App()
code = code.replace(/function AvatarPreview\([\s\S]*?(?=function App\(\) \{)/, '');

// Also remove showShop and shop items references
code = code.replace(/const \[showShop, setShowShop\] = useState\(false\);\n/, '');

// Remove all equippedItems from initialization
code = code.replace(/coins: 500, \/\/ Give them some starting coins\n\s*inventory: \[.*\],\n\s*equippedItems: \{.*\}/, '');

fs.writeFileSync('src/App.tsx', code);
console.log("Replaced successfully!");
