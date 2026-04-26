import {
  ChevronRight,
  Edit3,
  Heart,
  Home,
  Inbox,
  MessageCircle,
  Send,
  Star,
} from "lucide-react";
import type { User as AppUser } from "../types";

type MineSidebarSectionProps = {
  user: AppUser | null;
  inboxCount: number;
  outboxCount: number;
  favoriteCount: number;
  chatCount: number;
  myReportsCount: number;
  onOpenActions: () => void;
  onEditIntro: () => void;
  onLogout: () => void;
  onNavigate: (tab: any) => void;
};

export function MineSidebarSection({
  user,
  inboxCount,
  outboxCount,
  favoriteCount,
  chatCount,
  myReportsCount,
  onOpenActions,
  onEditIntro,
  onLogout,
  onNavigate,
}: MineSidebarSectionProps) {
  const displayName = user?.displayName?.trim() || "未命名用戶";
  const email = user?.email?.trim() || "";
  const note = user?.profileNote?.trim() || " ";

  const stats = [
    { label: "飄向我的", count: inboxCount, icon: Inbox },
    { label: "我丟出的", count: outboxCount, icon: Send },
    { label: "聊聊記錄", count: chatCount, icon: MessageCircle },
    { label: "收藏的", count: favoriteCount, icon: Star },
  ] as const;

  const menuItems = [
    {
      key: "inbox",
      title: "飄向我的",
      subtitle: "收到的膠囊",
      count: inboxCount,
      iconClass: "ys-mine-menu-icon--blue",
      icon: Inbox,
    },
    {
      key: "outbox",
      title: "我丟出的",
      subtitle: "送出的膠囊",
      count: outboxCount,
      iconClass: "ys-mine-menu-icon--amber",
      icon: Send,
    },
    {
      key: "chat",
      title: "聊聊記錄",
      subtitle: "與宇宙人的對話",
      count: chatCount,
      iconClass: "ys-mine-menu-icon--green",
      icon: MessageCircle,
    },
    {
      key: "space",
      title: "我的空間",
      subtitle: "個人資料與設定",
      count: null,
      iconClass: "ys-mine-menu-icon--violet",
      icon: Home,
    },
    {
      key: "favorites",
      title: "藏心底",
      subtitle: "珍藏的回憶",
      count: favoriteCount,
      iconClass: "ys-mine-menu-icon--pink",
      icon: Heart,
    },
  ] as const;

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

      <div className="ys-mine-stats-row">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="ys-mine-stat-item">
              <div className="ys-mine-stat-top">
                <Icon className="h-3.5 w-3.5 text-[#9dd6ff]" strokeWidth={2.5} aria-hidden />
                <span className="ys-mine-stat-count">{item.count}</span>
              </div>
              <p className="ys-mine-stat-label">{item.label}</p>
            </div>
          );
        })}
      </div>

      <div className="ys-mine-menu-shell">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className="ys-mine-menu-row"
              onClick={() => onNavigate(item.key as any)}
            >
              <span className={`ys-mine-menu-icon ${item.iconClass}`}>
                <Icon className="h-4 w-4 text-white" strokeWidth={2.6} aria-hidden />
              </span>
              <span className="ys-mine-menu-texts">
                <span className="ys-mine-menu-title">{item.title}</span>
                <span className="ys-mine-menu-subtitle">{item.subtitle}</span>
              </span>
              {item.count !== null ? <span className="ys-mine-menu-count">{item.count}</span> : null}
              <ChevronRight className="h-[18px] w-[18px] text-slate-400" strokeWidth={2.5} aria-hidden />
              {index < menuItems.length - 1 ? <span className="ys-mine-menu-divider" aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      <button type="button" onClick={onEditIntro} className="hidden" />
      <button type="button" onClick={onLogout} className="hidden" />
      <span className="hidden">{myReportsCount}</span>
    </section>
  );
}
