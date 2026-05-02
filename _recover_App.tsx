/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Inbox,
  Lock,
  LogOut,
  User,
  History,
  Clock,
  ChevronRight,
  ChevronDown,
  PenTool,
  Loader2,
  X,
  Pencil,
  Trash2,
  Bell,
  MessageCircle,
  Heart,
  Bookmark,
  LayoutGrid,
  ThumbsUp,
  ThumbsDown,
  Minus,
  MessagesSquare,
  Sparkles,
  Package,
  LayoutDashboard,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { tables, reducers } from "./module_bindings";
import type {
  CapsulePrivateMessage,
  CapsuleMessage,
  CapsuleFavorite,
  ScheduledMessage,
  SquareComment,
  SquareFavorite,
  SquarePost,
} from "./module_bindings/types";
import { useSpacetimeDB, useTable, useReducer } from "spacetimedb/react";
import { Identity, Timestamp } from "spacetimedb";
import { cn, emailsEqual } from "./lib/utils";

// --- Types ---

interface User {
  id: string;
  email: string;
  displayName: string;
  gender: string;
  ageYears: number;
  profileNote: string;
}

interface Message {
  _id: string;
  senderEmail: string;
  recipientEmail?: string;
  content: string | null;
  scheduledAt: string;
  isDue: boolean;
  isWaitListVisible: boolean;
  createdAt: string;
}

type SquareReactionKind = "up" | "mid" | "down";

/** 瀏覽期間剛解封：側欄播報一則（格式近「已開啟」列表） */
type OpenedBroadcastItem = {
  id: string;
  scope: "inbox" | "outbox";
  title: string;
  subtitle: string;
};

type CapsuleChatThreadSummary = {
  key: string;
  sourceMessageId: string;
  threadGuestHex: string;
  counterpartLabel: string;
  counterpartIdentityHex: string;
  sourcePreview: string;
  sourceCapsuleType: number;
  lastBody: string;
  lastAtMicros: bigint;
};

type SpaceFeedItem =
  | {
      kind: "capsule";
      key: string;
      micros: bigint;
      capsule: CapsuleMessage;
    }
  | {
      kind: "square";
      key: string;
      micros: bigint;
      post: SquarePost;
    };

type UnifiedFavoriteListItem =
  | {
      kind: "square";
      key: string;
      createdAtMicros: bigint;
      row: SquareFavorite;
    }
  | {
      kind: "capsule";
      key: string;
      createdAtMicros: bigint;
      row: CapsuleFavorite;
    };

function openedBroadcastFromMessage(
  m: Message,
  scope: "inbox" | "outbox",
  userEmail?: string,
): OpenedBroadcastItem {
  const openShort =
    m.createdAt != null
      ? new Date(m.createdAt).toLocaleString("zh-TW", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date(m.scheduledAt).toLocaleString("zh-TW", {
          month: "numeric",
          day: "numeric",
        });
  if (scope === "inbox") {
    const self =
      emailsEqual(m.senderEmail, userEmail) &&
      emailsEqual(m.recipientEmail, userEmail);
    const title = self
      ? "致未來的自己"
      : `來自 ${m.senderEmail?.split("@")[0] ?? "寄件人"}`;
    return {
      id: m._id,
      scope,
      title,
      subtitle: `剛到開啟時間 · 開啟 ${openShort}`,
    };
  }
  const title = emailsEqual(m.recipientEmail, userEmail)
    ? "致未來的自己"
    : `致 ${m.recipientEmail?.split("@")[0] ?? "收件人"}`;
  return {
    id: m._id,
    scope,
    title,
    subtitle: `剛到開啟時間 · 開啟 ${openShort}`,
  };
}

/** ISO（含 Z）轉成 `datetime-local` 用的本地字串 */
function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function scheduledRowToMessage(
  row: ScheduledMessage,
  opts: { now: Date; viewerEmail: string; isSender: boolean },
): Message {
  const isDue = row.scheduledAt.toDate() <= opts.now;
  return {
    _id: row.id,
    senderEmail: row.senderEmail,
    recipientEmail: row.recipientEmail,
    content: opts.isSender ? row.content : isDue ? row.content : null,
    scheduledAt: row.scheduledAt.toISOString(),
    isDue,
    isWaitListVisible: row.isWaitListVisible,
    createdAt: row.createdAt.toISOString(),
  };
}

/** 廣場／收藏列表上的寄件→收件一行；可隱藏其中一端 */
function squareAddressSubtitle(
  showSender: boolean,
  showRecipient: boolean,
  senderEmail: string,
  recipientEmail: string,
  opts?: { sourceKind?: string; senderDisplayName?: string },
): string | null {
  if (opts?.sourceKind === "capsule") {
    const nick = (opts.senderDisplayName ?? "").trim();
    return nick || senderEmail || null;
  }
  const s = showSender ? senderEmail : "";
  const r = showRecipient ? recipientEmail : "";
  if (!s && !r) return null;
  if (s && r) return `${s} → ${r}`;
  if (s) return `FROM ${s}`;
  return `TO ${r}`;
}

// --- Components ---

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference <= 0) return "已開啟";

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      let parts = [];
      if (days > 0) parts.push(`${days}天`);
      if (hours > 0) parts.push(`${hours}小時`);
      if (minutes > 0) parts.push(`${minutes}分`);
      parts.push(`${seconds}秒`);

      return parts.join(" ");
    };

    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    setTimeLeft(calculateTimeLeft());
    return () => clearInterval(timer);
  }, [targetDate]);

  return <span>{timeLeft}</span>;
}

const AUTH_HOST =
  import.meta.env.VITE_SPACETIMEDB_HOST ??
  (import.meta.env.DEV
    ? "ws://localhost:3000"
    : "wss://maincloud.spacetimedb.com");
const AUTH_DB = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? "idea-jd2zx";
const SPACETIME_TOKEN_KEY = `${AUTH_HOST}/${AUTH_DB}/auth_token`;
/** 膠囊「上一則」避免重複抽到（跨同一瀏覽器分頁關閉再開仍參考） */
const CAPSULE_LAST_SHOWN_KEY = "youshuo_capsule_last_shown_id";
const TEXT_LIMIT = 300;
const CAPSULE_TYPE_OPTIONS = [
  { type: 1, label: "求助" },
  { type: 2, label: "吐槽" },
  { type: 3, label: "戀愛" },
  { type: 4, label: "閒聊" },
  { type: 5, label: "樹洞" },
  { type: 6, label: "分享" },
  { type: 7, label: "職場" },
  { type: 8, label: "治癒" },
  { type: 9, label: "八卦" },
  { type: 10, label: "建議" },
] as const;
const CAPSULE_TYPE_THEME: Record<number, string> = {
  1: "border-sky-300 bg-sky-100 text-sky-800",
  2: "border-amber-300 bg-amber-100 text-amber-800",
  3: "border-pink-300 bg-pink-100 text-pink-700",
  4: "border-violet-300 bg-violet-100 text-violet-800",
  5: "border-slate-300 bg-slate-200 text-slate-800",
  6: "border-emerald-300 bg-emerald-100 text-emerald-800",
  7: "border-orange-300 bg-orange-100 text-orange-800",
  8: "border-teal-300 bg-teal-100 text-teal-800",
  9: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800",
  10: "border-indigo-300 bg-indigo-100 text-indigo-800",
};
const CAPSULE_TYPE_ACTIVE_THEME: Record<number, string> = {
  1: "border-sky-500 bg-sky-600 text-white",
  2: "border-amber-500 bg-amber-500 text-white",
  3: "border-pink-500 bg-pink-500 text-white",
  4: "border-violet-500 bg-violet-600 text-white",
  5: "border-slate-500 bg-slate-600 text-white",
  6: "border-emerald-500 bg-emerald-600 text-white",
  7: "border-orange-500 bg-orange-500 text-white",
  8: "border-teal-500 bg-teal-600 text-white",
  9: "border-fuchsia-500 bg-fuchsia-600 text-white",
  10: "border-indigo-500 bg-indigo-600 text-white",
};
function capsuleTypeMeta(type: number | undefined) {
  const normalized = type ?? 4;
  const option =
    CAPSULE_TYPE_OPTIONS.find((x) => x.type === normalized) ??
    CAPSULE_TYPE_OPTIONS[3]!;
  return {
    ...option,
    chipClass: CAPSULE_TYPE_THEME[option.type] ?? CAPSULE_TYPE_THEME[4],
    activeChipClass:
      CAPSULE_TYPE_ACTIVE_THEME[option.type] ?? CAPSULE_TYPE_ACTIVE_THEME[4],
  };
}

function SpacetimeMailboxApp({ identity }: { identity: Identity }) {
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
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

  const [view, setView] = useState<"login" | "register" | "dashboard">("login");
  const [activeTab, setActiveTab] = useState<
    | "secret"
    | "new"
    | "direct"
    | "mine"
    | "inbox"
    | "outbox"
    | "favorites"
    | "chat"
    | "space"
    | "admin"
    | "admin_ops"
    | "my_reports"
  >("secret");
  const [spaceOwnerHex, setSpaceOwnerHex] = useState<string | null>(null);
  /** 秘密膠囊：點開後一次一則，可換一則（排除自己、已收藏、與當前則） */
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const [capsulePostId, setCapsulePostId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [squareSelectedPostId, setSquareSelectedPostId] = useState<
    string | null
  >(null);
  /** 秘密分頁：廣場牆列表是否展開（預設收合；收合時上方膠囊區變高並置中） */
  const [secretWallExpanded, setSecretWallExpanded] = useState(false);
  const [favoriteSelectedId, setFavoriteSelectedId] = useState<string | null>(
    null,
  );
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  /** 廣場快照是否併入雙方往來摘錄 */
  const [publishIncludeThread, setPublishIncludeThread] = useState(false);
  /** 廣場快照是否併入膠囊私訊摘錄 */
  const [publishIncludeCapsulePrivate, setPublishIncludeCapsulePrivate] =
    useState(false);
  /** true = 開放廣場留言；false = 僅讚／踩／中立與收藏 */
  const [publishRepliesPublic, setPublishRepliesPublic] = useState(false);
  const [squareCommentDraft, setSquareCommentDraft] = useState("");
  /** 膠囊私訊輸入（與廣場評論分開） */
  const [capsulePrivateDraft, setCapsulePrivateDraft] = useState("");
  /** 目前回覆的訪客線（Identity hex）；訪客為自己，寄件／收件選一條訪客線 */
  const [capsuleThreadGuestHex, setCapsuleThreadGuestHex] = useState<
    string | null
  >(null);
  const [capsuleSwitching, setCapsuleSwitching] = useState(false);
  /** 我的 > 聊聊記錄：目前選中的聊天線 key（sourceMessageId::guestHex） */
  const [selectedChatThreadKey, setSelectedChatThreadKey] = useState<
    string | null
  >(null);
  /** 由膠囊彈窗跳轉到聊聊時，記錄來源分頁供返回 */
  const [chatBackTab, setChatBackTab] = useState<
    | "secret"
    | "new"
    | "direct"
    | "mine"
    | "inbox"
    | "outbox"
    | "favorites"
    | "chat"
    | "space"
    | "admin"
    | "admin_ops"
    | "my_reports"
    | null
  >(null);

  /** 進入個人空間前記錄來源分頁 */
  const [spaceBackTab, setSpaceBackTab] = useState<
    | "secret"
    | "new"
    | "direct"
    | "mine"
    | "inbox"
    | "outbox"
    | "favorites"
    | "chat"
    | "space"
    | "admin"
    | "admin_ops"
    | "my_reports"
    | null
  >(null);

  const [chatDraft, setChatDraft] = useState("");
  const [chatPeerProfileOpen, setChatPeerProfileOpen] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [squareActionError, setSquareActionError] = useState("");
  /** 撰寫：是否同步廣場與兩軸選項（卡片式，非隱藏勾選） */
  const [composeSyncSquare, setComposeSyncSquare] = useState(false);
  /** true = 僅公開主文；false = 主文＋往來摘錄 */
  const [composeMainOnly, setComposeMainOnly] = useState(true);
  /** 同步貼牆時，快照是否併入膠囊私訊摘錄 */
  const [composeIncludeCapsulePrivate, setComposeIncludeCapsulePrivate] =
    useState(false);
  const [composeCommentsEnabled, setComposeCommentsEnabled] = useState(false);
  /** 廣場是否顯示寄件／收件信箱 */
  const [composeShowSquareSender, setComposeShowSquareSender] = useState(true);
  const [composeShowSquareRecipient, setComposeShowSquareRecipient] =
    useState(true);
  /** 信件內補寫雙方往來 */
  const [exchangeAppendDraft, setExchangeAppendDraft] = useState("");
  const [exchangeAppendBusy, setExchangeAppendBusy] = useState(false);
  const [publishShowSender, setPublishShowSender] = useState(true);
  const [publishShowRecipient, setPublishShowRecipient] = useState(true);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileActionMenuOpen, setProfileActionMenuOpen] = useState(false);
  const [introEditOpen, setIntroEditOpen] = useState(false);
  const [introEditDraft, setIntroEditDraft] = useState("");
  const [introEditSaving, setIntroEditSaving] = useState(false);
  const [introEditError, setIntroEditError] = useState("");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordOld, setPasswordOld] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    gender: "unspecified",
    ageYears: "",
    profileNote: "",
  });
  const [profileError, setProfileError] = useState("");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerDisplayName, setRegisterDisplayName] = useState("");
  const [registerGender, setRegisterGender] = useState("");
  const [registerProfileNote, setRegisterProfileNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [composeError, setComposeError] = useState("");
  const [composeSuccess, setComposeSuccess] = useState("");
  const [composeMode, setComposeMode] = useState<"capsule" | "direct">(
    "capsule",
  );
  const [composeCapsuleType, setComposeCapsuleType] = useState<number>(4);
  const [ageGateYears, setAgeGateYears] = useState<string>("16");
  const [ageGateSaving, setAgeGateSaving] = useState(false);
  const [ageGateError, setAgeGateError] = useState("");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetType, setReportTargetType] = useState<
    "capsule" | "square_post" | "chat_thread" | "chat_account"
  >("capsule");
  const [reportTargetId, setReportTargetId] = useState("");
  const [reportReasonCode, setReportReasonCode] = useState("abuse");
  const [banNoticeOpen, setBanNoticeOpen] = useState(false);
  const [banNoticeInfo, setBanNoticeInfo] = useState<{
    endAt: string;
    reason: string;
  } | null>(null);
  const [sanctionBanDays, setSanctionBanDays] = useState<number | "permanent">(
    7,
  );
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
  const [reportDetail, setReportDetail] = useState("");
  const [reportSaving, setReportSaving] = useState(false);
  const [reportError, setReportError] = useState("");
  const [selectedAdminReportId, setSelectedAdminReportId] = useState<
    string | null
  >(null);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminActionError, setAdminActionError] = useState("");
  const [adminReportStatus, setAdminReportStatus] = useState("in_review");
  const [adminReportPriority, setAdminReportPriority] = useState<number>(2);
  const [adminResolutionNote, setAdminResolutionNote] = useState("");
  const [sanctionTypeDraft, setSanctionTypeDraft] = useState<
    "mute" | "ban" | "warn" | "limit"
  >("warn");
  const [sanctionReasonDraft, setSanctionReasonDraft] =
    useState("report_violation");
  const [sanctionDetailDraft, setSanctionDetailDraft] = useState("");
  const [adminGrantEmail, setAdminGrantEmail] = useState("");
  const [adminGrantRole, setAdminGrantRole] = useState("moderator");
  const [adminGrantActive, setAdminGrantActive] = useState(true);
  const [adminEditOpen, setAdminEditOpen] = useState(false);
  const [adminEditIdentityHex, setAdminEditIdentityHex] = useState("");
  const [adminEditEmail, setAdminEditEmail] = useState("");
  const [adminEditRole, setAdminEditRole] = useState("moderator");
  const [adminEditActive, setAdminEditActive] = useState(true);
  const [adminAddOpen, setAdminAddOpen] = useState(false);
  const [adminReportModalOpen, setAdminReportModalOpen] = useState(false);
  const [adminReportFilter, setAdminReportFilter] = useState<
    "pending" | "resolved"
  >("pending");
  const [adminSection, setAdminSection] = useState<
    "main" | "review" | "reports"
  >("main");
  const [adminAccountSearch, setAdminAccountSearch] = useState("");
  const [adminTargetIdentityHex, setAdminTargetIdentityHex] = useState("");
  const [adminMobileShowContent, setAdminMobileShowContent] = useState(false);
  /** 剛解封播報（側欄卡片）；輪詢無新開啟時清空，或點選／收起單則 */
  const [openedBroadcastItems, setOpenedBroadcastItems] = useState<
    OpenedBroadcastItem[]
  >([]);
  /** 已寄出：未到開啟時間之訊息編輯 */
  const [outboxEditOpen, setOutboxEditOpen] = useState(false);
  const [outboxEditLoading, setOutboxEditLoading] = useState(false);
  const [outboxEditSaving, setOutboxEditSaving] = useState(false);
  const [outboxEditError, setOutboxEditError] = useState("");
  const [outboxEditForm, setOutboxEditForm] = useState<{
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
  } | null>(null);
  /** 已寄出刪除：自訂二次確認對話框 */
  const [outboxDeleteConfirmOpen, setOutboxDeleteConfirmOpen] = useState(false);

  /** 左欄「封存中／已開啟」區塊是否展開（收件／寄件各自記憶） */
  const [mailboxSectionsOpen, setMailboxSectionsOpen] = useState<{
    inbox: { sealed: boolean; opened: boolean };
    outbox: { sealed: boolean; opened: boolean };
  }>({
    inbox: { sealed: true, opened: true },
    outbox: { sealed: true, opened: true },
  });

  const toggleMailboxSection = (
    tab: "inbox" | "outbox",
    key: "sealed" | "opened",
  ) => {
    setMailboxSectionsOpen((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [key]: !prev[tab][key] },
    }));
  };

  const [profiles] = useTable(
    tables.accountProfile.where((r) => r.ownerIdentity.eq(identity)),
  );
  const [allProfiles] = useTable(tables.accountProfile);
  const myProfile = profiles[0];
  const myEmail = myProfile?.email;
  const displayNameByEmail = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allProfiles) {
      const em = p.email.trim().toLowerCase();
      if (!em) continue;
      const dn = p.displayName.trim();
      if (dn) m.set(em, dn);
    }
    return m;
  }, [allProfiles]);
  const profileByIdentityHex = useMemo(() => {
    const m = new Map<string, (typeof allProfiles)[number]>();
    for (const p of allProfiles) {
      m.set(p.ownerIdentity.toHexString(), p);
    }
    return m;
  }, [allProfiles]);
  const selectedAdminTargetProfile = adminTargetIdentityHex
    ? (profileByIdentityHex.get(adminTargetIdentityHex) ?? null)
    : null;
  const user: User | null = myProfile
    ? {
        id: myProfile.email,
        email: myProfile.email,
        displayName: myProfile.displayName,
        gender: myProfile.gender,
        ageYears: Number(myProfile.ageYears),
        profileNote: myProfile.profileNote,
      }
    : null;
  const needsAgeGate =
    view === "dashboard" &&
    !!myProfile &&
    (!Number.isFinite(Number(myProfile.ageYears)) ||
      Number(myProfile.ageYears) < 16 ||
      Number(myProfile.ageYears) > 126);

  const inboxQueryEmail = myEmail ?? "__nologin__";
  const [inboxRows] = useTable(
    tables.scheduledMessage.where((r) => r.recipientEmail.eq(inboxQueryEmail)),
  );

  const [outboxRows] = useTable(
    myEmail
      ? tables.scheduledMessage.where((r) => r.senderEmail.eq(myEmail))
      : tables.scheduledMessage.where((r) => r.id.eq("")),
  );

  const now = new Date(nowTick);
  const inbox = useMemo(() => {
    const viewer = myEmail ?? "";
    return [...inboxRows]
      .filter((row) => {
        if (!viewer) return false;
        if (!emailsEqual(row.recipientEmail, viewer)) return false;
        const due = row.scheduledAt.toDate() <= now;
        if (due) return true;
        return row.isWaitListVisible;
      })
      .map((row) =>
        scheduledRowToMessage(row, {
          now,
          viewerEmail: viewer,
          isSender: false,
        }),
      )
      .sort(compareMessagesRecentFirst);
  }, [inboxRows, now, myEmail]);

  const outbox = useMemo(
    () =>
      [...outboxRows]
        .map((row) =>
          scheduledRowToMessage(row, {
            now,
            viewerEmail: myEmail ?? "",
            isSender: true,
          }),
        )
        .sort(compareMessagesRecentFirst),
    [outboxRows, now, myEmail],
  );

  const [squarePostRows] = useTable(tables.squarePost);
  const [capsuleMessageRows] = useTable(tables.capsuleMessage);
  const [capsuleMessageSpaceStateRows] = useTable(
    tables.capsuleMessageSpaceState,
  );
  const [adminRoleRows] = useTable(tables.adminRole);
  const [adminAuditLogRows] = useTable(tables.adminAuditLog);
  const [reportTicketRows] = useTable(tables.reportTicket);
  const [reportSnapshotRows] = useTable(tables.reportTargetSnapshot);
  const [moderationQueueRows] = useTable(tables.moderationQueue);
  const [appealTicketRows] = useTable(tables.appealTicket);
  const [userSanctionRows] = useTable(tables.userSanction);
  const activeSanctionsForTarget = useMemo(
    () =>
      adminTargetIdentityHex
        ? userSanctionRows
            .filter(
              (s) =>
                s.targetIdentity.toHexString() === adminTargetIdentityHex &&
                s.status === "active",
            )
            .sort((a, b) =>
              Number(
                b.updatedAt.microsSinceUnixEpoch -
                  a.updatedAt.microsSinceUnixEpoch,
              ),
            )
        : [],
    [adminTargetIdentityHex, userSanctionRows],
  );
  const [squareReactionRows] = useTable(tables.squareReaction);
  const [squareCommentRows] = useTable(tables.squareComment);
  const [capsulePrivateRows] = useTable(tables.capsule_private_for_me);
  const [squareFavoriteRows] = useTable(
    tables.squareFavorite.where((r) => r.collectorIdentity.eq(identity)),
  );
  const [capsuleFavoriteRows] = useTable(
    tables.capsuleFavorite.where((r) => r.collectorIdentity.eq(identity)),
  );
  const activeAdminRows = useMemo(
    () => adminRoleRows.filter((r) => r.isActive),
    [adminRoleRows],
  );
  const inactiveAdminRows = useMemo(
    () => adminRoleRows.filter((r) => !r.isActive),
    [adminRoleRows],
  );
  /** identity hex → email：優先用 ownerIdentity 反查，fallback 用 audit log detail 第三段（set_admin_role 存入的 email） */
  const adminEmailByHex = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allProfiles) {
      m.set(p.ownerIdentity.toHexString(), p.email);
    }
    for (const log of adminAuditLogRows) {
      if (log.actionType !== "set_admin_role") continue;
      if (m.has(log.targetId)) continue;
      const parts = (log.detail ?? "").split(":");
      const email = parts.slice(2).join(":").trim();
      if (email && email.includes("@")) {
        m.set(log.targetId, email);
      }
    }
    return m;
  }, [allProfiles, adminAuditLogRows]);
  const adminSearchRows = useMemo(() => {
    const activeAdminSet = new Set(
      activeAdminRows.map((r) => r.adminIdentity.toHexString()),
    );
    const candidates = allProfiles.filter(
      (p) => !activeAdminSet.has(p.ownerIdentity.toHexString()),
    );
    const q = adminAccountSearch.trim().toLowerCase();
    if (!q) return candidates.slice(0, 40);
    return candidates
      .filter((p) => {
        const hx = p.ownerIdentity.toHexString().toLowerCase();
        return (
          p.displayName.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          hx.includes(q)
        );
      })
      .slice(0, 40);
  }, [allProfiles, adminAccountSearch, activeAdminRows]);
  const hasAnyAdmin = activeAdminRows.length > 0;
  const myAdminRole = useMemo(() => {
    if (!myEmail) return null;
    // 找出權限表中，對應的 Email 是我目前登入 Email 的那一列
    return (
      activeAdminRows.find((r) => {
        const roleEmail = adminEmailByHex.get(r.adminIdentity.toHexString());
        return emailsEqual(roleEmail, myEmail);
      }) ?? null
    );
  }, [activeAdminRows, myEmail, adminEmailByHex]);
  const isAdmin = !!myAdminRole;
  const isSuperAdmin = myAdminRole?.role === "super_admin";
  const now2 = Date.now();
  const myActiveSanctions = useMemo(() => {
    if (!myProfile) return [];
    return userSanctionRows.filter((s) => {
      const targetEmail = adminEmailByHex.get(s.targetIdentity.toHexString());
      return (
        (s.targetIdentity.isEqual(identity) ||
          emailsEqual(targetEmail, myEmail)) &&
        s.status === "active" &&
        (!s.endAt || Number(s.endAt.microsSinceUnixEpoch / 1000n) > now2)
      );
    });
  }, [userSanctionRows, identity, myProfile, now2]);
  const myMuteSanction = useMemo(
    () => myActiveSanctions.find((s) => s.sanctionType === "mute") ?? null,
    [myActiveSanctions],
  );
  const myWarnSanction = useMemo(
    () => myActiveSanctions.find((s) => s.sanctionType === "warn") ?? null,
    [myActiveSanctions],
  );
  const isMuted = !!myMuteSanction;
  const isWarned = !isMuted && !!myWarnSanction;
  const profileByEmail = useMemo(() => {
    const m = new Map<string, (typeof allProfiles)[number]>();
    for (const p of allProfiles) {
      m.set((p.email ?? "").trim().toLowerCase(), p);
    }
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
  const adminRoleLabel: Record<string, string> = {
    super_admin: "超級管理員",
    moderator: "管理員",
    reviewer: "審核員",
  };
  const adminReportsSorted = useMemo(
    () =>
      [...reportTicketRows].sort((a, b) =>
        Number(
          b.updatedAt.microsSinceUnixEpoch - a.updatedAt.microsSinceUnixEpoch,
        ),
      ),
    [reportTicketRows],
  );
  const selectedAdminReport =
    selectedAdminReportId == null
      ? null
      : (adminReportsSorted.find((r) => r.id === selectedAdminReportId) ??
        null);
  const selectedAdminSnapshot = selectedAdminReport
    ? (reportSnapshotRows.find((s) => s.reportId === selectedAdminReport.id) ??
      null)
    : null;

  const squarePostsSorted = useMemo(
    () =>
      [...squarePostRows].sort((a, b) =>
        Number(
          b.createdAt.microsSinceUnixEpoch - a.createdAt.microsSinceUnixEpoch,
        ),
      ),
    [squarePostRows],
  );

  /** 未到預定開啟時間的信不顯示在廣場列表（避免提前曝光） */
  const squarePostsVisible = useMemo(
    () =>
      squarePostsSorted.filter((p) => p.snapshotScheduledAt.toDate() <= now),
    [squarePostsSorted, now],
  );
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

  const superOpsStats = useMemo(() => {
    const aliveCapsules = capsuleMessageRows.filter(
      (m) => !isCapsuleDeleted(m.id),
    ).length;
    const reportsNonResolved = reportTicketRows.filter(
      (r) => String(r.status ?? "").toLowerCase() !== "resolved",
    ).length;
    return {
      profiles: allProfiles.length,
      capsules: aliveCapsules,
      squarePosts: squarePostRows.length,
      reportsNonResolved,
      sanctionsActive: userSanctionRows.filter((s) => s.status === "active")
        .length,
      appeals: appealTicketRows.length,
      modQueue: moderationQueueRows.length,
      admins: activeAdminRows.length,
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
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === "admin" || activeTab === "admin_ops") return;
    setActiveTab(isSuperAdmin ? "admin_ops" : "admin");
  }, [activeTab, isAdmin, isSuperAdmin]);
  useEffect(() => {
    if (!isAdmin || isSuperAdmin) return;
    if (activeTab === "admin_ops") setActiveTab("admin");
  }, [activeTab, isAdmin, isSuperAdmin]);
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
  const isOwnSpace = currentSpaceOwnerHex === identity.toHexString();
  const spaceOwnerProfile = profileByIdentityHex.get(currentSpaceOwnerHex);
  const spaceOwnerName =
    spaceOwnerProfile?.displayName?.trim() ||
    `用戶 ${currentSpaceOwnerHex.slice(0, 10)}…`;
  const spaceCapsules = useMemo(() => {
    return [...capsuleMessageRows]
      .filter((m) => !isCapsuleDeleted(m.id))
      .filter((m) => m.authorIdentity.toHexString() === currentSpaceOwnerHex)
      .filter((m) => (isOwnSpace ? true : isCapsulePublicInSpace(m.id)))
      .filter((m) => (isOwnSpace ? true : m.scheduledAt.toDate() <= now))
      .sort((a, b) =>
        Number(
          b.createdAt.microsSinceUnixEpoch - a.createdAt.microsSinceUnixEpoch,
        ),
      );
  }, [
    capsuleMessageRows,
    currentSpaceOwnerHex,
    isOwnSpace,
    now,
    capsuleStateById,
  ]);
  const spaceSquares = useMemo(() => {
    const sourceRows = isOwnSpace ? squarePostsSorted : squarePostsVisible;
    return sourceRows
      .filter((p) => p.publisherIdentity.toHexString() === currentSpaceOwnerHex)
      .sort((a, b) =>
        Number(
          b.createdAt.microsSinceUnixEpoch - a.createdAt.microsSinceUnixEpoch,
        ),
      );
  }, [isOwnSpace, squarePostsSorted, squarePostsVisible, currentSpaceOwnerHex]);
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
    return out;
  }, [spaceCapsules, spaceSquares]);

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

  useEffect(() => {
    if (!myProfile) {
      mailboxInitialPickDoneRef.current = false;
      return;
    }
    setView("dashboard");

    const prevSnap = lastMailboxSnapshotRef.current;
    const prevDueById = new Map<string, boolean>();
    for (const m of prevSnap.inbox) prevDueById.set(m._id, m.isDue);
    for (const m of prevSnap.outbox) prevDueById.set(m._id, m.isDue);

    const ue = user?.email;
    const newBroadcast: OpenedBroadcastItem[] = [];
    if (prevDueById.size > 0) {
      const seen = new Set<string>();
      for (const m of inbox) {
        if (!m.isDue || seen.has(m._id)) continue;
        seen.add(m._id);
        if (prevDueById.get(m._id) === false) {
          newBroadcast.push(openedBroadcastFromMessage(m, "inbox", ue));
        }
      }
      for (const m of outbox) {
        if (!m.isDue || seen.has(m._id)) continue;
        seen.add(m._id);
        if (prevDueById.get(m._id) === false) {
          newBroadcast.push(openedBroadcastFromMessage(m, "outbox", ue));
        }
      }
    }
    if (newBroadcast.length > 0) {
      setOpenedBroadcastItems((prev) => {
        const map = new Map(prev.map((x) => [x.id, x]));
        for (const n of newBroadcast) map.set(n.id, n);
        return [...map.values()];
      });
      setMailboxSectionsOpen((prev) => {
        const scopes = new Set(newBroadcast.map((b) => b.scope));
        let next = { ...prev };
        if (scopes.has("inbox")) {
          next = { ...next, inbox: { ...next.inbox, opened: true } };
        }
        if (scopes.has("outbox")) {
          next = { ...next, outbox: { ...next.outbox, opened: true } };
        }
        return next;
      });
    }

    lastMailboxSnapshotRef.current = { inbox, outbox };
  }, [myProfile, inbox, outbox, user?.email]);

  useEffect(() => {
    if (!myProfile || view !== "dashboard") return;
    if (activeTab !== "inbox") return;
    setSelectedMessageId((sel) => {
      if (mailboxInitialPickDoneRef.current) return sel;
      mailboxInitialPickDoneRef.current = true;
      return sel ?? inbox[0]?._id ?? null;
    });
  }, [myProfile, view, inbox, activeTab]);

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
    setOutboxDeleteConfirmOpen(false);
  }, [selectedMessageId, activeTab]);

  const handleAuth = async (isLogin: boolean) => {
    if (!isLogin && password !== confirmPassword) {
      setError("兩次輸入的密碼不一致");
      return;
    }
    if (!isLogin) {
      const dn = registerDisplayName.trim();
      if (!dn) {
        setError("請填寫暱稱");
        return;
      }
      if (!registerGender) {
        setError("請選擇性別");
        return;
      }
    }
    setLoading(true);
    setError("");
    try {
      if (isLogin) {
        await loginAccount({ email, password });
        setView("dashboard");
      } else {
        await registerAccount({
          email,
          password,
          displayName: registerDisplayName.trim(),
          gender: registerGender,
          ageYears: undefined,
          profileNote: registerProfileNote.trim(),
        });
        setView("login");
        setError("註冊成功，請登入");
        setPassword("");
        setConfirmPassword("");
        return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("BAN:")) {
        const parts = msg.split(":");
        const endAt = parts[1] ?? "永久";
        const reason = parts.slice(2).join(":") || "違反社群規範";
        setBanNoticeInfo({ endAt, reason });
        setBanNoticeOpen(true);
      } else {
        setError(msg || "操作失敗");
      }
    } finally {
      setLoading(false);
    }
  };

  const openProfileModal = () => {
    if (!user) return;
    setProfileForm({
      displayName: user.displayName,
      gender: user.gender || "unspecified",
      ageYears: user.ageYears > 0 ? String(user.ageYears) : "",
      profileNote: user.profileNote,
    });
    setProfileError("");
    setProfileModalOpen(true);
  };

  const openProfileActionMenu = () => {
    setProfileActionMenuOpen(true);
  };

  const openIntroEditor = () => {
    if (!user) return;
    setIntroEditDraft(user.profileNote ?? "");
    setIntroEditError("");
    setIntroEditOpen(true);
  };

  const submitProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const age = parseInt(profileForm.ageYears, 10);
    if (!profileForm.displayName.trim()) {
      setProfileError("請填寫暱稱");
      return;
    }
    if (!profileForm.gender) {
      setProfileError("請選擇性別");
      return;
    }
    if (!Number.isFinite(age) || age < 16 || age > 126) {
      setProfileError("請填寫有效年齡（16–126）");
      return;
    }
    setProfileSaving(true);
    setProfileError("");
    try {
      await updateAccountProfile({
        displayName: profileForm.displayName.trim(),
        gender: profileForm.gender,
        ageYears: age,
        profileNote: profileForm.profileNote.trim(),
      });
      setProfileModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setProfileError(msg || "儲存失敗");
    } finally {
      setProfileSaving(false);
    }
  };

  const submitIntroEdit = async () => {
    if (!user) return;
    const note = introEditDraft.trim();
    if (note.length < 10 || note.length > 400) {
      setIntroEditError("自我介紹需 10–400 字");
      return;
    }
    setIntroEditSaving(true);
    setIntroEditError("");
    try {
      await updateAccountProfile({
        displayName: user.displayName,
        gender: user.gender || "unspecified",
        ageYears: user.ageYears,
        profileNote: note,
      });
      setIntroEditOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setIntroEditError(msg || "更新自我介紹失敗");
    } finally {
      setIntroEditSaving(false);
    }
  };

  const submitPasswordChange = async () => {
    const oldPassword = passwordOld;
    const newPassword = passwordNew;
    if (!oldPassword || !newPassword) {
      setPasswordError("請填寫舊密碼與新密碼");
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      setPasswordError("新密碼長度需 6–128 字元");
      return;
    }
    if (newPassword !== passwordConfirm) {
      setPasswordError("兩次新密碼不一致");
      return;
    }
    setPasswordSaving(true);
    setPasswordError("");
    try {
      await changePassword({ oldPassword, newPassword });
      setPasswordModalOpen(false);
      setPasswordOld("");
      setPasswordNew("");
      setPasswordConfirm("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPasswordError(msg || "修改秘密失敗");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = () => {
    mailboxInitialPickDoneRef.current = false;
    setOpenedBroadcastItems([]);
    setOutboxEditOpen(false);
    setOutboxEditForm(null);
    setOutboxEditError("");
    setOutboxDeleteConfirmOpen(false);
    setCapsuleOpen(false);
    setCapsulePostId(null);
    setView("login");
    localStorage.removeItem(SPACETIME_TOKEN_KEY);
    window.location.reload();
    setSelectedAdminReportId(null);
    setChatBackTab(null);
    setSpaceBackTab(null); // <-- 加上這行
  };

  useEffect(() => {
    if (!needsAgeGate) return;
    const current = Number(myProfile?.ageYears ?? 0);
    setAgeGateYears(
      Number.isFinite(current) && current >= 16 && current <= 126
        ? String(current)
        : "16",
    );
    setAgeGateError("");
  }, [needsAgeGate, myProfile?.ageYears]);

  const submitAgeGate = async () => {
    const age = Number(ageGateYears);
    if (!Number.isFinite(age) || age < 16 || age > 126) {
      setAgeGateError("年齡需在 16–126");
      return;
    }
    setAgeGateSaving(true);
    setAgeGateError("");
    try {
      await setAgeYears({ ageYears: age });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAgeGateError(msg || "年齡提交失敗");
    } finally {
      setAgeGateSaving(false);
    }
  };

  const openReportModal = (
    targetType: "capsule" | "square_post" | "chat_thread" | "chat_account",
    targetId: string,
  ) => {
    if (!targetId.trim()) return;
    setReportTargetType(targetType);
    setReportTargetId(targetId.trim());
    setReportReasonCode("abuse");
    setReportDetail("");
    setReportError("");
    setReportModalOpen(true);
  };

  const submitReport = async () => {
    const detail = reportDetail.trim();
    if (detail.length < 10 || detail.length > 2000) {
      setReportError("舉報說明需 10–2000 字");
      return;
    }
    setReportSaving(true);
    setReportError("");
    try {
      await createReportTicket({
        targetType: reportTargetType,
        targetId: reportTargetId,
        reasonCode: reportReasonCode.trim(),
        detailText: detail,
        evidenceJson: "",
      });
      setReportModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setReportError(msg || "送出舉報失敗");
    } finally {
      setReportSaving(false);
    }
  };

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
          ? (capsuleMessageRows
              .find((c) => c.id === r.targetId)
              ?.authorIdentity.toHexString() ?? null)
          : r.targetType === "square_post"
            ? (squarePostRows
                .find((p) => p.sourceMessageId === r.targetId)
                ?.publisherIdentity.toHexString() ?? null)
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
        resolutionNote: adminResolutionNote.trim() || PRESET_REPORTER.dismiss,
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

  const setSingleAdminActive = async (
    row: (typeof activeAdminRows)[number],
    isActive: boolean,
  ) => {
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
  const openAdminEditModal = (
    row: (typeof adminRoleRows)[number],
    email: string,
  ) => {
    setAdminEditIdentityHex(row.adminIdentity.toHexString());
    setAdminEditEmail(email);
    setAdminEditRole(row.role);
    setAdminEditActive(row.isActive);
    setAdminEditOpen(true);
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
      setAdminEditOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAdminActionError(msg || "更新管理員失敗");
    } finally {
      setAdminActionLoading(false);
    }
  };

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
    const activeBan = activeSanctionsForTarget.find(
      (s) => s.sanctionType === "ban",
    );
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
      const post = squarePostRows.find(
        (p) => p.sourceMessageId === m.sourceMessageId,
      );
      const sourceCapsule = capsuleMessageRows.find(
        (c) => c.id === m.sourceMessageId,
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
      const sourceAuthorHex = sourceCapsule?.authorIdentity.toHexString() ?? "";
      const sourceAuthorProfile = sourceAuthorHex
        ? profileByIdentityHex.get(sourceAuthorHex)
        : undefined;
      const guestProfile = profileByIdentityHex.get(guestHex);
      const counterpartLabel = isMeGuest
        ? sourceAuthorProfile?.displayName?.trim() ||
          displayNameByEmail.get(
            (sourceCapsule?.authorEmail ?? post?.snapshotSenderEmail ?? "")
              .trim()
              .toLowerCase(),
          ) ||
          (sourceCapsule?.authorEmail?.split("@")[0] ??
            post?.snapshotSenderEmail?.split("@")[0] ??
            "對方")
        : guestProfile?.displayName?.trim() || `訪客 ${guestHex.slice(0, 10)}…`;
      const counterpartIdentityHex = isMeGuest
        ? sourceAuthorHex || guestHex
        : guestHex;
      const row: CapsuleChatThreadSummary = {
        key,
        sourceMessageId: m.sourceMessageId,
        threadGuestHex: guestHex,
        counterpartLabel,
        counterpartIdentityHex,
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
    displayNameByEmail,
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

  if (view === "login" || view === "register") {
    return (
      <div className="min-h-screen bg-apple-black flex flex-col items-center justify-center p-6 font-sans text-white relative overflow-hidden">
        {/* Cinematic Background Gradient（不攔截點擊） */}
        <div className="pointer-events-none absolute inset-0 bg-radial-[at_50%_50%] from-apple-blue/10 via-transparent to-transparent opacity-50" />
        <div className="pointer-events-none absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-apple-blue/5 blur-[120px] rounded-full" />
        <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-apple-blue/5 blur-[120px] rounded-full" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[380px] text-center relative z-10"
        >
          <div className="mb-10">
            <h1 className="text-[56px] font-semibold tracking-[-0.005em] leading-[1.07] mb-2">
              有說
            </h1>
            <p className="text-[17px] font-medium text-apple-blue tracking-tight mb-4">
              {view === "login"
                ? "拆開屬於你的小紙條"
                : "留一個名字，開始丟膠囊"}
            </p>
            <p className="text-[14px] font-normal leading-relaxed text-white/40 px-4">
              悄悄話、慢慢開；寫給未來的自己，或貼到牆上讓路過的人隨手翻翻。
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAuth(view === "login");
            }}
            className="space-y-4 text-left"
          >
            <div className="relative">
              <input
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-[18px] bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-[16px] focus:ring-1 focus:ring-white/40 outline-none transition-all font-sans text-[17px] text-white placeholder:text-white/20"
                placeholder="信箱"
              />
            </div>
            <div className="relative">
              <input
                type="password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-[18px] bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-[16px] focus:ring-1 focus:ring-white/40 outline-none transition-all font-sans text-[17px] text-white placeholder:text-white/20"
                placeholder={view === "login" ? "密碼" : "設定密碼"}
              />
            </div>

            <AnimatePresence>
              {view === "register" && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="relative overflow-hidden space-y-2 mt-3"
                >
                  <input
                    type="password"
                    value={confirmPassword}
                    required={view === "register"}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(
                      "w-full px-4 py-[18px] bg-white/[0.04] backdrop-blur-md border rounded-[16px] focus:ring-1 outline-none transition-all font-sans text-[17px] text-white placeholder:text-white/20",
                      confirmPassword && password !== confirmPassword
                        ? "border-red-500/50 focus:ring-red-500/50"
                        : "border-white/[0.08] focus:ring-white/40",
                    )}
                    placeholder="再輸入一次密碼"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[11px] text-red-400/80 ml-2 font-medium tracking-tight">
                      兩次密碼不一樣喔
                    </p>
                  )}
                  <input
                    type="text"
                    value={registerDisplayName}
                    onChange={(e) => setRegisterDisplayName(e.target.value)}
                    maxLength={32}
                    className="w-full px-4 py-[14px] bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-[16px] focus:ring-1 focus:ring-white/40 outline-none font-sans text-[16px] text-white placeholder:text-white/20"
                    placeholder="暱稱（公開顯示用）"
                  />
                  <select
                    value={registerGender}
                    onChange={(e) => setRegisterGender(e.target.value)}
                    required
                    className="w-full px-4 py-[14px] bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-[16px] focus:ring-1 focus:ring-white/40 outline-none font-sans text-[16px] text-white"
                  >
                    <option
                      value=""
                      disabled
                      className="bg-apple-black text-white/80"
                    >
                      選擇性別
                    </option>
                    <option value="male" className="bg-apple-black">
                      男
                    </option>
                    <option value="female" className="bg-apple-black">
                      女
                    </option>
                    <option value="other" className="bg-apple-black">
                      其他
                    </option>
                    <option value="unspecified" className="bg-apple-black">
                      不願透露
                    </option>
                  </select>
                  <textarea
                    value={registerProfileNote}
                    onChange={(e) => setRegisterProfileNote(e.target.value)}
                    rows={2}
                    maxLength={400}
                    className="w-full px-4 py-[12px] bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-[16px] focus:ring-1 focus:ring-white/40 outline-none font-sans text-[14px] text-white placeholder:text-white/20 resize-none"
                    placeholder="自我介紹或其他（選填）"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {error ? (
              <p className="text-red-400 text-[13px] font-medium tracking-tight text-center mt-2">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-[14px] mt-6 bg-white text-apple-black hover:bg-white/90 rounded-[980px] font-sans font-semibold text-[17px] tracking-tight transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading
                ? "連線中…"
                : view === "login"
                  ? "拆開看看"
                  : "我也來留一則"}
            </button>

            <button
              type="button"
              onClick={() => {
                setView(view === "login" ? "register" : "login");
                setError("");
                setConfirmPassword("");
                setRegisterDisplayName("");
                setRegisterGender("");
                setRegisterProfileNote("");
              }}
              className="w-full text-center text-[14px] font-medium text-white/60 mt-8 hover:text-white transition-all"
            >
              {view === "login" ? "還沒帳號？來註冊一個" : "已有帳號？回去登入"}
            </button>
          </form>
        </motion.div>
      </div>
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

  const submitPublishToSquare = async () => {
    if (!selectedMessageId) return;
    setLoading(true);
    setSquareActionError("");
    try {
      await publishToSquare({
        sourceMessageId: selectedMessageId,
        sourceKind: undefined,
        repliesPublic: publishRepliesPublic,
        includeThreadInSnapshot: publishIncludeThread,
        includeCapsulePrivateInSnapshot: publishIncludeCapsulePrivate,
        showSenderOnSquare: publishShowSender,
        showRecipientOnSquare: publishShowRecipient,
      });
      setPublishModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSquareActionError(msg || "貼到牆上失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublishSquare = async (sourceMessageId: string) => {
    setSquareActionError("");
    try {
      await unpublishFromSquare({ sourceMessageId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSquareActionError(msg || "撤下失敗");
    }
  };

  const handleSetSquareReaction = async (
    sourceMessageId: string,
    kind: SquareReactionKind,
  ) => {
    setSquareActionError("");
    try {
      const cur = mySquareReactionByPost.get(sourceMessageId);
      const nextKind = cur === kind ? "none" : kind;
      await setSquareReaction({ sourceMessageId, kind: nextKind });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSquareActionError(msg || "反應失敗");
    }
  };

  const handleAppendLetterExchange = async (messageId: string) => {
    const body = exchangeAppendDraft.trim();
    if (!body) return;
    if (body.length > TEXT_LIMIT) {
      setSquareActionError(`內容最多 ${TEXT_LIMIT} 字`);
      return;
    }
    setExchangeAppendBusy(true);
    setSquareActionError("");
    try {
      await appendLetterExchange({ messageId, body });
      setExchangeAppendDraft("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSquareActionError(msg || "送出失敗");
    } finally {
      setExchangeAppendBusy(false);
    }
  };

  const handleAddSquareComment = async (sourceMessageId: string) => {
    const body = squareCommentDraft.trim();
    if (!body) return;
    if (body.length > TEXT_LIMIT) {
      setSquareActionError(`評論最多 ${TEXT_LIMIT} 字`);
      return;
    }
    setSquareActionError("");
    try {
      await addSquareComment({
        sourceMessageId,
        body,
        parentCommentId: "",
      });
      setSquareCommentDraft("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSquareActionError(msg || "留言失敗");
    }
  };

  const handleAddCapsulePrivateMessage = async (
    sourceMessageId: string,
    threadGuestHex: string | null,
  ) => {
    const body = capsulePrivateDraft.trim();
    if (!body) return;
    if (body.length > TEXT_LIMIT) {
      setSquareActionError(`內容最多 ${TEXT_LIMIT} 字`);
      return;
    }
    if (!threadGuestHex) {
      setSquareActionError("寄件／收件請先選一條訪客線，或等訪客開線");
      return;
    }
    setSquareActionError("");
    try {
      await addCapsulePrivateMessage({
        sourceMessageId,
        threadGuestIdentity: Identity.fromString(threadGuestHex),
        body,
      });
      setCapsulePrivateDraft("");
      if (
        !isCapsuleParticipantUi &&
        threadGuestHex === identity.toHexString()
      ) {
        jumpToChatFromCapsule(sourceMessageId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSquareActionError(msg || "膠囊私訊送出失敗");
    }
  };

  const handleSendChatMessage = async () => {
    const body = chatDraft.trim();
    if (!body || !selectedChatThread) return;
    if (isMuted) {
      const endStr = myMuteSanction?.endAt
        ? `至 ${new Date(Number(myMuteSanction.endAt.microsSinceUnixEpoch / 1000n)).toLocaleDateString("zh-TW")}`
        : "永久";
      setSquareActionError(`你已被禁言（${endStr}），無法發送聊聊訊息。`);
      return;
    }
    if (body.length > TEXT_LIMIT) {
      setSquareActionError(`內容最多 ${TEXT_LIMIT} 字`);
      return;
    }
    setSquareActionError("");
    try {
      await addCapsulePrivateMessage({
        sourceMessageId: selectedChatThread.sourceMessageId,
        threadGuestIdentity: Identity.fromString(
          selectedChatThread.threadGuestHex,
        ),
        body,
      });
      setChatDraft("");
      if (chatInputRef.current) {
        chatInputRef.current.style.height = "44px";
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSquareActionError(msg || "聊天訊息送出失敗");
    }
  };

  const resizeChatInput = (value: string) => {
    setChatDraft(value);
    if (!chatInputRef.current) return;
    chatInputRef.current.style.height = "44px";
    const next = Math.min(chatInputRef.current.scrollHeight, 84);
    chatInputRef.current.style.height = `${next}px`;
  };

  const handleFavoriteSquare = async (sourceMessageId: string) => {
    setSquareActionError("");
    try {
      await favoriteSquarePost({ sourceMessageId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSquareActionError(msg || "藏進心底失敗");
    }
  };

  const handleUnfavoriteSquare = async (sourceMessageId: string) => {
    setSquareActionError("");
    try {
      await unfavoriteSquarePost({ sourceMessageId });
      if (favoriteSelectedId) setFavoriteSelectedId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSquareActionError(msg || "從心底拿出失敗");
    }
  };

  const handleFavoriteCapsuleById = async (capsuleId: string) => {
    setSquareActionError("");
    try {
      await favoriteCapsule({ capsuleId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSquareActionError(msg || "藏進心底失敗");
    }
  };

  const handleUnfavoriteCapsuleById = async (capsuleId: string) => {
    setSquareActionError("");
    try {
      await unfavoriteCapsule({ capsuleId });
      if (favoriteSelectedId) setFavoriteSelectedId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSquareActionError(msg || "從心底拿出失敗");
    }
  };

  const openCapsuleDrawer = () => {
    setCapsuleOpen(true);
    setCapsuleSwitching(false);
    setSquareActionError("");
    const last =
      typeof window !== "undefined"
        ? sessionStorage.getItem(CAPSULE_LAST_SHOWN_KEY)
        : null;
    let pool = last
      ? capsuleEligiblePool.filter((p) => p.id !== last)
      : [...capsuleEligiblePool];
    if (pool.length === 0) pool = [...capsuleEligiblePool];
    if (pool.length === 0) {
      setCapsulePostId(null);
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
    setCapsulePostId(pick.id);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CAPSULE_LAST_SHOWN_KEY, pick.id);
    }
  };

  const pickAnotherCapsule = async () => {
    if (!capsulePostId) return;
    const pool = capsuleEligiblePool.filter((p) => p.id !== capsulePostId);
    if (pool.length === 0) {
      setSquareActionError("目前沒有另一則能換囉");
      return;
    }
    setCapsuleSwitching(true);
    setSquareActionError("");
    setCapsulePrivateDraft("");
    await new Promise((resolve) => {
      const timer =
        typeof window !== "undefined" ? window.setTimeout : setTimeout;
      timer(resolve, 520);
    });
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
    setCapsulePostId(pick.id);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CAPSULE_LAST_SHOWN_KEY, pick.id);
    }
    setCapsuleSwitching(false);
  };

  const closeCapsuleDrawer = () => {
    setCapsuleOpen(false);
    setCapsuleSwitching(false);
    setCapsulePostId(null);
    setCapsulePrivateDraft("");
    setCapsuleThreadGuestHex(null);
    setSquareActionError("");
  };

  const jumpToChatFromCapsule = (sourceMessageId: string) => {
    const guestHex = identity.toHexString();
    setChatBackTab(activeTab === "chat" ? null : activeTab);
    setSelectedChatThreadKey(`${sourceMessageId}::${guestHex}`);
    setActiveTab("chat");
    setCapsuleOpen(false);
    setCapsulePostId(null);
    setSquareSelectedPostId(null);
    setCapsulePrivateDraft("");
    setCapsuleThreadGuestHex(null);
    setSquareActionError("");
  };

  const openSpace = (ownerHex: string) => {
    setSpaceBackTab(activeTab === "space" ? spaceBackTab : activeTab);
    setSpaceOwnerHex(ownerHex);
    setActiveTab("space");

    setCapsuleOpen(false);
    setSquareActionError("");
    setSpaceOwnerHex(ownerHex);
    setActiveTab("space");
    setSelectedMessageId(null);
    setSquareSelectedPostId(null);
    setFavoriteSelectedId(null);
    setSelectedChatThreadKey(null);
    setSelectedAdminReportId(null);
    setChatBackTab(null);
    setSquareActionError("");
  };

  const handleDeleteCapsuleMessage = async (id: string) => {
    setSquareActionError("");
    try {
      await deleteCapsuleMessage({ id });
      if (capsuleOpen && capsulePostId === id) {
        closeCapsuleDrawer();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSquareActionError(msg || "刪除膠囊失敗");
    }
  };

  const beginOutboxEdit = async () => {
    if (
      !myProfile ||
      !currentMessage ||
      activeTab !== "outbox" ||
      currentMessage.isDue
    )
      return;
    setOutboxEditLoading(true);
    setOutboxEditError("");
    try {
      const row = outboxRows.find((r) => r.id === currentMessage._id);
      if (!row) {
        setOutboxEditError("無法載入內容");
        return;
      }
      const sp = squarePostRows.find(
        (p) => p.sourceMessageId === currentMessage._id,
      );
      setOutboxEditForm({
        recipientEmail: row.recipientEmail,
        content: row.content,
        scheduledAtLocal: isoToDatetimeLocalValue(
          row.scheduledAt.toISOString(),
        ),
        isWaitListVisible: row.isWaitListVisible,
        publishToSquare: !!sp,
        squareRepliesPublic: sp?.repliesPublic ?? false,
        squareIncludeThread: sp?.includeThreadInSnapshot ?? false,
        squareIncludeCapsulePrivate:
          sp?.includeCapsulePrivateInSnapshot ?? false,
        squareShowSender: sp?.showSenderOnSquare ?? true,
        squareShowRecipient: sp?.showRecipientOnSquare ?? true,
      });
      setOutboxEditOpen(true);
    } catch {
      setOutboxEditError("載入失敗，請稍後再試");
    } finally {
      setOutboxEditLoading(false);
    }
  };

  const cancelOutboxEdit = () => {
    setOutboxEditOpen(false);
    setOutboxEditForm(null);
    setOutboxEditError("");
  };

  const saveOutboxEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !myProfile ||
      !currentMessage ||
      !outboxEditForm ||
      activeTab !== "outbox"
    )
      return;
    const d = new Date(outboxEditForm.scheduledAtLocal);
    if (Number.isNaN(d.getTime())) {
      setOutboxEditError("請選擇有效的開啟時間");
      return;
    }
    setOutboxEditSaving(true);
    setOutboxEditError("");
    try {
      await updateScheduledMessage({
        id: currentMessage._id,
        recipientEmail: outboxEditForm.recipientEmail.trim().toLowerCase(),
        content: outboxEditForm.content.trim(),
        scheduledAt: Timestamp.fromDate(d),
        isWaitListVisible: outboxEditForm.isWaitListVisible,
        publishToSquare: outboxEditForm.publishToSquare,
        squareRepliesPublic: outboxEditForm.publishToSquare
          ? outboxEditForm.squareRepliesPublic
          : false,
        squareIncludeThread: outboxEditForm.publishToSquare
          ? outboxEditForm.squareIncludeThread
          : false,
        squareIncludeCapsulePrivate: outboxEditForm.publishToSquare
          ? outboxEditForm.squareIncludeCapsulePrivate
          : false,
        squareShowSender: outboxEditForm.publishToSquare
          ? outboxEditForm.squareShowSender
          : false,
        squareShowRecipient: outboxEditForm.publishToSquare
          ? outboxEditForm.squareShowRecipient
          : false,
      });
      cancelOutboxEdit();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOutboxEditError(msg || "儲存失敗");
    } finally {
      setOutboxEditSaving(false);
    }
  };

  const confirmDeleteOutboxMessage = async () => {
    if (
      !myProfile ||
      !currentMessage ||
      activeTab !== "outbox" ||
      currentMessage.isDue
    )
      return;
    setOutboxEditLoading(true);
    setOutboxEditError("");
    try {
      await deleteScheduledMessage({ id: currentMessage._id });
      setOutboxDeleteConfirmOpen(false);
      cancelOutboxEdit();
      setSelectedMessageId(outbox[0]?._id ?? null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOutboxEditError(msg || "刪除失敗");
    } finally {
      setOutboxEditLoading(false);
    }
  };

  const isMobileDetailView =
    activeTab === "new" ||
    activeTab === "direct" ||
    (activeTab === "secret" && squareSelectedPostId !== null) ||
    (activeTab === "favorites" && favoriteSelectedId !== null) ||
    ((activeTab === "admin" || activeTab === "admin_ops") &&
      adminMobileShowContent) ||
    (activeTab === "chat" && selectedChatThreadKey !== null) ||
    ((activeTab === "inbox" || activeTab === "outbox") &&
      selectedMessageId !== null &&
      !!currentMessage);
  // === 插入在這裡 ===
  if (view === "dashboard" && !myProfile) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#2a5e59] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#f4dc3a] mb-4" />
        <p className="text-[14px] font-bold tracking-tight">
          正在同步時光資料...
        </p>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "h-screen flex flex-col font-sans overflow-hidden",
        "bg-[#2a5e59] text-white md:bg-[#F5F5F7] md:text-apple-near-black",
      )}
      translate="no"
    >
      <nav className="relative z-50 flex h-[52px] shrink-0 items-center border-b border-stone-900/30 bg-[#1f4a47] px-3 md:h-[48px] md:border-white/10 md:px-6 md:glass-nav">
        <div className="flex min-w-0 flex-1 items-center justify-start gap-3">
          {isMobileDetailView ? (
            <button
              type="button"
              aria-label="返回"
              onClick={() => {
                if (activeTab === "admin" || activeTab === "admin_ops") {
                  if (
                    adminSection === "reports" &&
                    selectedAdminReportId !== null
                  ) {
                    setSelectedAdminReportId(null);
                  } else {
                    setAdminMobileShowContent(false);
                    setSelectedAdminReportId(null);
                  }
                  return;
                }
                if (
                  activeTab === "chat" &&
                  selectedChatThreadKey !== null &&
                  chatBackTab
                ) {
                  setActiveTab(chatBackTab);
                  setChatBackTab(null);
                  setSelectedMessageId(null);
                  setSquareSelectedPostId(null);
                  setFavoriteSelectedId(null);
                  setSelectedChatThreadKey(null);
                  setSelectedAdminReportId(null);
                  return;
                }
                if (activeTab === "new" || activeTab === "direct") {
                  setActiveTab("secret");
                  setSelectedMessageId(null);
                  setSquareSelectedPostId(null);
                  setFavoriteSelectedId(null);
                  setComposeError("");
                  setComposeSuccess("");
                  return;
                }
                setSelectedMessageId(null);
                setSquareSelectedPostId(null);
                setFavoriteSelectedId(null);
                setSelectedChatThreadKey(null);
                setSelectedAdminReportId(null);
                setChatBackTab(null);
              }}
              className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-none border-2 border-white/35 bg-white/10 text-white shadow-[3px_3px_0_0_rgba(0,0,0,0.25)] transition-transform active:translate-y-px active:shadow-none"
            >
              <ChevronRight
                className="h-5 w-5 -rotate-180"
                strokeWidth={2.5}
                aria-hidden
              />
            </button>
          ) : (
            <span className="md:hidden h-10 w-10 shrink-0" aria-hidden />
          )}
          {!isAdmin ? (
            <div
              className="hidden h-9 max-w-[min(100%,36rem)] shrink-0 items-center gap-0.5 overflow-x-auto rounded-full bg-black/30 p-0.5 shadow-inner shadow-black/20 ring-1 ring-inset ring-white/[0.08] scrollbar-none md:flex"
              role="tablist"
              aria-label="主要分頁"
            >
              <NavTab
                active={activeTab === "secret"}
                onClick={() => {
                  setActiveTab("secret");
                  setSelectedMessageId(null);
                  setSquareSelectedPostId(null);
                  setFavoriteSelectedId(null);
                  setSquareActionError("");
                }}
                label="秘密"
              />
              <NavTab
                active={activeTab === "new" || activeTab === "direct"}
                onClick={() => {
                  setActiveTab("new");
                  setComposeMode("capsule");
                  setSelectedMessageId(null);
                  setSquareSelectedPostId(null);
                  setFavoriteSelectedId(null);
                  setComposeError("");
                  setComposeSuccess("");
                }}
                label="撰写"
              />
              <NavTab
                active={
                  activeTab === "mine" ||
                  activeTab === "inbox" ||
                  activeTab === "outbox" ||
                  activeTab === "favorites" ||
                  activeTab === "space" ||
                  activeTab === "admin" ||
                  activeTab === "admin_ops" ||
                  activeTab === "chat"
                }
                onClick={() => {
                  setActiveTab("mine");
                  setSelectedMessageId(null);
                  setSquareSelectedPostId(null);
                  setFavoriteSelectedId(null);
                  setSelectedChatThreadKey(null);
                  setSelectedAdminReportId(null);
                  setSquareActionError("");
                }}
                label="我的"
              />
            </div>
          ) : null}
        </div>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[17px] font-bold tracking-tight text-white md:text-[17px]">
            有說
          </span>
          <span className="text-[9px] font-medium tracking-wide text-white/55 md:text-white/45">
            悄悄話・慢慢説・屬於我們的秘密
          </span>
        </div>
        <div className="relative z-10 hidden flex-1 items-center justify-end gap-2 md:flex md:gap-3">
          <button
            type="button"
            onClick={() => void openProfileModal()}
            className="inline-flex max-w-[min(100%,10rem)] truncate rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] sm:text-[12px] font-medium text-white/90 hover:bg-white/15 md:max-w-[10rem]"
          >
            {user?.displayName?.trim() ||
              user?.email?.split("@")[0] ||
              "個人資料"}
          </button>
          <span className="text-[11px] text-white/50 font-medium hidden lg:inline-block truncate max-w-[12rem]">
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 text-white/80 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {user && !user.displayName?.trim() ? (
        <div className="shrink-0 border-b border-amber-200/50 bg-amber-50/95 px-4 py-2 text-center text-[12px] font-medium text-amber-950/90">
          請至「我的」頁頂部個人卡片按「編輯資料」補齊暱稱、性別與年齡。
        </div>
      ) : null}
      {isMuted || isWarned ? (
        <div
          className={cn(
            "shrink-0 overflow-hidden border-b",
            isMuted
              ? "border-orange-300 bg-orange-100"
              : "border-amber-300 bg-amber-50",
          )}
        >
          <div className="flex animate-[ticker_18s_linear_infinite] whitespace-nowrap gap-16 px-4 py-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "text-[11px] font-bold shrink-0",
                  isMuted ? "text-orange-800" : "text-amber-800",
                )}
              >
                {isMuted
                  ? `⚠️ 你已被禁言${myMuteSanction?.endAt ? `，至 ${new Date(Number(myMuteSanction.endAt.microsSinceUnixEpoch / 1000n)).toLocaleDateString("zh-TW")}` : "（永久）"}，期間無法發送聊聊訊息`
                  : `⚠️ 你已收到警告：${myWarnSanction?.reasonCode || "請注意發言規範"}，請遵守社群守則`}
              </span>
            ))}
          </div>
        </div>
      ) : null}

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
              : "border-stone-900/30 bg-[#2a5e59] md:border-black/[0.05] md:bg-[#F5F5F7]",
            isMobileDetailView ? "hidden md:flex" : "flex",
          )}
        >
          {!isAdmin &&
            (activeTab === "inbox" ||
              activeTab === "outbox" ||
              activeTab === "favorites" ||
              activeTab === "space" ||
              activeTab === "my_reports" ||
              activeTab === "chat") && (
              <button
                type="button"
                onClick={() => {
                  // 如果是在個人空間，且有來源分頁，則回到來源分頁
                  if (
                    activeTab === "space" &&
                    spaceBackTab &&
                    spaceBackTab !== "mine"
                  ) {
                    setActiveTab(spaceBackTab);
                    setSpaceBackTab(null);
                    return;
                  }
                  if (
                    activeTab === "chat" &&
                    chatBackTab &&
                    chatBackTab !== "mine"
                  ) {
                    setActiveTab(chatBackTab);
                    setChatBackTab(null);
                    return;
                  }
                  setActiveTab("mine");
                  setSelectedMessageId(null);
                  setSquareSelectedPostId(null);
                  setFavoriteSelectedId(null);
                  setSelectedChatThreadKey(null);
                  setSelectedAdminReportId(null);
                }}
                className="flex w-full items-center gap-1 rounded-xl border border-white/25 bg-white/10 px-2.5 py-1.5 text-left text-[12px] font-semibold text-white/95 transition-colors hover:bg-white/15 md:border-violet-200/60 md:bg-white/80 md:text-violet-800 md:hover:bg-violet-50/90"
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
                            onClick={() =>
                              setOpenedBroadcastItems((p) =>
                                p.filter((x) => x.scope !== activeTab),
                              )
                            }
                            className="text-[10px] font-semibold text-sky-800/90 hover:text-sky-950 underline-offset-2 hover:underline"
                          >
                            全部收起
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setOpenedBroadcastItems([])}
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
                        onClick={() => setSelectedMessageId(item.id)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            setSelectedMessageId(item.id);
                          }
                        }}
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
                                setOpenedBroadcastItems((p) =>
                                  p.filter((x) => x.id !== item.id),
                                );
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
              <div className="space-y-3">
                {user ? (
                  <MineProfileSummaryCard
                    user={user}
                    onOpenActions={() => void openProfileActionMenu()}
                    onEditIntro={() => void openIntroEditor()}
                    onLogout={() => void handleLogout()}
                  />
                ) : null}
                {!hasAnyAdmin || isAdmin ? (
                  !hasAnyAdmin ? (
                    <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-3">
                      <p className="text-[12px] font-bold text-rose-700">
                        系統尚未設定管理員
                      </p>
                      <p className="mt-1 text-[11px] text-rose-600">
                        可先由你建立第一位超級管理員。
                      </p>
                      <button
                        type="button"
                        onClick={() => void bootstrapAdminSelf()}
                        disabled={adminActionLoading}
                        className="mt-2 rounded-xl border border-rose-400 bg-white px-3 py-1.5 text-[12px] font-bold text-rose-700 disabled:opacity-60"
                      >
                        {adminActionLoading
                          ? "建立中…"
                          : "建立超級管理員（自己）"}
                      </button>
                    </div>
                  ) : null
                ) : null}
                <MineHubBigCards
                  inboxCount={inbox.length}
                  outboxCount={outbox.length}
                  favCount={unifiedFavoriteCount}
                  chatCount={capsuleChatThreads.length}
                  showAdminCard={false}
                  showSuperOpsCard={false}
                  myReportsCount={
                    reportTicketRows.filter((r) =>
                      r.reporterIdentity.isEqual(identity),
                    ).length
                  }
                  onNavigate={(t) => {
                    setActiveTab(
                      t === "admin" && isSuperAdmin ? "admin_ops" : t,
                    );
                    if (t === "space") {
                      setSpaceOwnerHex(identity.toHexString());
                    }
                    setSelectedMessageId(null);
                    setSquareSelectedPostId(null);
                    setFavoriteSelectedId(null);
                    setSelectedChatThreadKey(null);
                    setSelectedAdminReportId(null);
                    setChatBackTab(null);
                  }}
                />
              </div>
            ) : activeTab === "space" ? (
              spaceFeed.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <Package className="mx-auto mb-3 h-9 w-9 text-white/15 md:text-black/[0.08]" />
                  <p className="text-[13px] font-medium text-white/50 md:text-black/30">
                    {isOwnSpace
                      ? "你還沒有可顯示的紀錄"
                      : "對方目前沒有公開內容"}
                  </p>
                </div>
              ) : (
                spaceFeed.map((item) =>
                  item.kind === "capsule" ? (
                    <div
                      key={item.key}
                      className="w-full rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                            capsuleTypeMeta(item.capsule.capsuleType).chipClass,
                          )}
                        >
                          #{capsuleTypeMeta(item.capsule.capsuleType).label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-black/40">
                            膠囊
                          </span>
                          {isOwnSpace ? (
                            <button
                              type="button"
                              onClick={() =>
                                void handleDeleteCapsuleMessage(item.capsule.id)
                              }
                              className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700"
                            >
                              刪除
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isOwnSpace) {
                            jumpToChatFromCapsule(item.capsule.id);
                          }
                        }}
                        className={cn(
                          "mt-1 w-full text-left",
                          !isOwnSpace && "cursor-pointer",
                        )}
                      >
                        <p className="text-[13px] font-semibold text-apple-near-black line-clamp-2 leading-snug">
                          {item.capsule.content.length > 120
                            ? `${item.capsule.content.slice(0, 120)}…`
                            : item.capsule.content}
                        </p>
                        <p className="mt-1 text-[10px] text-black/40 tabular-nums">
                          {item.capsule.createdAt
                            .toDate()
                            .toLocaleString("zh-TW", {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                        </p>
                      </button>
                    </div>
                  ) : (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setActiveTab("secret");
                        setSquareSelectedPostId(item.post.sourceMessageId);
                      }}
                      className={cn(
                        "w-full text-left rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-sm transition-all",
                        squareSelectedPostId === item.post.sourceMessageId
                          ? "ring-2 ring-violet-400/40 border-violet-300/40"
                          : "hover:border-black/[0.12]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex rounded-full border border-violet-300 bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">
                          #廣場
                        </span>
                        <span className="text-[10px] font-semibold text-black/40">
                          公開
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] font-semibold text-apple-near-black line-clamp-2 leading-snug">
                        {item.post.snapshotContent.length > 120
                          ? `${item.post.snapshotContent.slice(0, 120)}…`
                          : item.post.snapshotContent}
                      </p>
                      <p className="mt-1 text-[10px] text-black/40 tabular-nums">
                        {item.post.createdAt.toDate().toLocaleString("zh-TW", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </button>
                  ),
                )
              )
            ) : activeTab === "admin" || activeTab === "admin_ops" ? (
              !isAdmin ? (
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
                      onClick={() => void bootstrapAdminSelf()}
                      disabled={adminActionLoading}
                      className="mt-3 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-3 py-2 text-[12px] font-black text-stone-900 disabled:opacity-60"
                    >
                      {adminActionLoading
                        ? "建立中…"
                        : "建立首位超級管理員（自己）"}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  {isSuperAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("admin_ops");
                        setAdminSection("main");
                        setAdminMobileShowContent(true);
                      }}
                      className={cn(
                        "w-full rounded-xl border-2 px-3 py-2 text-left text-[12px] font-bold transition-all",
                        activeTab === "admin_ops" && adminSection === "main"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-300/40"
                          : "border-black/[0.08] bg-white text-stone-700 hover:border-black/[0.15]",
                      )}
                    >
                      主頁面（可視化總覽）
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(isSuperAdmin ? "admin_ops" : "admin");
                      setAdminSection("reports");
                      setSelectedAdminReportId(null);
                      setAdminMobileShowContent(true);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border-2 px-3 py-2 text-left text-[12px] font-bold transition-all",
                      adminSection === "reports"
                        ? "border-rose-300 bg-rose-50 text-rose-800 ring-2 ring-rose-300/40"
                        : "border-black/[0.08] bg-white text-stone-700 hover:border-black/[0.15]",
                    )}
                  >
                    <span>處理舉報</span>
                    {adminReportsSorted.filter((r) => r.status !== "resolved")
                      .length > 0 ? (
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                          adminSection === "reports"
                            ? "bg-rose-500 text-white"
                            : "bg-rose-100 text-rose-700",
                        )}
                      >
                        {
                          adminReportsSorted.filter(
                            (r) => r.status !== "resolved",
                          ).length
                        }
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("admin");
                      setAdminSection("review");
                      setAdminMobileShowContent(true);
                    }}
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
              )
            ) : activeTab === "my_reports" ? (
              (() => {
                const myReports = [...reportTicketRows]
                  .filter((r) => {
                    const reporterEmail = adminEmailByHex.get(
                      r.reporterIdentity.toHexString(),
                    );
                    return emailsEqual(reporterEmail, myEmail);
                  })
                  .sort((a, b) =>
                    Number(
                      b.updatedAt.microsSinceUnixEpoch -
                        a.updatedAt.microsSinceUnixEpoch,
                    ),
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
                return myReports.map((r) => {
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
                  const icon: Record<string, string> = {
                    open: "⏳",
                    in_review: "🔍",
                    resolved: "✅",
                    dismissed: "ℹ️",
                  };
                  return (
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
                          {icon[r.status] ?? "📄"}{" "}
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
                  );
                });
              })()
            ) : activeTab === "chat" ? (
              capsuleChatThreads.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <MessageCircle className="mx-auto mb-3 h-9 w-9 text-white/15 md:text-black/[0.08]" />
                  <p className="text-[13px] font-medium text-white/50 md:text-black/30">
                    還沒有聊聊紀錄，先去秘密膠囊按「聊聊」開一條線
                  </p>
                </div>
              ) : (
                capsuleChatThreads.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setChatBackTab(null);
                      setSelectedChatThreadKey(t.key);
                    }}
                    className={cn(
                      "w-full text-left rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-sm transition-all",
                      selectedChatThreadKey === t.key
                        ? "ring-2 ring-violet-400/40 border-violet-300/40"
                        : "hover:border-black/[0.12]",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                        capsuleTypeMeta(t.sourceCapsuleType).chipClass,
                      )}
                    >
                      #{capsuleTypeMeta(t.sourceCapsuleType).label}
                    </span>
                    <p className="text-[13px] font-semibold text-apple-near-black truncate">
                      {t.counterpartLabel}
                    </p>
                    <p className="mt-0.5 text-[10px] text-black/45 truncate">
                      主文：{t.sourcePreview}
                    </p>
                    <p className="mt-1 text-[12px] text-black/70 truncate">
                      {t.lastBody}
                    </p>
                  </button>
                ))
              )
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
                  />
                </div>
              </div>
            ) : activeTab === "favorites" ? (
              unifiedFavoriteCount === 0 ? (
                <div className="py-8 px-4 text-center">
                  <Bookmark className="mx-auto mb-3 h-9 w-9 text-white/15 md:text-black/[0.08]" />
                  <p className="text-[13px] font-medium text-white/50 md:text-black/30">
                    心底還空空的，去秘密那裡藏幾則吧
                  </p>
                </div>
              ) : (
                unifiedFavoriteItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFavoriteSelectedId(item.key)}
                    className={cn(
                      "w-full text-left rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-sm transition-all",
                      favoriteSelectedId === item.key
                        ? "ring-2 ring-amber-400/40 border-amber-300/40"
                        : "hover:border-black/[0.12]",
                    )}
                  >
                    <p className="text-[13px] font-medium text-apple-near-black line-clamp-2 leading-snug">
                      {item.row.snapshotContent.length > 120
                        ? `${item.row.snapshotContent.slice(0, 120)}…`
                        : item.row.snapshotContent}
                    </p>
                    {item.kind === "square" ? (
                      (() => {
                        const f = item.row;
                        const line = squareAddressSubtitle(
                          f.snapshotShowSender,
                          f.snapshotShowRecipient,
                          f.snapshotSenderEmail,
                          f.snapshotRecipientEmail,
                        );
                        return line ? (
                          <p className="text-[10px] text-black/40 mt-1 truncate">
                            {line}
                          </p>
                        ) : (
                          <p className="text-[10px] text-black/35 mt-1">
                            寄件／收件已隱藏
                          </p>
                        );
                      })()
                    ) : (
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black",
                            capsuleTypeMeta(item.row.snapshotCapsuleType)
                              .chipClass,
                          )}
                        >
                          #{capsuleTypeMeta(item.row.snapshotCapsuleType).label}
                        </span>
                        <p className="text-[10px] text-black/40 truncate">
                          膠囊 · {item.row.snapshotAuthorEmail || "匿名"}
                        </p>
                      </div>
                    )}
                  </button>
                ))
              )
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
            activeTab === "secret" ? "md:bg-[#2a5e59]" : "md:bg-white",
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
              <div className="mx-auto w-full max-w-xl space-y-4 px-3 py-4 md:px-6">
                <div className="rounded-2xl border-2 border-stone-900 bg-white p-4">
                  <p className="text-[18px] font-black text-stone-900">
                    {isOwnSpace ? "我的空間" : `${spaceOwnerName} 的空間`}
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-stone-600">
                    混合顯示膠囊與公開貼文，依時間排序。
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-stone-500">
                    膠囊：{spaceCapsules.length} 則 · 廣場：
                    {spaceSquares.length} 則
                  </p>
                </div>
                {isOwnSpace ? (
                  <p className="text-[12px] font-semibold text-black/45">
                    從左側可刪除你自己的膠囊；刪除不會影響既有聊聊紀錄。
                  </p>
                ) : (
                  <p className="text-[12px] font-semibold text-black/45">
                    點左側膠囊即可直接跟對方發起聊聊。
                  </p>
                )}
              </div>
            ) : activeTab === "admin" || activeTab === "admin_ops" ? (
              !isAdmin ? (
                <div className="max-w-sm mx-auto text-center py-16 px-4">
                  <Lock
                    className="w-12 h-12 mx-auto text-black/10 mb-3"
                    aria-hidden
                  />
                  <p className="text-[15px] font-medium text-black/45">
                    管理後台僅限管理員
                  </p>
                  {!hasAnyAdmin ? (
                    <button
                      type="button"
                      onClick={() => void bootstrapAdminSelf()}
                      disabled={adminActionLoading}
                      className="mt-3 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-3 py-2 text-[12px] font-black text-stone-900 disabled:opacity-60"
                    >
                      {adminActionLoading
                        ? "建立中…"
                        : "建立首位超級管理員（自己）"}
                    </button>
                  ) : null}
                </div>
              ) : activeTab === "admin_ops" && !isSuperAdmin ? (
                <div className="max-w-sm mx-auto text-center py-16 px-4">
                  <Lock
                    className="w-12 h-12 mx-auto text-black/10 mb-3"
                    aria-hidden
                  />
                  <p className="text-[15px] font-medium text-black/45">
                    超管指揮台僅限 super_admin
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("admin")}
                    className="mt-4 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-4 py-2 text-[13px] font-black text-stone-900"
                  >
                    前往管理後台
                  </button>
                </div>
              ) : adminSection === "reports" ? (
                <div className="flex flex-col md:flex-row h-full min-h-0 w-full">
                  {/* reports left list */}
                  <div
                    className={cn(
                      "md:w-80 shrink-0 border-r border-black/[0.06] flex flex-col overflow-hidden",
                      selectedAdminReportId !== null
                        ? "hidden md:flex"
                        : "flex",
                    )}
                  >
                    <div className="shrink-0 flex items-center gap-1 border-b border-black/[0.05] bg-stone-50 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setAdminReportFilter("pending")}
                        className={cn(
                          "flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors",
                          adminReportFilter === "pending"
                            ? "bg-rose-500 text-white"
                            : "text-stone-500 hover:bg-stone-200",
                        )}
                      >
                        待處理 (
                        {
                          adminReportsSorted.filter(
                            (r) => r.status !== "resolved",
                          ).length
                        }
                        )
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminReportFilter("resolved")}
                        className={cn(
                          "flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors",
                          adminReportFilter === "resolved"
                            ? "bg-stone-600 text-white"
                            : "text-stone-500 hover:bg-stone-200",
                        )}
                      >
                        已處理 (
                        {
                          adminReportsSorted.filter(
                            (r) => r.status === "resolved",
                          ).length
                        }
                        )
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
                            ? profileByIdentityHex.get(
                                r.assignedAdminIdentity.toHexString(),
                              )
                            : undefined;
                          const isSelected = selectedAdminReportId === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                setSelectedAdminReportId(r.id);
                                setAdminReportStatus(r.status);
                                setAdminReportPriority(Number(r.priority));
                                setAdminResolutionNote(r.resolutionNote ?? "");
                                setSanctionTypeDraft("warn");
                                setSanctionReasonDraft("report_violation");
                                setSanctionDetailDraft("");
                                setAdminActionError("");
                              }}
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
                                    r.status === "resolved"
                                      ? "text-stone-400"
                                      : "text-rose-600",
                                  )}
                                >
                                  {r.status}
                                </span>
                                <span className="text-[10px] text-black/30 tabular-nums">
                                  {r.updatedAt
                                    .toDate()
                                    .toLocaleDateString("zh-TW", {
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
                                  處理：
                                  {assignedProfile.displayName ||
                                    assignedProfile.email}
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
                          {adminReportFilter === "resolved"
                            ? "尚無已處理舉報"
                            : "目前沒有待處理舉報"}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {/* reports right detail */}
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
                        <p className="text-[13px] text-black/35">
                          從左側選一張舉報單
                        </p>
                      </div>
                    ) : (
                      <>
                        {(() => {
                          const r = selectedAdminReport;
                          const reporterProfile = profileByIdentityHex.get(
                            r.reporterIdentity.toHexString(),
                          );
                          const targetAccountHex =
                            r.targetType === "chat_account"
                              ? r.targetId
                              : r.targetType === "capsule"
                                ? (capsuleMessageRows
                                    .find((c) => c.id === r.targetId)
                                    ?.authorIdentity.toHexString() ?? null)
                                : r.targetType === "square_post"
                                  ? (squarePostRows
                                      .find(
                                        (p) => p.sourceMessageId === r.targetId,
                                      )
                                      ?.publisherIdentity.toHexString() ?? null)
                                  : null;
                          const targetProfile = targetAccountHex
                            ? profileByIdentityHex.get(targetAccountHex)
                            : undefined;
                          const targetCapsule =
                            r.targetType === "capsule"
                              ? capsuleMessageRows.find(
                                  (c) => c.id === r.targetId,
                                )
                              : undefined;
                          const targetSquare =
                            r.targetType === "square_post"
                              ? squarePostRows.find(
                                  (p) => p.sourceMessageId === r.targetId,
                                )
                              : undefined;
                          return (
                            <div className="w-full max-w-2xl mx-auto space-y-4">
                              {/* 雙方資訊 */}
                              <div className="rounded-2xl border border-black/[0.08] bg-white p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p
                                      className={cn(
                                        "text-[11px] font-bold uppercase",
                                        r.status === "resolved" ||
                                          r.status === "dismissed"
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
                                    onClick={() =>
                                      setSelectedAdminReportId(null)
                                    }
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
                                        r.reporterIdentity
                                          .toHexString()
                                          .slice(0, 16) + "…"}
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
                                      {targetProfile?.email ||
                                        targetAccountHex?.slice(0, 16) + "…" ||
                                        "—"}
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
                                    <p className="font-bold text-stone-700">
                                      被舉報內容預覽
                                    </p>
                                    <p className="text-stone-600 line-clamp-3 whitespace-pre-wrap">
                                      {targetCapsule?.content ??
                                        targetSquare?.snapshotContent ??
                                        "—"}
                                    </p>
                                  </div>
                                ) : null}
                                <div className="text-[10px] text-stone-400 space-y-0.5">
                                  <p>
                                    建立：
                                    {r.createdAt
                                      .toDate()
                                      .toLocaleString("zh-TW", {
                                        year: "numeric",
                                        month: "numeric",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                  </p>
                                  <p>
                                    更新：
                                    {r.updatedAt
                                      .toDate()
                                      .toLocaleString("zh-TW", {
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
                                      {profileByIdentityHex.get(
                                        r.assignedAdminIdentity.toHexString(),
                                      )?.displayName ||
                                        adminEmailByHex.get(
                                          r.assignedAdminIdentity.toHexString(),
                                        ) ||
                                        "—"}
                                    </p>
                                  ) : null}
                                  {r.resolutionNote ? (
                                    <p>說明：{r.resolutionNote}</p>
                                  ) : null}
                                </div>
                              </div>
                              {/* 審核操作 */}
                              <div className="rounded-2xl border border-black/[0.08] bg-white p-4 space-y-3">
                                <p className="text-[13px] font-black text-stone-900">
                                  審核操作
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="text-[11px] font-bold text-stone-600">
                                    狀態
                                    <select
                                      value={adminReportStatus}
                                      onChange={(e) =>
                                        setAdminReportStatus(e.target.value)
                                      }
                                      className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[13px]"
                                    >
                                      <option value="open">待審核</option>
                                      <option value="in_review">審核中</option>
                                      <option value="resolved">已結案</option>
                                      <option value="dismissed">
                                        不予處理
                                      </option>
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
                                        setAdminReportPriority(
                                          Math.max(
                                            0,
                                            Math.min(
                                              9,
                                              Number(e.target.value) || 0,
                                            ),
                                          ),
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
                                      setAdminResolutionNote(e.target.value);
                                      setSanctionDetailDraft(e.target.value);
                                    }}
                                    placeholder="例：言論違規，已給予警告"
                                    className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[13px]"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => void submitAdminReportUpdate()}
                                  disabled={adminActionLoading}
                                  className="rounded-xl bg-rose-600 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-60"
                                >
                                  {adminActionLoading
                                    ? "提交中…"
                                    : "更新舉報單"}
                                </button>
                                {/* 刪除內容 */}
                                {targetCapsule || targetSquare ? (
                                  <div className="border-t border-stone-100 pt-3 space-y-1">
                                    <p className="text-[11px] font-bold text-stone-600">
                                      刪除違規內容
                                    </p>
                                    {targetCapsule ? (
                                      <button
                                        type="button"
                                        disabled={adminActionLoading}
                                        onClick={async () => {
                                          if (
                                            !window.confirm("確定刪除此膠囊？")
                                          )
                                            return;
                                          setAdminActionLoading(true);
                                          try {
                                            await adminDeleteCapsule({
                                              capsuleId: targetCapsule.id,
                                            });
                                          } catch (e) {
                                            setAdminActionError(
                                              e instanceof Error
                                                ? e.message
                                                : "刪除失敗",
                                            );
                                          } finally {
                                            setAdminActionLoading(false);
                                          }
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
                                          if (
                                            !window.confirm(
                                              "確定刪除此廣場貼文？",
                                            )
                                          )
                                            return;
                                          setAdminActionLoading(true);
                                          try {
                                            await adminDeleteSquarePost({
                                              sourceMessageId:
                                                targetSquare.sourceMessageId,
                                            });
                                          } catch (e) {
                                            setAdminActionError(
                                              e instanceof Error
                                                ? e.message
                                                : "刪除失敗",
                                            );
                                          } finally {
                                            setAdminActionLoading(false);
                                          }
                                        }}
                                        className="rounded-xl border-2 border-red-400 bg-red-100 px-3 py-1.5 text-[11px] font-bold text-red-800 disabled:opacity-60"
                                      >
                                        刪除廣場貼文
                                      </button>
                                    ) : null}
                                  </div>
                                ) : null}
                                {/* 帳號快速動作 */}
                                <div className="border-t border-stone-100 pt-3 space-y-2">
                                  <p className="text-[12px] font-black text-stone-900">
                                    帳號快速動作
                                    {!targetAccountHex
                                      ? "（無法識別帳號）"
                                      : ""}
                                  </p>
                                  {targetAccountHex ? (
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        disabled={adminActionLoading}
                                        onClick={() => {
                                          setAdminResolutionNote(
                                            PRESET_REPORTER.dismiss,
                                          );
                                          setSanctionDetailDraft(
                                            PRESET_SANCTION.dismiss,
                                          );
                                          void quickDismissReport();
                                        }}
                                        className="rounded-xl border-2 border-stone-300 bg-white px-3 py-1.5 text-[11px] font-bold text-stone-600 disabled:opacity-60"
                                      >
                                        不予處理
                                      </button>
                                      <button
                                        type="button"
                                        disabled={adminActionLoading}
                                        onClick={() => {
                                          setAdminResolutionNote(
                                            PRESET_REPORTER.warn,
                                          );
                                          setSanctionDetailDraft(
                                            PRESET_SANCTION.warn,
                                          );
                                          setSanctionTypeDraft("warn");
                                          setSanctionBanDays(0);
                                          void submitSanctionForSelectedReport();
                                        }}
                                        className="rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 disabled:opacity-60"
                                      >
                                        警告
                                      </button>
                                      <button
                                        type="button"
                                        disabled={adminActionLoading}
                                        onClick={() => {
                                          setAdminResolutionNote(
                                            PRESET_REPORTER.mute7,
                                          );
                                          setSanctionDetailDraft(
                                            PRESET_SANCTION.mute7,
                                          );
                                          setSanctionTypeDraft("mute");
                                          setSanctionBanDays(7);
                                          void submitSanctionForSelectedReport();
                                        }}
                                        className="rounded-xl border-2 border-orange-300 bg-orange-50 px-3 py-1.5 text-[11px] font-bold text-orange-700 disabled:opacity-60"
                                      >
                                        禁言7天
                                      </button>
                                      <button
                                        type="button"
                                        disabled={adminActionLoading}
                                        onClick={() => {
                                          setAdminResolutionNote(
                                            PRESET_REPORTER.mute30,
                                          );
                                          setSanctionDetailDraft(
                                            PRESET_SANCTION.mute30,
                                          );
                                          setSanctionTypeDraft("mute");
                                          setSanctionBanDays(30);
                                          void submitSanctionForSelectedReport();
                                        }}
                                        className="rounded-xl border-2 border-orange-400 bg-orange-100 px-3 py-1.5 text-[11px] font-bold text-orange-800 disabled:opacity-60"
                                      >
                                        禁言30天
                                      </button>
                                      <button
                                        type="button"
                                        disabled={adminActionLoading}
                                        onClick={() => {
                                          setAdminResolutionNote(
                                            PRESET_REPORTER.ban7,
                                          );
                                          setSanctionDetailDraft(
                                            PRESET_SANCTION.ban7,
                                          );
                                          setSanctionTypeDraft("ban");
                                          setSanctionBanDays(7);
                                          void submitSanctionForSelectedReport();
                                        }}
                                        className="rounded-xl border-2 border-red-300 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-700 disabled:opacity-60"
                                      >
                                        封禁7天
                                      </button>
                                      <button
                                        type="button"
                                        disabled={adminActionLoading}
                                        onClick={() => {
                                          setAdminResolutionNote(
                                            PRESET_REPORTER.ban30,
                                          );
                                          setSanctionDetailDraft(
                                            PRESET_SANCTION.ban30,
                                          );
                                          setSanctionTypeDraft("ban");
                                          setSanctionBanDays(30);
                                          void submitSanctionForSelectedReport();
                                        }}
                                        className="rounded-xl border-2 border-red-400 bg-red-100 px-3 py-1.5 text-[11px] font-bold text-red-800 disabled:opacity-60"
                                      >
                                        封禁30天
                                      </button>
                                      <button
                                        type="button"
                                        disabled={adminActionLoading}
                                        onClick={() => {
                                          setAdminResolutionNote(
                                            PRESET_REPORTER.banPermanent,
                                          );
                                          setSanctionDetailDraft(
                                            PRESET_SANCTION.banPermanent,
                                          );
                                          setSanctionTypeDraft("ban");
                                          setSanctionBanDays("permanent");
                                          void submitSanctionForSelectedReport();
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
                        })()}
                      </>
                    )}
                  </div>
                </div>
              ) : activeTab === "admin_ops" ? (
                <div className="w-full max-w-5xl mx-auto space-y-4 px-2 py-2 md:px-5 md:py-4 overflow-y-auto apple-scroll max-h-full">
                  <div className="rounded-2xl border-2 border-stone-900 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4 text-white shadow-xl md:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/90">
                          超管指揮台
                        </p>
                        <p className="mt-1 text-[20px] font-black leading-tight md:text-2xl">
                          即時稼動總覽
                        </p>
                      </div>
                      {/* <span className="shrink-0 rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-100/90">
                        管理總覽
                      </span> */}
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
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm"
                        >
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200/80">
                            <Activity
                              className="h-3.5 w-3.5 shrink-0 opacity-80"
                              aria-hidden
                            />
                            {label}
                          </div>
                          <p className="mt-2 text-[22px] font-black tabular-nums md:text-3xl">
                            {n}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/[0.08] bg-white p-4 space-y-3 md:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-black text-stone-900">
                        管理帳號（啟用 {activeAdminRows.length} / 已移除{" "}
                        {inactiveAdminRows.length}）
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminGrantEmail("");
                          setAdminGrantRole("moderator");
                          setAdminGrantActive(true);
                          setAdminAddOpen(true);
                        }}
                        className="shrink-0 rounded-xl border-2 border-rose-400 bg-rose-500 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-rose-600"
                      >
                        + 新增管理員
                      </button>
                    </div>
                    {activeAdminRows.length === 0 ? (
                      <p className="text-[12px] text-stone-500">
                        目前還沒有管理帳號。
                      </p>
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
                                isUnknown
                                  ? "border-amber-300 bg-amber-50"
                                  : "border-stone-200 bg-white",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="min-w-0 truncate text-[11px]">
                                  <span className="font-bold text-stone-900">
                                    {adminRoleLabel[r.role] ?? r.role}
                                  </span>
                                  {isUnknown ? (
                                    <span className="ml-1 text-amber-700">
                                      ⚠ 未知帳號
                                    </span>
                                  ) : (
                                    <span className="ml-1">{em}</span>
                                  )}
                                  {r.adminIdentity.isEqual(identity)
                                    ? "（你）"
                                    : ""}
                                </p>
                                <div className="flex shrink-0 items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openAdminEditModal(r, em ?? "");
                                    }}
                                    className="rounded border border-stone-300 bg-white px-2 py-0.5 text-[10px] font-semibold"
                                  >
                                    編輯
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      r.role !== "super_admin" &&
                                      !r.adminIdentity.isEqual(identity) &&
                                      void setSingleAdminActive(r, false)
                                    }
                                    disabled={
                                      adminActionLoading ||
                                      r.role === "super_admin" ||
                                      r.adminIdentity.isEqual(identity)
                                    }
                                    className={cn(
                                      "relative flex items-center",
                                      (r.role === "super_admin" ||
                                        r.adminIdentity.isEqual(identity)) &&
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
                                      const val = (e.currentTarget.value ?? "")
                                        .trim()
                                        .toLowerCase();
                                      if (!val) return;
                                      const target = profileByEmail.get(val);
                                      if (!target) {
                                        setAdminActionError(
                                          `找不到帳號 ${val}`,
                                        );
                                        return;
                                      }
                                      setAdminGrantEmail(val);
                                      setAdminGrantRole(r.role);
                                      setAdminGrantActive(true);
                                      setAdminAddOpen(true);
                                    }}
                                  />
                                  <datalist
                                    id={`admin-rebind-candidates-${hex}`}
                                  >
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
                        <p className="mb-1 text-[11px] font-bold text-stone-600">
                          已移除管理權
                        </p>
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
                                          !window.confirm(
                                            `確定從管理表刪除 ${em} 的記錄？此操作不影響帳號本身。`,
                                          )
                                        )
                                          return;
                                        setAdminActionLoading(true);
                                        setAdminActionError("");
                                        try {
                                          await adminDeleteRoleRecord({
                                            adminIdentity: r.adminIdentity,
                                          });
                                        } catch (e: unknown) {
                                          setAdminActionError(
                                            e instanceof Error
                                              ? e.message
                                              : "刪除失敗",
                                          );
                                        } finally {
                                          setAdminActionLoading(false);
                                        }
                                      }}
                                      className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 disabled:opacity-60"
                                    >
                                      刪除記錄
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void setSingleAdminActive(r, true)
                                      }
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
                    {/* <p className="text-[11px] text-stone-500">
                      點帳號列旁的「編輯」可修改權限。
                    </p> */}
                    {adminActionError ? (
                      <p className="text-[12px] font-semibold text-red-600">
                        {adminActionError}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl w-full mx-auto space-y-3">
                  <div className="rounded-2xl border border-black/[0.08] bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-black text-stone-900">
                        管理帳號
                      </p>
                      <span className="text-[11px] font-semibold text-stone-500">
                        共 {activeAdminRows.length} 位啟用
                      </span>
                    </div>
                    {activeAdminRows.length === 0 ? (
                      <p className="text-[12px] text-stone-500">
                        目前還沒有管理帳號。
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {activeAdminRows.map((r) => (
                          <li
                            key={r.adminIdentity.toHexString()}
                            className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-[12px] text-stone-700 break-all"
                          >
                            <span className="font-bold text-stone-900">
                              {r.role}
                            </span>{" "}
                            · {r.adminIdentity.toHexString()}
                            {r.adminIdentity.isEqual(identity) ? "（你）" : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-2xl border border-black/[0.08] bg-white p-4 space-y-3">
                    <p className="text-[13px] font-black text-stone-900">
                      帳號搜尋與一鍵停權 / 復權
                    </p>
                    <input
                      value={adminAccountSearch}
                      onChange={(e) => setAdminAccountSearch(e.target.value)}
                      placeholder="搜尋暱稱 / 信箱 / identity"
                      className="w-full rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[12px]"
                    />
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 p-1">
                      {adminSearchRows.length === 0 ? (
                        <p className="px-2 py-2 text-[12px] text-stone-500">
                          找不到符合帳號
                        </p>
                      ) : (
                        adminSearchRows.map((p) => {
                          const hx = p.ownerIdentity.toHexString();
                          const selected = hx === adminTargetIdentityHex;
                          return (
                            <button
                              key={hx}
                              type="button"
                              onClick={() => setAdminTargetIdentityHex(hx)}
                              className={cn(
                                "mb-1 w-full rounded-md border px-2 py-1.5 text-left text-[12px] transition-all",
                                selected
                                  ? "border-violet-300 bg-violet-50 text-violet-800 ring-2 ring-violet-300/40"
                                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
                              )}
                            >
                              <p className="font-bold">
                                {p.displayName || "(未命名)"}
                              </p>
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
                        {
                          activeSanctionsForTarget.filter(
                            (s) => s.sanctionType === "ban",
                          ).length
                        }
                        ）
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void quickBanTargetAccount()}
                        disabled={adminActionLoading || !adminTargetIdentityHex}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-60"
                      >
                        {adminActionLoading ? "處理中…" : "一鍵停權"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void quickUnbanTargetAccount()}
                        disabled={adminActionLoading || !adminTargetIdentityHex}
                        className="rounded-lg border border-emerald-500 bg-white px-3 py-1.5 text-[12px] font-bold text-emerald-700 disabled:opacity-60"
                      >
                        {adminActionLoading ? "處理中…" : "一鍵復權"}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[12px] text-stone-500">
                    點左側舉報單可彈窗處理。申訴：{appealTicketRows.length} ·
                    處分：{userSanctionRows.length} · 待審核：
                    {moderationQueueRows.length}
                  </div>
                </div>
              )
            ) : activeTab === "my_reports" ? (
              <div className="mx-auto max-w-md px-4 py-12 text-center md:flex md:flex-col md:items-center md:justify-center">
                <p className="text-[14px] font-semibold text-black/45">
                  我的舉報紀錄在左側，每張顯示審核狀態與結果。
                </p>
              </div>
            ) : activeTab === "chat" ? (
              !selectedChatThread ? (
                <div className="max-w-sm mx-auto text-center py-16 px-4">
                  <MessageCircle
                    className="w-12 h-12 mx-auto text-black/10 mb-3"
                    aria-hidden
                  />
                  <p className="text-[15px] font-medium text-black/45">
                    先從左側選一條聊聊紀錄
                  </p>
                </div>
              ) : (
                <div className="max-w-xl w-full mx-auto h-full min-h-0 flex flex-col gap-3">
                  <div className="rounded-2xl border border-black/[0.08] bg-white py-2 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[18px] font-black text-apple-near-black">
                          {selectedChatThread.counterpartLabel}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end">
                        <button
                          type="button"
                          onClick={() =>
                            openReportModal(
                              "chat_account",
                              selectedChatThread.counterpartIdentityHex,
                            )
                          }
                          className="mb-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700"
                        >
                          檢舉帳號
                        </button>
                        <button
                          type="button"
                          onClick={() => setChatPeerProfileOpen(true)}
                          disabled={
                            !selectedChatPeerProfile || !chatPeerUnlocked
                          }
                          title={
                            chatPeerUnlocked
                              ? "查看對方資訊"
                              : `互聊進度達 10/10 後解鎖（目前 ${selectedChatProgress}/10）`
                          }
                          className={cn(
                            "inline-flex h-10 w-10 items-center justify-center transition-colors",
                            (!selectedChatPeerProfile || !chatPeerUnlocked) &&
                              "cursor-not-allowed opacity-70",
                          )}
                        >
                          {chatPeerUnlocked ? (
                            <User
                              className="h-5 w-5"
                              strokeWidth={2.3}
                              aria-hidden
                            />
                          ) : (
                            <span className="relative inline-block h-6 w-6 text-rose-500">
                              <Heart
                                className="h-6 w-6 text-stone-400"
                                strokeWidth={2.2}
                                aria-hidden
                              />
                              <span
                                className="absolute inset-0 overflow-hidden"
                                style={{
                                  clipPath: `inset(${100 - selectedChatProgress * 10}% 0 0 0)`,
                                }}
                              >
                                <Heart
                                  className="h-6 w-6 fill-current text-rose-500"
                                  strokeWidth={0}
                                  aria-hidden
                                />
                              </span>
                            </span>
                          )}
                        </button>
                        {!chatPeerUnlocked ? (
                          <p className="text-[10px] font-bold text-rose-500">
                            解鎖對方資料 {selectedChatProgress}/10
                          </p>
                        ) : (
                          <p className="text-[10px] font-bold text-emerald-700">
                            對方資料
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-black/[0.08] bg-white p-3 min-h-0 flex-1 flex flex-col">
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto apple-scroll pr-1">
                      <div className="max-w-[84%] rounded-2xl border-2 border-stone-900 bg-white px-3 py-2 text-[13px] leading-snug text-stone-900">
                        <div className="mb-1 flex items-center gap-1.5">
                          <p className="text-[10px] font-black text-stone-500">
                            {selectedChatThread.counterpartLabel}
                          </p>
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                              capsuleTypeMeta(
                                selectedChatThread.sourceCapsuleType,
                              ).chipClass,
                            )}
                          >
                            #
                            {
                              capsuleTypeMeta(
                                selectedChatThread.sourceCapsuleType,
                              ).label
                            }
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap font-bold">
                          {selectedChatThread.sourcePreview}
                        </p>
                      </div>
                      {selectedChatMessages.map((m) => {
                        const isMine = m.authorIdentity.isEqual(identity);
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              "max-w-[84%] rounded-2xl border-2 border-stone-900 px-3 py-2 text-[13px] leading-snug",
                              isMine
                                ? "ml-auto bg-[#f4dc3a] text-stone-900"
                                : "mr-auto bg-white text-stone-900",
                            )}
                          >
                            {/* <p className="mb-1 text-[10px] font-black text-stone-500">
                              {isMine ? '我' : selectedChatThread.counterpartLabel}
                            </p> */}
                            <p className="whitespace-pre-wrap font-bold">
                              {m.body}
                            </p>
                            <p className="mt-1 text-[10px] font-medium text-stone-600 tabular-nums">
                              {m.createdAt.toDate().toLocaleString("zh-TW", {
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        );
                      })}
                      {selectedChatMessages.length === 0 ? (
                        <p className="py-8 text-center text-[12px] font-semibold text-black/35">
                          目前還沒有對話，先發第一句吧。
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-2 border-t border-black/[0.08] pt-2">
                      <div className="flex items-end gap-2">
                        <textarea
                          ref={chatInputRef}
                          value={chatDraft}
                          onChange={(e) => resizeChatInput(e.target.value)}
                          maxLength={TEXT_LIMIT}
                          rows={1}
                          placeholder="輸入聊天內容…"
                          className="h-[44px] max-h-[84px] min-h-[44px] flex-1 resize-none rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] leading-5 text-stone-900 placeholder:text-stone-400 outline-none overflow-y-auto"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSendChatMessage()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void handleSendChatMessage();
                            }
                          }}
                          className="shrink-0 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-4 py-2.5 text-[13px] font-black text-stone-900"
                        >
                          送出
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : activeTab === "secret" ? (
              !selectedSquarePost ? (
                <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center gap-6 px-4 py-8 md:max-w-lg md:gap-8 md:py-14">
                  <div
                    className={cn(
                      "flex w-full max-w-sm flex-col items-center justify-center gap-3",
                      secretWallExpanded ? "shrink-0" : "min-h-0 flex-1",
                    )}
                  >
                    <p className="text-center text-[11px] font-black uppercase tracking-wider text-white/55">
                      抽一則秘密膠囊
                    </p>
                    <div className="flex w-full justify-center">
                      <SecretCapsuleDrawButton
                        variant="treasure"
                        onClick={() => void openCapsuleDrawer()}
                      />
                    </div>
                  </div>
                  <div className="w-full min-w-0 max-w-md shrink-0">
                    <SecretWallSection
                      expanded={secretWallExpanded}
                      onToggleExpanded={() => setSecretWallExpanded((v) => !v)}
                      postsVisible={squarePostsVisible}
                      postsSortedLength={squarePostsSorted.length}
                      selectedSquarePostId={squareSelectedPostId}
                      onSelectPost={setSquareSelectedPostId}
                      reactionCountsByPost={squareReactionCountsByPost}
                      commentsByPost={squareCommentsByPost}
                      maxListItems={8}
                    />
                  </div>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-xl space-y-4 px-3 py-4 md:px-6">
                  {squareActionError ? (
                    <p
                      className="text-[13px] font-black text-red-200"
                      role="alert"
                    >
                      {squareActionError}
                    </p>
                  ) : null}
                  <div className="relative rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-5 shadow-[6px_6px_0_0_#142a28] md:p-6">
                    <span
                      className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 border-l-[18px] border-l-transparent border-b-[18px] border-b-stone-900/25"
                      aria-hidden
                    />
                    {(() => {
                      const line = squareAddressSubtitle(
                        selectedSquarePost.showSenderOnSquare,
                        selectedSquarePost.showRecipientOnSquare,
                        selectedSquarePost.snapshotSenderEmail,
                        selectedSquarePost.snapshotRecipientEmail,
                        {
                          sourceKind: selectedSquarePost.sourceKind,
                          senderDisplayName:
                            displayNameByEmail.get(
                              selectedSquarePost.snapshotSenderEmail
                                .trim()
                                .toLowerCase(),
                            ) ?? "",
                        },
                      );
                      return line ? (
                        <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-stone-700">
                          {line}
                        </p>
                      ) : (
                        <p className="mb-2 text-[11px] font-black text-stone-500">
                          信箱沒公開
                        </p>
                      );
                    })()}
                    <p className="whitespace-pre-wrap text-[16px] font-bold leading-relaxed text-stone-900 md:text-[17px]">
                      {selectedSquarePost.snapshotContent}
                    </p>
                    <p className="mt-4 text-[11px] font-bold tabular-nums text-stone-600">
                      預定開啟{" "}
                      {selectedSquarePost.snapshotScheduledAt
                        .toDate()
                        .toLocaleString("zh-TW", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (capsulePost) {
                          // 確保有值才執行
                          openSpace(capsulePost.authorIdentity.toHexString());
                        }
                      }}
                      className="..."
                    >
                      TA 的空間
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(["up", "mid", "down"] as const).map((rk) => {
                      const rc = squareReactionCountsByPost.get(
                        selectedSquarePost.sourceMessageId,
                      );
                      const n =
                        rk === "up"
                          ? (rc?.up ?? 0)
                          : rk === "mid"
                            ? (rc?.mid ?? 0)
                            : (rc?.down ?? 0);
                      const mine =
                        mySquareReactionByPost.get(
                          selectedSquarePost.sourceMessageId,
                        ) === rk;
                      const Icon =
                        rk === "up"
                          ? ThumbsUp
                          : rk === "down"
                            ? ThumbsDown
                            : Minus;
                      return (
                        <button
                          key={rk}
                          type="button"
                          onClick={() =>
                            void handleSetSquareReaction(
                              selectedSquarePost.sourceMessageId,
                              rk,
                            )
                          }
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-xl border-2 border-stone-900 px-3 py-2 text-[13px] font-black",
                            mine
                              ? "bg-[#f4dc3a] text-stone-900"
                              : "bg-white text-stone-900",
                          )}
                        >
                          <Icon
                            className="h-4 w-4 shrink-0"
                            strokeWidth={2.25}
                            aria-hidden
                          />
                          {n}
                        </button>
                      );
                    })}
                    {favoritedPostIds.has(
                      selectedSquarePost.sourceMessageId,
                    ) ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleUnfavoriteSquare(
                            selectedSquarePost.sourceMessageId,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[13px] font-black text-stone-900"
                      >
                        <Bookmark
                          className="h-4 w-4 fill-current"
                          aria-hidden
                        />
                        已收進心底
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void handleFavoriteSquare(
                            selectedSquarePost.sourceMessageId,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-3 py-2 text-[13px] font-black text-stone-900"
                      >
                        <Bookmark className="h-4 w-4" aria-hidden />
                        藏進心底
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        openReportModal(
                          "square_post",
                          selectedSquarePost.sourceMessageId,
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-[13px] font-black text-red-700"
                    >
                      檢舉貼文
                    </button>
                  </div>
                  <div className="space-y-2 rounded-2xl border-2 border-stone-900 bg-[#fffef7] p-3">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-stone-700">
                      膠囊私訊
                    </h3>
                    <p className="text-[10px] font-bold leading-snug text-stone-600">
                      與下方「廣場評論」分開；寄件／收件與同一訪客一線，外人看不到此處內容。
                    </p>
                    {isCapsuleParticipantUi &&
                    uniqueCapsuleGuestHexes.length > 0 ? (
                      <label className="block text-[10px] font-black text-stone-600">
                        訪客線（回覆對象）
                        <select
                          className="mt-1 w-full rounded-lg border-2 border-stone-900 bg-white px-2 py-1.5 text-[12px] font-bold text-stone-900"
                          value={capsuleThreadGuestHex ?? ""}
                          onChange={(e) =>
                            setCapsuleThreadGuestHex(e.target.value || null)
                          }
                        >
                          {uniqueCapsuleGuestHexes.map((hx) => (
                            <option key={hx} value={hx}>
                              {hx.slice(0, 14)}…
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : isCapsuleParticipantUi ? (
                      <p className="text-[11px] font-bold text-stone-500">
                        尚無訪客開線，等有人抽到這則再回覆。
                      </p>
                    ) : null}
                    <div className="max-h-40 space-y-1.5 overflow-y-auto apple-scroll">
                      {capsulePrivateThreadMessages.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-lg border border-stone-900/20 bg-white px-2 py-1.5 text-[12px]"
                        >
                          <p className="font-mono text-[9px] text-stone-500">
                            {m.authorIdentity.toHexString().slice(0, 12)}…
                          </p>
                          <p className="whitespace-pre-wrap font-bold text-stone-900">
                            {m.body}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <textarea
                        value={capsulePrivateDraft}
                        onChange={(e) => setCapsulePrivateDraft(e.target.value)}
                        maxLength={TEXT_LIMIT}
                        rows={2}
                        placeholder="寫膠囊私訊…"
                        className="min-h-0 flex-1 resize-none rounded-xl border-2 border-stone-900 bg-white px-2 py-1.5 text-[13px] text-stone-900 placeholder:text-stone-400 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          void handleAddCapsulePrivateMessage(
                            selectedSquarePost.sourceMessageId,
                            capsuleThreadGuestHex,
                          )
                        }
                        className="shrink-0 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-3 py-2 text-[12px] font-black text-stone-900"
                      >
                        送出私訊
                      </button>
                    </div>
                  </div>
                  {selectedSquarePost.repliesPublic ? (
                    <div className="mt-4 space-y-3">
                      <h3 className="text-[12px] font-black tracking-wider text-white/90">
                        廣場評論
                      </h3>
                      <div className="max-h-64 space-y-2 overflow-y-auto apple-scroll">
                        {(
                          squareCommentsByPost.get(
                            selectedSquarePost.sourceMessageId,
                          ) ?? []
                        ).map((c) => (
                          <div
                            key={c.id}
                            className="rounded-xl border-2 border-stone-900 bg-[#fffef7] px-3 py-2 text-[13px]"
                          >
                            <p className="mb-1 font-mono text-[10px] font-bold text-stone-500">
                              {c.authorIdentity.toHexString().slice(0, 12)}…
                            </p>
                            <p className="whitespace-pre-wrap font-bold text-stone-900">
                              {c.body}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <textarea
                          value={squareCommentDraft}
                          onChange={(e) =>
                            setSquareCommentDraft(e.target.value)
                          }
                          maxLength={TEXT_LIMIT}
                          rows={2}
                          placeholder="寫一句…"
                          className="min-h-0 flex-1 resize-none rounded-xl border-[2px] border-stone-900 bg-[#fffef7] px-3 py-2 text-[14px] font-bold text-stone-900 placeholder:text-stone-400 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void handleAddSquareComment(
                              selectedSquarePost.sourceMessageId,
                            )
                          }
                          className="shrink-0 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-4 py-2 text-[13px] font-black text-stone-900"
                        >
                          送出
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-[12px] font-bold text-white/70">
                      對方未開放廣場評論；仍可使用上方膠囊私訊與按心情、藏心底。
                    </p>
                  )}
                </div>
              )
            ) : activeTab === "favorites" ? (
              !selectedUnifiedFavorite ? (
                <div className="max-w-sm mx-auto text-center py-16 px-4">
                  <Bookmark
                    className="w-12 h-12 mx-auto text-black/10 mb-3"
                    aria-hidden
                  />
                  <p className="text-[15px] font-medium text-black/45">
                    從左側選一則心底藏著的
                  </p>
                </div>
              ) : (
                <div className="max-w-xl w-full mx-auto space-y-5">
                  {squareActionError ? (
                    <p
                      className="text-[13px] font-medium text-red-600"
                      role="alert"
                    >
                      {squareActionError}
                    </p>
                  ) : null}
                  <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-5 md:p-6">
                    <p className="text-[11px] font-semibold text-amber-900/80 uppercase tracking-wide mb-2">
                      當時收下的樣子 ·{" "}
                      {selectedUnifiedFavorite.kind === "square"
                        ? (squareAddressSubtitle(
                            selectedUnifiedFavorite.row.snapshotShowSender,
                            selectedUnifiedFavorite.row.snapshotShowRecipient,
                            selectedUnifiedFavorite.row.snapshotSenderEmail,
                            selectedUnifiedFavorite.row.snapshotRecipientEmail,
                          ) ?? "寄件／收件已隱藏")
                        : (() => {
                            const em =
                              selectedUnifiedFavorite.row.snapshotAuthorEmail ??
                              "";
                            const nick =
                              displayNameByEmail.get(em.trim().toLowerCase()) ??
                              "";
                            return (
                              squareAddressSubtitle(true, false, em, "", {
                                sourceKind: "capsule",
                                senderDisplayName: nick,
                              }) ?? "膠囊"
                            );
                          })()}
                    </p>
                    {selectedUnifiedFavorite.kind === "capsule" ? (
                      <div className="mb-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black",
                            capsuleTypeMeta(
                              selectedUnifiedFavorite.row.snapshotCapsuleType,
                            ).chipClass,
                          )}
                        >
                          #
                          {
                            capsuleTypeMeta(
                              selectedUnifiedFavorite.row.snapshotCapsuleType,
                            ).label
                          }
                        </span>
                      </div>
                    ) : null}
                    <p className="text-[16px] md:text-[18px] leading-relaxed text-apple-near-black whitespace-pre-wrap">
                      {selectedUnifiedFavorite.row.snapshotContent}
                    </p>
                    <p className="text-[11px] text-black/40 mt-4 tabular-nums">
                      預定開啟{" "}
                      {selectedUnifiedFavorite.row.snapshotScheduledAt
                        .toDate()
                        .toLocaleString("zh-TW", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void (selectedUnifiedFavorite.kind === "square"
                        ? handleUnfavoriteSquare(
                            selectedUnifiedFavorite.row.postSourceMessageId,
                          )
                        : handleUnfavoriteCapsuleById(
                            selectedUnifiedFavorite.row.capsuleId,
                          ))
                    }
                    className="rounded-xl border border-black/[0.12] bg-white px-4 py-2.5 text-[13px] font-semibold text-apple-near-black hover:bg-black/[0.03]"
                  >
                    從心底拿出
                  </button>
                </div>
              )
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === "new" || activeTab === "direct" ? (
                  <motion.div
                    key="compose"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="max-w-md w-full mx-auto"
                  >
                    <div className="md:hidden flex items-center justify-between mb-5">
                      <h2 className="text-[20px] font-bold tracking-tight">
                        {composeMode === "capsule" ? "秘密膠囊" : "定向發送"}
                      </h2>
                      <PenTool className="w-5 h-5 text-apple-blue" />
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-black/[0.08] bg-white p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setComposeMode("capsule");
                          setActiveTab("new");
                          setComposeError("");
                          setComposeSuccess("");
                        }}
                        className={cn(
                          "rounded-lg px-3 py-2 text-[12px] font-semibold transition-all",
                          composeMode === "capsule"
                            ? "bg-violet-600 text-white"
                            : "text-black/65 hover:bg-black/[0.04]",
                        )}
                      >
                        秘密膠囊
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setComposeMode("direct");
                          setActiveTab("direct");
                          setComposeError("");
                          setComposeSuccess("");
                        }}
                        className={cn(
                          "rounded-lg px-3 py-2 text-[12px] font-semibold transition-all",
                          composeMode === "direct"
                            ? "bg-violet-600 text-white"
                            : "text-black/65 hover:bg-black/[0.04]",
                        )}
                      >
                        定向發送
                      </button>
                    </div>

                    <form onSubmit={sendMessage} className="space-y-4">
                      {composeMode === "direct" ? (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-black/35 uppercase tracking-wider ml-0.5">
                            要寄給誰
                          </label>
                          <input
                            name="recipientEmail"
                            type="email"
                            required
                            placeholder="example@future.com"
                            className="w-full text-[15px] font-medium bg-apple-gray/50 rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-apple-blue transition-all border-none"
                          />
                        </div>
                      ) : null}
                      {composeMode === "capsule" ? (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-black/35 uppercase tracking-wider ml-0.5">
                            膠囊類型
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {CAPSULE_TYPE_OPTIONS.map((opt) => {
                              const meta = capsuleTypeMeta(opt.type);
                              const active = composeCapsuleType === opt.type;
                              return (
                                <button
                                  key={opt.type}
                                  type="button"
                                  onClick={() =>
                                    setComposeCapsuleType(opt.type)
                                  }
                                  className={cn(
                                    "rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors",
                                    active
                                      ? meta.activeChipClass
                                      : meta.chipClass,
                                  )}
                                >
                                  #{opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-black/35 uppercase tracking-wider ml-0.5">
                          {composeMode === "capsule" ? "膠囊內容" : "定向內容"}
                        </label>
                        <textarea
                          name="content"
                          required
                          maxLength={TEXT_LIMIT}
                          rows={isMobileDetailView ? 7 : 5}
                          placeholder={
                            composeMode === "capsule"
                              ? "今天上學、補習、約飯、想說的都可以…"
                              : "寫給特定帳號的一段話…"
                          }
                          className="w-full text-[14px] leading-relaxed bg-apple-gray/50 rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-apple-blue transition-all border-none resize-none"
                        />
                      </div>
                      {composeMode === "direct" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-black/35 uppercase tracking-wider ml-0.5">
                              什麼時候拆（可留空）
                            </label>
                            <input
                              name="scheduledAt"
                              type="datetime-local"
                              className="w-full text-[13px] bg-apple-gray/50 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-apple-blue transition-all border-none"
                            />
                            <p className="text-[10px] text-black/40">
                              不填即時發送
                            </p>
                          </div>
                          <div className="flex flex-col justify-center">
                            <label className="flex items-center gap-2 cursor-pointer mt-2 md:mt-5">
                              <input
                                name="isWaitListVisible"
                                type="checkbox"
                                defaultChecked
                                className="w-4 h-4 rounded-full accent-apple-blue"
                              />
                              <span className="text-[11px] font-bold text-black/30 uppercase tracking-widest">
                                讓對方列表裡也看得到
                              </span>
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className=" flex gap-2 items-center">
                            <label className="text-[10px] font-bold text-black/35 uppercase tracking-wider ml-0.5">
                              發送方式
                            </label>
                            <div className="inline-block rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1 text-[12px] font-semibold text-emerald-800">
                              膠囊即時送出
                            </div>
                          </div>
                          {/* <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-[11px] font-semibold leading-snug text-stone-800">
                            秘密膠囊送出後不會自動貼牆；想公開給大家看，請到「我的
                            → 寄件匣」在信件詳情裡再貼廣場。
                          </div> */}
                        </div>
                      )}

                      {(composeError || composeSuccess) && (
                        <p
                          className={cn(
                            "text-[13px] font-medium tracking-tight text-center",
                            composeError ? "text-red-500" : "text-emerald-600",
                          )}
                          role="status"
                        >
                          {composeError || composeSuccess}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-apple-blue text-white py-3 rounded-xl text-[15px] font-semibold tracking-tight hover:bg-apple-blue/90 shadow-sm transition-all active:scale-[0.98]"
                      >
                        {loading
                          ? "寄送中…"
                          : composeMode === "capsule"
                            ? "送出膠囊"
                            : "排程寄出"}
                      </button>
                    </form>
                  </motion.div>
                ) : currentMessage ? (
                  <motion.div
                    key={currentMessage._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-xl w-full mx-auto"
                  >
                    <div className="text-[11px] font-semibold text-apple-blue uppercase tracking-wide mb-2">
                      {activeTab === "outbox" ? (
                        <>
                          TO:{" "}
                          {emailsEqual(
                            currentMessage.recipientEmail,
                            user?.email,
                          )
                            ? "未來的自己"
                            : (currentMessage.recipientEmail ?? "")}
                        </>
                      ) : (
                        <>FROM: {currentMessage.senderEmail ?? ""}</>
                      )}
                    </div>

                    {canPublishCurrentMessage &&
                    (activeTab === "inbox" || activeTab === "outbox") ? (
                      <div className="mb-4 rounded-xl border border-violet-200/80 bg-violet-50/60 p-3 space-y-2">
                        <p className="text-[10px] font-bold text-violet-900/75 uppercase tracking-wider">
                          貼給大家看
                        </p>
                        {squareActionError ? (
                          <p className="text-[12px] text-red-600">
                            {squareActionError}
                          </p>
                        ) : null}
                        {liveSquareForSelected ? (
                          <div className="flex flex-wrap items-center gap-2 text-[12px] text-violet-950/90">
                            <span className="font-medium">已經貼在牆上了</span>
                            <span className="text-black/45">
                              {liveSquareForSelected.includeThreadInSnapshot
                                ? "主文＋往來"
                                : "僅主文"}
                              {liveSquareForSelected.includeCapsulePrivateInSnapshot
                                ? "＋膠囊私訊摘錄"
                                : ""}
                              {" · "}
                              {liveSquareForSelected.repliesPublic
                                ? "可廣場評論"
                                : "僅讚／踩／中立與收藏"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void handleUnpublishSquare(currentMessage._id)
                              }
                              className="ml-auto text-[12px] font-semibold text-violet-800 underline-offset-2 hover:underline"
                            >
                              從廣場撤下
                            </button>
                          </div>
                        ) : currentMessage.isDue ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPublishIncludeThread(false);
                              setPublishIncludeCapsulePrivate(false);
                              setPublishRepliesPublic(false);
                              setPublishShowSender(true);
                              setPublishShowRecipient(true);
                              setSquareActionError("");
                              setPublishModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-violet-700"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
                            貼到牆上
                          </button>
                        ) : activeTab === "inbox" ? (
                          <p className="text-[12px] leading-relaxed text-violet-950/85">
                            這封信還沒到拆封時間，不能從這裡貼牆。拆封後，你或對方就可以把內容貼給大家看。
                          </p>
                        ) : (
                          <p className="text-[12px] leading-relaxed text-violet-950/85">
                            還沒拆封前，不能在這裡貼牆。若想先給大家看，請按「編輯」，勾「順手貼到牆上」再存檔。
                          </p>
                        )}
                      </div>
                    ) : null}

                    {canUseLetterExchange && currentMessage ? (
                      <div className="mb-4 rounded-2xl border border-sky-200/70 bg-gradient-to-b from-sky-50/80 to-white p-4 shadow-sm ring-1 ring-sky-100/50">
                        <div className="flex items-center gap-2 mb-2">
                          <MessagesSquare
                            className="w-4 h-4 text-sky-600 shrink-0"
                            aria-hidden
                          />
                          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-900/75">
                            雙方往來摘錄
                          </p>
                        </div>
                        <p className="text-[11px] text-black/45 leading-snug mb-2">
                          僅寄件與收件人可見。若廣場已勾「主文＋雙方往來」，此處每新增一則往來，廣場上的該貼快照會
                          <strong className="font-semibold text-sky-900/90">
                            自動更新
                          </strong>
                          （無需再按儲存）；僅主文或未上廣場則不影響廣場。
                        </p>
                        {liveScheduledRow?.exchangeLog?.trim() ? (
                          <pre className="mb-3 max-h-40 overflow-y-auto apple-scroll rounded-xl border border-black/[0.06] bg-white/90 p-3 text-[12px] leading-relaxed text-black/75 whitespace-pre-wrap font-sans">
                            {liveScheduledRow.exchangeLog}
                          </pre>
                        ) : (
                          <p className="mb-3 text-[12px] text-black/35 italic">
                            尚無往來紀錄
                          </p>
                        )}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <textarea
                            value={exchangeAppendDraft}
                            onChange={(e) =>
                              setExchangeAppendDraft(e.target.value)
                            }
                            maxLength={TEXT_LIMIT}
                            rows={2}
                            placeholder="寫下一則往來…"
                            className="flex-1 min-w-0 rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[13px] text-stone-900 placeholder:text-stone-400 outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                          />
                          <button
                            type="button"
                            disabled={exchangeAppendBusy}
                            onClick={() =>
                              void handleAppendLetterExchange(
                                currentMessage._id,
                              )
                            }
                            className="shrink-0 rounded-xl bg-sky-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                          >
                            {exchangeAppendBusy ? "送出中…" : "加入往來"}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {activeTab === "outbox" && !currentMessage.isDue ? (
                      <div className="mb-4 space-y-3">
                        {!outboxEditOpen ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void beginOutboxEdit()}
                              disabled={outboxEditLoading || outboxEditSaving}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 text-[13px] font-medium text-apple-near-black shadow-sm hover:bg-apple-gray/80 disabled:opacity-50"
                            >
                              {outboxEditLoading ? (
                                <Loader2
                                  className="w-3.5 h-3.5 animate-spin"
                                  aria-hidden
                                />
                              ) : (
                                <Pencil className="w-3.5 h-3.5" aria-hidden />
                              )}
                              編輯
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOutboxEditError("");
                                setOutboxDeleteConfirmOpen(true);
                              }}
                              disabled={outboxEditLoading || outboxEditSaving}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200/80 bg-red-50/90 px-3 py-1.5 text-[13px] font-medium text-red-700 hover:bg-red-100/90 disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden />
                              刪除
                            </button>
                          </div>
                        ) : null}
                        {outboxEditOpen && outboxEditForm ? (
                          <form
                            onSubmit={(ev) => void saveOutboxEdit(ev)}
                            className="space-y-3 rounded-xl border border-black/[0.08] bg-apple-gray/40 p-4"
                          >
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-black/35 uppercase tracking-wider">
                                收件人
                              </label>
                              <input
                                type="email"
                                required
                                value={outboxEditForm.recipientEmail}
                                onChange={(ev) =>
                                  setOutboxEditForm((f) =>
                                    f
                                      ? {
                                          ...f,
                                          recipientEmail: ev.target.value,
                                        }
                                      : f,
                                  )
                                }
                                className="w-full text-[14px] font-medium bg-white rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-apple-blue border border-black/[0.06]"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-black/35 uppercase tracking-wider">
                                內容
                              </label>
                              <textarea
                                required
                                maxLength={TEXT_LIMIT}
                                rows={5}
                                value={outboxEditForm.content}
                                onChange={(ev) =>
                                  setOutboxEditForm((f) =>
                                    f ? { ...f, content: ev.target.value } : f,
                                  )
                                }
                                className="w-full text-[14px] leading-relaxed bg-white rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-apple-blue border border-black/[0.06] resize-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-black/35 uppercase tracking-wider">
                                開啟時間
                              </label>
                              <input
                                type="datetime-local"
                                required
                                value={outboxEditForm.scheduledAtLocal}
                                onChange={(ev) =>
                                  setOutboxEditForm((f) =>
                                    f
                                      ? {
                                          ...f,
                                          scheduledAtLocal: ev.target.value,
                                        }
                                      : f,
                                  )
                                }
                                className="w-full text-[13px] bg-white rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-apple-blue border border-black/[0.06]"
                              />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={outboxEditForm.isWaitListVisible}
                                onChange={(ev) =>
                                  setOutboxEditForm((f) =>
                                    f
                                      ? {
                                          ...f,
                                          isWaitListVisible: ev.target.checked,
                                        }
                                      : f,
                                  )
                                }
                                className="rounded accent-apple-blue"
                              />
                              <span className="text-[12px] text-black/55">
                                在列表中公開
                              </span>
                            </label>
                            <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-b from-violet-50/90 to-white p-3 shadow-sm ring-1 ring-violet-100/50 space-y-3">
                              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white/90 px-2.5 py-2 ring-1 ring-violet-200/40">
                                <span className="text-[12px] font-semibold text-violet-950">
                                  順手貼到牆上
                                </span>
                                <input
                                  type="checkbox"
                                  checked={outboxEditForm.publishToSquare}
                                  onChange={(ev) =>
                                    setOutboxEditForm((f) =>
                                      f
                                        ? {
                                            ...f,
                                            publishToSquare: ev.target.checked,
                                            squareRepliesPublic: ev.target
                                              .checked
                                              ? f.squareRepliesPublic
                                              : false,
                                            squareIncludeThread: ev.target
                                              .checked
                                              ? f.squareIncludeThread
                                              : false,
                                            squareIncludeCapsulePrivate: ev
                                              .target.checked
                                              ? f.squareIncludeCapsulePrivate
                                              : false,
                                          }
                                        : f,
                                    )
                                  }
                                  className="h-5 w-5 shrink-0 rounded-md border-violet-300 accent-violet-600"
                                  aria-label="順手貼到牆上"
                                />
                              </label>
                              <div
                                className={cn(
                                  "space-y-3",
                                  !outboxEditForm.publishToSquare &&
                                    "pointer-events-none opacity-40",
                                )}
                              >
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-black/35 mb-1.5">
                                    公開內容範圍
                                  </p>
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOutboxEditForm((f) =>
                                          f
                                            ? {
                                                ...f,
                                                squareIncludeThread: false,
                                              }
                                            : f,
                                        )
                                      }
                                      className={cn(
                                        "rounded-xl border px-2.5 py-2 text-left text-[11px] font-medium transition-all",
                                        !outboxEditForm.squareIncludeThread
                                          ? "border-violet-500 bg-violet-600 text-white shadow-sm"
                                          : "border-black/[0.08] bg-white text-black/70 hover:border-violet-200",
                                      )}
                                    >
                                      僅主文
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOutboxEditForm((f) =>
                                          f
                                            ? {
                                                ...f,
                                                squareIncludeThread: true,
                                              }
                                            : f,
                                        )
                                      }
                                      className={cn(
                                        "rounded-xl border px-2.5 py-2 text-left text-[11px] font-medium transition-all",
                                        outboxEditForm.squareIncludeThread
                                          ? "border-violet-500 bg-violet-600 text-white shadow-sm"
                                          : "border-black/[0.08] bg-white text-black/70 hover:border-violet-200",
                                      )}
                                    >
                                      主文＋往來
                                    </button>
                                  </div>
                                </div>
                                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-violet-200/60 bg-white/80 px-2.5 py-2">
                                  <input
                                    type="checkbox"
                                    checked={
                                      outboxEditForm.squareIncludeCapsulePrivate
                                    }
                                    onChange={(ev) =>
                                      setOutboxEditForm((f) =>
                                        f
                                          ? {
                                              ...f,
                                              squareIncludeCapsulePrivate:
                                                ev.target.checked,
                                            }
                                          : f,
                                      )
                                    }
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-300 accent-violet-600"
                                  />
                                  <span className="min-w-0 text-[11px] font-medium leading-snug text-violet-950/90">
                                    廣場快照併入
                                    <strong className="font-semibold">
                                      膠囊私訊摘錄
                                    </strong>
                                    （與廣場評論分開；有私訊往來才會反映在快照）
                                  </span>
                                </label>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-black/35 mb-1.5">
                                    廣場互動
                                  </p>
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOutboxEditForm((f) =>
                                          f
                                            ? {
                                                ...f,
                                                squareRepliesPublic: false,
                                              }
                                            : f,
                                        )
                                      }
                                      className={cn(
                                        "rounded-xl border px-2.5 py-2 text-left text-[11px] font-medium transition-all",
                                        !outboxEditForm.squareRepliesPublic
                                          ? "border-violet-500 bg-violet-600 text-white shadow-sm"
                                          : "border-black/[0.08] bg-white text-black/70 hover:border-violet-200",
                                      )}
                                    >
                                      不開放留言
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOutboxEditForm((f) =>
                                          f
                                            ? {
                                                ...f,
                                                squareRepliesPublic: true,
                                              }
                                            : f,
                                        )
                                      }
                                      className={cn(
                                        "rounded-xl border px-2.5 py-2 text-left text-[11px] font-medium transition-all",
                                        outboxEditForm.squareRepliesPublic
                                          ? "border-violet-500 bg-violet-600 text-white shadow-sm"
                                          : "border-black/[0.08] bg-white text-black/70 hover:border-violet-200",
                                      )}
                                    >
                                      開放留言
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-black/35 mb-1.5">
                                    廣場顯示信箱
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOutboxEditForm((f) =>
                                          f
                                            ? {
                                                ...f,
                                                squareShowSender:
                                                  !f.squareShowSender,
                                              }
                                            : f,
                                        )
                                      }
                                      className={cn(
                                        "rounded-xl border px-2 py-1.5 text-center text-[10px] font-medium",
                                        outboxEditForm.squareShowSender
                                          ? "border-violet-500 bg-violet-50 text-violet-900"
                                          : "border-black/[0.08] bg-white text-black/40 line-through",
                                      )}
                                    >
                                      FROM
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOutboxEditForm((f) =>
                                          f
                                            ? {
                                                ...f,
                                                squareShowRecipient:
                                                  !f.squareShowRecipient,
                                              }
                                            : f,
                                        )
                                      }
                                      className={cn(
                                        "rounded-xl border px-2 py-1.5 text-center text-[10px] font-medium",
                                        outboxEditForm.squareShowRecipient
                                          ? "border-violet-500 bg-violet-50 text-violet-900"
                                          : "border-black/[0.08] bg-white text-black/40 line-through",
                                      )}
                                    >
                                      TO
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                type="submit"
                                disabled={outboxEditSaving}
                                className="rounded-lg bg-apple-blue px-4 py-2 text-[13px] font-semibold text-white hover:bg-apple-blue/90 disabled:opacity-50"
                              >
                                {outboxEditSaving ? "儲存中…" : "儲存變更"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelOutboxEdit}
                                disabled={outboxEditSaving}
                                className="rounded-lg border border-black/[0.12] bg-white px-4 py-2 text-[13px] font-medium hover:bg-black/[0.03] disabled:opacity-50"
                              >
                                取消
                              </button>
                            </div>
                          </form>
                        ) : null}
                        {outboxEditError ? (
                          <p
                            className="text-[13px] font-medium text-red-600"
                            role="alert"
                          >
                            {outboxEditError}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div
                      className={cn(
                        "transition-all duration-1000",
                        !currentMessage.isDue &&
                          (activeTab === "inbox" || activeTab === "outbox")
                          ? "blur-3xl opacity-5 select-none grayscale"
                          : "opacity-100",
                      )}
                    >
                      <h1 className="text-[20px] md:text-[26px] font-semibold tracking-tight leading-snug mb-5 md:mb-6">
                        {!currentMessage.isDue &&
                        (activeTab === "inbox" || activeTab === "outbox")
                          ? "這段記憶尚未被時光開啟"
                          : (currentMessage.content ?? "")}
                      </h1>
                    </div>

                    {!currentMessage.isDue &&
                      (activeTab === "inbox" || activeTab === "outbox") && (
                        <div className="mt-5 flex flex-col items-center text-center">
                          <div className="w-11 h-11 bg-apple-gray rounded-full flex items-center justify-center mb-3">
                            <Lock className="w-5 h-5 text-black/25" />
                          </div>
                          <p className="text-[13px] font-medium text-black/45 mb-2">
                            距離開啟還有
                          </p>
                          <div className="text-[22px] md:text-[26px] font-semibold tracking-tight text-apple-blue tabular-nums">
                            <Countdown
                              targetDate={currentMessage.scheduledAt}
                            />
                          </div>
                        </div>
                      )}

                    {(() => {
                      const ue = user?.email;
                      /** 頂部已有 FROM／TO，與「收件匣＝寄給我」重複時不顯示 */
                      const showMetaSender =
                        activeTab === "outbox" &&
                        Boolean(currentMessage.senderEmail) &&
                        !emailsEqual(currentMessage.senderEmail, ue);
                      const showMetaRecipient =
                        activeTab === "inbox" &&
                        Boolean(currentMessage.recipientEmail) &&
                        !emailsEqual(currentMessage.recipientEmail, ue);
                      const metaExtras =
                        (showMetaSender ? 1 : 0) + (showMetaRecipient ? 1 : 0);
                      const gridCols =
                        metaExtras === 0
                          ? "grid-cols-1 sm:grid-cols-3"
                          : metaExtras === 1
                            ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-4"
                            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5";
                      return (
                        <div
                          className={cn(
                            "mt-8 pt-5 border-t border-black/[0.06] grid gap-x-3 gap-y-4 md:gap-x-4",
                            gridCols,
                          )}
                        >
                          {showMetaSender ? (
                            <MetaItem
                              label="誰寫的"
                              value={currentMessage.senderEmail}
                            />
                          ) : null}
                          {showMetaRecipient ? (
                            <MetaItem
                              label="給誰"
                              value={currentMessage.recipientEmail ?? "—"}
                            />
                          ) : null}
                          <MetaItem
                            label="目標時間"
                            value={new Date(
                              currentMessage.scheduledAt,
                            ).toLocaleDateString("zh-TW", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          />
                          <MetaItem
                            label="狀態"
                            value={currentMessage.isDue ? "已解封" : "密封中"}
                          />
                          <MetaItem
                            label="小暗號"
                            value={`#${currentMessage._id.slice(-6).toUpperCase()}`}
                          />
                        </div>
                      );
                    })()}
                  </motion.div>
                ) : (
                  <motion.div
                    key="mailbox-empty"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18 }}
                    className="max-w-sm mx-auto text-center py-12 px-4"
                  >
                    <div className="w-14 h-14 bg-apple-gray rounded-full flex items-center justify-center mx-auto mb-4">
                      <Inbox className="w-7 h-7 text-black/12" />
                    </div>
                    <h2 className="text-[18px] md:text-[20px] font-semibold tracking-tight mb-2">
                      選一則小紙條
                    </h2>
                    <p className="text-[13px] text-black/40 leading-snug">
                      從左側列表點一則，或到底下「偷偷寫」丟一顆膠囊。
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </main>
      </div>

      {/* 手機底欄：與主色同一綠底 */}
      {!isAdmin ? (
        <div className="relative z-50 flex items-end justify-around gap-1 border-t border-stone-900/35 bg-[#1f4a47] px-4 pt-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] md:hidden">
          <MobileNavItem
            active={activeTab === "secret"}
            onDark
            onClick={() => {
              setActiveTab("secret");
              setSelectedMessageId(null);
              setSquareSelectedPostId(null);
              setFavoriteSelectedId(null);
              setSquareActionError("");
            }}
            ariaLabel="秘密"
            icon={
              <Sparkles className="h-10 w-10" strokeWidth={2.5} aria-hidden />
            }
          />
          <div className="flex flex-col items-center justify-end pb-0.5">
            <button
              type="button"
              aria-label="偷偷寫"
              onClick={() => {
                setActiveTab("new");
                setComposeMode("capsule");
                setSelectedMessageId(null);
                setSquareSelectedPostId(null);
                setFavoriteSelectedId(null);
                setComposeError("");
                setComposeSuccess("");
              }}
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-[3px] border-stone-900 bg-violet-600 text-white shadow-[5px_5px_0_0_rgba(15,36,32,0.55)] transition-transform active:translate-y-0.5 active:shadow-[2px_2px_0_0_rgba(15,36,32,0.55)]",
                (activeTab === "new" || activeTab === "direct") &&
                  "bg-fuchsia-600",
              )}
            >
              <PenTool className="h-7 w-7" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          <MobileNavItem
            active={
              activeTab === "mine" ||
              activeTab === "inbox" ||
              activeTab === "outbox" ||
              activeTab === "favorites" ||
              activeTab === "space" ||
              activeTab === "admin" ||
              activeTab === "admin_ops" ||
              activeTab === "chat"
            }
            onDark
            onClick={() => {
              setActiveTab("mine");
              setSelectedMessageId(null);
              setSquareSelectedPostId(null);
              setFavoriteSelectedId(null);
              setSelectedChatThreadKey(null);
              setSelectedAdminReportId(null);
              setSquareActionError("");
            }}
            ariaLabel="我的"
            icon={<User className="h-10 w-10" strokeWidth={2.25} aria-hidden />}
          />
        </div>
      ) : null}

      <AnimatePresence>
        {chatPeerProfileOpen && selectedChatPeerProfile ? (
          <motion.div
            key="chat-peer-profile"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[230] flex items-end justify-center sm:items-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={() => setChatPeerProfileOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[min(100%,22rem)] rounded-2xl bg-white p-5 shadow-apple-card ring-1 ring-black/[0.06]"
            >
              <p className="text-[16px] font-black text-apple-near-black">
                對方資訊
              </p>
              <p className="mt-3 text-[12px] text-black/45">暱稱</p>
              <p className="text-[15px] font-semibold text-apple-near-black">
                {selectedChatPeerProfile.displayName || "未命名"}
              </p>
              <p className="mt-2 text-[12px] text-black/45">性別 / 年齡</p>
              <p className="text-[14px] text-apple-near-black">
                {selectedChatPeerProfile.gender || "未填"} /{" "}
                {Number(selectedChatPeerProfile.ageYears) || 0}
              </p>
              <p className="mt-2 text-[12px] text-black/45">自我介紹</p>
              <p className="text-[13px] leading-relaxed text-apple-near-black whitespace-pre-wrap">
                {selectedChatPeerProfile.profileNote || "（未填）"}
              </p>
              <button
                type="button"
                onClick={() => setChatPeerProfileOpen(false)}
                className="mt-4 w-full rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-4 py-2.5 text-[14px] font-black text-stone-900"
              >
                關閉
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {outboxDeleteConfirmOpen &&
        currentMessage &&
        activeTab === "outbox" &&
        !currentMessage.isDue ? (
          <motion.div
            key="outbox-delete-confirm"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={() =>
              !outboxEditLoading && setOutboxDeleteConfirmOpen(false)
            }
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="outbox-delete-dialog-title"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[min(100%,22rem)] rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-5 shadow-[6px_6px_0_0_#0f2420]"
            >
              <h3
                id="outbox-delete-dialog-title"
                className="text-[18px] font-black tracking-tight text-stone-900"
              >
                確認刪除？
              </h3>
              <p className="mt-2 text-[13px] font-bold leading-relaxed text-stone-600">
                將永久刪除這封尚未到開啟時間的訊息，無法復原。
              </p>
              <p className="mt-4 text-[14px] font-black text-stone-900 truncate">
                {emailsEqual(currentMessage.recipientEmail, user?.email)
                  ? "致未來的自己"
                  : `致 ${currentMessage.recipientEmail?.split("@")[0] ?? "收件人"}`}
              </p>
              <p className="mt-1 text-[11px] font-bold text-stone-500 tabular-nums">
                預定開啟{" "}
                {new Date(currentMessage.scheduledAt).toLocaleString("zh-TW", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {outboxEditError ? (
                <p
                  className="mt-3 text-[13px] font-bold text-red-600"
                  role="alert"
                >
                  {outboxEditError}
                </p>
              ) : null}
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  disabled={outboxEditLoading}
                  onClick={() => {
                    setOutboxEditError("");
                    setOutboxDeleteConfirmOpen(false);
                  }}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={outboxEditLoading}
                  onClick={() => void confirmDeleteOutboxMessage()}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-red-500 px-4 py-2.5 text-[14px] font-black text-white active:translate-y-px disabled:opacity-50"
                >
                  {outboxEditLoading ? "刪除中…" : "確認刪除"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {publishModalOpen ? (
          <motion.div
            key="publish-square"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={() => !loading && setPublishModalOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="publish-square-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[min(100%,26rem)] overflow-hidden rounded-2xl bg-white shadow-apple-card ring-1 ring-black/[0.06]"
            >
              <div className="bg-gradient-to-r from-violet-600 via-violet-500 to-fuchsia-500 px-5 py-4">
                <h3
                  id="publish-square-title"
                  className="text-[18px] font-semibold tracking-tight text-white"
                >
                  貼到牆上給大家看
                </h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/85">
                  寄件人或收件人皆可發布。請分兩步選擇：要公開哪些文字、以及廣場上允許哪些互動。
                </p>
              </div>
              <div className="space-y-5 p-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/35 mb-2">
                    公開內容範圍
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPublishIncludeThread(false)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left text-[13px] font-medium transition-all",
                        !publishIncludeThread
                          ? "border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-900/20 ring-2 ring-violet-300/50"
                          : "border-black/[0.08] bg-apple-gray/30 text-black/75 hover:border-violet-200 hover:bg-white",
                      )}
                    >
                      僅主文
                      <span className="mt-1 block text-[11px] font-normal opacity-90">
                        廣場快照只含信件主文
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublishIncludeThread(true)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left text-[13px] font-medium transition-all",
                        publishIncludeThread
                          ? "border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-900/20 ring-2 ring-violet-300/50"
                          : "border-black/[0.08] bg-apple-gray/30 text-black/75 hover:border-violet-200 hover:bg-white",
                      )}
                    >
                      主文＋雙方往來
                      <span className="mt-1 block text-[11px] font-normal opacity-90">
                        一併納入信內「雙方往來摘錄」
                      </span>
                    </button>
                  </div>
                  <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl border border-black/[0.08] bg-apple-gray/20 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={publishIncludeCapsulePrivate}
                      onChange={(e) =>
                        setPublishIncludeCapsulePrivate(e.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-400 accent-violet-600"
                    />
                    <span className="min-w-0 text-[12px] font-medium leading-snug text-black/75">
                      廣場快照併入
                      <strong className="font-semibold text-black/85">
                        膠囊私訊摘錄
                      </strong>
                      （與下方「開放留言」所指的
                      <strong className="font-semibold">廣場評論</strong>分開）
                    </span>
                  </label>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/35 mb-2">
                    廣場互動
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPublishRepliesPublic(false)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left text-[13px] font-medium transition-all",
                        !publishRepliesPublic
                          ? "border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-900/20 ring-2 ring-violet-300/50"
                          : "border-black/[0.08] bg-apple-gray/30 text-black/75 hover:border-violet-200 hover:bg-white",
                      )}
                    >
                      不開放留言
                      <span className="mt-1 block text-[11px] font-normal opacity-90">
                        僅讚、踩、中立與收藏
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublishRepliesPublic(true)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left text-[13px] font-medium transition-all",
                        publishRepliesPublic
                          ? "border-violet-500 bg-violet-600 text-white shadow-lg shadow-violet-900/20 ring-2 ring-violet-300/50"
                          : "border-black/[0.08] bg-apple-gray/30 text-black/75 hover:border-violet-200 hover:bg-white",
                      )}
                    >
                      開放留言
                      <span className="mt-1 block text-[11px] font-normal opacity-90">
                        可評論，並含讚踩中立與收藏
                      </span>
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/35 mb-2">
                    廣場顯示信箱
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPublishShowSender((v) => !v)}
                      className={cn(
                        "rounded-xl border px-2 py-2.5 text-center text-[12px] font-medium transition-all",
                        publishShowSender
                          ? "border-violet-500 bg-violet-50 text-violet-900"
                          : "border-black/[0.08] bg-apple-gray/20 text-black/40 line-through",
                      )}
                    >
                      顯示寄件 FROM
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublishShowRecipient((v) => !v)}
                      className={cn(
                        "rounded-xl border px-2 py-2.5 text-center text-[12px] font-medium transition-all",
                        publishShowRecipient
                          ? "border-violet-500 bg-violet-50 text-violet-900"
                          : "border-black/[0.08] bg-apple-gray/20 text-black/40 line-through",
                      )}
                    >
                      顯示收件 TO
                    </button>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-black/40">
                  撤下後廣場列表不再顯示；他人已收藏者仍保留當時快照。往來摘錄可在信件詳情中補寫。若已勾「主文＋往來」，雙方在信內新增往來後，廣場快照會自動更新。
                </p>
              </div>
              {squareActionError ? (
                <p className="px-5 text-[13px] text-red-600" role="alert">
                  {squareActionError}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 border-t border-black/[0.06] bg-apple-gray/20 px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setSquareActionError("");
                    setPublishModalOpen(false);
                  }}
                  className="w-full sm:w-auto rounded-xl border border-black/[0.1] bg-white px-4 py-2.5 text-[14px] font-semibold text-apple-near-black hover:bg-black/[0.03] disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void submitPublishToSquare()}
                  className="w-full sm:w-auto rounded-xl bg-violet-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-md shadow-violet-900/15 hover:bg-violet-700 disabled:opacity-50"
                >
                  {loading ? "處理中…" : "確認公開"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {capsuleOpen ? (
          <motion.div
            key="capsule-overlay"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[240] flex items-center justify-center bg-[#1a3d38]/88 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={() => closeCapsuleDrawer()}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="capsule-title"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[min(88vh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-[3px] border-stone-900 bg-[#fffef7] shadow-[8px_8px_0_0_#0f2420]"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b-[3px] border-stone-900 bg-[#f4dc3a] px-3 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Sparkles
                    className="h-5 w-5 shrink-0 text-stone-900"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  <h2
                    id="capsule-title"
                    className="shrink-0 text-[17px] font-black tracking-tight text-stone-900"
                  >
                    秘密膠囊
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (capsulePost) {
                        openReportModal("capsule", capsulePost?.id);
                      }
                    }}
                    className="inline-flex p-1.5 text-stone-400 transition-colors hover:text-red-500 active:scale-95"
                    title="檢舉膠囊"
                  >
                    <AlertTriangle
                      className="h-[22px] w-[22px]"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => closeCapsuleDrawer()}
                  className="rounded-xl border-2 border-transparent p-2 font-black text-stone-900 hover:bg-white/50"
                  aria-label="關閉"
                >
                  <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto apple-scroll px-4 py-4">
                {squareActionError ? (
                  <p
                    className="mb-3 text-[13px] font-medium text-red-600"
                    role="alert"
                  >
                    {squareActionError}
                  </p>
                ) : null}

                {capsuleSwitching ? (
                  <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 py-8 text-center">
                    <Loader2
                      className="h-8 w-8 animate-spin text-stone-600"
                      aria-hidden
                    />
                    <p className="text-[15px] font-black text-stone-800">
                      正在打開新膠囊…
                    </p>
                  </div>
                ) : !capsulePost ? (
                  <div className="space-y-4 py-2 text-center">
                    <Package
                      className="mx-auto h-12 w-12 text-stone-400"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <p className="text-[15px] font-black leading-snug text-stone-900">
                      {capsuleEmptyReason === "wall_empty"
                        ? "目前還沒有可抽的秘密膠囊。"
                        : capsuleEmptyReason === "timing"
                          ? "有些紙條還沒到開啟時間，膠囊暫時抽不到；等等再試。"
                          : capsuleEmptyReason === "only_self"
                            ? "目前只有你自己發的膠囊，抽取會排除自己；等等看其他人資料。"
                            : capsuleEmptyReason === "all_saved"
                              ? "能抽的別人紙條你都收進心底啦；到清單慢慢看，或從心底拿出幾則再來抽。"
                              : "這則剛好不在公開清單了，可按下方「換一個」再試，或關掉再開。"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl border-[3px] border-stone-900 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-col items-start justify-center pt-0.5">
                          {(() => {
                            const senderEmail = capsulePost?.authorEmail ?? "";
                            const senderDisplayName =
                              displayNameByEmail.get(
                                senderEmail.trim().toLowerCase(),
                              ) ?? "";
                            const line = squareAddressSubtitle(
                              true,
                              false,
                              senderEmail,
                              "",
                              {
                                sourceKind: "capsule",
                                senderDisplayName,
                              },
                            );
                            return line ? (
                              <p className="break-words text-[14px] font-black text-stone-800">
                                {line}
                              </p>
                            ) : (
                              <p className="text-[12px] font-bold text-stone-400">
                                不公開信箱
                              </p>
                            );
                          })()}
                        </div>
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openSpace(
                                capsulePost.authorIdentity.toHexString(),
                              )
                            }
                            className="shrink-0 h-9 rounded-xl border-2 border-stone-900 bg-stone-100 px-3 py-1.5 text-[11px] font-black text-stone-900 transition-colors hover:bg-stone-200 active:translate-y-px"
                          >
                            TA 的空間
                          </button>
                          <div className="flex items-center gap-2">
                            {capsuleSquarePost
                              ? (["up", "mid", "down"] as const).map((rk) => {
                                  const rc = squareReactionCountsByPost.get(
                                    capsuleSquarePost.sourceMessageId,
                                  );
                                  const n =
                                    rk === "up"
                                      ? (rc?.up ?? 0)
                                      : rk === "mid"
                                        ? (rc?.mid ?? 0)
                                        : (rc?.down ?? 0);
                                  const mine =
                                    mySquareReactionByPost.get(
                                      capsuleSquarePost.sourceMessageId,
                                    ) === rk;
                                  const Icon =
                                    rk === "up"
                                      ? ThumbsUp
                                      : rk === "down"
                                        ? ThumbsDown
                                        : Minus;
                                  return (
                                    <button
                                      key={rk}
                                      type="button"
                                      onClick={() =>
                                        void handleSetSquareReaction(
                                          capsuleSquarePost.sourceMessageId,
                                          rk,
                                        )
                                      }
                                      className={cn(
                                        "inline-flex h-9 w-9 items-center gap-1.5 rounded-xl border-[2px] px-3 text-[14px] font-black transition-colors active:translate-y-px",
                                        mine
                                          ? "border-stone-900 bg-[#f4dc3a] text-stone-900"
                                          : "border-stone-900 bg-white text-stone-900 hover:bg-[#fff9df]",
                                      )}
                                    >
                                      <Icon
                                        className="h-4 w-4 shrink-0"
                                        strokeWidth={2.5}
                                        aria-hidden
                                      />
                                      {n > 0 ? n : ""}
                                    </button>
                                  );
                                })
                              : null}

                            {(() => {
                              const isFav = capsuleSquarePost
                                ? favoritedPostIds.has(
                                    capsuleSquarePost.sourceMessageId,
                                  )
                                : capsuleBodyFavorited;
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (capsuleSquarePost) {
                                      isFav
                                        ? void handleUnfavoriteSquare(
                                            capsuleSquarePost.sourceMessageId,
                                          )
                                        : void handleFavoriteSquare(
                                            capsuleSquarePost.sourceMessageId,
                                          );
                                    } else {
                                      isFav
                                        ? void handleUnfavoriteCapsuleById(
                                            capsulePost.id,
                                          )
                                        : void handleFavoriteCapsuleById(
                                            capsulePost.id,
                                          );
                                    }
                                  }}
                                  className={cn(
                                    "inline-flex h-9 w-9 items-center justify-center rounded-xl border-[2px] border-stone-900 transition-all active:translate-y-px",
                                    isFav
                                      ? "bg-[#f4dc3a] text-stone-900"
                                      : "bg-white text-stone-900 hover:bg-[#fff9df]",
                                  )}
                                  title={isFav ? "已收進心底" : "藏進心底"}
                                >
                                  <Bookmark
                                    className={cn(
                                      "h-5 w-5",
                                      isFav && "fill-current",
                                    )}
                                    strokeWidth={2.5}
                                    aria-hidden
                                  />
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* 內容 */}
                      <p className="max-h-[min(32vh,16rem)] overflow-y-auto apple-scroll text-[16px] font-medium leading-relaxed text-stone-900 whitespace-pre-wrap">
                        {capsulePost.content}
                      </p>
                      <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
                        {/* 時間 */}
                        <p className="text-[11px] font-bold tabular-nums text-stone-400">
                          {capsulePost.scheduledAt.toDate() > now
                            ? "預定開啟 "
                            : ""}
                          {capsulePost.scheduledAt
                            .toDate()
                            .toLocaleString("zh-TW", {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                        </p>
                        {/* 分類標籤 */}
                        {capsulePost && !capsuleSwitching ? (
                          <span
                            className={cn(
                              "ml-1 inline-flex shrink-0 rounded-full border-2 border-stone-900 px-2 py-0.5 text-[11px] font-black shadow-[2px_2px_0_0_rgba(28,25,23,0.15)]",
                              capsuleTypeMeta(capsulePost.capsuleType)
                                .chipClass,
                            )}
                          >
                            #{capsuleTypeMeta(capsulePost.capsuleType).label}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div
                      ref={capsuleModalPrivateThreadRef}
                      id="capsule-modal-private-thread"
                      className="mt-2 scroll-mt-4 space-y-3 rounded-2xl"
                    >
                      {/* 3. 已刪除「私線訊息（不公開）」標題，直接接續原來的選擇器或輸入框 */}
                      {isCapsuleParticipantUi &&
                      uniqueCapsuleGuestHexes.length > 0 ? (
                        <label className="block text-[10px] font-black text-stone-600">
                          訪客線（回覆對象）
                          <select
                            className="mt-1 w-full rounded-lg border-[2px] border-stone-900 bg-white px-2 py-1.5 text-[12px] font-bold text-stone-900"
                            value={capsuleThreadGuestHex ?? ""}
                          >
                            {uniqueCapsuleGuestHexes.map((hx) => (
                              <option key={hx} value={hx}>
                                {hx.slice(0, 14)}…
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : isCapsuleParticipantUi ? (
                        <p className="text-[11px] font-bold text-stone-500">
                          尚無訪客開線，等有人抽到這則再回覆。
                        </p>
                      ) : null}
                      <div className="max-h-40 space-y-1.5 overflow-y-auto apple-scroll">
                        {capsulePrivateThreadMessages.map((m) => (
                          <div
                            key={m.id}
                            className="rounded-lg border border-stone-900/20 bg-white px-2 py-1.5 text-[12px]"
                          >
                            <p className="font-mono text-[9px] text-stone-500">
                              {m.authorIdentity.toHexString().slice(0, 12)}…
                            </p>
                            <p className="whitespace-pre-wrap font-bold text-stone-900">
                              {m.body}
                            </p>
                          </div>
                        ))}
                      </div>
                      {isCapsuleParticipantUi ||
                      canShowCapsuleModalFirstMessageInput ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            ref={capsuleModalPrivateTextareaRef}
                            value={capsulePrivateDraft}
                            onChange={(e) =>
                              setCapsulePrivateDraft(e.target.value)
                            }
                            maxLength={TEXT_LIMIT}
                            rows={4}
                            placeholder="寫膠囊私訊…"
                            className="min-h-0 flex-1 resize-none rounded-xl border-[2px] border-stone-900 bg-white px-2 py-1.5 text-[13px] text-stone-900 placeholder:text-stone-400 outline-none"
                          />
                        </div>
                      ) : capsuleSquarePost ? (
                        <div className="rounded-xl border border-stone-900/20 bg-white/80 px-3 py-2">
                          <p className="text-[11px] font-bold text-stone-700">
                            你已開過這條線，請到「我的 → 聊聊記錄」繼續對話。
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              jumpToChatFromCapsule(capsulePost.id)
                            }
                            className="mt-2 inline-flex items-center rounded-lg border-2 border-stone-900 bg-[#f4dc3a] px-3 py-1.5 text-[12px] font-black text-stone-900"
                          >
                            前往聊聊記錄
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {capsuleSquarePost?.repliesPublic ? (
                      <div className="mt-4 space-y-3">
                        <h3 className="text-[12px] font-bold text-black/35 tracking-wider">
                          廣場評論
                        </h3>
                        <div className="max-h-48 space-y-2 overflow-y-auto apple-scroll">
                          {(
                            squareCommentsByPost.get(
                              capsuleSquarePost.sourceMessageId,
                            ) ?? []
                          ).map((c) => (
                            <div
                              key={c.id}
                              className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-[13px]"
                            >
                              <p className="mb-1 font-mono text-[10px] text-black/40">
                                {c.authorIdentity.toHexString().slice(0, 12)}…
                              </p>
                              <p className="whitespace-pre-wrap text-black/85">
                                {c.body}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <textarea
                            value={squareCommentDraft}
                            onChange={(e) =>
                              setSquareCommentDraft(e.target.value)
                            }
                            maxLength={TEXT_LIMIT}
                            rows={2}
                            placeholder="留一句話…"
                            className="min-h-0 flex-1 resize-none rounded-xl border-[2px] border-stone-900 bg-white px-3 py-2 text-[14px] text-stone-900 placeholder:text-stone-400 outline-none focus-visible:border-stone-900 focus-visible:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              void handleAddSquareComment(
                                capsuleSquarePost.sourceMessageId,
                              )
                            }
                            className="shrink-0 rounded-xl border-[2px] border-stone-900 bg-[#f4dc3a] px-4 py-2 text-[13px] font-black text-stone-900 shadow-[3px_3px_0_0_#1a3d38] active:translate-y-px active:shadow-[1px_1px_0_0_#1a3d38]"
                          >
                            送出
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              {capsulePost ? (
                <div className="shrink-0 border-t-[3px] border-stone-900 bg-[#fffdf5] px-4 py-3">
                  <div className="flex items-stretch gap-3">
                    {isCapsuleParticipantUi ||
                    canShowCapsuleModalFirstMessageInput ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleAddCapsulePrivateMessage(
                            capsulePost.id,
                            capsuleThreadGuestHex,
                          )
                        }
                        className="flex-1 rounded-2xl border-[3px] border-stone-900 bg-white px-3 py-3 text-[13px] font-black text-stone-900 shadow-[3px_3px_0_0_#1a3d38] transition-transform active:translate-y-0.5 active:shadow-[1px_1px_0_0_#1a3d38]"
                      >
                        送出私訊
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void pickAnotherCapsule()}
                      disabled={!canShuffleCapsule || capsuleSwitching}
                      className="flex-[1.25] rounded-2xl border-[3px] border-stone-900 bg-[#f4dc3a] px-4 py-3 text-[15px] font-black tracking-tight text-stone-900 shadow-[5px_5px_0_0_#1a3d38] transition-transform disabled:cursor-not-allowed disabled:opacity-60 active:translate-y-0.5 active:shadow-[2px_2px_0_0_#1a3d38]"
                    >
                      {capsuleSwitching ? "正在打開新膠囊…" : "換一個"}
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {profileActionMenuOpen ? (
          <motion.div
            key="profile-action-menu"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[226] flex items-end justify-center bg-black/45 p-4 sm:items-center"
            onClick={() => setProfileActionMenuOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[min(100%,22rem)] rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-5 shadow-[6px_6px_0_0_#0f2420]"
            >
              <p className="text-[18px] font-black text-stone-900">編輯選單</p>
              <p className="mt-1 text-[12px] font-bold text-stone-500">
                先選你要做的操作
              </p>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setProfileActionMenuOpen(false);
                    void openProfileModal();
                  }}
                  className="w-full rounded-xl border-2 border-stone-900 bg-white px-4 py-3 text-left text-[14px] font-black text-stone-900 active:translate-y-px"
                >
                  基本資料
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileActionMenuOpen(false);
                    setPasswordError("");
                    setPasswordOld("");
                    setPasswordNew("");
                    setPasswordConfirm("");
                    setPasswordModalOpen(true);
                  }}
                  className="w-full rounded-xl border-2 border-stone-900 bg-white px-4 py-3 text-left text-[14px] font-black text-stone-900 active:translate-y-px"
                >
                  修改秘密
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileActionMenuOpen(false);
                    void handleLogout();
                  }}
                  className="w-full rounded-xl border-2 border-stone-900 bg-[#ffccd5] px-4 py-3 text-left text-[14px] font-black text-red-700 active:translate-y-px"
                >
                  登出
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {introEditOpen && user ? (
          <motion.div
            key="intro-edit-modal"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[226] flex items-end justify-center bg-black/45 p-4 sm:items-center"
            onClick={() => !introEditSaving && setIntroEditOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[min(100%,22rem)] rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-5 shadow-[6px_6px_0_0_#0f2420]"
            >
              <h3 className="text-[18px] font-black tracking-tight text-stone-900">
                編輯自我介紹
              </h3>
              <p className="mt-1 text-[12px] font-bold text-stone-500">
                可填 10–400 字，儲存後會回到上一頁。
              </p>
              <textarea
                value={introEditDraft}
                onChange={(e) => setIntroEditDraft(e.target.value)}
                rows={6}
                minLength={10}
                maxLength={400}
                className="mt-3 w-full resize-none rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors placeholder:text-stone-400"
                placeholder="寫下你想讓人知道的自己（10–400 字）"
              />
              <p className="mt-1 text-right text-[11px] font-bold text-stone-400">
                {introEditDraft.trim().length}/400
              </p>
              {introEditError ? (
                <p
                  className="mt-2 text-[13px] font-bold text-red-600"
                  role="alert"
                >
                  {introEditError}
                </p>
              ) : null}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIntroEditOpen(false)}
                  disabled={introEditSaving}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void submitIntroEdit()}
                  disabled={introEditSaving}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px disabled:opacity-50"
                >
                  {introEditSaving ? "儲存中…" : "儲存"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {passwordModalOpen ? (
          <motion.div
            key="password-modal"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[226] flex items-end justify-center bg-black/45 p-4 sm:items-center"
            onClick={() => !passwordSaving && setPasswordModalOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[min(100%,22rem)] rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-5 shadow-[6px_6px_0_0_#0f2420]"
            >
              <h3 className="text-[18px] font-black tracking-tight text-stone-900">
                修改秘密
              </h3>
              <div className="mt-4 space-y-3">
                <input
                  type="password"
                  value={passwordOld}
                  onChange={(e) => setPasswordOld(e.target.value)}
                  placeholder="舊密碼"
                  className="w-full rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors placeholder:text-stone-400"
                />
                <input
                  type="password"
                  value={passwordNew}
                  onChange={(e) => setPasswordNew(e.target.value)}
                  placeholder="新密碼（6–128）"
                  className="w-full rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors placeholder:text-stone-400"
                />
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="再輸入一次新密碼"
                  className="w-full rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors placeholder:text-stone-400"
                />
              </div>
              {passwordError ? (
                <p
                  className="mt-2 text-[13px] font-bold text-red-600"
                  role="alert"
                >
                  {passwordError}
                </p>
              ) : null}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  disabled={passwordSaving}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void submitPasswordChange()}
                  disabled={passwordSaving}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px disabled:opacity-50"
                >
                  {passwordSaving ? "更新中…" : "更新密碼"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {profileModalOpen && user ? (
          <motion.div
            key="profile-modal"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[225] flex items-end justify-center sm:items-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={() => !profileSaving && setProfileModalOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-modal-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[min(100%,22rem)] rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-5 shadow-[6px_6px_0_0_#0f2420]"
            >
              <h3
                id="profile-modal-title"
                className="text-[18px] font-black tracking-tight text-stone-900"
              >
                個人資料
              </h3>
              <p className="mt-1 text-[12px] font-bold text-stone-500">
                登入信箱：{user.email}
              </p>
              <form
                onSubmit={(e) => void submitProfile(e)}
                className="mt-4 space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-stone-600">
                    暱稱
                  </label>
                  <input
                    value={profileForm.displayName}
                    onChange={(e) =>
                      setProfileForm((f) => ({
                        ...f,
                        displayName: e.target.value,
                      }))
                    }
                    maxLength={32}
                    required
                    className="w-full rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-stone-600">
                    性別
                  </label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, gender: e.target.value }))
                    }
                    required
                    className="w-full rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors"
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                    <option value="unspecified">不願透露</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-stone-600">
                    年齡
                  </label>
                  <input
                    type="number"
                    min={16}
                    max={126}
                    value={profileForm.ageYears}
                    onChange={(e) =>
                      setProfileForm((f) => ({
                        ...f,
                        ageYears: e.target.value,
                      }))
                    }
                    required
                    className="w-full rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors"
                  />
                </div>

                {profileError ? (
                  <p
                    className="text-[13px] font-bold text-red-600"
                    role="alert"
                  >
                    {profileError}
                  </p>
                ) : null}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={profileSaving}
                    onClick={() => setProfileModalOpen(false)}
                    className="flex-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="flex-1 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px disabled:opacity-50"
                  >
                    {profileSaving ? "儲存中…" : "儲存"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {needsAgeGate ? (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-sm rounded-2xl border-[3px] border-stone-900 bg-white p-5 shadow-[8px_8px_0_0_#0f2420]">
            <p className="text-[18px] font-black text-stone-900">先補齊年齡</p>
            <p className="mt-1 text-[12px] font-medium text-stone-600">
              年齡未完成前不可進行其他操作。
            </p>
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                年齡（16–126）
              </p>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-stone-300 bg-stone-50 p-1">
                {Array.from({ length: 111 }, (_, i) => 16 + i).map((age) => (
                  <button
                    key={age}
                    type="button"
                    onClick={() => setAgeGateYears(String(age))}
                    className={cn(
                      "w-full rounded-lg px-3 py-1.5 text-left text-[13px] font-semibold",
                      Number(ageGateYears) === age
                        ? "bg-violet-600 text-white"
                        : "text-stone-700 hover:bg-stone-100",
                    )}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </div>
            {ageGateError ? (
              <p
                className="mt-3 text-[13px] font-medium text-red-600"
                role="alert"
              >
                {ageGateError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void submitAgeGate()}
              disabled={ageGateSaving}
              className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-60"
            >
              {ageGateSaving ? "提交中…" : "確認年齡"}
            </button>
          </div>
        </div>
      ) : null}
      <AnimatePresence>
        {adminReportModalOpen && selectedAdminReport ? (
          <motion.div
            key="admin-report-modal"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-end justify-center bg-black/45 p-4 sm:items-center"
            onClick={() =>
              !adminActionLoading && setAdminReportModalOpen(false)
            }
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
                  <p className="text-[16px] font-black text-stone-900">
                    處理舉報單
                  </p>
                  <p className="mt-0.5 text-[12px] font-bold text-rose-600 uppercase">
                    {selectedAdminReport.status} · 優先級{" "}
                    {Number(selectedAdminReport.priority)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminReportModalOpen(false)}
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
                      onChange={(e) => setAdminReportStatus(e.target.value)}
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
                        setAdminReportPriority(
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
                      setAdminResolutionNote(e.target.value);
                      setSanctionDetailDraft(e.target.value);
                    }}
                    placeholder="例：言論違規，已給予警告"
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[13px]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void submitAdminReportUpdate()}
                  disabled={adminActionLoading}
                  className="w-full rounded-xl bg-rose-600 px-3 py-2 text-[13px] font-bold text-white disabled:opacity-60"
                >
                  {adminActionLoading ? "提交中…" : "更新舉報單"}
                </button>
              </div>
              <div className="border-t border-stone-200 pt-3 space-y-2">
                <p className="text-[12px] font-black text-stone-900">
                  快速動作
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      setAdminResolutionNote(PRESET_REPORTER.dismiss);
                      setSanctionDetailDraft(PRESET_SANCTION.dismiss);
                      void quickDismissReport();
                    }}
                    className="rounded-xl border-2 border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-600 disabled:opacity-60"
                  >
                    不予處理
                  </button>
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      setAdminResolutionNote(PRESET_REPORTER.warn);
                      setSanctionDetailDraft(PRESET_SANCTION.warn);
                      setSanctionTypeDraft("warn");
                      setSanctionBanDays(0);
                      void submitSanctionForSelectedReport();
                    }}
                    className="rounded-xl border-2 border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 disabled:opacity-60"
                  >
                    警告
                  </button>
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      setAdminResolutionNote(PRESET_REPORTER.mute7);
                      setSanctionDetailDraft(PRESET_SANCTION.mute7);
                      setSanctionTypeDraft("mute");
                      setSanctionBanDays(7);
                      void submitSanctionForSelectedReport();
                    }}
                    className="rounded-xl border-2 border-orange-300 bg-orange-50 px-2.5 py-1.5 text-[11px] font-bold text-orange-700 disabled:opacity-60"
                  >
                    禁言7天
                  </button>
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      setAdminResolutionNote(PRESET_REPORTER.mute30);
                      setSanctionDetailDraft(PRESET_SANCTION.mute30);
                      setSanctionTypeDraft("mute");
                      setSanctionBanDays(30);
                      void submitSanctionForSelectedReport();
                    }}
                    className="rounded-xl border-2 border-orange-400 bg-orange-100 px-2.5 py-1.5 text-[11px] font-bold text-orange-800 disabled:opacity-60"
                  >
                    禁言30天
                  </button>
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      setAdminResolutionNote(PRESET_REPORTER.ban7);
                      setSanctionDetailDraft(PRESET_SANCTION.ban7);
                      setSanctionTypeDraft("ban");
                      setSanctionBanDays(7);
                      void submitSanctionForSelectedReport();
                    }}
                    className="rounded-xl border-2 border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 disabled:opacity-60"
                  >
                    封禁7天
                  </button>
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      setAdminResolutionNote(PRESET_REPORTER.ban30);
                      setSanctionDetailDraft(PRESET_SANCTION.ban30);
                      setSanctionTypeDraft("ban");
                      setSanctionBanDays(30);
                      void submitSanctionForSelectedReport();
                    }}
                    className="rounded-xl border-2 border-red-400 bg-red-100 px-2.5 py-1.5 text-[11px] font-bold text-red-800 disabled:opacity-60"
                  >
                    封禁30天
                  </button>
                  <button
                    type="button"
                    disabled={adminActionLoading}
                    onClick={() => {
                      setAdminResolutionNote(PRESET_REPORTER.banPermanent);
                      setSanctionDetailDraft(PRESET_SANCTION.banPermanent);
                      setSanctionTypeDraft("ban");
                      setSanctionBanDays("permanent");
                      void submitSanctionForSelectedReport();
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
            onClick={() => !adminActionLoading && setAdminAddOpen(false)}
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
              <p className="text-[16px] font-black text-stone-900">
                新增管理員
              </p>
              <div className="mt-3 space-y-3">
                <label className="block text-[11px] font-bold text-stone-600">
                  帳號 Email
                  <input
                    value={adminGrantEmail}
                    onChange={(e) => setAdminGrantEmail(e.target.value)}
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
                  <p className="text-[11px] font-bold text-stone-600 mb-1">
                    權限
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={adminGrantRole}
                      onChange={(e) => setAdminGrantRole(e.target.value)}
                      className="flex-1 rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[13px]"
                    >
                      <option value="moderator">管理員</option>
                      <option value="reviewer">審核員</option>
                      <option value="super_admin">超級管理員</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setAdminGrantActive((v) => !v)}
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
                            adminGrantActive
                              ? "ml-[calc(100%-1.35rem)]"
                              : "ml-1",
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
                    setAdminAddOpen(false);
                    setAdminActionError("");
                  }}
                  disabled={adminActionLoading}
                  className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[13px] font-semibold text-stone-700"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await submitAdminRoleUpsert();
                    if (!adminActionError) setAdminAddOpen(false);
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
            onClick={() => !adminActionLoading && setAdminEditOpen(false)}
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
              <p className="text-[16px] font-black text-stone-900">
                編輯管理員
              </p>
              <p className="mt-1 text-[12px] text-stone-600 truncate">
                {adminEditEmail || "未知帳號"}
              </p>
              <div className="mt-3">
                <p className="text-[11px] font-bold text-stone-600 mb-1">
                  權限
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={adminEditRole}
                    onChange={(e) => setAdminEditRole(e.target.value)}
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
                      setAdminEditActive((v) => !v)
                    }
                    disabled={adminEditRole === "super_admin"}
                    className={cn(
                      "relative shrink-0 flex items-center",
                      adminEditRole === "super_admin" &&
                        "cursor-not-allowed opacity-70",
                    )}
                    aria-checked={
                      adminEditRole === "super_admin" ? true : adminEditActive
                    }
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
                  onClick={() => setAdminEditOpen(false)}
                  disabled={adminActionLoading}
                  className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[13px] font-semibold text-stone-700"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void submitAdminEdit()}
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

      <AnimatePresence>
        {banNoticeOpen && banNoticeInfo ? (
          <motion.div
            key="ban-notice"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border-[3px] border-red-600 bg-white p-6 text-center shadow-2xl"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <Lock className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-[20px] font-black text-red-700">
                帳號已被封禁
              </p>
              <p className="mt-2 text-[13px] text-stone-700 leading-relaxed">
                {banNoticeInfo.reason}
              </p>
              <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] font-semibold text-red-800">
                封禁至：
                {banNoticeInfo.endAt === "永久"
                  ? "永久封禁"
                  : banNoticeInfo.endAt}
              </div>
              <p className="mt-3 text-[11px] text-stone-500">
                如有異議，請透過其他方式聯絡站方申訴。
              </p>
              <button
                type="button"
                onClick={() => setBanNoticeOpen(false)}
                className="mt-4 w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-2.5 text-[13px] font-bold text-stone-700"
              >
                我知道了
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {reportModalOpen ? (
          <motion.div
            key="report-modal"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-end justify-center bg-black/45 p-4 sm:items-center"
            onClick={() => !reportSaving && setReportModalOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[min(100%,22rem)] rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-5 shadow-[6px_6px_0_0_#0f2420]"
            >
              <p className="text-[18px] font-black text-stone-900">送出舉報</p>
              <p className="mt-1 text-[12px] font-bold text-stone-500">
                類型：{reportTargetType} · 目標：{reportTargetId.slice(0, 18)}
                {reportTargetId.length > 18 ? "…" : ""}
              </p>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-stone-600">
                    舉報原因
                  </label>
                  <select
                    value={reportReasonCode}
                    onChange={(e) => setReportReasonCode(e.target.value)}
                    className="w-full rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors"
                  >
                    <option value="abuse">辱罵 / 騷擾</option>
                    <option value="spam">垃圾廣告 / 詐騙</option>
                    <option value="inappropriate_content">
                      不當內容 / 色情
                    </option>
                    <option value="impersonation">冒充他人</option>
                    <option value="underage">疑似未成年</option>
                    <option value="hate_speech">仇恨言論</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-stone-600">
                    詳細說明
                  </label>
                  <textarea
                    value={reportDetail}
                    onChange={(e) => setReportDetail(e.target.value)}
                    minLength={10}
                    maxLength={2000}
                    rows={4}
                    placeholder="請補充具體情況（至少 10 字）…"
                    className="w-full resize-none rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors placeholder:text-stone-400"
                  />
                </div>
              </div>
              {reportError ? (
                <p
                  className="mt-2 text-[13px] font-bold text-red-600"
                  role="alert"
                >
                  {reportError}
                </p>
              ) : null}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  disabled={reportSaving}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void submitReport()}
                  disabled={reportSaving}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-red-500 px-4 py-2.5 text-[14px] font-black text-white active:translate-y-px disabled:opacity-50"
                >
                  {reportSaving ? "送出中…" : "確認舉報"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MobileNavItem({
  active,
  onClick,
  ariaLabel,
  icon,
  onDark = false,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  icon: React.ReactNode;
  onDark?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "flex min-w-[3.25rem] flex-col items-center justify-center pb-0.5 transition-colors",
        onDark
          ? active
            ? "text-[#f4dc3a]"
            : "text-white/42"
          : active
            ? "text-sky-600"
            : "text-black/38",
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center">{icon}</span>
    </button>
  );
}

/** 列表統一：最近時間在前（`createdAt` → `scheduledAt` → `_id`） */
function compareMessagesRecentFirst(a: Message, b: Message): number {
  const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (bc !== ac) return bc - ac;
  const as = new Date(a.scheduledAt).getTime();
  const bs = new Date(b.scheduledAt).getTime();
  if (bs !== as) return bs - as;
  return String(b._id).localeCompare(String(a._id));
}

function partitionByDue(list: Message[]): {
  sealed: Message[];
  opened: Message[];
} {
  const sorted = [...list].sort(compareMessagesRecentFirst);
  const sealed = sorted.filter((m) => !m.isDue);
  const opened = sorted.filter((m) => m.isDue);
  return { sealed, opened };
}

function MailboxSectionHeader({
  title,
  count,
  tone,
  expanded,
  onToggle,
}: {
  title: string;
  count: number;
  tone: "sealed" | "opened";
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 px-1 py-1.5 rounded-lg text-left transition-colors",
        "hover:bg-black/[0.04] active:bg-black/[0.06]",
        tone === "sealed" ? "text-amber-900/75" : "text-sky-900/75",
      )}
    >
      <ChevronRight
        className={cn(
          "w-3.5 h-3.5 shrink-0 text-black/35 transition-transform duration-200",
          expanded && "rotate-90",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "h-2.5 w-2.5 shrink-0 rounded-full",
          tone === "sealed" ? "bg-amber-400" : "bg-sky-500",
        )}
        aria-hidden
      />
      <span className="text-[10px] font-bold uppercase tracking-wider">
        {title}
      </span>
      <span className="text-[10px] font-medium tabular-nums text-black/38">
        ({count})
      </span>
    </button>
  );
}

function MailboxGroupedList({
  messages,
  scope,
  selectedMessageId,
  onSelectMessage,
  currentUserEmail,
  sealedOpen,
  openedOpen,
  onToggleSealed,
  onToggleOpened,
}: {
  messages: Message[];
  scope: "inbox" | "outbox";
  selectedMessageId: string | null;
  onSelectMessage: (id: string) => void;
  currentUserEmail?: string;
  sealedOpen: boolean;
  openedOpen: boolean;
  onToggleSealed: () => void;
  onToggleOpened: () => void;
}) {
  const { sealed, opened } = partitionByDue(messages);
  return (
    <div className="space-y-0.5">
      {sealed.length > 0 ? (
        <div className="mb-0.5">
          <MailboxSectionHeader
            title="還沒拆"
            count={sealed.length}
            tone="sealed"
            expanded={sealedOpen}
            onToggle={onToggleSealed}
          />
          {sealedOpen ? (
            <div className="space-y-0.5 pt-0.5">
              {sealed.map((msg) => (
                <React.Fragment key={msg._id}>
                  <MessageTile
                    active={selectedMessageId === msg._id}
                    msg={msg}
                    onClick={() => onSelectMessage(msg._id)}
                    currentUserEmail={currentUserEmail}
                    pillLayoutScope={scope}
                    listTone="sealed"
                  />
                </React.Fragment>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {opened.length > 0 ? (
        <div
          className={cn(
            sealed.length > 0 && "mt-1.5 border-t border-black/[0.06] pt-0.5",
          )}
        >
          <MailboxSectionHeader
            title="已經拆囉"
            count={opened.length}
            tone="opened"
            expanded={openedOpen}
            onToggle={onToggleOpened}
          />
          {openedOpen ? (
            <div className="space-y-0.5 pt-0.5">
              {opened.map((msg) => (
                <React.Fragment key={msg._id}>
                  <MessageTile
                    active={selectedMessageId === msg._id}
                    msg={msg}
                    onClick={() => onSelectMessage(msg._id)}
                    currentUserEmail={currentUserEmail}
                    pillLayoutScope={scope}
                    listTone="opened"
                  />
                </React.Fragment>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** 秘密：大塊卡通按鈕，點開秘密膠囊彈窗（tile 方塊／treasure 小直向膠囊，點擊先「拔蓋」再開啟） */
function SecretCapsuleDrawButton({
  onClick,
  size = "default",
  variant = "tile",
}: {
  onClick: () => void;
  size?: "default" | "hero";
  variant?: "tile" | "treasure";
}) {
  const hero = size === "hero";
  const [capPulled, setCapPulled] = useState(false);
  const pullTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pullTimerRef.current != null) clearTimeout(pullTimerRef.current);
    };
  }, []);

  const triggerTreasureOpen = () => {
    if (variant !== "treasure" || capPulled) return;
    setCapPulled(true);
    if (pullTimerRef.current != null) clearTimeout(pullTimerRef.current);
    pullTimerRef.current = setTimeout(() => {
      onClick();
      setCapPulled(false);
      pullTimerRef.current = null;
    }, 420);
  };

  if (variant === "treasure") {
    return (
      <button
        type="button"
        disabled={capPulled}
        aria-label="抽秘密膠囊"
        title="抽秘密膠囊"
        onClick={triggerTreasureOpen}
        className={cn(
          "relative mx-auto shrink-0 select-none rounded-full border-[3px] border-stone-900 text-stone-900 shadow-[5px_6px_0_0_#0f2420] transition-transform",
          "w-[26vw] min-w-[5.5rem] max-w-[8.25rem] origin-center -rotate-[9deg]",
          "h-[min(calc(26vw*1.68),15.5rem)] min-h-[9.25rem]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/90",
          "active:scale-[0.97] disabled:pointer-events-none",
          capPulled && "scale-[1.02]",
        )}
      >
        <span
          className="pointer-events-none absolute inset-[2px] rounded-full bg-gradient-to-b from-[#ffe566] via-[#f4dc3a] to-[#c99812]"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute left-[14%] right-[14%] top-[40%] z-[1] h-px bg-stone-900/30"
          aria-hidden
        />
        <span
          className={cn(
            "pointer-events-none absolute left-[2px] right-[2px] top-[2px] z-[3] h-[36%] rounded-t-full border-b-2 border-stone-900/25",
            "bg-gradient-to-b from-[#fffef5] to-[#f2d24a]",
            "shadow-[inset_0_2px_0_rgba(255,255,255,0.65)]",
            "origin-[50%_100%] transition-transform duration-[400ms] ease-[cubic-bezier(0.33,1.15,0.48,1)]",
            capPulled && "-translate-y-[85%] -rotate-[18deg]",
          )}
          aria-hidden
        />
        <Sparkles
          className="pointer-events-none absolute left-1/2 top-[60%] z-[4] h-6 w-6 -translate-x-1/2 -translate-y-1/2 sm:h-[1.05rem] sm:w-[1.05rem]"
          strokeWidth={2.35}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute bottom-[12%] left-1/2 z-[2] h-4 w-4 -translate-x-1/2 rounded-full border-2 border-stone-900/25 bg-black/[0.05]"
          aria-hidden
        />
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label="抽秘密膠囊"
      title="抽秘密膠囊"
      onClick={onClick}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-[2rem] border-[3px] border-stone-900 bg-[#f4dc3a] text-stone-900 shadow-[6px_6px_0_0_#0f2420] transition-transform active:translate-y-1 active:shadow-[3px_3px_0_0_#0f2420] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/90",
        hero
          ? "h-[10.25rem] w-[10.25rem] md:h-[9rem] md:w-[9rem]"
          : "h-[5.5rem] w-[5.5rem]",
      )}
    >
      <span
        className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 rounded-br-xl border-b-[3px] border-r-[3px] border-stone-900/35 bg-[#ffe78a]"
        aria-hidden
      />
      <Sparkles
        className={cn(
          hero ? "h-[5.5rem] w-[5.5rem] md:h-16 md:w-16" : "h-12 w-12",
        )}
        strokeWidth={2.35}
        aria-hidden
      />
    </button>
  );
}

/** 秘密側欄：紙條模組列表項（粗邊框、右下角摺角、塊狀陰影） */
function SecretPaperListItem({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] px-3 py-3 text-left shadow-[4px_4px_0_0_#14302c] transition-transform active:translate-y-0.5 active:shadow-[2px_2px_0_0_#14302c]",
        selected && "bg-[#fff4c2]",
      )}
    >
      <span
        className="pointer-events-none absolute bottom-0 right-0 z-0 h-0 w-0 border-b-[18px] border-b-[#b8b3a8] border-l-[18px] border-l-transparent"
        aria-hidden
      />
      <span
        className={cn(
          "pointer-events-none absolute bottom-[2px] right-[2px] z-0 h-0 w-0 border-b-[13px] border-l-[13px] border-l-transparent",
          selected ? "border-b-[#fff4c2]" : "border-b-[#fffef7]",
        )}
        aria-hidden
      />
      <span className="relative z-[1] block">{children}</span>
    </button>
  );
}

/** 秘密：廣場牆區塊（側欄與主欄共用，可折疊列表） */
function SecretWallSection({
  expanded,
  onToggleExpanded,
  postsVisible,
  postsSortedLength,
  selectedSquarePostId,
  onSelectPost,
  reactionCountsByPost,
  commentsByPost,
  maxListItems = 10,
  /** 展開時：標題列以下內容區（空狀態或列表）最大高度，超出則區內捲動 */
  expandedBodyMaxClass = "max-h-[min(48vh,22rem)] md:max-h-[min(38vh,18rem)]",
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
  postsVisible: SquarePost[];
  postsSortedLength: number;
  selectedSquarePostId: string | null;
  onSelectPost: (id: string) => void;
  reactionCountsByPost: Map<string, { up: number; mid: number; down: number }>;
  commentsByPost: Map<string, SquareComment[]>;
  maxListItems?: number;
  expandedBodyMaxClass?: string;
}) {
  return (
    <section className="w-full shrink-0 rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-3 shadow-[5px_5px_0_0_#0f2420] md:p-4 md:shadow-[6px_6px_0_0_#142a28]">
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 rounded-xl border-b-2 border-dashed border-stone-900/35 pb-2 text-left outline-none ring-stone-900/15 transition-colors hover:bg-black/[0.03] focus-visible:ring-2 md:mb-0 md:pb-2"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-stone-900 bg-[#f6e7c8] text-stone-900 shadow-[2px_2px_0_0_#0f2420] md:h-9 md:w-9">
            <LayoutGrid
              className="h-4 w-4 md:h-5 md:w-5"
              strokeWidth={2.25}
              aria-hidden
            />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-[12px] font-black text-stone-900 md:text-[13px]">
              廣場牆
            </p>
            <p className="text-[10px] font-bold text-stone-600 md:text-[11px]">
              {expanded
                ? `共 ${postsSortedLength} 則 · 點此收起列表`
                : `共 ${postsSortedLength} 則 · 點此展開列表`}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-stone-800 transition-transform duration-200",
            expanded ? "rotate-180" : "rotate-0",
          )}
          strokeWidth={2.5}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div
          className={cn(
            "mt-3 min-h-0 overflow-y-auto apple-scroll pr-0.5",
            expandedBodyMaxClass,
          )}
        >
          {postsVisible.length === 0 ? (
            <p className="px-0.5 py-4 text-center text-[12px] font-bold leading-relaxed text-stone-500 md:text-[13px]">
              {postsSortedLength === 0
                ? "還沒有能看的公開紙條，等大家貼上廣場吧。"
                : "有貼文但尚未到預定開啟時間，晚點再來逛逛。"}
            </p>
          ) : (
            <ul className="space-y-2">
              {postsVisible.slice(0, maxListItems).map((p) => (
                <li key={p.sourceMessageId}>
                  <SecretPaperListItem
                    selected={selectedSquarePostId === p.sourceMessageId}
                    onClick={() => onSelectPost(p.sourceMessageId)}
                  >
                    <p className="line-clamp-3 text-[13px] font-bold leading-snug text-stone-900">
                      {p.snapshotContent.length > 140
                        ? `${p.snapshotContent.slice(0, 140)}…`
                        : p.snapshotContent}
                    </p>
                    {(() => {
                      const line = squareAddressSubtitle(
                        p.showSenderOnSquare,
                        p.showRecipientOnSquare,
                        p.snapshotSenderEmail,
                        p.snapshotRecipientEmail,
                        {
                          sourceKind: p.sourceKind,
                          senderDisplayName: "",
                        },
                      );
                      return line ? (
                        <p className="mt-1 truncate text-[10px] font-bold text-stone-600">
                          {line}
                        </p>
                      ) : (
                        <p className="mt-1 text-[10px] font-bold text-stone-500">
                          信箱已藏起來
                        </p>
                      );
                    })()}
                    <div className="mt-2 flex items-center gap-3 text-[11px] font-black text-stone-700">
                      <span className="inline-flex items-center gap-0.5">
                        <ThumbsUp
                          className="h-3.5 w-3.5"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                        {(() => {
                          const rc = reactionCountsByPost.get(
                            p.sourceMessageId,
                          );
                          return (
                            (rc?.up ?? 0) + (rc?.mid ?? 0) + (rc?.down ?? 0)
                          );
                        })()}
                      </span>
                      {p.repliesPublic ? (
                        <span className="inline-flex items-center gap-0.5">
                          <MessageCircle
                            className="h-3.5 w-3.5"
                            strokeWidth={2.5}
                            aria-hidden
                          />
                          {(commentsByPost.get(p.sourceMessageId) ?? []).length}
                        </span>
                      ) : null}
                    </div>
                  </SecretPaperListItem>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

/** 「我的」頁頂部：個人摘要＋編輯（開啟與頂欄相同之個人資料 Modal）／登出 */
function MineProfileSummaryCard({
  user,
  onOpenActions,
  onEditIntro,
  onLogout,
}: {
  user: User;
  onOpenActions: () => void;
  onEditIntro: () => void;
  onLogout: () => void;
}) {
  const genderLabel =
    user.gender === "male"
      ? "男"
      : user.gender === "female"
        ? "女"
        : user.gender === "other"
          ? "其他"
          : user.gender === "unspecified"
            ? "未透露"
            : user.gender?.trim()
              ? user.gender
              : "—";
  const ageLine = user.ageYears > 0 ? `${user.ageYears} 歲` : "年齡未填";
  const note = user.profileNote?.trim();

  return (
    <div className="relative overflow-hidden rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-4 text-stone-900 shadow-[5px_5px_0_0_#0f2420] md:shadow-[4px_4px_0_0_rgba(15,36,32,0.18)]">
      <span
        className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 border-b-[14px] border-l-[14px] border-l-transparent border-b-stone-900/20"
        aria-hidden
      />
      <div className="relative flex gap-3">
        <button
          type="button"
          onClick={onOpenActions}
          className="group flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left transition-colors hover:bg-stone-900/[0.04]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-stone-900 bg-gradient-to-br from-violet-200/90 to-fuchsia-200/80 text-stone-900 shadow-sm">
            <User className="h-7 w-7" strokeWidth={2.2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pr-1">
            <p className="truncate text-[17px] font-black tracking-tight">
              {user.displayName?.trim() ||
                user.email?.split("@")[0] ||
                "未命名"}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-bold text-stone-600">
              {user.email}
            </p>
            <p className="mt-1 text-[10px] font-bold text-stone-500">
              {genderLabel} · {ageLine}
            </p>
          </div>
        </button>
      </div>
      <div className="relative mt-2.5 rounded-xl border border-stone-900/10 bg-white/70 p-2.5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            说说
          </p>
          <button
            type="button"
            onClick={onEditIntro}
            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-50"
          >
            <Pencil className="h-3 w-3" strokeWidth={2.4} aria-hidden />
          </button>
        </div>
        {note ? (
          <p className="line-clamp-3 text-[11px] font-medium leading-snug text-stone-700">
            {note}
          </p>
        ) : (
          <p className="text-[11px] font-medium text-stone-400">
            尚未填寫，點右上角修改
          </p>
        )}
      </div>
      {/* <div className="relative mt-3 flex flex-wrap gap-2 border-t border-stone-900/15 pt-3">
        <button
          type="button"
          onClick={onOpenActions}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-3 py-2 text-[12px] font-black text-stone-900 shadow-[2px_2px_0_0_#0f2420] transition-transform active:translate-y-px active:shadow-none min-[380px]:flex-none"
        >
          <Pencil
            className="h-3.5 w-3.5 shrink-0"
            strokeWidth={2.5}
            aria-hidden
          />
          編輯資料
        </button>
      </div> */}
    </div>
  );
}

function MineHubBigCards({
  inboxCount,
  outboxCount,
  favCount,
  chatCount,
  showAdminCard,
  showSuperOpsCard,
  myReportsCount,
  onNavigate,
}: {
  inboxCount: number;
  outboxCount: number;
  favCount: number;
  chatCount: number;
  showAdminCard: boolean;
  showSuperOpsCard: boolean;
  myReportsCount: number;
  onNavigate: (
    t:
      | "inbox"
      | "outbox"
      | "favorites"
      | "chat"
      | "space"
      | "admin"
      | "admin_ops"
      | "my_reports",
  ) => void;
}) {
  const cardShell =
    "group relative overflow-hidden rounded-2xl border-[3px] text-left transition-transform active:scale-[0.99] max-md:shadow-[5px_5px_0_0_rgba(15,36,32,0.9)] md:rounded-[1.4rem] md:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)]";
  const rowInner =
    "relative flex min-h-[3.75rem]  gap-2 p-3 sm:min-h-0 sm:flex-row sm:items-center sm:gap-3 sm:p-4 md:min-h-[4.5rem]";
  return (
    <div className="grid grid-cols-2 gap-3 px-1 py-1 md:grid-cols-1 md:space-y-3 md:px-0.5">
      <button
        type="button"
        onClick={() => onNavigate("inbox")}
        className={cn(
          cardShell,
          "col-span-1 border-sky-400/90 bg-gradient-to-br from-sky-50 via-white to-cyan-50 ring-0 ring-sky-100/90 md:ring-2",
        )}
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sky-200/40 blur-2xl" />
        <div className={rowInner}>
          <div className="flex h-12 w-12 shrink-0 -rotate-6 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 text-white shadow-md shadow-sky-900/25 sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl">
            <Inbox
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black leading-tight tracking-tight text-sky-950 sm:text-[17px] md:text-[18px]">
              飄向我的
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-sky-800/80 sm:text-[12px]">
              共 {inboxCount} 則
            </p>
          </div>
          <ChevronRight
            className="absolute right-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-sky-400/80 transition-transform group-hover:translate-x-0.5 md:static md:block md:translate-y-0"
            aria-hidden
          />
        </div>
      </button>

      <button
        type="button"
        onClick={() => onNavigate("outbox")}
        className={cn(
          cardShell,
          "col-span-1 border-amber-400/90 bg-gradient-to-br from-amber-50 via-white to-orange-50 ring-0 ring-amber-100/90 md:ring-2",
        )}
      >
        <div className="pointer-events-none absolute -left-4 -bottom-8 h-28 w-28 rounded-full bg-amber-200/35 blur-2xl" />
        <div className={rowInner}>
          <div className="flex h-12 w-12 shrink-0 rotate-3 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-900/25 sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl">
            <History
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black leading-tight tracking-tight text-amber-950 sm:text-[17px] md:text-[18px]">
              我丟出的
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-amber-900/80 sm:text-[12px]">
              共 {outboxCount} 則
            </p>
          </div>
          <ChevronRight
            className="absolute right-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-amber-400/80 transition-transform group-hover:translate-x-0.5 md:static md:block md:translate-y-0"
            aria-hidden
          />
        </div>
      </button>

      <button
        type="button"
        onClick={() => onNavigate("chat")}
        className={cn(
          cardShell,
          "col-span-2 border-emerald-500/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50 ring-0 ring-emerald-100/90 md:col-span-1 md:ring-2",
        )}
      >
        <div className="pointer-events-none absolute -right-4 -top-6 h-24 w-24 rounded-full bg-emerald-200/35 blur-2xl" />
        <div
          className={cn(
            rowInner,
            "min-h-[5.5rem] flex-row items-center sm:min-h-[6.75rem] md:min-h-[4.5rem]",
          )}
        >
          <div className="flex h-12 w-12 shrink-0 rotate-2 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-900/25 sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl">
            <MessageCircle
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black leading-tight tracking-tight text-emerald-950 sm:text-[17px] md:text-[18px]">
              聊聊記錄
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-emerald-800/80 sm:text-[12px]">
              共 {chatCount} 條可續聊
            </p>
          </div>
          <ChevronRight
            className="ml-auto h-6 w-6 shrink-0 text-emerald-400/80 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      </button>

      <button
        type="button"
        onClick={() => onNavigate("space")}
        className={cn(
          cardShell,
          "col-span-2 border-cyan-400/90 bg-gradient-to-br from-cyan-50 via-white to-sky-50 ring-0 ring-cyan-100/90 md:col-span-1 md:ring-2",
        )}
      >
        <div className="pointer-events-none absolute right-2 top-0 h-20 w-20 rounded-full bg-cyan-200/40 blur-2xl" />
        <div
          className={cn(
            rowInner,
            "min-h-[5.5rem] flex-row items-center sm:min-h-[6.75rem] md:min-h-[4.5rem]",
          )}
        >
          <div className="flex h-12 w-12 shrink-0 rotate-2 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-500 text-white shadow-md shadow-cyan-900/25 sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl">
            <User
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black leading-tight tracking-tight text-cyan-950 sm:text-[17px] md:text-[18px]">
              我的空間
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-cyan-800/80 sm:text-[12px]">
              膠囊＋公開混合時間流
            </p>
          </div>
          <ChevronRight
            className="ml-auto h-6 w-6 shrink-0 text-cyan-400/80 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      </button>

      <button
        type="button"
        onClick={() => onNavigate("favorites")}
        className={cn(
          cardShell,
          "col-span-2 border-violet-400/90 bg-gradient-to-br from-violet-50 via-fuchsia-50/60 to-pink-50 ring-0 ring-violet-100/90 md:col-span-1 md:ring-2",
        )}
      >
        <div className="pointer-events-none absolute right-2 top-0 h-20 w-20 rounded-full bg-fuchsia-200/40 blur-2xl" />
        <div
          className={cn(
            rowInner,
            "min-h-[5.5rem] flex-row items-center sm:min-h-[6.75rem] md:min-h-[4.5rem]",
          )}
        >
          <div className="flex h-12 w-12 shrink-0 -rotate-3 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-900/25 sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl">
            <Bookmark
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black leading-tight tracking-tight text-violet-950 sm:text-[17px] md:text-[18px]">
              藏心底
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-violet-800/80 sm:text-[12px]">
              共 {favCount} 則偷偷收著
            </p>
          </div>
          <ChevronRight
            className="ml-auto h-6 w-6 shrink-0 text-violet-400/80 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      </button>
      <button
        type="button"
        onClick={() => onNavigate("my_reports")}
        className={cn(
          cardShell,
          "col-span-2 border-sky-300/90 bg-gradient-to-br from-sky-50 via-white to-indigo-50 ring-0 ring-sky-100/90 md:col-span-1 md:ring-2",
        )}
      >
        <div className="pointer-events-none absolute right-2 top-0 h-20 w-20 rounded-full bg-sky-200/35 blur-2xl" />
        <div
          className={cn(
            rowInner,
            "min-h-[5.5rem] flex-row items-center sm:min-h-[6.75rem] md:min-h-[4.5rem]",
          )}
        >
          <div className="flex h-12 w-12 shrink-0 rotate-1 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-md shadow-sky-900/25 sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl">
            <MessagesSquare
              className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              strokeWidth={2.25}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black leading-tight tracking-tight text-sky-950 sm:text-[17px] md:text-[18px]">
              我的舉報
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-sky-800/80 sm:text-[12px]">
              {myReportsCount > 0
                ? `共 ${myReportsCount} 則，點查看審核狀態`
                : "查看舉報審核結果"}
            </p>
          </div>
          <ChevronRight
            className="ml-auto h-6 w-6 shrink-0 text-sky-400/80 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      </button>
      {showSuperOpsCard ? (
        <button
          type="button"
          onClick={() => onNavigate("admin_ops")}
          className={cn(
            cardShell,
            "col-span-2 border-emerald-500/90 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 ring-0 ring-emerald-500/25 md:col-span-1 md:ring-2 text-white",
          )}
        >
          <div className="pointer-events-none absolute right-2 top-0 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
          <div
            className={cn(
              rowInner,
              "min-h-[5.5rem] flex-row items-center sm:min-h-[6.75rem] md:min-h-[4.5rem]",
            )}
          >
            <div className="flex h-12 w-12 shrink-0 -rotate-2 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 shadow-md sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl">
              <LayoutDashboard
                className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
                strokeWidth={2.25}
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-black leading-tight tracking-tight text-white sm:text-[17px] md:text-[18px]">
                超管指揮台
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-100/85 sm:text-[12px]">
                總覽 · 權限 · 維運
              </p>
            </div>
            <ChevronRight
              className="ml-auto h-6 w-6 shrink-0 text-emerald-200/80 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </div>
        </button>
      ) : null}
      {showAdminCard ? (
        <button
          type="button"
          onClick={() => onNavigate("admin")}
          className={cn(
            cardShell,
            "col-span-2 border-rose-400/90 bg-gradient-to-br from-rose-50 via-white to-orange-50 ring-0 ring-rose-100/90 md:col-span-1 md:ring-2",
          )}
        >
          <div className="pointer-events-none absolute right-2 top-0 h-20 w-20 rounded-full bg-rose-200/40 blur-2xl" />
          <div
            className={cn(
              rowInner,
              "min-h-[5.5rem] flex-row items-center sm:min-h-[6.75rem] md:min-h-[4.5rem]",
            )}
          >
            <div className="flex h-12 w-12 shrink-0 -rotate-2 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md shadow-rose-900/25 sm:h-14 sm:w-14 md:h-[4.25rem] md:w-[4.25rem] md:rounded-2xl">
              <Lock
                className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
                strokeWidth={2.25}
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-black leading-tight tracking-tight text-rose-950 sm:text-[17px] md:text-[18px]">
                管理後台
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-rose-800/80 sm:text-[12px]">
                舉報池與審核操作
              </p>
            </div>
            <ChevronRight
              className="ml-auto h-6 w-6 shrink-0 text-rose-400/80 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </div>
        </button>
      ) : null}
    </div>
  );
}

function NavTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1.5 text-[12px] font-medium tracking-tight transition-all duration-200 shrink-0",
        active
          ? "text-white bg-gradient-to-b from-white/[0.22] to-white/[0.06] shadow-[0_1px_10px_rgba(0,0,0,0.35)] ring-1 ring-white/15"
          : "text-white/55 hover:text-white/95 hover:bg-white/[0.07]",
      )}
    >
      {label}
    </button>
  );
}

function MessageTile({
  msg,
  active,
  onClick,
  currentUserEmail,
  pillLayoutScope,
  listTone,
}: {
  msg: Message;
  active: boolean;
  onClick: () => void;
  currentUserEmail?: string;
  pillLayoutScope: "inbox" | "outbox";
  listTone: "sealed" | "opened";
}) {
  /** 寄件匣：只有「寫給自己」才顯示致未來的自己；收件匣：自己寄給自己同上，否則顯示寄件人 */
  const title =
    pillLayoutScope === "outbox"
      ? emailsEqual(msg.recipientEmail, currentUserEmail)
        ? "致未來的自己"
        : `致 ${msg.recipientEmail?.split("@")[0] ?? "收件人"}`
      : emailsEqual(msg.senderEmail, currentUserEmail) &&
          emailsEqual(msg.recipientEmail, currentUserEmail)
        ? "致未來的自己"
        : `來自 ${msg.senderEmail?.split("@")[0] ?? "寄件人"}`;
  const schedShort = new Date(msg.scheduledAt).toLocaleDateString("zh-TW", {
    month: "numeric",
    day: "numeric",
  });
  const recvShort =
    msg.createdAt != null
      ? new Date(msg.createdAt).toLocaleString("zh-TW", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : schedShort;

  /** 未解封時「預定開啟／預定」與標題同一列（原狀態 chip 旁）；第二行為「開啟 …」 */
  const scheduleBesideTitle =
    !msg.isDue &&
    (pillLayoutScope === "inbox"
      ? `預定開啟 ${schedShort}`
      : `預定 ${schedShort}`);
  const metaLine = `開啟 ${recvShort}`;

  /** 已寄出：收件人為登入者，或寄／收同址（寫給自己）時不顯示「寄給」 */
  const toSelfByAccount =
    Boolean(msg.recipientEmail) &&
    (emailsEqual(msg.recipientEmail, currentUserEmail) ||
      emailsEqual(msg.senderEmail, msg.recipientEmail));
  const showRecipientLine =
    pillLayoutScope === "outbox" &&
    Boolean(msg.recipientEmail) &&
    !toSelfByAccount;

  const statusChip = msg.isDue ? "拆開了" : "還沒拆";

  return (
    <div
      onClick={onClick}
      className={cn(
        "pl-2.5 pr-2 py-1.5 cursor-pointer rounded-lg transition-[background-color,box-shadow] duration-200 relative group overflow-hidden border-y border-r border-black/[0.05]",
        listTone === "sealed"
          ? "border-l-[3px] border-l-amber-400/90 bg-gradient-to-br from-amber-50/95 via-white/70 to-amber-100/35 hover:from-amber-50 hover:via-white/80 hover:to-amber-100/45"
          : "border-l-[3px] border-l-sky-500/90 bg-gradient-to-br from-sky-50/90 via-white/70 to-sky-100/35 hover:from-sky-50 hover:via-white/80 hover:to-sky-100/45",
        active
          ? cn(
              "shadow-sm ring-1 ring-black/[0.06] border-y-black/[0.06] border-r-black/[0.06]",
              listTone === "sealed"
                ? "border-l-amber-400 bg-gradient-to-br from-white via-amber-50/40 to-amber-100/25"
                : "border-l-sky-500 bg-gradient-to-br from-white via-sky-50/40 to-sky-100/25",
            )
          : null,
      )}
    >
      <div className="flex items-stretch gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="text-[13px] font-semibold tracking-tight text-apple-near-black truncate min-w-0 flex-1 leading-snug">
              {title}
            </h3>
            {scheduleBesideTitle ? (
              <span className="text-[10px] font-medium text-black/45 tabular-nums shrink-0 whitespace-nowrap">
                {scheduleBesideTitle}
              </span>
            ) : null}
          </div>
          <p className="text-[10px] text-black/38 tabular-nums truncate mt-0.5 leading-tight">
            {metaLine}
          </p>
          {showRecipientLine ? (
            <p
              className="text-[10px] text-black/40 mt-0.5 truncate"
              title={msg.recipientEmail}
            >
              寄給 {msg.recipientEmail}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 flex flex-col items-center justify-center self-center">
          <span
            className={cn(
              "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-1 rounded-md text-center leading-tight max-w-[4.5rem]",
              msg.isDue
                ? "bg-gradient-to-b from-sky-100/95 to-sky-50/85 text-sky-800/90 ring-1 ring-sky-200/60"
                : "bg-gradient-to-b from-amber-100/95 to-amber-50/85 text-amber-900/85 ring-1 ring-amber-200/60",
            )}
          >
            {statusChip}
          </span>
        </div>
      </div>

      {active && (
        <motion.div
          layoutId={`active-pill-${pillLayoutScope}-${listTone}`}
          className={cn(
            "absolute left-0 top-[10%] bottom-[10%] w-0.5 rounded-r-full",
            listTone === "sealed" ? "bg-amber-500" : "bg-sky-500",
          )}
        />
      )}
    </div>
  );
}

export default function App() {
  const { identity, isActive: connected } = useSpacetimeDB();
  if (!connected || !identity) {
    return (
      <div className="min-h-screen bg-apple-black flex flex-col items-center justify-center p-6 font-sans text-white">
        <Loader2 className="w-8 h-8 animate-spin text-apple-blue mb-4" />
        <p className="text-[15px] text-white/70">連線至 SpacetimeDB…</p>
      </div>
    );
  }
  return <SpacetimeMailboxApp identity={identity} />;
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9px] font-semibold text-black/35 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[13px] font-medium tracking-tight text-apple-near-black truncate">
        {value}
      </span>
    </div>
  );
}
