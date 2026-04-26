import { Bookmark } from "lucide-react";
import { cn } from "../../../lib/utils";
import { GenderIcon } from "./PickerControls";

type FavoritesMainSectionProps = {
  selectedUnifiedFavorite: any;
  onUnfavoriteSquare: (sourceMessageId: string) => Promise<void> | void;
  onUnfavoriteCapsuleById: (capsuleId: string) => Promise<void> | void;
  onJumpToChatFromCapsule: (capsuleId: string) => void;
  onViewSquarePost: (sourceMessageId: string) => void;
};

export function FavoritesMainSection({
  selectedUnifiedFavorite,
  onUnfavoriteSquare,
  onUnfavoriteCapsuleById,
  onJumpToChatFromCapsule,
  onViewSquarePost,
}: FavoritesMainSectionProps) {
  if (!selectedUnifiedFavorite) {
    return (
      <div className="max-w-sm mx-auto text-center py-24">
        <Bookmark className="w-12 h-12 mx-auto text-black/10 mb-3" />
        <p className="text-[15px] font-medium text-black/45">從左側選一則心底藏著的</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl w-full mx-auto space-y-6 pb-20">
      <div className="relative rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-6 shadow-[8px_8px_0_0_#0f2420]">
        <div className="flex items-center justify-between mb-4">
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full border-2 border-stone-900 text-[10px] font-black",
              selectedUnifiedFavorite.kind === "square"
                ? "bg-violet-100 text-violet-800"
                : "bg-blue-100 text-blue-800",
            )}
          >
            {selectedUnifiedFavorite.kind === "square" ? "#來自廣場" : "#秘密膠囊"}
          </span>
          <GenderIcon gender={selectedUnifiedFavorite.row.snapshotPublisherGender} />
        </div>

        <p className="text-[18px] md:text-[20px] font-bold leading-relaxed text-stone-900 whitespace-pre-wrap">
          {selectedUnifiedFavorite.row.snapshotContent}
        </p>

        <div className="mt-6 pt-4 border-t border-dashed border-stone-200 flex justify-between items-center">
          <p className="text-[11px] font-bold text-stone-400">
            存入日期：
            {new Date(
              Number(selectedUnifiedFavorite.createdAtMicros / 1000n),
            ).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() =>
            void (selectedUnifiedFavorite.kind === "square"
              ? onUnfavoriteSquare(selectedUnifiedFavorite.row.postSourceMessageId)
              : onUnfavoriteCapsuleById(selectedUnifiedFavorite.row.capsuleId))
          }
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-stone-900 bg-white font-black text-stone-900 shadow-[4px_4px_0_0_#000] active:translate-y-px"
        >
          從心底拿出
        </button>

        {selectedUnifiedFavorite.kind === "capsule" && (
          <button
            onClick={() => onJumpToChatFromCapsule(selectedUnifiedFavorite.row.capsuleId)}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-stone-900 bg-[#f4dc3a] font-black text-stone-900 shadow-[4px_4px_0_0_#000] active:translate-y-px"
          >
            發起聊聊
          </button>
        )}

        {selectedUnifiedFavorite.kind === "square" && (
          <button
            onClick={() => onViewSquarePost(selectedUnifiedFavorite.row.postSourceMessageId)}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-stone-900 bg-violet-100 font-black text-violet-800 shadow-[4px_4px_0_0_#000] active:translate-y-px"
          >
            查看原貼互動
          </button>
        )}
      </div>
    </div>
  );
}
