import { spawnSync } from 'node:child_process';
const r = spawnSync(process.execPath, ['--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--local', '--persist-to', '.wrangler/state', '--config', 'wrangler.local.json'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
