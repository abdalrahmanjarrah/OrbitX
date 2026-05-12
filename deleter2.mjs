import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace standard avatar in Profile Modal (line 4867 area)
code = code.replace(/<div className="scale-\[0\.6\] origin-left">\s*<AvatarPreview equipped=\{userData\.equippedItems\} \/>\s*<\/div>/, `<div className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-400">
              <img src={userData.photoURL || 'https://www.gravatar.com/avatar/?d=retro'} alt="avatar" className="w-full h-full object-cover" />
            </div>`);

// Replace standard avatar in Current User View (line 3748 area)
code = code.replace(/<div className="hidden sm:block scale-75 origin-right">\s*<AvatarPreview equipped=\{user\.equippedItems\} \/>\s*<\/div>/, `<div className="hidden sm:block w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-400">
              <img src={user.photoURL || 'https://www.gravatar.com/avatar/?d=retro'} alt="avatar" className="w-full h-full object-cover" />
            </div>`);

// Remove store button mapping
code = code.replace(/<button\s*onClick=\{.*?setShowShop\(true\).*?\n.*?className=.*?\n.*?>\s*<Store size=\{18\} \/>\s*المتجر\s*<\/button>/, '');

fs.writeFileSync('src/App.tsx', code);
console.log("Replaced successfully!");
