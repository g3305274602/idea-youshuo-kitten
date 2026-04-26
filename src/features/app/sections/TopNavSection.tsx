import { ChevronDown, ChevronRight, Lock, LogOut, User } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { AppTab } from "../types";
import { NavTab } from "../components";

type TopNavSectionProps = {
  activeTab: AppTab;
  isAdminModeTab: boolean;
  showMobileBackButton: boolean;
  auth: { isAdmin: boolean; isSuperAdmin: boolean };
  userDisplayName: string;
  userEmail?: string;
  hasAnyAdmin: boolean;
  adminActionLoading: boolean;
  onAdminModeBack: () => void;
  onMobileBack: () => void;
  onSecretTab: () => void;
  onComposeTab: () => void;
  onMineTab: () => void;
  onOpenProfileActionMenu: () => void;
  onBootstrapAdminSelf: () => void | Promise<void>;
  onEnterAdmin: () => void;
  onOpenAccountProfile: () => void;
  onOpenPasswordModal: () => void;
  onLogout: () => void;
};

export function TopNavSection({
  activeTab,
  isAdminModeTab,
  showMobileBackButton,
  auth,
  userDisplayName,
  userEmail,
  hasAnyAdmin,
  adminActionLoading,
  onAdminModeBack,
  onMobileBack,
  onSecretTab,
  onComposeTab,
  onMineTab,
  onOpenProfileActionMenu,
  onBootstrapAdminSelf,
  onEnterAdmin,
  onOpenAccountProfile,
  onOpenPasswordModal,
  onLogout,
}: TopNavSectionProps) {
  const isMineThemeTab =
    activeTab === "mine" ||
    activeTab === "inbox" ||
    activeTab === "outbox" ||
    activeTab === "favorites" ||
    activeTab === "space" ||
    activeTab === "chat" ||
    activeTab === "my_reports";

  return (
    <nav
      className={cn(
        "relative z-50 flex h-[56px] shrink-0 items-center px-3 md:h-[56px] md:px-6",
        isMineThemeTab
          ? "border-b border-[#3f798d]/55 bg-[#0a3f56]/95"
          : "border-b border-stone-900/35 bg-gradient-to-r from-[#1d4643] via-[#1f4a47] to-[#24514d]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
      <div className="flex min-w-0 flex-1 items-center justify-start gap-3">
        {auth.isAdmin && isAdminModeTab ? (
          <button
            type="button"
            aria-label="離開管理模式"
            onClick={onAdminModeBack}
            className="flex md:hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-stone-900 bg-[#f4dc3a] text-stone-900 shadow-[3px_3px_0_0_#000] transition-transform active:translate-y-px active:shadow-none"
          >
            <ChevronRight
              className="h-5 w-5 -rotate-180"
              strokeWidth={3.5}
              aria-hidden
            />
          </button>
        ) : showMobileBackButton ? (
          <button
            type="button"
            aria-label="返回"
            onClick={onMobileBack}
            className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-white/35 bg-white/10 text-white shadow-[3px_3px_0_0_rgba(0,0,0,0.25)] transition-transform active:translate-y-px active:shadow-none"
          >
            <ChevronRight
              className="h-5 w-5 -rotate-180"
              strokeWidth={2.5}
              aria-hidden
            />
          </button>
        ) : (
          <span className="md:hidden h-10 w-10 shrink-0" aria-hidden />
        )}

        {auth.isAdmin ? (
          <div className="hidden min-w-0 shrink-0 md:flex md:flex-col">
            <span className="block text-[17px] font-black tracking-tight text-white md:text-[17px]">
              有說
            </span>
            <span className="block text-[9px] font-semibold tracking-[0.14em] text-white/55 md:text-white/45">
              悄悄話・膠囊・小紙條
            </span>
          </div>
        ) : null}

        <div
          className="hidden h-10 max-w-[min(100%,36rem)] shrink-0 items-center gap-1 overflow-x-auto rounded-full bg-black/35 p-1 shadow-inner shadow-black/20 ring-1 ring-inset ring-white/[0.12] scrollbar-none md:flex"
          role="tablist"
          aria-label="主要分頁"
        >
          <NavTab active={activeTab === "secret"} onClick={onSecretTab} label="秘密" />
          <NavTab
            active={activeTab === "new" || activeTab === "direct"}
            onClick={onComposeTab}
            label="撰写"
          />
          <NavTab
            active={
              activeTab === "mine" ||
              activeTab === "inbox" ||
              activeTab === "outbox" ||
              activeTab === "favorites" ||
              activeTab === "space" ||
              activeTab === "admin" ||
              activeTab === "admin_ops" ||
              activeTab === "chat"
            }
            onClick={onMineTab}
            label="我的"
          />
        </div>
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center",
          auth.isAdmin && "md:hidden",
        )}
      >
        <span className="text-[17px] font-black tracking-tight text-white md:text-[17px]">
          有說
        </span>
        <span className="text-[9px] font-semibold tracking-[0.14em] text-white/55 md:text-white/45">
          悄悄話・膠囊・小紙條
        </span>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-end gap-2">
        <button
          type="button"
          onClick={onOpenProfileActionMenu}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-2.5 py-1.5 text-[11px] font-semibold text-white/95 transition-colors hover:bg-white/20 md:hidden"
        >
          <span className="max-w-[4.75rem] truncate">{userDisplayName}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/70" />
        </button>

        <div className="group relative hidden md:block">
          <button
            type="button"
            className="inline-flex max-w-[min(100%,11rem)] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1.5 text-left text-white/95 transition-colors hover:bg-white/20"
          >
            <span className="inline-flex max-w-[6rem] truncate rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold">
              {userDisplayName}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/70" />
          </button>

          <div className="pointer-events-none absolute right-0 top-full z-50 w-44 pt-2 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
            <div className="rounded-2xl border-[2px] border-stone-900/90 bg-[#fffef7] p-2 shadow-[6px_6px_0_0_#0f2420]">
              <div className="rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-left">
                <p className="truncate text-[12px] font-black text-stone-900">
                  {userDisplayName}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-stone-500">
                  {userEmail}
                </p>
              </div>
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
              {auth.isAdmin && (
                <button
                  type="button"
                  onClick={onEnterAdmin}
                  className="w-full rounded-xl border-2 border-stone-900 bg-[#f4dc3a] px-3 py-2 text-left text-[13px] font-black text-stone-900 shadow-[3px_3px_0_0_#000] transition-all active:translate-y-px active:shadow-none"
                >
                  進入管理中心
                </button>
              )}
              <button
                type="button"
                onClick={onOpenAccountProfile}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-black text-stone-900 transition-colors hover:bg-stone-100"
              >
                <span>基本資料</span>
                <User className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onOpenPasswordModal}
                className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-black text-stone-900 transition-colors hover:bg-stone-100"
              >
                <span>修改密碼</span>
                <Lock className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-black text-red-700 transition-colors hover:bg-red-50"
              >
                <span>登出</span>
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <span className="hidden">{userEmail}</span>
      </div>
    </nav>
  );
}
