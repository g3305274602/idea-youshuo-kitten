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
      <div className="mx-auto max-w-sm py-24 text-center">
        <Bookmark className="mx-auto mb-3 h-12 w-12 text-white/15" />
        <p className="text-[15px] font-medium text-[#8E8E93]">從左側選一則心底藏著的</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 pb-20">
      <div className="cd-card-raised relative rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <span
            className={cn(
              "rounded-full border border-white/12 px-2.5 py-0.5 text-[10px] font-bold",
              selectedUnifiedFavorite.kind === "square"
                ? "bg-[#F06292]/15 text-pink-200"
                : "bg-sky-500/15 text-sky-200",
            )}
          >
            {selectedUnifiedFavorite.kind === "square" ? "#來自廣場" : "#秘密膠囊"}
          </span>
          <GenderIcon gender={selectedUnifiedFavorite.row.snapshotPublisherGender} />
        </div>

        <p className="whitespace-pre-wrap text-[18px] font-medium leading-relaxed text-white md:text-[20px]">
          {selectedUnifiedFavorite.row.snapshotContent}
        </p>

        <div className="mt-6 flex items-center justify-between border-t border-dashed border-white/10 pt-4">
          <p className="text-[11px] font-bold text-[#8E8E93]">
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
          className="cd-btn-ghost flex min-w-[140px] flex-1 items-center justify-center gap-2 py-3"
        >
          從心底拿出
        </button>

        {selectedUnifiedFavorite.kind === "capsule" && (
          <button
            onClick={() => onJumpToChatFromCapsule(selectedUnifiedFavorite.row.capsuleId)}
            className="cd-btn-primary flex min-w-[140px] flex-1 items-center justify-center gap-2 py-3 font-bold"
          >
            發起聊聊
          </button>
        )}

        {selectedUnifiedFavorite.kind === "square" && (
          <button
            onClick={() => onViewSquarePost(selectedUnifiedFavorite.row.postSourceMessageId)}
            className="flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 py-3 text-[14px] font-bold text-violet-200 transition-colors active:translate-y-px"
          >
            查看原貼互動
          </button>
        )}
      </div>
    </div>
  );
}
