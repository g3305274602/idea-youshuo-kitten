import type React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Activity, Lock, X } from "lucide-react";
import { Identity } from "spacetimedb";
import { cn } from "../../../lib/utils";
import type {
  AccountProfile,
  AdminRole,
  AppealTicket,
  CapsuleMessage,
  ModerationQueue,
  ReportTargetSnapshot,
  ReportTicket,
  SquarePost,
  UserSanction,
} from "../../../module_bindings/types";
import type { AdminSection, AdminReportFilter, AppTab } from "../types";

type AdminSidebarProps = {
  activeTab: Extract<AppTab, "admin" | "admin_ops">;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasAnyAdmin: boolean;
  adminActionLoading: boolean;
  activeAdminRows: readonly AdminRole[];
  adminReportsSorted: readonly ReportTicket[];
  adminSection: AdminSection;
  canClaimOrphanSuperAdmin: boolean;
  onBootstrapAdminSelf: () => void | Promise<void>;
  onClaimOrphanSuperAdmin: () => void | Promise<void>;
  onSelectAdminOpsMain: () => void;
  onSelectReports: () => void;
  onSelectReview: () => void;
};

export function AdminSidebar({
  activeTab,
  isAdmin,
  isSuperAdmin,
  hasAnyAdmin,
  adminActionLoading,
  activeAdminRows,
  adminReportsSorted,
  adminSection,
  canClaimOrphanSuperAdmin,
  onBootstrapAdminSelf,
  onClaimOrphanSuperAdmin,
  onSelectAdminOpsMain,
  onSelectReports,
  onSelectReview,
}: AdminSidebarProps) {
  if (!isAdmin) {
    return (
      <div className="py-8 px-4 text-center">
        <Lock className="mx-auto mb-3 h-9 w-9 text-white/15 md:text-black/[0.08]" />
        <p className="text-[13px] font-medium text-white/50 md:text-black/30">
          你目前不是管理員，無法進入管理後台。
        </p>
        {activeAdminRows.length > 0 ? (
          <div className="mt-3 rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
              目前管理帳號
            </p>
            <ul className="mt-1 space-y-1">
              {activeAdminRows.slice(0, 4).map((r) => (
                <li
                  key={r.adminIdentity.toHexString()}
                  className="text-[11px] text-stone-700 break-all"
                >
                  {r.role} · {r.adminIdentity.toHexString()}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {!hasAnyAdmin ? (
          <button
            type="button"
            onClick={() => void onBootstrapAdminSelf()}
            disabled={adminActionLoading}
            className="mt-3 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-3 py-2 text-[12px] font-black text-stone-900 disabled:opacity-60"
          >
            {adminActionLoading ? "建立中…" : "建立首位超級管理員（自己）"}
          </button>
        ) : null}
        {canClaimOrphanSuperAdmin ? (
          <button
            type="button"
            onClick={() => void onClaimOrphanSuperAdmin()}
            disabled={adminActionLoading}
            className="mt-3 rounded-xl border-2 border-rose-500 bg-rose-500 px-3 py-2 text-[12px] font-black text-white disabled:opacity-60"
          >
            {adminActionLoading ? "修復中…" : "認領失聯超管權限"}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isSuperAdmin ? (
        <button
          type="button"
          onClick={onSelectAdminOpsMain}
          className={cn(
            "w-full rounded-xl border-2 px-3 py-2 text-left text-[12px] font-bold transition-all",
            activeTab === "admin_ops" && adminSection === "main"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-300/40"
              : "border-black/[0.08] bg-white text-stone-700 hover:border-black/[0.15]",
          )}
        >
          可視化總覽
        </button>
      ) : null}
      <button
        type="button"
        onClick={onSelectReports}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border-2 px-3 py-2 text-left text-[12px] font-bold transition-all",
          adminSection === "reports"
            ? "border-rose-300 bg-rose-50 text-rose-800 ring-2 ring-rose-300/40"
            : "border-black/[0.08] bg-white text-stone-700 hover:border-black/[0.15]",
        )}
      >
        <span>處理舉報</span>
        {adminReportsSorted.filter((r) => r.status !== "resolved").length > 0 ? (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-bold",
              adminSection === "reports"
                ? "bg-rose-500 text-white"
                : "bg-rose-100 text-rose-700",
            )}
          >
            {adminReportsSorted.filter((r) => r.status !== "resolved").length}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={onSelectReview}
        className={cn(
          "w-full rounded-xl border-2 px-3 py-2 text-left text-[12px] font-bold transition-all",
          (activeTab === "admin" && adminSection === "main") ||
            adminSection === "review"
            ? "border-violet-300 bg-violet-50 text-violet-800 ring-2 ring-violet-300/40"
            : "border-black/[0.08] bg-white text-stone-700 hover:border-black/[0.15]",
        )}
      >
        帳號審核管理
      </button>
    </div>
  );
}

type AdminContentProps = {
  activeTab: Extract<AppTab, "admin" | "admin_ops">;
  identity: Identity;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasAnyAdmin: boolean;
  adminSection: AdminSection;
  adminReportFilter: AdminReportFilter;
  adminReportsSorted: readonly ReportTicket[];
  selectedAdminReportId: string | null;
  selectedAdminReport: ReportTicket | null;
  selectedAdminSnapshot: ReportTargetSnapshot | null;
  adminReportStatus: string;
  adminReportPriority: number;
  adminResolutionNote: string;
  adminActionLoading: boolean;
  adminActionError: string;
  activeAdminRows: readonly AdminRole[];
  inactiveAdminRows: readonly AdminRole[];
  adminEmailByHex: Map<string, string>;
  adminRoleLabel: Record<string, string>;
  profileByIdentityHex: Map<string, AccountProfile>;
  profileByEmail: Map<string, AccountProfile>;
  adminGrantEmailCandidates: readonly string[];
  capsuleMessageRows: readonly CapsuleMessage[];
  squarePostRows: readonly SquarePost[];
  superOpsStats: {
    profiles: number;
    capsules: number;
    squarePosts: number;
    reportsNonResolved: number;
    sanctionsActive: number;
    appeals: number;
    modQueue: number;
    admins: number;
  };
  adminAccountSearch: string;
  adminSearchRows: readonly AccountProfile[];
  adminTargetIdentityHex: string;
  selectedAdminTargetProfile: AccountProfile | null;
  activeSanctionsForTarget: readonly UserSanction[];
  appealTicketRows: readonly AppealTicket[];
  userSanctionRows: readonly UserSanction[];
  moderationQueueRows: readonly ModerationQueue[];
  canClaimOrphanSuperAdmin: boolean;
  onBootstrapAdminSelf: () => void | Promise<void>;
  onClaimOrphanSuperAdmin: () => void | Promise<void>;
  onSetActiveTab: (tab: AppTab) => void;
  onSetAdminReportFilter: (value: AdminReportFilter) => void;
  onSelectAdminReport: (report: ReportTicket) => void;
  onClearSelectedAdminReport: () => void;
  onSetAdminReportStatus: (value: string) => void;
  onSetAdminReportPriority: (value: number) => void;
  onSetAdminResolutionNote: (value: string) => void;
  onSetSanctionDetailDraft: (value: string) => void;
  onSubmitAdminReportUpdate: () => void | Promise<void>;
  onAdminDeleteCapsule: (capsuleId: string) => Promise<void>;
  onAdminDeleteSquarePost: (sourceMessageId: string) => Promise<void>;
  presetReporter: Record<string, string>;
  presetSanction: Record<string, string>;
  onQuickDismissReport: () => void | Promise<void>;
  onSetSanctionTypeDraft: (value: "mute" | "ban" | "warn" | "limit") => void;
  onSetSanctionBanDays: (value: number | "permanent") => void;
  onSubmitSanctionForSelectedReport: () => void | Promise<void>;
  onOpenAdminAddModal: () => void;
  onOpenAdminEditModal: (row: AdminRole, email: string) => void;
  onSetSingleAdminActive: (row: AdminRole, active: boolean) => void | Promise<void>;
  onSetAdminActionError: (value: string) => void;
  onSetAdminGrantEmail: (value: string) => void;
  onSetAdminGrantRole: (value: string) => void;
  onSetAdminGrantActive: (value: boolean) => void;
  onSetAdminAddOpen: (open: boolean) => void;
  onAdminDeleteRoleRecord: (adminIdentity: Identity) => Promise<void>;
  onSetAdminAccountSearch: (value: string) => void;
  onSetAdminTargetIdentityHex: (value: string) => void;
  onQuickBanTargetAccount: () => void | Promise<void>;
  onQuickUnbanTargetAccount: () => void | Promise<void>;
};

export function AdminContent(props: AdminContentProps) {
  const {
    activeTab,
    identity,
    isAdmin,
    isSuperAdmin,
    hasAnyAdmin,
    adminSection,
    adminReportFilter,
    adminReportsSorted,
    selectedAdminReportId,
    selectedAdminReport,
    selectedAdminSnapshot,
    adminReportStatus,
    adminReportPriority,
    adminResolutionNote,
    adminActionLoading,
    adminActionError,
    activeAdminRows,
    inactiveAdminRows,
    adminEmailByHex,
    adminRoleLabel,
    profileByIdentityHex,
    profileByEmail,
    adminGrantEmailCandidates,
    capsuleMessageRows,
    squarePostRows,
    superOpsStats,
    adminAccountSearch,
    adminSearchRows,
    adminTargetIdentityHex,
    selectedAdminTargetProfile,
    activeSanctionsForTarget,
    appealTicketRows,
    userSanctionRows,
    moderationQueueRows,
    canClaimOrphanSuperAdmin,
    onBootstrapAdminSelf,
    onClaimOrphanSuperAdmin,
    onSetActiveTab,
    onSetAdminReportFilter,
    onSelectAdminReport,
    onClearSelectedAdminReport,
    onSetAdminReportStatus,
    onSetAdminReportPriority,
    onSetAdminResolutionNote,
    onSetSanctionDetailDraft,
    onSubmitAdminReportUpdate,
    onAdminDeleteCapsule,
    onAdminDeleteSquarePost,
    presetReporter,
    presetSanction,
    onQuickDismissReport,
    onSetSanctionTypeDraft,
    onSetSanctionBanDays,
    onSubmitSanctionForSelectedReport,
    onOpenAdminAddModal,
    onOpenAdminEditModal,
    onSetSingleAdminActive,
    onSetAdminActionError,
    onSetAdminGrantEmail,
    onSetAdminGrantRole,
    onSetAdminGrantActive,
    onSetAdminAddOpen,
    onAdminDeleteRoleRecord,
    onSetAdminAccountSearch,
    onSetAdminTargetIdentityHex,
    onQuickBanTargetAccount,
    onQuickUnbanTargetAccount,
  } = props;

  if (!isAdmin) {
    return (
      <div className="max-w-sm mx-auto text-center py-16 px-4">
        <Lock className="w-12 h-12 mx-auto text-black/10 mb-3" aria-hidden />
        <p className="text-[15px] font-medium text-black/45">管理後台僅限管理員</p>
        {!hasAnyAdmin ? (
          <button
            type="button"
            onClick={() => void onBootstrapAdminSelf()}
            disabled={adminActionLoading}
            className="mt-3 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-3 py-2 text-[12px] font-black text-stone-900 disabled:opacity-60"
          >
            {adminActionLoading ? "建立中…" : "建立首位超級管理員（自己）"}
          </button>
        ) : null}
        {canClaimOrphanSuperAdmin ? (
          <button
            type="button"
            onClick={() => void onClaimOrphanSuperAdmin()}
            disabled={adminActionLoading}
            className="mt-3 rounded-xl border-2 border-rose-500 bg-rose-500 px-3 py-2 text-[12px] font-black text-white disabled:opacity-60"
          >
            {adminActionLoading ? "修復中…" : "認領失聯超管權限"}
          </button>
        ) : null}
      </div>
    );
  }

  if (activeTab === "admin_ops" && !isSuperAdmin) {
    return (
      <div className="max-w-sm mx-auto text-center py-16 px-4">
        <Lock className="w-12 h-12 mx-auto text-black/10 mb-3" aria-hidden />
        <p className="text-[15px] font-medium text-black/45">超管指揮台僅限 super_admin</p>
        <button
          type="button"
          onClick={() => onSetActiveTab("admin")}
          className="mt-4 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-4 py-2 text-[13px] font-black text-stone-900"
        >
          前往管理後台
        </button>
      </div>
    );
  }

  if (adminSection === "reports") {
    return (
      <div className="flex flex-col md:flex-row h-full min-h-0 w-full">
        <div
          className={cn(
            "md:w-80 shrink-0 border-r border-black/[0.06] flex flex-col overflow-hidden",
            selectedAdminReportId !== null ? "hidden md:flex" : "flex",
          )}
        >
          <div className="rounded-[99px] px-3 py-2 text-[12px] text-[#f4dc3a] mb-1">
            申訴：{appealTicketRows.length} · 處分：
            {userSanctionRows.length} · 待審核：{moderationQueueRows.length}
          </div>
          <div className="shrink-0 flex rounded-[99px] items-center gap-1 border-b border-black/[0.05] bg-stone-50 px-[1px] py-[1px]">
            <button
              type="button"
              onClick={() => onSetAdminReportFilter("pending")}
              className={cn(
                "flex-1 rounded-[99px] rounded-r-[0px] py-1.5 text-[11px] font-bold transition-colors",
                adminReportFilter === "pending"
                  ? "bg-rose-500 text-white"
                  : "text-stone-500 hover:bg-stone-200",
              )}
            >
              待處理 ({adminReportsSorted.filter((r) => r.status !== "resolved").length})
            </button>
            <button
              type="button"
              onClick={() => onSetAdminReportFilter("resolved")}
              className={cn(
                "flex-1 rounded-[99px] rounded-l-[0px] py-1.5 text-[11px] font-bold transition-colors",
                adminReportFilter === "resolved"
                  ? "bg-stone-600 text-white"
                  : "text-stone-500 hover:bg-stone-200",
              )}
            >
              已處理 ({adminReportsSorted.filter((r) => r.status === "resolved").length})
            </button>
          </div>
          <div className="flex-1 overflow-y-auto apple-scroll p-2 space-y-1.5">
            {adminReportsSorted
              .filter((r) =>
                adminReportFilter === "resolved"
                  ? r.status === "resolved"
                  : r.status !== "resolved",
              )
              .map((r) => {
                const assignedProfile = r.assignedAdminIdentity
                  ? profileByIdentityHex.get(r.assignedAdminIdentity.toHexString())
                  : undefined;
                const isSelected = selectedAdminReportId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectAdminReport(r)}
                    className={cn(
                      "w-full text-left rounded-xl border px-3 py-2 transition-all",
                      isSelected
                        ? "border-rose-300/60 bg-rose-50 ring-2 ring-rose-300/40"
                        : "border-black/[0.06] bg-white hover:border-black/[0.12]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase",
                          r.status === "resolved" ? "text-stone-400" : "text-rose-600",
                        )}
                      >
                        {r.status}
                      </span>
                      <span className="text-[10px] text-black/30 tabular-nums">
                        {r.updatedAt.toDate().toLocaleDateString("zh-TW", {
                          month: "numeric",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] font-semibold text-stone-900 truncate">
                      {r.targetType} · {r.reasonCode || "無原因"}
                    </p>
                    {assignedProfile ? (
                      <p className="mt-0.5 text-[10px] text-stone-500 truncate">
                        處理：{assignedProfile.displayName || assignedProfile.email}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            {adminReportsSorted.filter((r) =>
              adminReportFilter === "resolved"
                ? r.status === "resolved"
                : r.status !== "resolved",
            ).length === 0 ? (
              <p className="py-6 text-center text-[12px] text-stone-400">
                {adminReportFilter === "resolved" ? "尚無已處理舉報" : "目前沒有待處理舉報"}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "flex-1 overflow-y-auto apple-scroll p-4 md:p-6",
            selectedAdminReportId === null
              ? "hidden md:flex md:items-center md:justify-center"
              : "flex flex-col",
          )}
        >
          {!selectedAdminReport ? (
            <div className="text-center">
              <Lock className="w-10 h-10 mx-auto text-black/10 mb-2" />
              <p className="text-[13px] text-black/35">從左側選一張舉報單</p>
            </div>
          ) : (
            (() => {
              const r = selectedAdminReport;
              const reporterProfile = profileByIdentityHex.get(
                r.reporterIdentity.toHexString(),
              );
              const targetAccountHex =
                r.targetType === "chat_account"
                  ? r.targetId
                  : r.targetType === "capsule"
                    ? (capsuleMessageRows.find((c) => c.id === r.targetId)?.authorIdentity.toHexString() ??
                      null)
                    : r.targetType === "square_post"
                      ? (squarePostRows.find((p) => p.sourceMessageId === r.targetId)?.publisherIdentity.toHexString() ??
                        null)
                      : null;
              const targetProfile = targetAccountHex
                ? profileByIdentityHex.get(targetAccountHex)
                : undefined;
              const targetCapsule =
                r.targetType === "capsule"
                  ? capsuleMessageRows.find((c) => c.id === r.targetId)
                  : undefined;
              const targetSquare =
                r.targetType === "square_post"
                  ? squarePostRows.find((p) => p.sourceMessageId === r.targetId)
                  : undefined;

              return (
                <div className="w-full max-w-2xl mx-auto space-y-4">
                  <div className="rounded-2xl border border-black/[0.08] bg-white p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-[11px] font-bold uppercase",
                            r.status === "resolved" || r.status === "dismissed"
                              ? "text-stone-400"
                              : "text-rose-600",
                          )}
                        >
                          {r.status === "open"
                            ? "待審核"
                            : r.status === "in_review"
                              ? "審核中"
                              : r.status === "resolved"
                                ? "已結案"
                                : "不予處理"}
                          {" · 優先級 "}
                          {Number(r.priority)}
                        </p>
                        <p className="mt-0.5 text-[15px] font-black text-stone-900">
                          {r.targetType === "capsule"
                            ? "舉報膠囊"
                            : r.targetType === "square_post"
                              ? "舉報廣場貼文"
                              : r.targetType === "chat_account"
                                ? "舉報帳號"
                                : "舉報聊天"}
                          {" · "}
                          {r.reasonCode || "未填原因"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onClearSelectedAdminReport}
                        className="md:hidden shrink-0 rounded-full p-1 hover:bg-stone-100"
                      >
                        <X className="h-4 w-4 text-stone-500" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-[11px] space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                          舉報人
                        </p>
                        <p className="font-semibold text-stone-800 truncate">
                          {reporterProfile?.displayName || "未命名"}
                        </p>
                        <p className="text-stone-500 truncate">
                          {reporterProfile?.email ||
                            `${r.reporterIdentity.toHexString().slice(0, 16)}…`}
                        </p>
                      </div>
                      <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-rose-400">
                          被舉報
                        </p>
                        <p className="font-semibold text-stone-800 truncate">
                          {targetProfile?.displayName || "未命名"}
                        </p>
                        <p className="text-stone-500 truncate">
                          {targetProfile?.email || (targetAccountHex ? `${targetAccountHex.slice(0, 16)}…` : "—")}
                        </p>
                      </div>
                    </div>
                    {r.detailText ? (
                      <p className="whitespace-pre-wrap text-[12px] text-stone-700 leading-relaxed">
                        {r.detailText}
                      </p>
                    ) : null}
                    {selectedAdminSnapshot ? (
                      <div className="rounded-lg bg-stone-50 border border-stone-200 p-2 text-[11px] text-stone-600 whitespace-pre-wrap">
                        快照：{selectedAdminSnapshot.snapshotText}
                      </div>
                    ) : null}
                    {targetCapsule || targetSquare ? (
                      <div className="rounded-xl border border-black/[0.06] bg-white p-3 text-[11px] space-y-1">
                        <p className="font-bold text-stone-700">被舉報內容預覽</p>
                        <p className="text-stone-600 line-clamp-3 whitespace-pre-wrap">
                          {targetCapsule?.content ?? targetSquare?.snapshotContent ?? "—"}
                        </p>
                      </div>
                    ) : null}
                    <div className="text-[10px] text-stone-400 space-y-0.5">
                      <p>
                        建立：
                        {r.createdAt.toDate().toLocaleString("zh-TW", {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p>
                        更新：
                        {r.updatedAt.toDate().toLocaleString("zh-TW", {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {r.assignedAdminIdentity ? (
                        <p>
                          處理人：
                          {profileByIdentityHex.get(r.assignedAdminIdentity.toHexString())?.displayName ||
                            adminEmailByHex.get(r.assignedAdminIdentity.toHexString()) ||
                            "—"}
                        </p>
                      ) : null}
                      {r.resolutionNote ? <p>說明：{r.resolutionNote}</p> : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/[0.08] bg-white p-4 space-y-3">
                    <p className="text-[13px] font-black text-stone-900">審核操作</p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] font-bold text-stone-600">
                        狀態
                        <select
                          value={adminReportStatus}
                          onChange={(e) => onSetAdminReportStatus(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[13px]"
                        >
                          <option value="open">待審核</option>
                          <option value="in_review">審核中</option>
                          <option value="resolved">已結案</option>
                          <option value="dismissed">不予處理</option>
                        </select>
                      </label>
                      <label className="text-[11px] font-bold text-stone-600">
                        優先級（0-9）
                        <input
                          type="number"
                          min={0}
                          max={9}
                          value={adminReportPriority}
                          onChange={(e) =>
                            onSetAdminReportPriority(
                              Math.max(0, Math.min(9, Number(e.target.value) || 0)),
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[13px]"
                        />
                      </label>
                    </div>
                    <label className="block text-[11px] font-bold text-stone-600">
                      備註說明
                      <span className="ml-1 text-[10px] font-normal text-stone-400">
                        （同步存入帳號處分記錄，用於舉報結果通知）
                      </span>
                      <textarea
                        rows={2}
                        value={adminResolutionNote}
                        onChange={(e) => {
                          onSetAdminResolutionNote(e.target.value);
                          onSetSanctionDetailDraft(e.target.value);
                        }}
                        placeholder="例：言論違規，已給予警告"
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[13px]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void onSubmitAdminReportUpdate()}
                      disabled={adminActionLoading}
                      className="rounded-xl bg-rose-600 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-60"
                    >
                      {adminActionLoading ? "提交中…" : "更新舉報單"}
                    </button>

                    {targetCapsule || targetSquare ? (
                      <div className="border-t border-stone-100 pt-3 space-y-1">
                        <p className="text-[11px] font-bold text-stone-600">刪除違規內容</p>
                        {targetCapsule ? (
                          <button
                            type="button"
                            disabled={adminActionLoading}
                            onClick={async () => {
                              if (!window.confirm("確定刪除此膠囊？")) return;
                              await onAdminDeleteCapsule(targetCapsule.id);
                            }}
                            className="rounded-xl border-2 border-red-400 bg-red-100 px-3 py-1.5 text-[11px] font-bold text-red-800 disabled:opacity-60"
                          >
                            刪除膠囊
                          </button>
                        ) : null}
                        {targetSquare ? (
                          <button
                            type="button"
                            disabled={adminActionLoading}
                            onClick={async () => {
                              if (!window.confirm("確定刪除此廣場貼文？")) return;
                              await onAdminDeleteSquarePost(targetSquare.sourceMessageId);
                            }}
                            className="rounded-xl border-2 border-red-400 bg-red-100 px-3 py-1.5 text-[11px] font-bold text-red-800 disabled:opacity-60"
                          >
                            刪除廣場貼文
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="border-t border-stone-100 pt-3 space-y-2">
                      <p className="text-[12px] font-black text-stone-900">
                        帳號快速動作{!targetAccountHex ? "（無法識別帳號）" : ""}
                      </p>
                      {targetAccountHex ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={adminActionLoading}
                            onClick={() => {
                              onSetAdminResolutionNote(presetReporter.dismiss);
                              onSetSanctionDetailDraft(presetSanction.dismiss);
                              void onQuickDismissReport();
                            }}
                            className="rounded-xl border-2 border-stone-300 bg-white px-3 py-1.5 text-[11px] font-bold text-stone-600 disabled:opacity-60"
                          >
                            不予處理
                          </button>
                          <button
                            type="button"
                            disabled={adminActionLoading}
                            onClick={() => {
                              onSetAdminResolutionNote(presetReporter.warn);
                              onSetSanctionDetailDraft(presetSanction.warn);
                              onSetSanctionTypeDraft("warn");
                              onSetSanctionBanDays(0);
                              void onSubmitSanctionForSelectedReport();
                            }}
                            className="rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 disabled:opacity-60"
                          >
                            警告
                          </button>
                          <button
                            type="button"
                            disabled={adminActionLoading}
                            onClick={() => {
                              onSetAdminResolutionNote(presetReporter.mute7);
                              onSetSanctionDetailDraft(presetSanction.mute7);
                              onSetSanctionTypeDraft("mute");
                              onSetSanctionBanDays(7);
                              void onSubmitSanctionForSelectedReport();
                            }}
                            className="rounded-xl border-2 border-orange-300 bg-orange-50 px-3 py-1.5 text-[11px] font-bold text-orange-700 disabled:opacity-60"
                          >
                            禁言7天
                          </button>
                          <button
                            type="button"
                            disabled={adminActionLoading}
                            onClick={() => {
                              onSetAdminResolutionNote(presetReporter.mute30);
                              onSetSanctionDetailDraft(presetSanction.mute30);
                              onSetSanctionTypeDraft("mute");
                              onSetSanctionBanDays(30);
                              void onSubmitSanctionForSelectedReport();
                            }}
                            className="rounded-xl border-2 border-orange-400 bg-orange-100 px-3 py-1.5 text-[11px] font-bold text-orange-800 disabled:opacity-60"
                          >
                            禁言30天
                          </button>
                          <button
                            type="button"
                            disabled={adminActionLoading}
                            onClick={() => {
                              onSetAdminResolutionNote(presetReporter.ban7);
                              onSetSanctionDetailDraft(presetSanction.ban7);
                              onSetSanctionTypeDraft("ban");
                              onSetSanctionBanDays(7);
                              void onSubmitSanctionForSelectedReport();
                            }}
                            className="rounded-xl border-2 border-red-300 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-700 disabled:opacity-60"
                          >
                            封禁7天
                          </button>
                          <button
                            type="button"
                            disabled={adminActionLoading}
                            onClick={() => {
                              onSetAdminResolutionNote(presetReporter.ban30);
                              onSetSanctionDetailDraft(presetSanction.ban30);
                              onSetSanctionTypeDraft("ban");
                              onSetSanctionBanDays(30);
                              void onSubmitSanctionForSelectedReport();
                            }}
                            className="rounded-xl border-2 border-red-400 bg-red-100 px-3 py-1.5 text-[11px] font-bold text-red-800 disabled:opacity-60"
                          >
                            封禁30天
                          </button>
                          <button
                            type="button"
                            disabled={adminActionLoading}
                            onClick={() => {
                              onSetAdminResolutionNote(presetReporter.banPermanent);
                              onSetSanctionDetailDraft(presetSanction.banPermanent);
                              onSetSanctionTypeDraft("ban");
                              onSetSanctionBanDays("permanent");
                              void onSubmitSanctionForSelectedReport();
                            }}
                            className="rounded-xl border-2 border-stone-800 bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
                          >
                            永久封禁
                          </button>
                        </div>
                      ) : null}
                      <p className="text-[10px] text-stone-400">
                        備註說明會同步帶入上方「備註說明」欄位
                      </p>
                    </div>
                    {adminActionError ? (
                      <p className="text-[12px] font-semibold text-red-600">
                        {adminActionError}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    );
  }

  if (activeTab === "admin_ops") {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4 px-2 py-2 md:px-5 md:py-4 overflow-y-auto apple-scroll max-h-full">
        <div className="rounded-2xl border-2 border-stone-900 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4 text-white shadow-xl md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/90">
                超管指揮台
              </p>
              <p className="mt-1 text-[20px] font-black leading-tight md:text-2xl">
                即時稼動總覽
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {(
              [
                ["註冊帳號", superOpsStats.profiles, "profiles"],
                ["活躍膠囊", superOpsStats.capsules, "cap"],
                ["廣場貼文", superOpsStats.squarePosts, "sq"],
                ["未結舉報", superOpsStats.reportsNonResolved, "rp"],
                ["生效處分", superOpsStats.sanctionsActive, "sn"],
                ["申訴單", superOpsStats.appeals, "ap"],
                ["審核佇列", superOpsStats.modQueue, "mq"],
                ["啟用管理員", superOpsStats.admins, "ad"],
              ] as const
            ).map(([label, n, key]) => (
              <div
                key={key}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm flex flex-row items-cemter justify-between"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200/80">
                  <Activity className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  {label}
                </div>
                <p className="mt-2 text-[22px] font-black tabular-nums md:text-3xl">{n}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.08] bg-white p-4 space-y-3 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-black text-stone-900">
              管理帳號（啟用 {activeAdminRows.length} / 已移除 {inactiveAdminRows.length}）
            </p>
            <button
              type="button"
              onClick={onOpenAdminAddModal}
              className="shrink-0 rounded-xl border-2 border-rose-400 bg-rose-500 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-rose-600"
            >
              + 新增管理員
            </button>
          </div>
          {activeAdminRows.length === 0 ? (
            <p className="text-[12px] text-stone-500">目前還沒有管理帳號。</p>
          ) : (
            <ul className="max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 p-2 md:max-h-48">
              {activeAdminRows.map((r) => {
                const hex = r.adminIdentity.toHexString();
                const em = adminEmailByHex.get(hex);
                const isUnknown = !em;
                return (
                  <li
                    key={hex}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-[11px] text-stone-700",
                      isUnknown ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-[11px]">
                        <span className="font-bold text-stone-900">
                          {adminRoleLabel[r.role] ?? r.role}
                        </span>
                        {isUnknown ? (
                          <span className="ml-1 text-amber-700">⚠ 未知帳號</span>
                        ) : (
                          <span className="ml-1">{em}</span>
                        )}
                        {r.adminIdentity.isEqual(identity) ? "（你）" : ""}
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenAdminEditModal(r, em ?? "")}
                          className="rounded border border-stone-300 bg-white px-2 py-0.5 text-[10px] font-semibold"
                        >
                          編輯
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            r.role !== "super_admin" &&
                            !r.adminIdentity.isEqual(identity) &&
                            void onSetSingleAdminActive(r, false)
                          }
                          disabled={
                            adminActionLoading ||
                            r.role === "super_admin" ||
                            r.adminIdentity.isEqual(identity)
                          }
                          className={cn(
                            "relative flex items-center",
                            (r.role === "super_admin" || r.adminIdentity.isEqual(identity)) &&
                              "cursor-not-allowed opacity-50",
                          )}
                          role="switch"
                          aria-checked={true}
                          title={
                            r.role === "super_admin"
                              ? "超級管理員需先降級才可移除管理權"
                              : undefined
                          }
                        >
                          <span className="flex h-6 w-12 items-center rounded-full bg-emerald-500 transition-colors duration-200">
                            <span className="absolute left-1.5 text-[8px] font-bold text-white select-none">
                              開啟
                            </span>
                            <span className="ml-[calc(100%-1.2rem)] h-4 w-4 rounded-full bg-white shadow" />
                          </span>
                        </button>
                      </div>
                    </div>
                    {isUnknown ? (
                      <div className="mt-1.5 flex gap-1.5">
                        <input
                          type="text"
                          placeholder="輸入此管理員的 email 重新綁定"
                          list={`admin-rebind-candidates-${hex}`}
                          className="flex-1 rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px]"
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            const val = (e.currentTarget.value ?? "").trim().toLowerCase();
                            if (!val) return;
                            const target = profileByEmail.get(val);
                            if (!target) {
                              onSetAdminActionError(`找不到帳號 ${val}`);
                              return;
                            }
                            onSetAdminGrantEmail(val);
                            onSetAdminGrantRole(r.role);
                            onSetAdminGrantActive(true);
                            onSetAdminAddOpen(true);
                          }}
                        />
                        <datalist id={`admin-rebind-candidates-${hex}`}>
                          {adminGrantEmailCandidates.map((em) => (
                            <option key={em} value={em} />
                          ))}
                        </datalist>
                        <span className="self-center text-[10px] text-amber-600">
                          按 Enter 重設
                        </span>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {inactiveAdminRows.length > 0 ? (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-2">
              <p className="mb-1 text-[11px] font-bold text-stone-600">已移除管理權</p>
              <ul className="space-y-1.5">
                {inactiveAdminRows.map((r) => {
                  const hex = r.adminIdentity.toHexString();
                  const em = adminEmailByHex.get(hex) ?? "未知帳號";
                  return (
                    <li
                      key={`inactive-${hex}`}
                      className="rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[11px] text-stone-700"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-[11px]">
                          <span className="font-bold text-stone-900">
                            {adminRoleLabel[r.role] ?? r.role}
                          </span>{" "}
                          · {em}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            disabled={adminActionLoading}
                            onClick={async () => {
                              if (
                                !window.confirm(`確定從管理表刪除 ${em} 的記錄？此操作不影響帳號本身。`)
                              ) {
                                return;
                              }
                              await onAdminDeleteRoleRecord(r.adminIdentity);
                            }}
                            className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 disabled:opacity-60"
                          >
                            刪除記錄
                          </button>
                          <button
                            type="button"
                            onClick={() => void onSetSingleAdminActive(r, true)}
                            disabled={adminActionLoading}
                            className="relative flex items-center disabled:opacity-50"
                            role="switch"
                            aria-checked={false}
                          >
                            <span className="flex h-6 w-12 items-center rounded-full bg-stone-300 transition-colors duration-200">
                              <span className="absolute right-1.5 text-[8px] font-bold text-stone-500 select-none">
                                關閉
                              </span>
                              <span className="ml-1 h-4 w-4 rounded-full bg-white shadow" />
                            </span>
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {adminActionError ? (
            <p className="text-[12px] font-semibold text-red-600">{adminActionError}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl w-full mx-auto space-y-3">
      <div className="rounded-2xl border border-black/[0.08] bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-black text-stone-900">管理帳號</p>
          <span className="text-[11px] font-semibold text-stone-500">
            共 {activeAdminRows.length} 位啟用
          </span>
        </div>
        {activeAdminRows.length === 0 ? (
          <p className="text-[12px] text-stone-500">目前還沒有管理帳號。</p>
        ) : (
          <ul className="space-y-1.5">
            {activeAdminRows.map((r) => (
              <li
                key={r.adminIdentity.toHexString()}
                className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-[12px] text-stone-700 break-all"
              >
                <span className="font-bold text-stone-900">{r.role}</span> ·{" "}
                {r.adminIdentity.toHexString()}
                {r.adminIdentity.isEqual(identity) ? "（你）" : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-2xl border border-black/[0.08] bg-white p-4 space-y-3">
        <p className="text-[13px] font-black text-stone-900">帳號搜尋與一鍵停權 / 復權</p>
        <input
          value={adminAccountSearch}
          onChange={(e) => onSetAdminAccountSearch(e.target.value)}
          placeholder="搜尋暱稱 / 信箱 / identity"
          className="w-full rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[12px] text-stone-800"
        />
        <div className="max-h-40 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 p-1">
          {adminSearchRows.length === 0 ? (
            <p className="px-2 py-2 text-[12px] text-stone-500">找不到符合帳號</p>
          ) : (
            adminSearchRows.map((p) => {
              const hx = p.ownerIdentity.toHexString();
              const selected = hx === adminTargetIdentityHex;
              return (
                <button
                  key={hx}
                  type="button"
                  onClick={() => onSetAdminTargetIdentityHex(hx)}
                  className={cn(
                    "mb-1 w-full rounded-md border px-2 py-1.5 text-left text-[12px] transition-all",
                    selected
                      ? "border-violet-300 bg-violet-50 text-violet-800 ring-2 ring-violet-300/40"
                      : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
                  )}
                >
                  <p className="font-bold">{p.displayName || "(未命名)"}</p>
                  <p className="truncate text-[11px]">{p.email}</p>
                </button>
              );
            })
          )}
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2">
          <p className="text-[11px] font-bold text-stone-700">
            目前選中：
            {selectedAdminTargetProfile
              ? `${selectedAdminTargetProfile.displayName || "(未命名)"} / ${selectedAdminTargetProfile.email}`
              : "未選擇帳號"}
          </p>
          <p className="mt-0.5 break-all text-[10px] text-stone-500">
            {adminTargetIdentityHex || "—"}
          </p>
          <p className="mt-1 text-[10px] text-stone-500">
            啟用處分：{activeSanctionsForTarget.length}（ban：
            {activeSanctionsForTarget.filter((s) => s.sanctionType === "ban").length}）
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onQuickBanTargetAccount()}
            disabled={adminActionLoading || !adminTargetIdentityHex}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-60"
          >
            {adminActionLoading ? "處理中…" : "一鍵停權"}
          </button>
          <button
            type="button"
            onClick={() => void onQuickUnbanTargetAccount()}
            disabled={adminActionLoading || !adminTargetIdentityHex}
            className="rounded-lg border border-emerald-500 bg-white px-3 py-1.5 text-[12px] font-bold text-emerald-700 disabled:opacity-60"
          >
            {adminActionLoading ? "處理中…" : "一鍵復權"}
          </button>
        </div>
      </div>
    </div>
  );
}

type AdminModalsProps = {
  adminReportModalOpen: boolean;
  selectedAdminReport: ReportTicket | null;
  selectedAdminSnapshot: ReportTargetSnapshot | null;
  adminActionLoading: boolean;
  adminActionError: string;
  adminReportStatus: string;
  adminReportPriority: number;
  adminResolutionNote: string;
  adminGrantEmail: string;
  adminGrantRole: string;
  adminGrantActive: boolean;
  adminGrantEmailCandidates: readonly string[];
  adminAddOpen: boolean;
  adminEditOpen: boolean;
  adminEditEmail: string;
  adminEditRole: string;
  adminEditActive: boolean;
  presetReporter: Record<string, string>;
  presetSanction: Record<string, string>;
  onSetAdminReportModalOpen: (open: boolean) => void;
  onSetAdminReportStatus: (value: string) => void;
  onSetAdminReportPriority: (value: number) => void;
  onSetAdminResolutionNote: (value: string) => void;
  onSetSanctionDetailDraft: (value: string) => void;
  onSetSanctionTypeDraft: (value: "mute" | "ban" | "warn" | "limit") => void;
  onSetSanctionBanDays: (value: number | "permanent") => void;
  onSubmitAdminReportUpdate: () => void | Promise<void>;
  onQuickDismissReport: () => void | Promise<void>;
  onSubmitSanctionForSelectedReport: () => void | Promise<void>;
  onSetAdminGrantEmail: (value: string) => void;
  onSetAdminGrantRole: (value: string) => void;
  onSetAdminGrantActive: React.Dispatch<React.SetStateAction<boolean>>;
  onSetAdminAddOpen: (open: boolean) => void;
  onSetAdminActionError: (value: string) => void;
  onSubmitAdminRoleUpsert: () => Promise<void>;
  onSetAdminEditOpen: (open: boolean) => void;
  onSetAdminEditRole: (value: string) => void;
  onSetAdminEditActive: React.Dispatch<React.SetStateAction<boolean>>;
  onSubmitAdminEdit: () => void | Promise<void>;
};

export function AdminModals({
  adminReportModalOpen,
  selectedAdminReport,
  selectedAdminSnapshot,
  adminActionLoading,
  adminActionError,
  adminReportStatus,
  adminReportPriority,
  adminResolutionNote,
  adminGrantEmail,
  adminGrantRole,
  adminGrantActive,
  adminGrantEmailCandidates,
  adminAddOpen,
  adminEditOpen,
  adminEditEmail,
  adminEditRole,
  adminEditActive,
  presetReporter,
  presetSanction,
  onSetAdminReportModalOpen,
  onSetAdminReportStatus,
  onSetAdminReportPriority,
  onSetAdminResolutionNote,
  onSetSanctionDetailDraft,
  onSetSanctionTypeDraft,
  onSetSanctionBanDays,
  onSubmitAdminReportUpdate,
  onQuickDismissReport,
  onSubmitSanctionForSelectedReport,
  onSetAdminGrantEmail,
  onSetAdminGrantRole,
  onSetAdminGrantActive,
  onSetAdminAddOpen,
  onSetAdminActionError,
  onSubmitAdminRoleUpsert,
  onSetAdminEditOpen,
  onSetAdminEditRole,
  onSetAdminEditActive,
  onSubmitAdminEdit,
}: AdminModalsProps) {
  return (
    <>
      <AnimatePresence>
        {adminReportModalOpen && selectedAdminReport ? (
          <motion.div
            key="admin-report-modal"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-end justify-center bg-black/45 p-4 sm:items-center"
            onClick={() => !adminActionLoading && onSetAdminReportModalOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border-[2px] border-stone-900 bg-white p-4 max-h-[90dvh] overflow-y-auto apple-scroll"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-[16px] font-black text-stone-900">處理舉報單</p>
                  <p className="mt-0.5 text-[12px] font-bold text-rose-600 uppercase">
                    {selectedAdminReport.status} · 優先級{" "}
                    {Number(selectedAdminReport.priority)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSetAdminReportModalOpen(false)}
                  className="shrink-0 rounded-full p-1 hover:bg-stone-100"
                >
                  <X className="h-4 w-4 text-stone-500" />
                </button>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-1 text-[12px] mb-3">
                <p>
                  <span className="font-bold text-stone-700">類型：</span>
                  {selectedAdminReport.targetType} ·{" "}
                  {selectedAdminReport.reasonCode || "未填原因"}
                </p>
                <p className="break-all">
                  <span className="font-bold text-stone-700">目標：</span>
                  {selectedAdminReport.targetId}
                </p>
                {selectedAdminReport.detailText ? (
                  <p className="whitespace-pre-wrap text-stone-600">
                    {selectedAdminReport.detailText}
                  </p>
                ) : null}
                {selectedAdminSnapshot ? (
                  <p className="whitespace-pre-wrap text-stone-500 text-[11px]">
                    快照：{selectedAdminSnapshot.snapshotText}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2 mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-bold text-stone-600">
                    狀態
                    <select
                      value={adminReportStatus}
                      onChange={(e) => onSetAdminReportStatus(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[13px]"
                    >
                      <option value="open">待審核</option>
                      <option value="in_review">審核中</option>
                      <option value="resolved">已結案</option>
                      <option value="dismissed">不予處理</option>
                    </select>
                  </label>
                  <label className="text-[11px] font-bold text-stone-600">
                    優先級（0-9）
                    <input
                      type="number"
                      min={0}
                      max={9}
                      value={adminReportPriority}
                      onChange={(e) =>
                        onSetAdminReportPriority(
                          Math.max(0, Math.min(9, Number(e.target.value) || 0)),
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[13px]"
                    />
                  </label>
                </div>
                <label className="block text-[11px] font-bold text-stone-600">
                  備註說明
                  <span className="ml-1 text-[10px] font-normal text-stone-400">
                    （顯示給舉報人，同步存入帳號處分）
                  </span>
                  <textarea
                    rows={2}
                    value={adminResolutionNote}
                    onChange={(e) => {
                      onSetAdminResolutionNote(e.target.value);
                      onSetSanctionDetailDraft(e.target.value);
                    }}
                    placeholder="例：言論違規，已給予警告"
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[13px]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void onSubmitAdminReportUpdate()}
                  disabled={adminActionLoading}
                  className="w-full rounded-xl bg-rose-600 px-3 py-2 text-[13px] font-bold text-white disabled:opacity-60"
                >
                  {adminActionLoading ? "提交中…" : "更新舉報單"}
                </button>
              </div>
              <div className="border-t border-stone-200 pt-3 space-y-2">
                <p className="text-[12px] font-black text-stone-900">快速動作</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      onSetAdminResolutionNote(presetReporter.dismiss);
                      onSetSanctionDetailDraft(presetSanction.dismiss);
                      void onQuickDismissReport();
                    }}
                    className="rounded-xl border-2 border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-600 disabled:opacity-60"
                  >
                    不予處理
                  </button>
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      onSetAdminResolutionNote(presetReporter.warn);
                      onSetSanctionDetailDraft(presetSanction.warn);
                      onSetSanctionTypeDraft("warn");
                      onSetSanctionBanDays(0);
                      void onSubmitSanctionForSelectedReport();
                    }}
                    className="rounded-xl border-2 border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 disabled:opacity-60"
                  >
                    警告
                  </button>
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      onSetAdminResolutionNote(presetReporter.mute7);
                      onSetSanctionDetailDraft(presetSanction.mute7);
                      onSetSanctionTypeDraft("mute");
                      onSetSanctionBanDays(7);
                      void onSubmitSanctionForSelectedReport();
                    }}
                    className="rounded-xl border-2 border-orange-300 bg-orange-50 px-2.5 py-1.5 text-[11px] font-bold text-orange-700 disabled:opacity-60"
                  >
                    禁言7天
                  </button>
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      onSetAdminResolutionNote(presetReporter.mute30);
                      onSetSanctionDetailDraft(presetSanction.mute30);
                      onSetSanctionTypeDraft("mute");
                      onSetSanctionBanDays(30);
                      void onSubmitSanctionForSelectedReport();
                    }}
                    className="rounded-xl border-2 border-orange-400 bg-orange-100 px-2.5 py-1.5 text-[11px] font-bold text-orange-800 disabled:opacity-60"
                  >
                    禁言30天
                  </button>
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      onSetAdminResolutionNote(presetReporter.ban7);
                      onSetSanctionDetailDraft(presetSanction.ban7);
                      onSetSanctionTypeDraft("ban");
                      onSetSanctionBanDays(7);
                      void onSubmitSanctionForSelectedReport();
                    }}
                    className="rounded-xl border-2 border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 disabled:opacity-60"
                  >
                    封禁7天
                  </button>
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      onSetAdminResolutionNote(presetReporter.ban30);
                      onSetSanctionDetailDraft(presetSanction.ban30);
                      onSetSanctionTypeDraft("ban");
                      onSetSanctionBanDays(30);
                      void onSubmitSanctionForSelectedReport();
                    }}
                    className="rounded-xl border-2 border-red-400 bg-red-100 px-2.5 py-1.5 text-[11px] font-bold text-red-800 disabled:opacity-60"
                  >
                    封禁30天
                  </button>
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      onSetAdminResolutionNote(presetReporter.banPermanent);
                      onSetSanctionDetailDraft(presetSanction.banPermanent);
                      onSetSanctionTypeDraft("ban");
                      onSetSanctionBanDays("permanent");
                      void onSubmitSanctionForSelectedReport();
                    }}
                    className="rounded-xl border-2 border-stone-800 bg-stone-900 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
                  >
                    永久封禁
                  </button>
                </div>
              </div>
              {adminActionError ? (
                <p className="mt-2 text-[12px] font-semibold text-red-600">
                  {adminActionError}
                </p>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {adminAddOpen ? (
          <motion.div
            key="admin-add-modal"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-end justify-center bg-black/45 p-4 sm:items-center"
            onClick={() => !adminActionLoading && onSetAdminAddOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border-[2px] border-stone-900 bg-white p-4"
            >
              <p className="text-[16px] font-black text-stone-900">新增管理員</p>
              <div className="mt-3 space-y-3">
                <label className="block text-[11px] font-bold text-stone-600">
                  帳號 Email
                  <input
                    value={adminGrantEmail}
                    onChange={(e) => onSetAdminGrantEmail(e.target.value)}
                    placeholder="輸入帳號 email（例如 foo@bar.com）"
                    list="admin-email-candidates-add"
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[13px]"
                    autoFocus
                  />
                  <datalist id="admin-email-candidates-add">
                    {adminGrantEmailCandidates.map((em) => (
                      <option key={em} value={em} />
                    ))}
                  </datalist>
                </label>
                <div>
                  <p className="text-[11px] font-bold text-stone-600 mb-1">權限</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={adminGrantRole}
                      onChange={(e) => onSetAdminGrantRole(e.target.value)}
                      className="flex-1 rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[13px]"
                    >
                      <option value="moderator">管理員</option>
                      <option value="reviewer">審核員</option>
                      <option value="super_admin">超級管理員</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => onSetAdminGrantActive((v) => !v)}
                      className="relative shrink-0 flex items-center"
                      aria-checked={adminGrantActive}
                      role="switch"
                    >
                      <span
                        className={cn(
                          "flex h-7 w-14 items-center rounded-full transition-colors duration-200",
                          adminGrantActive ? "bg-emerald-500" : "bg-stone-300",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 text-[9px] font-bold transition-all duration-200 select-none",
                            adminGrantActive
                              ? "left-2 text-white"
                              : "right-1.5 text-stone-500",
                          )}
                        >
                          {adminGrantActive ? "開啟" : "關閉"}
                        </span>
                        <span
                          className={cn(
                            "h-5 w-5 rounded-full bg-white shadow transition-all duration-200",
                            adminGrantActive ? "ml-[calc(100%-1.35rem)]" : "ml-1",
                          )}
                        />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              {adminActionError ? (
                <p className="mt-2 text-[12px] font-medium text-red-600">
                  {adminActionError}
                </p>
              ) : null}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSetAdminAddOpen(false);
                    onSetAdminActionError("");
                  }}
                  disabled={adminActionLoading}
                  className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[13px] font-semibold text-stone-700"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onSubmitAdminRoleUpsert();
                    if (!adminActionError) onSetAdminAddOpen(false);
                  }}
                  disabled={adminActionLoading}
                  className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  {adminActionLoading ? "儲存中…" : "確認新增"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {adminEditOpen ? (
          <motion.div
            key="admin-edit-modal"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-end justify-center bg-black/45 p-4 sm:items-center"
            onClick={() => !adminActionLoading && onSetAdminEditOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border-[2px] border-stone-900 bg-white p-4"
            >
              <p className="text-[16px] font-black text-stone-900">編輯管理員</p>
              <p className="mt-1 text-[12px] text-stone-600 truncate">
                {adminEditEmail || "未知帳號"}
              </p>
              <div className="mt-3">
                <p className="text-[11px] font-bold text-stone-600 mb-1">權限</p>
                <div className="flex items-center gap-2">
                  <select
                    value={adminEditRole}
                    onChange={(e) => onSetAdminEditRole(e.target.value)}
                    className="flex-1 rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[13px]"
                  >
                    <option value="moderator">管理員</option>
                    <option value="reviewer">審核員</option>
                    <option value="super_admin">超級管理員</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      adminEditRole !== "super_admin" &&
                      onSetAdminEditActive((v) => !v)
                    }
                    disabled={adminEditRole === "super_admin"}
                    className={cn(
                      "relative shrink-0 flex items-center",
                      adminEditRole === "super_admin" && "cursor-not-allowed opacity-70",
                    )}
                    aria-checked={adminEditRole === "super_admin" ? true : adminEditActive}
                    role="switch"
                    title={
                      adminEditRole === "super_admin"
                        ? "超級管理員啟用狀態鎖定，不可停用"
                        : undefined
                    }
                  >
                    <span
                      className={cn(
                        "flex h-7 w-14 items-center rounded-full transition-colors duration-200",
                        adminEditRole === "super_admin" || adminEditActive
                          ? "bg-emerald-500"
                          : "bg-stone-300",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 text-[9px] font-bold transition-all duration-200 select-none",
                          adminEditRole === "super_admin" || adminEditActive
                            ? "left-2 text-white"
                            : "right-1.5 text-stone-500",
                        )}
                      >
                        {adminEditRole === "super_admin" || adminEditActive
                          ? "開啟"
                          : "關閉"}
                      </span>
                      <span
                        className={cn(
                          "h-5 w-5 rounded-full bg-white shadow transition-all duration-200",
                          adminEditRole === "super_admin" || adminEditActive
                            ? "ml-[calc(100%-1.35rem)]"
                            : "ml-1",
                        )}
                      />
                    </span>
                  </button>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => onSetAdminEditOpen(false)}
                  disabled={adminActionLoading}
                  className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[13px] font-semibold text-stone-700"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void onSubmitAdminEdit()}
                  disabled={adminActionLoading}
                  className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  {adminActionLoading ? "儲存中…" : "儲存"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
