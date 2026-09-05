const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Building Full-Stack Bundle for Production ===');

const rootDir = path.resolve(__dirname, '../..');
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');
const backendPublicDir = path.join(backendDir, 'public');

try {
  // 1. Build Frontend if frontend folder exists
  if (fs.existsSync(frontendDir)) {
    console.log('[Build] Installing frontend dependencies & building Vite bundle...');
    execSync('npm ci', { cwd: frontendDir, stdio: 'inherit' });
    execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
  }

  // 2. Build Backend TypeScript
  console.log('[Build] Compiling backend TypeScript...');
  execSync('npx tsc', { cwd: backendDir, stdio: 'inherit' });

  // 3. Copy Frontend dist output into Backend public folder
  const frontendDist = path.join(frontendDir, 'dist');
  if (fs.existsSync(frontendDist)) {
    console.log('[Build] Copying frontend static bundle to backend/public...');
    fs.rmSync(backendPublicDir, { recursive: true, force: true });
    fs.mkdirSync(backendPublicDir, { recursive: true });
    fs.cpSync(frontendDist, backendPublicDir, { recursive: true });
    console.log('[Build] Frontend static bundle successfully copied into backend/public!');
  }

  console.log('=== Full-Stack Production Build Finished Successfully! ===');
} catch (err) {
  console.error('[Build Error]:', err.message);
  process.exit(1);
}
