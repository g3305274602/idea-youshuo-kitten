import { ChevronRight, Heart, Home, Inbox, LayoutGrid, MessageCircle, Send } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { AppTab } from "../types";

/** 桌機左欄頂部持久導覽：含「我的」根頁、廣場牆與各子分頁 */
const DESKTOP_HUB_TABS: readonly AppTab[] = [
  "mine",
  "mine_square",
  "inbox",
  "outbox",
  "chat",
  "space",
  "favorites",
];

export function showMineHubDesktopSubNav(tab: AppTab): boolean {
  return (DESKTOP_HUB_TABS as readonly string[]).includes(tab);
}

type MineHubMenuNavProps = {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  /** 廣場牆副標用 */
  squarePostsCount: number;
  inboxUnreadCount: number;
  outboxUnreadCount: number;
  chatUnreadCount: number;
  /** 嵌入「我的」大卡片內的列表，或僅桌面子頁左欄用 */
  layout: "inShell" | "desktop";
};

const menuItemDefs = [
  {
    key: "mine_square" as const,
    title: "廣場牆",
    getSubtitle: (sq: number) =>
      sq > 0 ? `共 ${sq} 則 · 小紙條列表` : "公開小紙條列表",
    iconClass: "ys-mine-menu-icon--lilac",
    icon: LayoutGrid,
  },
  {
    key: "inbox" as const,
    title: "飄向我的",
    getSubtitle: () => "收到的膠囊",
    iconClass: "ys-mine-menu-icon--blue",
    icon: Inbox,
  },
  {
    key: "outbox" as const,
    title: "我丟出的",
    getSubtitle: () => "送出的膠囊",
    iconClass: "ys-mine-menu-icon--amber",
    icon: Send,
  },
  {
    key: "chat" as const,
    title: "聊聊記錄",
    getSubtitle: () => "與宇宙人的對話",
    iconClass: "ys-mine-menu-icon--green",
    icon: MessageCircle,
  },
  {
    key: "space" as const,
    title: "我的空間",
    getSubtitle: () => "個人資料與設定",
    iconClass: "ys-mine-menu-icon--violet",
    icon: Home,
  },
  {
    key: "favorites" as const,
    title: "藏心底",
    getSubtitle: () => "珍藏的回憶",
    iconClass: "ys-mine-menu-icon--pink",
    icon: Heart,
  },
] as const;

/**
 * 「我的」入口含廣場牆；用於大卡片內與桌機左欄（持久顯示目前分頁）。
 */
export function MineHubMenuNav({
  activeTab,
  onNavigate,
  squarePostsCount,
  inboxUnreadCount,
  outboxUnreadCount,
  chatUnreadCount,
  layout,
}: MineHubMenuNavProps) {
  return (
    <div
      className={cn(
        layout === "inShell" ? "ys-mine-menu-shell" : "ys-mine-menu-desktop-rail",
      )}
    >
      {menuItemDefs.map((item, index) => {
        const Icon = item.icon;
        const count =
          item.key === "inbox" && inboxUnreadCount > 0
            ? inboxUnreadCount
            : item.key === "outbox" && outboxUnreadCount > 0
              ? outboxUnreadCount
              : item.key === "chat" && chatUnreadCount > 0
                ? chatUnreadCount
                : null;
        const isRowActive =
          item.key === "mine_square"
            ? activeTab === "mine_square"
            : activeTab === item.key;
        const subtitle =
          item.key === "mine_square"
            ? (item.getSubtitle as (sq: number) => string)(squarePostsCount)
            : (item.getSubtitle as () => string)();
        return (
          <button
            key={item.key}
            type="button"
            className={cn("ys-mine-menu-row", isRowActive && "ys-mine-menu-row--active")}
            onClick={() => onNavigate(item.key as AppTab)}
            aria-current={isRowActive ? "page" : undefined}
          >
            <span className={cn("ys-mine-menu-icon", item.iconClass)}>
              <Icon className="h-4 w-4 text-white" strokeWidth={2.6} aria-hidden />
            </span>
            <span className="ys-mine-menu-texts">
              <span
                className={cn("ys-mine-menu-title", layout === "desktop" && "ys-mine-menu-title--compact")}
              >
                {item.title}
              </span>
              <span
                className={cn(
                  "ys-mine-menu-subtitle",
                  layout === "desktop" && "ys-mine-menu-subtitle--compact",
                )}
              >
                {subtitle}
              </span>
            </span>
            {count !== null ? <span className="ys-mine-menu-count">{count}</span> : null}
            {layout === "inShell" ? (
              <ChevronRight
                className="h-[18px] w-[18px] text-slate-400"
                strokeWidth={2.5}
                aria-hidden
              />
            ) : null}
            {layout === "inShell" && index < menuItemDefs.length - 1 ? (
              <span className="ys-mine-menu-divider" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
