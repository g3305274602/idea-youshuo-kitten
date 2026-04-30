import { MessageCircle } from "lucide-react";

import { cn } from "../../../lib/utils";
import secretfe1 from "../../../assets/icons/feature/secretfe1.png";
import { anonPaperNoteLabel } from "../helpers";
import { GenderIcon } from "./PickerControls";

type ChatThreadItem = {
  key: string;
  counterpartLabel: string;
  counterpartGender?: string;
  threadPrivateMessageCount: number;
  lastBody: string;
  hasUnread?: boolean;
  avatarImageUrl?: string;
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
      <div className="flex h-full min-h-[46vh] items-center justify-center px-4 py-8 text-center">
        <div>
          <MessageCircle className="mx-auto mb-3 h-9 w-9 text-white/15" />
          <p className="text-[13px] font-medium text-white/50">
            還沒有聊聊紀錄，先去秘密膠囊按「聊聊」開一條線
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 px-0.5 pb-3">
      {threads.map((t) => {
        const n = t.threadPrivateMessageCount;
        const peerUnlocked = n >= 10;
        const rowTitle = peerUnlocked
          ? t.counterpartLabel
          : anonPaperNoteLabel(t.counterpartGender);
        const rightText =
          n <= 9 ? `${n}則訊息` : `${n}則`;
        const previewText = t.lastBody?.trim() || "（尚無內容）";
        const avatarSrc = peerUnlocked ? t.avatarImageUrl || "" : secretfe1;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onSelect(t.key)}
            className={cn(
              "ys-tap-list-row flex w-full items-center text-left rounded-xl border px-3 py-2.5 shadow-sm transition-all",
              "border-white/10 bg-[#1A1B22]/95",
              selectedKey === t.key
                ? "ring-2 ring-inset ring-violet-400/50 border-violet-400/30"
                : "hover:border-white/16",
            )}
          >
            <div className="flex min-w-0 w-full items-start gap-2.5">
              <div className="mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/12 bg-white/[0.05]">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-1.5">
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
                  <p className="shrink-0 text-right text-[11px] tabular-nums text-[#8E8E93]">
                    {rightText}
                  </p>
                </div>
                <p className="mt-1 truncate text-[12px] leading-tight text-white/70">
                  {previewText}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
