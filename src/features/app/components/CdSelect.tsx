import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/utils";

export type CdSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function CdSelect({
  value,
  options,
  onChange,
  className,
  buttonClassName,
  menuClassName,
  disabled,
}: {
  value: string;
  options: readonly CdSelectOption[];
  onChange: (next: string) => void;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const current = useMemo(
    () => options.find((o) => o.value === value) ?? options[0] ?? null,
    [options, value],
  );

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (!rootRef.current?.contains(target)) setOpen(false);
    };
    window.addEventListener("mousedown", onDocDown);
    return () => window.removeEventListener("mousedown", onDocDown);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "cd-field flex w-full items-center justify-between gap-2 text-left",
          "disabled:cursor-not-allowed disabled:opacity-50",
          buttonClassName,
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{current?.label ?? "請選擇"}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+0.3rem)] z-[500] max-h-56 overflow-y-auto rounded-xl border border-white/12 bg-[#171923] p-1.5 shadow-2xl backdrop-blur",
            menuClassName,
          )}
          role="listbox"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                disabled={opt.disabled}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold",
                  "transition-colors",
                  active
                    ? "bg-[#FFD54F] text-[#121319]"
                    : "text-white/90 hover:bg-white/10",
                  opt.disabled && "cursor-not-allowed opacity-45",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
