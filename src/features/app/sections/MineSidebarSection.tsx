import { Edit3, Star } from "lucide-react";
import type { AppTab, User as AppUser } from "../types";
import { MineHubMenuNav } from "./MineHubMenuNav";

type MineSidebarSectionProps = {
  activeTab: AppTab;
  user: AppUser | null;
  /** 僅在 >0 時顯示；依本地已讀游標，代表收到／寄出列表中有新筆 */
  inboxUnreadCount: number;
  outboxUnreadCount: number;
  /** 僅在 >0 時於「聊聊記錄」列顯示未讀數；無未讀則不顯示角標 */
  chatUnreadCount: number;
  myReportsCount: number;
  onOpenActions: () => void;
  onEditIntro: () => void;
  onLogout: () => void;
  onNavigate: (tab: AppTab) => void;
  /** 全站可見的廣場貼文總數（廣場牆列副標用） */
  squarePostsCount: number;
};

export function MineSidebarSection({
  activeTab,
  user,
  inboxUnreadCount,
  outboxUnreadCount,
  chatUnreadCount,
  myReportsCount,
  onOpenActions,
  onEditIntro,
  onLogout,
  onNavigate,
  squarePostsCount,
}: MineSidebarSectionProps) {
  const displayName = user?.displayName?.trim() || "未命名用戶";
  const email = user?.email?.trim() || "";
  const note = user?.profileNote?.trim() || " ";

  return (
    <section className="ys-mine-page">
      <div className="ys-mine-profile-card">
        <button type="button" onClick={onOpenActions} className="ys-mine-profile-hitbox" aria-label="開啟個人設定">
          <span className="ys-mine-avatar-slot" aria-hidden />
          <div className="ys-mine-profile-main">
            <div className="ys-mine-name-row">
              <p className="ys-mine-name">{displayName}</p>
              <Edit3 className="h-3.5 w-3.5 text-white/80" strokeWidth={2.4} aria-hidden />
            </div>
            <div className="ys-mine-level-chip">
              <Star className="h-3 w-3" strokeWidth={2.8} aria-hidden />
              <span>Lv.12</span>
            </div>
            <p className="ys-mine-email">{email}</p>
            <p className="ys-mine-note">{note}</p>
          </div>
        </button>
      </div>

      {/** 手機：廣場／空間與子入口併入下列；桌機改由父層頂部導列顯示，避免重複 */}
      <div className="mt-3 md:hidden">
        <MineHubMenuNav
          layout="inShell"
          activeTab={activeTab}
          onNavigate={onNavigate}
          squarePostsCount={squarePostsCount}
          inboxUnreadCount={inboxUnreadCount}
          outboxUnreadCount={outboxUnreadCount}
          chatUnreadCount={chatUnreadCount}
        />
      </div>

      <button type="button" onClick={onEditIntro} className="hidden" />
      <button type="button" onClick={onLogout} className="hidden" />
      <span className="hidden">{myReportsCount}</span>
    </section>
  );
}
