export const AUTH_HOST =
  import.meta.env.VITE_SPACETIMEDB_HOST ??
  (import.meta.env.DEV
    ? "ws://localhost:3000"
    : "wss://maincloud.spacetimedb.com");

export const AUTH_DB = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? "idea-jd2zx";

export const SPACETIME_TOKEN_KEY = `${AUTH_HOST}/${AUTH_DB}/auth_token`;

export const CAPSULE_LAST_SHOWN_KEY = "youshuo_capsule_last_shown_id";

export const TEXT_LIMIT = 300;

export const CAPSULE_TYPE_OPTIONS = [
  { type: 1, label: "求助" },
  { type: 2, label: "吐槽" },
  { type: 3, label: "戀愛" },
  { type: 4, label: "閒聊" },
  { type: 5, label: "樹洞" },
  { type: 6, label: "分享" },
  { type: 7, label: "職場" },
  { type: 8, label: "治癒" },
  { type: 9, label: "八卦" },
  { type: 10, label: "建議" },
] as const;

const CAPSULE_TYPE_THEME: Record<number, string> = {
  1: "border-sky-300 bg-sky-100 text-sky-800",
  2: "border-amber-300 bg-amber-100 text-amber-800",
  3: "border-pink-300 bg-pink-100 text-pink-700",
  4: "border-violet-300 bg-violet-100 text-violet-800",
  5: "border-slate-300 bg-slate-200 text-slate-800",
  6: "border-emerald-300 bg-emerald-100 text-emerald-800",
  7: "border-orange-300 bg-orange-100 text-orange-800",
  8: "border-teal-300 bg-teal-100 text-teal-800",
  9: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800",
  10: "border-indigo-300 bg-indigo-100 text-indigo-800",
};

const CAPSULE_TYPE_ACTIVE_THEME: Record<number, string> = {
  1: "border-sky-500 bg-sky-600 text-white",
  2: "border-amber-500 bg-amber-500 text-white",
  3: "border-pink-500 bg-pink-500 text-white",
  4: "border-violet-500 bg-violet-600 text-white",
  5: "border-slate-500 bg-slate-600 text-white",
  6: "border-emerald-500 bg-emerald-600 text-white",
  7: "border-orange-500 bg-orange-500 text-white",
  8: "border-teal-500 bg-teal-600 text-white",
  9: "border-fuchsia-500 bg-fuchsia-600 text-white",
  10: "border-indigo-500 bg-indigo-600 text-white",
};

export function capsuleTypeMeta(type: number | undefined) {
  const normalized = type ?? 4;
  const option =
    CAPSULE_TYPE_OPTIONS.find((x) => x.type === normalized) ??
    CAPSULE_TYPE_OPTIONS[3]!;

  return {
    ...option,
    chipClass: CAPSULE_TYPE_THEME[option.type] ?? CAPSULE_TYPE_THEME[4],
    activeChipClass:
      CAPSULE_TYPE_ACTIVE_THEME[option.type] ?? CAPSULE_TYPE_ACTIVE_THEME[4],
  };
}
