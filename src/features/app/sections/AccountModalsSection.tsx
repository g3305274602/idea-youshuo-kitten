import { AnimatePresence, motion } from "motion/react";
import { useEscapeClose } from "../hooks/useEscapeClose";
import type { User } from "../types";

type AccountModalsSectionProps = {
  user: User | null;
  isIntroEditModalVisible: boolean;
  introEditSaving: boolean;
  introEditDraft: string;
  introEditError: string;
  onCloseIntroEdit: () => void;
  onSetIntroEditDraft: (value: string) => void;
  onSubmitIntroEdit: () => void | Promise<void>;
  isPasswordModalVisible: boolean;
  passwordSaving: boolean;
  passwordOld: string;
  passwordNew: string;
  passwordConfirm: string;
  passwordError: string;
  onClosePasswordModal: () => void;
  onSetPasswordOld: (value: string) => void;
  onSetPasswordNew: (value: string) => void;
  onSetPasswordConfirm: (value: string) => void;
  onSubmitPasswordChange: () => void | Promise<void>;
};

export function AccountModalsSection({
  user,
  isIntroEditModalVisible,
  introEditSaving,
  introEditDraft,
  introEditError,
  onCloseIntroEdit,
  onSetIntroEditDraft,
  onSubmitIntroEdit,
  isPasswordModalVisible,
  passwordSaving,
  passwordOld,
  passwordNew,
  passwordConfirm,
  passwordError,
  onClosePasswordModal,
  onSetPasswordOld,
  onSetPasswordNew,
  onSetPasswordConfirm,
  onSubmitPasswordChange,
}: AccountModalsSectionProps) {
  useEscapeClose(isIntroEditModalVisible && !!user && !introEditSaving, onCloseIntroEdit);
  useEscapeClose(isPasswordModalVisible && !passwordSaving, onClosePasswordModal);

  return (
    <>
      <AnimatePresence>
        {isIntroEditModalVisible && user ? (
          <motion.div
            key="intro-edit-modal"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[226] flex items-end justify-center bg-black/45 p-4 sm:items-center"
            onClick={() => {
              if (introEditSaving) return;
              onCloseIntroEdit();
            }}
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
              <h3 className="text-[18px] font-bold tracking-tight text-white">
                編輯自我介紹
              </h3>
              <p className="mt-1 text-[12px] font-medium text-[#8E8E93]">
                可填 10–400 字，儲存後會回到上一頁。
              </p>
              <textarea
                value={introEditDraft}
                onChange={(e) => onSetIntroEditDraft(e.target.value)}
                rows={6}
                minLength={10}
                maxLength={400}
                className="cd-field mt-3 min-h-[8rem] resize-none"
                placeholder="寫下你想讓人知道的自己（10–400 字）"
              />
              <p className="mt-1 text-right text-[11px] font-bold text-[#8E8E93]">
                {introEditDraft.trim().length}/400
              </p>
              {introEditError ? (
                <p className="mt-2 text-[13px] font-bold text-red-300" role="alert">
                  {introEditError}
                </p>
              ) : null}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={onCloseIntroEdit}
                  disabled={introEditSaving}
                  className="cd-btn-ghost flex-1"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void onSubmitIntroEdit()}
                  disabled={introEditSaving}
                  className="cd-btn-primary flex-1 disabled:opacity-50"
                >
                  {introEditSaving ? "儲存中…" : "儲存"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isPasswordModalVisible ? (
          <motion.div
            key="password-modal"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[226] flex items-end justify-center bg-black/45 p-4 sm:items-center"
            onClick={() => {
              if (passwordSaving) return;
              onClosePasswordModal();
            }}
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
              <h3 className="text-[18px] font-bold tracking-tight text-white">修改秘密</h3>
              <div className="mt-4 space-y-3">
                <input
                  type="password"
                  value={passwordOld}
                  onChange={(e) => onSetPasswordOld(e.target.value)}
                  placeholder="舊密碼"
                  className="cd-field"
                />
                <input
                  type="password"
                  value={passwordNew}
                  onChange={(e) => onSetPasswordNew(e.target.value)}
                  placeholder="新密碼（6–128）"
                  className="cd-field"
                />
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => onSetPasswordConfirm(e.target.value)}
                  placeholder="再輸入一次新密碼"
                  className="cd-field"
                />
              </div>
              {passwordError ? (
                <p className="mt-2 text-[13px] font-bold text-red-300" role="alert">
                  {passwordError}
                </p>
              ) : null}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={onClosePasswordModal}
                  disabled={passwordSaving}
                  className="cd-btn-ghost flex-1 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void onSubmitPasswordChange()}
                  disabled={passwordSaving}
                  className="cd-btn-primary flex-1 disabled:opacity-50"
                >
                  {passwordSaving ? "更新中…" : "更新密碼"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
