import { Bookmark } from "lucide-react";

import { cn } from "../../../lib/utils";
import { anonPaperNoteLabel, squareAddressSubtitle } from "../helpers";
import type { UnifiedFavoriteListItem } from "../types";
import { GenderIcon } from "./PickerControls";

type FavoritesSidebarSectionProps = {
  items: readonly UnifiedFavoriteListItem[];
  selectedId: string | null;
  capsuleTypeMeta: (capsuleType: number) => { chipClass: string; label: string };
  onSelect: (key: string) => void;
};

export function FavoritesSidebarSection({
  items,
  selectedId,
  capsuleTypeMeta,
  onSelect,
}: FavoritesSidebarSectionProps) {
  if (items.length === 0) {
    return (
      <div className="py-8 px-4 text-center">
        <Bookmark className="mx-auto mb-3 h-9 w-9 text-white/15 md:text-white/15" />
        <p className="text-[13px] font-medium text-white/50 md:text-white/50">
          心底還空空的，去秘密那裡藏幾則吧
        </p>
      </div>
    );
  }

  return items.map((item) => {
    const unlocked = item.peerIdentityUnlocked;

    if (item.kind === "capsule") {
      const f = item.row;
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          className={cn(
            "ys-tap-list-row w-full text-left rounded-xl border px-3 py-2.5 transition-all",
            "border-white/10 bg-[#1A1B22]/95 shadow-sm",
            selectedId === item.key
              ? "ring-2 ring-amber-400/35 border-amber-300/20"
              : "hover:border-white/16",
          )}
        >
          <p className="line-clamp-2 text-[13px] font-medium leading-snug text-white/95">
            {f.snapshotContent.length > 120
              ? `${f.snapshotContent.slice(0, 120)}…`
              : f.snapshotContent}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold",
                capsuleTypeMeta(f.snapshotCapsuleType).chipClass,
              )}
            >
              #{capsuleTypeMeta(f.snapshotCapsuleType).label}
            </span>
            <span className="min-w-0 text-[10px] font-semibold text-[#8E8E93]">
              {unlocked ? f.snapshotAuthorEmail : anonPaperNoteLabel(f.snapshotPublisherGender)}
            </span>
            <GenderIcon gender={f.snapshotPublisherGender} />
          </div>
        </button>
      );
    }

    const f = item.row;
    const line = squareAddressSubtitle(
      f.snapshotShowSender,
      f.snapshotShowRecipient,
      f.snapshotSenderEmail,
      f.snapshotRecipientEmail,
    );
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => onSelect(item.key)}
        className={cn(
          "ys-tap-list-row w-full text-left rounded-xl border px-3 py-2.5 transition-all",
          "border-white/10 bg-[#1A1B22]/95 shadow-sm",
          selectedId === item.key
            ? "ring-2 ring-amber-400/35 border-amber-300/20"
            : "hover:border-white/16",
        )}
      >
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-white/95">
          {f.snapshotContent.length > 120
            ? `${f.snapshotContent.slice(0, 120)}…`
            : f.snapshotContent}
        </p>
        {unlocked && line ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <p className="min-w-0 break-words text-[11px] font-bold text-white/80">
              {line}
            </p>
            <GenderIcon gender={f.snapshotPublisherGender} />
          </div>
        ) : (
          <div className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold text-[#8E8E93]">
            <span>來自廣場</span>
            <span className="text-white/50">·</span>
            <span className="min-w-0 text-white/75">
              {anonPaperNoteLabel(f.snapshotPublisherGender)}
            </span>
            <GenderIcon gender={f.snapshotPublisherGender} />
          </div>
        )}
      </button>
    );
  });
}
