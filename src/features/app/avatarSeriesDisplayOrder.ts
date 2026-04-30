/**
 * 「頭像系列（組）」在介面上的顯示順序：
 * - 不依賴逐張 sortOrder，而是整組可手動排序並寫入 localStorage。
 * - 管理端與使用者頭像選擇器共用同一 key，避免兩邊順序不一致。
 */

export const AVATAR_SERIES_DISPLAY_ORDER_KEY = "youshuo_avatar_series_display_order_v1";

export type AvatarSeriesSortableRow = {
  seriesKey: string;
  sortOrder: number;
};

export function groupRowsBySeriesKey<T extends AvatarSeriesSortableRow>(
  rows: readonly T[],
): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const row of rows) {
    const k = `${row.seriesKey ?? ""}`.trim() || "未分組";
    const list = m.get(k) ?? [];
    list.push(row);
    m.set(k, list);
  }
  return m;
}

export function minSortOrderAmongRows(
  rows: readonly { sortOrder: number }[] | undefined,
): number {
  if (!rows || rows.length === 0) return 0;
  let m = Number.POSITIVE_INFINITY;
  for (const r of rows) m = Math.min(m, r.sortOrder);
  return Number.isFinite(m) ? m : 0;
}

/** 未有手動順序時，依各組最小的 sortOrder 做預設排序 */
export function defaultSeriesKeysOrder(
  keys: readonly string[],
  grouped: Map<string, readonly { sortOrder: number }[]>,
): string[] {
  return [...keys].sort((a, b) => {
    const da = minSortOrderAmongRows(grouped.get(a));
    const db = minSortOrderAmongRows(grouped.get(b));
    if (da !== db) return da - db;
    return a.localeCompare(b, "zh-Hant");
  });
}

/**
 * persisted：先前儲存的系列 key 順序；會保留仍存在於 grouped 的順序，
 * 其餘新系列則排在後面並依預設規則排序。
 */
export function mergePersistedSeriesOrder(
  groupedKeys: readonly string[],
  grouped: Map<string, readonly { sortOrder: number }[]>,
  persisted: readonly string[],
): string[] {
  const allow = new Set(groupedKeys);
  const pinned: string[] = [];
  const seen = new Set<string>();
  for (const k of persisted) {
    if (!allow.has(k) || seen.has(k)) continue;
    pinned.push(k);
    seen.add(k);
  }
  const rest = groupedKeys.filter((k) => !seen.has(k));
  return [...pinned, ...defaultSeriesKeysOrder(rest, grouped)];
}

export function loadAvatarSeriesDisplayOrder(): string[] {
  try {
    const raw = localStorage.getItem(AVATAR_SERIES_DISPLAY_ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function saveAvatarSeriesDisplayOrder(keys: readonly string[]): void {
  localStorage.setItem(AVATAR_SERIES_DISPLAY_ORDER_KEY, JSON.stringify([...keys]));
}

export function moveSeriesKeyInOrder(
  keys: readonly string[],
  seriesKey: string,
  dir: -1 | 1,
): string[] {
  const idx = keys.indexOf(seriesKey);
  if (idx < 0) return [...keys];
  const j = idx + dir;
  if (j < 0 || j >= keys.length) return [...keys];
  const copy = [...keys];
  const a = copy[idx]!;
  const b = copy[j]!;
  copy[idx] = b;
  copy[j] = a;
  return copy;
}
