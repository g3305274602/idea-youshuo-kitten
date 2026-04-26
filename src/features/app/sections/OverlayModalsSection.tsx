import { AnimatePresence, motion } from "motion/react";
import { Lock } from "lucide-react";
import type { Message } from "../types";

type ChatPeerProfile = {
  displayName?: string;
  gender?: string;
  birthDate?: { toDate: () => Date } | null;
  profileNote?: string;
};

type BanNoticeInfo = {
  endAt: string;
  reason: string;
};

type ReportTargetType =
  | "capsule"
  | "square_post"
  | "chat_thread"
  | "chat_account";

type OverlayModalsSectionProps = {
  isChatPeerProfileVisible: boolean;
  selectedChatPeerProfile: ChatPeerProfile | null;
  onCloseChatPeerProfile: () => void;
  calculateAgeFromDate: (birthDate: Date | null) => number;

  isOutboxDeleteConfirmVisible: boolean;
  currentMessage: Message | null;
  activeTab: string;
  outboxEditLoading: boolean;
  outboxEditError: string;
  userEmail?: string;
  emailsEqual: (a?: string, b?: string) => boolean;
  onCancelOutboxDeleteConfirm: () => void;
  onConfirmDeleteOutboxMessage: () => void | Promise<void>;
  onClearOutboxEditError: () => void;

  isBanNoticeModalVisible: boolean;
  banNoticeInfo: BanNoticeInfo | null;
  onCloseBanNotice: () => void;

  isReportModalVisible: boolean;
  reportSaving: boolean;
  reportTargetType: ReportTargetType;
  reportTargetId: string;
  reportReasonCode: string;
  reportDetail: string;
  reportError: string;
  onCloseReportModal: () => void;
  onSetReportReasonCode: (value: string) => void;
  onSetReportDetail: (value: string) => void;
  onSubmitReport: () => void | Promise<void>;
};

export function OverlayModalsSection({
  isChatPeerProfileVisible,
  selectedChatPeerProfile,
  onCloseChatPeerProfile,
  calculateAgeFromDate,
  isOutboxDeleteConfirmVisible,
  currentMessage,
  activeTab,
  outboxEditLoading,
  outboxEditError,
  userEmail,
  emailsEqual,
  onCancelOutboxDeleteConfirm,
  onConfirmDeleteOutboxMessage,
  onClearOutboxEditError,
  isBanNoticeModalVisible,
  banNoticeInfo,
  onCloseBanNotice,
  isReportModalVisible,
  reportSaving,
  reportTargetType,
  reportTargetId,
  reportReasonCode,
  reportDetail,
  reportError,
  onCloseReportModal,
  onSetReportReasonCode,
  onSetReportDetail,
  onSubmitReport,
}: OverlayModalsSectionProps) {
  return (
    <>
      <AnimatePresence>
        {isChatPeerProfileVisible && selectedChatPeerProfile ? (
          <motion.div
            key="chat-peer-profile"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[230] flex items-end justify-center sm:items-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={onCloseChatPeerProfile}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[min(100%,22rem)] rounded-2xl bg-white p-5 shadow-apple-card ring-1 ring-black/[0.06]"
            >
              <p className="text-[16px] font-black text-apple-near-black">
                對方資訊
              </p>
              <p className="mt-3 text-[12px] text-black/45">暱稱</p>
              <p className="text-[15px] font-semibold text-apple-near-black">
                {selectedChatPeerProfile.displayName || "未命名"}
              </p>
              <p className="mt-2 text-[12px] text-black/45">性別 / 年齡</p>
              <p className="text-[14px] text-apple-near-black">
                {selectedChatPeerProfile.gender || "未填"} /{" "}
                {calculateAgeFromDate(
                  selectedChatPeerProfile.birthDate?.toDate() || null,
                )}{" "}
                歲
              </p>
              <p className="mt-2 text-[12px] text-black/45">自我介紹</p>
              <p className="text-[13px] leading-relaxed text-apple-near-black whitespace-pre-wrap">
                {selectedChatPeerProfile.profileNote || "（未填）"}
              </p>
              <button
                type="button"
                onClick={onCloseChatPeerProfile}
                className="mt-4 w-full rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-4 py-2.5 text-[14px] font-black text-stone-900"
              >
                關閉
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isOutboxDeleteConfirmVisible &&
        currentMessage &&
        activeTab === "outbox" &&
        !currentMessage.isDue ? (
          <motion.div
            key="outbox-delete-confirm"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={() => {
              if (outboxEditLoading) return;
              onCancelOutboxDeleteConfirm();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="outbox-delete-dialog-title"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[min(100%,22rem)] rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-5 shadow-[6px_6px_0_0_#0f2420]"
            >
              <h3
                id="outbox-delete-dialog-title"
                className="text-[18px] font-black tracking-tight text-stone-900"
              >
                確認刪除？
              </h3>
              <p className="mt-2 text-[13px] font-bold leading-relaxed text-stone-600">
                將永久刪除這封尚未到開啟時間的訊息，無法復原。
              </p>
              <p className="mt-4 text-[14px] font-black text-stone-900 truncate">
                {emailsEqual(currentMessage.recipientEmail, userEmail)
                  ? "致未來的自己"
                  : `致 ${currentMessage.recipientEmail?.split("@")[0] ?? "收件人"}`}
              </p>
              <p className="mt-1 text-[11px] font-bold text-stone-500 tabular-nums">
                預定開啟{" "}
                {new Date(currentMessage.scheduledAt).toLocaleString("zh-TW", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {outboxEditError ? (
                <p
                  className="mt-3 text-[13px] font-bold text-red-600"
                  role="alert"
                >
                  {outboxEditError}
                </p>
              ) : null}
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  disabled={outboxEditLoading}
                  onClick={() => {
                    onClearOutboxEditError();
                    onCancelOutboxDeleteConfirm();
                  }}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={outboxEditLoading}
                  onClick={() => void onConfirmDeleteOutboxMessage()}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-red-500 px-4 py-2.5 text-[14px] font-black text-white active:translate-y-px disabled:opacity-50"
                >
                  {outboxEditLoading ? "刪除中…" : "確認刪除"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isBanNoticeModalVisible && banNoticeInfo ? (
          <motion.div
            key="ban-notice"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border-[3px] border-red-600 bg-white p-6 text-center shadow-2xl"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <Lock className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-[20px] font-black text-red-700">帳號已被封禁</p>
              <p className="mt-2 text-[13px] text-stone-700 leading-relaxed">
                {banNoticeInfo.reason}
              </p>
              <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] font-semibold text-red-800">
                封禁至：
                {banNoticeInfo.endAt === "永久" ? "永久封禁" : banNoticeInfo.endAt}
              </div>
              <p className="mt-3 text-[11px] text-stone-500">
                如有異議，請透過其他方式聯絡站方申訴。
              </p>
              <button
                type="button"
                onClick={onCloseBanNotice}
                className="mt-4 w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-2.5 text-[13px] font-bold text-stone-700"
              >
                我知道了
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isReportModalVisible ? (
          <motion.div
            key="report-modal"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-end justify-center bg-black/45 p-4 sm:items-center"
            onClick={() => {
              if (reportSaving) return;
              onCloseReportModal();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[min(100%,22rem)] rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-5 shadow-[6px_6px_0_0_#0f2420]"
            >
              <p className="text-[18px] font-black text-stone-900">送出舉報</p>
              <p className="mt-1 text-[12px] font-bold text-stone-500">
                類型：{reportTargetType} · 目標：{reportTargetId.slice(0, 18)}
                {reportTargetId.length > 18 ? "…" : ""}
              </p>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-stone-600">
                    舉報原因
                  </label>
                  <select
                    value={reportReasonCode}
                    onChange={(e) => onSetReportReasonCode(e.target.value)}
                    className="w-full rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors"
                  >
                    <option value="abuse">辱罵 / 騷擾</option>
                    <option value="spam">垃圾廣告 / 詐騙</option>
                    <option value="inappropriate_content">
                      不當內容 / 色情
                    </option>
                    <option value="impersonation">冒充他人</option>
                    <option value="underage">疑似未成年</option>
                    <option value="hate_speech">仇恨言論</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-stone-600">
                    詳細說明
                  </label>
                  <textarea
                    value={reportDetail}
                    onChange={(e) => onSetReportDetail(e.target.value)}
                    minLength={10}
                    maxLength={2000}
                    rows={4}
                    placeholder="請補充具體情況（至少 10 字）…"
                    className="w-full resize-none rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors placeholder:text-stone-400"
                  />
                </div>
              </div>
              {reportError ? (
                <p
                  className="mt-2 text-[13px] font-bold text-red-600"
                  role="alert"
                >
                  {reportError}
                </p>
              ) : null}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={onCloseReportModal}
                  disabled={reportSaving}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void onSubmitReport()}
                  disabled={reportSaving}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-red-500 px-4 py-2.5 text-[14px] font-black text-white active:translate-y-px disabled:opacity-50"
                >
                  {reportSaving ? "送出中…" : "確認舉報"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
