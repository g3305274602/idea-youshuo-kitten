import { createHash, createHmac, randomInt } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.EMAIL_OTP_GATEWAY_PORT || 8787);
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const MAIL_FROM = process.env.EMAIL_OTP_FROM || "no-reply@example.com";
const APP_NAME = process.env.EMAIL_OTP_APP_NAME || "有說";
const OTP_SIGNING_SECRET =
  process.env.EMAIL_OTP_SIGNING_SECRET || "change-me-in-production";
const CORS_ORIGIN = process.env.EMAIL_OTP_CORS_ORIGIN || "";

const OTP_EXPIRE_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_PER_IP = 20;
const RATE_MAX_PER_EMAIL = 8;

/** @type {Map<string, {salt:string, hash:string, expiresAt:number, resendAfter:number, attempts:number, lockedUntil:number, sendCount:number}>} */
const otpStore = new Map();
/** @type {Map<string, {count:number, resetAt:number}>} */
const ipRate = new Map();
/** @type {Map<string, {count:number, resetAt:number}>} */
const emailRate = new Map();

function parseAllowedOrigins(raw) {
  return String(raw || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

const ALLOWED_ORIGINS = parseAllowedOrigins(CORS_ORIGIN);

function resolveCorsOrigin(reqOrigin) {
  if (!reqOrigin) return "";
  if (ALLOWED_ORIGINS.length === 0) return reqOrigin;
  return ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : "";
}

function sendJson(req, res, statusCode, message, data, details) {
  const corsOrigin = resolveCorsOrigin(String(req.headers.origin || ""));
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": corsOrigin || "null",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  });
  const payload = { statusCode, message };
  if (details) payload.details = details;
  if (data !== undefined) payload.data = data;
  res.end(JSON.stringify(payload));
}

function normalizeEmail(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function keyFor(purpose, email) {
  return `${purpose}:${email}`;
}

function hashOtp(email, purpose, salt, code) {
  return createHash("sha256")
    .update(`otp:v1:${email}:${purpose}:${salt}:${code}`)
    .digest("hex");
}

function randomOtpCode() {
  let out = "";
  for (let i = 0; i < 6; i++) out += String(randomInt(0, 10));
  return out;
}

function randomSalt() {
  return createHash("sha256")
    .update(`${Date.now()}:${Math.random()}`)
    .digest("hex")
    .slice(0, 32);
}

function checkRateBucket(map, key, max) {
  const now = Date.now();
  const row = map.get(key);
  if (!row || row.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (row.count >= max) return false;
  row.count += 1;
  return true;
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", OTP_SIGNING_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

async function sendOtpMail(email, code) {
  const subject = `[${APP_NAME}] 驗證碼 ${code}（5 分鐘有效）`;
  const text = `${APP_NAME} 驗證碼：${code}\n\n5 分鐘內有效。若非本人操作請忽略本郵件。`;
  if (!RESEND_API_KEY) {
    console.log(`[email-gateway][dev] to=${email} otp=${code}`);
    return { provider: "dev-log", id: `dev-${Date.now()}` };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: [email],
      subject,
      text,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || "郵件發送失敗");
  }
  return { provider: "resend", id: json?.id || "" };
}

async function parseBody(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return sendJson(req, res, 200, "ok", {});
  }
  if (req.method !== "POST") {
    return sendJson(req, res, 404, "Not Found", undefined, "Unsupported path");
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  let body;
  try {
    body = await parseBody(req);
  } catch {
    return sendJson(req, res, 400, "參數格式錯誤", undefined, "Invalid JSON");
  }
  const purpose = String(body?.purpose || "").trim().toLowerCase();
  const email = normalizeEmail(body?.email);
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown");
  if (!checkRateBucket(ipRate, ip, RATE_MAX_PER_IP)) {
    return sendJson(req, res, 429, "請稍後再試", undefined, "IP rate limited");
  }
  if (!checkRateBucket(emailRate, email, RATE_MAX_PER_EMAIL)) {
    return sendJson(req, res, 429, "請稍後再試", undefined, "Email rate limited");
  }
  if (!isValidEmail(email)) {
    return sendJson(req, res, 400, "信箱格式不正確");
  }
  if (purpose !== "register") {
    return sendJson(req, res, 400, "不支援的驗證用途");
  }

  if (url.pathname === "/otp/request") {
    const key = keyFor(purpose, email);
    const now = Date.now();
    const row = otpStore.get(key);
    if (row?.lockedUntil && row.lockedUntil > now) {
      return sendJson(req, res, 429, "驗證碼嘗試過多，請稍後再試");
    }
    if (row && row.resendAfter > now) {
      return sendJson(req, res, 429, "發送過於頻繁，請稍後再試");
    }
    const requestedCode = String(body?.code || "").trim();
    const code = /^\d{6}$/.test(requestedCode) ? requestedCode : randomOtpCode();
    const salt = randomSalt();
    const hash = hashOtp(email, purpose, salt, code);
    otpStore.set(key, {
      salt,
      hash,
      expiresAt: now + OTP_EXPIRE_MS,
      resendAfter: now + RESEND_COOLDOWN_MS,
      attempts: 0,
      lockedUntil: 0,
      sendCount: (row?.sendCount || 0) + 1,
    });
    try {
      await sendOtpMail(email, code);
    } catch (err) {
      return sendJson(
        req,
        res,
        400,
        "郵件發送失敗",
        undefined,
        String(err?.message || err),
      );
    }
    return sendJson(req, res, 200, "驗證碼已送出", {
      cooldownSec: 60,
      expireSec: 300,
    });
  }

  if (url.pathname === "/otp/verify") {
    const code = String(body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) {
      return sendJson(req, res, 400, "請輸入 6 位驗證碼");
    }
    const key = keyFor(purpose, email);
    const now = Date.now();
    const row = otpStore.get(key);
    if (!row) {
      return sendJson(req, res, 400, "請先獲取驗證碼");
    }
    if (row.lockedUntil && row.lockedUntil > now) {
      return sendJson(req, res, 429, "驗證碼嘗試過多，請稍後再試");
    }
    if (row.expiresAt <= now) {
      otpStore.delete(key);
      return sendJson(req, res, 400, "驗證碼已過期，請重新獲取");
    }
    const want = hashOtp(email, purpose, row.salt, code);
    if (want !== row.hash) {
      row.attempts += 1;
      if (row.attempts >= MAX_ATTEMPTS) {
        row.lockedUntil = now + LOCK_MS;
      }
      return sendJson(
        req,
        res,
        400,
        row.attempts >= MAX_ATTEMPTS ? "驗證失敗次數過多，請稍後再試" : "驗證碼錯誤",
      );
    }
    otpStore.delete(key);
    const token = signToken({
      email,
      purpose,
      exp: now + 15 * 60 * 1000,
      iat: now,
    });
    return sendJson(req, res, 200, "驗證成功", { verificationToken: token });
  }

  return sendJson(req, res, 404, "Not Found", undefined, "Unsupported path");
});

server.listen(PORT, () => {
  console.log(`[email-gateway] listening on :${PORT}`);
  console.log(`[email-gateway] provider=${RESEND_API_KEY ? "resend" : "dev-log"}`);
});
