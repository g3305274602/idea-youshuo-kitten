import { Coins, Edit3, Settings, Star } from "lucide-react";
import type { AppTab, User as AppUser } from "../types";
import { MineHubMenuNav } from "./MineHubMenuNav";

type MineSidebarSectionProps = {
  activeTab: AppTab;
  user: AppUser | null;
  /** 可用積分；未傳入時仍顯示圖示（後端接上後再傳數字） */
  availablePoints?: number;
  avatarImageUrl?: string;
  dailyRewardStatus?: "claimable" | "claimed" | "expired" | "hidden";
  dailyRewardLoading?: boolean;
  onClaimDailyReward?: () => void;
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
  availablePoints,
  avatarImageUrl,
  dailyRewardStatus = "hidden",
  dailyRewardLoading = false,
  onClaimDailyReward,
}: MineSidebarSectionProps) {
  const displayName = user?.displayName?.trim() || "未命名用戶";
  const shuoshuo = user?.profileNote?.trim() ?? "";
  const pointsAria =
    typeof availablePoints === "number"
      ? `可用積分，目前 ${availablePoints}`
      : "可用積分";

  return (
    <section className="ys-mine-page">
      <div className="ys-mine-profile-card">
        <div className="ys-mine-profile-card-row">
          <button type="button" onClick={onOpenActions} className="ys-mine-profile-hitbox" aria-label="開啟個人設定">
            <span className="ys-mine-avatar-slot" aria-hidden>
              {avatarImageUrl ? (
                <img
                  src={avatarImageUrl}
                  alt=""
                  className="h-full w-full rounded-[24px] object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
            </span>
            <div className="ys-mine-profile-main">
              <div className="ys-mine-name-row">
                <p className="ys-mine-name">{displayName}</p>
                
              </div>
              <div className="ys-mine-level-row">
                <div className="ys-mine-level-chip">
                  <Star className="h-2.5 w-2.5" strokeWidth={2.6} aria-hidden />
                  <span>Lv.12</span>
                </div>
                <span className="ys-mine-points-chip" role="img" aria-label={pointsAria}>
                  <Coins className="h-3 w-3" strokeWidth={2.2} aria-hidden />
                  <span>{typeof availablePoints === "number" ? availablePoints : 0}</span>
                </span>
                {dailyRewardStatus !== "hidden" ? (
                  <button
                    type="button"
                    onClick={onClaimDailyReward}
                    disabled={
                      dailyRewardLoading ||
                      dailyRewardStatus === "claimed" ||
                      dailyRewardStatus === "expired"
                    }
                    className="ys-mine-claim-chip"
                  >
                    {dailyRewardLoading
                      ? "領取中..."
                      : dailyRewardStatus === "claimable"
                        ? "領取今日 188"
                        : dailyRewardStatus === "claimed"
                          ? "今日已領取"
                          : "新手獎勵結束"}
                  </button>
                ) : null}
              </div>
              <div className="ys-mine-shuoshuo-row">
                <span className="ys-mine-shuoshuo-label">說說</span>
                {shuoshuo ? (
                  <span className="min-w-0 truncate text-white/80">{shuoshuo}</span>
                ) : (
                  <span className="min-w-0 truncate text-white/35">尚無說說</span>
                )}
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={onOpenActions}
            className="ys-mine-profile-gear"
            aria-label="個人設定"
          >
            <Settings className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </div>
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
