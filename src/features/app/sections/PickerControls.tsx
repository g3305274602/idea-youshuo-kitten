import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import { Minus, Plus, Mars, Venus, Asterisk } from "lucide-react";

import { cn } from "../../../lib/utils";

export function WheelPicker({
  options,
  value,
  onChange,
  label,
  repeatCount = 3,
}: {
  options: number[];
  value: number;
  onChange: (val: number) => void;
  label: string;
  repeatCount?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayOptions = useMemo(
    () => Array(repeatCount).fill(options).flat(),
    [options, repeatCount],
  );

  const getIndexFromScroll = (top: number) => Math.round(top / 40);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      if (scrollRef.current) {
        const singleSetLength = options.length;
        const currentIndexInSingleSet = options.indexOf(value);
        if (currentIndexInSingleSet !== -1) {
          const middleSetIndex = Math.floor(repeatCount / 2);
          const targetIndex =
            middleSetIndex * singleSetLength + currentIndexInSingleSet;
          scrollRef.current.scrollTop = targetIndex * 40;
        }
      }
    });
    return () => cancelAnimationFrame(timer);
  }, [options.length, value, repeatCount, options]);

  const handleScroll = () => {
    isScrolling.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      isScrolling.current = false;
      const container = scrollRef.current;
      if (!container) return;

      const totalIndex = getIndexFromScroll(container.scrollTop);
      const singleSetLength = options.length;
      const actualValue = options[totalIndex % singleSetLength];

      if (actualValue !== undefined && actualValue !== value) {
        onChange(actualValue);
      }

      const middleSetIndex = Math.floor(repeatCount / 2);
      if (
        totalIndex < singleSetLength ||
        totalIndex >= (repeatCount - 1) * singleSetLength
      ) {
        const newTargetIndex =
          middleSetIndex * singleSetLength + (totalIndex % singleSetLength);
        container.scrollTop = newTargetIndex * 40;
      }
    }, 100);
  };

  const handleItemClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isScrolling.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;

    if (relativeY < 40) {
      onChange(
        options[(options.indexOf(value) - 1 + options.length) % options.length],
      );
      scrollRef.current?.scrollBy({ top: -40, behavior: "smooth" });
    } else if (relativeY > 80) {
      onChange(options[(options.indexOf(value) + 1) % options.length]);
      scrollRef.current?.scrollBy({ top: 40, behavior: "smooth" });
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center select-none">
      <p className="text-[10px] font-black text-stone-400 mb-1 uppercase tracking-widest">
        {label}
      </p>
      <div
        onClick={handleItemClick}
        className="relative h-[120px] w-full overflow-hidden border-2 border-stone-900 bg-white rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] cursor-pointer"
      >
        <div className="pointer-events-none bg-[#ffffffdd] absolute inset-x-0 top-0 h-[40px] flex items-center justify-center text-stone-800 z-20">
          <Minus size={16} strokeWidth={3} />
        </div>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-scroll snap-y snap-mandatory apple-scroll-none py-[40px]"
          style={{ scrollbarWidth: "none" }}
        >
          {displayOptions.map((opt, idx) => (
            <div
              key={`${label}-${idx}-${opt}`}
              className={cn(
                "h-[40px] leading-[40px] flex items-center justify-center snap-center text-[15px] font-black transition-all",
                value === opt
                  ? "text-stone-900 scale-110"
                  : "text-stone-600 opacity-66",
              )}
            >
              {opt}
            </div>
          ))}
          <div className="pointer-events-none bg-[#ffffffdd] absolute inset-x-0 bottom-0 h-[40px] flex items-center justify-center text-stone-800 z-20">
            <Plus size={16} strokeWidth={3} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function GenderIcon({ gender }: { gender?: string }) {
  if (!gender) return null;
  const g = gender.toLowerCase();

  if (g === "male") {
    return (
      <Mars
        className="w-3.5 h-3.5 text-blue-500 drop-shadow-[0_0_2px_rgba(59,130,246,0.3)]"
        strokeWidth={3}
      />
    );
  }
  if (g === "female") {
    return (
      <Venus
        className="w-3.5 h-3.5 text-pink-500 drop-shadow-[0_0_2px_rgba(236,72,153,0.3)]"
        strokeWidth={3}
      />
    );
  }
  if (g === "other") {
    return <Asterisk className="w-3.5 h-3.5 text-amber-500" strokeWidth={3} />;
  }
  return null;
}
