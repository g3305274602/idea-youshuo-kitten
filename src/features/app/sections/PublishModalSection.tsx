import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../../lib/utils";

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
  return (
    <AnimatePresence>
      {isPublishModalVisible && canRenderPublishModal ? (
        <motion.div
          key="publish-square"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center bg-black/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
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
            className="w-full max-w-[min(100%,26rem)] overflow-hidden rounded-[32px] border-[3px] border-stone-900 bg-[#fffef7] shadow-[8px_8px_0_0_#000]"
          >
            <div className="bg-violet-600 border-b-[3px] border-stone-900 p-5">
              <h3 className="text-[20px] font-black tracking-tight text-white">
                貼到廣場給大家看
              </h3>
              <p className="mt-1 text-[12px] font-bold text-violet-100">
                {isDirectMode ? "定向信件模式" : "秘密膠囊模式"}
              </p>
            </div>

            <div className="p-6 space-y-6 text-stone-900">
              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-stone-500">
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
                      "w-full text-left p-4 rounded-2xl border-[3px] transition-all",
                      !publishIncludeThread && !publishIncludeCapsulePrivate
                        ? "border-stone-900 bg-violet-200 text-stone-900 shadow-[4px_4px_0_0_#000] translate-y-[-2px]"
                        : "border-stone-200 bg-white text-stone-400",
                    )}
                  >
                    <p
                      className={cn(
                        "text-[15px] font-black",
                        !publishIncludeThread && !publishIncludeCapsulePrivate
                          ? "text-stone-900"
                          : "text-stone-400",
                      )}
                    >
                      僅公開主文
                    </p>
                    <p className="text-[11px] font-bold opacity-70">
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
                        "w-full text-left p-4 rounded-2xl border-[3px] transition-all",
                        publishIncludeThread
                          ? "border-stone-900 bg-violet-200 text-stone-900 shadow-[4px_4px_0_0_#000] translate-y-[-2px]"
                          : "border-stone-200 bg-white text-stone-400",
                      )}
                    >
                      <p
                        className={cn(
                          "text-[15px] font-black",
                          publishIncludeThread
                            ? "text-stone-900"
                            : "text-stone-400",
                        )}
                      >
                        主文 + 雙方往來
                      </p>
                      <p className="text-[11px] font-bold opacity-70">
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
                        "w-full text-left p-4 rounded-2xl border-[3px] transition-all",
                        publishIncludeCapsulePrivate
                          ? "border-stone-900 bg-violet-200 text-stone-900 shadow-[4px_4px_0_0_#000] translate-y-[-2px]"
                          : "border-stone-200 bg-white text-stone-400",
                      )}
                    >
                      <p
                        className={cn(
                          "text-[15px] font-black",
                          publishIncludeCapsulePrivate
                            ? "text-stone-900"
                            : "text-stone-400",
                        )}
                      >
                        主文 + 膠囊私訊
                      </p>
                      <p className="text-[11px] font-bold opacity-70">
                        包含所有匿名私聊對話
                      </p>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-stone-500">
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
                        "flex-1 p-3 rounded-2xl border-[3px] text-center transition-all",
                        publishRepliesPublic === opt.id
                          ? "border-stone-900 bg-emerald-200 text-stone-900 shadow-[4px_4px_0_0_#000] translate-y-[-2px]"
                          : "border-stone-200 bg-white text-stone-400",
                      )}
                    >
                      <p className="text-[13px] font-black">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {isDirectMode && (
                <div className="space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-stone-500">
                    3. 隱私顯示
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => onSetPublishShowSender(!publishShowSender)}
                      className={cn(
                        "flex-1 py-3 rounded-xl border-[3px] font-black text-[12px] transition-all",
                        publishShowSender
                          ? "border-stone-900 bg-stone-200 text-stone-900 shadow-[3px_3px_0_0_#000]"
                          : "border-stone-200 bg-white text-stone-300",
                      )}
                    >
                      {publishShowSender ? "已顯示寄件人" : "隱藏寄件人"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSetPublishShowRecipient(!publishShowRecipient)
                      }
                      className={cn(
                        "flex-1 py-3 rounded-xl border-[3px] font-black text-[12px] transition-all",
                        publishShowRecipient
                          ? "border-stone-900 bg-stone-200 text-stone-900 shadow-[3px_3px_0_0_#000]"
                          : "border-stone-200 bg-white text-stone-300",
                      )}
                    >
                      {publishShowRecipient ? "已顯示收件人" : "隱藏收件人"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t-[3px] border-stone-900 bg-stone-100 p-6 flex gap-3">
              <button
                type="button"
                onClick={onClosePublishModal}
                className="flex-1 py-3 rounded-2xl border-[3px] border-stone-900 bg-white text-[15px] font-black text-stone-900 active:translate-y-0.5 transition-all"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void onSubmitPublishToSquare()}
                className="flex-[1.5] py-3 rounded-2xl border-[3px] border-stone-900 bg-[#f4dc3a] text-[15px] font-black text-stone-900 shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-none transition-all"
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
