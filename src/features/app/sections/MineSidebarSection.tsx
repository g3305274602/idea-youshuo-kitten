import {
  ChevronRight,
  Edit3,
  Heart,
  Home,
  Inbox,
  LayoutGrid,
  MessageCircle,
  Send,
  Star,
} from "lucide-react";
import type { AppTab, User as AppUser } from "../types";

type MineSidebarSectionProps = {
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
  /** 全站可見的廣場貼文總數（與秘密頁牆面列表一致，含未到時間者） */
  squarePostsCount: number;
  /** 切到「秘密」分頁並展開廣場牆列表 */
  onOpenSquareWall: () => void;
};

export function MineSidebarSection({
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
  onOpenSquareWall,
}: MineSidebarSectionProps) {
  const displayName = user?.displayName?.trim() || "未命名用戶";
  const email = user?.email?.trim() || "";
  const note = user?.profileNote?.trim() || " ";

  const menuItems = [
    {
      key: "inbox",
      title: "飄向我的",
      subtitle: "收到的膠囊",
      count: inboxUnreadCount > 0 ? inboxUnreadCount : null,
      iconClass: "ys-mine-menu-icon--blue",
      icon: Inbox,
    },
    {
      key: "outbox",
      title: "我丟出的",
      subtitle: "送出的膠囊",
      count: outboxUnreadCount > 0 ? outboxUnreadCount : null,
      iconClass: "ys-mine-menu-icon--amber",
      icon: Send,
    },
    {
      key: "chat",
      title: "聊聊記錄",
      subtitle: "與宇宙人的對話",
      count: chatUnreadCount > 0 ? chatUnreadCount : null,
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
      count: null,
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

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenSquareWall}
          className="glass-effect group flex min-h-[4.5rem] flex-col justify-between gap-1 rounded-[24px] p-2.5 text-left transition-colors hover:bg-white/[0.06] active:scale-[0.99]"
        >
          <div className="flex min-w-0 items-start gap-1.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-[#a78bfa]/35 to-white/5 text-white">
              <LayoutGrid className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[12px] font-black text-white">廣場牆</p>
              <p className="mt-0.5 line-clamp-2 text-[10px] font-bold text-white/55">
                共 {squarePostsCount} 則 · 點此展開廣場列表
              </p>
            </div>
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-white/40 transition group-hover:text-white/70"
              strokeWidth={2.5}
              aria-hidden
            />
          </div>
        </button>
        <button
          type="button"
          onClick={() => onNavigate("space")}
          className="glass-effect group flex min-h-[4.5rem] flex-col justify-between gap-1 rounded-[24px] p-2.5 text-left transition-colors hover:bg-white/[0.06] active:scale-[0.99]"
        >
          <div className="flex min-w-0 items-start gap-1.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-[#ff85a2]/30 to-white/5 text-white">
              <Home className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[12px] font-black text-white">我的空間</p>
              <p className="mt-0.5 line-clamp-2 text-[9px] font-bold text-white/50">
                膠囊、貼牆與足跡 · 從此進入
              </p>
            </div>
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-white/40 transition group-hover:text-white/70"
              strokeWidth={2.5}
              aria-hidden
            />
          </div>
        </button>
      </div>

      <div className="ys-mine-menu-shell">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className="ys-mine-menu-row"
              onClick={() => onNavigate(item.key as AppTab)}
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
