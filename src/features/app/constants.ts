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
  1: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  2: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  3: "border-[#F06292]/40 bg-[#F06292]/10 text-pink-100",
  4: "border-violet-400/30 bg-violet-500/10 text-violet-200",
  5: "border-slate-400/30 bg-slate-600/15 text-slate-200",
  6: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  7: "border-orange-400/30 bg-orange-500/10 text-orange-200",
  8: "border-teal-400/30 bg-teal-500/10 text-teal-200",
  9: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200",
  10: "border-indigo-400/30 bg-indigo-500/10 text-indigo-200",
};

const CAPSULE_TYPE_ACTIVE_THEME: Record<number, string> = {
  1: "border-sky-300/80 bg-sky-500/30 text-white",
  2: "border-amber-300/80 bg-amber-500/30 text-stone-900",
  3: "border-[#F06292] bg-[#F06292]/50 text-white",
  4: "border-violet-400/80 bg-violet-600/40 text-white",
  5: "border-slate-300/80 bg-slate-600/40 text-white",
  6: "border-emerald-300/80 bg-emerald-600/40 text-white",
  7: "border-orange-300/80 bg-orange-500/40 text-stone-900",
  8: "border-teal-300/80 bg-teal-600/40 text-white",
  9: "border-fuchsia-300/80 bg-fuchsia-600/40 text-white",
  10: "border-indigo-300/80 bg-indigo-600/40 text-white",
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
