import { readFileSync, writeFileSync } from 'node:fs';
import { formatDemoSeedUsersMarkdown } from '../src/demo_seed_users.ts';

const memPath = new URL('../../memory/2026-04-19.md', import.meta.url);
const full = readFileSync(memPath, 'utf8');
const marker = '\n## Demo 種子帳號';
const j = full.indexOf(marker);
const head = j === -1 ? full : full.slice(0, j);

const sec = `
## Demo 種子帳號 \`dev_seed_demo_users\`（v3）

- **Reducer**：\`dev_seed_demo_users\`（無參數）。\`module_migration_done\` 標記 \`dev_seed_demo_users_v3\` 寫入後僅會整批執行一次；信箱為 \`...@inbox.volta.test\`（\`.test\` 保留網域），並寫入 \`displayName\`／\`gender\`／\`ageYears\`／\`profileNote\`。首次跑 v3 會刪除舊版 \`seed.user.*@demo.youshuo.local\` 種子列再寫入。
- **密碼**：每位帳號不同，由 \`demoSeedPlainPassword(index)\` 決定（≥6 字元）；寫入 \`account_secret\` 時為 v6 hash，下表為**明文**僅供本機測試。
- **清單重產**（與程式碼單一來源同步）：在倉庫根目錄執行 \`node --experimental-strip-types spacetimedb/scripts/fix-memory-seed-utf8.mts\`（本腳本會覆寫本節與表格）。
- **為何資料庫沒有資料**：種子**不會自動執行**；雲端須先 **發佈**含 \`dev_seed_demo_users\` 的模組，否則 CLI 會回報 \`No such reducer\`。
- **終端**：先 \`npm run spacetime:publish\`（本機則 \`npm run spacetime:publish:local\`），再 \`spacetime call -y idea-jd2zx dev_seed_demo_users\` 或 \`npm run spacetime:seed-demo\`。本機庫名若非 \`idea-jd2zx\` 請改第一參數，並視需要加 \`-s local\`。
- **前端為何看不到別人暱稱**：\`account_profile\` 目前僅訂閱「自己的一列」；種子帳的暱稱在**該列登入後**個人資料或後台查表可見；廣場若只顯示快照裡的信箱，不會自動 JOIN 他人 profile。

### 帳號列表（信箱／暱稱／密碼）

${formatDemoSeedUsersMarkdown()}
`;

writeFileSync(memPath, head + sec, 'utf8');
