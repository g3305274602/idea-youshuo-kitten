import { AnimatePresence, motion } from "motion/react";
import { Inbox, LayoutGrid, Lock, MessagesSquare, Send } from "lucide-react";
import { cn } from "../../../lib/utils";
import { CAPSULE_TYPE_OPTIONS } from "../constants";
import { Countdown } from "../helpers";
import { MetaItem } from "../components";

type ComposeMessageMainSectionProps = {
  activeTab: string;
  composeMode: "capsule" | "direct";
  setComposeMode: (value: "capsule" | "direct") => void;
  setActiveTab: (tab: "new" | "direct") => void;
  composeCapsuleType: number;
  setComposeCapsuleType: (value: number) => void;
  capsuleTypeMeta: (type: number) => { activeChipClass: string };
  textLimit: number;
  sendMessage: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  currentMessage: any;
  canPublishCurrentMessage: boolean;
  liveSquareForSelected: any;
  handleUnpublishSquare: (sourceMessageId: string) => Promise<void> | void;
  setPublishModalOpenWithStack: (open: boolean) => void;
  canUseLetterExchange: boolean;
  squareActionError: string;
  liveScheduledRow: any;
  exchangeAppendDraft: string;
  setExchangeAppendDraft: (value: string) => void;
  handleAppendLetterExchange: (sourceMessageId: string) => Promise<void> | void;
  exchangeAppendBusy: boolean;
  beginOutboxEdit: () => void;
  setOutboxDeleteConfirmOpenWithStack: (open: boolean) => void;
  extension?: Record<string, unknown>;
};

export function ComposeMessageMainSection({
  activeTab,
  composeMode,
  setComposeMode,
  setActiveTab,
  composeCapsuleType,
  setComposeCapsuleType,
  capsuleTypeMeta,
  textLimit,
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
}: ComposeMessageMainSectionProps) {
  const modeOptions: ReadonlyArray<{
    id: "capsule" | "direct";
    label: string;
    tab: "new" | "direct";
  }> = [
    { id: "capsule", label: "秘密膠囊", tab: "new" },
    { id: "direct", label: "定向發送", tab: "direct" },
  ];

  return (
    <AnimatePresence mode="wait">
      {activeTab === "new" || activeTab === "direct" ? (
        <motion.div
          key="compose-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="max-w-md w-full mx-auto px-2 pt-8 pb-10"
        >
          <div className="mb-4 p-1.5 bg-black/30 rounded-[22px] backdrop-blur-md border border-white/10 flex gap-1">
            {modeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setComposeMode(opt.id);
                  setActiveTab(opt.tab);
                }}
                className={cn(
                  "flex-1 py-3 rounded-[18px] text-[15px] font-black transition-all duration-200",
                  composeMode === opt.id
                    ? "bg-[#FFD54F] text-stone-900 shadow-[0_6px_14px_-6px_rgba(255,213,79,0.65)] translate-y-[-1px]"
                    : "text-[#8E8E93] hover:text-white hover:bg-white/[0.06]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={sendMessage}
            className="space-y-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#1A1B22]/95 via-[#121319]/98 to-[#0a0a10]/98 p-5 shadow-[0_16px_36px_-18px_rgba(0,0,0,0.55)] backdrop-blur-sm"
          >
            {composeMode === "direct" && (
              <div className="space-y-2">
                <label className="ml-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-[#8E8E93]">
                  <Send className="w-3 h-3" /> 要寄給誰
                </label>
                <input
                  name="recipientEmail"
                  type="email"
                  required
                  placeholder="example@future.com"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 font-bold text-white placeholder:text-[#8E8E93]/80 outline-none transition-all focus:border-[#FFD54F]/45"
                />
              </div>
            )}

            {composeMode === "capsule" && (
              <div className="space-y-3">
                <label className="ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-[#8E8E93]">
                  膠囊類型
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {CAPSULE_TYPE_OPTIONS.map((opt) => {
                    const meta = capsuleTypeMeta(opt.type);
                    const active = composeCapsuleType === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => setComposeCapsuleType(opt.type)}
                        className={cn(
                          "px-4 py-2 rounded-xl border text-[13px] font-black transition-all",
                          active
                            ? `${meta.activeChipClass} border-[#FFD54F]/50 shadow-[0_6px_14px_-6px_rgba(255,213,79,0.4)]`
                            : "bg-white/[0.06] border-white/10 text-[#8E8E93] hover:bg-white/[0.08]",
                        )}
                      >
                        #{opt.label}
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
                  <label className="group flex items-center justify-between gap-3 cursor-pointer select-none">
                    <div className="min-w-0">
                      <p className="text-[12px] font-black tracking-wide text-white/90">
                        同步顯示到我的空間（所有人可見）
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-[#8E8E93]">
                      不開啟時僅自己可在空間看到
                      </p>
                    </div>
                    <div className="relative shrink-0">
                      <input
                        name="isProfilePublic"
                        type="checkbox"
                        className="peer sr-only"
                      />
                      <div className="h-7 w-12 rounded-full border border-white/10 bg-white/[0.06] transition-all peer-checked:border-white/20 peer-checked:bg-emerald-500" />
                      <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-all peer-checked:left-6 peer-checked:bg-stone-900" />
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-[#8E8E93]">
                內容詳情
              </label>
              <textarea
                name="content"
                required
                maxLength={textLimit}
                rows={6}
                placeholder={composeMode === "capsule" ? "寫下你的秘密..." : "寫給特定的他/她..."}
                className="w-full resize-none rounded-[24px] border border-white/10 bg-white/[0.06] px-5 py-5 font-medium leading-relaxed text-white outline-none transition-all placeholder:text-[#8E8E93]/80 focus:border-[#FFD54F]/45"
              />
            </div>

            {composeMode === "direct" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-[#8E8E93]">
                    何時開啟？
                  </label>
                  <input
                    name="scheduledAt"
                    type="datetime-local"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1 font-bold text-white outline-none"
                  />
                </div>
                <div className="flex flex-col justify-start md:pt-6">
                  <label className="group flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative">
                      <input
                        name="isWaitListVisible"
                        type="checkbox"
                        defaultChecked
                        className="peer sr-only"
                      />
                      <div className="w-12 h-7 rounded-full border border-white/10 bg-white/[0.06] transition-all peer-checked:border-white/20 peer-checked:bg-emerald-500" />
                      <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-all peer-checked:left-6 peer-checked:bg-stone-900" />
                    </div>
                    <span className="text-[11px] font-black tracking-widest text-[#8E8E93] group-hover:text-white">
                      讓對方列表可見
                    </span>
                  </label>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="group relative w-full">
              <div className="absolute inset-0 translate-y-1 rounded-2xl bg-black/50" />
              <div
                className={cn(
                  "relative w-full rounded-2xl border border-[#FFD54F]/45 py-4 text-[18px] font-bold transition-all active:translate-y-1",
                  loading ? "bg-white/20 text-white" : "bg-[#FFD54F] text-stone-900",
                )}
              >
                {loading ? "處理中..." : composeMode === "capsule" ? "投遞秘密膠囊" : "寄出小紙條"}
              </div>
            </button>
          </form>
        </motion.div>
      ) : currentMessage ? (
        <motion.div
          key={currentMessage._id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="max-w-xl w-full mx-auto pb-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="text-[11px] font-black text-[#8E8E93] uppercase tracking-widest mb-1">
                {activeTab === "outbox" ? "SEND TO" : "RECEIVED FROM"}
              </div>
              <h2 className="text-[18px] font-bold text-white truncate">
                {activeTab === "outbox" ? currentMessage.recipientEmail : currentMessage.senderEmail}
              </h2>
            </div>

            {canPublishCurrentMessage && (activeTab === "inbox" || activeTab === "outbox") && (
              <div className="mb-4">
                {liveSquareForSelected ? (
                  <div className="flex flex-col gap-2 p-4 rounded-2xl border border-[#F06292]/30 bg-[#F06292]/8 shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-[#F06292]" />
                        <span className="text-[13px] font-bold text-white">
                          這則訊息正在廣場公開中
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "確定要將此內容從廣場牆上撤下嗎？（他人已收藏的快照不會消失）",
                            )
                          ) {
                            void handleUnpublishSquare(currentMessage._id);
                          }
                        }}
                        className="text-[12px] font-black text-red-600 underline decoration-2 underline-offset-4 hover:text-red-700"
                      >
                        從廣場撤下
                      </button>
                    </div>
                    <p className="text-[11px] font-bold text-violet-700/60">
                      設定：
                      {liveSquareForSelected.repliesPublic ? "開放留言" : "禁止留言"}·{" "}
                      {liveSquareForSelected.includeThreadInSnapshot ? "含往來摘錄" : "僅主文"}
                    </p>
                  </div>
                ) : (
                  currentMessage.isDue && (
                    <button
                      onClick={() => setPublishModalOpenWithStack(true)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] py-3 font-bold text-[13px] text-white transition-colors hover:bg-white/10"
                    >
                      <LayoutGrid size={16} /> 貼到廣場給大家看
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {canUseLetterExchange && (
            <div className="mb-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-4 shadow-[0_8px_28px_rgba(0,0,0,0.3)]">
              <div className="mb-3 flex items-center gap-2">
                <MessagesSquare className="h-4 w-4 text-emerald-300" />
                <p className="text-[12px] font-bold uppercase text-emerald-200/90">雙方往來摘錄</p>
              </div>
              {squareActionError && (
                <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[12px] font-bold text-red-300">
                  {squareActionError}
                </p>
              )}
              {liveScheduledRow?.exchangeLog ? (
                <pre className="mb-4 max-h-32 overflow-y-auto apple-scroll font-sans text-[12px] font-medium whitespace-pre-wrap text-white/80">
                  {liveScheduledRow.exchangeLog}
                </pre>
              ) : (
                <p className="mb-4 text-[12px] italic text-[#8E8E93]">尚無記錄</p>
              )}

              <div className="flex gap-2">
                <textarea
                  value={exchangeAppendDraft}
                  onChange={(e) => setExchangeAppendDraft(e.target.value)}
                  placeholder="補寫一段話..."
                  className="h-10 flex-1 resize-none rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-[13px] text-white outline-none transition-all placeholder:text-[#8E8E93] focus:h-20 focus:border-[#FFD54F]/40"
                />
                <button
                  onClick={() => handleAppendLetterExchange(currentMessage._id)}
                  disabled={exchangeAppendBusy}
                  className="rounded-xl bg-emerald-600 px-4 text-[12px] font-bold text-white active:scale-95 disabled:opacity-50"
                >
                  {exchangeAppendBusy ? "..." : "送出"}
                </button>
              </div>
            </div>
          )}

          <div
            className={cn(
              "cd-card-raised relative overflow-hidden rounded-3xl border border-white/10 p-6 md:p-8",
              !currentMessage.isDue && "flex min-h-[240px] items-center justify-center",
            )}
          >
            <div
              className={cn(
                "transition-all duration-1000",
                !currentMessage.isDue ? "blur-3xl opacity-5 select-none" : "opacity-100",
              )}
            >
              <p className="whitespace-pre-wrap text-[18px] font-medium leading-relaxed text-white md:text-[22px]">
                {currentMessage.content}
              </p>
            </div>

            {!currentMessage.isDue && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/12 bg-white/[0.06]">
                  <Lock className="h-8 w-8 text-[#FFD54F]" />
                </div>
                <p className="mb-2 text-[14px] font-bold uppercase tracking-widest text-[#8E8E93]">
                  距離開啟還有
                </p>
                <div className="text-[32px] font-bold tabular-nums text-[#FFD54F] md:text-[40px]">
                  <Countdown targetDate={currentMessage.scheduledAt} />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-3">
              {activeTab === "outbox" && !currentMessage.isDue && (
                <>
                  <button
                    onClick={beginOutboxEdit}
                    className="cd-btn-ghost rounded-xl px-4 py-2 text-[13px] font-bold"
                  >
                    編輯內容
                  </button>
                  <button
                    onClick={() => setOutboxDeleteConfirmOpenWithStack(true)}
                    className="cd-btn-danger rounded-xl px-4 py-2 text-[13px] font-bold"
                  >
                    刪除
                  </button>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <MetaItem
                label="目標時間"
                value={new Date(currentMessage.scheduledAt).toLocaleDateString()}
              />
              <MetaItem
                label="小暗號"
                value={`#${currentMessage._id.slice(-6).toUpperCase()}`}
              />
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-auto flex min-h-[46vh] max-w-sm items-center justify-center py-24 text-center"
        >
          <div>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border-[3px] border-dashed border-stone-300 bg-stone-100">
              <Inbox className="h-10 w-10 text-stone-300" />
            </div>
            <h3 className="mb-2 text-[20px] font-black text-stone-900">選一則訊息</h3>
            <p className="text-[14px] font-bold text-stone-400">
              點擊左側列表，或是到首頁抽膠囊。
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
