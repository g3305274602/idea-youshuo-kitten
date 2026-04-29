import { useMemo } from "react";
import { Identity, Timestamp } from "spacetimedb";
import { useTable } from "spacetimedb/react";

import { tables } from "../../module_bindings";
import type {
  AccountProfile,
  AccountProfileCreatedAt,
  AdminRole,
  AppealTicket,
  CapsuleMessage,
  CapsuleMessageSpaceState,
  ModerationQueue,
  ReportTargetSnapshot,
  ReportTicket,
  SquareComment,
  SquarePost,
  UserSanction,
} from "../../module_bindings/types";
import { isReportClosedStatus } from "../app/adminReportDisplay";
import { isAdminTab } from "../app/shell/navigation";
import type { SuperAdminTrendsBundle } from "./superAdminTrendCharts";
import { useAdminWorkbenchStore } from "./adminWorkbenchStore";

const SUPER_ADMIN_TREND_WINDOW = 366;

function localDayKeyFromMicros(micros: bigint): string {
  const d = new Date(Number(micros / 1000n));
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function rollingLocalDayKeys(n: number): string[] {
  const keys: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    keys.push(localDayKeyFromMicros(BigInt(d.getTime()) * 1000n));
  }
  return keys;
}

export function useAdminWorkbenchState() {
  return useAdminWorkbenchStore();
}

type UseAdminWorkbenchTablesParams = {
  activeTab: string;
  identity: Identity;
  myAccountId: string | null;
  myProfile: AccountProfile | null;
  isMyReportTab: boolean;
};

export function useAdminWorkbenchTables({
  activeTab,
  identity,
  myAccountId,
  myProfile,
  isMyReportTab,
}: UseAdminWorkbenchTablesParams) {
  const [adminRoleRows, adminRoleRowsLoading] = useTable(tables.adminRole);
  const rawIsAdmin = !!(
    myAccountId &&
    adminRoleRows.find((r) => r.accountId === myAccountId && r.isActive)
  );
  const isAdminTabActive = isAdminTab(activeTab as any);

  const [adminProfiles] = useTable(
    rawIsAdmin && isAdminTabActive
      ? tables.accountProfile
      : tables.accountProfile.where((r) => r.ownerIdentity.eq(identity)),
  );
  const [adminAuditLogRows] = useTable(
    rawIsAdmin && isAdminTabActive
      ? tables.adminAuditLog
      : tables.adminAuditLog.where((r) => r.id.eq("__stop__")),
  );
  const [reportTicketRows] = useTable(
    rawIsAdmin && (isAdminTabActive || isMyReportTab)
      ? tables.reportTicket
      : tables.reportTicket.where((r) => r.id.eq("__stop__")),
  );
  const [reportSnapshotRows] = useTable(
    rawIsAdmin && isAdminTabActive
      ? tables.reportTargetSnapshot
      : tables.reportTargetSnapshot.where((r) => r.id.eq("__stop__")),
  );
  const [moderationQueueRows] = useTable(
    rawIsAdmin && isAdminTabActive
      ? tables.moderationQueue
      : tables.moderationQueue.where((r) => r.reportId.eq("__stop__")),
  );
  const [appealTicketRows] = useTable(
    rawIsAdmin && isAdminTabActive
      ? tables.appealTicket
      : tables.appealTicket.where((r) => r.id.eq("__stop__")),
  );
  const [userSanctionRows] = useTable(
    myProfile
      ? tables.userSanction
      : tables.userSanction.where((r) => r.id.eq("__stop__")),
  );
  const [accountProfileCreatedAtRows] = useTable(
    rawIsAdmin && isAdminTabActive
      ? tables.accountProfileCreatedAt
      : tables.accountProfileCreatedAt.where((r) => r.email.eq("__stop__")),
  );
  const [avatarCatalogRows] = useTable(
    rawIsAdmin && isAdminTabActive
      ? (tables as any).avatarCatalogItem
      : (tables as any).avatarCatalogItem.where((r: any) => r.avatarKey.eq("__stop__")),
  );

  const hasAnyAdmin = useMemo(
    () => adminRoleRows.some((r) => r.isActive),
    [adminRoleRows],
  );

  return {
    adminRoleRows,
    adminRoleRowsLoading,
    rawIsAdmin,
    adminProfiles,
    adminAuditLogRows,
    reportTicketRows,
    reportSnapshotRows,
    moderationQueueRows,
    appealTicketRows,
    userSanctionRows,
    accountProfileCreatedAtRows,
    avatarCatalogRows,
    hasAnyAdmin,
  };
}

type UseAdminWorkbenchDerivedParams = {
  adminProfiles: readonly AccountProfile[];
  adminRoleRows: readonly AdminRole[];
  reportTicketRows: readonly ReportTicket[];
  reportSnapshotRows: readonly ReportTargetSnapshot[];
  accountProfileCreatedAtRows: readonly AccountProfileCreatedAt[];
  userSanctionRows: readonly UserSanction[];
  appealTicketRows: readonly AppealTicket[];
  moderationQueueRows: readonly ModerationQueue[];
  capsuleMessageRows: readonly CapsuleMessage[];
  squarePostRows: readonly SquarePost[];
  squareCommentRows: readonly SquareComment[];
  capsuleStateById: Map<string, { isDeleted?: boolean }>;
  selectedAdminReportId: string | null;
  adminAccountSearch: string;
  adminTargetIdentityHex: string;
  rawIsAdmin: boolean;
};

export function useAdminWorkbenchDerived({
  adminProfiles,
  adminRoleRows,
  reportTicketRows,
  reportSnapshotRows,
  accountProfileCreatedAtRows,
  userSanctionRows,
  appealTicketRows,
  moderationQueueRows,
  capsuleMessageRows,
  squarePostRows,
  squareCommentRows,
  capsuleStateById,
  selectedAdminReportId,
  adminAccountSearch,
  adminTargetIdentityHex,
  rawIsAdmin,
}: UseAdminWorkbenchDerivedParams) {
  const allProfiles = adminProfiles;
  const displayNameByEmail = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allProfiles) m.set(p.email.trim().toLowerCase(), p.displayName.trim());
    return m;
  }, [allProfiles]);

  const profileByIdentityHex = useMemo(() => {
    const m = new Map<string, AccountProfile>();
    for (const p of allProfiles) m.set(p.ownerIdentity.toHexString(), p);
    return m;
  }, [allProfiles]);

  const adminEmailByHex = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allProfiles) m.set(p.ownerIdentity.toHexString(), p.email);
    return m;
  }, [allProfiles]);

  const adminReportsSorted = useMemo(
    () =>
      [...reportTicketRows].sort((a, b) =>
        Number(b.updatedAt.microsSinceUnixEpoch - a.updatedAt.microsSinceUnixEpoch),
      ),
    [reportTicketRows],
  );

  const activeAdminRows = useMemo(
    () => adminRoleRows.filter((r) => r.isActive),
    [adminRoleRows],
  );
  const inactiveAdminRows = useMemo(
    () => adminRoleRows.filter((r) => !r.isActive),
    [adminRoleRows],
  );
  const hasAnyAdmin = activeAdminRows.length > 0;

  const superAdminTrends = useMemo((): SuperAdminTrendsBundle => {
    const dayKeys = rollingLocalDayKeys(SUPER_ADMIN_TREND_WINDOW);
    const daySet = new Set(dayKeys);
    const reg = new Map<string, number>();
    const cap = new Map<string, number>();
    const post = new Map<string, number>();
    const cmt = new Map<string, number>();
    for (const k of dayKeys) {
      reg.set(k, 0);
      cap.set(k, 0);
      post.set(k, 0);
      cmt.set(k, 0);
    }

    const profileCreatedByAccountId = new Map<string, bigint>();
    const profileCreatedByEmail = new Map<string, bigint>();
    for (const row of accountProfileCreatedAtRows) {
      const micros = row.createdAt.microsSinceUnixEpoch;
      profileCreatedByAccountId.set(row.accountId, micros);
      profileCreatedByEmail.set(row.email.trim().toLowerCase(), micros);
      const key = localDayKeyFromMicros(micros);
      if (!daySet.has(key)) continue;
      reg.set(key, (reg.get(key) ?? 0) + 1);
    }
    let profilesWithoutCreatedAt = 0;
    for (const p of allProfiles) {
      const accountId = (p.accountId ?? "").trim();
      const em = (p.email ?? "").trim().toLowerCase();
      if (profileCreatedByAccountId.has(accountId) || profileCreatedByEmail.has(em)) {
        continue;
      }
      profilesWithoutCreatedAt += 1;
    }

    for (const c of capsuleMessageRows) {
      if (capsuleStateById.get(c.id)?.isDeleted) continue;
      const key = localDayKeyFromMicros(c.createdAt.microsSinceUnixEpoch);
      if (!daySet.has(key)) continue;
      cap.set(key, (cap.get(key) ?? 0) + 1);
    }

    for (const sp of squarePostRows) {
      const key = localDayKeyFromMicros(sp.createdAt.microsSinceUnixEpoch);
      if (!daySet.has(key)) continue;
      post.set(key, (post.get(key) ?? 0) + 1);
    }

    for (const sc of squareCommentRows) {
      const key = localDayKeyFromMicros(sc.createdAt.microsSinceUnixEpoch);
      if (!daySet.has(key)) continue;
      cmt.set(key, (cmt.get(key) ?? 0) + 1);
    }

    const days = dayKeys.map((dayKey) => ({
      dayKey,
      dayShort: dayKey.slice(5),
      registrations: reg.get(dayKey) ?? 0,
      capsules: cap.get(dayKey) ?? 0,
      squarePosts: post.get(dayKey) ?? 0,
      comments: cmt.get(dayKey) ?? 0,
    }));

    const maxRegistrations = Math.max(1, ...days.map((d) => d.registrations));
    const maxActivityStack = Math.max(
      1,
      ...days.map((d) => d.capsules + d.squarePosts + d.comments),
    );

    return {
      days,
      maxRegistrations,
      maxActivityStack,
      profilesWithoutCreatedAt,
      windowDays: SUPER_ADMIN_TREND_WINDOW,
    };
  }, [
    allProfiles,
    accountProfileCreatedAtRows,
    capsuleMessageRows,
    squarePostRows,
    squareCommentRows,
    capsuleStateById,
  ]);

  const superOpsStats = useMemo(() => {
    const aliveCapsules = capsuleMessageRows.filter(
      (m) => !(capsuleStateById.get(m.id)?.isDeleted ?? false),
    ).length;

    let reportsOpen = 0;
    let reportsInReview = 0;
    let reportsClosed = 0;
    for (const r of reportTicketRows) {
      const s = String(r.status ?? "").trim().toLowerCase();
      if (isReportClosedStatus(s)) reportsClosed += 1;
      else if (s === "in_review") reportsInReview += 1;
      else reportsOpen += 1;
    }
    const reportsNonResolved = reportsOpen + reportsInReview;

    let modPending = 0;
    let modDone = 0;
    for (const m of moderationQueueRows) {
      const s = String(m.status ?? "").trim().toLowerCase();
      if (isReportClosedStatus(s)) modDone += 1;
      else modPending += 1;
    }

    let adminRoleSuper = 0;
    let adminRoleMod = 0;
    let adminRoleReview = 0;
    let adminRoleOther = 0;
    for (const r of activeAdminRows) {
      const k = String(r.role ?? "").trim().toLowerCase();
      if (k === "super_admin") adminRoleSuper += 1;
      else if (k === "moderator") adminRoleMod += 1;
      else if (k === "reviewer") adminRoleReview += 1;
      else adminRoleOther += 1;
    }

    return {
      profiles: allProfiles.length,
      capsules: aliveCapsules,
      squarePosts: squarePostRows.length,
      reportsNonResolved,
      reportsOpen,
      reportsInReview,
      reportsClosed,
      sanctionsActive: userSanctionRows.filter((s) => s.status === "active").length,
      appeals: appealTicketRows.length,
      modQueue: modPending,
      modQueueDone: modDone,
      admins: activeAdminRows.length,
      adminRoleSuper,
      adminRoleMod,
      adminRoleReview,
      adminRoleOther,
    };
  }, [
    allProfiles,
    capsuleMessageRows,
    squarePostRows,
    reportTicketRows,
    userSanctionRows,
    appealTicketRows,
    moderationQueueRows,
    activeAdminRows,
    capsuleStateById,
  ]);

  const selectedAdminReport = useMemo(
    () =>
      selectedAdminReportId
        ? (adminReportsSorted.find((r) => r.id === selectedAdminReportId) ?? null)
        : null,
    [adminReportsSorted, selectedAdminReportId],
  );
  const selectedAdminSnapshot = useMemo(
    () =>
      selectedAdminReport
        ? (reportSnapshotRows.find((s) => s.reportId === selectedAdminReport.id) ?? null)
        : null,
    [reportSnapshotRows, selectedAdminReport],
  );

  const orphanSuperAdminRows = useMemo(
    () =>
      activeAdminRows.filter(
        (r) => r.role === "super_admin" && !profileByIdentityHex.has(r.adminIdentity.toHexString()),
      ),
    [activeAdminRows, profileByIdentityHex],
  );
  const hasReachableSuperAdmin = useMemo(
    () =>
      activeAdminRows.some(
        (r) => r.role === "super_admin" && profileByIdentityHex.has(r.adminIdentity.toHexString()),
      ),
    [activeAdminRows, profileByIdentityHex],
  );
  const canClaimOrphanSuperAdmin =
    !rawIsAdmin && !hasReachableSuperAdmin && orphanSuperAdminRows.length === 1;

  const adminSearchRows = useMemo(() => {
    const activeAdminSet = new Set(activeAdminRows.map((r) => r.adminIdentity.toHexString()));
    const candidates = allProfiles.filter(
      (p) => !activeAdminSet.has(p.ownerIdentity.toHexString()),
    );
    const q = adminAccountSearch.trim().toLowerCase();
    if (!q) return candidates.slice(0, 40);
    return candidates
      .filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.ownerIdentity.toHexString().toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [allProfiles, adminAccountSearch, activeAdminRows]);

  const activeSanctionsForTarget = useMemo(
    () =>
      adminTargetIdentityHex
        ? userSanctionRows.filter(
            (s) =>
              s.targetIdentity.toHexString() === adminTargetIdentityHex &&
              s.status === "active",
          )
        : [],
    [adminTargetIdentityHex, userSanctionRows],
  );

  const profileByEmail = useMemo(() => {
    const m = new Map<string, AccountProfile>();
    for (const p of allProfiles) m.set((p.email ?? "").trim().toLowerCase(), p);
    return m;
  }, [allProfiles]);
  const adminGrantEmailCandidates = useMemo(
    () =>
      allProfiles
        .map((p) => (p.email ?? "").trim().toLowerCase())
        .filter((em) => !!em)
        .sort((a, b) => a.localeCompare(b)),
    [allProfiles],
  );
  const selectedAdminTargetProfile = useMemo(
    () =>
      adminTargetIdentityHex ? (profileByIdentityHex.get(adminTargetIdentityHex) ?? null) : null,
    [profileByIdentityHex, adminTargetIdentityHex],
  );

  const adminRoleLabel: Record<string, string> = {
    super_admin: "超級管理員",
    moderator: "管理員",
    reviewer: "審核員",
  };

  return {
    allProfiles,
    displayNameByEmail,
    profileByIdentityHex,
    adminEmailByHex,
    adminReportsSorted,
    activeAdminRows,
    inactiveAdminRows,
    hasAnyAdmin,
    superOpsStats,
    selectedAdminReport,
    selectedAdminSnapshot,
    canClaimOrphanSuperAdmin,
    adminSearchRows,
    activeSanctionsForTarget,
    profileByEmail,
    adminGrantEmailCandidates,
    selectedAdminTargetProfile,
    adminRoleLabel,
    superAdminTrends,
  };
}

type UseAdminWorkbenchActionsParams = {
  identity: Identity;
  hasAnyAdmin: boolean;
  canClaimOrphanSuperAdmin: boolean;
  selectedAdminReport: ReportTicket | null;
  adminReportStatus: string;
  adminReportPriority: number;
  adminResolutionNote: string;
  sanctionTypeDraft: "mute" | "ban" | "warn" | "limit";
  sanctionReasonDraft: string;
  sanctionDetailDraft: string;
  sanctionBanDays: number | "permanent";
  capsuleMessageRows: readonly CapsuleMessage[];
  squarePostRows: readonly SquarePost[];
  profileByEmail: Map<string, AccountProfile>;
  adminGrantEmail: string;
  adminGrantRole: string;
  adminGrantActive: boolean;
  adminEditIdentityHex: string;
  adminEditRole: string;
  adminEditActive: boolean;
  adminTargetIdentityHex: string;
  activeSanctionsForTarget: readonly UserSanction[];
  avatarCatalogRows: readonly any[];
  setAdminActionLoading: (value: boolean) => void;
  setAdminActionError: (value: string) => void;
  setAdminGrantEmail: (value: string) => void;
  setAdminEditIdentityHex: (value: string) => void;
  setAdminEditEmail: (value: string) => void;
  setAdminEditRole: (value: string) => void;
  setAdminEditActive: (value: boolean) => void;
  setAdminEditOpenWithStack: (open: boolean) => void;
  setAdminRole: (args: { adminIdentity: Identity; role: string; isActive: boolean }) => Promise<unknown>;
  claimOrphanSuperAdmin: () => Promise<unknown>;
  adminUpdateReportTicket: (args: {
    reportId: string;
    status: string;
    priority: number;
    resolutionNote: string;
    assignedAdminIdentity: Identity;
  }) => Promise<unknown>;
  adminApplyUserSanction: (args: {
    targetIdentity: Identity;
    sanctionType: string;
    reasonCode: string;
    detailText: string;
    endAt: Timestamp | undefined;
  }) => Promise<unknown>;
  adminSetUserSanctionStatus: (args: {
    sanctionId: string;
    status: string;
    adminNote: string;
  }) => Promise<unknown>;
  adminDeleteCapsule: (args: { capsuleId: string }) => Promise<unknown>;
  adminDeleteSquarePost: (args: { sourceMessageId: string }) => Promise<unknown>;
  adminDeleteRoleRecord: (args: { adminIdentity: Identity }) => Promise<unknown>;
  adminUpdateAvatarCatalogItem: (args: {
    avatarKey: string;
    pricePoints: number;
    isPublished: boolean;
    sortOrder: number;
  }) => Promise<unknown>;
  adminDeleteAvatarCatalogItem: (args: { avatarKey: string }) => Promise<unknown>;
  adminCreateAvatarSeriesBatch: (args: {
    seriesKey: string;
    seriesDisplayName: string;
    basePath: string;
    defaultPricePoints: number;
    sortOrderBase: number;
    generateCount: number;
  }) => Promise<unknown>;
  presetReporterDismiss: string;
};

export function useAdminWorkbenchActions({
  identity,
  hasAnyAdmin,
  canClaimOrphanSuperAdmin,
  selectedAdminReport,
  adminReportStatus,
  adminReportPriority,
  adminResolutionNote,
  sanctionTypeDraft,
  sanctionReasonDraft,
  sanctionDetailDraft,
  sanctionBanDays,
  capsuleMessageRows,
  squarePostRows,
  profileByEmail,
  adminGrantEmail,
  adminGrantRole,
  adminGrantActive,
  adminEditIdentityHex,
  adminEditRole,
  adminEditActive,
  adminTargetIdentityHex,
  activeSanctionsForTarget,
  avatarCatalogRows,
  setAdminActionLoading,
  setAdminActionError,
  setAdminGrantEmail,
  setAdminEditIdentityHex,
  setAdminEditEmail,
  setAdminEditRole,
  setAdminEditActive,
  setAdminEditOpenWithStack,
  setAdminRole,
  claimOrphanSuperAdmin,
  adminUpdateReportTicket,
  adminApplyUserSanction,
  adminSetUserSanctionStatus,
  adminDeleteCapsule,
  adminDeleteSquarePost,
  adminDeleteRoleRecord,
  adminUpdateAvatarCatalogItem,
  adminDeleteAvatarCatalogItem,
  adminCreateAvatarSeriesBatch,
  presetReporterDismiss,
}: UseAdminWorkbenchActionsParams) {
  const bootstrapAdminSelf = async () => {
    if (hasAnyAdmin) return;
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await setAdminRole({
        adminIdentity: identity,
        role: "super_admin",
        isActive: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminActionError(msg || "建立管理員失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const recoverOrphanSuperAdmin = async () => {
    if (!canClaimOrphanSuperAdmin) return;
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await claimOrphanSuperAdmin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminActionError(msg || "認領失聯超管失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const submitAdminReportUpdate = async () => {
    if (!selectedAdminReport) return;
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await adminUpdateReportTicket({
        reportId: selectedAdminReport.id,
        status: adminReportStatus,
        priority: adminReportPriority,
        resolutionNote: adminResolutionNote.trim(),
        assignedAdminIdentity: identity,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminActionError(msg || "更新舉報失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const submitSanctionForSelectedReport = async () => {
    if (!selectedAdminReport) return;
    const r = selectedAdminReport;
    const targetAccountHex =
      r.targetType === "chat_account"
        ? r.targetId
        : r.targetType === "capsule"
          ? (capsuleMessageRows.find((c) => c.id === r.targetId)?.authorIdentity.toHexString() ?? null)
          : r.targetType === "square_post"
            ? (squarePostRows.find((p) => p.sourceMessageId === r.targetId)?.publisherIdentity.toHexString() ?? null)
            : null;
    if (!targetAccountHex) {
      setAdminActionError("無法識別被舉報帳號，無法套用處分");
      return;
    }
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      let endAt: Timestamp | undefined = undefined;
      if (sanctionTypeDraft === "ban" && sanctionBanDays !== "permanent") {
        const ms = BigInt(sanctionBanDays) * 86400n * 1_000_000n;
        endAt = new Timestamp(BigInt(Date.now()) * 1000n + ms);
      }
      await adminApplyUserSanction({
        targetIdentity: Identity.fromString(targetAccountHex),
        sanctionType: sanctionTypeDraft,
        reasonCode: sanctionReasonDraft.trim() || "report_violation",
        detailText: sanctionDetailDraft.trim() || "由舉報單觸發",
        endAt,
      });
      await adminUpdateReportTicket({
        reportId: selectedAdminReport.id,
        status: "resolved",
        priority: adminReportPriority,
        resolutionNote: adminResolutionNote.trim() || "已套用處分",
        assignedAdminIdentity: identity,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminActionError(msg || "套用處分失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const quickDismissReport = async () => {
    if (!selectedAdminReport) return;
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await adminUpdateReportTicket({
        reportId: selectedAdminReport.id,
        status: "dismissed",
        priority: adminReportPriority,
        resolutionNote: adminResolutionNote.trim() || presetReporterDismiss,
        assignedAdminIdentity: identity,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminActionError(msg || "操作失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const submitAdminRoleUpsert = async () => {
    const em = adminGrantEmail.trim().toLowerCase();
    if (!em) {
      setAdminActionError("請輸入管理員帳號（email）");
      return;
    }
    const target = profileByEmail.get(em);
    if (!target) {
      setAdminActionError("找不到此帳號，請先確認已註冊");
      return;
    }
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await setAdminRole({
        adminIdentity: target.ownerIdentity,
        role: adminGrantRole.trim() || "moderator",
        isActive: adminGrantActive,
      });
      setAdminGrantEmail("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminActionError(msg || "更新管理員失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const setSingleAdminActive = async (row: AdminRole, isActive: boolean) => {
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await setAdminRole({
        adminIdentity: row.adminIdentity,
        role: row.role,
        isActive,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminActionError(msg || "更新管理員狀態失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const openAdminEditModal = (row: AdminRole, email: string) => {
    setAdminEditIdentityHex(row.adminIdentity.toHexString());
    setAdminEditEmail(email);
    setAdminEditRole(row.role);
    setAdminEditActive(row.isActive);
    setAdminEditOpenWithStack(true);
  };

  const submitAdminEdit = async () => {
    if (!adminEditIdentityHex) return;
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await setAdminRole({
        adminIdentity: Identity.fromString(adminEditIdentityHex),
        role: adminEditRole.trim() || "moderator",
        isActive: adminEditActive,
      });
      setAdminEditOpenWithStack(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminActionError(msg || "更新管理員失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const quickBanTargetAccount = async () => {
    if (!adminTargetIdentityHex.trim()) {
      setAdminActionError("請先選擇帳號");
      return;
    }
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await adminApplyUserSanction({
        targetIdentity: Identity.fromString(adminTargetIdentityHex),
        sanctionType: "ban",
        reasonCode: "admin_quick_ban",
        detailText: "管理後台一鍵停權",
        endAt: undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminActionError(msg || "一鍵停權失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const quickUnbanTargetAccount = async () => {
    if (!adminTargetIdentityHex.trim()) {
      setAdminActionError("請先選擇帳號");
      return;
    }
    const activeBan = activeSanctionsForTarget.find((s) => s.sanctionType === "ban");
    if (!activeBan) {
      setAdminActionError("目前沒有可復權的 ban 處分");
      return;
    }
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await adminSetUserSanctionStatus({
        sanctionId: activeBan.id,
        status: "revoked",
        adminNote: "管理後台一鍵復權",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminActionError(msg || "一鍵復權失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const removeCapsuleAsAdmin = async (capsuleId: string) => {
    setAdminActionLoading(true);
    try {
      await adminDeleteCapsule({ capsuleId });
    } catch (e: unknown) {
      setAdminActionError(e instanceof Error ? e.message : "刪除失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const removeSquarePostAsAdmin = async (sourceMessageId: string) => {
    setAdminActionLoading(true);
    try {
      await adminDeleteSquarePost({ sourceMessageId });
    } catch (e: unknown) {
      setAdminActionError(e instanceof Error ? e.message : "刪除失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const removeRoleRecordAsAdmin = async (adminIdentity: Identity) => {
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await adminDeleteRoleRecord({ adminIdentity });
    } catch (e: unknown) {
      setAdminActionError(e instanceof Error ? e.message : "刪除失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const updateAvatarCatalogItem = async (args: {
    avatarKey: string;
    pricePoints: number;
    isPublished: boolean;
    sortOrder: number;
  }) => {
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await adminUpdateAvatarCatalogItem(args);
    } catch (e: unknown) {
      setAdminActionError(e instanceof Error ? e.message : "更新頭像設定失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const createAvatarSeriesBatch = async (args: {
    seriesKey: string;
    seriesDisplayName: string;
    basePath: string;
    defaultPricePoints: number;
    sortOrderBase: number;
    generateCount: number;
  }) => {
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await adminCreateAvatarSeriesBatch(args);
    } catch (e: unknown) {
      setAdminActionError(e instanceof Error ? e.message : "建立系列失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const deleteAvatarCatalogItem = async (avatarKey: string) => {
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await adminDeleteAvatarCatalogItem({ avatarKey });
    } catch (e: unknown) {
      setAdminActionError(e instanceof Error ? e.message : "刪除頭像設定失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

  return {
    bootstrapAdminSelf,
    recoverOrphanSuperAdmin,
    submitAdminReportUpdate,
    submitSanctionForSelectedReport,
    quickDismissReport,
    submitAdminRoleUpsert,
    setSingleAdminActive,
    openAdminEditModal,
    submitAdminEdit,
    quickBanTargetAccount,
    quickUnbanTargetAccount,
    removeCapsuleAsAdmin,
    removeSquarePostAsAdmin,
    removeRoleRecordAsAdmin,
    updateAvatarCatalogItem,
    createAvatarSeriesBatch,
    deleteAvatarCatalogItem,
    avatarCatalogRows,
  };
}

type UseAdminWorkbenchRuntimeParams = {
  activeTab: string;
  identity: Identity;
  myAccountId: string | null;
  myProfile: AccountProfile | null;
  isMyReportTab: boolean;
  selectedAdminReportId: string | null;
  adminAccountSearch: string;
  adminTargetIdentityHex: string;
  capsuleMessageSpaceStateRows: readonly CapsuleMessageSpaceState[];
  capsuleMessageRows: readonly CapsuleMessage[];
  squarePostRows: readonly SquarePost[];
  squareCommentRows: readonly SquareComment[];
  sanctionTypeDraft: "mute" | "ban" | "warn" | "limit";
  sanctionReasonDraft: string;
  sanctionDetailDraft: string;
  sanctionBanDays: number | "permanent";
  adminReportStatus: string;
  adminReportPriority: number;
  adminResolutionNote: string;
  adminGrantEmail: string;
  adminGrantRole: string;
  adminGrantActive: boolean;
  adminEditIdentityHex: string;
  adminEditRole: string;
  adminEditActive: boolean;
  setAdminActionLoading: (value: boolean) => void;
  setAdminActionError: (value: string) => void;
  setAdminGrantEmail: (value: string) => void;
  setAdminEditIdentityHex: (value: string) => void;
  setAdminEditEmail: (value: string) => void;
  setAdminEditRole: (value: string) => void;
  setAdminEditActive: (value: boolean) => void;
  setAdminEditOpenWithStack: (open: boolean) => void;
  setAdminRole: (args: { adminIdentity: Identity; role: string; isActive: boolean }) => Promise<unknown>;
  claimOrphanSuperAdmin: () => Promise<unknown>;
  adminUpdateReportTicket: (args: {
    reportId: string;
    status: string;
    priority: number;
    resolutionNote: string;
    assignedAdminIdentity: Identity;
  }) => Promise<unknown>;
  adminApplyUserSanction: (args: {
    targetIdentity: Identity;
    sanctionType: string;
    reasonCode: string;
    detailText: string;
    endAt: Timestamp | undefined;
  }) => Promise<unknown>;
  adminSetUserSanctionStatus: (args: {
    sanctionId: string;
    status: string;
    adminNote: string;
  }) => Promise<unknown>;
  adminDeleteCapsule: (args: { capsuleId: string }) => Promise<unknown>;
  adminDeleteSquarePost: (args: { sourceMessageId: string }) => Promise<unknown>;
  adminDeleteRoleRecord: (args: { adminIdentity: Identity }) => Promise<unknown>;
  adminUpdateAvatarCatalogItem: (args: {
    avatarKey: string;
    pricePoints: number;
    isPublished: boolean;
    sortOrder: number;
  }) => Promise<unknown>;
  adminDeleteAvatarCatalogItem: (args: { avatarKey: string }) => Promise<unknown>;
  adminCreateAvatarSeriesBatch: (args: {
    seriesKey: string;
    seriesDisplayName: string;
    basePath: string;
    defaultPricePoints: number;
    sortOrderBase: number;
    generateCount: number;
  }) => Promise<unknown>;
  presetReporterDismiss: string;
};

export function useAdminWorkbenchRuntime(params: UseAdminWorkbenchRuntimeParams) {
  const capsuleStateById = useMemo(() => {
    const m = new Map<string, CapsuleMessageSpaceState>();
    for (const row of params.capsuleMessageSpaceStateRows) {
      m.set(row.capsuleId, row);
    }
    return m;
  }, [params.capsuleMessageSpaceStateRows]);

  const tables = useAdminWorkbenchTables({
    activeTab: params.activeTab,
    identity: params.identity,
    myAccountId: params.myAccountId,
    myProfile: params.myProfile,
    isMyReportTab: params.isMyReportTab,
  });

  const derived = useAdminWorkbenchDerived({
    adminProfiles: tables.adminProfiles,
    adminRoleRows: tables.adminRoleRows,
    reportTicketRows: tables.reportTicketRows,
    reportSnapshotRows: tables.reportSnapshotRows,
    accountProfileCreatedAtRows: tables.accountProfileCreatedAtRows,
    userSanctionRows: tables.userSanctionRows,
    appealTicketRows: tables.appealTicketRows,
    moderationQueueRows: tables.moderationQueueRows,
    capsuleMessageRows: params.capsuleMessageRows,
    squarePostRows: params.squarePostRows,
    squareCommentRows: params.squareCommentRows,
    capsuleStateById,
    selectedAdminReportId: params.selectedAdminReportId,
    adminAccountSearch: params.adminAccountSearch,
    adminTargetIdentityHex: params.adminTargetIdentityHex,
    rawIsAdmin: tables.rawIsAdmin,
  });

  const actions = useAdminWorkbenchActions({
    identity: params.identity,
    hasAnyAdmin: derived.hasAnyAdmin,
    canClaimOrphanSuperAdmin: derived.canClaimOrphanSuperAdmin,
    selectedAdminReport: derived.selectedAdminReport,
    adminReportStatus: params.adminReportStatus,
    adminReportPriority: params.adminReportPriority,
    adminResolutionNote: params.adminResolutionNote,
    sanctionTypeDraft: params.sanctionTypeDraft,
    sanctionReasonDraft: params.sanctionReasonDraft,
    sanctionDetailDraft: params.sanctionDetailDraft,
    sanctionBanDays: params.sanctionBanDays,
    capsuleMessageRows: params.capsuleMessageRows,
    squarePostRows: params.squarePostRows,
    profileByEmail: derived.profileByEmail,
    adminGrantEmail: params.adminGrantEmail,
    adminGrantRole: params.adminGrantRole,
    adminGrantActive: params.adminGrantActive,
    adminEditIdentityHex: params.adminEditIdentityHex,
    adminEditRole: params.adminEditRole,
    adminEditActive: params.adminEditActive,
    adminTargetIdentityHex: params.adminTargetIdentityHex,
    activeSanctionsForTarget: derived.activeSanctionsForTarget,
    avatarCatalogRows: tables.avatarCatalogRows,
    setAdminActionLoading: params.setAdminActionLoading,
    setAdminActionError: params.setAdminActionError,
    setAdminGrantEmail: params.setAdminGrantEmail,
    setAdminEditIdentityHex: params.setAdminEditIdentityHex,
    setAdminEditEmail: params.setAdminEditEmail,
    setAdminEditRole: params.setAdminEditRole,
    setAdminEditActive: params.setAdminEditActive,
    setAdminEditOpenWithStack: params.setAdminEditOpenWithStack,
    setAdminRole: params.setAdminRole,
    claimOrphanSuperAdmin: params.claimOrphanSuperAdmin,
    adminUpdateReportTicket: params.adminUpdateReportTicket,
    adminApplyUserSanction: params.adminApplyUserSanction,
    adminSetUserSanctionStatus: params.adminSetUserSanctionStatus,
    adminDeleteCapsule: params.adminDeleteCapsule,
    adminDeleteSquarePost: params.adminDeleteSquarePost,
    adminDeleteRoleRecord: params.adminDeleteRoleRecord,
    adminUpdateAvatarCatalogItem: params.adminUpdateAvatarCatalogItem,
    adminDeleteAvatarCatalogItem: params.adminDeleteAvatarCatalogItem,
    adminCreateAvatarSeriesBatch: params.adminCreateAvatarSeriesBatch,
    presetReporterDismiss: params.presetReporterDismiss,
  });

  return {
    ...tables,
    ...derived,
    ...actions,
  };
}
