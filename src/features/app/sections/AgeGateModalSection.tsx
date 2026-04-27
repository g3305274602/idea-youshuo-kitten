import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../../lib/utils";

type WheelPickerProps = {
  options: number[];
  value: number;
  onChange: (val: number) => void;
  label: string;
  repeatCount?: number;
};

type AgeGateModalSectionProps = {
  open: boolean;
  ageGateGender: string;
  calculatedAge: number;
  yearOptions: number[];
  monthOptions: number[];
  dayOptions: number[];
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  ageGateError: string;
  ageGateSaving: boolean;
  WheelPickerComponent: React.ComponentType<WheelPickerProps>;
  onSetAgeGateGender: (value: string) => void;
  onSetBirthYear: (value: number) => void;
  onSetBirthMonth: (value: number) => void;
  onSetBirthDay: (value: number) => void;
  onSubmitAgeGate: () => void | Promise<void>;
};

export function AgeGateModalSection({
  open,
  ageGateGender,
  calculatedAge,
  yearOptions,
  monthOptions,
  dayOptions,
  birthYear,
  birthMonth,
  birthDay,
  ageGateError,
  ageGateSaving,
  WheelPickerComponent,
  onSetAgeGateGender,
  onSetBirthYear,
  onSetBirthMonth,
  onSetBirthDay,
  onSubmitAgeGate,
}: AgeGateModalSectionProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            key="age-gate-modal-overlay"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="cd-modal-panel w-full max-w-sm p-6"
          >
            <p className="text-[22px] font-bold leading-tight text-white">完善資料</p>
            <p className="mt-2 text-[13px] font-medium text-[#8E8E93]">
              系統將根據生日自動換算年齡。
            </p>

            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                  性別
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {["male", "female"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => onSetAgeGateGender(g)}
                      className={cn(
                        "rounded-xl border py-2 text-[13px] font-bold transition-all active:translate-y-px",
                        ageGateGender === g
                          ? "border-[#FFD54F]/50 bg-[#FFD54F] text-stone-900"
                          : "border-white/10 bg-white/[0.06] text-[#8E8E93] hover:text-white",
                      )}
                    >
                      {g === "male" ? "男" : "女"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-end justify-between px-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                    生日
                  </p>
                  <p className="text-[12px] font-bold text-white">
                    <span className="text-[#F06292]">{calculatedAge}</span> 歲
                  </p>
                </div>

                <div className="flex gap-2">
                  <WheelPickerComponent
                    label="Year"
                    options={yearOptions}
                    value={birthYear}
                    onChange={onSetBirthYear}
                    repeatCount={3}
                  />
                  <WheelPickerComponent
                    label="Month"
                    options={monthOptions}
                    value={birthMonth}
                    onChange={onSetBirthMonth}
                    repeatCount={5}
                  />
                  <WheelPickerComponent
                    label="Day"
                    options={dayOptions}
                    value={birthDay}
                    onChange={onSetBirthDay}
                    repeatCount={3}
                  />
                </div>
              </div>
            </div>

            {ageGateError ? (
              <p
                className="mt-4 text-center text-[13px] font-bold text-red-300"
                role="alert"
              >
                {ageGateError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void onSubmitAgeGate()}
              disabled={ageGateSaving}
              className="cd-btn-primary mt-8 w-full py-3.5 text-[16px] font-bold disabled:opacity-50"
            >
              {ageGateSaving ? "儲存中..." : "開啟我的膠囊"}
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
