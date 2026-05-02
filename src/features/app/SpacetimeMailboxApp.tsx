/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from "react";
import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  User,
  History,
  Clock,
  ChevronRight,
  ChevronDown,
  PenTool,
  Loader2,
  X,
  Bell,
  Sparkles,
  Plus,
  Activity,
  Mars, // 男
  Venus, // 女
  Asterisk, // 其他
} from "lucide-react";
import { tables, reducers } from "../../module_bindings";
import type {
  AccountProfile,
  CapsulePrivateMessage,
  CapsuleMessage,
  SquareComment,
  SquarePost,
} from "../../module_bindings/types";
import { useTable, useReducer } from "spacetimedb/react";
import { Identity, Timestamp } from "spacetimedb";
import { cn, emailsEqual } from "../../lib/utils";
import {
  SPACETIME_TOKEN_KEY,
  TEXT_LIMIT,
  capsuleTypeMeta,
} from "./constants";
import {
  MailboxGroupedList,
  SecretCapsuleDrawButton,
  SecretWallSection,
} from "./components";
import { AuthSection } from "./sections/AuthSection";
import { OverlayModalsSection } from "./sections/OverlayModalsSection";
import { AccountModalsSection } from "./sections/AccountModalsSection";
import { ProfileModalSection } from "./sections/ProfileModalSection";
import { PublishModalSection } from "./sections/PublishModalSection";
import { MobileBottomNavSection } from "./sections/MobileBottomNavSection";
import { ProfileActionMenuSection } from "./sections/ProfileActionMenuSection";
import { AvatarPickerModalSection } from "./sections/AvatarPickerModalSection";
import { AgeGateModalSection } from "./sections/AgeGateModalSection";
import { TopNavSection } from "./sections/TopNavSection";
import { StatusBannersSection } from "./sections/StatusBannersSection";
import { SpaceMainSection } from "./sections/SpaceMainSection";
import { SpaceSidebarSection } from "./sections/SpaceSidebarSection";
import { MyReportsSidebarSection } from "./sections/MyReportsSidebarSection";
import { ChatThreadsSidebarSection } from "./sections/ChatThreadsSidebarSection";
import { FavoritesSidebarSection } from "./sections/FavoritesSidebarSection";
import { MineHubMenuNav, showMineHubDesktopSubNav } from "./sections/MineHubMenuNav";
import { MineSidebarSection } from "./sections/MineSidebarSection";
import { ChatMainSection } from "./sections/ChatMainSection";
import { SecretMainSection } from "./sections/SecretMainSection";
import { SecretTabFooterBar } from "./sections/SecretTabFooterBar";
import { FavoritesMainSection } from "./sections/FavoritesMainSection";
import { ComposeMessageMainSection } from "./sections/ComposeMessageMainSection";
import { CapsuleOverlaySection } from "./sections/CapsuleOverlaySection";
import { WheelPicker } from "./sections/PickerControls";
import {
  compareMessagesRecentFirst,
  openedBroadcastFromMessage,
  scheduledRowToMessage,
} from "./helpers";
import type {
  CapsuleChatThreadSummary,
  AppTab,
  AppView,
  Message,
  OpenedBroadcastItem,
  SpaceFeedItem,
  SquareReactionKind,
  UnifiedFavoriteListItem,
  User as AppUser,
} from "./types";
import {
  canShowMobileBackButton,
  computeIsMobileDetailView,
} from "./shell/navigation";
import { useModalStack, type ModalType } from "./shell/modalStack";
import { useAppUiStore } from "./appUiStore";
import { useChatReadCursors } from "./hooks/useChatReadCursors";
import { useMailboxReadState } from "./hooks/useMailboxReadState";
import {
  computeThreadUnread,
  gatherCapsulePrivateGuestThreadMessagesClient,
  isChatMessageFromSelfByAccount,
  matchesCapsulePrivateGuestThreadStrict,
  maxMessageMicros,
} from "./chatReadCursors";
import { useAccountFlowHandlers } from "./hooks/useAccountFlowHandlers";
import { useMailboxInteractionHandlers } from "./hooks/useMailboxInteractionHandlers";
import { useFavoriteHandlers } from "./hooks/useFavoriteHandlers";
import { useMessagingActions } from "./hooks/useMessagingActions";
import { useNavigationActions } from "./hooks/useNavigationActions";
import { useAsideActions } from "./hooks/useAsideActions";
import {
  clearLocalSessionState,
  forceReauthRedirect,
  isSessionInvalidErrorMessage,
} from "./sessionGuard";
import {
  readMailboxNavSnapshot,
  writeMailboxNavSnapshot,
} from "./navSessionStorage";
import {
  AdminWorkbench,
  createAdminViewProps,
} from "../admin/AdminWorkbench";
import {
  useAdminWorkbenchRuntime,
  useAdminWorkbenchState,
} from "../admin/useAdminWorkbench";

const TITLE_TIERS = [
  { need: 1_000_000, lv: 100, label: "造物主", en: "CREATOR", tone: "creator" },
  { need: 200_000, lv: 80, label: "宇宙", en: "UNIVERSE", tone: "universe" },
  { need: 50_000, lv: 50, label: "星系", en: "GALAXY", tone: "galaxy" },
  { need: 10_000, lv: 35, label: "恆星", en: "STAR", tone: "star" },
  { need: 2_000, lv: 20, label: "行星", en: "PLANET", tone: "planet" },
  { need: 500, lv: 10, label: "衛星", en: "SATELLITE", tone: "satellite" },
  { need: 100, lv: 5, label: "流星", en: "METEOR", tone: "meteor" },
  { need: 10, lv: 1, label: "微光", en: "GLIMMER", tone: "glimmer" },
  { need: 0, lv: 0, label: "星塵", en: "STARDUST", tone: "stardust" },
] as const;

function resolveTitleMeta(points: number) {
  return TITLE_TIERS.find((t) => points >= t.need) ?? TITLE_TIERS[TITLE_TIERS.length - 1];
}

function formatTitleWithLevel(meta: ReturnType<typeof resolveTitleMeta>): string {
  return `Lv.${meta.lv} ${meta.label}`;
}

function calculateAgeFromDate(birthDate: Date | null): number {
  if (!birthDate) return 0;
  const today = new Date();
  // 使用 UTC 避免时区差
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const m = today.getUTCMonth() - birthDate.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }
  return age;
}

/** 與後端 resolve 訪客線一致：有帳號時以 profile 上現用 identity hex 對齊。 */
function resolvedEffectiveGuestHex(
  canonicalThreadGuestHex: string,
  threadGuestAccountId: string | undefined,
  profileByAccountId: ReadonlyMap<string, AccountProfile>,
): string {
  const aid = `${threadGuestAccountId ?? ""}`.trim();
  if (!aid) return canonicalThreadGuestHex;
  return (
    profileByAccountId.get(aid)?.ownerIdentity?.toHexString() ??
    canonicalThreadGuestHex
  );
}

/** 將 session／跳轉寫入的 `sourceId::guestHex` 對齊到目前側欄合成的規範 key，避免換裝或 profile 回填後發送時顯示「聊天線失效」。 */
function resolveCanonicalChatThreadSelectionKey(
  prev: string,
  capsuleChatThreads: CapsuleChatThreadSummary[],
  capsulePrivateRows: readonly CapsulePrivateMessage[],
  identityHex: string,
  myAccountId: string | undefined,
  profileByAccountId: ReadonlyMap<string, AccountProfile>,
): string | null {
  if (capsuleChatThreads.some((t) => t.key === prev)) return prev;
  const parts = prev.split("::");
  if (parts.length !== 2) return null;
  const sourceId = parts[0]!;
  const staleSuffix = parts[1]!;
  const cand = capsuleChatThreads.filter((t) => t.sourceMessageId === sourceId);
  if (cand.length === 0) return null;

  const byThreadHex = cand.find((t) => t.threadGuestHex === staleSuffix);
  if (byThreadHex) return byThreadHex.key;

  const myAid = `${myAccountId ?? ""}`.trim();
  const mineCandidates = cand.filter(
    (t) =>
      t.threadGuestHex === identityHex ||
      (!!myAid && `${t.threadGuestAccountId ?? ""}`.trim() === myAid),
  );
  if (staleSuffix === identityHex && mineCandidates.length === 1) {
    return mineCandidates[0]!.key;
  }

  const legacyRow = capsulePrivateRows.find(
    (m) =>
      m.sourceMessageId === sourceId &&
      m.threadGuestIdentity.toHexString() === staleSuffix,
  );
  if (legacyRow) {
    const legacyAid =
      `${(legacyRow as { threadGuestAccountId?: string }).threadGuestAccountId ?? ""}`.trim();
    const byAid = legacyAid
      ? cand.find((t) => `${t.threadGuestAccountId ?? ""}`.trim() === legacyAid)
      : undefined;
    if (byAid) return byAid.key;

    const byThreadMembership = cand.find((t) =>
      matchesCapsulePrivateGuestThreadStrict(
        legacyRow,
        capsulePrivateRows,
        sourceId,
        t.threadGuestHex,
        resolvedEffectiveGuestHex(
          t.threadGuestHex,
          t.threadGuestAccountId,
          profileByAccountId,
        ),
        t.threadGuestAccountId,
      ),
    );
    if (byThreadMembership) return byThreadMembership.key;
  }

  if (mineCandidates.length === 1) return mineCandidates[0]!.key;

  return null;
}

/** 給舉報人看的結果通知（存入 resolutionNote） */
const PRESET_REPORTER: Record<string, string> = {
  dismiss: "感謝您的監督，此內容未發現明確違規，我們會持續關注！^v^",
  warn: "感謝您的舉報！我們已對該帳號發出警告，請放心我們會繼續追蹤。",
  mute7: "感謝您的舉報！我們已對違規帳號採取禁言 7 天的處置。",
  mute30: "感謝您的舉報！我們已對屢次違規帳號採取禁言 30 天的處置。",
  ban7: "感謝您的舉報！我們已對嚴重違規帳號採取封禁 7 天的處置。",
  ban30: "感謝您的舉報！我們已對嚴重違規帳號採取封禁 30 天的處置。",
  banPermanent: "感謝您的舉報！我們已對屢次嚴重違規帳號採取永久封禁處置。",
};
/** 給被處分帳號看的說明（存入 sanction.detailText） */
const PRESET_SANCTION: Record<string, string> = {
  dismiss: "",
  warn: "您的帳號因言論不當已收到警告，請遵守社群守則，謝謝合作！",
  mute7: "因違反社群規範，您的帳號已被禁言 7 天，禁言期間無法發送聊聊訊息。",
  mute30: "因屢次違反社群規範，您的帳號已被禁言 30 天，請反思並遵守守則。",
  ban7: "因嚴重違規，您的帳號已被封禁 7 天，如有異議可申訴。",
  ban30: "因嚴重違規，您的帳號已被封禁 30 天，如有異議可申訴。",
  banPermanent: "因屢次嚴重違規，您的帳號已被永久封禁。",
};

export default function SpacetimeMailboxApp({
  identity,
}: {
  identity: Identity;
}) {
  /** 上次分頁還原已跑完前，禁止寫 sessionStorage，避免預設 tab 覆蓋 admin。 */
  const lastActiveTabRestoreCompletedRef = useRef(false);
  /** 還原內呼叫 setActiveTab 後，略過下一次持久化（同 tick 仍見舊 activeTab）。 */
  const skipNextPersistAfterRestoreRef = useRef(false);
  /** 管理頁還原：訂閱剛套用時列可能尚空，短重試避免誤判無權限。 */
  const [adminNavRestoreTick, setAdminNavRestoreTick] = useState(0);
  const adminNavRestoreAttemptsRef = useRef(0);

  useEffect(() => {
    // 改為每 10 秒更新一次，足以應付倒數計時顯示
    const id = window.setInterval(() => setNowTick(Date.now()), 10000);
    return () => window.clearInterval(id);
  }, []);

  const registerAccount = useReducer(reducers.registerAccount);
  const registerAccountWithEmailOtp = useReducer(
    reducers.registerAccountWithEmailOtp,
  );
  const requestEmailOtp = useReducer(reducers.requestEmailOtp);
  const verifyEmailOtp = useReducer(reducers.verifyEmailOtp);
  const resetPasswordWithEmailOtp = useReducer(
    (reducers as any).resetPasswordWithEmailOtp,
  );
  const updateAccountProfile = useReducer(reducers.updateAccountProfile);
  const setAgeYears = useReducer(reducers.setAgeYears);
  const loginAccount = useReducer(reducers.loginAccount);
  const createReportTicket = useReducer(reducers.createReportTicket);
  const setAdminRole = useReducer(reducers.setAdminRole);
  const adminPurgeAllRoles = useReducer(reducers.adminPurgeAllRoles);
  const adminUpdateReportTicket = useReducer(reducers.adminUpdateReportTicket);
  const adminApplyUserSanction = useReducer(reducers.adminApplyUserSanction);
  const adminUpdateAppealTicket = useReducer(reducers.adminUpdateAppealTicket);
  const adminSetUserSanctionStatus = useReducer(
    reducers.adminSetUserSanctionStatus,
  );
  const claimOrphanSuperAdmin = useReducer(reducers.claimOrphanSuperAdmin);
  const changePassword = useReducer(reducers.changePassword);
  const deleteCapsuleMessage = useReducer(reducers.deleteCapsuleMessage);
  const sendDirectMessage = useReducer(reducers.sendDirectMessage);
  const sendCapsuleMessage = useReducer(reducers.sendCapsuleMessage);
  const updateScheduledMessage = useReducer(reducers.updateScheduledMessage);
  const deleteScheduledMessage = useReducer(reducers.deleteScheduledMessage);
  const publishToSquare = useReducer(reducers.publishToSquare);
  const unpublishFromSquare = useReducer(reducers.unpublishFromSquare);
  const setSquareReaction = useReducer(reducers.setSquareReaction);
  const appendLetterExchange = useReducer(reducers.appendLetterExchange);
  const addSquareComment = useReducer(reducers.addSquareComment);
  const drawCapsuleOnce = useReducer((reducers as any).drawCapsuleOnce);
  const setCapsuleProfileVisibility = useReducer(
    (reducers as any).setCapsuleProfileVisibility,
  );
  const addCapsulePrivateMessage = useReducer(
    reducers.addCapsulePrivateMessage,
  );
  const favoriteSquarePost = useReducer(reducers.favoriteSquarePost);
  const unfavoriteSquarePost = useReducer(reducers.unfavoriteSquarePost);
  const favoriteCapsule = useReducer(reducers.favoriteCapsule);
  const unfavoriteCapsule = useReducer(reducers.unfavoriteCapsule);
  const adminDeleteCapsule = useReducer(reducers.adminDeleteCapsule);
  const adminDeleteSquarePost = useReducer(reducers.adminDeleteSquarePost);
  const adminDeleteRoleRecord = useReducer(reducers.adminDeleteRoleRecord);
  const adminUpdateAccountProfileAndPoints = useReducer(
    (reducers as any).adminUpdateAccountProfileAndPoints,
  );
  const adminSetTemporaryPasswordByEmail = useReducer(
    (reducers as any).adminSetTemporaryPasswordByEmail,
  );
  const adminResetPasswordByEmail = useReducer(
    (reducers as any).adminResetPasswordByEmail,
  );
  const adminCreateAvatarSeriesBatch = useReducer(
    (reducers as any).adminCreateAvatarSeriesBatch,
  );
  const adminUpdateAvatarCatalogItem = useReducer(
    (reducers as any).adminUpdateAvatarCatalogItem,
  );
  const adminDeleteAvatarCatalogItem = useReducer(
    (reducers as any).adminDeleteAvatarCatalogItem,
  );
  const adminUpdateAvatarSeriesOrder = useReducer(
    (reducers as any).adminUpdateAvatarSeriesOrder,
  );
  const unlockAvatarItem = useReducer((reducers as any).unlockAvatarItem);
  const setAvatarKey = useReducer((reducers as any).setAvatarKey);
  const claimNewcomerDailyPoints = useReducer(
    (reducers as any).claimNewcomerDailyPoints,
  );

  const {
    view,
    setView,
    isBooting,
    setIsBooting,
    activeTab,
    setActiveTab,
    spaceOwnerHex,
    setSpaceOwnerHex,
    spaceTargetInfo,
    setSpaceTargetInfo,
    selectedMessageId,
    setSelectedMessageId,
    squareSelectedPostId,
    setSquareSelectedPostId,
    favoriteSelectedId,
    setFavoriteSelectedId,
    selectedChatThreadKey,
    setSelectedChatThreadKey,
    chatBackTab,
    setChatBackTab,
    spaceBackTab,
    setSpaceBackTab,
    profileModalOpen,
    setProfileModalOpen,
    profileActionMenuOpen,
    setProfileActionMenuOpen,
    passwordModalOpen,
    setPasswordModalOpen,
    reportModalOpen,
    setReportModalOpen,
    publishModalOpen,
    setPublishModalOpen,
    banNoticeOpen,
    setBanNoticeOpen,
    outboxDeleteConfirmOpen,
    setOutboxDeleteConfirmOpen,
    nowTick,
    setNowTick,
    capsuleOpen,
    setCapsuleOpen,
    capsulePostId,
    setCapsulePostId,
    publishIncludeThread,
    setPublishIncludeThread,
    publishIncludeCapsulePrivate,
    setPublishIncludeCapsulePrivate,
    publishRepliesPublic,
    setPublishRepliesPublic,
    squareCommentDraft,
    setSquareCommentDraft,
    capsulePrivateDraft,
    setCapsulePrivateDraft,
    capsuleThreadGuestHex,
    setCapsuleThreadGuestHex,
    capsuleSwitching,
    setCapsuleSwitching,
    chatDraft,
    setChatDraft,
    chatPeerProfileOpen,
    setChatPeerProfileOpen,
    squareActionError,
    setSquareActionError,
    composeSyncSquare,
    setComposeSyncSquare,
    composeMainOnly,
    setComposeMainOnly,
    composeIncludeCapsulePrivate,
    setComposeIncludeCapsulePrivate,
    composeCommentsEnabled,
    setComposeCommentsEnabled,
    composeShowSquareSender,
    setComposeShowSquareSender,
    composeShowSquareRecipient,
    setComposeShowSquareRecipient,
    exchangeAppendDraft,
    setExchangeAppendDraft,
    exchangeAppendBusy,
    setExchangeAppendBusy,
    publishShowSender,
    setPublishShowSender,
    publishShowRecipient,
    setPublishShowRecipient,
    introEditOpen,
    setIntroEditOpen,
    introEditDraft,
    setIntroEditDraft,
    introEditSaving,
    setIntroEditSaving,
    introEditError,
    setIntroEditError,
    passwordOld,
    setPasswordOld,
    passwordNew,
    setPasswordNew,
    passwordConfirm,
    setPasswordConfirm,
    passwordSaving,
    setPasswordSaving,
    passwordError,
    setPasswordError,
    profileSaving,
    setProfileSaving,
    profileForm,
    setProfileForm,
    profileError,
    setProfileError,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    registerDisplayName,
    setRegisterDisplayName,
    registerGender,
    setRegisterGender,
    registerProfileNote,
    setRegisterProfileNote,
    loading,
    setLoading,
    error,
    setError,
    composeError,
    setComposeError,
    composeSuccess,
    setComposeSuccess,
    composeMode,
    setComposeMode,
    composeCapsuleType,
    setComposeCapsuleType,
    ageGateYears,
    setAgeGateYears,
    ageGateGender,
    setAgeGateGender,
    ageGateSaving,
    setAgeGateSaving,
    ageGateError,
    setAgeGateError,
    reportTargetType,
    setReportTargetType,
    reportTargetId,
    setReportTargetId,
    reportReasonCode,
    setReportReasonCode,
    banNoticeInfo,
    setBanNoticeInfo,
    reportDetail,
    setReportDetail,
    reportSaving,
    setReportSaving,
    reportError,
    setReportError,
    openedBroadcastItems,
    setOpenedBroadcastItems,
    outboxEditOpen,
    setOutboxEditOpen,
    outboxEditLoading,
    setOutboxEditLoading,
    outboxEditSaving,
    setOutboxEditSaving,
    outboxEditError,
    setOutboxEditError,
    outboxEditForm,
    setOutboxEditForm,
    mailboxSectionsOpen,
    setMailboxSectionsOpen,
    birthMonth,
    setBirthMonth,
    birthDay,
    setBirthDay,
    birthYear,
    setBirthYear,
  } = useAppUiStore();
  /** 秘密膠囊：點開後一次一則，可換一則（排除自己、已收藏、與當前則） */
  /** 目前回覆的訪客線（Identity hex）；訪客為自己，寄件／收件選一條訪客線 */
  /** 我的 > 聊聊記錄：目前選中的聊天線 key（sourceMessageId::guestHex） */
  /** 由膠囊彈窗跳轉到聊聊時，記錄來源分頁供返回 */
  /** 進入個人空間前記錄來源分頁 */

  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const prevChatThreadKeyRef = useRef<string | null>(null);
  const prevActiveTabRef = useRef(activeTab);
  const adminWorkbenchState = useAdminWorkbenchState();
  const {
    sanctionBanDays,
    setSanctionBanDays,
    selectedAdminReportId,
    setSelectedAdminReportId,
    adminActionLoading,
    setAdminActionLoading,
    adminActionError,
    setAdminActionError,
    adminReportStatus,
    setAdminReportStatus,
    adminReportPriority,
    setAdminReportPriority,
    adminResolutionNote,
    setAdminResolutionNote,
    sanctionTypeDraft,
    setSanctionTypeDraft,
    sanctionReasonDraft,
    setSanctionReasonDraft,
    sanctionDetailDraft,
    setSanctionDetailDraft,
    adminGrantEmail,
    setAdminGrantEmail,
    adminGrantRole,
    setAdminGrantRole,
    adminGrantActive,
    setAdminGrantActive,
    adminEditOpen,
    setAdminEditOpen,
    adminEditIdentityHex,
    setAdminEditIdentityHex,
    adminEditAccountId,
    setAdminEditAccountId,
    adminEditEmail,
    setAdminEditEmail,
    adminEditRole,
    setAdminEditRole,
    adminEditActive,
    setAdminEditActive,
    adminAddOpen,
    setAdminAddOpen,
    adminReportModalOpen,
    setAdminReportModalOpen,
    adminReportFilter,
    setAdminReportFilter,
    adminSection,
    setAdminSection,
    adminAccountSearch,
    setAdminAccountSearch,
    adminTargetIdentityHex,
    setAdminTargetIdentityHex,
    adminMobileShowContent,
    setAdminMobileShowContent,
  } = adminWorkbenchState;
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarActionLoading, setAvatarActionLoading] = useState(false);
  const [avatarActionError, setAvatarActionError] = useState("");
  const [dailyRewardLoading, setDailyRewardLoading] = useState(false);
  const [dailyRewardToast, setDailyRewardToast] = useState("");
  const [forcePwdOld, setForcePwdOld] = useState("");
  const [forcePwdNew, setForcePwdNew] = useState("");
  const [forcePwdConfirm, setForcePwdConfirm] = useState("");
  const [forcePwdSaving, setForcePwdSaving] = useState(false);
  const [forcePwdError, setForcePwdError] = useState("");
  const emitPointsToast = useCallback(
    (delta: number, action: string, settled = false) => {
      const amount = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "±0";
      const status = settled
        ? "每日結算"
        : delta < 0
          ? "已扣除"
          : "已入帳";
      setDailyRewardToast(
        `【積分】${amount}｜${action}｜${status}`,
      );
    },
    [],
  );

  /** 非積分之簡短提示（與積分提示共用底部漂浮條、約 2.2s） */
  const emitNoticeToast = useCallback((message: string) => {
    setDailyRewardToast(message);
  }, []);


  /** 剛解封播報（側欄卡片）；輪詢無新開啟時清空，或點選／收起單則 */
  /** 已寄出：未到開啟時間之訊息編輯 */
  /** 已寄出刪除：自訂二次確認對話框 */

  /** 左欄「封存中／已開啟」區塊是否展開（收件／寄件各自記憶） */

  const toggleMailboxSection = (
    tab: "inbox" | "outbox",
    key: "sealed" | "opened",
  ) => {
    setMailboxSectionsOpen((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [key]: !prev[tab][key] },
    }));
  };

  const modalStack = useModalStack();
  const isProfileModalVisible = profileModalOpen || modalStack.isOpen("profile");
  const isPasswordModalVisible =
    passwordModalOpen || modalStack.isOpen("password");
  const isReportModalVisible = reportModalOpen || modalStack.isOpen("report");
  const isOutboxDeleteConfirmVisible =
    outboxDeleteConfirmOpen || modalStack.isOpen("outboxDeleteConfirm");
  const isChatPeerProfileVisible =
    chatPeerProfileOpen || modalStack.isOpen("chatPeerProfile");
  const isPublishModalVisible =
    publishModalOpen || modalStack.isOpen("publish");
  const isIntroEditModalVisible =
    introEditOpen || modalStack.isOpen("introEdit");
  const isBanNoticeModalVisible =
    banNoticeOpen || modalStack.isOpen("banNotice");
  const isAdminAddModalVisible = adminAddOpen || modalStack.isOpen("adminAdd");
  const isAdminEditModalVisible =
    adminEditOpen || modalStack.isOpen("adminEdit");
  const isAdminReportModalVisible =
    adminReportModalOpen || modalStack.isOpen("adminReport");

  const openModalInStack = (type: ModalType) => {
    modalStack.push({
      type,
      closeOnBackdrop: true,
      closeOnEsc: true,
    });
  };

  const closeModalInStack = (type: ModalType) => {
    modalStack.dismissLastByType(type);
  };

  const syncModalOpen = (
    setOpen: React.Dispatch<React.SetStateAction<boolean>>,
    type: ModalType,
    open: boolean,
  ) => {
    setOpen(open);
    if (open) {
      openModalInStack(type);
      return;
    }
    closeModalInStack(type);
  };

  const setAdminAddOpenWithStack = (open: boolean) => {
    syncModalOpen(setAdminAddOpen, "adminAdd", open);
  };

  const setAdminEditOpenWithStack = (open: boolean) => {
    syncModalOpen(setAdminEditOpen, "adminEdit", open);
  };

  const setAdminReportModalOpenWithStack = (open: boolean) => {
    syncModalOpen(setAdminReportModalOpen, "adminReport", open);
  };

  const setProfileModalOpenWithStack = (open: boolean) => {
    syncModalOpen(setProfileModalOpen, "profile", open);
  };

  const setPasswordModalOpenWithStack = (open: boolean) => {
    syncModalOpen(setPasswordModalOpen, "password", open);
  };

  const setReportModalOpenWithStack = (open: boolean) => {
    syncModalOpen(setReportModalOpen, "report", open);
  };

  const setOutboxDeleteConfirmOpenWithStack = (open: boolean) => {
    syncModalOpen(setOutboxDeleteConfirmOpen, "outboxDeleteConfirm", open);
  };

  const setChatPeerProfileOpenWithStack = (open: boolean) => {
    syncModalOpen(setChatPeerProfileOpen, "chatPeerProfile", open);
  };

  const setPublishModalOpenWithStack = (open: boolean) => {
    syncModalOpen(setPublishModalOpen, "publish", open);
  };

  const setIntroEditOpenWithStack = (open: boolean) => {
    syncModalOpen(setIntroEditOpen, "introEdit", open);
  };

  const setBanNoticeOpenWithStack = (open: boolean) => {
    syncModalOpen(setBanNoticeOpen, "banNotice", open);
  };

  // ==========================================
  // 1. 資料訂閱區塊 (精確過濾與懶加載)
  // ==========================================

  // --- A. 基礎資料 (始終加載) ---
  const [profiles] = useTable(
    tables.accountProfile.where((r) => r.ownerIdentity.eq(identity)),
  );
  const myProfile = profiles[0];
  const myEmail = myProfile?.email;
  const myAccountId = myProfile?.accountId;

  /** 公開表 account_profile 全量：用於訪客暱稱等（僅訂閱自己時 profile 查不到線上對方） */
  const [allAccountProfileRows] = useTable(tables.accountProfile);
  const publicProfileByIdentityHex = useMemo(() => {
    const m = new Map<string, AccountProfile>();
    for (const p of allAccountProfileRows) {
      m.set(p.ownerIdentity.toHexString(), p);
    }
    return m;
  }, [allAccountProfileRows]);
  const profileByAccountId = useMemo(() => {
    const m = new Map<string, AccountProfile>();
    for (const p of allAccountProfileRows) {
      if (!p.accountId) continue;
      m.set(p.accountId, p);
    }
    return m;
  }, [allAccountProfileRows]);

  // 狀態判定

  const isFavoriteTab = activeTab === "favorites";
  const isMyReportTab = activeTab === "my_reports";
  // 2. 修改處理跳轉的 useEffect
  useEffect(() => {
    const hasToken = !!localStorage.getItem(SPACETIME_TOKEN_KEY);
    const justLoggedOut = sessionStorage.getItem("SKIP_BOOT_WAIT") === "true";

    // 情況 A：如果有資料，直接進
    if (myProfile) {
      setView("dashboard");
      setIsBooting(false);
      sessionStorage.removeItem("SKIP_BOOT_WAIT"); // 進去後清除標記
      return;
    }

    // 情況 B：如果「剛剛登出」或「根本沒 Token」，不用等，直接顯示登入
    if (justLoggedOut || !hasToken) {
      setView("login");
      setIsBooting(false);
      sessionStorage.removeItem("SKIP_BOOT_WAIT");
      return;
    }

    // 情況 C：有 Token 但沒資料（可能是刷新/前景切換後重同步），先給足夠時間等待。
    // 頁面非可見狀態時不做逾時判定，避免切窗造成誤登出。
    if (document.visibilityState !== "visible") return;
    const timeout = setTimeout(() => {
      if (!myProfile) {
        setView("login");
        setIsBooting(false);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [myProfile]);

  // --- B. 郵件與膠囊 (功能核心) ---
  const [inboxRows] = useTable(
    identity
      ? tables.scheduledMessage.where((r) =>
          r.recipientEmail.eq(myEmail ?? "__none__"),
        )
      : tables.scheduledMessage.where((r) => r.id.eq("__stop__")),
  );

  const [outboxRows] = useTable(
    identity && myEmail
      ? tables.scheduledMessage.where((r) => r.senderEmail.eq(myEmail))
      : tables.scheduledMessage.where((r) => r.id.eq("__stop__")),
  );

  const [squarePostRows] = useTable(tables.recent_square_posts); // 視圖：最近 100 則
  const [capsuleMessageRows] = useTable(tables.capsuleMessage);
  const [capsuleMessageSpaceStateRows] = useTable(
    tables.capsuleMessageSpaceState,
  );

  // --- C. 互動與私訊 (視圖過濾) ---
  const [squareReactionRows] = useTable(tables.squareReaction);
  const [squareCommentRows] = useTable(tables.squareComment);
  const [capsulePrivateRows] = useTable(tables.capsule_private_for_me); // 視圖自動過濾
  const [pointsWalletRows] = useTable(
    myAccountId
      ? (tables as any).accountPointsWallet.where((r: any) => r.accountId.eq(myAccountId))
      : (tables as any).accountPointsWallet.where((r: any) => r.accountId.eq("__stop__")),
  );
  const [avatarCatalogRowsAll] = useTable((tables as any).avatarCatalogItem);
  const [avatarUnlockRows] = useTable(
    myAccountId
      ? (tables as any).accountAvatarUnlock.where((r: any) => r.accountId.eq(myAccountId))
      : (tables as any).accountAvatarUnlock.where((r: any) => r.accountId.eq("__stop__")),
  );
  const [dailyRewardClaimRows] = useTable(
    myAccountId
      ? (tables as any).accountDailyRewardClaim.where((r: any) => r.accountId.eq(myAccountId))
      : (tables as any).accountDailyRewardClaim.where((r: any) => r.accountId.eq("__stop__")),
  );
  const [passwordResetRequiredRows] = useTable(
    myAccountId
      ? (tables as any).accountPasswordResetRequired.where((r: any) => r.accountId.eq(myAccountId))
      : (tables as any).accountPasswordResetRequired.where((r: any) => r.accountId.eq("__stop__")),
  );
  const [adminPointsWalletRows] = useTable(
    activeTab === "admin" || activeTab === "admin_ops"
      ? (tables as any).accountPointsWallet
      : (tables as any).accountPointsWallet.where((r: any) => r.accountId.eq("__stop__")),
  );
  const [spaceOwnerPointsRows] = useTable(
    activeTab === "space" && spaceTargetInfo?.accountId
      ? (tables as any).accountPointsWallet.where((r: any) =>
          r.accountId.eq(String(spaceTargetInfo.accountId)),
        )
      : (tables as any).accountPointsWallet.where((r: any) => r.accountId.eq("__stop__")),
  );
  const [myCreatedAtRows] = useTable(
    myEmail
      ? (tables as any).accountProfileCreatedAt.where((r: any) => r.email.eq(myEmail))
      : (tables as any).accountProfileCreatedAt.where((r: any) => r.email.eq("__stop__")),
  );

  const {
    adminRoleRows,
    adminRoleRowsLoading,
    reportTicketRows,
    reportSnapshotRows,
    moderationQueueRows,
    appealTicketRows,
    userSanctionRows,
    accountProfileCreatedAtRows,
    avatarCatalogRows: adminAvatarCatalogRows,
    allProfiles,
    displayNameByEmail,
    profileByIdentityHex,
    adminEmailByHex,
    adminReportsSorted,
    activeAdminRows,
    inactiveAdminRows,
    hasAnyAdmin,
    superOpsStats,
    superAdminTrends,
    selectedAdminReport,
    selectedAdminSnapshot,
    canClaimOrphanSuperAdmin,
    adminSearchRows,
    activeSanctionsForTarget,
    profileByEmail,
    adminGrantEmailCandidates,
    selectedAdminTargetProfile,
    adminRoleLabel,
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
    updateAvatarSeriesOrder,
    avatarSeriesOrderRows,
  } = useAdminWorkbenchRuntime({
    activeTab,
    identity,
    myAccountId,
    myProfile,
    isMyReportTab,
    selectedAdminReportId,
    adminAccountSearch,
    adminTargetIdentityHex,
    capsuleMessageSpaceStateRows,
    capsuleMessageRows,
    squarePostRows,
    squareCommentRows,
    sanctionTypeDraft,
    sanctionReasonDraft,
    sanctionDetailDraft,
    sanctionBanDays,
    adminReportStatus,
    adminReportPriority,
    adminResolutionNote,
    adminGrantEmail,
    adminGrantRole,
    adminGrantActive,
    adminEditIdentityHex,
    adminEditAccountId,
    adminEditRole,
    adminEditActive,
    setAdminActionLoading,
    setAdminActionError,
    setAdminGrantEmail,
    setAdminEditIdentityHex,
    setAdminEditAccountId,
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
    adminCreateAvatarSeriesBatch,
    adminUpdateAvatarCatalogItem,
    adminDeleteAvatarCatalogItem,
    adminUpdateAvatarSeriesOrder,
    presetReporterDismiss: PRESET_REPORTER.dismiss,
  });

  // --- E. 收藏夾懶加載 ---
  const [squareFavoriteRows] = useTable(
    identity
      ? tables.squareFavorite.where((r) => r.collectorIdentity.eq(identity))
      : tables.squareFavorite.where((r) => r.id.eq("__stop__")),
  );

  const [capsuleFavoriteRows] = useTable(
    identity
      ? tables.capsuleFavorite.where((r) => r.collectorIdentity.eq(identity))
      : tables.capsuleFavorite.where((r) => r.id.eq("__stop__")),
  );

  const avatarSeriesOrderKeys = useMemo(() => {
    return [...avatarSeriesOrderRows].sort((a, b) => a.sortOrder - b.sortOrder).map(r => r.seriesKey);
  }, [avatarSeriesOrderRows]);

  // 初始狀態也要跟著改：如果目前沒有生日，預設停在「剛好 16 歲」的那一年
  // 自動計算年齡 (保持不變)
  const calculatedAge = useMemo(() => {
    const today = new Date();
    let age = today.getFullYear() - birthYear;
    const m = today.getMonth() + 1 - birthMonth;
    if (m < 0 || (m === 0 && today.getDate() < birthDay)) age--;
    return age;
  }, [birthYear, birthMonth, birthDay]);

  // 獲取當前選中月份的天數 (處理 28/30/31 天)
  const daysInMonth = useMemo(() => {
    return new Date(birthYear, birthMonth, 0).getDate();
  }, [birthYear, birthMonth]);

  // 確保日期不越界 (例如從 1/31 切換到 2月時，自動跳回 28或29號)
  // 確保日期不越界 (當月份天數變動時，只在必要時調整)
  useEffect(() => {
    if (birthDay > daysInMonth) {
      setBirthDay(daysInMonth);
    }
  }, [daysInMonth]); // 移除 [birthDay] 的依賴，避免無窮迴圈或過度渲染

  // 年份範圍：1900 → 今年（遞增）。WheelPicker 底端「+」為 index+1，須對應「西元年 +1」，不可新→舊否則 + 會變更年輕。
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const earliestBirthYear = 1900;
    const totalYears = currentYear - earliestBirthYear + 1;
    return Array.from({ length: totalYears }, (_, i) => earliestBirthYear + i);
  }, []);

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i + 1),
    [],
  );

  const dayOptions = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth],
  ); // 只有天數變動時才更新

  // ==========================================
  // 2. 數據處理與對照 (Memo 化)
  // ==========================================
  // --- Types ---
  interface AppUser {
    // 將 User 改名為 AppUser 避免與圖標衝突
    id: string;
    email: string;
    displayName: string;
    gender: string;
    ageYears: number;
    profileNote: string;
    avatarKey?: string;
  }
  // 基礎用戶物件 (供 UI 使用)
  const user: AppUser | null = useMemo(
    () =>
      myProfile
        ? {
            id: myProfile.email,
            email: myProfile.email,
            displayName: myProfile.displayName,
            gender: myProfile.gender,
            ageYears: calculateAgeFromDate(
              myProfile.birthDate?.toDate() || null,
            ),
            profileNote: myProfile.profileNote,
            avatarKey: (myProfile as any).avatarKey
              ? String((myProfile as any).avatarKey)
              : "",
          }
        : null,
    [myProfile],
  );

  const availablePoints = useMemo(() => {
    const row = pointsWalletRows[0] as any;
    return row?.balance != null ? Number(row.balance) : 0;
  }, [pointsWalletRows]);
  const mustForcePasswordReset = useMemo(() => {
    const row = (passwordResetRequiredRows as any[])[0];
    return !!(row && row.required);
  }, [passwordResetRequiredRows]);
  const pointsBalanceByAccountId = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of adminPointsWalletRows as any[]) {
      const aid = String(row.accountId ?? "").trim();
      if (!aid) continue;
      m.set(aid, Number(row.balance ?? 0));
    }
    return m;
  }, [adminPointsWalletRows]);
  const spaceOwnerAvailablePoints = useMemo(() => {
    const row = (spaceOwnerPointsRows as any[])[0];
    return row?.balance != null ? Number(row.balance) : 0;
  }, [spaceOwnerPointsRows]);
  const consumedPoints = useMemo(() => {
    return Math.max(0, availablePoints);
  }, [availablePoints]);
  const titleMeta = useMemo(() => {
    return resolveTitleMeta(consumedPoints);
  }, [consumedPoints]);

  const avatarCatalogRows = useMemo(
    () =>
      [...(avatarCatalogRowsAll as any[])].sort(
        (a, b) => Number(a.sortOrder) - Number(b.sortOrder),
      ),
    [avatarCatalogRowsAll],
  );

  const unlockedAvatarKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const row of avatarUnlockRows as any[]) {
      set.add(String(row.avatarKey));
    }
    return set;
  }, [avatarUnlockRows]);

  const currentAvatarKey = (myProfile as any)?.avatarKey
    ? String((myProfile as any).avatarKey)
    : "";
  const currentAvatarRow = avatarCatalogRows.find((row) => row.avatarKey === currentAvatarKey);
  const currentAvatarUrl = currentAvatarRow
    ? `${String(currentAvatarRow.basePath).replace(/\/?$/, "/")}${currentAvatarRow.fileName}`
    : "";
  const avatarUrlByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of avatarCatalogRows as any[]) {
      const key = String(row.avatarKey ?? "").trim();
      if (!key) continue;
      const url = `${String(row.basePath).replace(/\/?$/, "/")}${row.fileName}`;
      m.set(key, url);
    }
    return m;
  }, [avatarCatalogRows]);

  const dailyRewardStatus = useMemo<
    "claimable" | "claimed" | "expired" | "hidden"
  >(() => {
    if (!myProfile || !myAccountId) return "hidden";
    const createdRowsSource =
      (myCreatedAtRows as any[]).length > 0
        ? (myCreatedAtRows as any[])
        : (accountProfileCreatedAtRows as any[]);
    const created =
      createdRowsSource.find((r: any) => r.accountId === myAccountId) ??
      createdRowsSource.find(
        (r) =>
          String(r.email || "")
            .trim()
            .toLowerCase() ===
          String(myEmail || "")
            .trim()
            .toLowerCase(),
      );
    if (!created) return "hidden";
    const nowLocal = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const createdLocal = new Date(
      Number(created.createdAt.microsSinceUnixEpoch / 1000n) + 8 * 60 * 60 * 1000,
    );
    const today = new Date(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate(),
    );
    const start = new Date(
      createdLocal.getUTCFullYear(),
      createdLocal.getUTCMonth(),
      createdLocal.getUTCDate(),
    );
    const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
    if (diff < 1 || diff > 3) return "expired";
    const claimed = (dailyRewardClaimRows as any[]).some(
      (r) => Number(r.dayIndex) === diff,
    );
    return claimed ? "claimed" : "claimable";
  }, [myProfile, myAccountId, myEmail, myCreatedAtRows, accountProfileCreatedAtRows, dailyRewardClaimRows]);

  // ==========================================
  // 3. 業務邏輯清單 (Inbox, Outbox, Square)
  // ==========================================

  const now = new Date(nowTick);

  // 收件匣處理
  const inbox = useMemo(() => {
    const viewer = myEmail ?? "";
    return [...inboxRows]
      .filter(
        (row) =>
          emailsEqual(row.recipientEmail, viewer) || row.isWaitListVisible,
      )
      .map((row) =>
        scheduledRowToMessage(row, {
          now,
          viewerEmail: viewer,
          isSender: false,
        }),
      )
      .sort(compareMessagesRecentFirst);
  }, [inboxRows, now, myEmail]);

  // 寄件匣處理
  const outbox = useMemo(() => {
    return [...outboxRows]
      .map((row) =>
        scheduledRowToMessage(row, {
          now,
          viewerEmail: myEmail ?? "",
          isSender: true,
        }),
      )
      .sort(compareMessagesRecentFirst);
  }, [outboxRows, now, myEmail]);

  const { inboxUnreadCount, outboxUnreadCount } = useMailboxReadState(
    identity.toHexString(),
    inbox,
    outbox,
    activeTab,
  );

  // 廣場貼文處理
  // 廣場貼文處理
  const squarePostsSorted = useMemo(
    () =>
      [...squarePostRows].sort((a, b) =>
        Number(
          b.createdAt.microsSinceUnixEpoch - a.createdAt.microsSinceUnixEpoch,
        ),
      ),
    [squarePostRows],
  );

  // 廣場牆顯示邏輯
  const squarePostsVisible = useMemo(
    () =>
      squarePostsSorted.filter((p) => p.snapshotScheduledAt.toDate() <= now),
    [squarePostsSorted, now],
  );

  // ==========================================
  // 4. 處分與狀態檢查
  // ==========================================

  const now2 = Date.now();
  const myActiveSanctions = useMemo(() => {
    if (!myProfile) return [];
    return userSanctionRows.filter(
      (s) =>
        s.targetIdentity.isEqual(identity) &&
        s.status === "active" &&
        (!s.endAt || Number(s.endAt.microsSinceUnixEpoch / 1000n) > now2),
    );
  }, [userSanctionRows, identity, myProfile, now2]);

  // 定義 myMuteSanction 與 myWarnSanction 供 UI 顯示細節
  const myMuteSanction = useMemo(
    () => myActiveSanctions.find((s) => s.sanctionType === "mute") ?? null,
    [myActiveSanctions],
  );
  const myWarnSanction = useMemo(
    () => myActiveSanctions.find((s) => s.sanctionType === "warn") ?? null,
    [myActiveSanctions],
  );

  // age gate 提交成功後立即關閉 modal，不等訂閱更新
  const [ageGatePending, setAgeGatePending] = useState(true);

  useEffect(() => {
    if (!myProfile) return;
    console.log("[ageGate] myProfile loaded", {
      hasBirthDate: !!myProfile.birthDate,
      gender: myProfile.gender,
      age: myProfile.birthDate ? calculateAgeFromDate(myProfile.birthDate.toDate()) : null,
    });
    // 資料已完整 → 不需要 age gate
    if (myProfile.birthDate && myProfile.gender && myProfile.gender !== "" && myProfile.gender !== "unspecified") {
      const age = calculateAgeFromDate(myProfile.birthDate.toDate());
      if (age >= 16 && age <= 126) {
        setAgeGatePending(false);
        return;
      }
    }
    setAgeGatePending(true);
  }, [myProfile?.birthDate, myProfile?.gender]);

  const needsAgeGate =
    view === "dashboard" &&
    !!myProfile &&
    ageGatePending &&
    (!myProfile.birthDate || // 如果沒有生日資料
      calculateAgeFromDate(myProfile.birthDate.toDate()) < 16 || // 或者年齡小於 16
      myProfile.gender === "" ||
      myProfile.gender === "unspecified");

  const capsuleStateById = useMemo(() => {
    const m = new Map<string, (typeof capsuleMessageSpaceStateRows)[number]>();
    for (const row of capsuleMessageSpaceStateRows) {
      m.set(row.capsuleId, row);
    }
    return m;
  }, [capsuleMessageSpaceStateRows]);
  const isCapsuleDeleted = (capsuleId: string) =>
    capsuleStateById.get(capsuleId)?.isDeleted ?? false;
  const isCapsulePublicInSpace = (capsuleId: string) =>
    capsuleStateById.get(capsuleId)?.isProfilePublic ?? false;
  useEffect(() => {
    if (activeTab !== "secret" && activeTab !== "mine_square") return;
    if (squareSelectedPostId === null) return;
    const ok = squarePostsVisible.some(
      (p) => p.sourceMessageId === squareSelectedPostId,
    );
    if (!ok) setSquareSelectedPostId(null);
  }, [activeTab, squareSelectedPostId, squarePostsVisible]);
  useEffect(() => {
    if (activeTab !== "admin" && activeTab !== "admin_ops") return;
    if (selectedAdminReportId == null) return;
    const ok = adminReportsSorted.some((r) => r.id === selectedAdminReportId);
    if (!ok) setSelectedAdminReportId(null);
  }, [activeTab, selectedAdminReportId, adminReportsSorted]);
  // useEffect(() => {
  //   if (!isAdmin) return;
  //   if (activeTab === "admin" || activeTab === "admin_ops") return;
  //   setActiveTab(isSuperAdmin ? "admin_ops" : "admin");
  // }, [activeTab, isAdmin, isSuperAdmin]);
  // useEffect(() => {
  //   if (!isAdmin || isSuperAdmin) return;
  //   if (activeTab === "admin_ops") setActiveTab("admin");
  // }, [activeTab, isAdmin, isSuperAdmin]);
  const squareReactionCountsByPost = useMemo(() => {
    const m = new Map<string, { up: number; mid: number; down: number }>();
    for (const row of squareReactionRows) {
      const cur = m.get(row.postSourceMessageId) ?? { up: 0, mid: 0, down: 0 };
      if (row.kind === "up") cur.up += 1;
      else if (row.kind === "mid") cur.mid += 1;
      else if (row.kind === "down") cur.down += 1;
      m.set(row.postSourceMessageId, cur);
    }
    return m;
  }, [squareReactionRows]);

  const mySquareReactionByPost = useMemo(() => {
    const rmap = new Map<string, SquareReactionKind>();
    for (const row of squareReactionRows) {
      if (!row.reactorIdentity.isEqual(identity)) continue;
      if (row.kind === "up" || row.kind === "mid" || row.kind === "down") {
        rmap.set(row.postSourceMessageId, row.kind);
      }
    }
    return rmap;
  }, [squareReactionRows, identity]);

  const squareCommentsByPost = useMemo(() => {
    const m = new Map<string, SquareComment[]>();
    for (const row of squareCommentRows) {
      const arr = m.get(row.postSourceMessageId) ?? [];
      arr.push(row);
      m.set(row.postSourceMessageId, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) =>
        Number(
          a.createdAt.microsSinceUnixEpoch - b.createdAt.microsSinceUnixEpoch,
        ),
      );
    }
    return m;
  }, [squareCommentRows]);

  const favoritedPostIds = useMemo(() => {
    const s = new Set<string>();
    for (const row of squareFavoriteRows) s.add(row.postSourceMessageId);
    return s;
  }, [squareFavoriteRows]);

  const capsuleIdsExcludedFromDraw = useMemo(() => {
    const s = new Set<string>();
    const me = `${myAccountId ?? ""}`.trim();
    for (const row of capsuleFavoriteRows) s.add(row.capsuleId);
    for (const row of squareFavoriteRows) s.add(row.postSourceMessageId);
    for (const row of capsulePrivateRows) {
      const guestAcc = `${row.threadGuestAccountId ?? ""}`.trim();
      if (me && guestAcc && guestAcc === me) s.add(row.sourceMessageId);
    }
    return s;
  }, [capsuleFavoriteRows, squareFavoriteRows, capsulePrivateRows, myAccountId]);

  /** 膠囊候選（改接 capsule_message）：非自己發布且已到開啟時間 */
  const capsuleMessagesVisible = useMemo(
    () =>
      [...capsuleMessageRows]
        .filter((m) => !isCapsuleDeleted(m.id))
        .filter((m) => m.scheduledAt.toDate() <= now)
        .sort((a, b) =>
          Number(
            b.createdAt.microsSinceUnixEpoch - a.createdAt.microsSinceUnixEpoch,
          ),
        ),
    [capsuleMessageRows, now, capsuleStateById],
  );

  const capsuleEligiblePool = useMemo(
    () =>
      capsuleMessagesVisible.filter((m) => {
        const aid = `${m.authorAccountId ?? ""}`.trim();
        const me = `${myAccountId ?? ""}`.trim();
        const isOwn = !!me && !!aid && aid === me;
        return !isOwn && !capsuleIdsExcludedFromDraw.has(m.id);
      }),
    [capsuleMessagesVisible, myAccountId, capsuleIdsExcludedFromDraw],
  );

  const capsuleEmptyReason = useMemo(() => {
    if (capsuleMessagesVisible.length === 0) {
      const aliveRows = capsuleMessageRows.filter(
        (m) => !isCapsuleDeleted(m.id),
      );
      return aliveRows.length === 0
        ? ("wall_empty" as const)
        : ("timing" as const);
    }
    const others = capsuleMessagesVisible.filter((m) => {
      const aid = `${m.authorAccountId ?? ""}`.trim();
      const me = `${myAccountId ?? ""}`.trim();
      return !(!!me && !!aid && aid === me);
    });
    if (others.length === 0) return "only_self" as const;
    if (capsuleEligiblePool.length === 0) return "all_saved" as const;
    return null;
  }, [
    capsuleMessagesVisible,
    capsuleMessageRows,
    myAccountId,
    capsuleEligiblePool,
    capsuleStateById,
  ]);

  const currentSpaceOwnerHex = spaceOwnerHex ?? identity.toHexString();
  const isOwnSpace = useMemo(() => {
    if (!spaceTargetInfo) return true;
    return spaceTargetInfo.accountId === myAccountId;
  }, [spaceTargetInfo, myAccountId]);
  const spaceOwnerProfile =
    publicProfileByIdentityHex.get(currentSpaceOwnerHex) ??
    profileByIdentityHex.get(currentSpaceOwnerHex) ??
    (spaceTargetInfo?.accountId
      ? profileByAccountId.get(spaceTargetInfo.accountId)
      : undefined);
  const spaceOwnerAvatarKey = isOwnSpace
    ? currentAvatarKey
    : String((spaceOwnerProfile as any)?.avatarKey ?? "");
  const spaceOwnerAvatarRow = avatarCatalogRows.find(
    (row) => row.avatarKey === spaceOwnerAvatarKey,
  );
  const spaceOwnerAvatarUrl = isOwnSpace
    ? currentAvatarUrl
    : spaceOwnerAvatarRow
      ? `${String(spaceOwnerAvatarRow.basePath).replace(/\/?$/, "/")}${spaceOwnerAvatarRow.fileName}`
      : "";
  const spaceOwnerTitleMeta = isOwnSpace
    ? titleMeta
    : resolveTitleMeta(Math.max(0, spaceOwnerAvailablePoints));
  const spaceOwnerProfileNote = isOwnSpace
    ? (myProfile?.profileNote ?? "")
    : ((spaceOwnerProfile as any)?.profileNote ?? "");

  const spaceCapsules = useMemo(() => {
    const targetAccountId = isOwnSpace
      ? myAccountId
      : spaceTargetInfo?.accountId;

    if (!targetAccountId && !isOwnSpace) return [];

    return (
      [...capsuleMessageRows]
        .filter((m) => !isCapsuleDeleted(m.id))
        .filter((m) => {
          if (isOwnSpace) {
            const aid = `${m.authorAccountId ?? ""}`.trim();
            const me = `${myAccountId ?? ""}`.trim();
            return !!me && !!aid && aid === me;
          }
          return `${m.authorAccountId ?? ""}`.trim() === `${targetAccountId ?? ""}`.trim();
        })
        .filter((m) => {
          if (isOwnSpace) return true;
          return isCapsulePublicInSpace(m.id) && m.scheduledAt.toDate() <= now;
        })
        .sort((a, b) =>
          Number(
            b.createdAt.microsSinceUnixEpoch - a.createdAt.microsSinceUnixEpoch,
          ),
        )
    );
  }, [
    capsuleMessageRows,
    spaceTargetInfo,
    isOwnSpace,
    now,
    capsuleStateById,
    myAccountId,
  ]);

  const spaceSquares = useMemo(() => {
    const targetAccountId = isOwnSpace
      ? myAccountId
      : spaceTargetInfo?.accountId;
    if (!targetAccountId && !isOwnSpace) return [];

    const sourceRows = isOwnSpace ? squarePostsSorted : squarePostsVisible;

    return sourceRows
      .filter((p) => {
        if (isOwnSpace) {
          // 兼容舊快照資料：publisherAccountId 可能為空或歷史值，identity 可補齊。
          return (
            (!!myAccountId && p.publisherAccountId === myAccountId) ||
            p.publisherIdentity.isEqual(identity)
          );
        }
        return p.publisherAccountId === targetAccountId; // 使用 accountId
      })
      .sort((a, b) =>
        Number(
          b.createdAt.microsSinceUnixEpoch - a.createdAt.microsSinceUnixEpoch,
        ),
      );
  }, [
    isOwnSpace,
    squarePostsSorted,
    squarePostsVisible,
    spaceTargetInfo,
    myAccountId,
  ]);

  // --- 2. 組合空間時間流 (Feed) ---
  const spaceFeed = useMemo((): SpaceFeedItem[] => {
    const out: SpaceFeedItem[] = [];
    for (const c of spaceCapsules) {
      out.push({
        kind: "capsule",
        key: `capsule:${c.id}`,
        micros: c.createdAt.microsSinceUnixEpoch,
        capsule: c,
      });
    }
    for (const p of spaceSquares) {
      out.push({
        kind: "square",
        key: `square:${p.sourceMessageId}`,
        micros: p.createdAt.microsSinceUnixEpoch,
        post: p,
      });
    }
    out.sort((a, b) => Number(b.micros - a.micros));
    return out.slice(0, 50); // 限流，只看最近 50 則
  }, [spaceCapsules, spaceSquares]);

  // --- 3. 最後定義空間擁有者的顯示資料 (利用 Feed 裡的快照) ---
  const spaceOwnerInfo = useMemo(() => {
    if (isOwnSpace) {
      return {
        name: myProfile?.displayName || "我",
        gender: myProfile?.gender,
        birthDate: myProfile?.birthDate,
      };
    }

    // 如果是別人的空間，從他的第一條動態裡抓取快照資訊
    const firstItem = spaceFeed[0];
    if (firstItem?.kind === "capsule") {
      return {
        name: firstItem.capsule.authorDisplayName || "一位朋友",
        gender: firstItem.capsule.authorGender,
        birthDate: firstItem.capsule.authorBirthDate,
      };
    }
    if (firstItem?.kind === "square") {
      return {
        name: firstItem.post.snapshotPublisherName || "一位朋友",
        gender: firstItem.post.snapshotPublisherGender,
        birthDate: firstItem.post.snapshotPublisherBirthDate,
      };
    }

    return { name: "載入中...", gender: undefined, birthDate: undefined };
  }, [isOwnSpace, myProfile, spaceFeed]);

  // 為了相容原本的變數名
  const spaceOwnerName = spaceOwnerInfo.name;

  const mailboxInitialPickDoneRef = useRef(false);
  const lastMailboxSnapshotRef = useRef<{
    inbox: Message[];
    outbox: Message[];
  }>({
    inbox: [],
    outbox: [],
  });
  /** 秘密膠囊彈窗：捲到「膠囊私訊」並聚焦輸入（聊聊＝對此則發布者私線，非偷偷寫） */
  const capsuleModalPrivateThreadRef = useRef<HTMLDivElement | null>(null);
  const capsuleModalPrivateTextareaRef = useRef<HTMLTextAreaElement | null>(
    null,
  );

  const scrollCapsuleModalToPrivateThread = () => {
    requestAnimationFrame(() => {
      capsuleModalPrivateThreadRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      window.setTimeout(() => {
        capsuleModalPrivateTextareaRef.current?.focus();
      }, 320);
    });
  };

  // 优化后的播报逻辑：监听是否有新信件“到期”
  useEffect(() => {
    if (!myEmail || inbox.length === 0) return;

    const ue = myEmail;
    // 找出：已到期(isDue) + 且还没提醒过 + 且开启时间是最近 1 小时内（防止旧信堆积）
    const newlyOpened = inbox.filter((m) => {
      const isNew = Date.now() - new Date(m.scheduledAt).getTime() < 3600000;
      const alreadyNotified = openedBroadcastItems.some((b) => b.id === m._id);
      return m.isDue && isNew && !alreadyNotified;
    });

    if (newlyOpened.length > 0) {
      const newItems = newlyOpened.map((m) =>
        openedBroadcastFromMessage(m, "inbox", ue),
      );
      setOpenedBroadcastItems((prev) => [...prev, ...newItems]);

      // 自动确保对应的收件匣区域是展开的
      setMailboxSectionsOpen((prev) => ({
        ...prev,
        inbox: { ...prev.inbox, opened: true },
      }));
    }
  }, [inbox, myEmail]); // 依赖项非常清晰

  useEffect(() => {
    if (!myProfile || view !== "dashboard") return;
    if (activeTab !== "inbox") return;
    if (mailboxInitialPickDoneRef.current) return;

    mailboxInitialPickDoneRef.current = true;
    if (!selectedMessageId) {
      setSelectedMessageId(inbox[0]?._id ?? null);
    }
  }, [myProfile, view, inbox, activeTab, selectedMessageId]);

  /** 選中的信已不在目前分頁列表時，改選該列表第一封 */
  useEffect(() => {
    const list =
      activeTab === "inbox" ? inbox : activeTab === "outbox" ? outbox : [];
    if (
      activeTab === "new" ||
      activeTab === "direct" ||
      activeTab === "secret" ||
      activeTab === "mine" ||
      activeTab === "favorites" ||
      activeTab === "space" ||
      activeTab === "admin" ||
      activeTab === "admin_ops" ||
      activeTab === "my_reports" ||
      activeTab === "chat" ||
      list.length === 0
    ) {
      return;
    }
    if (selectedMessageId && !list.some((m) => m._id === selectedMessageId)) {
      setSelectedMessageId(list[0]?._id ?? null);
    }
  }, [inbox, outbox, activeTab, selectedMessageId]);

  /** 點進該信詳情後，側欄播報收合該則 */
  useEffect(() => {
    if (!selectedMessageId) return;
    setOpenedBroadcastItems((prev) =>
      prev.filter((x) => x.id !== selectedMessageId),
    );
  }, [selectedMessageId]);

  useEffect(() => {
    setOutboxEditOpen(false);
    setOutboxEditForm(null);
    setOutboxEditError("");
    setOutboxEditLoading(false);
    setOutboxEditSaving(false);
    setOutboxDeleteConfirmOpenWithStack(false);
  }, [selectedMessageId, activeTab]);
  // 提交資料：將滾筒選中的年月日換算成時間戳發送給後端
  const auth = useMemo(() => {
    const roleRow = myAccountId
      ? adminRoleRows.find((r) => r.accountId === myAccountId && r.isActive)
      : null;
    return {
      isAdmin: !!roleRow,
      isSuperAdmin: roleRow?.role === "super_admin",
      roleLabel: roleRow ? adminRoleLabel[roleRow.role] : "一般用户",
      isMuted: myActiveSanctions.some((s) => s.sanctionType === "mute"),
      isWarned: myActiveSanctions.some((s) => s.sanctionType === "warn"),
    };
  }, [myAccountId, adminRoleRows, myActiveSanctions]);

  const activeAdminRoleRow = useMemo(
    () =>
      adminRoleRows.find(
        (r) =>
          r.isActive &&
          (r.adminIdentity.isEqual(identity) ||
            (!!myAccountId && r.accountId === myAccountId)),
      ) ?? null,
    [adminRoleRows, identity, myAccountId],
  );

  useEffect(() => {
    if (!myProfile) return;
    if (lastActiveTabRestoreCompletedRef.current) return;

    const snap = readMailboxNavSnapshot();
    if (!snap) {
      lastActiveTabRestoreCompletedRef.current = true;
      return;
    }

    const savedTab = snap.tab;
    const isSavedAdminNav = savedTab === "admin" || savedTab === "admin_ops";
    if (!isSavedAdminNav) adminNavRestoreAttemptsRef.current = 0;

    const applyResolvedTab = (tab: AppTab) => {
      adminNavRestoreAttemptsRef.current = 0;
      skipNextPersistAfterRestoreRef.current = true;
      setSpaceBackTab(snap.spaceBackTab);
      setChatBackTab(snap.chatBackTab);
      setSpaceOwnerHex(snap.spaceOwnerHex);
      setSpaceTargetInfo(snap.spaceTargetInfo);
      setSelectedChatThreadKey(snap.selectedChatThreadKey);
      setSelectedMessageId(snap.selectedMessageId);
      setSquareSelectedPostId(snap.squareSelectedPostId);
      setFavoriteSelectedId(snap.favoriteSelectedId);
      setSelectedAdminReportId(snap.selectedAdminReportId);
      setAdminSection(snap.adminSection);
      setActiveTab(tab);
      lastActiveTabRestoreCompletedRef.current = true;
    };

    if (adminRoleRowsLoading) return;

    if (savedTab === "admin_ops") {
      const roleRow = activeAdminRoleRow;
      if (roleRow?.role === "super_admin") {
        applyResolvedTab("admin_ops");
        return;
      }
      if (roleRow) {
        applyResolvedTab("admin");
        return;
      }
      if (adminNavRestoreAttemptsRef.current < 36) {
        adminNavRestoreAttemptsRef.current += 1;
        const tid = window.setTimeout(
          () => setAdminNavRestoreTick((n) => n + 1),
          100,
        );
        return () => window.clearTimeout(tid);
      }
      adminNavRestoreAttemptsRef.current = 0;
      lastActiveTabRestoreCompletedRef.current = true;
      return;
    }

    if (savedTab === "admin") {
      const roleRow = activeAdminRoleRow;
      if (roleRow) {
        applyResolvedTab("admin");
        return;
      }
      if (adminNavRestoreAttemptsRef.current < 36) {
        adminNavRestoreAttemptsRef.current += 1;
        const tid = window.setTimeout(
          () => setAdminNavRestoreTick((n) => n + 1),
          100,
        );
        return () => window.clearTimeout(tid);
      }
      adminNavRestoreAttemptsRef.current = 0;
      lastActiveTabRestoreCompletedRef.current = true;
      return;
    }

    applyResolvedTab(savedTab);
  }, [
    myProfile,
    myAccountId,
    activeAdminRoleRow,
    adminRoleRowsLoading,
    adminNavRestoreTick,
    setActiveTab,
    setSpaceBackTab,
    setChatBackTab,
    setSpaceOwnerHex,
    setSpaceTargetInfo,
    setSelectedChatThreadKey,
    setSelectedMessageId,
    setSquareSelectedPostId,
    setFavoriteSelectedId,
    setSelectedAdminReportId,
    setAdminSection,
  ]);

  useEffect(() => {
    if (!myProfile) return;
    if (!lastActiveTabRestoreCompletedRef.current) return;
    if (skipNextPersistAfterRestoreRef.current) {
      skipNextPersistAfterRestoreRef.current = false;
      return;
    }
    /** 管理分頁：訂閱已就緒且列上無有效角色時，不把 admin 寫進快照（防竄改 localStorage／權限被撤）。載入中仍寫目前 tab 以利刷新還原。 */
    const roleReady = !adminRoleRowsLoading;
    let tabToSave: AppTab = activeTab;
    if (roleReady) {
      if (activeTab === "admin_ops") {
        if (activeAdminRoleRow?.role === "super_admin") tabToSave = "admin_ops";
        else if (activeAdminRoleRow) tabToSave = "admin";
        else tabToSave = "secret";
      } else if (activeTab === "admin") {
        tabToSave = activeAdminRoleRow ? "admin" : "secret";
      }
    }

    writeMailboxNavSnapshot({
      v: 1,
      tab: tabToSave,
      spaceOwnerHex,
      spaceTargetInfo: spaceTargetInfo
        ? {
            accountId: spaceTargetInfo.accountId,
            displayName: spaceTargetInfo.displayName,
            gender: spaceTargetInfo.gender,
          }
        : null,
      spaceBackTab,
      chatBackTab,
      selectedChatThreadKey,
      selectedMessageId,
      squareSelectedPostId,
      favoriteSelectedId,
      selectedAdminReportId,
      adminSection,
    });
  }, [
    activeTab,
    myProfile,
    adminRoleRowsLoading,
    activeAdminRoleRow,
    spaceOwnerHex,
    spaceTargetInfo,
    spaceBackTab,
    chatBackTab,
    selectedChatThreadKey,
    selectedMessageId,
    squareSelectedPostId,
    favoriteSelectedId,
    selectedAdminReportId,
    adminSection,
  ]);

  const {
    handleAuth,
    registerOtpCode,
    setRegisterOtpCode,
    registerOtpSendBusy,
    registerOtpMessage,
    registerOtpCooldownUntilMs,
    registerOtpVerified,
    requestRegisterEmailOtp,
    forgotOtpCode,
    setForgotOtpCode,
    forgotOtpSendBusy,
    forgotOtpVerifyBusy,
    forgotPwdResetBusy,
    forgotOtpMessage,
    forgotOtpCooldownUntilMs,
    forgotOtpVerified,
    forgotNewPassword,
    setForgotNewPassword,
    forgotConfirmPassword,
    setForgotConfirmPassword,
    requestForgotPasswordOtp,
    submitForgotPasswordReset,
    openProfileModal,
    openProfileActionMenu,
    openAccountProfile,
    openPasswordModal,
    openIntroEditor,
    submitProfile,
    submitIntroEdit,
    submitPasswordChange,
    handleLogout,
    submitAgeGate,
    openReportModal,
    submitReport,
  } = useAccountFlowHandlers({
    email,
    password,
    confirmPassword,
    registerDisplayName,
    registerGender,
    setError,
    setLoading,
    setView: (v) => setView(v),
    setEmail,
    setPassword,
    loginAccount,
    registerAccount,
    registerAccountWithEmailOtp,
    requestEmailOtp,
    verifyEmailOtp,
    resetPasswordWithEmailOtp,
    myProfile,
    user,
    setBirthYear,
    setBirthMonth,
    setBirthDay,
    setAgeGateGender,
    setProfileForm,
    setProfileError,
    setProfileActionMenuOpen,
    setPasswordError,
    setPasswordOld,
    setPasswordNew,
    setPasswordConfirm,
    setPasswordModalOpenWithStack,
    setProfileModalOpenWithStack,
    setIntroEditDraft,
    setIntroEditError,
    setIntroEditOpenWithStack,
    profileForm,
    birthYear,
    birthMonth,
    birthDay,
    ageGateGender,
    updateAccountProfile,
    setAgeYears,
    setProfileSaving,
    introEditDraft,
    setIntroEditSaving,
    passwordOld,
    passwordNew,
    passwordConfirm,
    changePassword,
    setPasswordSaving,
    needsAgeGate,
    setAgeGateError,
    calculatedAge,
    setAgeGateSaving,
    setAgeGatePending,
    reportTargetType,
    setReportTargetType,
    reportTargetId,
    setReportTargetId,
    reportReasonCode,
    setReportReasonCode,
    reportDetail,
    setReportDetail,
    setReportError,
    setReportSaving,
    createReportTicket,
    setReportModalOpenWithStack,
  });


  const submitAdminPurgeAllRoles = async () => {
    if (!window.confirm("確定要清空 admin_role 全部列？")) return;
    if (
      !window.confirm(
        "再次確認：清空後你將失去管理權限，需重新執行首位超管流程。",
      )
    )
      return;
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await adminPurgeAllRoles();
      setActiveTab("mine");
      setSelectedAdminReportId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminActionError(msg || "清空管理角色失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };


  const callWithTimeout = async <T,>(
    task: Promise<T>,
    timeoutMs = 12000,
  ): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      return await Promise.race([
        task,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error("送出逾時，請檢查網路或重新登入後再試"));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const scheduledLocal = formData.get("scheduledAt");
    let scheduledAt: Timestamp | undefined;
    if (
      composeMode === "direct" &&
      typeof scheduledLocal === "string" &&
      scheduledLocal.trim()
    ) {
      const d = new Date(scheduledLocal);
      if (!Number.isNaN(d.getTime())) {
        scheduledAt = Timestamp.fromDate(d);
      }
    }
    const recipientEmail = String(formData.get("recipientEmail") ?? "");
    const content = String(formData.get("content") ?? "");
    const isWaitListVisible =
      composeMode === "direct"
        ? formData.get("isWaitListVisible") === "on"
        : true;
    const composePublishToSquare =
      composeMode === "direct" ? composeSyncSquare : false;
    const composeSquareRepliesPublic =
      composePublishToSquare && composeCommentsEnabled;
    const composeSquareIncludeThread =
      composePublishToSquare && !composeMainOnly;
    const isCapsuleProfilePublic =
      composeMode === "capsule"
        ? formData.get("isProfilePublic") === "on"
        : false;

    if (composeMode === "direct" && !recipientEmail.trim()) {
      setComposeError("請填寫收件人");
      return;
    }
    if (content.trim().length > TEXT_LIMIT) {
      setComposeError(`內容最多 ${TEXT_LIMIT} 字`);
      return;
    }

    setLoading(true);
    setComposeError("");
    setComposeSuccess("");
    try {
      if (composeMode === "direct") {
        await callWithTimeout(
          sendDirectMessage({
            recipientEmail,
            content,
            scheduledAt,
            isWaitListVisible,
            publishToSquare: composePublishToSquare,
            squareRepliesPublic: composeSquareRepliesPublic,
            squareIncludeThread: composeSquareIncludeThread,
            squareIncludeCapsulePrivate:
              composePublishToSquare && composeIncludeCapsulePrivate,
            squareShowSender: composePublishToSquare
              ? composeShowSquareSender
              : false,
            squareShowRecipient: composePublishToSquare
              ? composeShowSquareRecipient
              : false,
          }),
        );
        setComposeSuccess(
          scheduledAt ? "定向訊息已排程送出。" : "定向訊息已即時送出。",
        );
      } else {
        await callWithTimeout(
          sendCapsuleMessage({
            content,
            capsuleType: composeCapsuleType,
            scheduledAt,
            isWaitListVisible,
            isProfilePublic: isCapsuleProfilePublic,
            publishToSquare: false,
            squareRepliesPublic: false,
            squareIncludeThread: false,
            squareIncludeCapsulePrivate: false,
            squareShowSender: false,
            squareShowRecipient: false,
          }),
        );
        emitPointsToast(5, "發布膠囊");
        setComposeSuccess("秘密膠囊已即時送出。");
      }
      (e.target as HTMLFormElement).reset();
      setComposeSyncSquare(false);
      setComposeMainOnly(true);
      setComposeIncludeCapsulePrivate(false);
      setComposeCommentsEnabled(false);
      setComposeShowSquareSender(true);
      setComposeShowSquareRecipient(true);
      setComposeCapsuleType(4);
      setActiveTab(composeMode === "direct" ? "outbox" : "secret");
      setSelectedMessageId(null);
      setTimeout(() => setComposeSuccess(""), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isSessionInvalidErrorMessage(msg)) {
        setComposeError("登入已在其他裝置更新，請重新登入。");
        forceReauthRedirect();
        return;
      }
      setComposeError(msg || "寄送失敗");
    } finally {
      setLoading(false);
    }
  };

  const capsulePost: CapsuleMessage | undefined =
    capsulePostId === null
      ? undefined
      : capsuleMessageRows.find(
          (m) => m.id === capsulePostId && !isCapsuleDeleted(m.id),
        );
  const capsuleSquarePost: SquarePost | undefined =
    capsulePostId === null
      ? undefined
      : squarePostRows.find((p) => p.sourceMessageId === capsulePostId);

  const capsuleBodyFavorited = useMemo(() => {
    if (!capsulePost) return false;
    return capsuleFavoriteRows.some((f) => f.capsuleId === capsulePost.id);
  }, [capsulePost, capsuleFavoriteRows]);

  /** 膠囊彈窗或秘密詳情：用於私訊列表與訪客線初始化 */
  const capsuleUiPostId =
    capsuleOpen && capsulePostId !== null
      ? capsulePostId
      : !capsuleOpen &&
          (activeTab === "secret" || activeTab === "mine_square") &&
          squareSelectedPostId !== null
        ? squareSelectedPostId
        : null;

  const capsulePrivateForActiveUi = useMemo((): CapsulePrivateMessage[] => {
    if (!capsuleUiPostId) return [];
    return capsulePrivateRows.filter(
      (r) => r.sourceMessageId === capsuleUiPostId,
    ) as CapsulePrivateMessage[];
  }, [capsulePrivateRows, capsuleUiPostId]);

  const liveRowForCapsuleUi =
    capsuleUiPostId === null
      ? undefined
      : (outboxRows.find((r) => r.id === capsuleUiPostId) ??
        inboxRows.find((r) => r.id === capsuleUiPostId));

  const capsuleSourceRowForUi =
    capsuleUiPostId === null
      ? undefined
      : (liveRowForCapsuleUi ??
        capsuleMessageRows.find((m) => m.id === capsuleUiPostId));

  const isCapsuleParticipantUi = !!(
    capsuleSourceRowForUi &&
    !!myEmail &&
    ("authorIdentity" in capsuleSourceRowForUi
      ? emailsEqual(capsuleSourceRowForUi.authorEmail, myEmail)
      : emailsEqual(capsuleSourceRowForUi.senderEmail, myEmail) ||
        emailsEqual(capsuleSourceRowForUi.recipientEmail, myEmail))
  );

  const uniqueCapsuleGuestHexes = useMemo(() => {
    if (!capsuleUiPostId) return [];
    const meHex = identity.toHexString();
    const pubAid =
      `${capsuleMessageRows.find((c) => c.id === capsuleUiPostId)?.authorAccountId ?? ""}`.trim() ||
      `${squarePostRows.find((p) => p.sourceMessageId === capsuleUiPostId)?.publisherAccountId ?? ""}`.trim();
    const s = new Set<string>();
    for (const m of capsulePrivateForActiveUi) {
      const rawHex = m.threadGuestIdentity.toHexString();
      const tgAidCol = `${(m as { threadGuestAccountId?: string }).threadGuestAccountId ?? ""}`.trim();
      const authorAid = `${m.authorAccountId ?? ""}`.trim();
      const fromPublisherAuthor = !!(pubAid && authorAid && authorAid === pubAid);
      const inferredAid = tgAidCol || (!fromPublisherAuthor ? authorAid : "");
      let canonical = rawHex;
      if (inferredAid) {
        const pf = profileByAccountId.get(inferredAid);
        const ox = pf?.ownerIdentity?.toHexString()?.trim();
        if (ox) canonical = ox;
      }
      for (const hx of [rawHex, canonical]) {
        if (hx && hx !== meHex) s.add(hx);
      }
    }
    return [...s];
  }, [
    capsulePrivateForActiveUi,
    capsuleUiPostId,
    identity,
    profileByAccountId,
    capsuleMessageRows,
    squarePostRows,
  ]);

  useEffect(() => {
    if (!isCapsuleParticipantUi) return;
    if (!capsuleThreadGuestHex) return;
    if (uniqueCapsuleGuestHexes.includes(capsuleThreadGuestHex)) return;
    // 當列表更新後原本選項不存在時，回退為空狀態提示
    setCapsuleThreadGuestHex(null);
  }, [
    isCapsuleParticipantUi,
    capsuleThreadGuestHex,
    uniqueCapsuleGuestHexes,
    setCapsuleThreadGuestHex,
  ]);

  const hasMyGuestThreadOnCurrentCapsule = useMemo(() => {
    if (!capsuleUiPostId) return false;
    const meHex = identity.toHexString();
    const myAid = `${myAccountId ?? ""}`.trim();
    const req = meHex;
    const eff = resolvedEffectiveGuestHex(req, myAid || undefined, profileByAccountId);
    return (
      gatherCapsulePrivateGuestThreadMessagesClient(
        capsulePrivateRows,
        capsuleUiPostId,
        req,
        eff,
        myAid || undefined,
      ).length > 0
    );
  }, [
    capsuleUiPostId,
    capsulePrivateRows,
    identity,
    myAccountId,
    profileByAccountId,
  ]);

  const canShowCapsuleModalFirstMessageInput =
    !isCapsuleParticipantUi && !hasMyGuestThreadOnCurrentCapsule;

  const capsuleModalPeerChatUnlocked = useMemo(() => {
    if (!capsulePost || !identity) return false;
    const meHex = identity.toHexString();
    const myAid = `${myAccountId ?? ""}`.trim();
    const eff = resolvedEffectiveGuestHex(meHex, myAid || undefined, profileByAccountId);
    const n = gatherCapsulePrivateGuestThreadMessagesClient(
      capsulePrivateRows,
      capsulePost.id,
      meHex,
      eff,
      myAid || undefined,
    ).length;
    return n >= 10;
  }, [capsulePost, identity, capsulePrivateRows, myAccountId, profileByAccountId]);

  const capsuleOverlayShowAuthorRealName =
    isCapsuleParticipantUi || capsuleModalPeerChatUnlocked;

  const capsuleChatThreads = useMemo((): CapsuleChatThreadSummary[] => {
    const pubAidBySource = new Map<string, string>();
    for (const c of capsuleMessageRows) {
      const a = `${c.authorAccountId ?? ""}`.trim();
      if (a) pubAidBySource.set(c.id, a);
    }
    for (const p of squarePostRows) {
      const a = `${p.publisherAccountId ?? ""}`.trim();
      if (a) pubAidBySource.set(p.sourceMessageId, a);
    }

    const canonicalGuest = (m: CapsulePrivateMessage) => {
      const rawHex = m.threadGuestIdentity.toHexString();
      const tgAidCol = String((m as { threadGuestAccountId?: string })
        .threadGuestAccountId ?? "").trim();
      const authorAid = `${m.authorAccountId ?? ""}`.trim();
      const srcPub = `${pubAidBySource.get(m.sourceMessageId) ?? ""}`.trim();
      const fromPublisherAuthor = !!(srcPub && authorAid && authorAid === srcPub);
      const inferredAid = tgAidCol || (!fromPublisherAuthor ? authorAid : "");
      if (!inferredAid) return { guestHex: rawHex, guestAccountId: "" };
      const byAid = profileByAccountId.get(inferredAid);
      return {
        guestHex: byAid?.ownerIdentity?.toHexString() ?? rawHex,
        guestAccountId: inferredAid,
      };
    };

    const summaries = new Map<string, CapsuleChatThreadSummary>();

    for (const m of capsulePrivateRows) {
      const { guestHex, guestAccountId: canonicalGuestAccountId } =
        canonicalGuest(m);
      const key = `${m.sourceMessageId}::${guestHex}`;
      const existing = summaries.get(key);

      const content = (m.body ?? "").trim();
      const preview =
        content.length > 42 ? `${content.slice(0, 42)}…` : content;

      const sourceCapsule = capsuleMessageRows.find(
        (c) => c.id === m.sourceMessageId,
      );
      const post = squarePostRows.find(
        (p) => p.sourceMessageId === m.sourceMessageId,
      );

      const sourcePreviewRaw = (
        sourceCapsule?.content ??
        post?.snapshotContent ??
        ""
      ).trim();
      const sourcePreview =
        sourcePreviewRaw.length > 24
          ? `${sourcePreviewRaw.slice(0, 24)}…`
          : sourcePreviewRaw || "（無主文）";

      const isMeGuest = guestHex === identity.toHexString();

      let counterpartLabel = "未知用戶";
      let counterpartGender = "unspecified";
      let counterpartBirthDate = undefined;
      let counterpartIdentityHex = "";
      let counterpartAccountId = "";

      if (isMeGuest) {
        counterpartLabel =
          sourceCapsule?.authorDisplayName ||
          post?.snapshotPublisherName ||
          "對方";
        counterpartGender =
          sourceCapsule?.authorGender ||
          post?.snapshotPublisherGender ||
          "unspecified";
        counterpartBirthDate =
          sourceCapsule?.authorBirthDate || post?.snapshotPublisherBirthDate;
        counterpartIdentityHex =
          sourceCapsule?.authorIdentity.toHexString() ||
          post?.publisherIdentity.toHexString() ||
          "";
        counterpartAccountId =
          sourceCapsule?.authorAccountId ||
          post?.publisherAccountId ||
          "";
      } else {
        const gProfile = publicProfileByIdentityHex.get(guestHex);
        const guestAccountId =
          canonicalGuestAccountId ||
          gProfile?.accountId ||
          capsulePrivateRows.find(
            (x) =>
              x.sourceMessageId === m.sourceMessageId &&
              canonicalGuest(x).guestHex === guestHex &&
              (x.authorIdentity.toHexString() === guestHex ||
                (canonicalGuestAccountId &&
                  `${x.authorAccountId ?? ""}`.trim() ===
                    canonicalGuestAccountId)) &&
              !!(x.authorAccountId ?? "").trim(),
          )?.authorAccountId ||
          "";
        const profileByAid = guestAccountId
          ? profileByAccountId.get(guestAccountId)
          : undefined;
        counterpartLabel =
          (gProfile?.displayName ?? "").trim() ||
          (profileByAid?.displayName ?? "").trim() ||
          "一位朋友";
        counterpartGender =
          gProfile?.gender || profileByAid?.gender || "unspecified";
        counterpartBirthDate = gProfile?.birthDate || profileByAid?.birthDate;
        counterpartIdentityHex = guestHex;
        counterpartAccountId = guestAccountId;
      }

      const row: CapsuleChatThreadSummary = {
        key,
        sourceMessageId: m.sourceMessageId,
        threadGuestHex: guestHex,
        threadGuestAccountId: canonicalGuestAccountId || undefined,
        counterpartLabel,
        counterpartIdentityHex,
        counterpartAccountId,
        counterpartGender,
        counterpartBirthDate,
        sourcePreview,
        sourceCapsuleType: sourceCapsule?.capsuleType ?? 4,
        lastBody: preview || "（尚無內容）",
        lastAtMicros: m.createdAt.microsSinceUnixEpoch,
        threadPrivateMessageCount: 0,
        hasNewMessageFromPeer: false,
      };

      if (!existing || existing.lastAtMicros < row.lastAtMicros) {
        summaries.set(key, row);
      }
    }

    const list = [...summaries.values()];
    return list
      .map((row) => {
        const eff = resolvedEffectiveGuestHex(
          row.threadGuestHex,
          row.threadGuestAccountId,
          profileByAccountId,
        );
        const msgs = gatherCapsulePrivateGuestThreadMessagesClient(
          capsulePrivateRows,
          row.sourceMessageId,
          row.threadGuestHex,
          eff,
          row.threadGuestAccountId,
        );
        if (msgs.length === 0) {
          return { ...row, threadPrivateMessageCount: 0, hasNewMessageFromPeer: false };
        }
        const sorted = [...msgs].sort(
          (a, b) =>
            Number(
              a.createdAt.microsSinceUnixEpoch -
                b.createdAt.microsSinceUnixEpoch,
            ),
        );
        const last = sorted[sorted.length - 1]!;
        const lastRaw = (last.body ?? "").trim();
        const lastPreview =
          lastRaw.length > 42 ? `${lastRaw.slice(0, 42)}…` : lastRaw;
        return {
          ...row,
          lastBody: lastPreview || row.lastBody,
          lastAtMicros: last.createdAt.microsSinceUnixEpoch,
          threadPrivateMessageCount: msgs.length,
          hasNewMessageFromPeer: !isChatMessageFromSelfByAccount(
            last.authorAccountId,
            myAccountId,
          ),
        };
      })
      .sort((a, b) => Number(b.lastAtMicros - a.lastAtMicros));
  }, [
    capsulePrivateRows,
    squarePostRows,
    capsuleMessageRows,
    identity,
    myAccountId,
    publicProfileByIdentityHex,
    profileByAccountId,
  ]);

  const selectedChatThread = useMemo(():
    | CapsuleChatThreadSummary
    | null => {
    if (!selectedChatThreadKey) return null;
    const found = capsuleChatThreads.find(
      (t) => t.key === selectedChatThreadKey,
    );
    if (found) return found;

    const parts = selectedChatThreadKey.split("::");
    if (parts.length !== 2) return null;
    const [sourceId, guestHex] = parts;
    if (guestHex !== identity.toHexString()) return null;

    const sourceCapsule = capsuleMessageRows.find((c) => c.id === sourceId);
    const post = squarePostRows.find(
      (p) => p.sourceMessageId === sourceId,
    );
    if (!sourceCapsule && !post) return null;

    const sourcePreviewRaw = (
      sourceCapsule?.content ??
      post?.snapshotContent ??
      ""
    ).trim();
    const sourcePreview =
      sourcePreviewRaw.length > 24
        ? `${sourcePreviewRaw.slice(0, 24)}…`
        : sourcePreviewRaw || "（無主文）";

    return {
      key: selectedChatThreadKey,
      sourceMessageId: sourceId,
      threadGuestHex: guestHex,
      threadGuestAccountId: (myAccountId ?? "").trim() || undefined,
      counterpartLabel:
        sourceCapsule?.authorDisplayName ||
        post?.snapshotPublisherName ||
        "對方",
      counterpartIdentityHex:
        sourceCapsule?.authorIdentity.toHexString() ||
        post?.publisherIdentity.toHexString() ||
        "",
      counterpartAccountId:
        sourceCapsule?.authorAccountId ||
        post?.publisherAccountId ||
        "",
      counterpartGender:
        sourceCapsule?.authorGender ||
        post?.snapshotPublisherGender ||
        "unspecified",
      counterpartBirthDate:
        sourceCapsule?.authorBirthDate || post?.snapshotPublisherBirthDate,
      sourcePreview,
      sourceCapsuleType: sourceCapsule?.capsuleType ?? 4,
      lastBody: "（尚無內容）",
      lastAtMicros: 0n,
      threadPrivateMessageCount: 0,
      hasNewMessageFromPeer: false,
    };
  }, [
    selectedChatThreadKey,
    capsuleChatThreads,
    identity,
    myAccountId,
    capsuleMessageRows,
    squarePostRows,
  ]);

  const selectedChatMessages = useMemo(() => {
    if (!selectedChatThread) return [];
    const eff = resolvedEffectiveGuestHex(
      selectedChatThread.threadGuestHex,
      selectedChatThread.threadGuestAccountId,
      profileByAccountId,
    );
    return gatherCapsulePrivateGuestThreadMessagesClient(
      capsulePrivateRows,
      selectedChatThread.sourceMessageId,
      selectedChatThread.threadGuestHex,
      eff,
      selectedChatThread.threadGuestAccountId,
    ).sort((a, b) =>
      Number(
        a.createdAt.microsSinceUnixEpoch - b.createdAt.microsSinceUnixEpoch,
      ),
    );
  }, [capsulePrivateRows, selectedChatThread, profileByAccountId]);
  const selectedChatProgress = Math.min(10, selectedChatMessages.length);
  const chatPeerUnlocked = selectedChatProgress >= 10;

  const { markThreadRead, cursorMap } = useChatReadCursors(
    (myAccountId ?? "").trim() || identity.toHexString(),
  );

  const capsuleChatThreadsWithUnread = useMemo((): CapsuleChatThreadSummary[] => {
    return capsuleChatThreads.map((t) => {
      const eff = resolvedEffectiveGuestHex(
        t.threadGuestHex,
        t.threadGuestAccountId,
        profileByAccountId,
      );
      const msgs = gatherCapsulePrivateGuestThreadMessagesClient(
        capsulePrivateRows,
        t.sourceMessageId,
        t.threadGuestHex,
        eff,
        t.threadGuestAccountId,
      );
      const readCursor = cursorMap.get(t.key) ?? 0n;
      const hasUnread = computeThreadUnread(readCursor, msgs, myAccountId);
      return { ...t, hasUnread };
    });
  }, [capsuleChatThreads, capsulePrivateRows, myAccountId, cursorMap, profileByAccountId]);
  const chatThreadAvatarUrlByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of capsuleChatThreadsWithUnread) {
      const pfByAid = t.counterpartAccountId
        ? profileByAccountId.get(t.counterpartAccountId)
        : undefined;
      const pfByHex = t.counterpartIdentityHex
        ? profileByIdentityHex.get(t.counterpartIdentityHex)
        : undefined;
      const avatarKey = String(
        (pfByAid as any)?.avatarKey ?? (pfByHex as any)?.avatarKey ?? "",
      ).trim();
      if (!avatarKey) continue;
      const url = avatarUrlByKey.get(avatarKey);
      if (url) m.set(t.key, url);
    }
    return m;
  }, [capsuleChatThreadsWithUnread, profileByAccountId, profileByIdentityHex, avatarUrlByKey]);

  const chatUnreadThreadCount = useMemo(
    () => capsuleChatThreadsWithUnread.filter((t) => t.hasUnread).length,
    [capsuleChatThreadsWithUnread],
  );

  const selectedChatReadMarkMicros = useMemo(
    () => maxMessageMicros(selectedChatMessages),
    [selectedChatMessages],
  );

  const clearChatDraftInput = useCallback(() => {
    setChatDraft("");
    if (chatInputRef.current) {
      chatInputRef.current.style.height = "44px";
    }
  }, [setChatDraft]);

  useEffect(() => {
    const prev = prevChatThreadKeyRef.current;
    if (prev !== null && prev !== selectedChatThreadKey) {
      clearChatDraftInput();
    }
    prevChatThreadKeyRef.current = selectedChatThreadKey;
  }, [selectedChatThreadKey, clearChatDraftInput]);

  useEffect(() => {
    const prev = prevActiveTabRef.current;
    if (prev === "chat" && activeTab !== "chat") {
      clearChatDraftInput();
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab, clearChatDraftInput]);

  useEffect(() => {
    if (activeTab !== "chat" || !selectedChatThreadKey) return;
    if (selectedChatMessages.length === 0) return;
    markThreadRead(selectedChatThreadKey, selectedChatReadMarkMicros);
  }, [
    activeTab,
    selectedChatThreadKey,
    selectedChatReadMarkMicros,
    markThreadRead,
    selectedChatMessages.length,
  ]);

  const selectedChatPeerProfile = selectedChatThread
    ? publicProfileByIdentityHex.get(
        selectedChatThread.counterpartIdentityHex,
      ) ??
      profileByIdentityHex.get(selectedChatThread.counterpartIdentityHex) ??
      (selectedChatThread.counterpartAccountId
        ? profileByAccountId.get(selectedChatThread.counterpartAccountId)
        : undefined)
    : undefined;
  const selectedChatPeerAvatarUrl = useMemo(() => {
    if (!selectedChatThread) return "";
    const pfByAid = selectedChatThread.counterpartAccountId
      ? profileByAccountId.get(selectedChatThread.counterpartAccountId)
      : undefined;
    const pfByHex = selectedChatThread.counterpartIdentityHex
      ? profileByIdentityHex.get(selectedChatThread.counterpartIdentityHex)
      : undefined;
    const avatarKey = String(
      (pfByAid as any)?.avatarKey ?? (pfByHex as any)?.avatarKey ?? "",
    ).trim();
    return avatarKey ? avatarUrlByKey.get(avatarKey) || "" : "";
  }, [selectedChatThread, profileByAccountId, profileByIdentityHex, avatarUrlByKey]);

  const isSourceCapsuleMine = useMemo(() => {
    if (!selectedChatThread) return false;
    const myAid = `${myAccountId ?? ""}`.trim();
    if (!myAid) return false;
    const sourceId = selectedChatThread.sourceMessageId;
    const sourceCapsule = capsuleMessageRows.find((c) => c.id === sourceId);
    const sourcePost = squarePostRows.find((p) => p.sourceMessageId === sourceId);
    const sourceAid = `${sourceCapsule?.authorAccountId ?? sourcePost?.publisherAccountId ?? ""}`.trim();
    return !!sourceAid && sourceAid === myAid;
  }, [selectedChatThread, myAccountId, capsuleMessageRows, squarePostRows]);

  useEffect(() => {
    if (activeTab !== "chat") return;
    if (capsuleChatThreads.length === 0) {
      setSelectedAdminReportId(null);
      return;
    }
    setSelectedChatThreadKey((prev) =>
      prev
        ? resolveCanonicalChatThreadSelectionKey(
            prev,
            capsuleChatThreads,
            capsulePrivateRows,
            identity.toHexString(),
            myAccountId,
            profileByAccountId,
          )
        : null,
    );
  }, [
    activeTab,
    capsuleChatThreads,
    capsulePrivateRows,
    identity,
    myAccountId,
    profileByAccountId,
  ]);

  useEffect(() => {
    if (!capsuleUiPostId || !identity) {
      return;
    }
    const row =
      inboxRows.find((r) => r.id === capsuleUiPostId) ??
      outboxRows.find((r) => r.id === capsuleUiPostId);
    const capsule = capsuleMessageRows.find((m) => m.id === capsuleUiPostId);
    const participant =
      (row &&
        !!myProfile &&
        (row.senderIdentity.isEqual(identity) ||
          emailsEqual(row.recipientEmail, myProfile.email))) ||
      (capsule ? capsule.authorIdentity.isEqual(identity) : false);
    if (participant) {
      setCapsuleThreadGuestHex((prev) =>
        prev && uniqueCapsuleGuestHexes.includes(prev)
          ? prev
          : (uniqueCapsuleGuestHexes[0] ?? null),
      );
    } else {
      setCapsuleThreadGuestHex(identity.toHexString());
    }
  }, [
    capsuleUiPostId,
    identity,
    myProfile,
    inboxRows,
    outboxRows,
    capsulePrivateRows,
    capsuleMessageRows,
    uniqueCapsuleGuestHexes,
  ]);

  /** Rules of Hooks: keep this before any login/boot early return. */
  const unifiedFavoriteItems = useMemo((): UnifiedFavoriteListItem[] => {
    const peerUnlocked = (sourceMessageId: string, publisherAccountId: string) => {
      if (!myAccountId) return false;
      const me = identity.toHexString();
      const iAmPublisher = publisherAccountId === myAccountId;
      const myAidTrim = `${myAccountId ?? ""}`.trim();
      for (const t of capsuleChatThreads) {
        if (t.sourceMessageId !== sourceMessageId) continue;
        if (t.threadPrivateMessageCount < 10) continue;
        if (iAmPublisher) {
          if (t.threadGuestHex !== me) return true;
        } else if (
          `${t.threadGuestAccountId ?? ""}`.trim() === myAidTrim ||
          (myAidTrim === "" && t.threadGuestHex === me)
        ) {
          return true;
        }
      }
      return false;
    };

    const squareItems: UnifiedFavoriteListItem[] = squareFavoriteRows.map(
      (f) => ({
        kind: "square",
        key: `sq:${f.id}`,
        createdAtMicros: f.createdAt.microsSinceUnixEpoch,
        row: f,
        peerIdentityUnlocked: peerUnlocked(
          f.postSourceMessageId,
          f.snapshotPublisherAccountId,
        ),
      }),
    );
    const capsuleItems: UnifiedFavoriteListItem[] = capsuleFavoriteRows.map(
      (f) => ({
        kind: "capsule",
        key: `cap:${f.id}`,
        createdAtMicros: f.createdAt.microsSinceUnixEpoch,
        row: f,
        peerIdentityUnlocked: peerUnlocked(
          f.capsuleId,
          f.snapshotPublisherAccountId,
        ),
      }),
    );
    return [...squareItems, ...capsuleItems].sort((a, b) =>
      Number(b.createdAtMicros - a.createdAtMicros),
    );
  }, [
    squareFavoriteRows,
    capsuleFavoriteRows,
    capsuleChatThreads,
    identity,
    myAccountId,
  ]);

  useEffect(() => {
    if (!favoriteSelectedId) return;
    if (!unifiedFavoriteItems.some((x) => x.key === favoriteSelectedId)) {
      setFavoriteSelectedId(null);
    }
  }, [favoriteSelectedId, unifiedFavoriteItems]);

  useEffect(() => {
    if (!dailyRewardToast) return;
    const id = window.setTimeout(() => setDailyRewardToast(""), 2200);
    return () => window.clearTimeout(id);
  }, [dailyRewardToast]);

  const onSecretSidebarOpenChat = useCallback(() => {
    setChatBackTab("secret");
    setActiveTab("chat");
    setSelectedMessageId(null);
    setSquareSelectedPostId(null);
    setFavoriteSelectedId(null);
    setSelectedChatThreadKey(null);
    setSelectedAdminReportId(null);
    setSquareActionError("");
  }, [
    setChatBackTab,
    setActiveTab,
    setSelectedMessageId,
    setSquareSelectedPostId,
    setFavoriteSelectedId,
    setSelectedChatThreadKey,
    setSelectedAdminReportId,
    setSquareActionError,
  ]);

  if (isBooting) {
    return (
      <div
        key="bootloader"
        className="ys-dreamy-cosmic flex h-screen w-full flex-col items-center justify-center text-white"
      >
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="有說"
          className="mb-4 w-32 object-contain p-1"
        />
        <Loader2 className="h-8 w-8 animate-spin text-[#FFD54F] mb-4" />
        {/* <p className="text-[14px] font-bold">正在連線至時空數據庫...</p> */}
      </div>
    );
  }
  // 無 profile 時畫面仍是「登入表單」，但 view 可能是 loading/dashboard；提交須用 view !== "register" 當 isLogin，勿用 view === "login"
  if (view === "login" || view === "register" || !myProfile) {
    return (
      <AuthSection
        view={view === "register" ? "register" : "login"}
        email={email}
        password={password}
        confirmPassword={confirmPassword}
        registerDisplayName={registerDisplayName}
        registerGender={registerGender}
        registerProfileNote={registerProfileNote}
        registerOtpCode={registerOtpCode}
        registerOtpSendBusy={registerOtpSendBusy}
        registerOtpMessage={registerOtpMessage}
        registerOtpCooldownUntilMs={registerOtpCooldownUntilMs}
        registerOtpVerified={registerOtpVerified}
        forgotOtpCode={forgotOtpCode}
        forgotOtpSendBusy={forgotOtpSendBusy}
        forgotOtpVerifyBusy={forgotOtpVerifyBusy}
        forgotPwdResetBusy={forgotPwdResetBusy}
        forgotOtpMessage={forgotOtpMessage}
        forgotOtpCooldownUntilMs={forgotOtpCooldownUntilMs}
        forgotOtpVerified={forgotOtpVerified}
        forgotNewPassword={forgotNewPassword}
        forgotConfirmPassword={forgotConfirmPassword}
        loading={loading}
        error={error}
        onSubmit={() => void handleAuth(view !== "register")}
        onViewChange={setView}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onRegisterDisplayNameChange={setRegisterDisplayName}
        onRegisterGenderChange={setRegisterGender}
        onRegisterProfileNoteChange={setRegisterProfileNote}
        onRegisterOtpCodeChange={setRegisterOtpCode}
        onRequestRegisterOtp={() => void requestRegisterEmailOtp()}
        onForgotOtpCodeChange={setForgotOtpCode}
        onForgotNewPasswordChange={setForgotNewPassword}
        onForgotConfirmPasswordChange={setForgotConfirmPassword}
        onRequestForgotOtp={() => void requestForgotPasswordOtp()}
        onSubmitForgotPassword={() => void submitForgotPasswordReset()}
        onClearTransientState={() => {
          setError("");
          setConfirmPassword("");
          setRegisterDisplayName("");
          // setRegisterGender("");
          setRegisterProfileNote("");
        }}
      />
    );
  }

  const currentList =
    activeTab === "inbox" ? inbox : activeTab === "outbox" ? outbox : [];
  const currentMessage = currentList.find((m) => m._id === selectedMessageId);

  const liveSquareForSelected = currentMessage
    ? squarePostRows.find((p) => p.sourceMessageId === currentMessage._id)
    : undefined;

  const selectedSquarePost =
    squareSelectedPostId === null
      ? undefined
      : squarePostRows.find((p) => p.sourceMessageId === squareSelectedPostId);

  const unifiedFavoriteCount = unifiedFavoriteItems.length;

  const selectedUnifiedFavorite =
    favoriteSelectedId === null
      ? undefined
      : unifiedFavoriteItems.find((x) => x.key === favoriteSelectedId);

  const canShuffleCapsule =
    !!capsulePostId && capsuleEligiblePool.length > 0;

  const canPublishCurrentMessage =
    !!currentMessage &&
    !!myEmail &&
    (activeTab === "inbox" || activeTab === "outbox") &&
    (emailsEqual(currentMessage.senderEmail, myEmail) ||
      emailsEqual(currentMessage.recipientEmail, myEmail));

  const liveScheduledRow =
    selectedMessageId == null
      ? undefined
      : (outboxRows.find((r) => r.id === selectedMessageId) ??
        inboxRows.find((r) => r.id === selectedMessageId));

  const canUseLetterExchange =
    !!currentMessage &&
    !!myEmail &&
    (activeTab === "inbox" || activeTab === "outbox") &&
    (emailsEqual(currentMessage.senderEmail, myEmail) ||
      emailsEqual(currentMessage.recipientEmail, myEmail));

  const {
    handleFavoriteSquare,
    handleUnfavoriteSquare,
    handleFavoriteCapsuleById,
    handleUnfavoriteCapsuleById,
  } = useFavoriteHandlers({
    favoriteSelectedId,
    setFavoriteSelectedId,
    setSquareActionError,
    favoriteSquarePost,
    unfavoriteSquarePost,
    favoriteCapsule,
    unfavoriteCapsule,
    onPointsToast: emitPointsToast,
  });

  const {
    openCapsuleDrawer,
    pickAnotherCapsule,
    viewPreviousCapsule,
    canViewPreviousCapsule,
    closeCapsuleDrawer,
    jumpToChatFromCapsule,
    openSpace,
    handleDeleteCapsuleMessage,
    beginOutboxEdit,
    cancelOutboxEdit,
    saveOutboxEdit,
    confirmDeleteOutboxMessage,
  } = useMailboxInteractionHandlers({
    identity,
    activeTab,
    setActiveTab,
    setChatBackTab,
    spaceBackTab,
    setSpaceBackTab,
    setSpaceTargetInfo,
    myAccountId,
    setSpaceOwnerHex,
    setSelectedMessageId,
    setSquareSelectedPostId,
    setFavoriteSelectedId,
    setSelectedChatThreadKey,
    setSelectedAdminReportId,
    setSquareActionError,
    capsuleEligiblePool,
    capsulePostId,
    setCapsuleOpen,
    setCapsuleSwitching,
    setCapsulePostId,
    setCapsulePrivateDraft,
    setCapsuleThreadGuestHex,
    onPointsToast: emitPointsToast,
    drawCapsuleOnce,
    deleteCapsuleMessage,
    myProfile,
    currentMessage,
    outboxRows,
    squarePostRows,
    setOutboxEditForm,
    setOutboxEditOpen,
    setOutboxEditError,
    setOutboxEditLoading,
    outboxEditForm,
    setOutboxEditSaving,
    updateScheduledMessage,
    deleteScheduledMessage,
    setOutboxDeleteConfirmOpenWithStack,
    outbox,
  });

  const {
    submitPublishToSquare,
    handleUnpublishSquare,
    handleSetSquareReaction,
    handleAppendLetterExchange,
    handleAddSquareComment,
    handleAddCapsulePrivateMessage,
    handleSendChatMessage,
    resizeChatInput,
  } = useMessagingActions({
    selectedMessageId,
    setLoading,
    setSquareActionError,
    onPointsToast: emitPointsToast,
    onNoticeToast: emitNoticeToast,
    publishRepliesPublic,
    publishIncludeThread,
    publishIncludeCapsulePrivate,
    publishShowSender,
    publishShowRecipient,
    publishToSquare,
    setPublishModalOpenWithStack,
    unpublishFromSquare,
    mySquareReactionByPost,
    setSquareReaction,
    exchangeAppendDraft,
    setExchangeAppendBusy,
    appendLetterExchange,
    setExchangeAppendDraft,
    squareCommentDraft,
    addSquareComment,
    setSquareCommentDraft,
    capsulePrivateDraft,
    addCapsulePrivateMessage,
    getCapsuleThreadMessageCount: (sourceMessageId: string, threadGuestHex: string) => {
      const meHex = identity.toHexString();
      const myAid = `${myAccountId ?? ""}`.trim();
      const fromRowAid = capsulePrivateRows.find(
        (m) =>
          m.sourceMessageId === sourceMessageId &&
          m.threadGuestIdentity.toHexString() === threadGuestHex,
      );
      const rowAid = `${(fromRowAid as { threadGuestAccountId?: string } | undefined)?.threadGuestAccountId ?? ""}`.trim();
      const threadGuestAccountId =
        rowAid ||
        (threadGuestHex === meHex && myAid ? myAid : "").trim() ||
        undefined;
      const eff = resolvedEffectiveGuestHex(
        threadGuestHex,
        threadGuestAccountId,
        profileByAccountId,
      );
      return gatherCapsulePrivateGuestThreadMessagesClient(
        capsulePrivateRows,
        sourceMessageId,
        threadGuestHex,
        eff,
        threadGuestAccountId,
      ).length;
    },
    setCapsulePrivateDraft,
    isCapsuleParticipantUi,
    identity,
    jumpToChatFromCapsule,
    chatDraft,
    selectedChatThread,
    selectedChatMessageCount: selectedChatMessages.length,
    authIsWarned: auth.isWarned,
    myMuteEndAt: myMuteSanction?.endAt?.microsSinceUnixEpoch,
    setChatDraft,
    chatInputRef,
    textLimit: TEXT_LIMIT,
  });

  const {
    onAdminModeBack,
    onMobileBack,
    onSecretTab,
    onComposeTab,
    onMineTab,
    onBootstrapAdminSelf,
    onEnterAdmin,
    onMineHubNavigate,
  } = useNavigationActions({
    activeTab,
    selectedMessageId,
    squareSelectedPostId,
    favoriteSelectedId,
    selectedChatThreadKey,
    selectedAdminReportId,
    adminMobileShowContent,
    chatBackTab,
    spaceBackTab,
    isSuperAdmin: auth.isSuperAdmin,
    setActiveTab,
    setSelectedMessageId,
    setSquareSelectedPostId,
    setFavoriteSelectedId,
    setSelectedChatThreadKey,
    setSelectedAdminReportId,
    setAdminMobileShowContent,
    setChatBackTab,
    setSpaceBackTab,
    setSquareActionError,
    setComposeMode,
    setComposeError,
    setComposeSuccess,
    setProfileActionMenuOpen,
    setAdminSection,
    bootstrapAdminSelf: async () => {
      await bootstrapAdminSelf();
    },
    setSpaceOwnerHex,
    setSpaceTargetInfo: (value) => setSpaceTargetInfo(value),
    identityHex: identity.toHexString(),
  });

  const {
    onAsideBackToMine,
    clearBroadcastByScope,
    refreshAllBroadcast,
    openBroadcastMessage,
    onBroadcastKeyDown,
    dismissBroadcastItem,
  } = useAsideActions({
    activeTab,
    spaceBackTab,
    chatBackTab,
    setActiveTab,
    setSpaceBackTab,
    setChatBackTab,
    setSelectedMessageId,
    setSquareSelectedPostId,
    setFavoriteSelectedId,
    setSelectedChatThreadKey,
    setSelectedAdminReportId,
    setOpenedBroadcastItems,
  });

  // 修正後的手機版詳情頁判定邏輯
  const isMobileDetailView = computeIsMobileDetailView({
    activeTab,
    squareSelectedPostId,
    favoriteSelectedId,
    selectedChatThreadKey,
    selectedMessageId,
    selectedAdminReportId,
    adminMobileShowContent,
  });
  const sanctionTickerText = auth.isWarned
    ? `⚠️ 你已被禁言${myMuteSanction?.endAt ? `，至 ${new Date(Number(myMuteSanction.endAt.microsSinceUnixEpoch / 1000n)).toLocaleDateString("zh-TW")}` : "（永久）"}，期間無法發送聊聊訊息`
    : `⚠️ 你已收到警告：${myWarnSanction?.reasonCode || "請注意發言規範"}，請遵守社群守則`;
  const adminViewProps = createAdminViewProps({
    activeTab: activeTab as "admin" | "admin_ops",
    identity,
    auth: { isAdmin: auth.isAdmin, isSuperAdmin: auth.isSuperAdmin },
    hasAnyAdmin,
    adminActionLoading,
    activeAdminRows,
    adminReportsSorted,
    adminSection,
    canClaimOrphanSuperAdmin,
    setActiveTab,
    setAdminSection,
    setAdminMobileShowContent,
    setSelectedAdminReportId,
    adminReportFilter,
    selectedAdminReportId,
    selectedAdminReport,
    selectedAdminSnapshot,
    adminReportStatus,
    adminReportPriority,
    adminResolutionNote,
    adminActionError,
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
    pointsBalanceByAccountId,
    canEditAccountOperation:
      (String(activeAdminRoleRow?.role ?? "")
        .trim()
        .toLowerCase() === "super_admin" ||
        String(activeAdminRoleRow?.role ?? "")
          .trim()
          .toLowerCase() === "moderator") &&
      !!activeAdminRoleRow?.isActive,
    activeSanctionsForTarget,
    appealTicketRows,
    userSanctionRows,
    moderationQueueRows,
    bootstrapAdminSelf: () => void bootstrapAdminSelf(),
    recoverOrphanSuperAdmin: () => void recoverOrphanSuperAdmin(),
    setAdminReportFilter,
    setAdminReportStatus,
    setAdminReportPriority,
    setAdminResolutionNote,
    setSanctionTypeDraft,
    setSanctionReasonDraft,
    setSanctionDetailDraft,
    setAdminActionError,
    submitAdminReportUpdate: () => void submitAdminReportUpdate(),
    removeCapsuleAsAdmin,
    removeSquarePostAsAdmin,
    PRESET_REPORTER,
    PRESET_SANCTION,
    quickDismissReport: () => void quickDismissReport(),
    setSanctionBanDays,
    submitSanctionForSelectedReport: () =>
      void submitSanctionForSelectedReport(),
    setAdminGrantEmail,
    setAdminGrantRole,
    setAdminGrantActive,
    setAdminAddOpenWithStack,
    openAdminEditModal,
    setSingleAdminActive: (row, active) =>
      void setSingleAdminActive(row, active),
    removeRoleRecordAsAdmin,
    setAdminAccountSearch,
    setAdminTargetIdentityHex,
    quickBanTargetAccount: () => void quickBanTargetAccount(),
    quickUnbanTargetAccount: () => void quickUnbanTargetAccount(),
    operateAccount: async (args) => {
      await handleOperateAccount(args);
    },
    isAdminReportModalVisible,
    adminGrantEmail,
    adminGrantRole,
    adminGrantActive,
    isAdminAddModalVisible,
    isAdminEditModalVisible,
    adminEditEmail,
    adminEditRole,
    adminEditActive,
    setAdminReportModalOpenWithStack,
    submitAdminRoleUpsert,
    setAdminEditOpenWithStack,
    setAdminEditRole,
    setAdminEditActive,
    submitAdminEdit: () => void submitAdminEdit(),
    avatarCatalogRows: adminAvatarCatalogRows,
    avatarCatalogEditBusy: adminActionLoading,
    avatarCatalogError: adminActionError,
    updateAvatarCatalogItem: (args) => void updateAvatarCatalogItem(args),
    createAvatarSeriesBatch: (args) => void createAvatarSeriesBatch(args),
    deleteAvatarCatalogItem: (avatarKey) => void deleteAvatarCatalogItem(avatarKey),
    avatarSeriesOrderKeys,
    saveAvatarSeriesOrder: async (seriesKeys) => {
      await adminUpdateAvatarSeriesOrder({ seriesKeys });
    },
  });

  const composeMessageMainProps = {
    activeTab,
    composeMode,
    setComposeMode,
    setActiveTab,
    composeCapsuleType,
    setComposeCapsuleType,
    capsuleTypeMeta,
    textLimit: TEXT_LIMIT,
    sendMessage,
    loading,
    currentMessage,
    canPublishCurrentMessage,
    liveSquareForSelected,
    handleUnpublishSquare,
    setPublishModalOpenWithStack,
    canUseLetterExchange,
    squareActionError,
    liveScheduledRow,
    exchangeAppendDraft,
    setExchangeAppendDraft,
    handleAppendLetterExchange,
    exchangeAppendBusy,
    beginOutboxEdit,
    setOutboxDeleteConfirmOpenWithStack,
  };

  const capsuleOverlayProps = {
    capsuleOpen,
    closeCapsuleDrawer,
    squareActionError,
    capsuleSwitching,
    capsulePost,
    capsuleEmptyReason: capsuleEmptyReason ?? "",
    openReportModal,
    capsuleOverlayShowAuthorRealName,
    capsuleSquarePost,
    squareReactionCountsByPost,
    mySquareReactionByPost,
    handleSetSquareReaction,
    favoritedPostIds,
    capsuleBodyFavorited,
    handleUnfavoriteSquare,
    handleFavoriteSquare,
    handleUnfavoriteCapsuleById,
    handleFavoriteCapsuleById,
    now,
    capsuleTypeMeta,
    capsuleModalPrivateThreadRef,
    isCapsuleParticipantUi,
    uniqueCapsuleGuestHexes,
    capsuleThreadGuestHex,
    onSetCapsuleThreadGuestHex: setCapsuleThreadGuestHex,
    canShowCapsuleModalFirstMessageInput,
    capsuleModalPrivateTextareaRef,
    capsulePrivateDraft,
    setCapsulePrivateDraft,
    textLimit: TEXT_LIMIT,
    jumpToChatFromCapsule,
    squareCommentsByPost,
    squareCommentDraft,
    setSquareCommentDraft,
    handleAddSquareComment,
    handleAddCapsulePrivateMessage,
    pickAnotherCapsule,
    onViewPreviousCapsule: viewPreviousCapsule,
    canViewPreviousCapsule,
    canShuffleCapsule,
  };

  const topNavProps = {
    activeTab,
    isAdminModeTab: activeTab === "admin" || activeTab === "admin_ops",
    showMobileBackButton: canShowMobileBackButton(activeTab, isMobileDetailView),
    auth: { isAdmin: auth.isAdmin, isSuperAdmin: auth.isSuperAdmin },
    userDisplayName:
      user?.displayName?.trim() || user?.email?.split("@")[0] || "個人資料",
    userEmail: user?.email,
    hasAnyAdmin,
    adminActionLoading,
    onAdminModeBack,
    onMobileBack,
    onSecretTab,
    onComposeTab,
    onMineTab,
    onOpenProfileActionMenu: openProfileActionMenu,
    onBootstrapAdminSelf: () => void onBootstrapAdminSelf(),
    onEnterAdmin,
    onOpenAccountProfile: openAccountProfile,
    onOpenPasswordModal: openPasswordModal,
    onLogout: handleLogout,
  };

  const mobileBottomNavProps = {
    activeTab,
    showMineChatUnread:
      chatUnreadThreadCount > 0 ||
      inboxUnreadCount > 0 ||
      outboxUnreadCount > 0,
    onGoSecret: () => {
      setActiveTab("secret");
      setSelectedMessageId(null);
      setSquareSelectedPostId(null);
      setFavoriteSelectedId(null);
      setSelectedChatThreadKey(null);
      setChatBackTab(null);
      setSquareActionError("");
    },
    onGoCompose: () => {
      setActiveTab("new");
      setComposeMode("capsule");
      setSelectedMessageId(null);
      setSquareSelectedPostId(null);
      setFavoriteSelectedId(null);
      setComposeError("");
      setComposeSuccess("");
    },
    onGoMine: () => {
      setActiveTab("mine");
      setSelectedMessageId(null);
      setSquareSelectedPostId(null);
      setFavoriteSelectedId(null);
      setSelectedChatThreadKey(null);
      setSelectedAdminReportId(null);
      setSquareActionError("");
    },
  };

  const chatMainProps = {
    selectedChatThread,
    selectedChatPeerProfile: selectedChatPeerProfile ?? null,
    canOpenChatPeerSpace: !!selectedChatPeerProfile,
    isSourceCapsuleMine,
    onOpenChatPeerSpace: () => {
      const p = selectedChatPeerProfile;
      const t = selectedChatThread;
      if (!p || !t || !chatPeerUnlocked) return;
      openSpace(
        p.accountId,
        (p.displayName ?? "").trim() || t.counterpartLabel,
        p.gender ?? "unspecified",
        p.birthDate,
      );
    },
    chatPeerUnlocked,
    selectedChatProgress,
    selectedChatMessages,
    myAccountId,
    peerAvatarImageUrl: selectedChatPeerAvatarUrl,
    chatDraft,
    textLimit: TEXT_LIMIT,
    capsuleTypeMeta,
    onSetSelectedMessageId: setSelectedMessageId,
    onOpenPublishModal: () => setPublishModalOpenWithStack(true),
    onOpenReportModal: openReportModal,
    onOpenChatPeerProfile: () => setChatPeerProfileOpenWithStack(true),
    onResizeChatInput: resizeChatInput,
    onSendChatMessage: () => void handleSendChatMessage(),
    chatInputRef,
  };

  const handleSelectAvatar = async (avatarKey: string) => {
    setAvatarActionLoading(true);
    setAvatarActionError("");
    try {
      await setAvatarKey({ avatarKey } as any);
      setAvatarPickerOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAvatarActionError(msg || "切換頭像失敗");
    } finally {
      setAvatarActionLoading(false);
    }
  };

  const handleUnlockAvatar = async (avatarKey: string) => {
    setAvatarActionLoading(true);
    setAvatarActionError("");
    try {
      await unlockAvatarItem({ avatarKey } as any);
      const row = avatarCatalogRows.find((x: any) => String(x.avatarKey) === avatarKey);
      const cost = row ? Number(row.pricePoints || 0) : 0;
      if (cost > 0) emitPointsToast(-cost, "解鎖頭像");
      else setDailyRewardToast("已解鎖此張頭像，可點選格子套用為顯示頭像");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAvatarActionError(msg || "解鎖失敗");
      throw err;
    } finally {
      setAvatarActionLoading(false);
    }
  };

  const handleClaimDailyReward = async () => {
    if (dailyRewardStatus !== "claimable") return;
    setDailyRewardLoading(true);
    try {
      await claimNewcomerDailyPoints({} as any);
      emitPointsToast(188, "領取每日積分");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDailyRewardToast(msg || "領取失敗");
    } finally {
      setDailyRewardLoading(false);
    }
  };

  const handleOperateAccount = async (args: {
    accountId: string;
    email: string;
    displayName: string;
    gender: string;
    ageYears: number;
    pointsBalance: number;
    secretPlain: string;
  }) => {
    setAdminActionLoading(true);
    setAdminActionError("");
    try {
      await adminUpdateAccountProfileAndPoints({
        accountId: args.accountId,
        displayName: args.displayName,
        gender: args.gender,
        ageYears: Math.max(16, Math.min(126, Math.floor(args.ageYears))),
        pointsBalance: BigInt(Math.max(0, Math.floor(args.pointsBalance))),
      } as any);
      const secret = String(args.secretPlain ?? "").trim();
      if (secret) {
        await adminSetTemporaryPasswordByEmail({
          email: args.email,
          temporaryPassword: secret,
        } as any);
      }
      setDailyRewardToast(secret ? "帳號資料已更新，已設定一次性密碼" : "帳號資料已更新");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminActionError(msg || "操作帳號失敗");
      throw err;
    } finally {
      setAdminActionLoading(false);
    }
  };

  const submitForcedPasswordChange = async () => {
    const oldPassword = forcePwdOld.trim();
    const newPassword = forcePwdNew.trim();
    if (!oldPassword || !newPassword) {
      setForcePwdError("請填寫臨時密碼與新密碼");
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      setForcePwdError("新密碼長度需 6–128 字元");
      return;
    }
    if (newPassword !== forcePwdConfirm) {
      setForcePwdError("兩次新密碼不一致");
      return;
    }
    setForcePwdSaving(true);
    setForcePwdError("");
    try {
      await changePassword({ oldPassword, newPassword });
      setForcePwdOld("");
      setForcePwdNew("");
      setForcePwdConfirm("");
      setDailyRewardToast("密碼更新成功");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setForcePwdError(msg || "修改密碼失敗");
    } finally {
      setForcePwdSaving(false);
    }
  };

  const secretMainProps = {
    selectedSquarePost: selectedSquarePost ?? null,
    squareActionError,
    onSetSquareSelectedPostId: setSquareSelectedPostId,
    squareReactionCountsByPost,
    squareCommentsByPost,
    onOpenSpace: openSpace,
    onOpenCapsuleDrawer: () => void openCapsuleDrawer(),
    displayNameByEmail,
    capsulePost: capsulePost ?? null,
    now,
    mySquareReactionByPost,
    favoritedPostIds,
    myAccountId,
    onSetSquareReaction: (sourceMessageId: string, kind: "up" | "mid" | "down") =>
      void handleSetSquareReaction(sourceMessageId, kind),
    onFavoriteSquare: (sourceMessageId: string) =>
      void handleFavoriteSquare(sourceMessageId),
    onUnfavoriteSquare: (sourceMessageId: string) =>
      void handleUnfavoriteSquare(sourceMessageId),
    onUnpublishSquare: (sourceMessageId: string) =>
      void handleUnpublishSquare(sourceMessageId),
    onOpenReportModal: (targetType: "square_post", targetId: string) =>
      openReportModal(targetType, targetId),
    squareCommentDraft,
    onSetSquareCommentDraft: setSquareCommentDraft,
    onAddSquareComment: (sourceMessageId: string) =>
      void handleAddSquareComment(sourceMessageId),
  };

  const overlayModalsProps = {
    isChatPeerProfileVisible: isChatPeerProfileVisible && chatPeerUnlocked,
    selectedChatPeerProfile: chatPeerUnlocked
      ? (selectedChatPeerProfile ?? null)
      : null,
    onCloseChatPeerProfile: () => setChatPeerProfileOpenWithStack(false),
    calculateAgeFromDate,
    isOutboxDeleteConfirmVisible,
    currentMessage: currentMessage ?? null,
    activeTab,
    outboxEditLoading,
    outboxEditError,
    userEmail: user?.email,
    emailsEqual,
    onCancelOutboxDeleteConfirm: () => setOutboxDeleteConfirmOpenWithStack(false),
    onConfirmDeleteOutboxMessage: () => void confirmDeleteOutboxMessage(),
    onClearOutboxEditError: () => setOutboxEditError(""),
    isBanNoticeModalVisible,
    banNoticeInfo,
    onCloseBanNotice: () => setBanNoticeOpenWithStack(false),
    isReportModalVisible,
    reportSaving,
    reportTargetType,
    reportTargetId,
    reportReasonCode,
    reportDetail,
    reportError,
    onCloseReportModal: () => setReportModalOpenWithStack(false),
    onSetReportReasonCode: setReportReasonCode,
    onSetReportDetail: setReportDetail,
    onSubmitReport: () => void submitReport(),
  };

  const publishModalProps = {
    isPublishModalVisible,
    canRenderPublishModal: !!(currentMessage || selectedChatThread),
    isDirectMode: !!(currentMessage && currentMessage.recipientEmail),
    loading,
    publishIncludeThread,
    publishIncludeCapsulePrivate,
    publishRepliesPublic,
    publishShowSender,
    publishShowRecipient,
    onClosePublishModal: () => setPublishModalOpenWithStack(false),
    onSubmitPublishToSquare: () => void submitPublishToSquare(),
    onSetPublishIncludeThread: setPublishIncludeThread,
    onSetPublishIncludeCapsulePrivate: setPublishIncludeCapsulePrivate,
    onSetPublishRepliesPublic: setPublishRepliesPublic,
    onSetPublishShowSender: setPublishShowSender,
    onSetPublishShowRecipient: setPublishShowRecipient,
  };

  const mineSquareSecretWallCommon = {
    expanded: true,
    onToggleExpanded: () => {},
    postsVisible: squarePostsVisible,
    postsSortedLength: squarePostsSorted.length,
    selectedSquarePostId: squareSelectedPostId,
    onSelectPost: setSquareSelectedPostId,
    reactionCountsByPost: squareReactionCountsByPost,
    commentsByPost: squareCommentsByPost,
    maxListItems: 12,
    onOpenSpace: openSpace,
  };

  return (
    <>
    <div
      className={cn(
        "h-screen flex flex-col font-sans overflow-hidden ys-dreamy-cosmic text-white",
      )}
      translate="no"
    >
      {!myProfile && view === "dashboard" ? (
        <div
          key="loader"
          className="flex flex-1 items-center justify-center ys-dreamy-cosmic"
        >
          <Loader2 className="h-8 w-8 animate-spin text-[#FFD54F] mb-4" />
          <p className="text-white">正在同步時光資料...</p>
        </div>
      ) : (
        <>
          <TopNavSection {...topNavProps} />
          <div className="h-[56px] shrink-0" aria-hidden />
        </>
      )}

      <StatusBannersSection
        showProfileHint={!!(user && !user.displayName?.trim())}
        showSanctionTicker={auth.isMuted || auth.isWarned}
        isWarned={auth.isWarned}
        sanctionTickerText={sanctionTickerText}
      />

      <div className="relative flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:overflow-hidden md:pb-0">
        {/* Column 1: Message List (Product Grid Style) */}
        <aside
          className={cn(
            "w-full shrink-0 flex flex-col overflow-hidden transition-all duration-300",
            /** 與多數分頁同寬；秘密已改「左介紹、右牆＋揀膠囊」，勿再 `md:w-full` 否則主欄變 0 寬 */
            "md:w-[min(100%,18rem)] border-r",
            activeTab === "secret" || activeTab === "mine_square"
              ? "border-white/10 bg-transparent"
              : "border-white/10 bg-transparent/80 backdrop-blur-sm md:border-white/10",
            isMobileDetailView ? "hidden md:flex" : "flex",
          )}
        >
          {activeTab !== "new" &&
          (activeTab === "inbox" || activeTab === "outbox")
            ? (() => {
                const tabBroadcast = openedBroadcastItems.filter(
                  (b) => b.scope === activeTab,
                );
                if (tabBroadcast.length === 0) return null;
                return (
                  <div
                    className="shrink-0 px-2 pt-2 pb-2 space-y-1.5 border-b border-sky-300/35 bg-gradient-to-b from-sky-100/90 to-sky-50/50"
                    role="region"
                    aria-label="剛開啟播報"
                  >
                    <div className="flex items-center justify-between gap-2 px-0.5">
                      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-sky-900/85">
                        <Bell
                          className="w-3.5 h-3.5 shrink-0 text-sky-600"
                          aria-hidden
                        />
                        剛開啟
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {tabBroadcast.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => clearBroadcastByScope(activeTab)}
                            className="text-[10px] font-semibold text-sky-800/90 hover:text-sky-950 underline-offset-2 hover:underline"
                          >
                            全部收起
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={refreshAllBroadcast}
                          className="text-[10px] font-semibold text-sky-800/80 hover:text-sky-950"
                        >
                          重新整理
                        </button>
                      </div>
                    </div>
                    {tabBroadcast.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        role="button"
                        tabIndex={0}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => openBroadcastMessage(item.id)}
                        onKeyDown={(ev) => onBroadcastKeyDown(ev, item.id)}
                        className={cn(
                          "w-full cursor-pointer text-left rounded-lg border-l-[3px] border-l-sky-500 border-y border-r border-sky-200/80",
                          "bg-gradient-to-br from-white via-sky-50/80 to-sky-100/50 shadow-md shadow-sky-900/10",
                          "ring-2 ring-sky-400/45 ring-offset-1 ring-offset-sky-50/90",
                          "pl-2.5 pr-2 py-2 transition-transform active:scale-[0.99]",
                          selectedMessageId === item.id
                            ? "ring-apple-blue/40"
                            : "hover:ring-sky-500/55",
                        )}
                      >
                        <div className="flex items-stretch gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold tracking-tight text-white/95 truncate">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-sky-900/55 tabular-nums mt-0.5 truncate">
                              {item.subtitle}
                            </p>
                          </div>
                          <div className="shrink-0 flex flex-col items-center justify-center gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-gradient-to-b from-sky-200 to-sky-100 text-sky-900 ring-1 ring-sky-300/80">
                              播報
                            </span>
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                dismissBroadcastItem(item.id);
                              }}
                              className="rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white/70"
                              aria-label="收起此則播報"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()
            : null}

          <div
            className={cn(
              "overflow-y-auto min-h-0 flex-1 px-2 py-2 apple-scroll",
              activeTab === "secret" || activeTab === "mine_square"
                ? "overflow-hidden"
                : "",
            )}
          >
            {showMineHubDesktopSubNav(activeTab) ? (
              <div className="mb-2 hidden shrink-0 md:block">
                <MineHubMenuNav
                  layout="desktop"
                  activeTab={activeTab}
                  onNavigate={onMineHubNavigate}
                  squarePostsCount={squarePostsSorted.length}
                  inboxUnreadCount={inboxUnreadCount}
                  outboxUnreadCount={outboxUnreadCount}
                  chatUnreadCount={chatUnreadThreadCount}
                />
              </div>
            ) : null}
            <div
              className={cn(
                "min-h-0 flex-1",
                activeTab === "secret" || activeTab === "mine_square"
                  ? "flex flex-col h-full md:overflow-y-auto apple-scroll"
                  : "space-y-1.5 md:overflow-y-auto apple-scroll",
              )}
            >
            {(activeTab === "inbox" ||
              activeTab === "outbox" ||
              activeTab === "favorites" ||
              activeTab === "space" ||
              activeTab === "my_reports" ||
              activeTab === "mine_square" ||
              activeTab === "chat") && (
              <div className="hidden shrink-0 md:block">
                <div className="ys-mine-back-pill">
                  <button
                    type="button"
                    onClick={onAsideBackToMine}
                    className="ys-mine-back-pill__btn"
                  >
                    <ChevronRight
                      className="rotate-180"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    {activeTab === "space" && spaceBackTab === "secret"
                      ? "回到秘密"
                      : activeTab === "chat" && chatBackTab === "secret"
                        ? "回到秘密"
                        : "返回我的"}
                  </button>
                </div>
              </div>
            )}
            {activeTab === "mine" ? (
              <MineSidebarSection
                activeTab={activeTab}
                user={user}
                inboxUnreadCount={inboxUnreadCount}
                outboxUnreadCount={outboxUnreadCount}
                chatUnreadCount={chatUnreadThreadCount}
                myReportsCount={
                  reportTicketRows.filter((r) =>
                    r.reporterIdentity.isEqual(identity),
                  ).length
                }
                onOpenActions={() => void openProfileActionMenu()}
                 onOpenAvatarPicker={() => {
                   setAvatarActionError("");
                   setAvatarPickerOpen(true);
                 }}
                onEditIntro={() => void openIntroEditor()}
                onLogout={() => void handleLogout()}
                onNavigate={onMineHubNavigate}
                squarePostsCount={squarePostsSorted.length}
                availablePoints={availablePoints}
                avatarImageUrl={currentAvatarUrl}
                dailyRewardStatus={dailyRewardStatus}
                dailyRewardLoading={dailyRewardLoading}
                onClaimDailyReward={() => void handleClaimDailyReward()}
                titleLabel={formatTitleWithLevel(titleMeta)}
                titleWatermark={titleMeta.en}
                titleTone={titleMeta.tone}
              />
            ) : activeTab === "mine_square" ? (
              squareSelectedPostId ? (
                <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-2 px-1 pb-4 pt-1">
                  <SecretWallSection
                    {...mineSquareSecretWallCommon}
                    expandedBodyMaxClass="max-h-[min(56vh,26rem)] md:max-h-[min(50vh,22rem)]"
                  />
                </div>
              ) : (
                <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-2 px-1 pb-4 pt-1 md:hidden">
                  <SecretWallSection
                    {...mineSquareSecretWallCommon}
                    expandedBodyMaxClass="max-h-[min(56vh,26rem)] md:max-h-[min(50vh,22rem)]"
                  />
                </div>
              )
            ) : activeTab === "space" ? (
              <SpaceSidebarSection
                isOwnSpace={isOwnSpace}
                displayName={
                  isOwnSpace ? myProfile?.displayName : spaceTargetInfo?.displayName
                }
                avatarImageUrl={spaceOwnerAvatarUrl}
                profileGender={
                  isOwnSpace
                    ? myProfile?.gender
                    : (spaceOwnerProfile?.gender ?? spaceTargetInfo?.gender ?? spaceOwnerInfo.gender)
                }
                profileNote={spaceOwnerProfileNote}
                titleLabel={formatTitleWithLevel(spaceOwnerTitleMeta)}
                capsuleCount={spaceCapsules.length}
                squareCount={spaceSquares.length}
                availablePoints={isOwnSpace ? availablePoints : undefined}
                titleWatermark={spaceOwnerTitleMeta.en}
                titleTone={spaceOwnerTitleMeta.tone}
                watermarkText={spaceOwnerTitleMeta.en}
              />
            ) : activeTab === "admin" || activeTab === "admin_ops" ? (
              <AdminWorkbench viewProps={adminViewProps} slot="sidebar" />
            ) : activeTab === "my_reports" ? (
              <MyReportsSidebarSection
                reportTicketRows={reportTicketRows}
                adminEmailByHex={adminEmailByHex}
                myEmail={myEmail}
              />
            ) : activeTab === "chat" ? (
              <ChatThreadsSidebarSection
                threads={capsuleChatThreadsWithUnread.map((t) => ({
                  ...t,
                  avatarImageUrl: chatThreadAvatarUrlByKey.get(t.key) || "",
                }))}
                selectedKey={selectedChatThreadKey}
                onSelect={(key) => {
                  setChatBackTab(null);
                  setSelectedChatThreadKey(key);
                }}
              />
            ) : activeTab === "new" || activeTab === "direct" ? (
              <div className="glass-effect mt-2 rounded-[24px] p-5 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <PenTool className="h-5 w-5 text-[#a78bfa]" />
                </div>
                <p className="text-[15px] font-semibold tracking-tight text-white/95">
                  {activeTab === "direct" ? "定向發送" : "秘密膠囊"}
                </p>
                <p className="text-[12px] mt-2 leading-snug text-white/60">
                  定向可留空時間即時發送；秘密膠囊固定即時送出，若要貼廣場請到寄件匣詳情再公開。
                </p>
              </div>
            ) : activeTab === "secret" ? (
              <>
                {/* 手機：原左欄（抽膠囊 + 底列廣場／聊聊） */}
                <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-1 flex-col gap-3 pb-4 pt-2 md:hidden">
                  <div className="flex min-h-0 w-full flex-1 flex-col justify-center gap-3 px-1">
                    <div className="flex w-full justify-center">
                      <SecretCapsuleDrawButton
                        variant="treasure"
                        onClick={() => void openCapsuleDrawer()}
                      />
                    </div>
                    <p className="text-center text-[11px] font-black uppercase tracking-wider text-white/55">
                      抽一則秘密膠囊
                    </p>
                  </div>
                  <div className="w-full shrink-0 px-2">
                    <SecretTabFooterBar
                      chatUnreadCount={chatUnreadThreadCount}
                      onGotoSquare={() => onMineHubNavigate("mine_square")}
                      onGotoChat={onSecretSidebarOpenChat}
                    />
                  </div>
                </div>
                {/* 桌機：與「撰寫」左欄同系的介紹卡（內容在右欄） */}
                <div className="mt-2 hidden text-center md:block">
                  <div className="glass-effect rounded-[24px] p-5 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <Sparkles
                        className="h-5 w-5 text-[#FFD54F]"
                        aria-hidden
                      />
                    </div>
                    <p className="text-[15px] font-semibold tracking-tight text-white/95">
                      秘密
                    </p>
                    <p className="text-[12px] mt-2 leading-snug text-white/60">
                      在右欄揀一顆朋友膠囊。小紙條在「廣場牆」、聊聊在底列，由此跳轉即可。
                    </p>
                  </div>
                </div>
              </>
            ) : activeTab === "favorites" ? (
              <FavoritesSidebarSection
                items={unifiedFavoriteItems}
                selectedId={favoriteSelectedId}
                capsuleTypeMeta={capsuleTypeMeta}
                onSelect={setFavoriteSelectedId}
              />
            ) : currentList.length === 0 ? (
              <div className="flex min-h-[46vh] items-center justify-center px-4 py-8 text-center">
                <div>
                  <History className="mx-auto mb-3 h-9 w-9 text-white/20" />
                  <p className="text-[13px] font-medium text-white/45">
                    暫無信件
                  </p>
                </div>
              </div>
            ) : activeTab === "inbox" || activeTab === "outbox" ? (
              <MailboxGroupedList
                messages={currentList}
                scope={activeTab}
                selectedMessageId={selectedMessageId}
                onSelectMessage={setSelectedMessageId}
                currentUserEmail={user?.email}
                sealedOpen={mailboxSectionsOpen[activeTab].sealed}
                openedOpen={mailboxSectionsOpen[activeTab].opened}
                onToggleSealed={() => toggleMailboxSection(activeTab, "sealed")}
                onToggleOpened={() => toggleMailboxSection(activeTab, "opened")}
              />
            ) : null}
            </div>
          </div>
        </aside>

        {/* Column 2: Content Viewport (Hero Billboard Style) */}
        <main
          className={cn(
            "flex flex-1 flex-col overflow-hidden transition-all duration-300",
            "bg-transparent",
            !isMobileDetailView ? "hidden md:flex" : "flex",
          )}
        >
          <div
            className={cn(
              " min-h-0 flex-1 flex-col overflow-y-auto apple-scroll px-2 md:px-8 md:py-2"
            )}
          >
            {activeTab === "mine" ? (
              <div className="mx-auto hidden max-w-md flex-col items-center justify-center px-4 py-12 text-center md:flex md:flex-col">
                <p className="text-[14px] leading-relaxed text-white/50">
                  左側選一張卡片：飄向你的、你丟出的，或藏進心底的。
                </p>
              </div>
            ) : activeTab === "mine_square" && !selectedSquarePost ? (
              <div className="hidden h-full w-full min-h-0 flex-1 flex-col overflow-hidden md:flex">
                <div className="min-h-0 w-full flex-1 overflow-y-auto apple-scroll md:px-2 md:py-0 lg:px-4">
                  <div className="mx-auto w-full max-w-5xl">
                    <SecretWallSection
                      {...mineSquareSecretWallCommon}
                      expandedBodyMaxClass="max-h-[min(85vh,56rem)]"
                    />
                  </div>
                </div>
              </div>
            ) : activeTab === "space" ? (
              <SpaceMainSection
                isOwnSpace={isOwnSpace}
                spaceTargetDisplayName={spaceTargetInfo?.displayName}
                spaceFeed={spaceFeed}
                capsuleTypeMeta={capsuleTypeMeta}
                avatarImageUrl={spaceOwnerAvatarUrl}
                profileGender={
                  isOwnSpace
                    ? myProfile?.gender
                    : (spaceOwnerProfile?.gender ?? spaceTargetInfo?.gender ?? spaceOwnerInfo.gender)
                }
                profileNote={spaceOwnerProfileNote}
                titleLabel={formatTitleWithLevel(spaceOwnerTitleMeta)}
                titleWatermark={spaceOwnerTitleMeta.en}
                titleTone={spaceOwnerTitleMeta.tone}
                availablePoints={isOwnSpace ? availablePoints : undefined}
                isCapsulePublicInSpace={isCapsulePublicInSpace}
                onDeleteCapsule={(capsuleId) => void handleDeleteCapsuleMessage(capsuleId)}
                onToggleCapsuleVisibility={(capsuleId, nextPublic) =>
                  void (async () => {
                    try {
                      await setCapsuleProfileVisibility({
                        capsuleId,
                        isProfilePublic: nextPublic,
                      } as any);
                      setDailyRewardToast(
                        nextPublic
                          ? "已在空間展示這顆膠囊"
                          : "已從空間隱藏這顆膠囊",
                      );
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : String(err);
                      setSquareActionError(msg || "更新空間展示狀態失敗");
                    }
                  })()
                }
                onUnpublishSquare={(sourceMessageId) => void handleUnpublishSquare(sourceMessageId)}
                onJumpToChatFromCapsule={jumpToChatFromCapsule}
                onViewOriginalSquarePost={(sourceMessageId) => {
                  setActiveTab("secret");
                  setSquareSelectedPostId(sourceMessageId);
                }}
              />
            ) : activeTab === "admin" || activeTab === "admin_ops" ? (
              <AdminWorkbench viewProps={adminViewProps} slot="content" />
            ) : activeTab === "my_reports" ? (
              <div className="mx-auto max-w-md px-4 py-12 text-center md:flex md:flex-col md:items-center md:justify-center">
                <p className="text-[14px] font-semibold text-white/50">
                  我的舉報紀錄在左側，每張顯示審核狀態與結果。
                </p>
              </div>
            ) : activeTab === "chat" ? (
              <ChatMainSection {...chatMainProps} />
            ) : activeTab === "secret" ||
              (activeTab === "mine_square" && selectedSquarePost) ? (
              <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 h-full">
                {activeTab === "secret" && !selectedSquarePost ? (
                  <>
                    <SecretMainSection {...secretMainProps} />
                    <div className="mt-4 w-full max-w-md shrink-0 self-center sm:max-w-lg">
                      <SecretTabFooterBar
                        chatUnreadCount={chatUnreadThreadCount}
                        onGotoSquare={() => onMineHubNavigate("mine_square")}
                        onGotoChat={onSecretSidebarOpenChat}
                      />
                    </div>
                  </>
                ) : (
                  <SecretMainSection {...secretMainProps} />
                )}
              </div>
            ) : activeTab === "favorites" ? (
              <FavoritesMainSection
                selectedUnifiedFavorite={selectedUnifiedFavorite}
                onUnfavoriteSquare={(sourceMessageId) =>
                  void handleUnfavoriteSquare(sourceMessageId)
                }
                onUnfavoriteCapsuleById={(capsuleId) =>
                  void handleUnfavoriteCapsuleById(capsuleId)
                }
                onJumpToChatFromCapsule={jumpToChatFromCapsule}
                onViewSquarePost={(sourceMessageId) => {
                  setActiveTab("secret");
                  setSquareSelectedPostId(sourceMessageId);
                }}
              />
            ) : (
              <ComposeMessageMainSection {...composeMessageMainProps} />
            )}
          </div>
        </main>
      </div>

      <OverlayModalsSection {...overlayModalsProps} />

      <PublishModalSection {...publishModalProps} />

      <CapsuleOverlaySection {...capsuleOverlayProps} />

      <ProfileActionMenuSection
        open={profileActionMenuOpen}
        hasAnyAdmin={hasAnyAdmin}
        adminActionLoading={adminActionLoading}
        isAdmin={auth.isAdmin}
        isSuperAdmin={auth.isSuperAdmin}
        onClose={() => setProfileActionMenuOpen(false)}
        onBootstrapAdminSelf={() => {
          setProfileActionMenuOpen(false);
          return bootstrapAdminSelf();
        }}
        onEnterAdmin={() => {
          setProfileActionMenuOpen(false);
          setActiveTab(auth.isSuperAdmin ? "admin_ops" : "admin");
          setAdminSection("main");
        }}
        onOpenProfile={() => {
          setProfileActionMenuOpen(false);
          void openProfileModal();
        }}
        onOpenAvatarPicker={() => {
          setProfileActionMenuOpen(false);
          setAvatarActionError("");
          setAvatarPickerOpen(true);
        }}
        onOpenPassword={() => {
          openPasswordModal();
        }}
        onLogout={() => {
          setProfileActionMenuOpen(false);
          handleLogout();
        }}
      />

      <AccountModalsSection
        user={user}
        isIntroEditModalVisible={isIntroEditModalVisible}
        introEditSaving={introEditSaving}
        introEditDraft={introEditDraft}
        introEditError={introEditError}
        onCloseIntroEdit={() => setIntroEditOpenWithStack(false)}
        onSetIntroEditDraft={setIntroEditDraft}
        onSubmitIntroEdit={() => void submitIntroEdit()}
        isPasswordModalVisible={isPasswordModalVisible}
        passwordSaving={passwordSaving}
        passwordOld={passwordOld}
        passwordNew={passwordNew}
        passwordConfirm={passwordConfirm}
        passwordError={passwordError}
        onClosePasswordModal={() => setPasswordModalOpenWithStack(false)}
        onSetPasswordOld={setPasswordOld}
        onSetPasswordNew={setPasswordNew}
        onSetPasswordConfirm={setPasswordConfirm}
        onSubmitPasswordChange={() => void submitPasswordChange()}
      />

      <AvatarPickerModalSection
        open={avatarPickerOpen}
        currentAvatarKey={currentAvatarKey}
        availablePoints={availablePoints}
        catalogRows={avatarCatalogRows.filter(
          (row) => row.isPublished || unlockedAvatarKeySet.has(row.avatarKey),
        )}
        unlockedKeys={unlockedAvatarKeySet}
        unlockLoading={avatarActionLoading}
        actionError={avatarActionError}
        seriesOrderKeys={avatarSeriesOrderKeys}
        onClose={() => setAvatarPickerOpen(false)}
        onSelectAvatar={(avatarKey) => void handleSelectAvatar(avatarKey)}
        onUnlockAvatar={(avatarKey) => void handleUnlockAvatar(avatarKey)}
      />

      <ProfileModalSection
        user={user}
        isProfileModalVisible={isProfileModalVisible}
        profileSaving={profileSaving}
        profileError={profileError}
        profileForm={profileForm}
        ageGateGender={ageGateGender}
        birthYear={birthYear}
        birthMonth={birthMonth}
        birthDay={birthDay}
        yearOptions={yearOptions}
        monthOptions={monthOptions}
        dayOptions={dayOptions}
        calculateAgeFromDate={calculateAgeFromDate}
        WheelPickerComponent={WheelPicker}
        onCloseProfileModal={() => setProfileModalOpenWithStack(false)}
        onSubmitProfile={(e) => void submitProfile(e)}
        onSetProfileForm={setProfileForm}
        onSetAgeGateGender={setAgeGateGender}
        onSetBirthYear={setBirthYear}
        onSetBirthMonth={setBirthMonth}
        onSetBirthDay={setBirthDay}
      />
      <AgeGateModalSection
        open={needsAgeGate}
        ageGateGender={ageGateGender}
        calculatedAge={calculatedAge}
        yearOptions={yearOptions}
        monthOptions={monthOptions}
        dayOptions={dayOptions}
        birthYear={birthYear}
        birthMonth={birthMonth}
        birthDay={birthDay}
        ageGateError={ageGateError}
        ageGateSaving={ageGateSaving}
        WheelPickerComponent={WheelPicker}
        onSetAgeGateGender={setAgeGateGender}
        onSetBirthYear={setBirthYear}
        onSetBirthMonth={setBirthMonth}
        onSetBirthDay={setBirthDay}
        onSubmitAgeGate={() => void submitAgeGate()}
      />
      <AdminWorkbench viewProps={adminViewProps} slot="modals" />

      {mustForcePasswordReset ? (
        <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/55 p-4">
          <div className="cd-modal-panel w-full max-w-md p-4">
            <p className="text-[16px] font-bold text-white">安全提醒：請立即更新密碼</p>
            <p className="mt-1 text-[12px] text-white/70">
              你正在使用一次性密碼登入，必須先修改密碼才能繼續使用。
            </p>
            <div className="mt-3 space-y-2">
              <input
                type="password"
                value={forcePwdOld}
                onChange={(e) => setForcePwdOld(e.target.value)}
                placeholder="臨時密碼"
                className="cd-field text-[13px]"
                disabled={forcePwdSaving}
                autoComplete="current-password"
              />
              <input
                type="password"
                value={forcePwdNew}
                onChange={(e) => setForcePwdNew(e.target.value)}
                placeholder="新密碼（6-128 字元）"
                className="cd-field text-[13px]"
                disabled={forcePwdSaving}
                autoComplete="new-password"
              />
              <input
                type="password"
                value={forcePwdConfirm}
                onChange={(e) => setForcePwdConfirm(e.target.value)}
                placeholder="確認新密碼"
                className="cd-field text-[13px]"
                disabled={forcePwdSaving}
                autoComplete="new-password"
              />
              {forcePwdError ? (
                <p className="text-[12px] font-semibold text-red-300">{forcePwdError}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="cd-btn-primary mt-4 w-full py-2 text-[13px] font-bold disabled:opacity-60"
              disabled={forcePwdSaving}
              onClick={() => void submitForcedPasswordChange()}
            >
              {forcePwdSaving ? "更新中…" : "更新密碼"}
            </button>
          </div>
        </div>
      ) : null}

      {dailyRewardToast ? (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[260] -translate-x-1/2 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[12px] font-semibold text-white shadow-lg">
          {dailyRewardToast}
        </div>
      ) : null}

    </div>

    <MobileBottomNavSection {...mobileBottomNavProps} />
    </>
  );
}
