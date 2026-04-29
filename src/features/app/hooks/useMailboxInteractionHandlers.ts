import { Timestamp, type Identity } from "spacetimedb";

import {
  CAPSULE_FORWARD_SHOWN_KEY,
  CAPSULE_LAST_SHOWN_KEY,
  CAPSULE_PREV_SHOWN_KEY,
  CAPSULE_SHOWN_IDS_KEY,
} from "../constants";
import { isoToDatetimeLocalValue } from "../helpers";

type OutboxRow = {
  id: string;
  recipientEmail: string;
  content: string;
  scheduledAt: { toISOString: () => string };
  isWaitListVisible: boolean;
};

type SquarePostRow = {
  sourceMessageId: string;
  repliesPublic: boolean;
  includeThreadInSnapshot: boolean;
  includeCapsulePrivateInSnapshot: boolean;
  showSenderOnSquare: boolean;
  showRecipientOnSquare: boolean;
};

type MessageLike = {
  _id: string;
  isDue: boolean;
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

type UseMailboxInteractionHandlersParams = {
  identity: Identity;
  activeTab: string;
  setActiveTab: (value: any) => void;
  setChatBackTab: (value: any) => void;
  spaceBackTab: any;
  setSpaceBackTab: (value: any) => void;
  setSpaceTargetInfo: (value: any) => void;
  myAccountId?: string;
  setSpaceOwnerHex: (value: any) => void;
  setSelectedMessageId: (value: any) => void;
  setSquareSelectedPostId: (value: any) => void;
  setFavoriteSelectedId: (value: any) => void;
  setSelectedChatThreadKey: (value: any) => void;
  setSelectedAdminReportId: (value: any) => void;
  setSquareActionError: (value: any) => void;
  capsuleEligiblePool: Array<{ id: string }>;
  capsulePostId: string | null;
  setCapsuleOpen: (value: any) => void;
  setCapsuleSwitching: (value: any) => void;
  setCapsulePostId: (value: any) => void;
  setCapsulePrivateDraft: (value: any) => void;
  setCapsuleThreadGuestHex: (value: any) => void;
  onPointsToast: (delta: number, action: string, settled?: boolean) => void;
  drawCapsuleOnce: (args: {}) => Promise<unknown>;
  deleteCapsuleMessage: (args: { id: string }) => Promise<unknown>;
  myProfile: unknown;
  currentMessage: MessageLike | null | undefined;
  outboxRows: readonly OutboxRow[];
  squarePostRows: readonly SquarePostRow[];
  setOutboxEditForm: (value: any) => void;
  setOutboxEditOpen: (value: any) => void;
  setOutboxEditError: (value: any) => void;
  setOutboxEditLoading: (value: any) => void;
  outboxEditForm: OutboxEditForm;
  setOutboxEditSaving: (value: any) => void;
  updateScheduledMessage: (args: {
    id: string;
    recipientEmail: string;
    content: string;
    scheduledAt: Timestamp;
    isWaitListVisible: boolean;
    publishToSquare: boolean;
    squareRepliesPublic: boolean;
    squareIncludeThread: boolean;
    squareIncludeCapsulePrivate: boolean;
    squareShowSender: boolean;
    squareShowRecipient: boolean;
  }) => Promise<unknown>;
  deleteScheduledMessage: (args: { id: string }) => Promise<unknown>;
  setOutboxDeleteConfirmOpenWithStack: (value: boolean) => void;
  outbox: Array<{ _id: string }>;
};

export function useMailboxInteractionHandlers(
  params: UseMailboxInteractionHandlersParams,
) {
  const readShownCapsuleIds = (): Set<string> => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      const raw = sessionStorage.getItem(CAPSULE_SHOWN_IDS_KEY);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set<string>();
      return new Set(
        parsed.filter((x): x is string => typeof x === "string" && x.length > 0),
      );
    } catch {
      return new Set<string>();
    }
  };

  const writeShownCapsuleIds = (ids: Set<string>) => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(CAPSULE_SHOWN_IDS_KEY, JSON.stringify([...ids]));
  };

  const readPrevCapsuleId = (): string | null => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(CAPSULE_PREV_SHOWN_KEY);
    return raw && raw.length > 0 ? raw : null;
  };

  const writePrevCapsuleId = (id: string | null) => {
    if (typeof window === "undefined") return;
    if (id && id.length > 0) {
      sessionStorage.setItem(CAPSULE_PREV_SHOWN_KEY, id);
      return;
    }
    sessionStorage.removeItem(CAPSULE_PREV_SHOWN_KEY);
  };

  const readForwardCapsuleId = (): string | null => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(CAPSULE_FORWARD_SHOWN_KEY);
    return raw && raw.length > 0 ? raw : null;
  };

  const writeForwardCapsuleId = (id: string | null) => {
    if (typeof window === "undefined") return;
    if (id && id.length > 0) {
      sessionStorage.setItem(CAPSULE_FORWARD_SHOWN_KEY, id);
      return;
    }
    sessionStorage.removeItem(CAPSULE_FORWARD_SHOWN_KEY);
  };

  const openCapsuleDrawer = async () => {
    try {
      await params.drawCapsuleOnce({});
      params.onPointsToast(-10, "抽取膠囊");
    } catch (error) {
      params.setSquareActionError(error instanceof Error ? error.message : "抽膠囊失敗");
      return;
    }
    params.setCapsuleOpen(true);
    params.setCapsuleSwitching(false);
    params.setSquareActionError("");
    // 新一輪抽取：清空「本輪已出現」集合，確保從完整候選池開始。
    const shownIds = new Set<string>();
    writeShownCapsuleIds(shownIds);
    writePrevCapsuleId(null);
    writeForwardCapsuleId(null);
    const pool = [...params.capsuleEligiblePool];
    if (pool.length === 0) {
      params.setCapsulePostId(null);
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
    shownIds.add(pick.id);
    writeShownCapsuleIds(shownIds);
    params.setCapsulePostId(pick.id);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CAPSULE_LAST_SHOWN_KEY, pick.id);
    }
  };

  const pickAnotherCapsule = async () => {
    if (!params.capsulePostId) return;
    const shownIds = readShownCapsuleIds();
    shownIds.add(params.capsulePostId);
    const pool = params.capsuleEligiblePool.filter((p) => !shownIds.has(p.id));
    const forwardId = readForwardCapsuleId();
    const canResumeForward =
      !!forwardId &&
      forwardId !== params.capsulePostId &&
      params.capsuleEligiblePool.some((p) => p.id === forwardId);
    if (pool.length === 0) {
      if (canResumeForward) {
        params.setCapsuleSwitching(true);
        params.setSquareActionError("");
        params.setCapsulePrivateDraft("");
        await new Promise((resolve) => {
          const timer = typeof window !== "undefined" ? window.setTimeout : setTimeout;
          timer(resolve, 520);
        });
        params.setCapsulePostId(forwardId!);
        writeForwardCapsuleId(null);
        writePrevCapsuleId(null);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(CAPSULE_LAST_SHOWN_KEY, forwardId!);
        }
        params.setCapsuleSwitching(false);
        return;
      }
      writeShownCapsuleIds(shownIds);
      // 無可換項目時，改為進入空狀態（符合「換一換後到空狀態」）
      params.setSquareActionError("");
      params.setCapsulePostId(null);
      writeForwardCapsuleId(null);
      return;
    }
    params.setCapsuleSwitching(true);
    params.setSquareActionError("");
    params.setCapsulePrivateDraft("");
    await new Promise((resolve) => {
      const timer = typeof window !== "undefined" ? window.setTimeout : setTimeout;
      timer(resolve, 520);
    });
    const pick = canResumeForward
      ? params.capsuleEligiblePool.find((p) => p.id === forwardId)!
      : pool[Math.floor(Math.random() * pool.length)]!;
    writePrevCapsuleId(canResumeForward ? null : params.capsulePostId);
    writeForwardCapsuleId(null);
    shownIds.add(pick.id);
    writeShownCapsuleIds(shownIds);
    params.setCapsulePostId(pick.id);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CAPSULE_LAST_SHOWN_KEY, pick.id);
    }
    params.setCapsuleSwitching(false);
  };

  const closeCapsuleDrawer = () => {
    params.setCapsuleOpen(false);
    params.setCapsuleSwitching(false);
    params.setCapsulePostId(null);
    params.setCapsulePrivateDraft("");
    params.setCapsuleThreadGuestHex(null);
    params.setSquareActionError("");
    writePrevCapsuleId(null);
    writeForwardCapsuleId(null);
  };

  const prevCapsuleId = readPrevCapsuleId();
  const canViewPreviousCapsule =
    !!params.capsulePostId &&
    !!prevCapsuleId &&
    prevCapsuleId !== params.capsulePostId &&
    params.capsuleEligiblePool.some((p) => p.id === prevCapsuleId);

  const viewPreviousCapsule = () => {
    if (!canViewPreviousCapsule || !prevCapsuleId) return;
    params.setCapsuleSwitching(false);
    params.setSquareActionError("");
    writeForwardCapsuleId(params.capsulePostId);
    params.setCapsulePostId(prevCapsuleId);
    // 只允許單步回看：看過一次即清空，避免無限回溯。
    writePrevCapsuleId(null);
  };

  const jumpToChatFromCapsule = (sourceMessageId: string) => {
    const guestHex = params.identity.toHexString();
    params.setChatBackTab(params.activeTab === "chat" ? null : params.activeTab);
    params.setSelectedChatThreadKey(`${sourceMessageId}::${guestHex}`);
    params.setActiveTab("chat");
    params.setFavoriteSelectedId(null);
    params.setSelectedMessageId(null);
    params.setCapsuleOpen(false);
    params.setCapsulePostId(null);
    params.setSquareSelectedPostId(null);
    params.setCapsulePrivateDraft("");
    params.setCapsuleThreadGuestHex(null);
    params.setSquareActionError("");
  };

  const openSpace = (
    targetAccountId: string,
    targetName: string,
    targetGender: string,
    targetBirthDate?: any,
  ) => {
    const fromChatThread = params.activeTab === "chat";
    params.setSpaceBackTab(
      params.activeTab === "space" ? params.spaceBackTab : params.activeTab,
    );
    params.setSpaceTargetInfo({
      accountId: targetAccountId,
      displayName: targetName,
      gender: targetGender,
      birthDate: targetBirthDate,
    });
    const isTargetMe = targetAccountId === params.myAccountId;
    params.setSpaceOwnerHex(isTargetMe ? params.identity.toHexString() : "__OTHER_USER__");
    params.setActiveTab("space");
    params.setCapsuleOpen(false);
    params.setSquareSelectedPostId(null);
    params.setSelectedMessageId(null);
    params.setFavoriteSelectedId(null);
    // 從聊天視窗進入空間時保留 thread，返回可直接回到同一個對話。
    if (!fromChatThread) params.setSelectedChatThreadKey(null);
    params.setSelectedAdminReportId(null);
    params.setSquareActionError("");
  };

  const handleDeleteCapsuleMessage = async (id: string) => {
    params.setSquareActionError("");
    try {
      await params.deleteCapsuleMessage({ id });
      if (params.capsulePostId === id) closeCapsuleDrawer();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      params.setSquareActionError(msg || "刪除膠囊失敗");
    }
  };

  const beginOutboxEdit = async () => {
    if (
      !params.myProfile ||
      !params.currentMessage ||
      params.activeTab !== "outbox" ||
      params.currentMessage.isDue
    )
      return;
    params.setOutboxEditLoading(true);
    params.setOutboxEditError("");
    try {
      const row = params.outboxRows.find((r) => r.id === params.currentMessage!._id);
      if (!row) {
        params.setOutboxEditError("無法載入內容");
        return;
      }
      const sp = params.squarePostRows.find(
        (p) => p.sourceMessageId === params.currentMessage!._id,
      );
      params.setOutboxEditForm({
        recipientEmail: row.recipientEmail,
        content: row.content,
        scheduledAtLocal: isoToDatetimeLocalValue(row.scheduledAt.toISOString()),
        isWaitListVisible: row.isWaitListVisible,
        publishToSquare: !!sp,
        squareRepliesPublic: sp?.repliesPublic ?? false,
        squareIncludeThread: sp?.includeThreadInSnapshot ?? false,
        squareIncludeCapsulePrivate: sp?.includeCapsulePrivateInSnapshot ?? false,
        squareShowSender: sp?.showSenderOnSquare ?? true,
        squareShowRecipient: sp?.showRecipientOnSquare ?? true,
      });
      params.setOutboxEditOpen(true);
    } catch {
      params.setOutboxEditError("載入失敗，請稍後再試");
    } finally {
      params.setOutboxEditLoading(false);
    }
  };

  const cancelOutboxEdit = () => {
    params.setOutboxEditOpen(false);
    params.setOutboxEditForm(null);
    params.setOutboxEditError("");
  };

  const saveOutboxEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !params.myProfile ||
      !params.currentMessage ||
      !params.outboxEditForm ||
      params.activeTab !== "outbox"
    )
      return;
    const d = new Date(params.outboxEditForm.scheduledAtLocal);
    if (Number.isNaN(d.getTime())) {
      params.setOutboxEditError("請選擇有效的開啟時間");
      return;
    }
    params.setOutboxEditSaving(true);
    params.setOutboxEditError("");
    try {
      await params.updateScheduledMessage({
        id: params.currentMessage._id,
        recipientEmail: params.outboxEditForm.recipientEmail.trim().toLowerCase(),
        content: params.outboxEditForm.content.trim(),
        scheduledAt: Timestamp.fromDate(d),
        isWaitListVisible: params.outboxEditForm.isWaitListVisible,
        publishToSquare: params.outboxEditForm.publishToSquare,
        squareRepliesPublic: params.outboxEditForm.publishToSquare
          ? params.outboxEditForm.squareRepliesPublic
          : false,
        squareIncludeThread: params.outboxEditForm.publishToSquare
          ? params.outboxEditForm.squareIncludeThread
          : false,
        squareIncludeCapsulePrivate: params.outboxEditForm.publishToSquare
          ? params.outboxEditForm.squareIncludeCapsulePrivate
          : false,
        squareShowSender: params.outboxEditForm.publishToSquare
          ? params.outboxEditForm.squareShowSender
          : false,
        squareShowRecipient: params.outboxEditForm.publishToSquare
          ? params.outboxEditForm.squareShowRecipient
          : false,
      });
      cancelOutboxEdit();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      params.setOutboxEditError(msg || "儲存失敗");
    } finally {
      params.setOutboxEditSaving(false);
    }
  };

  const confirmDeleteOutboxMessage = async () => {
    if (
      !params.myProfile ||
      !params.currentMessage ||
      params.activeTab !== "outbox" ||
      params.currentMessage.isDue
    )
      return;
    params.setOutboxEditLoading(true);
    params.setOutboxEditError("");
    try {
      await params.deleteScheduledMessage({ id: params.currentMessage._id });
      params.setOutboxDeleteConfirmOpenWithStack(false);
      cancelOutboxEdit();
      params.setSelectedMessageId(params.outbox[0]?._id ?? null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      params.setOutboxEditError(msg || "刪除失敗");
    } finally {
      params.setOutboxEditLoading(false);
    }
  };

  return {
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
  };
}
