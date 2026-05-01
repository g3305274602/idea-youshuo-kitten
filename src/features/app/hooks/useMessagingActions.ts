import type React from "react";
import { Identity } from "spacetimedb";
import {
  isServerPrivateAlternatingRestriction,
  TOAST_PRIVATE_ALTERNATING_WAIT_PEER,
} from "../constants";
import {
  forceReauthRedirect,
  isSessionInvalidErrorMessage,
} from "../sessionGuard";

type UseMessagingActionsParams = {
  selectedMessageId: string | null;
  setLoading: (v: boolean) => void;
  setSquareActionError: (v: string) => void;
  onPointsToast: (delta: number, action: string, settled?: boolean) => void;
  /** 與 points toast 共用底欄漂浮提示（約 2.2s） */
  onNoticeToast?: (message: string) => void;
  publishRepliesPublic: boolean;
  publishIncludeThread: boolean;
  publishIncludeCapsulePrivate: boolean;
  publishShowSender: boolean;
  publishShowRecipient: boolean;
  publishToSquare: (args: {
    sourceMessageId: string;
    sourceKind: undefined;
    repliesPublic: boolean;
    includeThreadInSnapshot: boolean;
    includeCapsulePrivateInSnapshot: boolean;
    showSenderOnSquare: boolean;
    showRecipientOnSquare: boolean;
  }) => Promise<unknown>;
  setPublishModalOpenWithStack: (v: boolean) => void;
  unpublishFromSquare: (args: { sourceMessageId: string }) => Promise<unknown>;
  mySquareReactionByPost: Map<string, string>;
  setSquareReaction: (args: {
    sourceMessageId: string;
    kind: "up" | "down" | "mid" | "none";
  }) => Promise<unknown>;
  exchangeAppendDraft: string;
  setExchangeAppendBusy: (v: boolean) => void;
  appendLetterExchange: (args: { messageId: string; body: string }) => Promise<unknown>;
  setExchangeAppendDraft: (v: string) => void;
  squareCommentDraft: string;
  addSquareComment: (args: {
    sourceMessageId: string;
    body: string;
    parentCommentId: string;
  }) => Promise<unknown>;
  setSquareCommentDraft: (v: string) => void;
  capsulePrivateDraft: string;
  addCapsulePrivateMessage: (args: {
    sourceMessageId: string;
    threadGuestIdentity: Identity;
    body: string;
  }) => Promise<unknown>;
  getCapsuleThreadMessageCount: (sourceMessageId: string, threadGuestHex: string) => number;
  setCapsulePrivateDraft: (v: string) => void;
  isCapsuleParticipantUi: boolean;
  identity: Identity;
  jumpToChatFromCapsule: (sourceMessageId: string) => void;
  chatDraft: string;
  selectedChatThread:
    | { sourceMessageId: string; threadGuestHex: string }
    | null
    | undefined;
  selectedChatMessageCount: number;
  authIsWarned: boolean;
  myMuteEndAt?: bigint;
  setChatDraft: (v: string) => void;
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
  textLimit: number;
};

export function useMessagingActions(params: UseMessagingActionsParams) {
  const toastAlternatingIfNeeded = (err: unknown) => {
    if (!params.onNoticeToast || !isServerPrivateAlternatingRestriction(err)) {
      return false;
    }
    params.onNoticeToast(TOAST_PRIVATE_ALTERNATING_WAIT_PEER);
    return true;
  };

  const pointsForPrivateMessage = (threadCountBefore: number): number => {
    if (threadCountBefore <= 0) return 5;
    if (threadCountBefore < 10) return 2;
    return 0;
  };
  const handleSessionInvalid = (msg: string) => {
    if (!isSessionInvalidErrorMessage(msg)) return false;
    params.setSquareActionError("登入已在其他裝置更新，請重新登入。");
    forceReauthRedirect();
    return true;
  };

  const submitPublishToSquare = async () => {
    if (!params.selectedMessageId) return;
    params.setLoading(true);
    params.setSquareActionError("");
    try {
      await params.publishToSquare({
        sourceMessageId: params.selectedMessageId,
        sourceKind: undefined,
        repliesPublic: params.publishRepliesPublic,
        includeThreadInSnapshot: params.publishIncludeThread,
        includeCapsulePrivateInSnapshot: params.publishIncludeCapsulePrivate,
        showSenderOnSquare: params.publishShowSender,
        showRecipientOnSquare: params.publishShowRecipient,
      });
      params.setPublishModalOpenWithStack(false);
      params.onPointsToast(-10, "發布到廣場");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (handleSessionInvalid(msg)) return;
      params.setSquareActionError(msg || "貼到牆上失敗");
    } finally {
      params.setLoading(false);
    }
  };

  const handleUnpublishSquare = async (sourceMessageId: string) => {
    params.setSquareActionError("");
    try {
      await params.unpublishFromSquare({ sourceMessageId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (handleSessionInvalid(msg)) return;
      params.setSquareActionError(msg || "撤下失敗");
    }
  };

  const handleSetSquareReaction = async (
    sourceMessageId: string,
    kind: "up" | "down" | "mid",
  ) => {
    params.setSquareActionError("");
    try {
      const cur = params.mySquareReactionByPost.get(sourceMessageId);
      const nextKind = cur === kind ? "none" : kind;
      await params.setSquareReaction({ sourceMessageId, kind: nextKind });
      if (nextKind === "up") {
        params.onPointsToast(0, "收到按讚", true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (handleSessionInvalid(msg)) return;
      params.setSquareActionError(msg || "反應失敗");
    }
  };

  const handleAppendLetterExchange = async (messageId: string) => {
    const body = params.exchangeAppendDraft.trim();
    if (!body) return;
    if (body.length > params.textLimit) {
      params.setSquareActionError(`內容最多 ${params.textLimit} 字`);
      return;
    }
    params.setExchangeAppendBusy(true);
    params.setSquareActionError("");
    try {
      await params.appendLetterExchange({ messageId, body });
      params.setExchangeAppendDraft("");
    } catch (err: any) {
      const msg = err.message || String(err);
      if (handleSessionInvalid(msg)) return;
      params.setSquareActionError(msg);
    } finally {
      params.setExchangeAppendBusy(false);
    }
  };

  const handleAddSquareComment = async (sourceMessageId: string) => {
    const body = params.squareCommentDraft.trim();
    if (!body) return;
    if (body.length > params.textLimit) {
      params.setSquareActionError(`評論最多 ${params.textLimit} 字`);
      return;
    }
    params.setSquareActionError("");
    try {
      await params.addSquareComment({ sourceMessageId, body, parentCommentId: "" });
      params.setSquareCommentDraft("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (handleSessionInvalid(msg)) return;
      params.setSquareActionError(msg || "留言失敗");
    }
  };

  const handleAddCapsulePrivateMessage = async (
    sourceMessageId: string,
    threadGuestHex: string | null,
  ) => {
    const body = params.capsulePrivateDraft.trim();
    if (!body) return;
    if (body.length > params.textLimit) {
      params.setSquareActionError(`內容最多 ${params.textLimit} 字`);
      return;
    }
    if (!threadGuestHex) {
      params.setSquareActionError("寄件／收件請先選一條訪客線，或等訪客開線");
      return;
    }
    params.setSquareActionError("");
    try {
      const beforeCount = params.getCapsuleThreadMessageCount(
        sourceMessageId,
        threadGuestHex,
      );
      await params.addCapsulePrivateMessage({
        sourceMessageId,
        threadGuestIdentity: Identity.fromString(threadGuestHex),
        body,
      });
      params.setCapsulePrivateDraft("");
      const delta = pointsForPrivateMessage(beforeCount);
      if (delta > 0) {
        params.onPointsToast(
          delta,
          beforeCount <= 0 ? "建立私線" : "私線回覆（未解鎖前）",
        );
      }
      if (!params.isCapsuleParticipantUi && threadGuestHex === params.identity.toHexString()) {
        params.jumpToChatFromCapsule(sourceMessageId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (handleSessionInvalid(msg)) return;
      if (toastAlternatingIfNeeded(err)) {
        params.setSquareActionError("");
        return;
      }
      params.setSquareActionError(msg || "膠囊私訊送出失敗");
    }
  };

  const handleSendChatMessage = async () => {
    const body = params.chatDraft.trim();
    if (!params.selectedChatThread) {
      params.setSquareActionError("目前聊天線已失效，請重新選擇一條聊聊後再發送。");
      return;
    }
    if (!body) return;
    if (params.authIsWarned) {
      const endStr = params.myMuteEndAt
        ? `至 ${new Date(Number(params.myMuteEndAt / 1000n)).toLocaleDateString("zh-TW")}`
        : "永久";
      params.setSquareActionError(`你已被禁言（${endStr}），無法發送聊聊訊息。`);
      return;
    }
    if (body.length > params.textLimit) {
      params.setSquareActionError(`內容最多 ${params.textLimit} 字`);
      return;
    }
    params.setSquareActionError("");
    try {
      const beforeCount = params.selectedChatMessageCount;
      await params.addCapsulePrivateMessage({
        sourceMessageId: params.selectedChatThread.sourceMessageId,
        threadGuestIdentity: Identity.fromString(params.selectedChatThread.threadGuestHex),
        body,
      });
      params.setChatDraft("");
      const delta = pointsForPrivateMessage(beforeCount);
      if (delta > 0) {
        params.onPointsToast(
          delta,
          beforeCount <= 0 ? "建立私線" : "私線回覆（未解鎖前）",
        );
      }
      if (params.chatInputRef.current) {
        params.chatInputRef.current.style.height = "44px";
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (handleSessionInvalid(msg)) return;
      if (toastAlternatingIfNeeded(err)) {
        params.setSquareActionError("");
        return;
      }
      params.setSquareActionError(msg || "聊天訊息送出失敗");
    }
  };

  const resizeChatInput = (value: string) => {
    params.setChatDraft(value);
    if (!params.chatInputRef.current) return;
    params.chatInputRef.current.style.height = "44px";
    const next = Math.min(params.chatInputRef.current.scrollHeight, 84);
    params.chatInputRef.current.style.height = `${next}px`;
  };

  return {
    submitPublishToSquare,
    handleUnpublishSquare,
    handleSetSquareReaction,
    handleAppendLetterExchange,
    handleAddSquareComment,
    handleAddCapsulePrivateMessage,
    handleSendChatMessage,
    resizeChatInput,
  };
}
