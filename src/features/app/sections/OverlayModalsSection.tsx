import { AnimatePresence, motion } from "motion/react";
import { Lock } from "lucide-react";
import { reportTargetTypeLabel } from "../adminReportDisplay";
import { CdSelect } from "../components/CdSelect";
import { useEscapeClose } from "../hooks/useEscapeClose";
import type { Message } from "../types";
import { GenderIcon } from "./PickerControls";

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
  useEscapeClose(
    isChatPeerProfileVisible && !!selectedChatPeerProfile,
    onCloseChatPeerProfile,
  );
  useEscapeClose(
    isOutboxDeleteConfirmVisible &&
      !!currentMessage &&
      activeTab === "outbox" &&
      !currentMessage.isDue &&
      !outboxEditLoading,
    onCancelOutboxDeleteConfirm,
  );
  useEscapeClose(isBanNoticeModalVisible, onCloseBanNotice);
  useEscapeClose(isReportModalVisible && !reportSaving, onCloseReportModal);

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
              className="cd-modal-panel w-full max-w-[min(100%,22rem)] p-5"
            >
              <p className="text-[16px] font-bold text-white">對方資訊</p>
              <p className="mt-3 text-[12px] text-[#8E8E93]">暱稱</p>
              <p className="text-[15px] font-semibold text-white">
                {selectedChatPeerProfile.displayName || "未命名"}
              </p>
              <p className="mt-2 text-[12px] text-[#8E8E93]">性別 / 年齡</p>
              <p className="inline-flex items-center gap-1.5 text-[14px] text-white">
                <GenderIcon gender={selectedChatPeerProfile.gender} />
                <span>/</span>
                {calculateAgeFromDate(
                  selectedChatPeerProfile.birthDate?.toDate() || null,
                )}{" "}
                歲
              </p>
              <p className="mt-2 text-[12px] text-[#8E8E93]">自我介紹</p>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/90">
                {selectedChatPeerProfile.profileNote || "（未填）"}
              </p>
              <button
                type="button"
                onClick={onCloseChatPeerProfile}
                className="cd-btn-primary mt-4 w-full py-2.5 text-[14px] font-bold"
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
              className="cd-modal-panel w-full max-w-[min(100%,22rem)] p-5"
            >
              <h3
                id="outbox-delete-dialog-title"
                className="text-[18px] font-bold tracking-tight text-white"
              >
                確認刪除？
              </h3>
              <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#8E8E93]">
                將永久刪除這封尚未到開啟時間的訊息，無法復原。
              </p>
              <p className="mt-4 truncate text-[14px] font-bold text-white">
                {emailsEqual(currentMessage.recipientEmail, userEmail)
                  ? "致未來的自己"
                  : `致 ${currentMessage.recipientEmail?.split("@")[0] ?? "收件人"}`}
              </p>
              <p className="mt-1 text-[11px] font-bold tabular-nums text-[#8E8E93]">
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
                  className="cd-btn-ghost flex-1 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={outboxEditLoading}
                  onClick={() => void onConfirmDeleteOutboxMessage()}
                  className="flex-1 rounded-xl border border-red-500/40 bg-red-500/25 px-4 py-2.5 text-[14px] font-bold text-red-100 transition-all active:translate-y-px disabled:opacity-50"
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
              className="w-full max-w-sm rounded-2xl border border-red-500/40 bg-[#1A1B22] p-6 text-center text-white shadow-[0_32px_64px_rgba(0,0,0,0.55)]"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
                <Lock className="h-8 w-8 text-red-400" />
              </div>
              <p className="text-[20px] font-bold text-red-300">帳號已被封禁</p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#8E8E93]">
                {banNoticeInfo.reason}
              </p>
              <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-200">
                封禁至：
                {banNoticeInfo.endAt === "永久" ? "永久封禁" : banNoticeInfo.endAt}
              </div>
              <p className="mt-3 text-[11px] text-[#8E8E93]">
                如有異議，請透過其他方式聯絡站方申訴。
              </p>
              <button
                type="button"
                onClick={onCloseBanNotice}
                className="cd-btn-ghost mt-4 w-full py-2.5 text-[13px] font-bold"
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
              className="cd-modal-panel w-full max-w-[min(100%,22rem)] p-5"
            >
              <p className="text-[18px] font-bold text-white">送出舉報</p>
              <p className="mt-1 text-[12px] font-medium text-[#8E8E93]">
                類型：{reportTargetTypeLabel(reportTargetType)} · 目標 ID：
                {reportTargetId.slice(0, 18)}
                {reportTargetId.length > 18 ? "…" : ""}
              </p>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                    舉報原因
                  </label>
                  <CdSelect
                    value={reportReasonCode}
                    onChange={onSetReportReasonCode}
                    options={[
                      { value: "abuse", label: "辱罵 / 騷擾" },
                      { value: "spam", label: "垃圾廣告 / 詐騙" },
                      { value: "inappropriate_content", label: "不當內容 / 色情" },
                      { value: "impersonation", label: "冒充他人" },
                      { value: "underage", label: "疑似未成年" },
                      { value: "hate_speech", label: "仇恨言論" },
                      { value: "other", label: "其他" },
                    ]}
                    buttonClassName="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                    詳細說明
                  </label>
                  <textarea
                    value={reportDetail}
                    onChange={(e) => onSetReportDetail(e.target.value)}
                    minLength={10}
                    maxLength={2000}
                    rows={4}
                    placeholder="請補充具體情況（至少 10 字）…"
                    className="cd-field min-h-[6rem] resize-none"
                  />
                </div>
              </div>
              {reportError ? (
                <p
                  className="mt-2 text-[13px] font-bold text-red-300"
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
                  className="cd-btn-ghost flex-1 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void onSubmitReport()}
                  disabled={reportSaving}
                  className="flex-1 rounded-xl border border-red-500/40 bg-red-500/30 px-4 py-2.5 text-[14px] font-bold text-red-100 transition-all active:translate-y-px disabled:opacity-50"
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
