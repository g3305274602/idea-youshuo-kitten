import type { ComponentProps, Dispatch, SetStateAction } from "react";

import { AdminContent, AdminModals, AdminSidebar } from "../app/sections/AdminSection";

export type AdminSidebarWorkbenchProps = ComponentProps<typeof AdminSidebar>;
export type AdminContentWorkbenchProps = ComponentProps<typeof AdminContent>;
export type AdminModalsWorkbenchProps = ComponentProps<typeof AdminModals>;
export type AdminViewProps = {
  sidebarProps: AdminSidebarWorkbenchProps;
  contentProps: AdminContentWorkbenchProps;
  modalProps: AdminModalsWorkbenchProps;
};

export function AdminSidebarWorkbench(props: AdminSidebarWorkbenchProps) {
  return <AdminSidebar {...props} />;
}

export function AdminContentWorkbench(props: AdminContentWorkbenchProps) {
  return <AdminContent {...props} />;
}

export function AdminModalsWorkbench(props: AdminModalsWorkbenchProps) {
  return <AdminModals {...props} />;
}

type BuildAdminViewPropsParams = {
  sidebarProps: AdminSidebarWorkbenchProps;
  contentProps: AdminContentWorkbenchProps;
  modalProps: AdminModalsWorkbenchProps;
};

export function buildAdminViewProps({
  sidebarProps,
  contentProps,
  modalProps,
}: BuildAdminViewPropsParams): AdminViewProps {
  return { sidebarProps, contentProps, modalProps };
}

export function AdminWorkbench({
  viewProps,
  slot,
}: {
  viewProps: AdminViewProps;
  slot: "sidebar" | "content" | "modals";
}) {
  if (slot === "sidebar") {
    return <AdminSidebar {...viewProps.sidebarProps} />;
  }
  if (slot === "content") {
    return <AdminContent {...viewProps.contentProps} />;
  }
  return <AdminModals {...viewProps.modalProps} />;
}

type CreateAdminViewPropsParams = {
  activeTab: "admin" | "admin_ops";
  identity: any;
  auth: { isAdmin: boolean; isSuperAdmin: boolean };
  hasAnyAdmin: boolean;
  adminActionLoading: boolean;
  activeAdminRows: readonly any[];
  adminReportsSorted: readonly any[];
  adminSection: any;
  canClaimOrphanSuperAdmin: boolean;
  setActiveTab: (tab: any) => void;
  setAdminSection: (section: any) => void;
  setAdminMobileShowContent: (v: boolean) => void;
  setSelectedAdminReportId: (v: string | null) => void;
  adminReportFilter: any;
  selectedAdminReportId: string | null;
  selectedAdminReport: any;
  selectedAdminSnapshot: any;
  adminReportStatus: string;
  adminReportPriority: number;
  adminResolutionNote: string;
  adminActionError: string;
  inactiveAdminRows: readonly any[];
  adminEmailByHex: Map<string, string>;
  adminRoleLabel: Record<string, string>;
  profileByIdentityHex: Map<string, any>;
  profileByEmail: Map<string, any>;
  adminGrantEmailCandidates: readonly string[];
  capsuleMessageRows: readonly any[];
  squarePostRows: readonly any[];
  superOpsStats: any;
  superAdminTrends: any;
  adminAccountSearch: string;
  adminSearchRows: readonly any[];
  adminTargetIdentityHex: string;
  selectedAdminTargetProfile: any;
  activeSanctionsForTarget: readonly any[];
  appealTicketRows: readonly any[];
  userSanctionRows: readonly any[];
  moderationQueueRows: readonly any[];
  bootstrapAdminSelf: () => void;
  recoverOrphanSuperAdmin: () => void;
  setAdminReportFilter: (v: any) => void;
  setAdminReportStatus: (v: string) => void;
  setAdminReportPriority: (v: number) => void;
  setAdminResolutionNote: (v: string) => void;
  setSanctionTypeDraft: (v: "mute" | "ban" | "warn" | "limit") => void;
  setSanctionReasonDraft: (v: string) => void;
  setSanctionDetailDraft: (v: string) => void;
  setAdminActionError: (v: string) => void;
  submitAdminReportUpdate: () => void;
  removeCapsuleAsAdmin: (capsuleId: string) => Promise<void>;
  removeSquarePostAsAdmin: (sourceMessageId: string) => Promise<void>;
  PRESET_REPORTER: Record<string, string>;
  PRESET_SANCTION: Record<string, string>;
  quickDismissReport: () => void;
  setSanctionBanDays: (v: number | "permanent") => void;
  submitSanctionForSelectedReport: () => void;
  setAdminGrantEmail: (v: string) => void;
  setAdminGrantRole: (v: string) => void;
  setAdminGrantActive: Dispatch<SetStateAction<boolean>>;
  setAdminAddOpenWithStack: (v: boolean) => void;
  openAdminEditModal: (row: any, email: string) => void;
  setSingleAdminActive: (row: any, active: boolean) => void;
  removeRoleRecordAsAdmin: (adminIdentity: any) => Promise<void>;
  setAdminAccountSearch: (v: string) => void;
  setAdminTargetIdentityHex: (v: string) => void;
  quickBanTargetAccount: () => void;
  quickUnbanTargetAccount: () => void;
  isAdminReportModalVisible: boolean;
  adminGrantEmail: string;
  adminGrantRole: string;
  adminGrantActive: boolean;
  isAdminAddModalVisible: boolean;
  isAdminEditModalVisible: boolean;
  adminEditEmail: string;
  adminEditRole: string;
  adminEditActive: boolean;
  setAdminReportModalOpenWithStack: (v: boolean) => void;
  submitAdminRoleUpsert: () => Promise<void>;
  setAdminEditOpenWithStack: (v: boolean) => void;
  setAdminEditRole: (v: string) => void;
  setAdminEditActive: Dispatch<SetStateAction<boolean>>;
  submitAdminEdit: () => void;
  avatarCatalogRows: readonly any[];
  avatarCatalogEditBusy: boolean;
  avatarCatalogError: string;
  updateAvatarCatalogItem: (args: {
    avatarKey: string;
    pricePoints: number;
    isPublished: boolean;
    sortOrder: number;
  }) => void;
  createAvatarSeriesBatch: (args: {
    seriesKey: string;
    basePath: string;
    defaultPricePoints: number;
    sortOrderBase: number;
    generateCount: number;
  }) => void;
  deleteAvatarCatalogItem: (avatarKey: string) => void;
};

export function createAdminViewProps(params: CreateAdminViewPropsParams) {
  return buildAdminViewProps({
    sidebarProps: {
      activeTab: params.activeTab,
      isAdmin: params.auth.isAdmin,
      isSuperAdmin: params.auth.isSuperAdmin,
      hasAnyAdmin: params.hasAnyAdmin,
      adminActionLoading: params.adminActionLoading,
      activeAdminRows: params.activeAdminRows,
      adminReportsSorted: params.adminReportsSorted,
      adminSection: params.adminSection,
      canClaimOrphanSuperAdmin: params.canClaimOrphanSuperAdmin,
      onBootstrapAdminSelf: () => params.bootstrapAdminSelf(),
      onClaimOrphanSuperAdmin: () => params.recoverOrphanSuperAdmin(),
      onSelectAdminOpsMain: () => {
        params.setActiveTab("admin_ops");
        params.setAdminSection("main");
        params.setAdminMobileShowContent(true);
      },
      onSelectReports: () => {
        params.setActiveTab(params.auth.isSuperAdmin ? "admin_ops" : "admin");
        params.setAdminSection("reports");
        params.setSelectedAdminReportId(null);
        params.setAdminMobileShowContent(true);
      },
      onSelectReview: () => {
        params.setActiveTab("admin");
        params.setAdminSection("review");
        params.setAdminMobileShowContent(true);
      },
      onSelectAvatar: () => {
        params.setActiveTab(params.auth.isSuperAdmin ? "admin_ops" : "admin");
        params.setAdminSection("avatar");
        params.setAdminMobileShowContent(true);
      },
    },
    contentProps: {
      activeTab: params.activeTab,
      identity: params.identity,
      isAdmin: params.auth.isAdmin,
      isSuperAdmin: params.auth.isSuperAdmin,
      hasAnyAdmin: params.hasAnyAdmin,
      adminSection: params.adminSection,
      adminReportFilter: params.adminReportFilter,
      adminReportsSorted: params.adminReportsSorted,
      selectedAdminReportId: params.selectedAdminReportId,
      selectedAdminReport: params.selectedAdminReport,
      selectedAdminSnapshot: params.selectedAdminSnapshot,
      adminReportStatus: params.adminReportStatus,
      adminReportPriority: params.adminReportPriority,
      adminResolutionNote: params.adminResolutionNote,
      adminActionLoading: params.adminActionLoading,
      adminActionError: params.adminActionError,
      activeAdminRows: params.activeAdminRows,
      inactiveAdminRows: params.inactiveAdminRows,
      adminEmailByHex: params.adminEmailByHex,
      adminRoleLabel: params.adminRoleLabel,
      profileByIdentityHex: params.profileByIdentityHex,
      profileByEmail: params.profileByEmail,
      adminGrantEmailCandidates: params.adminGrantEmailCandidates,
      capsuleMessageRows: params.capsuleMessageRows,
      squarePostRows: params.squarePostRows,
      superOpsStats: params.superOpsStats,
      superAdminTrends: params.superAdminTrends,
      adminAccountSearch: params.adminAccountSearch,
      adminSearchRows: params.adminSearchRows,
      adminTargetIdentityHex: params.adminTargetIdentityHex,
      selectedAdminTargetProfile: params.selectedAdminTargetProfile,
      activeSanctionsForTarget: params.activeSanctionsForTarget,
      appealTicketRows: params.appealTicketRows,
      userSanctionRows: params.userSanctionRows,
      moderationQueueRows: params.moderationQueueRows,
      canClaimOrphanSuperAdmin: params.canClaimOrphanSuperAdmin,
      onBootstrapAdminSelf: () => params.bootstrapAdminSelf(),
      onClaimOrphanSuperAdmin: () => params.recoverOrphanSuperAdmin(),
      onSetActiveTab: params.setActiveTab,
      onSetAdminReportFilter: params.setAdminReportFilter,
      onSelectAdminReport: (r) => {
        params.setSelectedAdminReportId(r.id);
        params.setAdminReportStatus(r.status);
        params.setAdminReportPriority(Number(r.priority));
        params.setAdminResolutionNote(r.resolutionNote ?? "");
        params.setSanctionTypeDraft("warn");
        params.setSanctionReasonDraft("report_violation");
        params.setSanctionDetailDraft("");
        params.setAdminActionError("");
      },
      onClearSelectedAdminReport: () => params.setSelectedAdminReportId(null),
      onSetAdminReportStatus: params.setAdminReportStatus,
      onSetAdminReportPriority: params.setAdminReportPriority,
      onSetAdminResolutionNote: params.setAdminResolutionNote,
      onSetSanctionDetailDraft: params.setSanctionDetailDraft,
      onSubmitAdminReportUpdate: () => params.submitAdminReportUpdate(),
      onAdminDeleteCapsule: params.removeCapsuleAsAdmin,
      onAdminDeleteSquarePost: params.removeSquarePostAsAdmin,
      presetReporter: params.PRESET_REPORTER,
      presetSanction: params.PRESET_SANCTION,
      onQuickDismissReport: () => params.quickDismissReport(),
      onSetSanctionTypeDraft: params.setSanctionTypeDraft,
      onSetSanctionBanDays: params.setSanctionBanDays,
      onSubmitSanctionForSelectedReport: () => params.submitSanctionForSelectedReport(),
      onOpenAdminAddModal: () => {
        params.setAdminGrantEmail("");
        params.setAdminGrantRole("moderator");
        params.setAdminGrantActive(true);
        params.setAdminAddOpenWithStack(true);
      },
      onOpenAdminEditModal: params.openAdminEditModal,
      onSetSingleAdminActive: (row, active) => params.setSingleAdminActive(row, active),
      onSetAdminActionError: params.setAdminActionError,
      onSetAdminGrantEmail: params.setAdminGrantEmail,
      onSetAdminGrantRole: params.setAdminGrantRole,
      onSetAdminGrantActive: (value) => params.setAdminGrantActive(value),
      onSetAdminAddOpen: params.setAdminAddOpenWithStack,
      onAdminDeleteRoleRecord: params.removeRoleRecordAsAdmin,
      onSetAdminAccountSearch: params.setAdminAccountSearch,
      onSetAdminTargetIdentityHex: params.setAdminTargetIdentityHex,
      onQuickBanTargetAccount: () => params.quickBanTargetAccount(),
      onQuickUnbanTargetAccount: () => params.quickUnbanTargetAccount(),
      avatarCatalogRows: params.avatarCatalogRows,
      avatarCatalogEditBusy: params.avatarCatalogEditBusy,
      avatarCatalogError: params.avatarCatalogError,
      onAvatarUpdateItem: params.updateAvatarCatalogItem,
      onAvatarOpenCreateModal: () => {},
      onAvatarDeleteItem: params.deleteAvatarCatalogItem,
      onAvatarCreateItem: params.createAvatarSeriesBatch,
    },
    modalProps: {
      adminReportModalOpen: params.isAdminReportModalVisible,
      selectedAdminReport: params.selectedAdminReport,
      selectedAdminSnapshot: params.selectedAdminSnapshot,
      adminActionLoading: params.adminActionLoading,
      adminActionError: params.adminActionError,
      adminReportStatus: params.adminReportStatus,
      adminReportPriority: params.adminReportPriority,
      adminResolutionNote: params.adminResolutionNote,
      adminGrantEmail: params.adminGrantEmail,
      adminGrantRole: params.adminGrantRole,
      adminGrantActive: params.adminGrantActive,
      adminGrantEmailCandidates: params.adminGrantEmailCandidates,
      adminAddOpen: params.isAdminAddModalVisible,
      adminEditOpen: params.isAdminEditModalVisible,
      adminEditEmail: params.adminEditEmail,
      adminEditRole: params.adminEditRole,
      adminEditActive: params.adminEditActive,
      presetReporter: params.PRESET_REPORTER,
      presetSanction: params.PRESET_SANCTION,
      onSetAdminReportModalOpen: params.setAdminReportModalOpenWithStack,
      onSetAdminReportStatus: params.setAdminReportStatus,
      onSetAdminReportPriority: params.setAdminReportPriority,
      onSetAdminResolutionNote: params.setAdminResolutionNote,
      onSetSanctionDetailDraft: params.setSanctionDetailDraft,
      onSetSanctionTypeDraft: params.setSanctionTypeDraft,
      onSetSanctionBanDays: params.setSanctionBanDays,
      onSubmitAdminReportUpdate: () => params.submitAdminReportUpdate(),
      onQuickDismissReport: () => params.quickDismissReport(),
      onSubmitSanctionForSelectedReport: () => params.submitSanctionForSelectedReport(),
      onSetAdminGrantEmail: params.setAdminGrantEmail,
      onSetAdminGrantRole: params.setAdminGrantRole,
      onSetAdminGrantActive: params.setAdminGrantActive,
      onSetAdminAddOpen: params.setAdminAddOpenWithStack,
      onSetAdminActionError: params.setAdminActionError,
      onSubmitAdminRoleUpsert: params.submitAdminRoleUpsert,
      onSetAdminEditOpen: params.setAdminEditOpenWithStack,
      onSetAdminEditRole: params.setAdminEditRole,
      onSetAdminEditActive: params.setAdminEditActive,
      onSubmitAdminEdit: () => params.submitAdminEdit(),
    },
  });
}
