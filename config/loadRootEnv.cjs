const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const MONOREPO_NAME = 'presenter-monorepo';

function findMonorepoRoot(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    const pkgFile = path.join(dir, 'package.json');
    if (fs.existsSync(pkgFile)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
        if (pkg.name === MONOREPO_NAME) return dir;
      } catch {
        /* ignore malformed package.json */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Load repo-root `.env` starting search from anchorDir (usually __dirname). */
function loadRootEnv(anchorDir = process.cwd()) {
  const root = findMonorepoRoot(anchorDir) || process.cwd();
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) {
    console.warn(`[env] No .env at ${envPath}`);
    return null;
  }
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.warn(`[env] Failed to load ${envPath}:`, result.error.message);
    return null;
  }
  console.log(`[env] Loaded ${envPath}`);
  return envPath;
}

module.exports = { loadRootEnv, findMonorepoRoot };
