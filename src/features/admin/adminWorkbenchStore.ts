import { create } from "zustand";

import type { AdminReportFilter, AdminSection } from "../app/types";

type SetStateAction<T> = T | ((prev: T) => T);

function resolveState<T>(next: SetStateAction<T>, prev: T): T {
  return typeof next === "function" ? (next as (value: T) => T)(prev) : next;
}

type AdminWorkbenchStore = {
  sanctionBanDays: number | "permanent";
  selectedAdminReportId: string | null;
  adminActionLoading: boolean;
  adminActionError: string;
  adminReportStatus: string;
  adminReportPriority: number;
  adminResolutionNote: string;
  sanctionTypeDraft: "mute" | "ban" | "warn" | "limit";
  sanctionReasonDraft: string;
  sanctionDetailDraft: string;
  adminGrantEmail: string;
  adminGrantRole: string;
  adminGrantActive: boolean;
  adminEditOpen: boolean;
  adminEditIdentityHex: string;
  adminEditEmail: string;
  adminEditRole: string;
  adminEditActive: boolean;
  adminAddOpen: boolean;
  adminReportModalOpen: boolean;
  adminReportFilter: AdminReportFilter;
  adminSection: AdminSection;
  adminAccountSearch: string;
  adminTargetIdentityHex: string;
  adminMobileShowContent: boolean;
  setSanctionBanDays: (value: number | "permanent") => void;
  setSelectedAdminReportId: (value: string | null) => void;
  setAdminActionLoading: (value: boolean) => void;
  setAdminActionError: (value: string) => void;
  setAdminReportStatus: (value: string) => void;
  setAdminReportPriority: (value: number) => void;
  setAdminResolutionNote: (value: string) => void;
  setSanctionTypeDraft: (value: "mute" | "ban" | "warn" | "limit") => void;
  setSanctionReasonDraft: (value: string) => void;
  setSanctionDetailDraft: (value: string) => void;
  setAdminGrantEmail: (value: string) => void;
  setAdminGrantRole: (value: string) => void;
  setAdminGrantActive: (value: SetStateAction<boolean>) => void;
  setAdminEditOpen: (value: SetStateAction<boolean>) => void;
  setAdminEditIdentityHex: (value: string) => void;
  setAdminEditEmail: (value: string) => void;
  setAdminEditRole: (value: string) => void;
  setAdminEditActive: (value: SetStateAction<boolean>) => void;
  setAdminAddOpen: (value: SetStateAction<boolean>) => void;
  setAdminReportModalOpen: (value: SetStateAction<boolean>) => void;
  setAdminReportFilter: (value: AdminReportFilter) => void;
  setAdminSection: (value: AdminSection) => void;
  setAdminAccountSearch: (value: string) => void;
  setAdminTargetIdentityHex: (value: string) => void;
  setAdminMobileShowContent: (value: SetStateAction<boolean>) => void;
};

export const useAdminWorkbenchStore = create<AdminWorkbenchStore>()((set) => ({
  sanctionBanDays: 7,
  selectedAdminReportId: null,
  adminActionLoading: false,
  adminActionError: "",
  adminReportStatus: "in_review",
  adminReportPriority: 2,
  adminResolutionNote: "",
  sanctionTypeDraft: "warn",
  sanctionReasonDraft: "report_violation",
  sanctionDetailDraft: "",
  adminGrantEmail: "",
  adminGrantRole: "moderator",
  adminGrantActive: true,
  adminEditOpen: false,
  adminEditIdentityHex: "",
  adminEditEmail: "",
  adminEditRole: "moderator",
  adminEditActive: true,
  adminAddOpen: false,
  adminReportModalOpen: false,
  adminReportFilter: "pending",
  adminSection: "main",
  adminAccountSearch: "",
  adminTargetIdentityHex: "",
  adminMobileShowContent: false,
  setSanctionBanDays: (value) => set({ sanctionBanDays: value }),
  setSelectedAdminReportId: (value) => set({ selectedAdminReportId: value }),
  setAdminActionLoading: (value) => set({ adminActionLoading: value }),
  setAdminActionError: (value) => set({ adminActionError: value }),
  setAdminReportStatus: (value) => set({ adminReportStatus: value }),
  setAdminReportPriority: (value) => set({ adminReportPriority: value }),
  setAdminResolutionNote: (value) => set({ adminResolutionNote: value }),
  setSanctionTypeDraft: (value) => set({ sanctionTypeDraft: value }),
  setSanctionReasonDraft: (value) => set({ sanctionReasonDraft: value }),
  setSanctionDetailDraft: (value) => set({ sanctionDetailDraft: value }),
  setAdminGrantEmail: (value) => set({ adminGrantEmail: value }),
  setAdminGrantRole: (value) => set({ adminGrantRole: value }),
  setAdminGrantActive: (value) =>
    set((state) => ({
      adminGrantActive: resolveState(value, state.adminGrantActive),
    })),
  setAdminEditOpen: (value) =>
    set((state) => ({ adminEditOpen: resolveState(value, state.adminEditOpen) })),
  setAdminEditIdentityHex: (value) => set({ adminEditIdentityHex: value }),
  setAdminEditEmail: (value) => set({ adminEditEmail: value }),
  setAdminEditRole: (value) => set({ adminEditRole: value }),
  setAdminEditActive: (value) =>
    set((state) => ({ adminEditActive: resolveState(value, state.adminEditActive) })),
  setAdminAddOpen: (value) =>
    set((state) => ({ adminAddOpen: resolveState(value, state.adminAddOpen) })),
  setAdminReportModalOpen: (value) =>
    set((state) => ({
      adminReportModalOpen: resolveState(value, state.adminReportModalOpen),
    })),
  setAdminReportFilter: (value) => set({ adminReportFilter: value }),
  setAdminSection: (value) => set({ adminSection: value }),
  setAdminAccountSearch: (value) => set({ adminAccountSearch: value }),
  setAdminTargetIdentityHex: (value) => set({ adminTargetIdentityHex: value }),
  setAdminMobileShowContent: (value) =>
    set((state) => ({
      adminMobileShowContent: resolveState(value, state.adminMobileShowContent),
    })),
}));
