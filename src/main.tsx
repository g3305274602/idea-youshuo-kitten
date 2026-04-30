import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Identity } from 'spacetimedb';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection, ErrorContext } from './module_bindings/index.ts';

/** 線上建置若未設 VITE_SPACETIMEDB_*，勿回落 localhost（會導致瀏覽器連 ws://localhost）。 */
const HOST =
  import.meta.env.VITE_SPACETIMEDB_HOST ??
  (import.meta.env.DEV ? 'ws://localhost:3000' : 'wss://maincloud.spacetimedb.com');
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? 'idea-jd2zx';
const TOKEN_KEY = `${HOST}/${DB_NAME}/auth_token`;
const RETRY_ONCE_KEY = `${HOST}/${DB_NAME}/connect_retry_once`;

const onConnect = (conn: DbConnection, identity: Identity, token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  sessionStorage.removeItem(RETRY_ONCE_KEY);
  console.log(
    'Connected to SpacetimeDB with identity:',
    identity.toHexString()
  );
};

const onDisconnect = () => {
  console.log('Disconnected from SpacetimeDB');
};

const onConnectError = (_ctx: ErrorContext, err: unknown) => {
  const hasToken = Boolean(localStorage.getItem(TOKEN_KEY));
  const hasRetried = sessionStorage.getItem(RETRY_ONCE_KEY) === '1';
  if (hasToken && !hasRetried) {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.setItem(RETRY_ONCE_KEY, '1');
    console.warn(
      `[SpacetimeDB] 首次連線失敗，已清除舊 token（${TOKEN_KEY}）並自動重試一次。`
    );
    window.location.reload();
    return;
  }
  console.error('Error connecting to SpacetimeDB:', err);
  console.error(
    `[SpacetimeDB] 連線失敗排查：資料庫「${DB_NAME}」、主機「${HOST}」。請確認已在該 server 執行過「spacetime publish」（且 spacetime.json 的 database 與 VITE_SPACETIMEDB_DB_NAME 一致）；若曾換過資料庫名稱，請清除 localStorage 鍵「${TOKEN_KEY}」後重新整理。`
  );
};

const connectionBuilder = DbConnection.builder()
  .withUri(HOST)
  .withDatabaseName(DB_NAME)
  .withToken(localStorage.getItem(TOKEN_KEY) || undefined)
  .onConnect(onConnect)
  .onDisconnect(onDisconnect)
  .onConnectError(onConnectError);

/** 連線成功後若表列二進位與 `module_bindings` 不符，SDK 常拋 `RangeError: Tried to read … byte(s) … remain`。 */
window.addEventListener('unhandledrejection', (event) => {
  const r = event.reason;
  const msg = r instanceof Error ? r.message : typeof r === 'string' ? r : String(r);
  if (msg.includes('Tried to read') && msg.includes('byte') && msg.includes('remain')) {
    console.error(
      `[SpacetimeDB] 訂閱／列資料解析失敗（多為「雲端已發佈模組」與「前端 src/module_bindings」schema 不一致）。請在專案根依序執行：npm run spacetime:generate → npm run spacetime:publish，再硬重新整理 (Ctrl+Shift+R)。主機「${HOST}」資料庫「${DB_NAME}」。另請確認本機 spacetime CLI 與 npm 套件 spacetimedb 主版本相容。`
    );
  }
});

/* 不使用 StrictMode：開發模式下會雙掛載子樹，易與 SpacetimeDB 訂閱／ConnectionId 競態，出現
 * SubscriptionError unknown querySetId / Client not found。 */
createRoot(document.getElementById('root')!).render(
  <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
    <App />
  </SpacetimeDBProvider>
);
