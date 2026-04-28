import { useMemo, useState } from "react";
import { cn } from "../../lib/utils";
import { CdSelect } from "../app/components/CdSelect";

export type SuperAdminTrendDay = {
  dayKey: string;
  dayShort: string;
  registrations: number;
  capsules: number;
  squarePosts: number;
  comments: number;
};

export type SuperAdminTrendsBundle = {
  days: SuperAdminTrendDay[];
  maxRegistrations: number;
  maxActivityStack: number;
  profilesWithoutCreatedAt: number;
  windowDays: number;
};

type TrendPreset = "d14" | "d30" | "d180" | "d365" | "custom";

function XAxisLabels({ days }: { days: SuperAdminTrendDay[] }) {
  return (
    <div className="mt-1 flex justify-between gap-0.5 text-[9px] text-white/40">
      {days.map((d) => (
        <span key={d.dayKey} className="min-w-0 flex-1 truncate text-center">
          {d.dayShort}
        </span>
      ))}
    </div>
  );
}

/** 近 N 日每日註冊（有 `createdAt` 之帳號）折線 */
export function SuperAdminRegistrationLineChart({ data }: { data: SuperAdminTrendsBundle }) {
  const { days, maxRegistrations } = data;
  const n = days.length;
  if (n === 0) return null;
  const [hoverDayKey, setHoverDayKey] = useState<string | null>(null);
  const w = 100;
  const h = 34;
  const padX = 2;
  const padY = 3;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const denom = Math.max(1, n - 1);
  const pts = days
    .map((d, i) => {
      const x = padX + (innerW * i) / denom;
      const ratio = d.registrations / maxRegistrations;
      const y = padY + innerH * (1 - ratio);
      return `${x},${y}`;
    })
    .join(" ");

  const hoverDay = hoverDayKey ? days.find((d) => d.dayKey === hoverDayKey) ?? null : null;

  return (
    <div className="relative min-w-0">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-24 w-full text-[#FFD54F]"
        preserveAspectRatio="none"
        role="img"
        aria-label="每日註冊折線圖"
      >
        <line
          x1={padX}
          y1={h - padY}
          x2={w - padX}
          y2={h - padY}
          className="stroke-white/15"
          strokeWidth="0.35"
        />
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={pts}
        />
        {days.map((d, i) => {
          const x = padX + (innerW * i) / denom;
          const ratio = d.registrations / maxRegistrations;
          const y = padY + innerH * (1 - ratio);
          return (
            <g
              key={d.dayKey}
              onMouseEnter={() => setHoverDayKey(d.dayKey)}
              onMouseLeave={() => setHoverDayKey((k) => (k === d.dayKey ? null : k))}
            >
              {d.registrations > 0 ? <circle cx={x} cy={y} r="1.4" fill="currentColor" /> : null}
              <rect
                x={Math.max(0, x - 1.1)}
                y={0}
                width={2.2}
                height={h}
                fill="transparent"
                pointerEvents="all"
              />
            </g>
          );
        })}
      </svg>
      {hoverDay ? (
        <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-lg border border-white/15 bg-slate-950/95 px-2 py-1 text-[10px] text-white shadow-lg backdrop-blur">
          <p className="font-semibold text-[#FFD54F]">{hoverDay.dayKey}</p>
          <p className="text-white/85">註冊 {hoverDay.registrations}</p>
        </div>
      ) : null}
      <XAxisLabels days={days} />
    </div>
  );
}

/** 膠囊主文／廣場貼文（視圖內）／廣場留言 每日堆疊柱 */
export function SuperAdminActivityStackChart({ data }: { data: SuperAdminTrendsBundle }) {
  const { days, maxActivityStack } = data;
  if (days.length === 0) return null;
  const [hoverDayKey, setHoverDayKey] = useState<string | null>(null);
  const hoverDay = hoverDayKey ? days.find((d) => d.dayKey === hoverDayKey) ?? null : null;

  return (
    <div className="relative min-w-0">
      <div className="flex h-[5.5rem] min-w-0 items-end gap-0.5 overflow-hidden pb-0.5 pt-0.5">
        {days.map((d) => {
          const sum = d.capsules + d.squarePosts + d.comments;
          return (
            <div
              key={d.dayKey}
              className="flex h-full min-w-0 flex-1 flex-col items-center gap-1"
              onMouseEnter={() => setHoverDayKey(d.dayKey)}
              onMouseLeave={() => setHoverDayKey((k) => (k === d.dayKey ? null : k))}
            >
              <div
                className="flex h-full w-full max-w-[1.75rem] flex-col-reverse overflow-hidden rounded-md border border-white/10 bg-white/[0.06]"
              >
                {sum === 0 ? (
                  <div className="h-full w-full bg-white/[0.04]" />
                ) : (
                  <>
                    {d.comments > 0 ? (
                      <div
                        className="w-full shrink-0 bg-[#64748b]"
                        style={{ flex: `${d.comments} 1 0%` }}
                      />
                    ) : null}
                    {d.squarePosts > 0 ? (
                      <div
                        className="w-full shrink-0 bg-[#F06292]/95"
                        style={{ flex: `${d.squarePosts} 1 0%` }}
                      />
                    ) : null}
                    {d.capsules > 0 ? (
                      <div
                        className="w-full shrink-0 bg-emerald-400/90"
                        style={{ flex: `${d.capsules} 1 0%` }}
                      />
                    ) : null}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hoverDay ? (
        <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-lg border border-white/15 bg-slate-950/95 px-2 py-1 text-[10px] text-white shadow-lg backdrop-blur">
          <p className="font-semibold text-emerald-300">{hoverDay.dayKey}</p>
          <p className="text-white/85">
            膠囊 {hoverDay.capsules} / 貼文 {hoverDay.squarePosts} / 留言 {hoverDay.comments}
          </p>
        </div>
      ) : null}
      <XAxisLabels days={days} />
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/55">
        <li>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-400/90" />
          膠囊主文
        </li>
        <li>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#F06292]" />
          廣場貼文
        </li>
        <li>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#64748b]" />
          廣場留言
        </li>
      </ul>
    </div>
  );
}

export function SuperAdminTrendChartsPanel({
  trends,
  className,
}: {
  trends: SuperAdminTrendsBundle;
  className?: string;
}) {
  const allDays = trends.days;
  const maxAvailable = allDays.length;

  const [preset, setPreset] = useState<TrendPreset>("d14");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const presetOptions = [
    { value: "d14", label: "近 14 天" },
    { value: "d30", label: "近 30 天" },
    { value: "d180", label: "近半年" },
    { value: "d365", label: "近 1 年" },
    { value: "custom", label: "自訂範圍" },
  ] as const;

  const filtered = useMemo((): SuperAdminTrendsBundle => {
    if (allDays.length === 0) return trends;

    const fallback = allDays.slice(-Math.min(14, allDays.length));
    let selected: SuperAdminTrendDay[] = fallback;

    if (preset === "d14") selected = allDays.slice(-Math.min(14, maxAvailable));
    else if (preset === "d30") selected = allDays.slice(-Math.min(30, maxAvailable));
    else if (preset === "d180") selected = allDays.slice(-Math.min(180, maxAvailable));
    else if (preset === "d365") selected = allDays.slice(-Math.min(365, maxAvailable));
    else {
      const start = customStart.trim();
      const end = customEnd.trim();
      if (start && end && start <= end) {
        selected = allDays.filter((d) => d.dayKey >= start && d.dayKey <= end);
      } else {
        selected = [];
      }
    }

    if (selected.length === 0) selected = fallback;

    const maxRegistrations = Math.max(1, ...selected.map((d) => d.registrations));
    const maxActivityStack = Math.max(
      1,
      ...selected.map((d) => d.capsules + d.squarePosts + d.comments),
    );

    return {
      ...trends,
      days: selected,
      maxRegistrations,
      maxActivityStack,
      windowDays: selected.length,
    };
  }, [allDays, customEnd, customStart, maxAvailable, preset, trends]);

  const minDay = allDays[0]?.dayKey ?? "";
  const maxDay = allDays[allDays.length - 1]?.dayKey ?? "";

  return (
    <div
      className={cn(
        "grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2 lg:gap-4",
        className,
      )}
    >
      <div className="sm:col-span-2  ">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] font-bold text-white/65">
            <CdSelect
              value={preset}
              onChange={(next) => setPreset(next as TrendPreset)}
              options={presetOptions}
              className="mt-1 min-w-[9.5rem]"
              buttonClassName="h-8 rounded-lg px-2 text-[12px]"
            />
          </label>
          {preset === "custom" ? (
            <>
              <label className="text-[10px] font-bold text-white/65">
                起日
                <input
                  type="date"
                  min={minDay}
                  max={maxDay || undefined}
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="cd-field mt-1 h-8 rounded-lg px-2 text-[12px]"
                />
              </label>
              <label className="text-[10px] font-bold text-white/65">
                迄日
                <input
                  type="date"
                  min={customStart || minDay}
                  max={maxDay || undefined}
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="cd-field mt-1 h-8 rounded-lg px-2 text-[12px]"
                />
              </label>
            </>
          ) : null}
          {/* <p className="pb-1 text-[10px] text-white/45">
            可用資料：{minDay || "--"} ~ {maxDay || "--"}
          </p> */}
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 md:p-4">
        <p className="text-[12px] font-bold text-white">每日註冊（近 {filtered.windowDays} 日）</p>
        <p className="mt-0.5 text-[10px] leading-snug text-white/50">
          僅統計帳號列上具「建立時間」之註冊；舊帳無此欄位者不計入折線。
          {filtered.profilesWithoutCreatedAt > 0
            ? ` 目前有 ${filtered.profilesWithoutCreatedAt} 筆舊帳無建立日。`
            : null}
        </p>
        <div className="mt-2">
          <SuperAdminRegistrationLineChart data={filtered} />
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 md:p-4">
        <p className="text-[12px] font-bold text-white">內容量（近 {filtered.windowDays} 日）</p>
        <p className="mt-0.5 text-[10px] leading-snug text-white/50">
          依建立時間分日加總：膠囊主文（未刪）、廣場貼文（目前為「最近貼文」視圖內筆數）、廣場留言。
        </p>
        <div className="mt-2">
          <SuperAdminActivityStackChart data={filtered} />
        </div>
      </div>
    </div>
  );
}
