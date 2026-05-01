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

function rowCapsuleGuestAccountId(m: CapsulePrivateMessage): string {
  return `${(m as { threadGuestAccountId?: string }).threadGuestAccountId ?? ""}`.trim();
}

function rowAuthorAccountId(m: CapsulePrivateMessage): string {
  return `${m.authorAccountId ?? ""}`.trim();
}

/**
 * 與後端 `gatherCapsulePrivateGuestThreadMessages` 同構（以 hex／帳號比對），換裝置後請求 identity 漂移時仍可還原同線全集。
 *
 * `requestedGuestHex`：`add_capsule_private_message` reducer 請求裡傳入的線身份（側欄 `threadGuestHex`）。
 * `effectiveGuestHex`：`accountProfile` 上對應 `guestAccountId` 的現用 ownerIdentity hex，無則等於請求側 hex。
 */
export function gatherCapsulePrivateGuestThreadMessagesClient(
  allRows: readonly CapsulePrivateMessage[],
  sourceMessageId: string,
  requestedGuestHex: string,
  effectiveGuestHex: string,
  guestAccountId?: string | null,
): CapsulePrivateMessage[] {
  const gid = `${guestAccountId ?? ""}`.trim();
  const rowsHere = allRows.filter((r) => r.sourceMessageId === sourceMessageId);
  const inPart = new Set<string>();
  const igHex = new Set<string>();
  igHex.add(effectiveGuestHex);
  igHex.add(requestedGuestHex);

  for (const row of rowsHere) {
    const tga = rowCapsuleGuestAccountId(row);
    const aaa = rowAuthorAccountId(row);
    const tgHex = row.threadGuestIdentity.toHexString();
    let anchor =
      tgHex === effectiveGuestHex || tgHex === requestedGuestHex;
    anchor ||= !!(gid && tga === gid);
    anchor ||= !!(gid && aaa === gid);
    if (!anchor) continue;
    inPart.add(row.id);
    igHex.add(tgHex);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rowsHere) {
      if (inPart.has(row.id)) continue;
      const tgHex = row.threadGuestIdentity.toHexString();
      const tga = rowCapsuleGuestAccountId(row);
      if (igHex.has(tgHex) || (gid.length > 0 && tga === gid)) {
        inPart.add(row.id);
        igHex.add(tgHex);
        changed = true;
      }
    }
  }

  return rowsHere.filter((r) => inPart.has(r.id));
}

/** 輕量單列是否屬某訪客線（需已提供 effective／requested／帳號 context） */
export function matchesCapsulePrivateGuestThreadStrict(
  m: CapsulePrivateMessage,
  allRows: readonly CapsulePrivateMessage[],
  sourceMessageId: string,
  requestedGuestHex: string,
  effectiveGuestHex: string,
  threadGuestAccountId?: string,
): boolean {
  return gatherCapsulePrivateGuestThreadMessagesClient(
    allRows,
    sourceMessageId,
    requestedGuestHex,
    effectiveGuestHex,
    threadGuestAccountId ?? undefined,
  ).some((r) => r.id === m.id);
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
