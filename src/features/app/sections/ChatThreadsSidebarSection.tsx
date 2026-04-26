import { MessageCircle } from "lucide-react";

import { cn } from "../../../lib/utils";
import { GenderIcon } from "./PickerControls";

type ChatThreadItem = {
  key: string;
  sourceCapsuleType: number;
  counterpartLabel: string;
  counterpartGender?: string;
  sourcePreview: string;
  lastBody: string;
};

type CapsuleTypeMetaResult = { chipClass: string; label: string };

type ChatThreadsSidebarSectionProps = {
  threads: readonly ChatThreadItem[];
  selectedKey: string | null;
  capsuleTypeMeta: (capsuleType: number) => CapsuleTypeMetaResult;
  onSelect: (key: string) => void;
};

export function ChatThreadsSidebarSection({
  threads,
  selectedKey,
  capsuleTypeMeta,
  onSelect,
}: ChatThreadsSidebarSectionProps) {
  if (threads.length === 0) {
    return (
      <div className="py-8 px-4 text-center">
        <MessageCircle className="mx-auto mb-3 h-9 w-9 text-white/15 md:text-black/[0.08]" />
        <p className="text-[13px] font-medium text-white/50 md:text-black/30">
          還沒有聊聊紀錄，先去秘密膠囊按「聊聊」開一條線
        </p>
      </div>
    );
  }

  return threads.map((t) => (
    <button
      key={t.key}
      type="button"
      onClick={() => onSelect(t.key)}
      className={cn(
        "w-full text-left rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-sm transition-all",
        selectedKey === t.key
          ? "ring-2 ring-violet-400/40 border-violet-300/40"
          : "hover:border-black/[0.12]",
      )}
    >
      <span
        className={cn(
          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
          capsuleTypeMeta(t.sourceCapsuleType).chipClass,
        )}
      >
        #{capsuleTypeMeta(t.sourceCapsuleType).label}
      </span>
      <div className="flex items-center gap-1.5">
        <p className="text-[13px] font-semibold text-apple-near-black truncate">
          {t.counterpartLabel}
        </p>
        <GenderIcon gender={t.counterpartGender} />
      </div>
      <p className="mt-0.5 text-[10px] text-black/45 truncate">主文：{t.sourcePreview}</p>
      <p className="mt-1 text-[12px] text-black/70 truncate">{t.lastBody}</p>
    </button>
  ));
}
