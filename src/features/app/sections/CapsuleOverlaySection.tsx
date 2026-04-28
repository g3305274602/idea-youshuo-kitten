import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Bookmark,
  Loader2,
  Minus,
  Package,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { anonPaperNoteLabel } from "../helpers";
import { CdSelect } from "../components/CdSelect";
import { useEscapeClose } from "../hooks/useEscapeClose";
import { GenderIcon } from "./PickerControls";

type CapsuleOverlaySectionProps = {
  capsuleOpen: boolean;
  closeCapsuleDrawer: () => void;
  squareActionError: string;
  capsuleSwitching: boolean;
  capsulePost: any;
  capsuleEmptyReason: string | null;
  openReportModal: (targetType: "capsule", targetId: string) => void;
  /** 是否顯示膠囊作者真實暱稱（本人參與或與作者私訊已滿 10 則） */
  capsuleOverlayShowAuthorRealName: boolean;
  capsuleSquarePost: any;
  squareReactionCountsByPost: ReadonlyMap<string, { up: number; mid: number; down: number }>;
  mySquareReactionByPost: ReadonlyMap<string, "up" | "mid" | "down">;
  handleSetSquareReaction: (sourceMessageId: string, kind: "up" | "mid" | "down") => Promise<void> | void;
  favoritedPostIds: ReadonlySet<string>;
  capsuleBodyFavorited: boolean;
  handleUnfavoriteSquare: (sourceMessageId: string) => Promise<void> | void;
  handleFavoriteSquare: (sourceMessageId: string) => Promise<void> | void;
  handleUnfavoriteCapsuleById: (capsuleId: string) => Promise<void> | void;
  handleFavoriteCapsuleById: (capsuleId: string) => Promise<void> | void;
  now: Date;
  capsuleTypeMeta: (type: number) => { chipClass: string; label: string };
  capsuleModalPrivateThreadRef: any;
  isCapsuleParticipantUi: boolean;
  uniqueCapsuleGuestHexes: readonly string[];
  capsuleThreadGuestHex: string | null;
  onSetCapsuleThreadGuestHex?: (value: string | null) => void;
  canShowCapsuleModalFirstMessageInput: boolean;
  capsuleModalPrivateTextareaRef: any;
  capsulePrivateDraft: string;
  setCapsulePrivateDraft: (value: string) => void;
  textLimit: number;
  jumpToChatFromCapsule: (sourceMessageId: string) => void;
  squareCommentsByPost: ReadonlyMap<string, readonly any[]>;
  squareCommentDraft: string;
  setSquareCommentDraft: (value: string) => void;
  handleAddSquareComment: (sourceMessageId: string) => Promise<void> | void;
  handleAddCapsulePrivateMessage: (sourceMessageId: string, guestHex: string | null) => Promise<void> | void;
  pickAnotherCapsule: () => Promise<void> | void;
  onViewPreviousCapsule: () => void;
  canViewPreviousCapsule: boolean;
  canShuffleCapsule: boolean;
  extension?: Record<string, unknown>;
};

export function CapsuleOverlaySection(props: CapsuleOverlaySectionProps) {
  const {
    capsuleOpen,
    closeCapsuleDrawer,
    squareActionError,
    capsuleSwitching,
    capsulePost,
    capsuleEmptyReason,
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
    onSetCapsuleThreadGuestHex,
    canShowCapsuleModalFirstMessageInput,
    capsuleModalPrivateTextareaRef,
    capsulePrivateDraft,
    setCapsulePrivateDraft,
    textLimit,
    jumpToChatFromCapsule,
    squareCommentsByPost,
    squareCommentDraft,
    setSquareCommentDraft,
    handleAddSquareComment,
    handleAddCapsulePrivateMessage,
    pickAnotherCapsule,
    onViewPreviousCapsule,
    canViewPreviousCapsule,
    canShuffleCapsule,
  } = props;
  useEscapeClose(capsuleOpen, closeCapsuleDrawer);

  return (
    <AnimatePresence>
      {capsuleOpen ? (
        <motion.div
          key="capsule-overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="ys-capsule-backdrop"
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
            className="ys-capsule-sheet"
          >
            <div className="ys-capsule-drag" aria-hidden />
            <div className="ys-capsule-header">
              <div className="flex min-w-0 items-center gap-2">
                <Sparkles className="h-5 w-5 shrink-0 text-white/80" strokeWidth={2.5} />
                <h2 id="capsule-title" className="shrink-0 text-[17px] font-black tracking-tight ys-night-text">
                  秘密膠囊
                </h2>
                <button
                  type="button"
                  onClick={() => capsulePost && openReportModal("capsule", capsulePost?.id)}
                  className="inline-flex p-1.5 text-[#8E8E93] transition-colors hover:text-red-300 active:scale-95"
                  title="檢舉膠囊"
                >
                  <AlertTriangle className="h-[22px] w-[22px]" strokeWidth={2.5} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => closeCapsuleDrawer()}
                className="rounded-xl ys-night-surface p-2 font-black ys-night-text hover:bg-white/[0.08]"
                aria-label="關閉"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto apple-scroll px-3.5 py-3.5">
              {squareActionError ? (
                <p className="mb-3 rounded-lg border border-red-300/40 bg-red-900/25 px-2.5 py-2 text-[13px] font-medium text-red-200" role="alert">
                  {squareActionError}
                </p>
              ) : null}
              {capsuleSwitching ? (
                <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 py-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-stone-600" />
                  <p className="text-[15px] font-black text-stone-800">正在打開新膠囊…</p>
                </div>
              ) : !capsulePost ? (
                <div className="space-y-4 py-2 text-center">
                  <Package className="mx-auto h-12 w-12 text-stone-400" strokeWidth={2} />
                  <p className="text-[15px] font-black leading-snug text-white">
                    {capsuleEmptyReason === "wall_empty"
                      ? "目前還沒有可抽的秘密膠囊。"
                      : capsuleEmptyReason === "timing"
                        ? "有些紙條還沒到開啟時間，膠囊暫時抽不到；等等再試。"
                        : capsuleEmptyReason === "only_self"
                          ? "目前只有你自己發的膠囊，抽取會排除自己；等等看其他人資料。"
                          : capsuleEmptyReason === "all_saved"
                            ? "能抽的別人紙條你都收進心底啦；到清單慢慢看，或從心底拿出幾則再來抽。"
                            : "好像沒有更多了~晚點再看看吧"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="ys-capsule-card">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-col items-start justify-center pt-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="break-words text-[14px] text-[#ccc] font-black truncate">
                            {capsuleOverlayShowAuthorRealName
                              ? capsulePost.authorDisplayName ||
                                capsulePost.authorEmail.split("@")[0]
                              : anonPaperNoteLabel(capsulePost.authorGender)}
                          </p>
                          {capsuleOverlayShowAuthorRealName ? (
                            <GenderIcon gender={capsulePost.authorGender} />
                          ) : null}
                        </div>
                      </div>
                      <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
                        <div className="flex items-center gap-2">
                          {capsuleSquarePost
                            ? (["up", "mid", "down"] as const).map((rk) => {
                                const rc = squareReactionCountsByPost.get(capsuleSquarePost.sourceMessageId);
                                const n = rk === "up" ? (rc?.up ?? 0) : rk === "mid" ? (rc?.mid ?? 0) : (rc?.down ?? 0);
                                const mine = mySquareReactionByPost.get(capsuleSquarePost.sourceMessageId) === rk;
                                const Icon = rk === "up" ? ThumbsUp : rk === "down" ? ThumbsDown : Minus;
                                return (
                                  <button
                                    key={rk}
                                    type="button"
                                    onClick={() => void handleSetSquareReaction(capsuleSquarePost.sourceMessageId, rk)}
                                    className={cn(
                                      "inline-flex h-9 w-9 items-center gap-1.5 rounded-xl border px-3 text-[14px] font-black transition-colors active:translate-y-px",
                                      mine ? "ys-btn-primary" : "ys-night-surface ys-night-text hover:bg-white/[0.08]",
                                    )}
                                  >
                                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                                    {n > 0 ? n : ""}
                                  </button>
                                );
                              })
                            : null}

                          {(() => {
                            const isFav = capsuleSquarePost
                              ? favoritedPostIds.has(capsuleSquarePost.sourceMessageId)
                              : capsuleBodyFavorited;
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (capsuleSquarePost) {
                                    isFav
                                      ? void handleUnfavoriteSquare(capsuleSquarePost.sourceMessageId)
                                      : void handleFavoriteSquare(capsuleSquarePost.sourceMessageId);
                                  } else {
                                    isFav
                                      ? void handleUnfavoriteCapsuleById(capsulePost.id)
                                      : void handleFavoriteCapsuleById(capsulePost.id);
                                  }
                                }}
                                className={cn(
                                  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 transition-all active:translate-y-px",
                                  isFav ? "ys-btn-primary" : "ys-night-surface ys-night-text hover:bg-white/[0.08]",
                                )}
                                title={isFav ? "已收進心底" : "藏進心底"}
                              >
                                <Bookmark className={cn("h-5 w-5", isFav && "fill-current")} strokeWidth={2.5} />
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    <p className="max-h-[min(32vh,16rem)] overflow-y-auto apple-scroll whitespace-pre-wrap text-[16px] font-medium leading-relaxed text-white">
                      {capsulePost.content}
                    </p>
                    <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
                      <p className="text-[11px] font-bold tabular-nums text-[#8E8E93]">
                        {capsulePost.scheduledAt.toDate() > now ? "預定開啟 " : ""}
                        {capsulePost.scheduledAt.toDate().toLocaleString("zh-TW", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {canViewPreviousCapsule && !capsuleSwitching ? (
                        <button
                          type="button"
                          onClick={onViewPreviousCapsule}
                          className="inline-flex shrink-0 rounded-full border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[11px] font-black text-white/80 transition-colors hover:bg-white/[0.1] active:translate-y-px"
                        >
                          看上一條
                        </button>
                      ) : null}
                      {capsulePost && !capsuleSwitching ? (
                        <span
                          className={cn(
                            "ml-1 inline-flex shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-black",
                            capsuleTypeMeta(capsulePost.capsuleType).chipClass,
                          )}
                        >
                          #{capsuleTypeMeta(capsulePost.capsuleType).label}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div ref={capsuleModalPrivateThreadRef} id="capsule-modal-private-thread" className="mt-2 scroll-mt-4 space-y-3 rounded-2xl">
                    {isCapsuleParticipantUi && uniqueCapsuleGuestHexes.length > 0 ? (
                      <label className="block text-[10px] font-black text-[#8E8E93]">
                        訪客線（回覆對象）
                        <CdSelect
                          className="mt-1 w-full"
                          buttonClassName="h-9 rounded-lg px-2 py-1.5 text-[12px] font-bold ys-night-input"
                          value={capsuleThreadGuestHex ?? ""}
                          onChange={(next) => onSetCapsuleThreadGuestHex?.(next || null)}
                          options={uniqueCapsuleGuestHexes.map((hx) => ({
                            value: hx,
                            label: `${hx.slice(0, 14)}…`,
                          }))}
                        />
                      </label>
                    ) : isCapsuleParticipantUi ? (
                      <p className="text-[11px] font-bold text-[#8E8E93]">尚無訪客開線，等有人抽到這則再回覆。</p>
                    ) : null}
                    {isCapsuleParticipantUi || canShowCapsuleModalFirstMessageInput ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          ref={capsuleModalPrivateTextareaRef}
                          value={capsulePrivateDraft}
                          onChange={(e) => setCapsulePrivateDraft(e.target.value)}
                          maxLength={textLimit}
                          rows={2}
                          placeholder="寫膠囊私訊…"
                          className="h-10 min-h-10 max-h-22 line-height-[2.5] shrink-0 resize-none rounded-xl px-2.5 py-1.5 text-[13px] leading-5 ys-night-input"
                        />
                      </div>
                    ) : capsuleSquarePost ? (
                      <div className="rounded-xl ys-night-surface px-3 py-2">
                        <p className="text-[11px] font-bold text-[#8E8E93]">
                          你已開過這條線，請到「我的 → 聊聊記錄」繼續對話。
                        </p>
                        <button
                          type="button"
                          onClick={() => jumpToChatFromCapsule(capsulePost.id)}
                          className="mt-2 inline-flex items-center rounded-lg px-3 py-1.5 text-[12px] ys-btn-primary"
                        >
                          前往聊聊記錄
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {capsuleSquarePost?.repliesPublic ? (
                    <div className="mt-4 space-y-3">
                      <h3 className="text-[12px] font-bold tracking-wider text-[#8E8E93]">廣場評論</h3>
                      <div className="max-h-48 space-y-2 overflow-y-auto apple-scroll">
                        {(squareCommentsByPost.get(capsuleSquarePost.sourceMessageId) ?? []).map((c: any) => (
                          <div key={c.id} className="rounded-xl ys-night-surface px-3 py-2 text-[13px]">
                            <p className="mb-1 font-mono text-[10px] text-[#8E8E93]">
                              {c.authorIdentity.toHexString().slice(0, 12)}…
                            </p>
                            <p className="whitespace-pre-wrap text-white/95">{c.body}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <textarea
                          value={squareCommentDraft}
                          onChange={(e) => setSquareCommentDraft(e.target.value)}
                          maxLength={textLimit}
                          rows={2}
                          placeholder="留一句話…"
                          className="min-h-0 flex-1 resize-none rounded-xl px-3 py-2 text-[14px] ys-night-input focus-visible:border-[#FFD54F]/45 focus-visible:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void handleAddSquareComment(capsuleSquarePost.sourceMessageId)}
                          className="shrink-0 rounded-xl px-4 py-2 text-[13px] ys-btn-primary"
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
              <div className="shrink-0 border-t border-white/10 bg-white/[0.04] px-3.5 py-3">
                <div className="flex items-stretch gap-3">
                  <button
                    type="button"
                    onClick={() => void pickAnotherCapsule()}
                    disabled={!canShuffleCapsule || capsuleSwitching}
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-[15px] font-black tracking-tight transition-transform disabled:cursor-not-allowed disabled:opacity-60 active:translate-y-0.5",
                      isCapsuleParticipantUi || canShowCapsuleModalFirstMessageInput
                        ? "flex-[1.25] ys-night-surface ys-night-text"
                        : "flex-1 ys-btn-primary",
                    )}
                  >
                    {capsuleSwitching ? "正在打開新膠囊…" : "換一個"}
                  </button>
                  {isCapsuleParticipantUi || canShowCapsuleModalFirstMessageInput ? (
                    <button
                      type="button"
                      onClick={() =>
                        void handleAddCapsulePrivateMessage(
                          capsulePost.id,
                          capsuleThreadGuestHex,
                        )
                      }
                      className="flex-1 rounded-2xl px-3 py-2.5 text-[13px] font-black transition-transform active:translate-y-0.5 ys-btn-primary"
                    >
                      送出私訊
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
