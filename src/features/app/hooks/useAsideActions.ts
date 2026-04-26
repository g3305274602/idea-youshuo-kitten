import type React from "react";

import type { BackTab } from "../appUiStore";
import type { AppTab, OpenedBroadcastItem } from "../types";

type SetStateAction<T> = T | ((prev: T) => T);

type UseAsideActionsParams = {
  activeTab: AppTab;
  spaceBackTab: BackTab;
  chatBackTab: BackTab;
  setActiveTab: (value: AppTab) => void;
  setSpaceBackTab: (value: SetStateAction<BackTab>) => void;
  setChatBackTab: (value: SetStateAction<BackTab>) => void;
  setSelectedMessageId: (value: string | null) => void;
  setSquareSelectedPostId: (value: string | null) => void;
  setFavoriteSelectedId: (value: string | null) => void;
  setSelectedChatThreadKey: (value: string | null) => void;
  setSelectedAdminReportId: (value: string | null) => void;
  setOpenedBroadcastItems: (
    value:
      | OpenedBroadcastItem[]
      | ((prev: OpenedBroadcastItem[]) => OpenedBroadcastItem[]),
  ) => void;
};

export function useAsideActions(params: UseAsideActionsParams) {
  const onAsideBackToMine = () => {
    if (
      params.activeTab === "space" &&
      params.spaceBackTab &&
      params.spaceBackTab !== "mine"
    ) {
      params.setActiveTab(params.spaceBackTab);
      params.setSpaceBackTab(null);
      return;
    }
    if (
      params.activeTab === "chat" &&
      params.chatBackTab &&
      params.chatBackTab !== "mine"
    ) {
      params.setActiveTab(params.chatBackTab);
      params.setChatBackTab(null);
      return;
    }
    params.setActiveTab("mine");
    params.setSelectedMessageId(null);
    params.setSquareSelectedPostId(null);
    params.setFavoriteSelectedId(null);
    params.setSelectedChatThreadKey(null);
    params.setSelectedAdminReportId(null);
  };

  const clearBroadcastByScope = (scope: "inbox" | "outbox") => {
    params.setOpenedBroadcastItems((prev) => prev.filter((x) => x.scope !== scope));
  };

  const refreshAllBroadcast = () => {
    params.setOpenedBroadcastItems([]);
  };

  const openBroadcastMessage = (id: string) => {
    params.setSelectedMessageId(id);
  };

  const onBroadcastKeyDown = (
    ev: React.KeyboardEvent<HTMLElement>,
    id: string,
  ) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      params.setSelectedMessageId(id);
    }
  };

  const dismissBroadcastItem = (id: string) => {
    params.setOpenedBroadcastItems((prev) => prev.filter((x) => x.id !== id));
  };

  const onSpacePanelBack = () => {
    params.setActiveTab(params.spaceBackTab || "mine");
    params.setSpaceBackTab(null);
  };

  return {
    onAsideBackToMine,
    clearBroadcastByScope,
    refreshAllBroadcast,
    openBroadcastMessage,
    onBroadcastKeyDown,
    dismissBroadcastItem,
    onSpacePanelBack,
  };
}
