import { Coins, Star, User } from "lucide-react";

import { cn } from "../../../lib/utils";
import { GenderIcon } from "./PickerControls";

type SpaceSidebarSectionProps = {
  isOwnSpace: boolean;
  displayName?: string;
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
  capsuleCount: number;
  squareCount: number;
  watermarkText?: string;
};

export function SpaceSidebarSection({
  isOwnSpace,
  displayName,
  avatarImageUrl,
  profileGender,
  profileNote,
  titleLabel,
  titleWatermark = "",
  titleTone = "stardust",
  availablePoints = 0,
  capsuleCount,
  squareCount,
  watermarkText = "",
}: SpaceSidebarSectionProps) {
  return (
    <div className="flex flex-col gap-4 px-2 pb-4 pt-0">
      <div className={cn("ys-mine-profile-card", `ys-mine-profile-card--${titleTone}`)}>
        {watermarkText || titleWatermark ? (
          <span className={cn("ys-title-watermark", `ys-title-watermark--${titleTone}`)}>
            {titleWatermark || watermarkText}
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
                <p className="ys-mine-name">{displayName?.trim() || (isOwnSpace ? "我" : "一位朋友")}</p>
              </div>
              <div className="ys-mine-level-row">
                <div className="ys-mine-level-chip">
                  <Star className="h-2.5 w-2.5" strokeWidth={2.6} aria-hidden />
                  <span>{titleLabel?.trim() || "星塵"}</span>
                </div>
                {isOwnSpace ? (
                  <span className="ys-mine-points-chip" role="img" aria-label={`可用積分，目前 ${availablePoints}`}>
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
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
            <p className="text-[14px] font-bold text-white">{capsuleCount}</p>
            <p className="text-[9px] font-bold text-[#8E8E93]">膠囊</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
            <p className="text-[14px] font-bold text-white">{squareCount}</p>
            <p className="text-[9px] font-bold text-[#8E8E93]">貼文</p>
          </div>
        </div>
      </div>
    </div>
  );
}
