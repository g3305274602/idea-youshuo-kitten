import type { AppTab } from "../types";

type MobileDetailContext = {
  activeTab: AppTab;
  squareSelectedPostId: string | null;
  favoriteSelectedId: string | null;
  selectedChatThreadKey: string | null;
  selectedMessageId: string | null;
  selectedAdminReportId: string | null;
  adminMobileShowContent: boolean;
};

const MOBILE_BACK_BUTTON_TABS: AppTab[] = [
  "inbox",
  "outbox",
  "favorites",
  "chat",
  "space",
  "my_reports",
  "mine_square",
];

const MINE_SUB_TABS: AppTab[] = [
  "inbox",
  "outbox",
  "chat",
  "favorites",
  "my_reports",
  "mine_square",
];

export function isAdminTab(activeTab: AppTab): boolean {
  return activeTab === "admin" || activeTab === "admin_ops";
}

export function isMineSubTab(activeTab: AppTab): boolean {
  return MINE_SUB_TABS.includes(activeTab);
}

export function canShowMobileBackButton(
  activeTab: AppTab,
  isMobileDetailView: boolean,
): boolean {
  return isMobileDetailView || MOBILE_BACK_BUTTON_TABS.includes(activeTab);
}

export function computeIsMobileDetailView({
  activeTab,
  squareSelectedPostId,
  favoriteSelectedId,
  selectedChatThreadKey,
  selectedMessageId,
  selectedAdminReportId,
  adminMobileShowContent,
}: MobileDetailContext): boolean {
  return (
    // 1. 撰寫模式始終是詳情
    activeTab === "new" ||
    activeTab === "direct" ||
    // 2. 空間頁面始終是詳情
    activeTab === "space" ||
    // 3. 只有當「選中了具體內容」時，才是詳情視圖
    (activeTab === "secret" && squareSelectedPostId !== null) ||
    (activeTab === "mine_square" && squareSelectedPostId !== null) ||
    (activeTab === "favorites" && favoriteSelectedId !== null) ||
    (activeTab === "chat" && selectedChatThreadKey !== null) ||
    (activeTab === "inbox" && selectedMessageId !== null) || // 只有選了信才是詳情
    (activeTab === "outbox" && selectedMessageId !== null) || // 只有選了信才是詳情
    (activeTab === "my_reports" && selectedAdminReportId !== null) ||
    (isAdminTab(activeTab) && adminMobileShowContent)
  );
}
