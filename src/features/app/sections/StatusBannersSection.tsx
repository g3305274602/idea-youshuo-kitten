import { cn } from "../../../lib/utils";

type StatusBannersSectionProps = {
  showProfileHint: boolean;
  showSanctionTicker: boolean;
  isWarned: boolean;
  sanctionTickerText: string;
};

export function StatusBannersSection({
  showProfileHint,
  showSanctionTicker,
  isWarned,
  sanctionTickerText,
}: StatusBannersSectionProps) {
  return (
    <>
      {showProfileHint ? (
        <div className="shrink-0 border-b border-amber-200/50 bg-amber-50/95 px-4 py-2 text-center text-[12px] font-medium text-amber-950/90">
          請至「我的」頁頂部個人卡片按「編輯資料」補齊暱稱、性別與年齡。
        </div>
      ) : null}

      {showSanctionTicker ? (
        <div
          className={cn(
            "shrink-0 overflow-hidden border-b",
            isWarned ? "border-orange-300 bg-orange-100" : "border-amber-300 bg-amber-50",
          )}
        >
          <div className="flex animate-[ticker_18s_linear_infinite] whitespace-nowrap gap-16 px-4 py-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "text-[11px] font-bold shrink-0",
                  isWarned ? "text-orange-800" : "text-amber-800",
                )}
              >
                {sanctionTickerText}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
