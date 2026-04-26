import { ChevronRight, LayoutGrid, MessageCircle } from "lucide-react";

type SecretTabFooterBarProps = {
  chatUnreadCount: number;
  onGotoSquare: () => void;
  onGotoChat: () => void;
  className?: string;
};

/** 秘密分頁底列：廣場（跳轉）＋聊聊 */
export function SecretTabFooterBar({
  chatUnreadCount,
  onGotoSquare,
  onGotoChat,
  className = "",
}: SecretTabFooterBarProps) {
  return (
    <div
      className={`grid w-full grid-cols-1 gap-2 sm:grid-cols-2 ${className}`.trim()}
    >
      <button
        type="button"
        onClick={onGotoSquare}
        className="glass-effect flex w-full min-h-[3.5rem] items-center gap-2 rounded-[24px] border border-white/10 p-3 text-left transition-colors hover:bg-white/[0.07] active:scale-[0.99]"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-violet-400/20 to-white/5 text-white">
          <LayoutGrid className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black text-white">廣場牆</p>
          <p className="text-[10px] font-bold text-white/50">前往小紙條列表</p>
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-white/45"
          strokeWidth={2.4}
          aria-hidden
        />
      </button>
      <button
        type="button"
        onClick={onGotoChat}
        className="glass-effect flex w-full min-h-[3.5rem] items-center gap-2 rounded-[24px] border border-white/10 p-3 text-left transition-colors hover:bg-white/[0.07] active:scale-[0.99]"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-emerald-400/25 to-white/5 text-white">
          <MessageCircle
            className="h-4 w-4"
            strokeWidth={2.25}
            aria-hidden
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black text-white">聊聊</p>
          <p className="text-[10px] font-bold text-white/50">
            {chatUnreadCount > 0
              ? `有 ${chatUnreadCount} 條聊聊線有新訊息未讀`
              : "尚無未讀新訊息，點此開啟聊聊"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {chatUnreadCount > 0 ? (
            <span
              className="ys-unread-pill"
              aria-label={`${chatUnreadCount} 條有未讀新訊息`}
            >
              {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
            </span>
          ) : null}
          <ChevronRight
            className="h-4 w-4 text-white/45"
            strokeWidth={2.4}
            aria-hidden
          />
        </div>
      </button>
    </div>
  );
}
