import { Heart, LayoutGrid, MessageCircle, User } from "lucide-react";
import type React from "react";

import { cn } from "../../../lib/utils";
import { GenderIcon } from "./PickerControls";

type ChatMessageItem = {
  id: string;
  authorAccountId: string;
  body: string;
  createdAt: { toDate: () => Date };
};

type ChatMainSectionProps = {
  selectedChatThread: any;
  selectedChatPeerProfile: any;
  chatPeerUnlocked: boolean;
  selectedChatProgress: number;
  selectedChatMessages: readonly ChatMessageItem[];
  myAccountId?: string;
  chatDraft: string;
  textLimit: number;
  capsuleTypeMeta: (capsuleType: number) => { chipClass: string; label: string };
  onSetSelectedMessageId: (id: string) => void;
  onOpenPublishModal: () => void;
  onOpenReportModal: (targetType: "chat_account", targetId: string) => void;
  onOpenChatPeerProfile: () => void;
  onResizeChatInput: (value: string) => void;
  onSendChatMessage: () => void;
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
  extension?: Record<string, unknown>;
};

export function ChatMainSection({
  selectedChatThread,
  selectedChatPeerProfile,
  chatPeerUnlocked,
  selectedChatProgress,
  selectedChatMessages,
  myAccountId,
  chatDraft,
  textLimit,
  capsuleTypeMeta,
  onSetSelectedMessageId,
  onOpenPublishModal,
  onOpenReportModal,
  onOpenChatPeerProfile,
  onResizeChatInput,
  onSendChatMessage,
  chatInputRef,
}: ChatMainSectionProps) {
  if (!selectedChatThread) {
    return (
      <div className="max-w-sm mx-auto text-center py-16 px-4">
        <MessageCircle className="w-12 h-12 mx-auto text-black/10 mb-3" aria-hidden />
        <p className="text-[15px] font-medium text-black/45">先從左側選一條聊聊紀錄</p>
      </div>
    );
  }

  return (
    <div className="ys-chat-shell">
      <div className="ys-chat-header">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="min-w-0 flex items-center gap-2">
              <p className="truncate text-[17px] font-black ys-night-text">
                {selectedChatThread.counterpartLabel}
              </p>
              <GenderIcon gender={selectedChatPeerProfile?.gender} />
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => {
                onSetSelectedMessageId(selectedChatThread.sourceMessageId);
                onOpenPublishModal();
              }}
              className="rounded-lg border border-violet-200/40 bg-violet-500/90 px-2.5 py-1 text-[11px] font-black text-white transition-all hover:bg-violet-400/95"
            >
              <LayoutGrid className="w-3 h-3 inline mr-1" /> 公開對話
            </button>
            <button
              type="button"
              onClick={() =>
                onOpenReportModal(
                  "chat_account",
                  selectedChatThread.counterpartIdentityHex,
                )
              }
              className="rounded-lg border border-red-300/45 bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-200"
            >
              檢舉帳號
            </button>
            <button
              type="button"
              onClick={onOpenChatPeerProfile}
              disabled={!selectedChatPeerProfile || !chatPeerUnlocked}
              title={
                chatPeerUnlocked
                  ? "查看對方資訊"
                  : `互聊進度達 10/10 後解鎖（目前 ${selectedChatProgress}/10）`
              }
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg ys-night-surface transition-colors",
                (!selectedChatPeerProfile || !chatPeerUnlocked) &&
                  "cursor-not-allowed opacity-70",
              )}
            >
              {chatPeerUnlocked ? (
                <User className="h-5 w-5" strokeWidth={2.3} aria-hidden />
              ) : (
                <span className="relative inline-block h-6 w-6 text-rose-500">
                  <Heart className="h-6 w-6 text-stone-400" strokeWidth={2.2} aria-hidden />
                  <span
                    className="absolute inset-0 overflow-hidden"
                    style={{
                      clipPath: `inset(${100 - selectedChatProgress * 10}% 0 0 0)`,
                    }}
                  >
                    <Heart className="h-6 w-6 fill-current text-rose-500" strokeWidth={0} />
                  </span>
                </span>
              )}
            </button>
            {!chatPeerUnlocked ? (
              <p className="text-[10px] font-bold text-rose-300">
                解鎖對方資料 {selectedChatProgress}/10
              </p>
            ) : (
              <p className="text-[10px] font-bold text-emerald-300">對方資料</p>
            )}
          </div>
        </div>
      </div>

      <div className="ys-chat-body">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto apple-scroll pr-1">
          <div className="max-w-[84%] rounded-2xl px-3 py-2 text-[13px] leading-snug ys-night-surface ys-night-text">
            <div className="mb-1 flex items-center gap-1.5">
              <p className="text-[10px] font-black ys-night-text-dim">
                {selectedChatThread.counterpartLabel}
              </p>
              <span
                className={cn(
                  "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                  capsuleTypeMeta(selectedChatThread.sourceCapsuleType).chipClass,
                )}
              >
                #{capsuleTypeMeta(selectedChatThread.sourceCapsuleType).label}
              </span>
            </div>
              <p className="whitespace-pre-wrap font-bold ys-night-text">{selectedChatThread.sourcePreview}</p>
          </div>

          {selectedChatMessages.map((m) => {
            const isMine = m.authorAccountId === myAccountId;
            return (
              <div
                key={m.id}
                className={cn(
                  isMine ? "ys-chat-bubble-self" : "ys-chat-bubble-peer",
                )}
              >
                <p className="whitespace-pre-wrap font-bold">{m.body}</p>
                <p className={cn("mt-1 text-[10px] font-medium tabular-nums", isMine ? "text-stone-700/80" : "ys-night-text-dim")}>
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
            <p className="py-8 text-center text-[12px] font-semibold text-cyan-100/50">
              目前還沒有對話，先發第一句吧。
            </p>
          ) : null}
        </div>

        <div className="mt-2 border-t border-cyan-200/20 pt-2">
          <div className="flex items-end gap-2">
            <textarea
              ref={chatInputRef as React.Ref<HTMLTextAreaElement>}
              value={chatDraft}
              onChange={(e) => onResizeChatInput(e.target.value)}
              maxLength={textLimit}
              rows={1}
              placeholder="輸入聊天內容…"
              className="h-[42px] max-h-[84px] min-h-[42px] flex-1 resize-none rounded-xl px-3 py-2 text-[14px] leading-5 overflow-y-auto ys-night-input"
            />
            <button
              type="button"
              onClick={onSendChatMessage}
              className="shrink-0 rounded-xl px-4 py-2 text-[13px] ys-btn-primary"
            >
              送出
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
