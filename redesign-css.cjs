const fs = require('fs');
const file = 'src/index.css';
let content = fs.readFileSync(file, 'utf8');

// Change standard radius-3xl and radius-4xl to make them more curvy exactly like iOS/Bento apps
content = content.replace(
  /--radius-3xl: 2rem;/g,
  '--radius-3xl: 1.5rem;'
);
content = content.replace(
  /--radius-4xl: 2\.5rem;/g,
  '--radius-4xl: 2rem;'
);

content = content.replace(
  /border-radius: 9999px/g,
  'border-radius: 9999px'
);

fs.writeFileSync(file, content, 'utf8');
