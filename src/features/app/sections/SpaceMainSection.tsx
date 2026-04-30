import { Coins, Package, Star, User } from "lucide-react";
import { useState } from "react";

import { cn } from "../../../lib/utils";
import type { SpaceFeedItem } from "../types";
import { GenderIcon } from "./PickerControls";

type CapsuleTypeMeta = {
  chipClass: string;
  label: string;
};

type SpaceMainSectionProps = {
  isOwnSpace: boolean;
  spaceTargetDisplayName?: string;
  avatarImageUrl?: string;
  profileGender?: string;
  profileNote?: string;
  titleLabel?: string;
  titleWatermark?: string;
  titleTone?:
    | "stardust"
    | "glimmer"
    | "meteor"
    | "satellite"
    | "planet"
    | "star"
    | "galaxy"
    | "universe"
    | "creator";
  availablePoints?: number;
  spaceFeed: SpaceFeedItem[];
  capsuleTypeMeta: (capsuleType: number | undefined) => CapsuleTypeMeta;
  isCapsulePublicInSpace: (capsuleId: string) => boolean;
  onDeleteCapsule: (capsuleId: string) => void;
  onToggleCapsuleVisibility: (capsuleId: string, nextPublic: boolean) => void;
  onUnpublishSquare: (sourceMessageId: string) => void;
  onJumpToChatFromCapsule: (capsuleId: string) => void;
  onViewOriginalSquarePost: (sourceMessageId: string) => void;
};

export function SpaceMainSection({
  isOwnSpace,
  spaceTargetDisplayName,
  avatarImageUrl,
  profileGender,
  profileNote,
  titleLabel = "星塵",
  titleWatermark = "",
  titleTone = "stardust",
  availablePoints = 0,
  spaceFeed,
  capsuleTypeMeta,
  isCapsulePublicInSpace,
  onDeleteCapsule,
  onToggleCapsuleVisibility,
  onUnpublishSquare,
  onJumpToChatFromCapsule,
  onViewOriginalSquarePost,
}: SpaceMainSectionProps) {
  const [deleteCapsuleId, setDeleteCapsuleId] = useState<string | null>(null);
  return (
    <div className="mx-auto w-full max-w-xl space-y-4 pb-20 md:px-6">
      <div className={cn("ys-mine-profile-card md:hidden", `ys-mine-profile-card--${titleTone}`)}>
        {titleWatermark ? (
          <span className={cn("ys-title-watermark", `ys-title-watermark--${titleTone}`)}>
            {titleWatermark}
          </span>
        ) : null}
        <div className="ys-mine-profile-card-row">
          <div className={cn("ys-mine-avatar-slot", `ys-mine-avatar-slot--${titleTone}`)}>
            {avatarImageUrl ? (
              <img
                src={avatarImageUrl}
                alt=""
                className="h-full w-full rounded-[24px] object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-6 w-6 text-white/80" />
              </div>
            )}
          </div>
          <div className="ys-mine-profile-hitbox">
            <div className="ys-mine-profile-main">
              <div className="ys-mine-name-row">
                <p className="ys-mine-name">
                  {spaceTargetDisplayName || (isOwnSpace ? "我的空間" : "一位朋友")}
                </p>
              </div>
              <div className="ys-mine-level-row">
                <div className="ys-mine-level-chip">
                  <Star className="h-2.5 w-2.5" strokeWidth={2.6} aria-hidden />
                  <span>{titleLabel}</span>
                </div>
                {isOwnSpace ? (
                  <span className="ys-mine-points-chip">
                    <Coins className="h-3 w-3" strokeWidth={2.2} aria-hidden />
                    <span>{availablePoints}</span>
                  </span>
                ) : null}
                {!isOwnSpace ? (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/12 bg-white/[0.06]">
                    <GenderIcon gender={profileGender} />
                  </span>
                ) : null}
              </div>
              <div className="ys-mine-shuoshuo-row">
                <p className="min-w-0 flex-1 truncate text-white/80">
                  {profileNote?.trim() || "尚無說說"}
                </p>
              </div>
            </div>
          </div>
        </div>
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
                        <>
                          <span className="text-[11px] font-bold text-[#8E8E93]">
                            空間展示
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isCapsulePublicInSpace(item.capsule.id)}
                            onClick={() =>
                              onToggleCapsuleVisibility(
                                item.capsule.id,
                                !isCapsulePublicInSpace(item.capsule.id),
                              )
                            }
                            className={cn(
                              "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-all",
                              isCapsulePublicInSpace(item.capsule.id)
                                ? "border-white/20 bg-emerald-500"
                                : "border-white/15 bg-white/[0.08]",
                            )}
                            title={isCapsulePublicInSpace(item.capsule.id) ? "目前為展示中" : "目前為已隱藏"}
                          >
                            <span
                              className={cn(
                                "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
                                isCapsulePublicInSpace(item.capsule.id)
                                  ? "left-6 bg-stone-900"
                                  : "left-1",
                              )}
                            />
                          </button>
                        </>
                      ) : null}
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
                </div>
                <div className="flex items-center justify-end gap-2">
                  {isOwnSpace ? (
                    <>
                      {item.kind === "capsule" ? (
                        <>
                          <button
                            onClick={() => {
                              setDeleteCapsuleId(item.capsule.id);
                            }}
                            className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-300"
                          >
                            刪除膠囊
                          </button>
                        </>
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
                  ) : null}
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
      {deleteCapsuleId ? (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/55 p-4"
          onClick={() => setDeleteCapsuleId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[22rem] rounded-2xl border border-white/15 bg-[#121319] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[15px] font-bold text-white">刪除這顆膠囊？</p>
            <p className="mt-2 text-[12px] leading-relaxed text-white/75">
              刪除後會同時從你的空間與廣場顯示中移除，且不可復原。
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="cd-btn-ghost min-w-0 flex-1 py-2 text-[13px]"
                onClick={() => setDeleteCapsuleId(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="min-w-0 flex-1 rounded-xl border border-red-500/35 bg-red-500/10 py-2 text-[13px] font-bold text-red-300"
                onClick={() => {
                  onDeleteCapsule(deleteCapsuleId);
                  setDeleteCapsuleId(null);
                }}
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
