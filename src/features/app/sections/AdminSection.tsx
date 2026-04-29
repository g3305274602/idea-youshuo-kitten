import type React from "react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Activity, ChevronRight, Image, LayoutGrid, Lock, ShieldAlert, UserCog, X } from "lucide-react";
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
import {
  type PartyDisplay,
  formatReportParty,
  isReportClosedStatus,
  reportReasonLabel,
  reportStatusLabel,
  reportTargetTypeLabel,
  resolveReportTargetIdentityHex,
  snapshotAuthorEmail,
  snapshotIdentityHints,
} from "../adminReportDisplay.ts";
import {
  SuperAdminTrendChartsPanel,
  type SuperAdminTrendsBundle,
} from "../../admin/superAdminTrendCharts";
import { CdSelect } from "../components/CdSelect";
import { useEscapeClose } from "../hooks/useEscapeClose";

function ReportCopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const v = value.trim();
  if (!v) return null;
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <span className="shrink-0 text-[10px] text-white/40 min-w-10">{label}</span>
      <span className="min-w-0 flex-1 break-all font-mono text-[12px] leading-snug text-white/85">{v}</span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(v).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="shrink-0 rounded-md border border-white/12 bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold text-[#FFD54F] hover:bg-white/10"
      >
        {copied ? "已複製" : "複製"}
      </button>
    </div>
  );
}

function PartyCopyBlock({ party }: { party: PartyDisplay }) {
  const email = party.emailForCopy.trim();
  const accountId = party.accountIdForCopy.trim();
  if (!email && !accountId) return null;
  return (
    <div className="mt-1.5 space-y-1 border-t border-white/10 pt-1.5">
      <ReportCopyRow label="信箱" value={email} />
      <ReportCopyRow label="帳號 ID" value={accountId} />
    </div>
  );
}

/** 超管總覽：堆疊比例條（依各段 value 用 flex 比例分配，避免單一段時寬度異常） */
function SuperOpsStackedBar({
  segments,
}: {
  segments: readonly { value: number; className: string; title: string }[];
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total <= 0) {
    return <div className="h-4 w-full rounded-full bg-white/[0.08]" aria-hidden />;
  }
  return (
    <div
      className="flex h-4 w-full min-h-4 overflow-hidden rounded-full border border-white/15"
      role="img"
      aria-label="比例分佈"
    >
      {segments.map((s, i) =>
        s.value > 0 ? (
          <div
            key={i}
            title={`${s.title}：${s.value}`}
            className={cn("min-h-4 min-w-0", s.className)}
            style={{ flex: `${s.value} 1 0%` }}
          />
        ) : null,
      )}
    </div>
  );
}

function SuperOpsBarRow({
  label,
  value,
  max,
  barClass,
}: {
  label: string;
  value: number;
  max: number;
  barClass: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-[10px] text-white/75">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-white">{value}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10">
        <div className={cn("h-2 rounded-full", barClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

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
  onSelectAvatar: () => void;
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
  onSelectAvatar,
}: AdminSidebarProps) {
  const unresolvedReportCount = adminReportsSorted.filter(
    (r) => !isReportClosedStatus(r.status),
  ).length;

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
            className="cd-btn-primary mt-3 py-2 text-[12px] font-bold disabled:opacity-60"
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

  /** 左側選中條用 border，不用 inset shadow：全域 button:focus { box-shadow:none } 會吃掉 shadow。 */
  const rowBaseClass =
    "relative box-border flex w-full items-center gap-3 border-l-[3px] border-l-transparent px-3 py-2.5 text-left text-white/90 transition-[background-color,border-color] hover:bg-white/[0.04]";
  const rowActiveClass = "border-l-[#FFD54F] bg-[#FFD54F]/10";

  return (
    <div className="relative z-[1] overflow-hidden rounded-2xl border border-white/10 bg-[rgba(26,27,34,0.65)] backdrop-blur-[16px] [-webkit-backdrop-filter:blur(16px)] shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]">
      {isSuperAdmin ? (
        <button
          type="button"
          onClick={onSelectAdminOpsMain}
          className={cn(
            rowBaseClass,
            activeTab === "admin_ops" &&
              adminSection === "main" &&
              rowActiveClass,
          )}
          aria-current={
            activeTab === "admin_ops" && adminSection === "main"
              ? "page"
              : undefined
          }
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#a78bfa]">
            <LayoutGrid className="h-4 w-4 text-white" strokeWidth={2.6} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold leading-tight text-white">可視化總覽</span>
            <span className="mt-0.5 block text-[11px] font-normal text-[#8E8E93]">超級管理面板</span>
          </span>
          <ChevronRight className="h-[18px] w-[18px] text-slate-400" aria-hidden />
          <span className="pointer-events-none absolute bottom-0 left-[3.25rem] right-3 h-px bg-white/10" aria-hidden />
        </button>
      ) : null}

      <button
        type="button"
        onClick={onSelectReports}
        className={cn(rowBaseClass, adminSection === "reports" && rowActiveClass)}
        aria-current={adminSection === "reports" ? "page" : undefined}
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F06292]">
          <ShieldAlert className="h-4 w-4 text-white" strokeWidth={2.6} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-tight text-white">處理舉報</span>
          <span className="mt-0.5 block text-[11px] font-normal text-[#8E8E93]">待處理案件與裁定</span>
        </span>
        {unresolvedReportCount > 0 ? (
          <span className="mr-1 inline-flex min-h-[1.4rem] min-w-[1.4rem] items-center justify-center rounded-full border border-red-200/40 bg-[linear-gradient(145deg,#ff2d6a_0%,#e11d48_45%,#fb923c_100%)] px-2 py-0.5 text-[12px] font-black tabular-nums text-white shadow-[0_0_12px_3px_rgba(244,63,94,0.55),0_1px_0_rgba(0,0,0,0.2)_inset]">
            {unresolvedReportCount}
          </span>
        ) : null}
        <ChevronRight className="h-[18px] w-[18px] text-slate-400" aria-hidden />
        <span className="pointer-events-none absolute bottom-0 left-[3.25rem] right-3 h-px bg-white/10" aria-hidden />
      </button>

      <button
        type="button"
        onClick={onSelectReview}
        className={cn(
          rowBaseClass,
          ((activeTab === "admin" && adminSection === "main") ||
            adminSection === "review") &&
            rowActiveClass,
        )}
        aria-current={
          (activeTab === "admin" && adminSection === "main") ||
          adminSection === "review"
            ? "page"
            : undefined
        }
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#69c49b]">
          <UserCog className="h-4 w-4 text-white" strokeWidth={2.6} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-tight text-white">帳號審核管理</span>
          <span className="mt-0.5 block text-[11px] font-normal text-[#8E8E93]">管理員與審核設定</span>
        </span>
        <ChevronRight className="h-[18px] w-[18px] text-slate-400" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onSelectAvatar}
        className={cn(rowBaseClass, adminSection === "avatar" && rowActiveClass)}
        aria-current={adminSection === "avatar" ? "page" : undefined}
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#38bdf8]">
          <Image className="h-4 w-4 text-white" strokeWidth={2.6} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-tight text-white">頭像設定</span>
          <span className="mt-0.5 block text-[11px] font-normal text-[#8E8E93]">價格、排序、上下架</span>
        </span>
        <ChevronRight className="h-[18px] w-[18px] text-slate-400" aria-hidden />
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
    reportsOpen: number;
    reportsInReview: number;
    reportsClosed: number;
    sanctionsActive: number;
    appeals: number;
    modQueue: number;
    modQueueDone: number;
    admins: number;
    adminRoleSuper: number;
    adminRoleMod: number;
    adminRoleReview: number;
    adminRoleOther: number;
  };
  superAdminTrends: SuperAdminTrendsBundle;
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
  avatarCatalogRows: readonly {
    avatarKey: string;
    seriesKey: string;
    seriesDisplayName: string;
    basePath: string;
    fileName: string;
    pricePoints: number;
    isPublished: boolean;
    sortOrder: number;
  }[];
  avatarCatalogEditBusy: boolean;
  avatarCatalogError: string;
  onAvatarUpdateItem: (args: {
    avatarKey: string;
    pricePoints: number;
    isPublished: boolean;
    sortOrder: number;
  }) => void | Promise<void>;
  onAvatarOpenCreateModal: () => void;
  onAvatarDeleteItem: (avatarKey: string) => void | Promise<void>;
  onAvatarCreateItem: (args: {
    seriesKey: string;
    seriesDisplayName: string;
    basePath: string;
    defaultPricePoints: number;
    sortOrderBase: number;
    generateCount: number;
  }) => void | Promise<void>;
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
    superAdminTrends,
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
    avatarCatalogRows,
    avatarCatalogEditBusy,
    avatarCatalogError,
    onAvatarUpdateItem,
    onAvatarOpenCreateModal,
    onAvatarDeleteItem,
    onAvatarCreateItem,
  } = props;
  const [avatarCreateOpen, setAvatarCreateOpen] = useState(false);
  const [newSeriesPrefix, setNewSeriesPrefix] = useState("");
  const [newSeriesDisplayName, setNewSeriesDisplayName] = useState("");
  const [newBasePath, setNewBasePath] = useState("/avatars/");
  const [newChargePoints, setNewChargePoints] = useState(false);
  const [newDefaultPricePointsInput, setNewDefaultPricePointsInput] = useState("");
  const [newSortOrderBaseInput, setNewSortOrderBaseInput] = useState("");
  const [newGenerateCountInput, setNewGenerateCountInput] = useState("5");
  const [avatarPreviewBroken, setAvatarPreviewBroken] = useState<Record<string, boolean>>({});
  const [seriesEditOpen, setSeriesEditOpen] = useState(false);
  const [seriesEditKey, setSeriesEditKey] = useState("");
  const [seriesEditDisplayName, setSeriesEditDisplayName] = useState("");
  const [seriesEditBasePath, setSeriesEditBasePath] = useState("/avatars/");
  const [seriesEditChargePoints, setSeriesEditChargePoints] = useState(false);
  const [seriesEditPriceInput, setSeriesEditPriceInput] = useState("");
  const [seriesEditSortOrderBaseInput, setSeriesEditSortOrderBaseInput] = useState("");
  const [seriesEditGenerateCountInput, setSeriesEditGenerateCountInput] = useState("5");
  const [avatarDeleteConfirmOpen, setAvatarDeleteConfirmOpen] = useState(false);
  const [avatarDeleteTargetKey, setAvatarDeleteTargetKey] = useState("");

  const toPublicAssetUrl = (basePath: string, fileName: string) => {
    const normalizedBase = String(basePath || "").trim();
    const normalizedFile = String(fileName || "").trim();
    const joined = `${normalizedBase.endsWith("/") ? normalizedBase : `${normalizedBase}/`}${normalizedFile}`
      .replace(/\/{2,}/g, "/")
      .replace(/^\//, "");
    return `${import.meta.env.BASE_URL}${joined}`;
  };

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
            className="cd-btn-primary mt-3 py-2 text-[12px] font-bold disabled:opacity-60"
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
          className="mt-4 rounded-xl border-2 border-stone-900 bg-[#FFD54F] px-4 py-2 text-[13px] font-black text-stone-900"
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
            "md:w-80 shrink-0 border-r border-white/10 flex flex-col overflow-hidden",
            selectedAdminReportId !== null ? "hidden md:flex" : "flex",
          )}
        >
          <div className="rounded-[99px] px-3 py-2 text-[12px] text-[#FFD54F] mb-1">
            申訴：{appealTicketRows.length} · 處分：
            {userSanctionRows.length} · 待審核：
            {
              moderationQueueRows.filter((m) => !isReportClosedStatus(m.status))
                .length
            }
          </div>
          <div className="shrink-0 flex rounded-[99px] items-center gap-1 border-b border-white/10 bg-white/[0.04] px-[1px] py-[1px]">
            <button
              type="button"
              onClick={() => onSetAdminReportFilter("pending")}
              className={cn(
                "flex-1 rounded-[99px] rounded-r-[0px] py-1.5 text-[11px] font-bold transition-colors",
                adminReportFilter === "pending"
                  ? "bg-rose-500 text-white"
                  : "text-white/60 hover:bg-white/[0.08]",
              )}
            >
              待處理 ({adminReportsSorted.filter((r) => !isReportClosedStatus(r.status)).length})
            </button>
            <button
              type="button"
              onClick={() => onSetAdminReportFilter("resolved")}
              className={cn(
                "flex-1 rounded-[99px] rounded-l-[0px] py-1.5 text-[11px] font-bold transition-colors",
                adminReportFilter === "resolved"
                  ? "bg-white/25 text-white"
                  : "text-white/60 hover:bg-white/[0.08]",
              )}
            >
              已處理 ({adminReportsSorted.filter((r) => isReportClosedStatus(r.status)).length})
            </button>
          </div>
          <div className="flex-1 overflow-y-auto apple-scroll p-2 space-y-1.5">
            {adminReportsSorted
              .filter((r) =>
                adminReportFilter === "resolved"
                  ? isReportClosedStatus(r.status)
                  : !isReportClosedStatus(r.status),
              )
              .map((r) => {
                const assigneeHex = r.assignedAdminIdentity?.toHexString() ?? "";
                const assignedProfile = assigneeHex
                  ? profileByIdentityHex.get(assigneeHex)
                  : undefined;
                const assigneeParty =
                  assigneeHex && r.assignedAdminIdentity
                    ? formatReportParty(assignedProfile, assigneeHex, {
                        emailFallback: adminEmailByHex.get(assigneeHex),
                      })
                    : null;
                const isSelected = selectedAdminReportId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectAdminReport(r)}
                    className={cn(
                      "ys-tap-list-row w-full text-left rounded-xl border px-3 py-2 transition-all",
                      isSelected
                        ? "border-rose-300/60 bg-rose-500/15 ring-2 ring-rose-300/30"
                        : "border-white/10 bg-white/[0.04] hover:border-white/20",
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          "text-[10px] font-bold",
                          r.status.toLowerCase() === "resolved" ||
                            r.status.toLowerCase() === "dismissed" ||
                            r.status.toLowerCase() === "rejected"
                            ? "text-stone-400"
                            : "text-rose-600",
                        )}
                      >
                        {reportStatusLabel(r.status)}
                      </span>
                      <span className="text-[10px] text-white/45 tabular-nums">
                        {r.updatedAt.toDate().toLocaleDateString("zh-TW", {
                          month: "numeric",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] font-semibold text-white truncate">
                      {reportTargetTypeLabel(r.targetType)} · {reportReasonLabel(r.reasonCode)}
                    </p>
                    {assigneeParty ? (
                      <p className="mt-0.5 text-[10px] text-white/60 truncate">
                        處理：{assigneeParty.primary}
                        {assigneeParty.accountIdLine
                          ? ` · ${assigneeParty.accountIdLine.replace(/^帳號 ID：/, "")}`
                          : ""}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            {adminReportsSorted.filter((r) =>
              adminReportFilter === "resolved"
                ? isReportClosedStatus(r.status)
                : !isReportClosedStatus(r.status),
            ).length === 0 ? (
              <p className="py-6 text-center text-[12px] text-white/50">
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
              <Lock className="w-10 h-10 mx-auto text-white/20 mb-2" />
              <p className="text-[13px] text-white/45">從左側選一張舉報單</p>
            </div>
          ) : (
            (() => {
              const r = selectedAdminReport;
              const reporterHex = r.reporterIdentity.toHexString();
              const reporterProfile = profileByIdentityHex.get(reporterHex);
              const snapHints = snapshotIdentityHints(selectedAdminSnapshot);
              let targetAccountHex = resolveReportTargetIdentityHex(
                r,
                capsuleMessageRows,
                squarePostRows,
              );
              const ttLower = r.targetType.trim().toLowerCase();
              if (!targetAccountHex && ttLower === "capsule" && snapHints.authorHex)
                targetAccountHex = snapHints.authorHex;
              if (!targetAccountHex && ttLower === "square_post" && snapHints.publisherHex)
                targetAccountHex = snapHints.publisherHex;
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
              const snapAuthorEmail = snapshotAuthorEmail(
                r.targetType,
                selectedAdminSnapshot?.snapshotJson,
              );
              const reporterParty = formatReportParty(reporterProfile, reporterHex, {
                emailFallback:
                  (r.reporterEmail && r.reporterEmail.trim()) ||
                  adminEmailByHex.get(reporterHex) ||
                  undefined,
                accountIdFallback:
                  (r.reporterAccountId && r.reporterAccountId.trim()) || undefined,
              });
              const targetHexForParty = targetAccountHex ?? "";
              const targetParty = formatReportParty(targetProfile, targetHexForParty, {
                emailFallback:
                  (targetHexForParty
                    ? adminEmailByHex.get(targetHexForParty)
                    : undefined) ||
                  (targetCapsule?.authorEmail?.trim() || undefined) ||
                  (targetSquare?.snapshotSenderEmail?.trim() || undefined) ||
                  (snapAuthorEmail || undefined),
                accountIdFallback:
                  targetCapsule?.authorAccountId?.trim() ||
                  targetSquare?.publisherAccountId?.trim() ||
                  undefined,
                displayNameFallback:
                  targetCapsule?.authorDisplayName?.trim() ||
                  targetSquare?.snapshotPublisherName?.trim() ||
                  undefined,
              });

              return (
                <div className="w-full max-w-2xl mx-auto space-y-4">
                  <div className="cd-card-raised rounded-2xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-[11px] font-bold",
                            ["resolved", "dismissed", "rejected"].includes(
                              r.status.trim().toLowerCase(),
                            )
                              ? "text-stone-400"
                              : "text-rose-600",
                          )}
                        >
                          {reportStatusLabel(r.status)}
                          {" · 優先級 "}
                          {Number(r.priority)}
                        </p>
                        <p className="mt-0.5 text-[15px] font-black text-white">
                          舉報
                          {reportTargetTypeLabel(r.targetType)}
                          {" · "}
                          {reportReasonLabel(r.reasonCode)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onClearSelectedAdminReport}
                        className="md:hidden shrink-0 rounded-full p-1 hover:bg-white/10"
                      >
                        <X className="h-4 w-4 text-white/60" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] space-y-1">
                        <p className="text-[10px] font-bold tracking-wide text-white/45">
                          舉報人
                        </p>
                        <p className="font-semibold text-white break-words">
                          {reporterParty.primary}
                        </p>
                        <p className="text-white/60 text-[10px] break-all">
                          {reporterParty.secondary}
                        </p>
                        <PartyCopyBlock party={reporterParty} />
                      </div>
                      <div className="rounded-xl border border-rose-300/30 bg-rose-500/12 px-3 py-2 text-[11px] space-y-1">
                        <p className="text-[10px] font-bold tracking-wide text-rose-200">
                          被舉報對象
                        </p>
                        <p className="font-semibold text-white break-words">
                          {targetAccountHex ? targetParty.primary : "無法解析（請看目標 ID）"}
                        </p>
                        <p className="text-white/60 text-[10px] break-all">
                          {targetAccountHex
                            ? targetParty.secondary
                            : `目標類型：${reportTargetTypeLabel(r.targetType)} · ID：${r.targetId}`}
                        </p>
                        {targetAccountHex ? (
                          <PartyCopyBlock party={targetParty} />
                        ) : (
                          <div className="mt-1.5 space-y-1 border-t border-rose-400/20 pt-1.5">
                            <ReportCopyRow label="目標 ID" value={r.targetId} />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-[9px] leading-relaxed text-white/40">
                      帳號以「信箱／帳號 ID」為準，換裝置登入不變。新版舉報單會一併儲存舉報人帳號／信箱；
                      舊單若仍只見 hex，代表建立時尚未寫入，可改看存證或膠囊／廣場列表上的作者快照。
                      Identity 為送出當下的連線身份，可能與目前檔案鑰匙不同；搜尋用戶請優先複製「信箱」或「帳號
                      ID」。
                    </p>
                    {r.detailText ? (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <p className="text-[10px] font-bold text-white/45">舉報說明</p>
                        <p className="mt-1 whitespace-pre-wrap text-[12px] text-white/85 leading-relaxed">
                          {r.detailText}
                        </p>
                      </div>
                    ) : null}
                    {(() => {
                      const snapshotBody =
                        selectedAdminSnapshot?.snapshotText?.trim() ?? "";
                      const liveBody = (
                        targetCapsule?.content ??
                        targetSquare?.snapshotContent ??
                        ""
                      ).trim();
                      const hasSnap = snapshotBody.length > 0;
                      const hasLive = liveBody.length > 0;
                      const same = hasSnap && hasLive && snapshotBody === liveBody;
                      if (!hasSnap && !hasLive) return null;
                      if (same) {
                        return (
                          <div className="rounded-xl border border-white/12 bg-white/[0.05] p-3 text-[11px] space-y-1">
                            <p className="font-bold text-[#FFD54F]/90">被舉報內容</p>
                            <p className="text-white/75 whitespace-pre-wrap leading-relaxed">
                              {liveBody || snapshotBody}
                            </p>
                            <p className="text-[10px] text-white/40">
                              與舉報當下存證一致；若之後遭修改，此處會隨資料更新。
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-2">
                          {hasSnap ? (
                            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-[11px] space-y-1">
                              <p className="font-bold text-amber-100/95">舉報當下存證（不可改）</p>
                              <p className="text-white/80 whitespace-pre-wrap leading-relaxed">
                                {snapshotBody}
                              </p>
                            </div>
                          ) : null}
                          {hasLive ? (
                            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-[11px] space-y-1">
                              <p className="font-bold text-white/90">目前平台上的內容</p>
                              <p className="text-white/70 whitespace-pre-wrap leading-relaxed">
                                {liveBody}
                              </p>
                              {hasSnap ? (
                                <p className="text-[10px] text-white/45">
                                  若與上方存證不同，表示事後曾被編輯或狀態變更。
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}
                    <div className="text-[10px] text-white/45 space-y-0.5">
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
                        <div className="space-y-0.5 flex align-center gap-1">
                          <p>處理人</p>
                          {(() => {
                            const h = r.assignedAdminIdentity!.toHexString();
                            const p = formatReportParty(
                              profileByIdentityHex.get(h),
                              h,
                              { emailFallback: adminEmailByHex.get(h) },
                            );
                            return (
                              <>
                                <p className="text-white/70">{p.primary}</p>
                                <p className="break-all text-white/55">{p.secondary}</p>
                              </>
                            );
                          })()}
                        </div>
                      ) : null}
                      {r.resolutionNote ? (
                        <div className="pt-1.5">
                          <p className="text-[11px] font-bold text-white/65">處理說明</p>
                          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-white/90">
                            {r.resolutionNote}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="cd-card-raised rounded-2xl p-4 space-y-3">
                    <p className="text-[13px] font-black text-white">審核操作</p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] font-bold text-white/70">
                        狀態
                        <CdSelect
                          value={adminReportStatus}
                          onChange={onSetAdminReportStatus}
                          className="mt-1"
                          buttonClassName="text-[13px]"
                          options={[
                            { value: "open", label: "待審核" },
                            { value: "in_review", label: "審核中" },
                            { value: "resolved", label: "已結案" },
                            { value: "dismissed", label: "不予處理" },
                            { value: "rejected", label: "已駁回" },
                          ]}
                        />
                      </label>
                      <label className="text-[11px] font-bold text-white/70">
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
                          className="cd-field mt-1 text-[13px]"
                        />
                      </label>
                    </div>
                    <label className="block text-[11px] font-bold text-white/70">
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
                        className="cd-field mt-1 min-h-[3.5rem] text-[13px]"
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
                    <div className="border-t border-white/10 pt-3 space-y-1">
                        <p className="text-[11px] font-bold text-white/70">刪除違規內容</p>
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

                    <div className="border-t border-white/10 pt-3 space-y-2">
                      <p className="text-[12px] font-black text-white">
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
                      <p className="text-[10px] text-white/45">
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

  if (adminSection === "avatar") {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-3">
        <div className="cd-card-raised rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[15px] font-black text-white">頭像設定</p>
              <p className="mt-0.5 text-[11px] text-white/60">
                管理員可改價與上下架，超級管理員可新增/刪除。
              </p>
            </div>
            {isSuperAdmin ? (
              <button
                type="button"
                onClick={() => {
                  onAvatarOpenCreateModal();
                  setAvatarCreateOpen(true);
                }}
                className="rounded-xl border-2 border-rose-400 bg-rose-500 px-3 py-1.5 text-[12px] font-bold text-white"
              >
                + 新增頭像
              </button>
            ) : null}
          </div>
          <div className="mt-3 space-y-3">
            {avatarCatalogRows.length === 0 ? (
              <p className="text-[12px] text-white/60">尚無頭像設定資料</p>
            ) : (
              Object.entries(
                avatarCatalogRows.reduce<
                  Record<
                    string,
                    {
                      avatarKey: string;
                      seriesKey: string;
                      seriesDisplayName: string;
                      basePath: string;
                      fileName: string;
                      pricePoints: number;
                      isPublished: boolean;
                      sortOrder: number;
                    }[]
                  >
                >((acc, row) => {
                  const key = row.seriesKey || "未分組";
                  const list = acc[key] ?? [];
                  acc[key] = [...list, row];
                  return acc;
                }, {}),
              ).map(([seriesKey, rows]) => {
                const allPublished = rows.every((r) => r.isPublished);
                const seriesDisplayName =
                  rows.find((r) => r.seriesDisplayName?.trim())?.seriesDisplayName?.trim() ||
                  seriesKey;
                return (
                  <div
                    key={seriesKey}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-bold text-white">
                          系列：{seriesDisplayName || "未命名"}
                        </p>
                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/70">
                          {seriesKey}
                        </span>
                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/70">
                          共 {rows.length} 張
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/80"
                          disabled={avatarCatalogEditBusy}
                          onClick={async () => {
                            const sorted = rows.slice().sort((a, b) => a.sortOrder - b.sortOrder);
                            const first = sorted[0];
                            const last = sorted[sorted.length - 1];
                            const match = last?.avatarKey.match(/-(\d+)$/);
                            const currentCount = match ? Number(match[1]) : sorted.length;
                            const nextCount = Math.max(1, Math.min(50, currentCount + 1));
                            await onAvatarCreateItem({
                              seriesKey,
                              seriesDisplayName,
                              basePath: first?.basePath || "/avatars/",
                              defaultPricePoints: first?.pricePoints || 0,
                              sortOrderBase: first?.sortOrder || 0,
                              generateCount: nextCount,
                            });
                          }}
                        >
                          + 加一張
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/80"
                          disabled={avatarCatalogEditBusy}
                          onClick={() => {
                            const sorted = rows.slice().sort((a, b) => a.sortOrder - b.sortOrder);
                            const first = sorted[0];
                            const last = sorted[sorted.length - 1];
                            const match = last?.avatarKey.match(/-(\d+)$/);
                            const maxCount = match ? Number(match[1]) : sorted.length;
                            setSeriesEditKey(seriesKey);
                            setSeriesEditDisplayName(seriesDisplayName);
                            setSeriesEditBasePath(first?.basePath || "/avatars/");
                            setSeriesEditChargePoints((first?.pricePoints || 0) > 0);
                            setSeriesEditPriceInput(
                              (first?.pricePoints || 0) > 0 ? String(first?.pricePoints || 0) : "",
                            );
                            setSeriesEditSortOrderBaseInput(String(first?.sortOrder || 0));
                            setSeriesEditGenerateCountInput(String(Math.max(1, maxCount)));
                            setSeriesEditOpen(true);
                          }}
                        >
                          整組編輯
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "rounded-full px-3 py-1.5 text-[11px] font-bold",
                            allPublished
                              ? "border border-emerald-400 bg-emerald-500/20 text-emerald-100"
                              : "border border-white/25 bg-white/10 text-white/75",
                          )}
                          disabled={avatarCatalogEditBusy}
                          onClick={() => {
                            void Promise.all(
                              rows.map((r) =>
                                onAvatarUpdateItem({
                                  avatarKey: r.avatarKey,
                                  pricePoints: r.pricePoints,
                                  isPublished: !allPublished,
                                  sortOrder: r.sortOrder,
                                }),
                              ),
                            );
                          }}
                        >
                          {allPublished ? "整組下架" : "整組上架"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {rows
                        .slice()
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((row) => (
                          <div
                            key={row.avatarKey}
                            className="rounded-xl border border-white/10 bg-black/20 p-2.5 space-y-1.5"
                          >
                            {(() => {
                              const previewSrc = toPublicAssetUrl(row.basePath, row.fileName);
                              const previewKey = `${row.avatarKey}:${previewSrc}`;
                              const broken = !!avatarPreviewBroken[previewKey];
                              return (
                                <div className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
                                  {broken ? (
                                    <div className="flex h-20 items-center justify-center text-[10px] text-white/45">
                                      圖片不存在
                                    </div>
                                  ) : (
                                    <img
                                      src={previewSrc}
                                      alt=""
                                      className="h-20 w-full object-cover"
                                      loading="lazy"
                                      decoding="async"
                                      onError={() =>
                                        setAvatarPreviewBroken((prev) => ({
                                          ...prev,
                                          [previewKey]: true,
                                        }))
                                      }
                                      onLoad={() =>
                                        setAvatarPreviewBroken((prev) => ({
                                          ...prev,
                                          [previewKey]: false,
                                        }))
                                      }
                                    />
                                  )}
                                </div>
                              );
                            })()}
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-[12px] font-bold text-white truncate">
                                {row.avatarKey}
                              </p>
                              <span className="rounded-full border border-white/20 px-1.5 py-0.5 text-[9px] text-white/60">
                                {row.basePath}
                                {row.fileName}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={99999}
                                  defaultValue={row.pricePoints > 0 ? row.pricePoints : ""}
                                  disabled={row.pricePoints <= 0}
                                  placeholder="價格"
                                  className="cd-field min-w-0 flex-1 text-[12px]"
                                  onBlur={(e) =>
                                    void onAvatarUpdateItem({
                                      avatarKey: row.avatarKey,
                                      pricePoints: Math.max(
                                        0,
                                        Math.min(99999, Number(e.target.value) || 0),
                                      ),
                                      isPublished: row.isPublished,
                                      sortOrder: row.sortOrder,
                                    })
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    void onAvatarUpdateItem({
                                      avatarKey: row.avatarKey,
                                      pricePoints:
                                        row.pricePoints > 0 ? 0 : Math.max(1, row.pricePoints || 1),
                                      isPublished: row.isPublished,
                                      sortOrder: row.sortOrder,
                                    })
                                  }
                                  className="relative shrink-0 flex items-center"
                                  aria-checked={row.pricePoints > 0}
                                  role="switch"
                                  title="是否收積分"
                                >
                                  <span
                                    className={cn(
                                      "relative flex h-6 w-12 items-center rounded-full transition-colors duration-200",
                                      row.pricePoints > 0 ? "bg-emerald-500" : "bg-stone-500",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "absolute top-1/2 z-10 -translate-y-1/2 text-[9px] font-extrabold select-none drop-shadow-sm",
                                        row.pricePoints > 0
                                          ? "left-1.5 text-white"
                                          : "right-1.5 text-white",
                                      )}
                                    >
                                      {row.pricePoints > 0 ? "收費" : "免費"}
                                    </span>
                                    <span
                                      className={cn(
                                        "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-200",
                                        row.pricePoints > 0 ? "right-0.5" : "left-0.5",
                                      )}
                                    />
                                  </span>
                                </button>
                              </div>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={99999}
                                  defaultValue={row.sortOrder}
                                  placeholder="排序"
                                  className="cd-field min-w-0 flex-1 text-[12px]"
                                  onBlur={(e) =>
                                    void onAvatarUpdateItem({
                                      avatarKey: row.avatarKey,
                                      pricePoints: row.pricePoints,
                                      isPublished: row.isPublished,
                                      sortOrder: Math.max(
                                        0,
                                        Math.min(99999, Number(e.target.value) || 0),
                                      ),
                                    })
                                  }
                                />
                                {isSuperAdmin ? (
                                  <button
                                    type="button"
                                    className="shrink-0 rounded-xl border border-red-300/60 bg-red-500/15 p-1.5 text-red-200"
                                    onClick={() => {
                                      setAvatarDeleteTargetKey(row.avatarKey);
                                      setAvatarDeleteConfirmOpen(true);
                                    }}
                                    disabled={avatarCatalogEditBusy}
                                    aria-label={`刪除 ${row.avatarKey}`}
                                  >
                                    <X className="h-3.5 w-3.5" aria-hidden />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {avatarCatalogError ? (
            <p className="mt-2 text-[12px] font-semibold text-red-300">{avatarCatalogError}</p>
          ) : null}
        </div>
        <AnimatePresence>
          {avatarCreateOpen ? (
            <motion.div
              key="avatar-create-modal"
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[250] flex items-end justify-center bg-black/45 p-4 sm:items-center"
              onClick={() => !avatarCatalogEditBusy && setAvatarCreateOpen(false)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="cd-modal-panel w-full max-w-md p-4"
              >
                <p className="text-[16px] font-bold text-white">新增頭像系列</p>
                <div className="mt-3 space-y-2">
                  <input
                    value={newSeriesPrefix}
                    onChange={(e) => setNewSeriesPrefix(e.target.value)}
                    placeholder="系列前綴，例如 zt（會產生 zt-1 ~ zt-5）"
                    className="cd-field text-[13px]"
                  />
                  <input
                    value={newSeriesDisplayName}
                    onChange={(e) => setNewSeriesDisplayName(e.target.value)}
                    placeholder="系列中文名，例如 黑貓"
                    className="cd-field text-[13px]"
                  />
                  <input
                    value={newBasePath}
                    onChange={(e) => setNewBasePath(e.target.value)}
                    placeholder="basePath，例如 /avatars/"
                    className="cd-field text-[13px]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-white/70">
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={99999}
                          value={newDefaultPricePointsInput}
                          disabled={!newChargePoints}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (!raw) {
                              setNewDefaultPricePointsInput("");
                              return;
                            }
                            setNewDefaultPricePointsInput(
                              String(Math.max(0, Math.min(99999, Number(raw) || 0))),
                            );
                          }}
                          placeholder="預設積分"
                          className="cd-field min-w-0 flex-1 text-[13px]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNewChargePoints((v) => {
                              const next = !v;
                              if (!next) setNewDefaultPricePointsInput("");
                              return next;
                            })
                          }
                          className="relative shrink-0 flex items-center"
                          aria-checked={newChargePoints}
                          role="switch"
                          title="是否收積分"
                        >
                          <span
                            className={cn(
                              "relative flex h-7 w-14 items-center rounded-full transition-colors duration-200",
                              newChargePoints ? "bg-emerald-500" : "bg-stone-500",
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-1/2 z-10 -translate-y-1/2 text-[10px] font-extrabold select-none drop-shadow-sm",
                                newChargePoints ? "left-1.5 text-white" : "right-1.5 text-white",
                              )}
                            >
                              {newChargePoints ? "收費" : "免費"}
                            </span>
                            <span
                              className={cn(
                                "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-200",
                                newChargePoints ? "right-0.5" : "left-0.5",
                              )}
                            />
                          </span>
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={99999}
                      value={newSortOrderBaseInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!raw) {
                          setNewSortOrderBaseInput("");
                          return;
                        }
                        setNewSortOrderBaseInput(
                          String(Math.max(0, Math.min(99999, Number(raw) || 0))),
                        );
                      }}
                      placeholder="本組排序起點"
                      className="cd-field text-[13px]"
                    />
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newGenerateCountInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!raw) {
                        setNewGenerateCountInput("");
                        return;
                      }
                      setNewGenerateCountInput(String(Math.max(1, Math.min(50, Number(raw) || 5))));
                    }}
                    placeholder="生成張數（預設 5）"
                    className="cd-field text-[13px]"
                  />
                  <p className="text-[12px] text-white/60">
                    建立後預設先下架，你可在列表逐張上架/下架、改價、改排序。
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="cd-btn-ghost flex-1 py-2 text-[13px]"
                    onClick={() => setAvatarCreateOpen(false)}
                    disabled={avatarCatalogEditBusy}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="cd-btn-primary flex-1 py-2 text-[13px] disabled:opacity-60"
                    disabled={avatarCatalogEditBusy}
                    onClick={async () => {
                      const defaultPricePoints = newChargePoints
                        ? Math.max(0, Math.min(99999, Number(newDefaultPricePointsInput) || 0))
                        : 0;
                      const sortOrderBase = Math.max(
                        0,
                        Math.min(99999, Number(newSortOrderBaseInput) || 0),
                      );
                      const generateCount = Math.max(
                        1,
                        Math.min(50, Number(newGenerateCountInput) || 5),
                      );
                      await onAvatarCreateItem({
                        seriesKey: newSeriesPrefix,
                        seriesDisplayName: newSeriesDisplayName,
                        basePath: newBasePath,
                        defaultPricePoints,
                        sortOrderBase,
                        generateCount,
                      });
                      setAvatarCreateOpen(false);
                    }}
                  >
                    產生
                    {` ${Math.max(1, Math.min(50, Number(newGenerateCountInput) || 5))} `}
                    張
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {avatarDeleteConfirmOpen ? (
            <motion.div
              key="avatar-delete-confirm-modal"
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[256] flex items-end justify-center bg-black/45 p-4 sm:items-center"
              onClick={() => !avatarCatalogEditBusy && setAvatarDeleteConfirmOpen(false)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="cd-modal-panel w-full max-w-sm p-4"
              >
                <p className="text-[16px] font-bold text-white">確認刪除頭像</p>
                <p className="mt-2 text-[12px] text-white/70">
                  確定要刪除
                  <span className="mx-1 font-bold text-white">{avatarDeleteTargetKey}</span>
                  嗎？
                </p>
                <p className="mt-1 text-[11px] text-white/45">
                  刪除後不會影響已購買紀錄，但該頭像設定會從清單移除。
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="cd-btn-ghost flex-1 py-2 text-[13px]"
                    onClick={() => setAvatarDeleteConfirmOpen(false)}
                    disabled={avatarCatalogEditBusy}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-red-400/60 bg-red-500/20 py-2 text-[13px] font-bold text-red-100 disabled:opacity-60"
                    disabled={avatarCatalogEditBusy || !avatarDeleteTargetKey}
                    onClick={async () => {
                      await onAvatarDeleteItem(avatarDeleteTargetKey);
                      setAvatarDeleteConfirmOpen(false);
                      setAvatarDeleteTargetKey("");
                    }}
                  >
                    確認刪除
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {seriesEditOpen ? (
            <motion.div
              key="avatar-series-edit-modal"
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[255] flex items-end justify-center bg-black/45 p-4 sm:items-center"
              onClick={() => !avatarCatalogEditBusy && setSeriesEditOpen(false)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="cd-modal-panel w-full max-w-md p-4"
              >
                <p className="text-[16px] font-bold text-white">整組編輯：{seriesEditKey}</p>
                <div className="mt-3 space-y-2">
                  <input
                    value={seriesEditDisplayName}
                    onChange={(e) => setSeriesEditDisplayName(e.target.value)}
                    placeholder="系列中文名"
                    className="cd-field text-[13px]"
                  />
                  <input
                    value={seriesEditBasePath}
                    onChange={(e) => setSeriesEditBasePath(e.target.value)}
                    placeholder="basePath，例如 /avatars/"
                    className="cd-field text-[13px]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={99999}
                        value={seriesEditPriceInput}
                        disabled={!seriesEditChargePoints}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (!raw) {
                            setSeriesEditPriceInput("");
                            return;
                          }
                          setSeriesEditPriceInput(
                            String(Math.max(0, Math.min(99999, Number(raw) || 0))),
                          );
                        }}
                        placeholder="預設積分"
                        className="cd-field min-w-0 flex-1 text-[13px]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSeriesEditChargePoints((v) => {
                            const next = !v;
                            if (!next) setSeriesEditPriceInput("");
                            return next;
                          })
                        }
                        className="relative shrink-0 flex items-center"
                        aria-checked={seriesEditChargePoints}
                        role="switch"
                      >
                        <span
                          className={cn(
                            "relative flex h-7 w-14 items-center rounded-full transition-colors duration-200",
                            seriesEditChargePoints ? "bg-emerald-500" : "bg-stone-500",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-1/2 z-10 -translate-y-1/2 text-[10px] font-extrabold select-none drop-shadow-sm",
                              seriesEditChargePoints ? "left-1.5 text-white" : "right-1.5 text-white",
                            )}
                          >
                            {seriesEditChargePoints ? "收費" : "免費"}
                          </span>
                          <span
                            className={cn(
                              "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-200",
                              seriesEditChargePoints ? "right-0.5" : "left-0.5",
                            )}
                          />
                        </span>
                      </button>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={99999}
                      value={seriesEditSortOrderBaseInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!raw) {
                          setSeriesEditSortOrderBaseInput("");
                          return;
                        }
                        setSeriesEditSortOrderBaseInput(
                          String(Math.max(0, Math.min(99999, Number(raw) || 0))),
                        );
                      }}
                      placeholder="本組排序起點"
                      className="cd-field text-[13px]"
                    />
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={seriesEditGenerateCountInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!raw) {
                        setSeriesEditGenerateCountInput("");
                        return;
                      }
                      setSeriesEditGenerateCountInput(
                        String(Math.max(1, Math.min(50, Number(raw) || 5))),
                      );
                    }}
                    placeholder="總張數（可用於插入新圖）"
                    className="cd-field text-[13px]"
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="cd-btn-ghost flex-1 py-2 text-[13px]"
                    onClick={() => setSeriesEditOpen(false)}
                    disabled={avatarCatalogEditBusy}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="cd-btn-primary flex-1 py-2 text-[13px] disabled:opacity-60"
                    disabled={avatarCatalogEditBusy}
                    onClick={async () => {
                      const defaultPricePoints = seriesEditChargePoints
                        ? Math.max(0, Math.min(99999, Number(seriesEditPriceInput) || 0))
                        : 0;
                      const sortOrderBase = Math.max(
                        0,
                        Math.min(99999, Number(seriesEditSortOrderBaseInput) || 0),
                      );
                      const generateCount = Math.max(
                        1,
                        Math.min(50, Number(seriesEditGenerateCountInput) || 5),
                      );
                      await onAvatarCreateItem({
                        seriesKey: seriesEditKey,
                        seriesDisplayName: seriesEditDisplayName,
                        basePath: seriesEditBasePath,
                        defaultPricePoints,
                        sortOrderBase,
                        generateCount,
                      });
                      setSeriesEditOpen(false);
                    }}
                  >
                    套用整組
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  if (activeTab === "admin_ops") {
    return (
      <div className="apple-scroll max-h-full min-w-0 w-full max-w-7xl space-y-3 overflow-y-auto overflow-x-hidden px-2 py-2 md:space-y-4 md:px-5 md:py-4">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-3 text-white shadow-xl md:p-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/90">
                超管指揮台
              </p>
              <p className="mt-0.5 text-[18px] font-black leading-tight md:text-xl lg:text-2xl">
                即時稼動總覽
              </p>
            </div>
          </div>
          <div className="mt-3 grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3 md:gap-2 lg:grid-cols-5">
            {(
              [
                ["註冊帳號", superOpsStats.profiles, "profiles"],
                ["活躍膠囊", superOpsStats.capsules, "cap"],
                ["廣場貼文", superOpsStats.squarePosts, "sq"],
                ["生效處分", superOpsStats.sanctionsActive, "sn"],
                ["申訴單", superOpsStats.appeals, "ap"],
              ] as const
            ).map(([label, n, key]) => (
              <div
                key={key}
                className="flex min-w-0 flex-col items-stretch gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-2 backdrop-blur-sm sm:rounded-xl sm:px-2.5 sm:py-2.5 xl:gap-1.5"
              >
                <div className="flex min-w-0 items-center gap-1 text-[9px] font-bold uppercase leading-tight tracking-wide text-emerald-200/85 sm:text-[10px]">
                  <Activity className="h-3 w-3 shrink-0 opacity-80 xl:h-3.5 xl:w-3.5" aria-hidden />
                  <span className="min-w-0 truncate">{label}</span>
                </div>
                <p className="text-lg font-black tabular-nums leading-none sm:text-xl xl:text-2xl">
                  {n}
                </p>
              </div>
            ))}
          </div>

          <SuperAdminTrendChartsPanel trends={superAdminTrends} className="mt-4" />

          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-white/10 pt-4 lg:mt-5 lg:grid-cols-12 lg:items-stretch lg:gap-4 lg:pt-5">
            <div className="min-w-0 lg:col-span-7">
              
              <div className="grid gap-3 lg:grid-cols-2 lg:items-stretch">
              <div className="flex h-full min-h-0 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 md:p-4">
                <p className="text-[12px] font-bold text-white">舉報 / 審核佇列</p>
                <p className="mt-0.5 text-[10px] text-white/50">
                  舉報單狀態與審核佇列合併顯示（未結、待辦、已結）
                </p>
                <div className="mt-3 flex flex-1 flex-col gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-white/70">舉報單狀態</p>
                    <SuperOpsStackedBar
                      segments={[
                        {
                          value: superOpsStats.reportsOpen,
                          className: "bg-[#FFD54F]",
                          title: "待審核",
                        },
                        {
                          value: superOpsStats.reportsInReview,
                          className: "bg-[#F06292]",
                          title: "審核中",
                        },
                        {
                          value: superOpsStats.reportsClosed,
                          className: "bg-[#64748b]",
                          title: "已結案等",
                        },
                      ]}
                    />
                    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/65">
                      <li>
                        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#FFD54F]" /> 待審核{" "}
                        {superOpsStats.reportsOpen}
                      </li>
                      <li>
                        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#F06292]" /> 審核中{" "}
                        {superOpsStats.reportsInReview}
                      </li>
                      <li>
                        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#64748b]" /> 已結{" "}
                        {superOpsStats.reportsClosed}
                      </li>
                    </ul>
                  </div>
                  <div className="border-t border-white/10 pt-2.5">
                    <p className="text-[10px] font-bold text-white/70">審核佇列</p>
                    <SuperOpsStackedBar
                      segments={[
                        {
                          value: superOpsStats.modQueue,
                          className: "bg-emerald-400",
                          title: "待辦",
                        },
                        {
                          value: superOpsStats.modQueueDone,
                          className: "bg-[#64748b]",
                          title: "已結",
                        },
                      ]}
                    />
                    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/65">
                      <li>
                        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" /> 待辦{" "}
                        {superOpsStats.modQueue}
                      </li>
                      <li>
                        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#64748b]" /> 已結{" "}
                        {superOpsStats.modQueueDone}
                      </li>
                    </ul>
                  </div>
                  <div className="flex-1" aria-hidden />
                </div>
              </div>

              <div className="flex h-full min-h-0 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 md:p-4">
                <p className="text-[12px] font-bold text-white">啟用管理員角色</p>
                <p className="mt-0.5 text-[10px] text-white/50">僅開啓的管理員角色</p>
                <div className="mt-3 flex flex-1 flex-col gap-2">
                  {(() => {
                    const maxRole = Math.max(
                      superOpsStats.adminRoleSuper,
                      superOpsStats.adminRoleMod,
                      superOpsStats.adminRoleReview,
                      superOpsStats.adminRoleOther,
                      1,
                    );
                    return (
                      <>
                        <div className="space-y-2">
                          <SuperOpsBarRow
                            label="超級管理員"
                            value={superOpsStats.adminRoleSuper}
                            max={maxRole}
                            barClass="bg-[#FFD54F]"
                          />
                          <SuperOpsBarRow
                            label="管理員"
                            value={superOpsStats.adminRoleMod}
                            max={maxRole}
                            barClass="bg-[#F06292]"
                          />
                          <SuperOpsBarRow
                            label="審核員"
                            value={superOpsStats.adminRoleReview}
                            max={maxRole}
                            barClass="bg-sky-400"
                          />
                          {superOpsStats.adminRoleOther > 0 ? (
                            <SuperOpsBarRow
                              label="其他角色"
                              value={superOpsStats.adminRoleOther}
                              max={maxRole}
                              barClass="bg-white/40"
                            />
                          ) : null}
                        </div>
                        <div className="flex-1" aria-hidden />
                      </>
                    );
                  })()}
                </div>
              </div>
              </div>
            </div>

            <div className="flex min-h-[min(16rem,42vh)] flex-col rounded-xl border border-white/10 bg-white/[0.06] p-3 text-white shadow-inner md:p-4 lg:col-span-5 lg:h-full lg:min-h-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/45 lg:hidden">
                管理帳號
              </p>
              <div className="flex flex-shrink-0 items-start justify-between gap-2 lg:items-center">
                <p className="min-w-0 text-[12px] font-bold leading-snug text-white md:text-[13px]">
                  管理帳號（啟用 {activeAdminRows.length} / 已移除 {inactiveAdminRows.length}）
                </p>
                <button
                  type="button"
                  onClick={onOpenAdminAddModal}
                  className="shrink-0 rounded-xl border-2 border-rose-400 bg-rose-500 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-rose-600 md:px-3 md:text-[12px]"
                >
                  + 新增管理員
                </button>
              </div>
          {activeAdminRows.length === 0 ? (
            <p className="mt-2 text-[12px] text-[#8E8E93]">目前還沒有管理帳號。</p>
          ) : (
            <ul className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.04] p-2 lg:max-h-none lg:flex-1">
              {activeAdminRows.map((r) => {
                const hex = r.adminIdentity.toHexString();
                const em = adminEmailByHex.get(hex);
                const isUnknown = !em;
                return (
                  <li
                    key={hex}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-[11px] text-white/90",
                      isUnknown
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-white/10 bg-white/[0.04]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-[11px]">
                        <span className="font-bold text-white">
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
                          className="rounded border border-stone-400 bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-800"
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
                          <span className="relative flex h-6 w-12 items-center rounded-full bg-emerald-500 transition-colors duration-200">
                            <span className="z-10 pl-1.5 text-[9px] font-extrabold text-white drop-shadow-sm select-none">
                              開啟
                            </span>
                            <span className="absolute right-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow" />
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
                          className="flex-1 rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] text-stone-900 placeholder:text-stone-500"
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
                            <span className="relative flex h-6 w-12 items-center rounded-full bg-stone-400 transition-colors duration-200">
                              <span className="absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow" />
                              <span className="absolute right-1 z-10 text-[9px] font-extrabold text-white drop-shadow-sm select-none">
                                關閉
                              </span>
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
            <p className="mt-2 text-[12px] font-semibold text-red-600">{adminActionError}</p>
          ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl w-full mx-auto space-y-3">
      <div className="cd-card-raised rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-black text-white">管理帳號</p>
          <span className="text-[11px] font-semibold text-white/60">
            共 {activeAdminRows.length} 位啟用
          </span>
        </div>
        {activeAdminRows.length === 0 ? (
          <p className="text-[12px] text-white/60">目前還沒有管理帳號。</p>
        ) : (
          <ul className="space-y-1.5">
            {activeAdminRows.map((r) => (
              <li
                key={r.adminIdentity.toHexString()}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[12px] text-white/80 break-all"
              >
                <span className="font-bold text-white">{r.role}</span> ·{" "}
                {r.adminIdentity.toHexString()}
                {r.adminIdentity.isEqual(identity) ? "（你）" : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="cd-card-raised rounded-2xl p-4 space-y-3">
        <p className="text-[13px] font-black text-white">帳號搜尋與一鍵停權 / 復權</p>
        <input
          value={adminAccountSearch}
          onChange={(e) => onSetAdminAccountSearch(e.target.value)}
          placeholder="搜尋暱稱 / 信箱 / identity"
          className="cd-field text-[12px]"
        />
        <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {adminSearchRows.length === 0 ? (
            <p className="px-2 py-2 text-[12px] text-white/55">找不到符合帳號</p>
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
                      ? "border-violet-300/60 bg-violet-500/16 text-violet-100 ring-2 ring-violet-300/30"
                      : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]",
                  )}
                >
                  <p className="font-bold">{p.displayName || "(未命名)"}</p>
                  <p className="truncate text-[11px]">{p.email}</p>
                </button>
              );
            })
          )}
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2">
          <p className="text-[11px] font-bold text-white/85">
            目前選中：
            {selectedAdminTargetProfile
              ? `${selectedAdminTargetProfile.displayName || "(未命名)"} / ${selectedAdminTargetProfile.email}`
              : "未選擇帳號"}
          </p>
          <p className="mt-0.5 break-all text-[10px] text-white/55">
            {adminTargetIdentityHex || "—"}
          </p>
          <p className="mt-1 text-[10px] text-white/55">
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
  useEscapeClose(
    adminReportModalOpen && !!selectedAdminReport && !adminActionLoading,
    () => onSetAdminReportModalOpen(false),
  );
  useEscapeClose(adminAddOpen && !adminActionLoading, () => onSetAdminAddOpen(false));
  useEscapeClose(adminEditOpen && !adminActionLoading, () => onSetAdminEditOpen(false));

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
              className="cd-modal-panel w-full max-w-lg max-h-[90dvh] overflow-y-auto p-4 apple-scroll"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[16px] font-bold text-white">處理舉報單</p>
                  <p className="mt-0.5 text-[12px] font-bold text-rose-400">
                    {reportStatusLabel(selectedAdminReport.status)} · 優先級{" "}
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
              <div className="mb-3 space-y-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-[12px] text-white/90">
                <p>
                  <span className="font-bold text-[#8E8E93]">類型：</span>
                  {reportTargetTypeLabel(selectedAdminReport.targetType)} ·{" "}
                  {reportReasonLabel(selectedAdminReport.reasonCode)}
                </p>
                <p className="break-all">
                  <span className="font-bold text-[#8E8E93]">目標 ID：</span>
                  {reportTargetTypeLabel(selectedAdminReport.targetType)} ·{" "}
                  {selectedAdminReport.targetId}
                </p>
                {selectedAdminReport.detailText ? (
                  <p className="whitespace-pre-wrap text-white/85">
                    {selectedAdminReport.detailText}
                  </p>
                ) : null}
                {selectedAdminSnapshot?.snapshotText?.trim() ? (
                  <p className="whitespace-pre-wrap text-[11px] text-white/55">
                    舉報當下存證：{selectedAdminSnapshot.snapshotText}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2 mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-bold text-[#8E8E93]">
                    狀態
                    <CdSelect
                      value={adminReportStatus}
                      onChange={onSetAdminReportStatus}
                      className="mt-1"
                      buttonClassName="text-[13px]"
                      options={[
                        { value: "open", label: "待審核" },
                        { value: "in_review", label: "審核中" },
                        { value: "resolved", label: "已結案" },
                        { value: "dismissed", label: "不予處理" },
                        { value: "rejected", label: "已駁回" },
                      ]}
                    />
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
                <label className="block text-[11px] font-bold text-[#8E8E93]">
                  備註說明
                  <span className="ml-1 text-[10px] font-normal text-white/50">
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
                    className="cd-field mt-1 min-h-[3.5rem] text-[13px]"
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
              <div className="space-y-2 border-t border-white/10 pt-3">
                <p className="text-[12px] font-bold text-white">快速動作</p>
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
              className="cd-modal-panel w-full max-w-md p-4"
            >
              <p className="text-[16px] font-bold text-white">新增管理員</p>
              <div className="mt-3 space-y-3">
                <label className="block text-[11px] font-bold text-[#8E8E93]">
                  帳號 Email
                  <input
                    value={adminGrantEmail}
                    onChange={(e) => onSetAdminGrantEmail(e.target.value)}
                    placeholder="輸入帳號 email（例如 foo@bar.com）"
                    list="admin-email-candidates-add"
                    className="cd-field mt-1 text-[13px]"
                    autoFocus
                  />
                  <datalist id="admin-email-candidates-add">
                    {adminGrantEmailCandidates.map((em) => (
                      <option key={em} value={em} />
                    ))}
                  </datalist>
                </label>
                <div>
                  <p className="mb-1 text-[11px] font-bold text-[#8E8E93]">權限</p>
                  <div className="flex items-center gap-2">
                    <CdSelect
                      value={adminGrantRole}
                      onChange={onSetAdminGrantRole}
                      className="min-w-0 flex-1"
                      buttonClassName="text-[13px]"
                      options={[
                        { value: "moderator", label: "管理員" },
                        { value: "reviewer", label: "審核員" },
                        { value: "super_admin", label: "超級管理員" },
                      ]}
                    />
                    <button
                      type="button"
                      onClick={() => onSetAdminGrantActive((v) => !v)}
                      className="relative shrink-0 flex items-center"
                      aria-checked={adminGrantActive}
                      role="switch"
                    >
                      <span
                        className={cn(
                          "relative flex h-7 w-14 items-center rounded-full transition-colors duration-200",
                          adminGrantActive ? "bg-emerald-500" : "bg-stone-500",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1/2 z-10 -translate-y-1/2 text-[10px] font-extrabold select-none drop-shadow-sm",
                            adminGrantActive ? "left-1.5 text-white" : "right-1.5 text-white",
                          )}
                        >
                          {adminGrantActive ? "開啟" : "關閉"}
                        </span>
                        <span
                          className={cn(
                            "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-200",
                            adminGrantActive ? "right-0.5" : "left-0.5",
                          )}
                        />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              {adminActionError ? (
                <p className="mt-2 text-[12px] font-medium text-red-300">
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
                  className="cd-btn-ghost flex-1 py-2 text-[13px] font-semibold"
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
              className="cd-modal-panel w-full max-w-md p-4"
            >
              <p className="text-[16px] font-bold text-white">編輯管理員</p>
              <p className="mt-1 truncate text-[12px] text-[#8E8E93]">
                {adminEditEmail || "未知帳號"}
              </p>
              <div className="mt-3">
                <p className="mb-1 text-[11px] font-bold text-[#8E8E93]">權限</p>
                <div className="flex items-center gap-2">
                  <CdSelect
                    value={adminEditRole}
                    onChange={onSetAdminEditRole}
                    className="min-w-0 flex-1"
                    buttonClassName="text-[13px]"
                    options={[
                      { value: "moderator", label: "管理員" },
                      { value: "reviewer", label: "審核員" },
                      { value: "super_admin", label: "超級管理員" },
                    ]}
                  />
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
                        "relative flex h-7 w-14 items-center rounded-full transition-colors duration-200",
                        adminEditRole === "super_admin" || adminEditActive
                          ? "bg-emerald-500"
                          : "bg-stone-500",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1/2 z-10 -translate-y-1/2 text-[10px] font-extrabold select-none drop-shadow-sm",
                          adminEditRole === "super_admin" || adminEditActive
                            ? "left-1.5 text-white"
                            : "right-1.5 text-white",
                        )}
                      >
                        {adminEditRole === "super_admin" || adminEditActive
                          ? "開啟"
                          : "關閉"}
                      </span>
                      <span
                        className={cn(
                          "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-200",
                          adminEditRole === "super_admin" || adminEditActive
                            ? "right-0.5"
                            : "left-0.5",
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
                  className="cd-btn-ghost flex-1 py-2 text-[13px] font-semibold"
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
