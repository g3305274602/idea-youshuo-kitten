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
    <div className="mx-auto w-full max-w-xl space-y-4  md:px-6 pb-20">
      <div className="rounded-2xl border-[3px] border-stone-900 bg-white p-5 shadow-[6px_6px_0_0_#0f2420]">
        <h2 className="text-[22px] font-black text-stone-900">
          {isOwnSpace ? "我的空間" : `${spaceTargetDisplayName || "神秘旅人"} 的空間`}
        </h2>
        <p className="text-stone-500 text-[13px] font-bold">這是存放在時光裡的記憶...</p>
      </div>

      <div className="space-y-4">
        {spaceFeed.length === 0 ? (
          <div className="py-16 text-center bg-white/40 rounded-3xl border-2 border-dashed border-stone-300">
            <Package className="mx-auto mb-3 h-12 w-12 text-stone-300" />
            <p className="text-[15px] font-bold text-stone-400">目前沒有公開的內容</p>
          </div>
        ) : (
          spaceFeed.map((item) => (
            <div
              key={item.key}
              className="relative overflow-hidden rounded-2xl border-[3px] border-stone-900 bg-white p-5 shadow-[6px_6px_0_0_#0f2420] transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={cn(
                    "rounded-full border-2 border-stone-900 px-2.5 py-0.5 text-[10px] font-black",
                    item.kind === "capsule"
                      ? capsuleTypeMeta(item.capsule.capsuleType).chipClass
                      : "bg-violet-100 text-violet-800",
                  )}
                >
                  #{item.kind === "capsule" ? capsuleTypeMeta(item.capsule.capsuleType).label : "廣場公開"}
                </span>
                <p className="text-[10px] font-bold text-stone-400 tabular-nums">
                  {new Date(Number(item.micros / 1000n)).toLocaleDateString("zh-TW", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>

              <p className="text-[15px] font-bold leading-relaxed text-stone-800 whitespace-pre-wrap">
                {item.kind === "capsule" ? item.capsule.content : item.post.snapshotContent}
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-dashed border-stone-200 pt-4">
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
                          className="rounded-lg border-2 border-stone-900 bg-red-50 px-3 py-1.5 text-[11px] font-black text-red-600 shadow-[2px_2px_0_0_#000] active:translate-y-px"
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
                          className="rounded-lg border-2 border-stone-900 bg-orange-50 px-3 py-1.5 text-[11px] font-black text-orange-700 shadow-[2px_2px_0_0_#000] active:translate-y-px"
                        >
                          從廣場撤下
                        </button>
                      )}
                    </>
                  ) : (
                    item.kind === "capsule" && (
                      <button
                        onClick={() => onJumpToChatFromCapsule(item.capsule.id)}
                        className="flex items-center gap-1 text-[11px] font-black text-violet-600 hover:underline"
                      >
                        發起聊聊
                      </button>
                    )
                  )}
                  {item.kind === "square" && (
                    <button
                      onClick={() => onViewOriginalSquarePost(item.post.sourceMessageId)}
                      className="flex items-center gap-1 text-[11px] font-black text-violet-600 hover:underline"
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
