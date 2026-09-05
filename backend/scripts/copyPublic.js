const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../public');
const dest = path.resolve(__dirname, '../dist/public');

try {
  if (fs.existsSync(src)) {
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
    console.log('[CopyPublic] Successfully copied backend/public into backend/dist/public!');
  } else {
    console.warn('[CopyPublic Warning] backend/public directory not found.');
  }
} catch (err) {
  console.error('[CopyPublic Error]:', err.message);
}
