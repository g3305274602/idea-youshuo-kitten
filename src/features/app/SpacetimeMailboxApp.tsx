/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from "react";
import { useEffect, useRef, useMemo } from "react";
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
  Plus,
  Activity,
  Mars, // 男
  Venus, // 女
  Asterisk, // 其他
} from "lucide-react";
import { tables, reducers } from "../../module_bindings";
import type {
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
import { AgeGateModalSection } from "./sections/AgeGateModalSection";
import { TopNavSection } from "./sections/TopNavSection";
import { StatusBannersSection } from "./sections/StatusBannersSection";
import { SpaceMainSection } from "./sections/SpaceMainSection";
import { SpaceSidebarSection } from "./sections/SpaceSidebarSection";
import { MyReportsSidebarSection } from "./sections/MyReportsSidebarSection";
import { ChatThreadsSidebarSection } from "./sections/ChatThreadsSidebarSection";
import { FavoritesSidebarSection } from "./sections/FavoritesSidebarSection";
import { MineSidebarSection } from "./sections/MineSidebarSection";
import { ChatMainSection } from "./sections/ChatMainSection";
import { SecretMainSection } from "./sections/SecretMainSection";
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
import { useAccountFlowHandlers } from "./hooks/useAccountFlowHandlers";
import { useMailboxInteractionHandlers } from "./hooks/useMailboxInteractionHandlers";
import { useFavoriteHandlers } from "./hooks/useFavoriteHandlers";
import { useMessagingActions } from "./hooks/useMessagingActions";
import { useNavigationActions } from "./hooks/useNavigationActions";
import { useAsideActions } from "./hooks/useAsideActions";
import {
  AdminWorkbench,
  createAdminViewProps,
} from "../admin/AdminWorkbench";
import {
  useAdminWorkbenchRuntime,
  useAdminWorkbenchState,
} from "../admin/useAdminWorkbench";
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
export default function SpacetimeMailboxApp({
  identity,
}: {
  identity: Identity;
}) {
  useEffect(() => {
    // 改為每 10 秒更新一次，足以應付倒數計時顯示
    const id = window.setInterval(() => setNowTick(Date.now()), 10000);
    return () => window.clearInterval(id);
  }, []);

  const registerAccount = useReducer(reducers.registerAccount);
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
    secretWallExpanded,
    setSecretWallExpanded,
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

    // 情況 C：有 Token 但沒資料（可能是刷新），才需要顯示「連線中」等同步
    const timeout = setTimeout(() => {
      if (!myProfile) {
        setView("login");
        setIsBooting(false);
      }
    }, 1200); // 縮短等待時間到 1.2 秒

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

  const {
    adminRoleRows,
    reportTicketRows,
    reportSnapshotRows,
    moderationQueueRows,
    appealTicketRows,
    userSanctionRows,
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
    adminEditRole,
    adminEditActive,
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

  // 定義符合 16-126 歲限制的年份清單
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const latestBirthYear = currentYear - 16; // 16 歲對應的出生年份 (例如 2010)
    const earliestBirthYear = currentYear - 126; // 126 歲對應的出生年份 (例如 1900)
    const totalYears = latestBirthYear - earliestBirthYear + 1; // 總共 111 個選項

    // 從最新的可選年份 (latestBirthYear) 往回推
    return Array.from({ length: totalYears }, (_, i) => latestBirthYear - i);
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
          }
        : null,
    [myProfile],
  );

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

  const needsAgeGate =
    view === "dashboard" &&
    !!myProfile &&
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
    if (activeTab !== "secret") return;
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
    for (const row of capsuleFavoriteRows) s.add(row.capsuleId);
    for (const row of squareFavoriteRows) s.add(row.postSourceMessageId);
    for (const row of capsulePrivateRows) {
      if (row.threadGuestIdentity.isEqual(identity)) s.add(row.sourceMessageId);
    }
    return s;
  }, [capsuleFavoriteRows, squareFavoriteRows, capsulePrivateRows, identity]);

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
      capsuleMessagesVisible.filter(
        (m) =>
          !m.authorIdentity.isEqual(identity) &&
          !capsuleIdsExcludedFromDraw.has(m.id),
      ),
    [capsuleMessagesVisible, identity, capsuleIdsExcludedFromDraw],
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
    const others = capsuleMessagesVisible.filter(
      (m) => !m.authorIdentity.isEqual(identity),
    );
    if (others.length === 0) return "only_self" as const;
    if (capsuleEligiblePool.length === 0) return "all_saved" as const;
    return null;
  }, [
    capsuleMessagesVisible,
    capsuleMessageRows,
    identity,
    capsuleEligiblePool,
    capsuleStateById,
  ]);

  const currentSpaceOwnerHex = spaceOwnerHex ?? identity.toHexString();
  // 修改判定方式：優先看 accountId 是否匹配
  const isOwnSpace = useMemo(() => {
    if (!spaceTargetInfo) return true; // 預設進去是自己
    return spaceTargetInfo.accountId === myAccountId;
  }, [spaceTargetInfo, myAccountId]);
  const spaceOwnerProfile = profileByIdentityHex.get(currentSpaceOwnerHex);

  // 1. 過濾膠囊
  const spaceCapsules = useMemo(() => {
    // --- 关键点：改用稳定的 AccountId 而不是会变的 Identity ---
    const targetAccountId = isOwnSpace
      ? myAccountId // 自己的空间，用当前登录的账户 ID
      : spaceTargetInfo?.accountId; // 别人的空间，从空间信息里拿

    if (!targetAccountId) return [];

    return (
      [...capsuleMessageRows]
        .filter((m) => !isCapsuleDeleted(m.id))
        // --- 关键修改：使用 authorAccountId 进行比对 ---
        .filter((m) => m.authorAccountId === targetAccountId)
        .filter((m) => {
          // 自己的空间显示所有；别人的空间只显示公开且已到期的
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
    myAccountId, // 依赖稳定的账户 ID
  ]);

  // 2. 過濾廣場貼文
  const spaceSquares = useMemo(() => {
    const targetAccountId = isOwnSpace
      ? myAccountId
      : spaceTargetInfo?.accountId;
    if (!targetAccountId) return [];

    const sourceRows = isOwnSpace ? squarePostsSorted : squarePostsVisible;

    return sourceRows
      .filter((p) => p.publisherAccountId === targetAccountId) // 使用 accountId
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
        name: firstItem.capsule.authorDisplayName || "神秘用戶",
        gender: firstItem.capsule.authorGender,
        birthDate: firstItem.capsule.authorBirthDate,
      };
    }
    if (firstItem?.kind === "square") {
      return {
        name: firstItem.post.snapshotPublisherName || "神秘用戶",
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

  const {
    handleAuth,
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
        await sendDirectMessage({
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
        });
        setComposeSuccess(
          scheduledAt ? "定向訊息已排程送出。" : "定向訊息已即時送出。",
        );
      } else {
        await sendCapsuleMessage({
          content,
          capsuleType: composeCapsuleType,
          scheduledAt,
          isWaitListVisible,
          isProfilePublic: false,
          publishToSquare: false,
          squareRepliesPublic: false,
          squareIncludeThread: false,
          squareIncludeCapsulePrivate: false,
          squareShowSender: false,
          squareShowRecipient: false,
        });
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
      : !capsuleOpen && activeTab === "secret" && squareSelectedPostId !== null
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
    const s = new Set<string>();
    for (const m of capsulePrivateForActiveUi) {
      s.add(m.threadGuestIdentity.toHexString());
    }
    return [...s];
  }, [capsulePrivateForActiveUi]);

  const capsulePrivateThreadMessages = useMemo(() => {
    if (!capsuleThreadGuestHex) return [];
    const gid = Identity.fromString(capsuleThreadGuestHex);
    return capsulePrivateForActiveUi
      .filter((m) => m.threadGuestIdentity.isEqual(gid))
      .sort((a, b) =>
        Number(
          a.createdAt.microsSinceUnixEpoch - b.createdAt.microsSinceUnixEpoch,
        ),
      );
  }, [capsulePrivateForActiveUi, capsuleThreadGuestHex]);

  const hasMyGuestThreadOnCurrentCapsule = useMemo(() => {
    if (!capsuleUiPostId) return false;
    const meHex = identity.toHexString();
    return capsulePrivateRows.some(
      (m) =>
        m.sourceMessageId === capsuleUiPostId &&
        m.threadGuestIdentity.toHexString() === meHex,
    );
  }, [capsuleUiPostId, capsulePrivateRows, identity]);

  const canShowCapsuleModalFirstMessageInput =
    !isCapsuleParticipantUi && !hasMyGuestThreadOnCurrentCapsule;

  const capsuleChatThreads = useMemo((): CapsuleChatThreadSummary[] => {
    const summaries = new Map<string, CapsuleChatThreadSummary>();

    for (const m of capsulePrivateRows) {
      const guestHex = m.threadGuestIdentity.toHexString();
      const key = `${m.sourceMessageId}::${guestHex}`;
      const existing = summaries.get(key);

      const content = (m.body ?? "").trim();
      const preview =
        content.length > 42 ? `${content.slice(0, 42)}…` : content;

      // 找到來源物件 (優先從膠囊表找，再從廣場表找)
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

      // 判斷我是誰：我是「抽膠囊的人(訪客)」還是「發膠囊的人(作者)」
      const isMeGuest = guestHex === identity.toHexString();

      // --- 急速方案：對方的資料全部從快照拿 ---
      let counterpartLabel = "未知用戶";
      let counterpartGender = "unspecified";
      let counterpartBirthDate = undefined;
      let counterpartIdentityHex = "";

      if (isMeGuest) {
        // 如果我是訪客，對方就是作者
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
      } else {
        // 如果我是作者，對方就是訪客
        // 註：目前的後端私訊表尚未加上訪客快照，所以作者看訪客依然優先用 profileByIdentityHex 查，查不到則顯示縮寫
        const gProfile = profileByIdentityHex.get(guestHex);
        counterpartLabel =
          gProfile?.displayName || `訪客 ${guestHex.slice(0, 8)}…`;
        counterpartGender = gProfile?.gender || "unspecified";
        counterpartBirthDate = gProfile?.birthDate;
        counterpartIdentityHex = guestHex;
      }

      const row: CapsuleChatThreadSummary = {
        key,
        sourceMessageId: m.sourceMessageId,
        threadGuestHex: guestHex,
        counterpartLabel,
        counterpartIdentityHex,
        counterpartGender,
        counterpartBirthDate,
        sourcePreview,
        sourceCapsuleType: sourceCapsule?.capsuleType ?? 4,
        lastBody: preview || "（尚無內容）",
        lastAtMicros: m.createdAt.microsSinceUnixEpoch,
      };

      if (!existing || existing.lastAtMicros < row.lastAtMicros) {
        summaries.set(key, row);
      }
    }

    return [...summaries.values()].sort((a, b) =>
      Number(b.lastAtMicros - a.lastAtMicros),
    );
  }, [
    capsulePrivateRows,
    squarePostRows,
    capsuleMessageRows,
    identity,
    profileByIdentityHex,
  ]);

  const selectedChatThread = useMemo(() => {
    if (!selectedChatThreadKey) return null;
    return (
      capsuleChatThreads.find((t) => t.key === selectedChatThreadKey) ?? null
    );
  }, [capsuleChatThreads, selectedChatThreadKey]);

  const selectedChatMessages = useMemo(() => {
    if (!selectedChatThread) return [];
    const guestId = Identity.fromString(selectedChatThread.threadGuestHex);
    return capsulePrivateRows
      .filter(
        (m) =>
          m.sourceMessageId === selectedChatThread.sourceMessageId &&
          m.threadGuestIdentity.isEqual(guestId),
      )
      .sort((a, b) =>
        Number(
          a.createdAt.microsSinceUnixEpoch - b.createdAt.microsSinceUnixEpoch,
        ),
      );
  }, [capsulePrivateRows, selectedChatThread]);
  const selectedChatProgress = Math.min(10, selectedChatMessages.length);
  const chatPeerUnlocked = selectedChatProgress >= 10;
  const selectedChatPeerProfile = selectedChatThread
    ? profileByIdentityHex.get(selectedChatThread.counterpartIdentityHex)
    : undefined;

  useEffect(() => {
    if (activeTab !== "chat") return;
    if (capsuleChatThreads.length === 0) {
      setSelectedChatThreadKey(null);
      setSelectedAdminReportId(null);
      return;
    }
    setSelectedChatThreadKey((prev) =>
      prev && capsuleChatThreads.some((t) => t.key === prev) ? prev : null,
    );
  }, [activeTab, capsuleChatThreads]);

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
      const guests = new Set<string>();
      for (const m of capsulePrivateRows) {
        if (m.sourceMessageId !== capsuleUiPostId) continue;
        guests.add(m.threadGuestIdentity.toHexString());
      }
      const guestList = [...guests];
      setCapsuleThreadGuestHex((prev) =>
        prev && guests.has(prev) ? prev : (guestList[0] ?? null),
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
  ]);

  /** 必須放在 login/register early return 之前，否則違反 Hooks 規則 */
  const unifiedFavoriteItems = useMemo((): UnifiedFavoriteListItem[] => {
    const squareItems: UnifiedFavoriteListItem[] = squareFavoriteRows.map(
      (f) => ({
        kind: "square",
        key: `sq:${f.id}`,
        createdAtMicros: f.createdAt.microsSinceUnixEpoch,
        row: f,
      }),
    );
    const capsuleItems: UnifiedFavoriteListItem[] = capsuleFavoriteRows.map(
      (f) => ({
        kind: "capsule",
        key: `cap:${f.id}`,
        createdAtMicros: f.createdAt.microsSinceUnixEpoch,
        row: f,
      }),
    );
    return [...squareItems, ...capsuleItems].sort((a, b) =>
      Number(b.createdAtMicros - a.createdAtMicros),
    );
  }, [squareFavoriteRows, capsuleFavoriteRows]);

  useEffect(() => {
    if (!favoriteSelectedId) return;
    if (!unifiedFavoriteItems.some((x) => x.key === favoriteSelectedId)) {
      setFavoriteSelectedId(null);
    }
  }, [favoriteSelectedId, unifiedFavoriteItems]);
  if (isBooting) {
    return (
      <div
        key="bootloader"
        className="flex h-screen w-full flex-col items-center justify-center bg-[#2a5e59] text-white"
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#f4dc3a] mb-4" />
        <p className="text-[14px] font-bold">正在連線至時空數據庫...</p>
      </div>
    );
  }
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
        loading={loading}
        error={error}
        onSubmit={() => void handleAuth(view === "login")}
        onViewChange={setView}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onRegisterDisplayNameChange={setRegisterDisplayName}
        onRegisterGenderChange={setRegisterGender}
        onRegisterProfileNoteChange={setRegisterProfileNote}
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
    !!capsulePostId &&
    capsuleEligiblePool.filter((p) => p.id !== capsulePostId).length > 0;

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
  });

  const {
    openCapsuleDrawer,
    pickAnotherCapsule,
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
    setCapsulePrivateDraft,
    isCapsuleParticipantUi,
    identity,
    jumpToChatFromCapsule,
    chatDraft,
    selectedChatThread,
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
    identityHex: identity.toHexString(),
  });

  const {
    onAsideBackToMine,
    clearBroadcastByScope,
    refreshAllBroadcast,
    openBroadcastMessage,
    onBroadcastKeyDown,
    dismissBroadcastItem,
    onSpacePanelBack,
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
    adminAccountSearch,
    adminSearchRows,
    adminTargetIdentityHex,
    selectedAdminTargetProfile,
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
    openSpace,
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
    capsulePrivateThreadMessages,
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
    onGoSecret: () => {
      setActiveTab("secret");
      setSelectedMessageId(null);
      setSquareSelectedPostId(null);
      setFavoriteSelectedId(null);
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
    chatPeerUnlocked,
    selectedChatProgress,
    selectedChatMessages,
    myAccountId,
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

  const secretMainProps = {
    selectedSquarePost: selectedSquarePost ?? null,
    squareActionError,
    secretWallExpanded,
    onSetSecretWallExpanded: setSecretWallExpanded,
    squarePostsVisible,
    squarePostsSortedLength: squarePostsSorted.length,
    squareSelectedPostId,
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
    isChatPeerProfileVisible,
    selectedChatPeerProfile: selectedChatPeerProfile ?? null,
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

  const isMineThemeTab =
    activeTab === "mine" ||
    activeTab === "inbox" ||
    activeTab === "outbox" ||
    activeTab === "favorites" ||
    activeTab === "space" ||
    activeTab === "chat" ||
    activeTab === "my_reports";

  return (
    <div
      className={cn(
        "h-screen flex flex-col font-sans overflow-hidden",
        isMineThemeTab
          ? "ys-app-mine-theme text-white"
          : "bg-[#2a5e59] text-white md:bg-[#F5F5F7] md:text-apple-near-black",
      )}
      translate="no"
    >
      {!myProfile && view === "dashboard" ? (
        <div
          key="loader"
          className="flex flex-1 items-center justify-center bg-[#2a5e59]"
        >
          <Loader2 className="h-8 w-8 animate-spin text-[#f4dc3a] mb-4" />
          <p className="text-white">正在同步時光資料...</p>
        </div>
      ) : (
        <>
          <TopNavSection {...topNavProps} />
        </>
      )}

      <StatusBannersSection
        showProfileHint={!!(user && !user.displayName?.trim())}
        showSanctionTicker={auth.isMuted || auth.isWarned}
        isWarned={auth.isWarned}
        sanctionTickerText={sanctionTickerText}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Column 1: Message List (Product Grid Style) */}
        <aside
          className={cn(
            "w-full shrink-0 flex flex-col overflow-hidden transition-all duration-300",
            activeTab === "secret" && squareSelectedPostId === null
              ? "md:w-full border-r-0"
              : "md:w-[min(100%,18rem)] border-r",
            activeTab === "secret"
              ? "border-stone-900/50 bg-[#2a5e59]"
              : "border-stone-900/30 bg-[#2a5e59]/90 md:border-black/[0.05]",
            isMineThemeTab &&
              "border-r-0 border-[#3f798d]/50 bg-transparent md:border-r-0 md:bg-transparent",
            isMobileDetailView ? "hidden md:flex" : "flex",
          )}
        >
          {!auth.isAdmin &&
            (activeTab === "inbox" ||
              activeTab === "outbox" ||
              activeTab === "favorites" ||
              activeTab === "space" ||
              activeTab === "my_reports" ||
              activeTab === "chat") && (
              <button
                type="button"
                onClick={onAsideBackToMine}
                className="hidden md:flex w-full items-center gap-1 rounded-xl border border-white/25 bg-white/10 px-2.5 py-1.5 text-left text-[12px] font-semibold text-white/95 transition-colors hover:bg-white/15 md:border-violet-200/60 md:bg-white/80 md:text-violet-800 md:hover:bg-violet-50/90"
              >
                <ChevronRight
                  className="h-4 w-4 shrink-0 rotate-180 opacity-70"
                  aria-hidden
                />
                {activeTab === "space" && spaceBackTab === "secret"
                  ? "回到秘密"
                  : "回到我的"}
              </button>
            )}

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
                            <p className="text-[13px] font-semibold tracking-tight text-apple-near-black truncate">
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
                              className="rounded p-0.5 text-black/35 hover:bg-black/[0.06] hover:text-black/55"
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
              "flex-1 px-2 py-2",
              activeTab === "secret"
                ? "flex min-h-0 flex-1 flex-col overflow-y-auto apple-scroll"
                : "space-y-1.5 overflow-y-auto apple-scroll",
            )}
          >
            {activeTab === "mine" ? (
              <MineSidebarSection
                user={user}
                inboxCount={inbox.length}
                outboxCount={outbox.length}
                favoriteCount={unifiedFavoriteCount}
                chatCount={capsuleChatThreads.length}
                myReportsCount={
                  reportTicketRows.filter((r) =>
                    r.reporterIdentity.isEqual(identity),
                  ).length
                }
                onOpenActions={() => void openProfileActionMenu()}
                onEditIntro={() => void openIntroEditor()}
                onLogout={() => void handleLogout()}
                onNavigate={onMineHubNavigate}
              />
            ) : // --- 這裡開始替換 Aside 裡的空間邏輯 ---
            activeTab === "space" ? (
              <SpaceSidebarSection
                isOwnSpace={isOwnSpace}
                displayName={
                  isOwnSpace ? myProfile?.displayName : spaceTargetInfo?.displayName
                }
                capsuleCount={spaceCapsules.length}
                squareCount={spaceSquares.length}
                onBack={onSpacePanelBack}
              />
            ) : // --- 這裡結束替換 Aside 邏輯 ---
            activeTab === "admin" || activeTab === "admin_ops" ? (
              <AdminWorkbench viewProps={adminViewProps} slot="sidebar" />
            ) : activeTab === "my_reports" ? (
              <MyReportsSidebarSection
                reportTicketRows={reportTicketRows}
                adminEmailByHex={adminEmailByHex}
                myEmail={myEmail}
              />
            ) : activeTab === "chat" ? (
              <ChatThreadsSidebarSection
                threads={capsuleChatThreads}
                selectedKey={selectedChatThreadKey}
                capsuleTypeMeta={capsuleTypeMeta}
                onSelect={(key) => {
                  setChatBackTab(null);
                  setSelectedChatThreadKey(key);
                }}
              />
            ) : activeTab === "new" || activeTab === "direct" ? (
              <div className="p-5 text-center mt-2 bg-white rounded-2xl border border-black/[0.04] shadow-sm">
                <div className="w-10 h-10 bg-apple-blue/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <PenTool className="w-5 h-5 text-apple-blue" />
                </div>
                <p className="text-[15px] font-semibold tracking-tight text-apple-near-black">
                  {activeTab === "direct" ? "定向發送" : "秘密膠囊"}
                </p>
                <p className="text-[12px] text-black/45 mt-2 leading-snug">
                  定向可留空時間即時發送；秘密膠囊固定即時送出，若要貼廣場請到寄件匣詳情再公開。
                </p>
              </div>
            ) : activeTab === "secret" ? (
              <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center gap-3 pb-8 pt-2">
                <div
                  className={cn(
                    "flex flex-1 w-full flex-col items-center justify-center gap-3 px-1",
                    secretWallExpanded
                      ? "shrink-0 border-b border-stone-900/25 pb-3 pt-1"
                      : "min-h-0 flex-1 justify-center",
                  )}
                >
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
                <div className="w-full shrink-0 px-2 md:px-0">
                  <SecretWallSection
                    expanded={secretWallExpanded}
                    onToggleExpanded={() => setSecretWallExpanded((v) => !v)}
                    expandedBodyMaxClass="max-h-[min(35vh,18rem)] md:max-h-[min(28vh,12rem)]"
                    postsVisible={squarePostsVisible}
                    postsSortedLength={squarePostsSorted.length}
                    selectedSquarePostId={squareSelectedPostId}
                    onSelectPost={setSquareSelectedPostId}
                    reactionCountsByPost={squareReactionCountsByPost}
                    commentsByPost={squareCommentsByPost}
                    maxListItems={12}
                    onOpenSpace={openSpace}
                  />
                </div>
              </div>
            ) : activeTab === "favorites" ? (
              <FavoritesSidebarSection
                items={unifiedFavoriteItems}
                selectedId={favoriteSelectedId}
                capsuleTypeMeta={capsuleTypeMeta}
                onSelect={setFavoriteSelectedId}
              />
            ) : currentList.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <History className="mx-auto mb-3 h-9 w-9 text-white/15 md:text-black/[0.08]" />
                <p className="text-[13px] font-medium text-white/50 md:text-black/30">
                  暫無信件
                </p>
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
        </aside>

        {/* Column 2: Content Viewport (Hero Billboard Style) */}
        <main
          className={cn(
            "flex flex-1 flex-col overflow-hidden transition-all duration-300",
            "bg-[#2a5e59]",
            // activeTab === "secret" ? "md:bg-[#2a5e59]" : "md:bg-[#2a5e59]",
            !isMobileDetailView ? "hidden md:flex" : "flex",
          )}
        >
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-y-auto apple-scroll px-4 py-6 md:px-8 md:py-8",
              activeTab === "new" || activeTab === "direct"
                ? "justify-start"
                : activeTab === "secret" && !selectedSquarePost
                  ? "justify-start"
                  : "justify-start md:justify-center",
            )}
          >
            {activeTab === "mine" ? (
              <div className="mx-auto hidden max-w-md flex-col items-center justify-center px-4 py-12 text-center md:flex md:flex-col">
                <p className="text-[14px] leading-relaxed text-black/45">
                  左側選一張卡片：飄向你的、你丟出的，或藏進心底的。
                </p>
              </div>
            ) : activeTab === "space" ? (
              <SpaceMainSection
                isOwnSpace={isOwnSpace}
                spaceTargetDisplayName={spaceTargetInfo?.displayName}
                spaceFeed={spaceFeed}
                capsuleTypeMeta={capsuleTypeMeta}
                onDeleteCapsule={(capsuleId) => void handleDeleteCapsuleMessage(capsuleId)}
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
                <p className="text-[14px] font-semibold text-black/45">
                  我的舉報紀錄在左側，每張顯示審核狀態與結果。
                </p>
              </div>
            ) : activeTab === "chat" ? (
              <ChatMainSection {...chatMainProps} />
            ) : activeTab === "secret" ? (
              <SecretMainSection {...secretMainProps} />
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

      <MobileBottomNavSection {...mobileBottomNavProps} />

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

    </div>
  );
}
