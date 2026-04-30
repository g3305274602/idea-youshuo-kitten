import type { CapsulePrivateMessage } from "../../module_bindings/types";

const STORAGE_PREFIX = "youshuo_chat_read_cursor_";

/** 私訊氣泡：僅以帳號 id 比對（雙側 trim），與後端寫入一致 */
export function isChatMessageFromSelfByAccount(
  authorAccountId: string,
  myAccountId?: string,
): boolean {
  const a = `${authorAccountId ?? ""}`.trim();
  const m = `${myAccountId ?? ""}`.trim();
  return !!m && !!a && a === m;
}

export function loadReadCursorMap(identityHex: string): Map<string, bigint> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + identityHex);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, string>;
    const m = new Map<string, bigint>();
    for (const [k, v] of Object.entries(obj)) {
      m.set(k, BigInt(v));
    }
    return m;
  } catch {
    return new Map();
  }
}

export function saveReadCursorMap(
  identityHex: string,
  map: Map<string, bigint>,
): void {
  const obj: Record<string, string> = {};
  for (const [k, v] of map.entries()) {
    obj[k] = v.toString();
  }
  localStorage.setItem(STORAGE_PREFIX + identityHex, JSON.stringify(obj));
}

/**
 * 未讀：最後一則為對方（帳號非本人），且其時間晚於已讀游標。
 */
export function computeThreadUnread(
  readCursorMicros: bigint,
  messages: readonly CapsulePrivateMessage[],
  myAccountId?: string,
): boolean {
  if (messages.length === 0) return false;
  const sorted = [...messages].sort(
    (a, b) =>
      Number(
        a.createdAt.microsSinceUnixEpoch - b.createdAt.microsSinceUnixEpoch,
      ),
  );
  const last = sorted[sorted.length - 1]!;
  if (isChatMessageFromSelfByAccount(last.authorAccountId, myAccountId))
    return false;
  return last.createdAt.microsSinceUnixEpoch > readCursorMicros;
}

export function maxMessageMicros(
  messages: readonly CapsulePrivateMessage[],
): bigint {
  let m = 0n;
  for (const x of messages) {
    const t = x.createdAt.microsSinceUnixEpoch;
    if (t > m) m = t;
  }
  return m;
}
