import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../../lib/utils";
import { useEscapeClose } from "../hooks/useEscapeClose";

type PublishModalSectionProps = {
  isPublishModalVisible: boolean;
  canRenderPublishModal: boolean;
  isDirectMode: boolean;
  loading: boolean;
  publishIncludeThread: boolean;
  publishIncludeCapsulePrivate: boolean;
  publishRepliesPublic: boolean;
  publishShowSender: boolean;
  publishShowRecipient: boolean;
  onClosePublishModal: () => void;
  onSubmitPublishToSquare: () => void | Promise<void>;
  onSetPublishIncludeThread: (value: boolean) => void;
  onSetPublishIncludeCapsulePrivate: (value: boolean) => void;
  onSetPublishRepliesPublic: (value: boolean) => void;
  onSetPublishShowSender: (value: boolean) => void;
  onSetPublishShowRecipient: (value: boolean) => void;
};

const optOn =
  "border-[#F06292]/50 bg-[#F06292]/12 text-white shadow-[0_0_0_1px_rgba(240,98,146,0.2)] -translate-y-px";
const optOff = "border-white/10 bg-white/[0.04] text-[#8E8E93]";

export function PublishModalSection({
  isPublishModalVisible,
  canRenderPublishModal,
  isDirectMode,
  loading,
  publishIncludeThread,
  publishIncludeCapsulePrivate,
  publishRepliesPublic,
  publishShowSender,
  publishShowRecipient,
  onClosePublishModal,
  onSubmitPublishToSquare,
  onSetPublishIncludeThread,
  onSetPublishIncludeCapsulePrivate,
  onSetPublishRepliesPublic,
  onSetPublishShowSender,
  onSetPublishShowRecipient,
}: PublishModalSectionProps) {
  useEscapeClose(isPublishModalVisible && canRenderPublishModal && !loading, onClosePublishModal);

  return (
    <AnimatePresence>
      {isPublishModalVisible && canRenderPublishModal ? (
        <motion.div
          key="publish-square"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[220] flex items-end justify-center bg-black/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
          onClick={() => {
            if (loading) return;
            onClosePublishModal();
          }}
        >
          <motion.div
            role="dialog"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[min(100%,26rem)] overflow-hidden rounded-[32px] border border-white/10 bg-[#1A1B22] text-white shadow-[0_32px_64px_rgba(0,0,0,0.55)]"
          >
            <div className="border-b border-white/10 bg-gradient-to-r from-[#25262e] to-[#1A1B22] p-5">
              <h3 className="text-[20px] font-bold tracking-tight text-white">
                貼到廣場給大家看
              </h3>
              <p className="mt-1 text-[12px] font-medium text-[#8E8E93]">
                {isDirectMode ? "定向信件模式" : "秘密膠囊模式"}
              </p>
            </div>

            <div className="space-y-6 p-6 text-white">
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8E8E93]">
                  1. 公開內容範圍
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onSetPublishIncludeThread(false);
                      onSetPublishIncludeCapsulePrivate(false);
                    }}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition-all",
                      !publishIncludeThread && !publishIncludeCapsulePrivate ? optOn : optOff,
                    )}
                  >
                    <p
                      className={cn(
                        "text-[15px] font-bold",
                        !publishIncludeThread && !publishIncludeCapsulePrivate
                          ? "text-white"
                          : "text-[#8E8E93]",
                      )}
                    >
                      僅公開主文
                    </p>
                    <p className="text-[11px] font-medium text-[#8E8E93] opacity-90">
                      只分享原本的信件正文
                    </p>
                  </button>

                  {isDirectMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSetPublishIncludeThread(true);
                        onSetPublishIncludeCapsulePrivate(false);
                      }}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-all",
                        publishIncludeThread ? optOn : optOff,
                      )}
                    >
                      <p
                        className={cn(
                          "text-[15px] font-bold",
                          publishIncludeThread ? "text-white" : "text-[#8E8E93]",
                        )}
                      >
                        主文 + 雙方往來
                      </p>
                      <p className="text-[11px] font-medium text-[#8E8E93] opacity-90">
                        包含信件中的互動紀錄
                      </p>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSetPublishIncludeCapsulePrivate(true);
                        onSetPublishIncludeThread(false);
                      }}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-all",
                        publishIncludeCapsulePrivate ? optOn : optOff,
                      )}
                    >
                      <p
                        className={cn(
                          "text-[15px] font-bold",
                          publishIncludeCapsulePrivate ? "text-white" : "text-[#8E8E93]",
                        )}
                      >
                        主文 + 膠囊私訊
                      </p>
                      <p className="text-[11px] font-medium text-[#8E8E93] opacity-90">
                        包含所有匿名私聊對話
                      </p>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8E8E93]">
                  2. 廣場互動設定
                </p>
                <div className="flex gap-3">
                  {[
                    { id: false, label: "禁止留言" },
                    { id: true, label: "開放評論" },
                  ].map((opt) => (
                    <button
                      key={String(opt.id)}
                      type="button"
                      onClick={() => onSetPublishRepliesPublic(opt.id)}
                      className={cn(
                        "flex-1 rounded-2xl border p-3 text-center transition-all",
                        publishRepliesPublic === opt.id
                          ? "border-[#10b981]/50 bg-[#10b981]/12 text-white"
                          : optOff,
                      )}
                    >
                      <p className="text-[13px] font-bold">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {isDirectMode && (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8E8E93]">
                    3. 隱私顯示
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => onSetPublishShowSender(!publishShowSender)}
                      className={cn(
                        "flex-1 rounded-xl border py-3 text-[12px] font-bold transition-all",
                        publishShowSender
                          ? "border-white/20 bg-white/10 text-white"
                          : optOff,
                      )}
                    >
                      {publishShowSender ? "已顯示寄件人" : "隱藏寄件人"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetPublishShowRecipient(!publishShowRecipient)}
                      className={cn(
                        "flex-1 rounded-xl border py-3 text-[12px] font-bold transition-all",
                        publishShowRecipient
                          ? "border-white/20 bg-white/10 text-white"
                          : optOff,
                      )}
                    >
                      {publishShowRecipient ? "已顯示收件人" : "隱藏收件人"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-white/10 bg-[#121319] p-6">
              <button
                type="button"
                onClick={onClosePublishModal}
                className="cd-btn-ghost flex-1 py-3 text-[15px]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void onSubmitPublishToSquare()}
                className="cd-btn-primary flex-[1.5] py-3 text-[15px] font-bold"
              >
                {loading ? "處理中..." : "確認公開"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
