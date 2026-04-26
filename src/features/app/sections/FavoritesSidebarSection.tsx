import { Bookmark } from "lucide-react";

import { cn } from "../../../lib/utils";
import { squareAddressSubtitle } from "../helpers";
import { GenderIcon } from "./PickerControls";

type FavoriteItem = {
  kind: "square" | "capsule";
  key: string;
  row: any;
};

type FavoritesSidebarSectionProps = {
  items: readonly FavoriteItem[];
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
        <Bookmark className="mx-auto mb-3 h-9 w-9 text-white/15 md:text-black/[0.08]" />
        <p className="text-[13px] font-medium text-white/50 md:text-black/30">
          心底還空空的，去秘密那裡藏幾則吧
        </p>
      </div>
    );
  }

  return items.map((item) => (
    <button
      key={item.key}
      type="button"
      onClick={() => onSelect(item.key)}
      className={cn(
        "w-full text-left rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-sm transition-all",
        selectedId === item.key
          ? "ring-2 ring-amber-400/40 border-amber-300/40"
          : "hover:border-black/[0.12]",
      )}
    >
      <p className="text-[13px] font-medium text-apple-near-black line-clamp-2 leading-snug">
        {item.row.snapshotContent.length > 120
          ? `${item.row.snapshotContent.slice(0, 120)}…`
          : item.row.snapshotContent}
      </p>
      {item.kind === "square" ? (
        (() => {
          const f = item.row;
          const line = squareAddressSubtitle(
            f.snapshotShowSender,
            f.snapshotShowRecipient,
            f.snapshotSenderEmail,
            f.snapshotRecipientEmail,
          );
          return line ? (
            <div className="flex items-center gap-1.5">
              <p className="break-words text-[14px] font-black text-stone-800">{line}</p>
              <GenderIcon gender={f.snapshotPublisherGender} />
            </div>
          ) : (
            <p className="text-[10px] text-black/35 mt-1">寄件／收件已隱藏</p>
          );
        })()
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black",
              capsuleTypeMeta(item.row.snapshotCapsuleType).chipClass,
            )}
          >
            #{capsuleTypeMeta(item.row.snapshotCapsuleType).label}
          </span>
          <p className="text-[10px] text-black/40 truncate">
            {item.row.snapshotAuthorEmail || "匿名"}
          </p>
          <GenderIcon gender={item.row.snapshotPublisherGender} />
        </div>
      )}
    </button>
  ));
}
