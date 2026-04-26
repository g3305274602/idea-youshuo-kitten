import { AnimatePresence, motion } from "motion/react";
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
              className="w-full max-w-[min(100%,22rem)] rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-5 shadow-[6px_6px_0_0_#0f2420]"
            >
              <h3 className="text-[18px] font-black tracking-tight text-stone-900">
                編輯自我介紹
              </h3>
              <p className="mt-1 text-[12px] font-bold text-stone-500">
                可填 10–400 字，儲存後會回到上一頁。
              </p>
              <textarea
                value={introEditDraft}
                onChange={(e) => onSetIntroEditDraft(e.target.value)}
                rows={6}
                minLength={10}
                maxLength={400}
                className="mt-3 w-full resize-none rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors placeholder:text-stone-400"
                placeholder="寫下你想讓人知道的自己（10–400 字）"
              />
              <p className="mt-1 text-right text-[11px] font-bold text-stone-400">
                {introEditDraft.trim().length}/400
              </p>
              {introEditError ? (
                <p className="mt-2 text-[13px] font-bold text-red-600" role="alert">
                  {introEditError}
                </p>
              ) : null}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={onCloseIntroEdit}
                  disabled={introEditSaving}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void onSubmitIntroEdit()}
                  disabled={introEditSaving}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px disabled:opacity-50"
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
              className="w-full max-w-[min(100%,22rem)] rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-5 shadow-[6px_6px_0_0_#0f2420]"
            >
              <h3 className="text-[18px] font-black tracking-tight text-stone-900">
                修改秘密
              </h3>
              <div className="mt-4 space-y-3">
                <input
                  type="password"
                  value={passwordOld}
                  onChange={(e) => onSetPasswordOld(e.target.value)}
                  placeholder="舊密碼"
                  className="w-full rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors placeholder:text-stone-400"
                />
                <input
                  type="password"
                  value={passwordNew}
                  onChange={(e) => onSetPasswordNew(e.target.value)}
                  placeholder="新密碼（6–128）"
                  className="w-full rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors placeholder:text-stone-400"
                />
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => onSetPasswordConfirm(e.target.value)}
                  placeholder="再輸入一次新密碼"
                  className="w-full rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-[14px] font-medium text-stone-900 outline-none focus:bg-[#fff9df] transition-colors placeholder:text-stone-400"
                />
              </div>
              {passwordError ? (
                <p className="mt-2 text-[13px] font-bold text-red-600" role="alert">
                  {passwordError}
                </p>
              ) : null}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={onClosePasswordModal}
                  disabled={passwordSaving}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void onSubmitPasswordChange()}
                  disabled={passwordSaving}
                  className="flex-1 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-4 py-2.5 text-[14px] font-black text-stone-900 active:translate-y-px disabled:opacity-50"
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
