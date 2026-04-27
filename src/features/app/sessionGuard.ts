import { SPACETIME_TOKEN_KEY } from "./constants";

const SPACETIME_KEYS_MAP = "STBD_MAILBOX_KEYS";
const AUTH_PENDING_RETRY = "STBD_AUTH_PENDING";

const SESSION_INVALID_HINTS = [
  "尚未登入",
  "CONFLICT_IDENTITY",
  "此連線已有帳號",
  "已綁定",
  "登入已在其他裝置生效",
];

export function isSessionInvalidErrorMessage(msg: string): boolean {
  const raw = (msg ?? "").trim();
  if (!raw) return false;
  return SESSION_INVALID_HINTS.some((hint) => raw.includes(hint));
}

export function forceReauthRedirect() {
  clearLocalSessionState();
  window.location.href = window.location.origin;
}

export function clearLocalSessionState() {
  localStorage.removeItem(SPACETIME_TOKEN_KEY);
  localStorage.removeItem("LAST_USED_EMAIL");
  localStorage.removeItem(SPACETIME_KEYS_MAP);
  sessionStorage.removeItem(AUTH_PENDING_RETRY);
  sessionStorage.setItem("SKIP_BOOT_WAIT", "true");
}
