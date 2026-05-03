import { ChevronRight, Heart, Home, Inbox, LayoutGrid, MessageCircle, Send,AlertTriangle } from "lucide-react";
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
  "my_reports",
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
      sq > 0 ? `共 ${sq} 則 · 小紙條列表` : "公開小紙條",
    iconClass: "ys-mine-menu-icon--lilac",
    icon: LayoutGrid,
  },
  {
    key: "inbox" as const,
    title: "飄向我的",
    getSubtitle: () => "收到的小紙條",
    iconClass: "ys-mine-menu-icon--blue",
    icon: Inbox,
  },
  {
    key: "outbox" as const,
    title: "我丟出的",
    getSubtitle: () => "送出的小紙條",
    iconClass: "ys-mine-menu-icon--amber",
    icon: Send,
  },
  {
    key: "chat" as const,
    title: "聊聊記錄",
    getSubtitle: () => "你的對話都在這裏",
    iconClass: "ys-mine-menu-icon--green",
    icon: MessageCircle,
  },
  {
    key: "space" as const,
    title: "我的空間",
    getSubtitle: () => "你發佈的内容都在這裏",
    iconClass: "ys-mine-menu-icon--violet",
    icon: Home,
  },
  {
    key: "favorites" as const,
    title: "藏心底",
    getSubtitle: () => "偷偷收著的小紙條",
    iconClass: "ys-mine-menu-icon--pink",
    icon: Heart,
  },
  {
    key: "my_reports" as const,
    title: "我的舉報",
    // 這裡可以根據傳入的數量顯示副標題
    getSubtitle: (count?: number) =>
      count && count > 0 ? `共 ${count} 則 · 審核進度` : "查看舉報審核結果",
    iconClass: "ys-mine-menu-icon--rose", // 建議用天空藍或是紅色系
    icon: AlertTriangle, // 建議使用 AlertTriangle 或 MessagesSquare，記得從 lucide-react 導入
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
  const squareItem = menuItemDefs.find((x) => x.key === "mine_square")!;
  const spaceItem = menuItemDefs.find((x) => x.key === "space")!;
  const remainingItems =
    layout === "inShell"
      ? menuItemDefs.filter((x) => x.key !== "mine_square" && x.key !== "space")
      : menuItemDefs;

  if (layout === "inShell") {
    return (
      <>
        <div className="mb-2.5 flex items-stretch gap-2">
          <button
            type="button"
            className={cn(
              "ys-tap-list-row flex min-h-[4rem] flex-[2] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
              activeTab === "mine_square"
                ? "border-violet-400/35 bg-[#FFD54F]/10 ring-1 ring-inset ring-violet-400/30"
                : "border-white/10 bg-[#1A1B22]/95 hover:border-white/16",
            )}
            onClick={() => onNavigate("mine_square")}
            aria-current={activeTab === "mine_square" ? "page" : undefined}
          >
            <span className={cn("ys-mine-menu-icon", squareItem.iconClass)}>
              <LayoutGrid className="h-4 w-4 text-white" strokeWidth={2.6} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[18px] font-semibold leading-tight text-white">
                {squareItem.title}
              </span>
              <span className="mt-0.5 block truncate text-[12px] font-normal text-[#8E8E93]">
                {(squareItem.getSubtitle as (sq: number) => string)(squarePostsCount)}
              </span>
            </span>
          </button>

          <button
            type="button"
            className={cn(
              "ys-tap-list-row flex min-h-[4rem] flex-1 items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition-colors",
              activeTab === "space"
                ? "border-violet-400/35 bg-[#FFD54F]/10 ring-1 ring-inset ring-violet-400/30"
                : "border-white/10 bg-[#1A1B22]/95 hover:border-white/16",
            )}
            onClick={() => onNavigate("space")}
            aria-current={activeTab === "space" ? "page" : undefined}
            title={spaceItem.title}
          >
            <span className={cn("ys-mine-menu-icon", spaceItem.iconClass)}>
              <Home className="h-4 w-4 text-white" strokeWidth={2.6} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold leading-tight text-white">
                {spaceItem.title}
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-normal text-[#8E8E93]">
                {spaceItem.getSubtitle()}
              </span>
            </span>
            <ChevronRight
              className="h-[16px] w-[16px] shrink-0 text-slate-400"
              strokeWidth={2.5}
              aria-hidden
            />
          </button>
        </div>

        <div className="ys-mine-menu-shell">
          {remainingItems.map((item, index) => {
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
                  <span className={cn("ys-mine-menu-title")}>{item.title}</span>
                  <span className={cn("ys-mine-menu-subtitle")}>{subtitle}</span>
                </span>
                {count !== null ? <span className="ys-mine-menu-count">{count}</span> : null}
                <ChevronRight
                  className="h-[18px] w-[18px] text-slate-400"
                  strokeWidth={2.5}
                  aria-hidden
                />
                {index < remainingItems.length - 1 ? (
                  <span className="ys-mine-menu-divider" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <div className="ys-mine-menu-desktop-rail">
      {remainingItems.map((item, index) => {
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
            {index < remainingItems.length - 1 ? <span className="ys-mine-menu-divider" aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}
