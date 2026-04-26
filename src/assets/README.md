# 靜態資源（打包用）

在元件內以 `import` 引用，由 Vite 處理 hash 與快取。

| 路徑 | 用途 |
|------|------|
| `images/app/mine` | 我的頁切圖、背景 |
| `images/app/chat` | 聊聊相關 |
| `images/app/secret` | 秘密／廣場相關；底欄抽膠囊鈕 `capsule-draw-fab.png` |
| `images/common` | 全站共用圖 |
| `images/temp` | 臨時檔，定稿後移出或刪除 |
| `icons/ui` | 通用 UI 圖示 |
| `icons/feature` | 功能模組圖示 |
| `illustrations` | 插畫 |
| `fonts` | 字型檔 |
| `lottie` | Lottie JSON |

命名建議：`kebab-case`，例如 `mine-profile-bg@2x.png`。

**不要**把需固定根路徑的檔案放這裡；那些放 `public/`（見專案根目錄說明）。
