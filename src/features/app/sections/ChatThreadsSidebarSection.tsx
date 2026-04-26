import { MessageCircle } from "lucide-react";

import { cn } from "../../../lib/utils";
import { anonPaperNoteLabel } from "../helpers";
import { GenderIcon } from "./PickerControls";

type ChatThreadItem = {
  key: string;
  counterpartLabel: string;
  counterpartGender?: string;
  threadPrivateMessageCount: number;
  lastBody: string;
  hasUnread?: boolean;
};

type ChatThreadsSidebarSectionProps = {
  threads: readonly ChatThreadItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

export function ChatThreadsSidebarSection({
  threads,
  selectedKey,
  onSelect,
}: ChatThreadsSidebarSectionProps) {
  if (threads.length === 0) {
    return (
      <div className="py-8 px-4 text-center">
        <MessageCircle className="mx-auto mb-3 h-9 w-9 text-white/15" />
        <p className="text-[13px] font-medium text-white/50">
          還沒有聊聊紀錄，先去秘密膠囊按「聊聊」開一條線
        </p>
      </div>
    );
  }

  return threads.map((t) => {
    const n = t.threadPrivateMessageCount;
    const peerUnlocked = n >= 10;
    const rowTitle = peerUnlocked
      ? t.counterpartLabel
      : anonPaperNoteLabel(t.counterpartGender);
    const rightText =
      n <= 9 ? `${n}則訊息` : t.lastBody;
    return (
    <button
      key={t.key}
      type="button"
      onClick={() => onSelect(t.key)}
      className={cn(
        "ys-tap-list-row flex w-full items-center text-left rounded-xl border px-3 py-2.5 shadow-sm transition-all",
        "border-white/10 bg-[#1A1B22]/95",
        selectedKey === t.key
          ? "ring-2 ring-violet-400/40 border-violet-400/25"
          : "hover:border-white/16",
      )}
    >
      <div className="flex min-w-0 w-full items-center justify-between gap-2.5">
        <div className="min-w-0 flex flex-1 items-center gap-1.5">
          {peerUnlocked ? <GenderIcon gender={t.counterpartGender} /> : null}
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/95">
            {rowTitle}
          </p>
          {t.hasUnread ? (
            <span
              className="ys-unread-dot"
              title="有新訊息"
              aria-label="有未讀新訊息"
            />
          ) : null}
        </div>
        <p
          className={cn(
            "max-w-[50%] shrink-0 truncate text-right text-[12px] leading-tight",
            n <= 10 ? "text-[#8E8E93] tabular-nums" : "font-medium text-white/80",
          )}
        >
          {rightText}
        </p>
      </div>
    </button>
  );
  });
}
