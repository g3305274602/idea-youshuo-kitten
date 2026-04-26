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
        className="flex w-full items-center gap-2 rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-left text-[14px] font-black text-stone-900 shadow-[3px_3px_0_0_#000] active:translate-y-px active:shadow-none"
      >
        <ChevronRight className="h-4 w-4 rotate-180" strokeWidth={3} />
        返回我的
      </button>

      <div className="rounded-2xl border-[3px] border-stone-900 bg-[#fffef7] p-4 shadow-[4px_4px_0_0_#0f2420]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg border-2 border-stone-900 bg-violet-200 flex items-center justify-center">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-black text-stone-900">
              {isOwnSpace ? displayName : displayName || "神秘旅人"}
            </p>
            <p className="text-[10px] font-bold text-stone-400">時光旅人</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="p-2 rounded-lg bg-stone-100 border border-stone-200">
            <p className="text-[14px] font-black">{capsuleCount}</p>
            <p className="text-[9px] font-bold text-stone-500">膠囊</p>
          </div>
          <div className="p-2 rounded-lg bg-stone-100 border border-stone-200">
            <p className="text-[14px] font-black">{squareCount}</p>
            <p className="text-[9px] font-bold text-stone-500">貼文</p>
          </div>
        </div>
      </div>
    </div>
  );
}
