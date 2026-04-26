import { Lock } from "lucide-react";

import { cn, emailsEqual } from "../../../lib/utils";

type ReportRow = {
  id: string;
  reporterIdentity: { toHexString: () => string };
  updatedAt: { microsSinceUnixEpoch: bigint; toDate: () => Date };
  status: string;
  targetType: string;
  reasonCode: string;
  resolutionNote?: string;
};

type MyReportsSidebarSectionProps = {
  reportTicketRows: readonly ReportRow[];
  adminEmailByHex: ReadonlyMap<string, string | undefined>;
  myEmail?: string;
};

export function MyReportsSidebarSection({
  reportTicketRows,
  adminEmailByHex,
  myEmail,
}: MyReportsSidebarSectionProps) {
  const myReports = [...reportTicketRows]
    .filter((r) => {
      const reporterEmail = adminEmailByHex.get(r.reporterIdentity.toHexString());
      return emailsEqual(reporterEmail, myEmail);
    })
    .sort((a, b) =>
      Number(b.updatedAt.microsSinceUnixEpoch - a.updatedAt.microsSinceUnixEpoch),
    );

  if (myReports.length === 0) {
    return (
      <div className="py-8 px-4 text-center">
        <Lock className="mx-auto mb-3 h-9 w-9 text-white/15 md:text-black/[0.08]" />
        <p className="text-[13px] font-medium text-white/50 md:text-black/30">
          你還沒有提交過任何舉報
        </p>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    open: "審核中",
    in_review: "審核中",
    resolved: "已結案",
    dismissed: "不予處理",
  };
  const statusColor: Record<string, string> = {
    open: "text-amber-600",
    in_review: "text-blue-600",
    resolved: "text-emerald-600",
    dismissed: "text-stone-500",
  };

  return myReports.map((r) => (
    <div
      key={r.id}
      className="w-full rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "text-[11px] font-bold",
            statusColor[r.status] ?? "text-stone-500",
          )}
        >
          {statusLabel[r.status] ?? r.status}
        </span>
        <span className="text-[10px] text-black/30">
          {r.updatedAt.toDate().toLocaleDateString("zh-TW", {
            month: "numeric",
            day: "numeric",
          })}
        </span>
      </div>
      <p className="mt-0.5 text-[12px] font-semibold text-stone-900">
        {r.targetType === "capsule"
          ? "舉報膠囊"
          : r.targetType === "square_post"
            ? "舉報廣場貼文"
            : r.targetType === "chat_account"
              ? "舉報帳號"
              : "舉報聊天"}
        {" · "}
        {r.reasonCode}
      </p>
      {r.status === "resolved" || r.status === "dismissed" ? (
        <p className="mt-1 text-[11px] text-stone-500">
          {r.status === "resolved"
            ? "你的舉報已受理，違規行為已處置。"
            : "你的舉報已審查，未發現違規。"}
          {r.resolutionNote ? ` 說明：${r.resolutionNote}` : ""}
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-stone-400">
          管理員正在審查中，請耐心等待。
        </p>
      )}
    </div>
  ));
}
