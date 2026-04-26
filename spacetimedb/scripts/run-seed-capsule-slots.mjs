/**
 * 依序呼叫 `dev_seed_secret_capsule_posts`（slot 0..299），避免 maincloud 單次 reducer 負載過大。
 * 在倉庫根目錄執行：node spacetimedb/scripts/run-seed-capsule-slots.mjs
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

for (let slot = 0; slot < 300; slot++) {
  console.error(`[seed-capsules] slot ${slot}/299`);
  execSync(`spacetime call -y idea-jd2zx dev_seed_secret_capsule_posts ${slot}`, {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
  });
}
