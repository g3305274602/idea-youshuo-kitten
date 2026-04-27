import { create } from "zustand";

import type { AppTab, AppView, OpenedBroadcastItem } from "./types";

type SetStateAction<T> = T | ((prev: T) => T);

function resolveState<T>(next: SetStateAction<T>, prev: T): T {
  return typeof next === "function" ? (next as (value: T) => T)(prev) : next;
}

type SpaceTargetInfo = {
  accountId: string;
  displayName: string;
  gender: string;
  birthDate?: any;
} | null;

export type BackTab =
  | "secret"
  | "new"
  | "direct"
  | "mine"
  | "mine_square"
  | "inbox"
  | "outbox"
  | "favorites"
  | "chat"
  | "space"
  | "admin"
  | "admin_ops"
  | "my_reports"
  | null;

type ReportTargetType =
  | "capsule"
  | "square_post"
  | "chat_thread"
  | "chat_account";

type ProfileForm = {
  displayName: string;
  profileNote: string;
};

type OutboxEditForm = {
  recipientEmail: string;
  content: string;
  scheduledAtLocal: string;
  isWaitListVisible: boolean;
  publishToSquare: boolean;
  squareRepliesPublic: boolean;
  squareIncludeThread: boolean;
  squareIncludeCapsulePrivate: boolean;
  squareShowSender: boolean;
  squareShowRecipient: boolean;
} | null;

type MailboxSectionsOpen = {
  inbox: { sealed: boolean; opened: boolean };
  outbox: { sealed: boolean; opened: boolean };
};

type AppUiStore = {
  view: AppView;
  isBooting: boolean;
  activeTab: AppTab;
  spaceOwnerHex: string | null;
  spaceTargetInfo: SpaceTargetInfo;
  selectedMessageId: string | null;
  squareSelectedPostId: string | null;
  favoriteSelectedId: string | null;
  selectedChatThreadKey: string | null;
  chatBackTab: BackTab;
  spaceBackTab: BackTab;
  profileModalOpen: boolean;
  profileActionMenuOpen: boolean;
  passwordModalOpen: boolean;
  reportModalOpen: boolean;
  publishModalOpen: boolean;
  banNoticeOpen: boolean;
  outboxDeleteConfirmOpen: boolean;
  nowTick: number;
  capsuleOpen: boolean;
  capsulePostId: string | null;
  secretWallExpanded: boolean;
  publishIncludeThread: boolean;
  publishIncludeCapsulePrivate: boolean;
  publishRepliesPublic: boolean;
  squareCommentDraft: string;
  capsulePrivateDraft: string;
  capsuleThreadGuestHex: string | null;
  capsuleSwitching: boolean;
  chatDraft: string;
  chatPeerProfileOpen: boolean;
  squareActionError: string;
  composeSyncSquare: boolean;
  composeMainOnly: boolean;
  composeIncludeCapsulePrivate: boolean;
  composeCommentsEnabled: boolean;
  composeShowSquareSender: boolean;
  composeShowSquareRecipient: boolean;
  exchangeAppendDraft: string;
  exchangeAppendBusy: boolean;
  publishShowSender: boolean;
  publishShowRecipient: boolean;
  introEditOpen: boolean;
  introEditDraft: string;
  introEditSaving: boolean;
  introEditError: string;
  passwordOld: string;
  passwordNew: string;
  passwordConfirm: string;
  passwordSaving: boolean;
  passwordError: string;
  profileSaving: boolean;
  profileForm: ProfileForm;
  profileError: string;
  email: string;
  password: string;
  confirmPassword: string;
  registerDisplayName: string;
  registerGender: string;
  registerProfileNote: string;
  loading: boolean;
  error: string;
  composeError: string;
  composeSuccess: string;
  composeMode: "capsule" | "direct";
  composeCapsuleType: number;
  ageGateYears: string;
  ageGateGender: string;
  ageGateSaving: boolean;
  ageGateError: string;
  reportTargetType: ReportTargetType;
  reportTargetId: string;
  reportReasonCode: string;
  banNoticeInfo: { endAt: string; reason: string } | null;
  reportDetail: string;
  reportSaving: boolean;
  reportError: string;
  openedBroadcastItems: OpenedBroadcastItem[];
  outboxEditOpen: boolean;
  outboxEditLoading: boolean;
  outboxEditSaving: boolean;
  outboxEditError: string;
  outboxEditForm: OutboxEditForm;
  mailboxSectionsOpen: MailboxSectionsOpen;
  birthMonth: number;
  birthDay: number;
  birthYear: number;
  setView: (value: SetStateAction<AppView>) => void;
  setIsBooting: (value: SetStateAction<boolean>) => void;
  setActiveTab: (value: SetStateAction<AppTab>) => void;
  setSpaceOwnerHex: (value: SetStateAction<string | null>) => void;
  setSpaceTargetInfo: (value: SetStateAction<SpaceTargetInfo>) => void;
  setSelectedMessageId: (value: SetStateAction<string | null>) => void;
  setSquareSelectedPostId: (value: SetStateAction<string | null>) => void;
  setFavoriteSelectedId: (value: SetStateAction<string | null>) => void;
  setSelectedChatThreadKey: (value: SetStateAction<string | null>) => void;
  setChatBackTab: (value: SetStateAction<BackTab>) => void;
  setSpaceBackTab: (value: SetStateAction<BackTab>) => void;
  setProfileModalOpen: (value: SetStateAction<boolean>) => void;
  setProfileActionMenuOpen: (value: SetStateAction<boolean>) => void;
  setPasswordModalOpen: (value: SetStateAction<boolean>) => void;
  setReportModalOpen: (value: SetStateAction<boolean>) => void;
  setPublishModalOpen: (value: SetStateAction<boolean>) => void;
  setBanNoticeOpen: (value: SetStateAction<boolean>) => void;
  setOutboxDeleteConfirmOpen: (value: SetStateAction<boolean>) => void;
  setNowTick: (value: SetStateAction<number>) => void;
  setCapsuleOpen: (value: SetStateAction<boolean>) => void;
  setCapsulePostId: (value: SetStateAction<string | null>) => void;
  setSecretWallExpanded: (value: SetStateAction<boolean>) => void;
  setPublishIncludeThread: (value: SetStateAction<boolean>) => void;
  setPublishIncludeCapsulePrivate: (value: SetStateAction<boolean>) => void;
  setPublishRepliesPublic: (value: SetStateAction<boolean>) => void;
  setSquareCommentDraft: (value: SetStateAction<string>) => void;
  setCapsulePrivateDraft: (value: SetStateAction<string>) => void;
  setCapsuleThreadGuestHex: (value: SetStateAction<string | null>) => void;
  setCapsuleSwitching: (value: SetStateAction<boolean>) => void;
  setChatDraft: (value: SetStateAction<string>) => void;
  setChatPeerProfileOpen: (value: SetStateAction<boolean>) => void;
  setSquareActionError: (value: SetStateAction<string>) => void;
  setComposeSyncSquare: (value: SetStateAction<boolean>) => void;
  setComposeMainOnly: (value: SetStateAction<boolean>) => void;
  setComposeIncludeCapsulePrivate: (value: SetStateAction<boolean>) => void;
  setComposeCommentsEnabled: (value: SetStateAction<boolean>) => void;
  setComposeShowSquareSender: (value: SetStateAction<boolean>) => void;
  setComposeShowSquareRecipient: (value: SetStateAction<boolean>) => void;
  setExchangeAppendDraft: (value: SetStateAction<string>) => void;
  setExchangeAppendBusy: (value: SetStateAction<boolean>) => void;
  setPublishShowSender: (value: SetStateAction<boolean>) => void;
  setPublishShowRecipient: (value: SetStateAction<boolean>) => void;
  setIntroEditOpen: (value: SetStateAction<boolean>) => void;
  setIntroEditDraft: (value: SetStateAction<string>) => void;
  setIntroEditSaving: (value: SetStateAction<boolean>) => void;
  setIntroEditError: (value: SetStateAction<string>) => void;
  setPasswordOld: (value: SetStateAction<string>) => void;
  setPasswordNew: (value: SetStateAction<string>) => void;
  setPasswordConfirm: (value: SetStateAction<string>) => void;
  setPasswordSaving: (value: SetStateAction<boolean>) => void;
  setPasswordError: (value: SetStateAction<string>) => void;
  setProfileSaving: (value: SetStateAction<boolean>) => void;
  setProfileForm: (value: SetStateAction<ProfileForm>) => void;
  setProfileError: (value: SetStateAction<string>) => void;
  setEmail: (value: SetStateAction<string>) => void;
  setPassword: (value: SetStateAction<string>) => void;
  setConfirmPassword: (value: SetStateAction<string>) => void;
  setRegisterDisplayName: (value: SetStateAction<string>) => void;
  setRegisterGender: (value: SetStateAction<string>) => void;
  setRegisterProfileNote: (value: SetStateAction<string>) => void;
  setLoading: (value: SetStateAction<boolean>) => void;
  setError: (value: SetStateAction<string>) => void;
  setComposeError: (value: SetStateAction<string>) => void;
  setComposeSuccess: (value: SetStateAction<string>) => void;
  setComposeMode: (value: SetStateAction<"capsule" | "direct">) => void;
  setComposeCapsuleType: (value: SetStateAction<number>) => void;
  setAgeGateYears: (value: SetStateAction<string>) => void;
  setAgeGateGender: (value: SetStateAction<string>) => void;
  setAgeGateSaving: (value: SetStateAction<boolean>) => void;
  setAgeGateError: (value: SetStateAction<string>) => void;
  setReportTargetType: (value: SetStateAction<ReportTargetType>) => void;
  setReportTargetId: (value: SetStateAction<string>) => void;
  setReportReasonCode: (value: SetStateAction<string>) => void;
  setBanNoticeInfo: (
    value: SetStateAction<{ endAt: string; reason: string } | null>,
  ) => void;
  setReportDetail: (value: SetStateAction<string>) => void;
  setReportSaving: (value: SetStateAction<boolean>) => void;
  setReportError: (value: SetStateAction<string>) => void;
  setOpenedBroadcastItems: (value: SetStateAction<OpenedBroadcastItem[]>) => void;
  setOutboxEditOpen: (value: SetStateAction<boolean>) => void;
  setOutboxEditLoading: (value: SetStateAction<boolean>) => void;
  setOutboxEditSaving: (value: SetStateAction<boolean>) => void;
  setOutboxEditError: (value: SetStateAction<string>) => void;
  setOutboxEditForm: (value: SetStateAction<OutboxEditForm>) => void;
  setMailboxSectionsOpen: (value: SetStateAction<MailboxSectionsOpen>) => void;
  setBirthMonth: (value: SetStateAction<number>) => void;
  setBirthDay: (value: SetStateAction<number>) => void;
  setBirthYear: (value: SetStateAction<number>) => void;
};

export const useAppUiStore = create<AppUiStore>()((set) => ({
  view: "loading",
  isBooting: true,
  activeTab: "secret",
  spaceOwnerHex: null,
  spaceTargetInfo: null,
  selectedMessageId: null,
  squareSelectedPostId: null,
  favoriteSelectedId: null,
  selectedChatThreadKey: null,
  chatBackTab: null,
  spaceBackTab: null,
  profileModalOpen: false,
  profileActionMenuOpen: false,
  passwordModalOpen: false,
  reportModalOpen: false,
  publishModalOpen: false,
  banNoticeOpen: false,
  outboxDeleteConfirmOpen: false,
  nowTick: Date.now(),
  capsuleOpen: false,
  capsulePostId: null,
  secretWallExpanded: false,
  publishIncludeThread: false,
  publishIncludeCapsulePrivate: false,
  publishRepliesPublic: false,
  squareCommentDraft: "",
  capsulePrivateDraft: "",
  capsuleThreadGuestHex: null,
  capsuleSwitching: false,
  chatDraft: "",
  chatPeerProfileOpen: false,
  squareActionError: "",
  composeSyncSquare: false,
  composeMainOnly: true,
  composeIncludeCapsulePrivate: false,
  composeCommentsEnabled: false,
  composeShowSquareSender: true,
  composeShowSquareRecipient: true,
  exchangeAppendDraft: "",
  exchangeAppendBusy: false,
  publishShowSender: false,
  publishShowRecipient: false,
  introEditOpen: false,
  introEditDraft: "",
  introEditSaving: false,
  introEditError: "",
  passwordOld: "",
  passwordNew: "",
  passwordConfirm: "",
  passwordSaving: false,
  passwordError: "",
  profileSaving: false,
  profileForm: { displayName: "", profileNote: "" },
  profileError: "",
  email: "",
  password: "",
  confirmPassword: "",
  registerDisplayName: "",
  registerGender: "male",
  registerProfileNote: "",
  loading: false,
  error: "",
  composeError: "",
  composeSuccess: "",
  composeMode: "capsule",
  composeCapsuleType: 4,
  ageGateYears: "16",
  ageGateGender: "male",
  ageGateSaving: false,
  ageGateError: "",
  reportTargetType: "capsule",
  reportTargetId: "",
  reportReasonCode: "abuse",
  banNoticeInfo: null,
  reportDetail: "",
  reportSaving: false,
  reportError: "",
  openedBroadcastItems: [],
  outboxEditOpen: false,
  outboxEditLoading: false,
  outboxEditSaving: false,
  outboxEditError: "",
  outboxEditForm: null,
  mailboxSectionsOpen: {
    inbox: { sealed: true, opened: true },
    outbox: { sealed: true, opened: true },
  },
  birthMonth: new Date().getMonth() + 1,
  birthDay: new Date().getDate(),
  birthYear: new Date().getFullYear() - 16,
  setView: (value) => set((s) => ({ view: resolveState(value, s.view) })),
  setIsBooting: (value) =>
    set((s) => ({ isBooting: resolveState(value, s.isBooting) })),
  setActiveTab: (value) =>
    set((s) => ({ activeTab: resolveState(value, s.activeTab) })),
  setSpaceOwnerHex: (value) =>
    set((s) => ({ spaceOwnerHex: resolveState(value, s.spaceOwnerHex) })),
  setSpaceTargetInfo: (value) =>
    set((s) => ({ spaceTargetInfo: resolveState(value, s.spaceTargetInfo) })),
  setSelectedMessageId: (value) =>
    set((s) => ({ selectedMessageId: resolveState(value, s.selectedMessageId) })),
  setSquareSelectedPostId: (value) =>
    set((s) => ({
      squareSelectedPostId: resolveState(value, s.squareSelectedPostId),
    })),
  setFavoriteSelectedId: (value) =>
    set((s) => ({ favoriteSelectedId: resolveState(value, s.favoriteSelectedId) })),
  setSelectedChatThreadKey: (value) =>
    set((s) => ({
      selectedChatThreadKey: resolveState(value, s.selectedChatThreadKey),
    })),
  setChatBackTab: (value) =>
    set((s) => ({ chatBackTab: resolveState(value, s.chatBackTab) })),
  setSpaceBackTab: (value) =>
    set((s) => ({ spaceBackTab: resolveState(value, s.spaceBackTab) })),
  setProfileModalOpen: (value) =>
    set((s) => ({ profileModalOpen: resolveState(value, s.profileModalOpen) })),
  setProfileActionMenuOpen: (value) =>
    set((s) => ({
      profileActionMenuOpen: resolveState(value, s.profileActionMenuOpen),
    })),
  setPasswordModalOpen: (value) =>
    set((s) => ({ passwordModalOpen: resolveState(value, s.passwordModalOpen) })),
  setReportModalOpen: (value) =>
    set((s) => ({ reportModalOpen: resolveState(value, s.reportModalOpen) })),
  setPublishModalOpen: (value) =>
    set((s) => ({ publishModalOpen: resolveState(value, s.publishModalOpen) })),
  setBanNoticeOpen: (value) =>
    set((s) => ({ banNoticeOpen: resolveState(value, s.banNoticeOpen) })),
  setOutboxDeleteConfirmOpen: (value) =>
    set((s) => ({
      outboxDeleteConfirmOpen: resolveState(value, s.outboxDeleteConfirmOpen),
    })),
  setNowTick: (value) => set((s) => ({ nowTick: resolveState(value, s.nowTick) })),
  setCapsuleOpen: (value) =>
    set((s) => ({ capsuleOpen: resolveState(value, s.capsuleOpen) })),
  setCapsulePostId: (value) =>
    set((s) => ({ capsulePostId: resolveState(value, s.capsulePostId) })),
  setSecretWallExpanded: (value) =>
    set((s) => ({
      secretWallExpanded: resolveState(value, s.secretWallExpanded),
    })),
  setPublishIncludeThread: (value) =>
    set((s) => ({
      publishIncludeThread: resolveState(value, s.publishIncludeThread),
    })),
  setPublishIncludeCapsulePrivate: (value) =>
    set((s) => ({
      publishIncludeCapsulePrivate: resolveState(value, s.publishIncludeCapsulePrivate),
    })),
  setPublishRepliesPublic: (value) =>
    set((s) => ({
      publishRepliesPublic: resolveState(value, s.publishRepliesPublic),
    })),
  setSquareCommentDraft: (value) =>
    set((s) => ({ squareCommentDraft: resolveState(value, s.squareCommentDraft) })),
  setCapsulePrivateDraft: (value) =>
    set((s) => ({
      capsulePrivateDraft: resolveState(value, s.capsulePrivateDraft),
    })),
  setCapsuleThreadGuestHex: (value) =>
    set((s) => ({
      capsuleThreadGuestHex: resolveState(value, s.capsuleThreadGuestHex),
    })),
  setCapsuleSwitching: (value) =>
    set((s) => ({ capsuleSwitching: resolveState(value, s.capsuleSwitching) })),
  setChatDraft: (value) =>
    set((s) => ({ chatDraft: resolveState(value, s.chatDraft) })),
  setChatPeerProfileOpen: (value) =>
    set((s) => ({
      chatPeerProfileOpen: resolveState(value, s.chatPeerProfileOpen),
    })),
  setSquareActionError: (value) =>
    set((s) => ({ squareActionError: resolveState(value, s.squareActionError) })),
  setComposeSyncSquare: (value) =>
    set((s) => ({ composeSyncSquare: resolveState(value, s.composeSyncSquare) })),
  setComposeMainOnly: (value) =>
    set((s) => ({ composeMainOnly: resolveState(value, s.composeMainOnly) })),
  setComposeIncludeCapsulePrivate: (value) =>
    set((s) => ({
      composeIncludeCapsulePrivate: resolveState(value, s.composeIncludeCapsulePrivate),
    })),
  setComposeCommentsEnabled: (value) =>
    set((s) => ({
      composeCommentsEnabled: resolveState(value, s.composeCommentsEnabled),
    })),
  setComposeShowSquareSender: (value) =>
    set((s) => ({
      composeShowSquareSender: resolveState(value, s.composeShowSquareSender),
    })),
  setComposeShowSquareRecipient: (value) =>
    set((s) => ({
      composeShowSquareRecipient: resolveState(value, s.composeShowSquareRecipient),
    })),
  setExchangeAppendDraft: (value) =>
    set((s) => ({
      exchangeAppendDraft: resolveState(value, s.exchangeAppendDraft),
    })),
  setExchangeAppendBusy: (value) =>
    set((s) => ({ exchangeAppendBusy: resolveState(value, s.exchangeAppendBusy) })),
  setPublishShowSender: (value) =>
    set((s) => ({ publishShowSender: resolveState(value, s.publishShowSender) })),
  setPublishShowRecipient: (value) =>
    set((s) => ({
      publishShowRecipient: resolveState(value, s.publishShowRecipient),
    })),
  setIntroEditOpen: (value) =>
    set((s) => ({ introEditOpen: resolveState(value, s.introEditOpen) })),
  setIntroEditDraft: (value) =>
    set((s) => ({ introEditDraft: resolveState(value, s.introEditDraft) })),
  setIntroEditSaving: (value) =>
    set((s) => ({ introEditSaving: resolveState(value, s.introEditSaving) })),
  setIntroEditError: (value) =>
    set((s) => ({ introEditError: resolveState(value, s.introEditError) })),
  setPasswordOld: (value) =>
    set((s) => ({ passwordOld: resolveState(value, s.passwordOld) })),
  setPasswordNew: (value) =>
    set((s) => ({ passwordNew: resolveState(value, s.passwordNew) })),
  setPasswordConfirm: (value) =>
    set((s) => ({ passwordConfirm: resolveState(value, s.passwordConfirm) })),
  setPasswordSaving: (value) =>
    set((s) => ({ passwordSaving: resolveState(value, s.passwordSaving) })),
  setPasswordError: (value) =>
    set((s) => ({ passwordError: resolveState(value, s.passwordError) })),
  setProfileSaving: (value) =>
    set((s) => ({ profileSaving: resolveState(value, s.profileSaving) })),
  setProfileForm: (value) =>
    set((s) => ({ profileForm: resolveState(value, s.profileForm) })),
  setProfileError: (value) =>
    set((s) => ({ profileError: resolveState(value, s.profileError) })),
  setEmail: (value) => set((s) => ({ email: resolveState(value, s.email) })),
  setPassword: (value) => set((s) => ({ password: resolveState(value, s.password) })),
  setConfirmPassword: (value) =>
    set((s) => ({ confirmPassword: resolveState(value, s.confirmPassword) })),
  setRegisterDisplayName: (value) =>
    set((s) => ({
      registerDisplayName: resolveState(value, s.registerDisplayName),
    })),
  setRegisterGender: (value) =>
    set((s) => ({ registerGender: resolveState(value, s.registerGender) })),
  setRegisterProfileNote: (value) =>
    set((s) => ({
      registerProfileNote: resolveState(value, s.registerProfileNote),
    })),
  setLoading: (value) =>
    set((s) => ({ loading: resolveState(value, s.loading) })),
  setError: (value) => set((s) => ({ error: resolveState(value, s.error) })),
  setComposeError: (value) =>
    set((s) => ({ composeError: resolveState(value, s.composeError) })),
  setComposeSuccess: (value) =>
    set((s) => ({ composeSuccess: resolveState(value, s.composeSuccess) })),
  setComposeMode: (value) =>
    set((s) => ({ composeMode: resolveState(value, s.composeMode) })),
  setComposeCapsuleType: (value) =>
    set((s) => ({
      composeCapsuleType: resolveState(value, s.composeCapsuleType),
    })),
  setAgeGateYears: (value) =>
    set((s) => ({ ageGateYears: resolveState(value, s.ageGateYears) })),
  setAgeGateGender: (value) =>
    set((s) => ({ ageGateGender: resolveState(value, s.ageGateGender) })),
  setAgeGateSaving: (value) =>
    set((s) => ({ ageGateSaving: resolveState(value, s.ageGateSaving) })),
  setAgeGateError: (value) =>
    set((s) => ({ ageGateError: resolveState(value, s.ageGateError) })),
  setReportTargetType: (value) =>
    set((s) => ({ reportTargetType: resolveState(value, s.reportTargetType) })),
  setReportTargetId: (value) =>
    set((s) => ({ reportTargetId: resolveState(value, s.reportTargetId) })),
  setReportReasonCode: (value) =>
    set((s) => ({ reportReasonCode: resolveState(value, s.reportReasonCode) })),
  setBanNoticeInfo: (value) =>
    set((s) => ({ banNoticeInfo: resolveState(value, s.banNoticeInfo) })),
  setReportDetail: (value) =>
    set((s) => ({ reportDetail: resolveState(value, s.reportDetail) })),
  setReportSaving: (value) =>
    set((s) => ({ reportSaving: resolveState(value, s.reportSaving) })),
  setReportError: (value) =>
    set((s) => ({ reportError: resolveState(value, s.reportError) })),
  setOpenedBroadcastItems: (value) =>
    set((s) => ({
      openedBroadcastItems: resolveState(value, s.openedBroadcastItems),
    })),
  setOutboxEditOpen: (value) =>
    set((s) => ({ outboxEditOpen: resolveState(value, s.outboxEditOpen) })),
  setOutboxEditLoading: (value) =>
    set((s) => ({
      outboxEditLoading: resolveState(value, s.outboxEditLoading),
    })),
  setOutboxEditSaving: (value) =>
    set((s) => ({
      outboxEditSaving: resolveState(value, s.outboxEditSaving),
    })),
  setOutboxEditError: (value) =>
    set((s) => ({ outboxEditError: resolveState(value, s.outboxEditError) })),
  setOutboxEditForm: (value) =>
    set((s) => ({ outboxEditForm: resolveState(value, s.outboxEditForm) })),
  setMailboxSectionsOpen: (value) =>
    set((s) => ({
      mailboxSectionsOpen: resolveState(value, s.mailboxSectionsOpen),
    })),
  setBirthMonth: (value) =>
    set((s) => ({ birthMonth: resolveState(value, s.birthMonth) })),
  setBirthDay: (value) =>
    set((s) => ({ birthDay: resolveState(value, s.birthDay) })),
  setBirthYear: (value) =>
    set((s) => ({ birthYear: resolveState(value, s.birthYear) })),
}));
