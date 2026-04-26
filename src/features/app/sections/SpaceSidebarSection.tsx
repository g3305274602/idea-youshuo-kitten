import { ChevronRight, User } from "lucide-react";

type SpaceSidebarSectionProps = {
  isOwnSpace: boolean;
  displayName?: string;
  capsuleCount: number;
  squareCount: number;
  onBack: () => void;
};

export function SpaceSidebarSection({
  isOwnSpace,
  displayName,
  capsuleCount,
  squareCount,
  onBack,
}: SpaceSidebarSectionProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <button
        type="button"
        onClick={onBack}
        className="cd-btn-ghost flex w-full items-center gap-2 py-2 text-left text-[14px] font-bold"
      >
        <ChevronRight className="h-4 w-4 rotate-180" strokeWidth={3} />
        返回我的
      </button>

      <div className="cd-card-raised rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-gradient-to-br from-[#F06292]/30 to-violet-600/20">
            <User className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-white">
              {isOwnSpace ? displayName : displayName || "神秘旅人"}
            </p>
            <p className="text-[10px] font-medium text-[#8E8E93]">時光旅人</p>
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
