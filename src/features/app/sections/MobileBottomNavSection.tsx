import { PenTool, User } from "lucide-react";
import type { AppTab } from "../types";

type MobileBottomNavSectionProps = {
  activeTab: AppTab;
  onGoSecret: () => void;
  onGoCompose: () => void;
  onGoMine: () => void;
};

export function MobileBottomNavSection({
  activeTab,
  onGoSecret,
  onGoCompose,
  onGoMine,
}: MobileBottomNavSectionProps) {
  const isComposeActive = activeTab === "new" || activeTab === "direct";
  const isMineActive =
    activeTab === "mine" ||
    activeTab === "inbox" ||
    activeTab === "outbox" ||
    activeTab === "favorites" ||
    activeTab === "space" ||
    activeTab === "admin" ||
    activeTab === "admin_ops" ||
    activeTab === "chat";

  return (
    <div className="ys-mobile-bottom-nav md:hidden">
      <button
        type="button"
        aria-label="撰寫"
        onClick={onGoCompose}
        className={`ys-mobile-tab ${isComposeActive ? "is-active" : ""}`}
      >
        <PenTool className="h-6 w-6" strokeWidth={2.35} aria-hidden />
        <span className="ys-mobile-tab-label">撰寫</span>
      </button>

      <div className="ys-mobile-capsule-wrap">
        <button
          type="button"
          aria-label="抽取膠囊"
          onClick={onGoSecret}
          className="ys-mobile-capsule-button"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7 rotate-[35deg]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <defs>
              <linearGradient id="capsuleTop" x1="6" y1="9" x2="12" y2="14" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFFDF3" />
                <stop offset="1" stopColor="#FFE99E" />
              </linearGradient>
              <linearGradient id="capsuleBottom" x1="12" y1="10" x2="18" y2="15" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F4C638" />
                <stop offset="1" stopColor="#D59A16" />
              </linearGradient>
            </defs>
            <rect x="4.5" y="8.5" width="15" height="7" rx="3.5" fill="#8B6614" fillOpacity="0.18" />
            <path d="M8 9a3 3 0 0 0 0 6h4V9H8Z" fill="url(#capsuleTop)" />
            <path d="M12 9v6h4a3 3 0 1 0 0-6h-4Z" fill="url(#capsuleBottom)" />
            <rect x="8" y="9" width="8" height="6" rx="3" stroke="#7B5A14" strokeWidth="1.6" />
            <path d="M12 9.2v5.6" stroke="#7B5A14" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M8.5 10.1c.6-.55 1.25-.8 1.95-.75" stroke="white" strokeOpacity="0.85" strokeWidth="0.95" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        aria-label="我的"
        onClick={onGoMine}
        className={`ys-mobile-tab ${isMineActive ? "is-active" : ""}`}
      >
        <User className="h-6 w-6" strokeWidth={2.35} aria-hidden />
        <span className="ys-mobile-tab-label">我的</span>
      </button>
    </div>
  );
}
