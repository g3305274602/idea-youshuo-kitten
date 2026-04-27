import { isMineSubTab } from "../shell/navigation";
import type { BackTab } from "../appUiStore";
import type { AdminSection, AppTab } from "../types";

type SetStateAction<T> = T | ((prev: T) => T);

type UseNavigationActionsParams = {
  activeTab: AppTab;
  selectedMessageId: string | null;
  squareSelectedPostId: string | null;
  favoriteSelectedId: string | null;
  selectedChatThreadKey: string | null;
  selectedAdminReportId: string | null;
  adminMobileShowContent: boolean;
  chatBackTab: BackTab;
  spaceBackTab: BackTab;
  isSuperAdmin: boolean;
  setActiveTab: (value: AppTab) => void;
  setSelectedMessageId: (value: string | null) => void;
  setSquareSelectedPostId: (value: string | null) => void;
  setFavoriteSelectedId: (value: string | null) => void;
  setSelectedChatThreadKey: (value: string | null) => void;
  setSelectedAdminReportId: (value: string | null) => void;
  setAdminMobileShowContent: (value: boolean) => void;
  setChatBackTab: (value: SetStateAction<BackTab>) => void;
  setSpaceBackTab: (value: SetStateAction<BackTab>) => void;
  setSquareActionError: (value: string) => void;
  setComposeMode: (value: "capsule" | "direct") => void;
  setComposeError: (value: string) => void;
  setComposeSuccess: (value: string) => void;
  setProfileActionMenuOpen: (value: boolean) => void;
  setAdminSection: (value: AdminSection) => void;
  bootstrapAdminSelf: () => Promise<void>;
  setSpaceOwnerHex: (value: string) => void;
  identityHex: string;
};

export function useNavigationActions(params: UseNavigationActionsParams) {
  const clearSelections = () => {
    params.setSelectedMessageId(null);
    params.setSquareSelectedPostId(null);
    params.setFavoriteSelectedId(null);
  };

  const onAdminModeBack = () => {
    if (params.selectedAdminReportId !== null) {
      params.setSelectedAdminReportId(null);
    } else if (params.adminMobileShowContent) {
      params.setAdminMobileShowContent(false);
    } else {
      params.setActiveTab("mine");
    }
  };

  const onMobileBack = () => {
    if (params.selectedMessageId !== null) return params.setSelectedMessageId(null);
    if (params.squareSelectedPostId !== null) return params.setSquareSelectedPostId(null);
    if (params.favoriteSelectedId !== null) return params.setFavoriteSelectedId(null);
    if (params.selectedChatThreadKey !== null) return params.setSelectedChatThreadKey(null);
    if (params.activeTab === "space") {
      params.setActiveTab(params.spaceBackTab || "mine");
      return params.setSpaceBackTab(null);
    }
    /** 聊聊列表層：若有記錄來源分頁（如秘密首頁），先回到該頁，不要一律回「我的」 */
    if (
      params.activeTab === "chat" &&
      params.selectedChatThreadKey === null &&
      params.chatBackTab
    ) {
      params.setActiveTab(params.chatBackTab);
      params.setChatBackTab(null);
      return;
    }
    /** 廣場牆列表層：若是從秘密頁跳轉進來，返回時先回秘密頁 */
    if (
      params.activeTab === "mine_square" &&
      params.squareSelectedPostId === null &&
      params.chatBackTab
    ) {
      params.setActiveTab(params.chatBackTab);
      params.setChatBackTab(null);
      return;
    }
    if (isMineSubTab(params.activeTab)) return params.setActiveTab("mine");
    if (params.activeTab === "new" || params.activeTab === "direct") {
      return params.setActiveTab("secret");
    }
    clearSelections();
    params.setActiveTab("mine");
    params.setChatBackTab(null);
  };

  const onSecretTab = () => {
    params.setActiveTab("secret");
    clearSelections();
    params.setSquareActionError("");
  };

  const onComposeTab = () => {
    params.setActiveTab("new");
    params.setComposeMode("capsule");
    clearSelections();
    params.setComposeError("");
    params.setComposeSuccess("");
  };

  const onMineTab = () => {
    params.setActiveTab("mine");
    clearSelections();
    params.setSelectedChatThreadKey(null);
    params.setSelectedAdminReportId(null);
    params.setSquareActionError("");
  };

  const onBootstrapAdminSelf = async () => {
    params.setProfileActionMenuOpen(false);
    await params.bootstrapAdminSelf();
  };

  const onEnterAdmin = () => {
    params.setProfileActionMenuOpen(false);
    params.setActiveTab(params.isSuperAdmin ? "admin_ops" : "admin");
    params.setAdminSection("main");
  };

  const onMineHubNavigate = (t: AppTab) => {
    const keepBackToSecret = t === "mine_square" && params.activeTab === "secret";
    if (keepBackToSecret) {
      params.setChatBackTab("secret");
    }
    params.setActiveTab(t === "admin" && params.isSuperAdmin ? "admin_ops" : t);
    if (t === "space") params.setSpaceOwnerHex(params.identityHex);
    clearSelections();
    params.setSelectedChatThreadKey(null);
    params.setSelectedAdminReportId(null);
    if (!keepBackToSecret) params.setChatBackTab(null);
  };

  return {
    onAdminModeBack,
    onMobileBack,
    onSecretTab,
    onComposeTab,
    onMineTab,
    onBootstrapAdminSelf,
    onEnterAdmin,
    onMineHubNavigate,
  };
}
