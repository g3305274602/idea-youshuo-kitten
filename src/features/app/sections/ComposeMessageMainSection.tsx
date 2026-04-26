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
          className="max-w-md w-full mx-auto px-2 pb-10"
        >
          <div className="mb-8 p-1.5 bg-black/30 rounded-[22px] backdrop-blur-md border border-cyan-200/20 flex gap-1">
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
                    ? "bg-[#f4dc3a] text-stone-900 shadow-[0_6px_14px_-6px_rgba(244,220,58,0.9)] translate-y-[-1px]"
                    : "text-cyan-100/60 hover:text-cyan-50 hover:bg-cyan-100/10",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={sendMessage}
            className="space-y-6 rounded-3xl border border-cyan-200/25 bg-gradient-to-br from-[#0a3550]/90 via-[#0b2d44]/90 to-[#071f31]/95 p-5 shadow-[0_16px_36px_-18px_rgba(0,8,22,0.95)] backdrop-blur-sm"
          >
            {composeMode === "direct" && (
              <div className="space-y-2">
                <label className="ml-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-cyan-100/65">
                  <Send className="w-3 h-3" /> 要寄給誰
                </label>
                <input
                  name="recipientEmail"
                  type="email"
                  required
                  placeholder="example@future.com"
                  className="w-full rounded-2xl border border-cyan-200/30 bg-cyan-100/10 px-4 py-3.5 font-bold text-cyan-50 placeholder:text-cyan-100/40 outline-none transition-all focus:border-cyan-100/45"
                />
              </div>
            )}

            {composeMode === "capsule" && (
              <div className="space-y-3">
                <label className="ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-cyan-100/65">
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
                            ? `${meta.activeChipClass} border-yellow-200/65 shadow-[0_6px_14px_-6px_rgba(244,220,58,0.75)]`
                            : "bg-cyan-100/10 border-cyan-200/20 text-cyan-100/75 hover:bg-cyan-100/15",
                        )}
                      >
                        #{opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-cyan-100/65">
                內容詳情
              </label>
              <textarea
                name="content"
                required
                maxLength={textLimit}
                rows={6}
                placeholder={composeMode === "capsule" ? "寫下你的秘密..." : "寫給特定的他/她..."}
                className="w-full resize-none rounded-[24px] border border-cyan-200/30 bg-cyan-100/10 px-5 py-5 font-medium leading-relaxed text-cyan-50 outline-none transition-all placeholder:text-cyan-100/40 focus:border-cyan-100/45"
              />
            </div>

            {composeMode === "direct" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="ml-1 text-[11px] font-black uppercase tracking-[0.15em] text-cyan-100/65">
                    何時開啟？
                  </label>
                  <input
                    name="scheduledAt"
                    type="datetime-local"
                    className="w-full rounded-xl border border-cyan-200/30 bg-cyan-100/10 px-3 py-3 font-bold text-cyan-50 outline-none"
                  />
                </div>
                <div className="flex flex-col justify-start pt-6">
                  <label className="group flex items-center gap-3 cursor-pointer select-none">
                    <div className="relative">
                      <input
                        name="isWaitListVisible"
                        type="checkbox"
                        defaultChecked
                        className="peer sr-only"
                      />
                      <div className="w-12 h-7 rounded-full border border-cyan-200/25 bg-cyan-100/10 transition-all peer-checked:border-cyan-100/35 peer-checked:bg-emerald-500" />
                      <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-all peer-checked:left-6 peer-checked:bg-stone-900" />
                    </div>
                    <span className="text-[11px] font-black tracking-widest text-cyan-100/60 group-hover:text-cyan-50">
                      讓對方列表可見
                    </span>
                  </label>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="group relative w-full">
              <div className="absolute inset-0 rounded-2xl bg-stone-900/65 translate-y-1" />
              <div
                className={cn(
                  "relative w-full rounded-2xl border border-yellow-200/70 py-4 text-[18px] font-black transition-all active:translate-y-1",
                  loading ? "bg-stone-400/80 text-white" : "bg-[#f4dc3a] text-stone-900",
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
              <div className="text-[11px] font-black text-apple-blue uppercase tracking-widest mb-1">
                {activeTab === "outbox" ? "SEND TO" : "RECEIVED FROM"}
              </div>
              <h2 className="text-[18px] font-black text-stone-900 truncate">
                {activeTab === "outbox" ? currentMessage.recipientEmail : currentMessage.senderEmail}
              </h2>
            </div>

            {canPublishCurrentMessage && (activeTab === "inbox" || activeTab === "outbox") && (
              <div className="mb-4">
                {liveSquareForSelected ? (
                  <div className="flex flex-col gap-2 p-4 rounded-2xl border-[3px] border-stone-900 bg-violet-50 shadow-[4px_4px_0_0_#000]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-violet-600" />
                        <span className="text-[13px] font-black text-violet-900">
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
                      className="w-full flex items-center text-stone-600 justify-center gap-2 py-3 rounded-xl border-2 border-stone-900 bg-white font-black text-[13px] shadow-[3px_3px_0_0_#000]"
                    >
                      <LayoutGrid size={16} /> 貼到廣場給大家看
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {canUseLetterExchange && (
            <div className="mb-6 rounded-2xl border-[3px] border-stone-900 bg-emerald-50 p-4 shadow-[5px_5px_0_0_#1a3d38]">
              <div className="flex items-center gap-2 mb-3">
                <MessagesSquare className="w-4 h-4 text-emerald-700" />
                <p className="text-[12px] font-black text-emerald-800 uppercase">雙方往來摘錄</p>
              </div>
              {squareActionError && (
                <p className="mb-3 text-[12px] font-black text-red-500 bg-red-50 p-2 rounded-lg border border-red-200">
                  {squareActionError}
                </p>
              )}
              {liveScheduledRow?.exchangeLog ? (
                <pre className="mb-4 max-h-32 overflow-y-auto apple-scroll text-[12px] font-bold text-emerald-900/70 whitespace-pre-wrap font-sans">
                  {liveScheduledRow.exchangeLog}
                </pre>
              ) : (
                <p className="text-[12px] text-emerald-600/50 mb-4 italic">尚無記錄</p>
              )}

              <div className="flex gap-2">
                <textarea
                  value={exchangeAppendDraft}
                  onChange={(e) => setExchangeAppendDraft(e.target.value)}
                  placeholder="補寫一段話..."
                  className="flex-1 bg-white/60 border-2 border-emerald-200 rounded-xl px-3 py-2 text-[13px] outline-none resize-none h-10 focus:h-20 transition-all text-stone-900"
                />
                <button
                  onClick={() => handleAppendLetterExchange(currentMessage._id)}
                  disabled={exchangeAppendBusy}
                  className="bg-emerald-600 text-white px-4 rounded-xl font-black text-[12px] active:scale-95 disabled:opacity-50"
                >
                  {exchangeAppendBusy ? "..." : "送出"}
                </button>
              </div>
            </div>
          )}

          <div
            className={cn(
              "relative rounded-3xl border-[3px] border-stone-900 bg-[#fffef7] p-6 md:p-8 shadow-[8px_8px_0_0_#0f2420] overflow-hidden",
              !currentMessage.isDue && "min-h-[240px] flex items-center justify-center",
            )}
          >
            <div
              className={cn(
                "transition-all duration-1000",
                !currentMessage.isDue ? "blur-3xl opacity-5 select-none" : "opacity-100",
              )}
            >
              <p className="text-[18px] md:text-[22px] font-bold leading-relaxed text-stone-900 whitespace-pre-wrap">
                {currentMessage.content}
              </p>
            </div>

            {!currentMessage.isDue && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4 border-2 border-stone-900">
                  <Lock className="w-8 h-8 text-stone-900" />
                </div>
                <p className="text-[14px] font-black text-stone-500 mb-2 uppercase tracking-widest">
                  距離開啟還有
                </p>
                <div className="text-[32px] md:text-[40px] font-black text-apple-blue tabular-nums">
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
                    className="px-4 py-2 rounded-xl border-2 border-stone-900 bg-white font-black text-[13px] shadow-[3px_3px_0_0_#000] active:translate-y-px"
                  >
                    編輯內容
                  </button>
                  <button
                    onClick={() => setOutboxDeleteConfirmOpenWithStack(true)}
                    className="px-4 py-2 rounded-xl border-2 border-stone-900 bg-red-100 text-red-600 font-black text-[13px] shadow-[3px_3px_0_0_#000] active:translate-y-px"
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
          className="max-w-sm mx-auto text-center py-24"
        >
          <div className="w-20 h-20 bg-stone-100 rounded-3xl border-[3px] border-dashed border-stone-300 flex items-center justify-center mx-auto mb-6">
            <Inbox className="w-10 h-10 text-stone-300" />
          </div>
          <h3 className="text-[20px] font-black text-stone-900 mb-2">選一則訊息</h3>
          <p className="text-stone-400 font-bold text-[14px]">
            點擊左側列表，或是到首頁抽膠囊。
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
