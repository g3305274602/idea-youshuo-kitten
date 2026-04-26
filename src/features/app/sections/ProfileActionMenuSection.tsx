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
            className="cd-modal-panel w-full max-w-[min(100%,22rem)] p-5"
          >
            <p className="text-[18px] font-bold text-white">編輯選單</p>
            <p className="mt-1 text-[12px] font-medium text-[#8E8E93]">先選你要做的操作</p>
            <div className="mt-4 space-y-3">
              {!hasAnyAdmin && (
                <button
                  type="button"
                  onClick={() => void onBootstrapAdminSelf()}
                  disabled={adminActionLoading}
                  className="w-full rounded-xl border border-rose-500/35 bg-rose-500/15 px-4 py-3 text-left text-[14px] font-bold text-rose-200 transition-all active:translate-y-px disabled:opacity-50"
                >
                  {adminActionLoading ? "建立中..." : "建立首位超級管理員"}
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={onEnterAdmin}
                  className="cd-btn-primary w-full py-3 text-left text-[14px] font-bold"
                >
                  {isSuperAdmin ? "進入超級管理中心" : "進入管理中心"}
                </button>
              )}
              <button
                type="button"
                onClick={onOpenProfile}
                className="cd-btn-ghost w-full py-3 text-left text-[14px] font-bold"
              >
                基本資料
              </button>
              <button
                type="button"
                onClick={onOpenPassword}
                className="cd-btn-ghost w-full py-3 text-left text-[14px] font-bold"
              >
                修改秘密
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/12 px-4 py-3 text-left text-[14px] font-bold text-red-300 active:translate-y-px"
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
