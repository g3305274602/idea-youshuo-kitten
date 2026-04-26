import { CircleUser, SquarePen } from "lucide-react";

import { cn } from "../../../lib/utils";
import capsuleDrawFabTab from "../../../assets/images/app/secret/capsule-draw-fab2.png";
import type { AppTab } from "../types";

type MobileBottomNavSectionProps = {
  activeTab: AppTab;
  /** 聊聊有未讀時，在「我的」圖示上顯示小紅點 */
  showMineChatUnread: boolean;
  onGoSecret: () => void;
  onGoCompose: () => void;
  onGoMine: () => void;
};

export function MobileBottomNavSection({
  activeTab,
  showMineChatUnread,
  onGoSecret,
  onGoCompose,
  onGoMine,
}: MobileBottomNavSectionProps) {
  const isComposeActive = activeTab === "new" || activeTab === "direct";

  /** 當前在「秘密」分頁時，底欄中央膠囊鈕顯示外光暈 */
  const isSecretTabActive = activeTab === "secret";

  const isMineActive =
    activeTab === "mine" ||
    activeTab === "mine_square" ||
    activeTab === "inbox" ||
    activeTab === "outbox" ||
    activeTab === "favorites" ||
    activeTab === "space" ||
    activeTab === "admin" ||
    activeTab === "admin_ops" ||
    activeTab === "chat";

  return (
    <nav className="ys-mobile-bottom-nav md:hidden" aria-label="主要導覽">
      <div className="ys-mobile-bottom-nav-shelf">
        <div className="ys-mobile-bottom-nav-rail">
          <div className="ys-mobile-bottom-nav-bar">
            <button
              type="button"
              aria-label="撰寫"
              onClick={onGoCompose}
              className={cn(
                "ys-mobile-tab",
                isComposeActive && "is-active",
              )}
            >
              <span
                className={cn(
                  "ys-rail-squ ys-rail-squ--write",
                  isComposeActive ? "ys-rail-squ--on" : "ys-rail-squ--off",
                )}
              >
                <SquarePen
                  className="h-[1.45rem] w-[1.45rem] shrink-0"
                  strokeWidth={isComposeActive ? 2.5 : 2.15}
                  aria-hidden
                />
              </span>
            </button>

            <div className="ys-mobile-bottom-nav-fabSlot">
              <button
                type="button"
                aria-label="抽取膠囊"
                onClick={onGoSecret}
                className={cn(
                  "ys-mobile-capsule-button group",
                  isSecretTabActive && "ys-mobile-capsule-button--on-secret",
                )}
              >
                <span className="inline-flex origin-center transform-gpu transition-transform duration-100 ease-out will-change-transform group-active:scale-95">
                  <img
                    src={capsuleDrawFabTab}
                    alt=""
                    width={256}
                    height={256}
                    className="ys-mobile-capsule-button-img h-9 w-9 shrink-0 select-none object-contain pointer-events-none"
                    decoding="async"
                    draggable={false}
                  />
                </span>
              </button>
            </div>

            <button
              type="button"
              aria-label="我的"
              onClick={onGoMine}
              className={cn("ys-mobile-tab relative", isMineActive && "is-active")}
            >
              <span className="relative inline-flex h-11 w-11">
                <span
                  className={cn(
                    "ys-rail-squ ys-rail-squ--me",
                    isMineActive ? "ys-rail-squ--on" : "ys-rail-squ--off",
                  )}
                >
                  <CircleUser
                    className="h-[1.45rem] w-[1.45rem] shrink-0"
                    strokeWidth={isMineActive ? 2.5 : 2.15}
                    aria-hidden
                  />
                </span>
                {showMineChatUnread ? (
                  <span
                    className="ys-unread-dot pointer-events-none absolute -right-0.5 -top-0.5 z-10"
                    title="有未讀新訊息"
                    aria-hidden
                  />
                ) : null}
              </span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
