# Email OTP Gateway

本服務提供 Email 驗證碼發送與驗證 API，供前端註冊與「忘記密碼」（`purpose: reset_password`）發信呼叫。

## 啟動

```bash
npm run email:gateway
```

預設埠號 `8787`，可用 `EMAIL_OTP_GATEWAY_PORT` 覆蓋。

## API

- `POST /otp/request`
  - body: `{ "email": "user@example.com", "purpose": "register" | "reset_password", "code": "123456" }`
  - `code` 可選；若提供，gateway 會寄送指定 6 位碼（建議由 SpacetimeDB 先寫入後再呼叫）
  - `reset_password` 時郵件主旨／內文為「重設密碼驗證碼」，與註冊驗證區分
- `POST /otp/verify`
  - body: `{ "email": "user@example.com", "purpose": "register" | "reset_password", "code": "123456" }`

回應格式：

```json
{ "statusCode": 200, "message": "ok", "data": {} }
```

## 環境變數

- `EMAIL_OTP_GATEWAY_PORT`：服務埠號（預設 `8787`）
- `EMAIL_OTP_CORS_ORIGIN`：CORS 允許來源（可逗號分隔多網域）
- `EMAIL_OTP_APP_NAME`：郵件顯示品牌名
- `EMAIL_OTP_FROM`：寄件者，例如 `Youshuo <noreply@yourdomain.com>`
- `EMAIL_OTP_SIGNING_SECRET`：驗證 token 簽章密鑰（務必替換）
- `RESEND_API_KEY`：若提供則走 Resend；未提供時進入本地 `dev-log` 模式（OTP 只輸出到 console）

### 你的當前建議值（youtalk.im）

- 發信子網域：`email.youtalk.im`（已在 Resend 驗證）
- `EMAIL_OTP_FROM=Youtalk <noreply@email.youtalk.im>`
- `EMAIL_OTP_CORS_ORIGIN=https://youtalk.im,https://www.youtalk.im`
- 可直接複製 `email-gateway/.env.production.example` 作為部署模板

## 前端設定

在 `.env` 設定：

```bash
VITE_EMAIL_OTP_GATEWAY_URL=http://localhost:8787
```

## 風控內建

- 每封信箱 60 秒冷卻
- 驗證碼 5 分鐘過期
- 驗證錯誤 5 次鎖 15 分鐘
- IP / Email 每分鐘速率限制（記憶體桶）

> 注意：目前限流桶與 OTP 存儲在記憶體。正式上線請改為 Redis / DB。
