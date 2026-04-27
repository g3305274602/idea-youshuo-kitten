import { AlertTriangle, Heart, Home, LayoutGrid, MessageCircle, User } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import type React from "react";

import { cn } from "../../../lib/utils";
import { anonPaperNoteLabel } from "../helpers";
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
  canOpenChatPeerSpace?: boolean;
  isSourceCapsuleMine?: boolean;
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
  /** 解鎖後進入對方空間 */
  onOpenChatPeerSpace?: () => void;
  onResizeChatInput: (value: string) => void;
  onSendChatMessage: () => void;
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
  extension?: Record<string, unknown>;
};

export function ChatMainSection({
  selectedChatThread,
  selectedChatPeerProfile,
  canOpenChatPeerSpace = false,
  isSourceCapsuleMine = false,
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
  onOpenChatPeerSpace,
  onResizeChatInput,
  onSendChatMessage,
  chatInputRef,
}: ChatMainSectionProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const threadKey = selectedChatThread?.key ?? "";
  const lastMessageId =
    selectedChatMessages.length > 0
      ? selectedChatMessages[selectedChatMessages.length - 1]!.id
      : "";

  useLayoutEffect(() => {
    // Keep hooks order stable: effect is always declared, but no-op without thread.
    if (!selectedChatThread) return;
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [selectedChatThread, threadKey, selectedChatMessages.length, lastMessageId]);

  if (!selectedChatThread) {
    return (
      <div className="mx-auto flex min-h-[46vh] max-w-sm items-center justify-center px-4 py-16 text-center">
        <div>
          <MessageCircle className="mx-auto mb-3 h-12 w-12 text-white/15" aria-hidden />
          <p className="text-[15px] font-medium text-[#8E8E93]">先從左側選一條聊聊紀錄</p>
        </div>
      </div>
    );
  }

  const peerRealName = (selectedChatPeerProfile?.displayName ?? "").trim();
  const peerChatTitle = chatPeerUnlocked
    ? peerRealName || selectedChatThread.counterpartLabel
    : anonPaperNoteLabel(selectedChatThread.counterpartGender);

  const unlockRemaining = Math.max(0, 10 - selectedChatProgress);
  const unlockPct = Math.min(100, (selectedChatProgress / 10) * 100);

  return (
    <div className="ys-chat-shell">
      <div className="ys-chat-header">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-[100px] flex-1">
              <div className="flex items-baseline gap-2">
                <h3 className="max-w-full truncate text-[1.125rem] font-bold leading-tight tracking-tight text-white sm:text-[1.25rem]">
                  {peerChatTitle}
                </h3>
                {chatPeerUnlocked ? (
                  <span className="shrink-0 translate-y-px">
                    <GenderIcon
                      gender={
                        selectedChatPeerProfile?.gender ??
                        selectedChatThread.counterpartGender
                      }
                    />
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] font-medium leading-snug text-[#8E8E93]">
                {chatPeerUnlocked
                  ? ""
                  : unlockRemaining > 0
                    ? `再傳 ${unlockRemaining} 則可解鎖對方資料 · 目前 ${selectedChatProgress}/10`
                    : "即將解鎖…"}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onSetSelectedMessageId(selectedChatThread.sourceMessageId);
                  onOpenPublishModal();
                }}
                className="inline-flex items-center gap-1 rounded-full border border-violet-400/35 bg-violet-500/15 px-3 py-1.5 text-[11px] font-semibold text-violet-100 transition-colors hover:border-violet-300/50 hover:bg-violet-500/25"
              >
                <LayoutGrid className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.4} />
                公開對話
              </button>
              {chatPeerUnlocked && onOpenChatPeerSpace ? (
                <button
                  type="button"
                  onClick={onOpenChatPeerSpace}
                  disabled={!canOpenChatPeerSpace}
                  title={
                    canOpenChatPeerSpace
                      ? "前往 TA 的空間"
                      : "對方資料尚未同步，暫時無法開啟空間"
                  }
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-[11px] font-semibold text-white/80 transition-colors hover:border-white/18 hover:bg-white/10",
                    !canOpenChatPeerSpace && "cursor-not-allowed opacity-55",
                  )}
                >
                  <Home className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
                  TA 的空間
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  onOpenReportModal(
                    "chat_account",
                    selectedChatThread.counterpartIdentityHex,
                  )
                }
                title="檢舉帳號"
                aria-label="檢舉帳號"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/8 bg-transparent p-1.5 text-white/50 transition-colors hover:border-red-400/35 hover:bg-red-950/25 hover:text-red-300 active:scale-95"
              >
                <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden />
              </button>
              {chatPeerUnlocked ? (
                <button
                  type="button"
                  onClick={onOpenChatPeerProfile}
                  disabled={!selectedChatPeerProfile}
                  title="查看對方資訊"
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1A1B22] text-white/80 transition-colors hover:bg-[#1A1B22]",
                    !selectedChatPeerProfile && "cursor-not-allowed opacity-55",
                  )}
                >
                  <User className="h-[18px] w-[18px]" strokeWidth={2.3} aria-hidden />
                </button>
              ) : null}
            </div>
          </div>

          {!chatPeerUnlocked ? (
            <div className="flex items-center gap-2.5">
              <div
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1A1B22]"
                title={`解鎖進度 ${selectedChatProgress}/10 · 再 ${unlockRemaining} 則可查看對方資料`}
              >
                <span className="relative inline-block h-[22px] w-[22px] text-rose-400" aria-hidden>
                  <Heart className="h-[22px] w-[22px] text-white/40" strokeWidth={2} />
                  <span
                    className="absolute inset-0 overflow-hidden rounded-sm"
                    style={{
                      clipPath: `inset(${100 - unlockPct}% 0 0 0)`,
                    }}
                  >
                    <Heart className="h-[22px] w-[22px] fill-current text-rose-400" strokeWidth={0} />
                  </span>
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#121319] ring-1 ring-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500/90 via-rose-400/85 to-amber-400/80 transition-[width] duration-300 ease-out"
                    style={{ width: `${unlockPct}%` }}
                  />
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-bold tabular-nums text-[#8E8E93]">
                {selectedChatProgress}/10
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="ys-chat-body">
        <div
          ref={chatScrollRef}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto apple-scroll pr-1"
        >
          {isSourceCapsuleMine ? (
            <div className="ys-chat-bubble-self">
              <div className="mb-1 flex flex-wrap items-center justify-end gap-1.5">
                {/* <p className="text-[10px] font-black text-stone-800/85">
                  我的膠囊主文
                </p> */}
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    capsuleTypeMeta(selectedChatThread.sourceCapsuleType)
                      .chipClass,
                  )}
                >
                  #{capsuleTypeMeta(selectedChatThread.sourceCapsuleType).label}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-right font-bold">
                {selectedChatThread.sourcePreview}
              </p>
            </div>
          ) : (
            <div className="ys-chat-bubble-peer">
              <div className="mb-1 flex items-center gap-1.5">
                <p className="text-[10px] font-black text-[#8E8E93]">
                  {chatPeerUnlocked
                    ? selectedChatThread.counterpartLabel
                    : anonPaperNoteLabel(selectedChatThread.counterpartGender)}
                </p>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    capsuleTypeMeta(selectedChatThread.sourceCapsuleType)
                      .chipClass,
                  )}
                >
                  #{capsuleTypeMeta(selectedChatThread.sourceCapsuleType).label}
                </span>
              </div>
              <p className="whitespace-pre-wrap font-bold">{selectedChatThread.sourcePreview}</p>
            </div>
          )}

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
            <p className="py-8 text-center text-[12px] font-semibold text-white/50">
              目前還沒有對話，先發第一句吧。
            </p>
          ) : null}
        </div>

        <div className="mt-2 border-t border-white/10 pt-2">
          <div className="flex items-end gap-2">
            <textarea
              ref={chatInputRef as React.Ref<HTMLTextAreaElement>}
              value={chatDraft}
              onChange={(e) => onResizeChatInput(e.target.value)}
              maxLength={textLimit}
              rows={1}
              placeholder="輸入聊天內容…"
              className="h-[42px] max-h-[84px] min-h-[42px] flex-1 resize-none rounded-xl px-3 py-2 text-[14px] leading-5 overflow-y-auto ys-night-input ys-hide-scrollbar"
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
