import {
  Bookmark,
  Minus,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";

import { cn } from "../../../lib/utils";
import type { SquareComment, SquarePost } from "../../../module_bindings/types";
import { squareAddressSubtitle } from "../helpers";
import { SecretCapsuleDrawButton } from "../components";

type ReactionCount = { up: number; mid: number; down: number };
type CapsuleAuthorInfo = {
  authorAccountId: string;
  authorDisplayName?: string;
  authorGender: string;
  authorBirthDate?: unknown;
};

type SecretMainSectionProps = {
  selectedSquarePost: SquarePost | null;
  squareActionError: string;
  onSetSquareSelectedPostId: (value: string | null) => void;
  squareReactionCountsByPost: ReadonlyMap<string, ReactionCount>;
  squareCommentsByPost: ReadonlyMap<string, readonly SquareComment[]>;
  onOpenSpace: (
    targetAccountId: string,
    targetName: string,
    targetGender: string,
    targetBirthDate?: unknown,
  ) => void;
  onOpenCapsuleDrawer: () => void;
  displayNameByEmail: ReadonlyMap<string, string>;
  capsulePost: CapsuleAuthorInfo | null;
  now: Date;
  mySquareReactionByPost: ReadonlyMap<string, "up" | "mid" | "down">;
  favoritedPostIds: ReadonlySet<string>;
  myAccountId?: string;
  onSetSquareReaction: (sourceMessageId: string, kind: "up" | "mid" | "down") => void;
  onFavoriteSquare: (sourceMessageId: string) => void;
  onUnfavoriteSquare: (sourceMessageId: string) => void;
  onUnpublishSquare: (sourceMessageId: string) => void;
  onOpenReportModal: (targetType: "square_post", targetId: string) => void;
  squareCommentDraft: string;
  onSetSquareCommentDraft: (value: string) => void;
  onAddSquareComment: (sourceMessageId: string) => void;
  extension?: Record<string, unknown>;
};

export function SecretMainSection({
  selectedSquarePost,
  squareActionError,
  onSetSquareSelectedPostId,
  squareReactionCountsByPost,
  squareCommentsByPost,
  onOpenSpace,
  onOpenCapsuleDrawer,
  displayNameByEmail,
  capsulePost,
  now,
  mySquareReactionByPost,
  favoritedPostIds,
  myAccountId,
  onSetSquareReaction,
  onFavoriteSquare,
  onUnfavoriteSquare,
  onUnpublishSquare,
  onOpenReportModal,
  squareCommentDraft,
  onSetSquareCommentDraft,
  onAddSquareComment,
}: SecretMainSectionProps) {
  if (!selectedSquarePost) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-8 md:max-w-lg md:py-10">
        <div className="flex w-full max-w-sm shrink-0 flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-gradient-to-br from-[#1A1B22]/95 via-[#121319]/95 to-[#0c0c12]/95 px-4 py-5 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <p className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#8E8E93]">
            抽一則秘密膠囊
          </p>
          <div className="flex w-full justify-center">
            <SecretCapsuleDrawButton
              variant="treasure"
              onClick={() => void onOpenCapsuleDrawer()}
            />
          </div>
        </div>
        <p className="max-w-sm text-center text-[11px] font-bold leading-relaxed text-[#8E8E93]">
          小紙條牆請從底列「廣場牆」跳轉；在秘密頁只揀朋友膠囊。
        </p>
      </div>
    );
  }

  return (
      <div className="mx-auto w-full max-w-xl space-y-4 px-3 py-4 md:px-6">
      {squareActionError ? (
        <p className="rounded-xl border border-red-300/40 bg-red-950/30 px-3 py-2 text-[13px] font-black text-red-200" role="alert">
          {squareActionError}
        </p>
      ) : null}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1A1B22]/95 via-[#121319]/98 to-[#0a0a10]/98 p-5 shadow-[0_14px_40px_-20px_rgba(0,0,0,0.55)] md:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#F06292]/8 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-10 h-40 w-40 rounded-full bg-violet-300/10 blur-3xl" />
        <span
          className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 border-l-[18px] border-l-transparent border-b-[18px] border-b-[#F06292]/25"
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
                  selectedSquarePost.snapshotSenderEmail.trim().toLowerCase(),
                ) ?? "",
            },
          );
          return line ? (
            <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#8E8E93]">
              {line}
            </p>
          ) : (
            <p className="mb-2 text-[11px] font-black text-[#8E8E93]">信箱沒公開</p>
          );
        })()}
        <p className="whitespace-pre-wrap text-[16px] font-bold leading-relaxed text-white md:text-[17px]">
          {selectedSquarePost.snapshotContent}
        </p>
        <p className="mt-4 text-[11px] font-bold tabular-nums text-[#8E8E93]">
          預定開啟{" "}
          {selectedSquarePost.snapshotScheduledAt.toDate().toLocaleString("zh-TW", {
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
              onOpenSpace(
                capsulePost.authorAccountId,
                capsulePost.authorDisplayName || "一位朋友",
                capsulePost.authorGender,
                capsulePost.authorBirthDate,
              );
            }
          }}
          className="mt-3 inline-flex rounded-lg border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/80 active:translate-y-px"
        >
          TA 的空間
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["up", "mid", "down"] as const).map((rk) => {
          const rc = squareReactionCountsByPost.get(selectedSquarePost.sourceMessageId);
          const n = rk === "up" ? (rc?.up ?? 0) : rk === "mid" ? (rc?.mid ?? 0) : (rc?.down ?? 0);
          const mine = mySquareReactionByPost.get(selectedSquarePost.sourceMessageId) === rk;
          const Icon = rk === "up" ? ThumbsUp : rk === "down" ? ThumbsDown : Minus;
          return (
            <button
              key={rk}
              type="button"
              onClick={() => onSetSquareReaction(selectedSquarePost.sourceMessageId, rk)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-black transition-colors",
                mine
                  ? "border-yellow-200/70 bg-[#FFD54F] text-stone-900"
                  : "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.08]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
              {n}
            </button>
          );
        })}
        {favoritedPostIds.has(selectedSquarePost.sourceMessageId) ? (
          <button
            type="button"
            onClick={() => onUnfavoriteSquare(selectedSquarePost.sourceMessageId)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-yellow-200/70 bg-[#FFD54F] px-3 py-2 text-[13px] font-black text-stone-900"
          >
            <Bookmark className="h-4 w-4 fill-current" aria-hidden />
            已收進心底
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onFavoriteSquare(selectedSquarePost.sourceMessageId)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[13px] font-black text-white"
          >
            <Bookmark className="h-4 w-4" aria-hidden />
            藏進心底
          </button>
        )}
        {selectedSquarePost.publisherAccountId === myAccountId && (
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "確定要將此內容從廣場撤下嗎？（他人已收藏的快照不會消失）",
                )
              ) {
                onUnpublishSquare(selectedSquarePost.sourceMessageId);
                onSetSquareSelectedPostId(null);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-300/50 bg-red-900/25 px-3 py-2 text-[13px] font-black text-red-200 transition-all"
          >
            <Trash2 className="h-4 w-4" /> 撤下廣場
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpenReportModal("square_post", selectedSquarePost.sourceMessageId)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-300/50 bg-red-900/25 px-3 py-2 text-[13px] font-black text-red-200"
        >
          檢舉貼文
        </button>
      </div>

      {selectedSquarePost.repliesPublic ? (
        <div className="mt-4 space-y-3">
          <h3 className="text-[12px] font-black tracking-wider text-[#8E8E93]">收到的回覆</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto apple-scroll">
            {(squareCommentsByPost.get(selectedSquarePost.sourceMessageId) ?? []).map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[13px] backdrop-blur-sm"
              >
                <p className="mb-1 font-mono text-[10px] font-bold text-[#8E8E93]">
                  {c.authorIdentity.toHexString().slice(0, 12)}…
                </p>
                <p className="whitespace-pre-wrap font-bold text-white">{c.body}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <textarea
              value={squareCommentDraft}
              onChange={(e) => onSetSquareCommentDraft(e.target.value)}
              rows={2}
              placeholder="寫一句…"
              className="min-h-0 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[14px] font-bold text-white placeholder:text-[#8E8E93] outline-none"
            />
            <button
              type="button"
              onClick={() => onAddSquareComment(selectedSquarePost.sourceMessageId)}
              className="shrink-0 rounded-xl border border-yellow-200/70 bg-[#FFD54F] px-4 py-2 text-[13px] font-black text-stone-900"
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
  );
}
