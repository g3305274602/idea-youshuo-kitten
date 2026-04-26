import { Timestamp, type Identity } from "spacetimedb";

import { CAPSULE_LAST_SHOWN_KEY } from "../constants";
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
  const openCapsuleDrawer = () => {
    params.setCapsuleOpen(true);
    params.setCapsuleSwitching(false);
    params.setSquareActionError("");
    const last =
      typeof window !== "undefined"
        ? sessionStorage.getItem(CAPSULE_LAST_SHOWN_KEY)
        : null;
    let pool = last
      ? params.capsuleEligiblePool.filter((p) => p.id !== last)
      : [...params.capsuleEligiblePool];
    if (pool.length === 0) pool = [...params.capsuleEligiblePool];
    if (pool.length === 0) {
      params.setCapsulePostId(null);
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
    params.setCapsulePostId(pick.id);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(CAPSULE_LAST_SHOWN_KEY, pick.id);
    }
  };

  const pickAnotherCapsule = async () => {
    if (!params.capsulePostId) return;
    const pool = params.capsuleEligiblePool.filter((p) => p.id !== params.capsulePostId);
    if (pool.length === 0) {
      params.setSquareActionError("目前沒有另一則能換囉");
      return;
    }
    params.setCapsuleSwitching(true);
    params.setSquareActionError("");
    params.setCapsulePrivateDraft("");
    await new Promise((resolve) => {
      const timer = typeof window !== "undefined" ? window.setTimeout : setTimeout;
      timer(resolve, 520);
    });
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
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
  };

  const jumpToChatFromCapsule = (sourceMessageId: string) => {
    const guestHex = params.identity.toHexString();
    params.setChatBackTab(params.activeTab === "chat" ? null : params.activeTab);
    params.setSelectedChatThreadKey(`${sourceMessageId}::${guestHex}`);
    params.setActiveTab("chat");
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
    params.setSelectedChatThreadKey(null);
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
