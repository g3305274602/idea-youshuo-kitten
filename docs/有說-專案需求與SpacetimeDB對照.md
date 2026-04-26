# 「有說」專案需求與 SpacetimeDB 對照

本文將舊版 youshuo（MongoDB + Express + JWT + REST）中的產品能力，對照到本倉庫根目錄（SpacetimeDB TypeScript 模組 + React 客戶端）的遷移方向。

## 1. 產品定位（來源專案）

- **名稱**：有說（跨時空排程信件）。
- **核心流程**：使用者以信箱註冊／登入，撰寫給特定收件人的內容，設定「未來開啟時間」；在開啟時間前內容對收件方隱藏（模糊／鎖定），時間到後視為已解封（`isDue`）。
- **信箱維度**：收件匣（別人寄給我或寄給自己）、已寄出（我寄出的）、撰寫新信。
- **已寄出未解封**：可編輯（收件人、內容、開啟時間、`isWaitListVisible`）、可刪除。
- **即時感**：前端以輪詢更新信箱列表，並偵測「剛解封」以側欄播報（Mongo 版行為；SpacetimeDB 版可改為訂閱推送，無需長輪詢）。

## 2. Mongo 版資料模型（來源 `server.ts`）

| 實體 | 欄位（語意） |
|------|----------------|
| User | `email`（唯一）、`password`（bcrypt） |
| Message | `senderId`、`senderEmail`、`recipientEmail`、`content`、`scheduledAt`、`isWaitListVisible`、`revealedAt`（可選）、`createdAt` |

**衍生規則（API 層）**：`isDue` 由 `scheduledAt` 與伺服器當前時間比較得出；列表與詳情依角色與是否到期過濾內文可見性。

## 3. 本倉庫現狀（SpacetimeDB Quickstart）

- 模組：`spacetimedb/src/index.ts` — `user`（`identity`、`name`、`online`）與 `message`（`sender`、`sent`、`text`），為**即時聊天示範**，與「排程信件」資料模型不同。
- 前端：`src/App.tsx` 使用 `useSpacetimeDB` / `useTable` / `useReducer`，連線後以 `Identity` 識別使用者，無信箱密碼流程。

## 4. SpacetimeDB 版建議資料模型（取代 Mongo）

設計重點：**以 `ctx.sender`（Identity）代表登入使用者**，信箱可作為「可讀欄位」或帳號綁定鍵，密碼驗證需另行設計（見第 5 節）。

建議表（名稱可再調整）：

### 4.1 `account_profile`（或擴充現有 `user`）

- `identity`：主鍵，等於 SpacetimeDB 連線身分。
- `email`：字串，唯一性在 reducer 內檢查（必要時加索引約束策略）。
- `display_name`：可選。

> 密碼**不建議**明文存模組內；若必須相容舊版「信箱＋密碼」，可改為 **OpenAuth / 外部 IdP** 換取 token 後再連線，或僅在過渡期存密碼雜湊並由 reducer 驗證（需審慎評估安全與合規）。

### 4.2 `scheduled_message`（對應 Mongo `Message`）

| 欄位 | 型別建議 | 說明 |
|------|-----------|------|
| `id` | 自動主鍵（如 `u64` 或 UUID） | 對應前端原 `_id` |
| `sender` | `Identity` | 寄件人 |
| `sender_email` | `string` | 冗餘展示／搜尋用，與 profile 同步 |
| `recipient_email` | `string` | 收件人信箱（小寫正規化） |
| `content` | `string` | 完整內文僅寄件人與到期後收件相關邏輯可讀 |
| `scheduled_at` | `Timestamp` | 開啟時間 |
| `is_wait_list_visible` | `bool` | 是否在對方列表可見（未到期前） |
| `created_at` | `Timestamp` | 建立時間 |

**`isDue` 不存表**：以 `ctx.timestamp >= scheduled_at` 在 reducer 或 **view** 中計算；前端訂閱列時同樣可比對本地時間或依伺服器時間事件更新。

### 4.3 Reducers（對應 REST）

| 行為 | Mongo REST | SpacetimeDB Reducer |
|------|------------|---------------------|
| 註冊／登入 | `POST /api/auth/register`、`/login` | 見第 5 節；連線成功即具 `Identity`，可再加 `register_email` / `link_email` |
| 寄信 | `POST /api/messages` | `send_scheduled_message` |
| 收件列表 | `GET /api/messages/inbox` | 訂閱 `scheduled_message` + `where` 收件者為本人 email／或依可見性規則 |
| 寄件列表 | `GET /api/messages/outbox` | `where sender = ctx.sender` |
| 單筆詳情 | `GET /api/messages/:id` | 訂閱單列或由列表選取；內容可見性在模組端讀取時過濾或分兩個 view |
| 更新未解封寄件 | `PATCH /api/messages/:id` | `update_scheduled_message`（僅 `sender` 且未到期） |
| 刪除未解封寄件 | `POST /api/delete-message/:id` | `delete_scheduled_message` |

所有寫入在 reducer 內做 **權限與時間條件** 檢查，避免客戶端竄改。

## 5. 認證與身分

| 面向 | Mongo 版 | SpacetimeDB 版 |
|------|-----------|----------------|
| 身分鍵 | JWT 內含 `userId` | 連線的 `Identity` |
| 信箱密碼 | bcrypt 存 Mongo | 無內建；需 **OpenAuth**、**自託管登入服務發 token**，或過渡期自管密碼表（不推薦長期） |

建議路線：**SpacetimeDB OpenAuth** 或既有身分供應商，讓瀏覽器以安全方式取得連線權限，模組內只信任 `ctx.sender`。

## 6. 前端遷移要點

- 將 `App.tsx` 中 `fetch` + `Bearer` + 輪詢，改為 **`useSpacetimeDB` 連線** + **`useTable` 訂閱** 篩選 inbox／outbox。
- 型別：`Message._id` → 模組主鍵型別；`scheduledAt` ISO 字串 → `Timestamp` 與 `toDate()` 顯示。
- UI／動畫（motion、lucide）可保留，與資料層解耦。

## 7. 建議實作順序

1. 擴充 `spacetimedb/src/index.ts`：新增表與 reducers，保留或移除舊 chat 表（視是否要並存示範）。
2. 執行 `npm run spacetime:generate` 更新 `src/module_bindings`。
3. 分階段替換 `src/App.tsx`：先連線 + 列表訂閱，再撰寫／編輯／刪除。
4. 補整合測試（已有 `App.integration.test.tsx` 可沿用以調整斷言）。

## 8. 參考路徑

- 來源產品 UI 與互動：`…\GitHub\youshuo\src\App.tsx`
- 來源 API 與規則：`…\GitHub\youshuo\server.ts`
- 本倉庫模組：`spacetimedb/src/index.ts`
- 本倉庫前端：`src/App.tsx`

---

## 9. 實作狀態（2026-04-18）

本倉庫根目錄已依上表落地：**SpacetimeDB 模組**（帳號＋排程信 reducers）與 **React 前端**（沿用原 youshuo 介面，改接 `useTable`／`useReducer`）。細節見 `memory/2026-04-18.md`。

---

*文件日期：2026-04-18 — 作為 idea-youshuo 內「有說」SpacetimeDB 化的需求基線。*
