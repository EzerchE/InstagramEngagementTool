const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const extensionDir = path.join(root, 'extension');

fs.mkdirSync(distDir, { recursive: true });

for (const fileName of ['manifest.json', 'background.js']) {
  fs.copyFileSync(
    path.join(extensionDir, fileName),
    path.join(distDir, fileName),
  );
}

console.log('Extension assets copied to dist/.');
