import { AnimatePresence, motion } from "motion/react";

type ProfileActionMenuSectionProps = {
  open: boolean;
  hasAnyAdmin: boolean;
  adminActionLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  onClose: () => void;
  onBootstrapAdminSelf: () => void | Promise<void>;
  onEnterAdmin: () => void;
  onOpenProfile: () => void;
  onOpenPassword: () => void;
  onLogout: () => void;
};

export function ProfileActionMenuSection({
  open,
  hasAnyAdmin,
  adminActionLoading,
  isAdmin,
  isSuperAdmin,
  onClose,
  onBootstrapAdminSelf,
  onEnterAdmin,
  onOpenProfile,
  onOpenPassword,
  onLogout,
}: ProfileActionMenuSectionProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="profile-action-menu"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[226] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          onClick={onClose}
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
            <p className="text-[18px] font-black text-stone-900">編輯選單</p>
            <p className="mt-1 text-[12px] font-bold text-stone-500">
              先選你要做的操作
            </p>
            <div className="mt-4 space-y-3">
              {!hasAnyAdmin && (
                <button
                  type="button"
                  onClick={() => void onBootstrapAdminSelf()}
                  disabled={adminActionLoading}
                  className="w-full rounded-xl border-2 border-stone-900 bg-rose-100 px-4 py-3 text-left text-[14px] font-black text-rose-700 shadow-[3px_3px_0_0_#000] transition-all active:translate-y-px active:shadow-none disabled:opacity-50"
                >
                  {adminActionLoading ? "建立中..." : "🔑 建立首位超級管理員"}
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={onEnterAdmin}
                  className="w-full rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-4 py-3 text-left text-[14px] font-black text-stone-900 shadow-[3px_3px_0_0_#000] transition-all active:translate-y-px active:shadow-none"
                >
                  {isSuperAdmin ? "進入超級管理中心" : "進入管理中心"}
                </button>
              )}
              <button
                type="button"
                onClick={onOpenProfile}
                className="w-full rounded-xl border-2 border-stone-900 bg-white px-4 py-3 text-left text-[14px] font-black text-stone-900 active:translate-y-px"
              >
                基本資料
              </button>
              <button
                type="button"
                onClick={onOpenPassword}
                className="w-full rounded-xl border-2 border-stone-900 bg-white px-4 py-3 text-left text-[14px] font-black text-stone-900 active:translate-y-px"
              >
                修改秘密
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="w-full rounded-xl border-2 border-stone-900 bg-[#ffccd5] px-4 py-3 text-left text-[14px] font-black text-red-700 active:translate-y-px"
              >
                登出
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
