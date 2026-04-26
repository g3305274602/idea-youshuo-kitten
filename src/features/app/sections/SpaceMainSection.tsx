import { Package } from "lucide-react";

import { cn } from "../../../lib/utils";
import type { SpaceFeedItem } from "../types";

type CapsuleTypeMeta = {
  chipClass: string;
  label: string;
};

type SpaceMainSectionProps = {
  isOwnSpace: boolean;
  spaceTargetDisplayName?: string;
  spaceFeed: SpaceFeedItem[];
  capsuleTypeMeta: (capsuleType: number | undefined) => CapsuleTypeMeta;
  onDeleteCapsule: (capsuleId: string) => void;
  onUnpublishSquare: (sourceMessageId: string) => void;
  onJumpToChatFromCapsule: (capsuleId: string) => void;
  onViewOriginalSquarePost: (sourceMessageId: string) => void;
};

export function SpaceMainSection({
  isOwnSpace,
  spaceTargetDisplayName,
  spaceFeed,
  capsuleTypeMeta,
  onDeleteCapsule,
  onUnpublishSquare,
  onJumpToChatFromCapsule,
  onViewOriginalSquarePost,
}: SpaceMainSectionProps) {
  return (
    <div className="mx-auto w-full max-w-xl space-y-4 pb-20 md:px-6">
      <div className="cd-card-raised rounded-2xl p-5">
        <h2 className="text-[22px] font-bold text-white">
          {isOwnSpace ? "我的空間" : `${spaceTargetDisplayName || "神秘旅人"} 的空間`}
        </h2>
        <p className="text-[13px] font-medium text-[#8E8E93]">這是存放在時光裡的記憶...</p>
      </div>

      <div className="space-y-4">
        {spaceFeed.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.04] py-16 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-white/20" />
            <p className="text-[15px] font-bold text-[#8E8E93]">目前沒有公開的內容</p>
          </div>
        ) : (
          spaceFeed.map((item) => (
            <div
              key={item.key}
              className="cd-card-raised relative overflow-hidden rounded-2xl p-5 transition-all"
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={cn(
                    "rounded-full border border-white/12 px-2.5 py-0.5 text-[10px] font-bold",
                    item.kind === "capsule"
                      ? capsuleTypeMeta(item.capsule.capsuleType).chipClass
                      : "bg-[#F06292]/12 text-pink-200",
                  )}
                >
                  #{item.kind === "capsule" ? capsuleTypeMeta(item.capsule.capsuleType).label : "廣場公開"}
                </span>
                <p className="text-[10px] font-bold tabular-nums text-[#8E8E93]">
                  {new Date(Number(item.micros / 1000n)).toLocaleDateString("zh-TW", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>

              <p className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-white/90">
                {item.kind === "capsule" ? item.capsule.content : item.post.snapshotContent}
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-dashed border-white/10 pt-4">
                <div className="flex items-center gap-2">
                  {isOwnSpace ? (
                    <>
                      {item.kind === "capsule" ? (
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                "確定要刪除這顆膠囊嗎？這會同時移除它在空間與廣場的顯示。",
                              )
                            ) {
                              onDeleteCapsule(item.capsule.id);
                            }
                          }}
                          className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-300"
                        >
                          刪除膠囊
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (window.confirm("確定要將這則快照從廣場撤下嗎？")) {
                              onUnpublishSquare(item.post.sourceMessageId);
                            }
                          }}
                          className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-200"
                        >
                          從廣場撤下
                        </button>
                      )}
                    </>
                  ) : (
                    item.kind === "capsule" && (
                      <button
                        onClick={() => onJumpToChatFromCapsule(item.capsule.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-pink-300 hover:underline"
                      >
                        發起聊聊
                      </button>
                    )
                  )}
                  {item.kind === "square" && (
                    <button
                      onClick={() => onViewOriginalSquarePost(item.post.sourceMessageId)}
                      className="flex items-center gap-1 text-[11px] font-bold text-pink-300 hover:underline"
                    >
                      查看原貼
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
