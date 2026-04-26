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
            className="w-full max-w-sm rounded-3xl border-[3px] border-stone-900 bg-[#fffef7] p-6 shadow-[8px_8px_0_0_#0f2420]"
          >
            <p className="text-[22px] font-black text-stone-900 leading-tight">
              完善資料
            </p>
            <p className="mt-2 text-[13px] font-bold text-stone-500">
              系統將根據生日自動換算年齡。
            </p>

            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-stone-400">
                  性別
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {["male", "female", "other"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => onSetAgeGateGender(g)}
                      className={cn(
                        "rounded-xl border-2 border-stone-900 py-2 text-[13px] font-black transition-all active:translate-y-px",
                        ageGateGender === g
                          ? "bg-[#f4dc3a] text-stone-900 shadow-[2px_2px_0_0_#000]"
                          : "bg-white text-stone-300",
                      )}
                    >
                      {g === "male" ? "男" : g === "female" ? "女" : "其他"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end px-1">
                  <p className="text-[11px] font-black uppercase tracking-wider text-stone-400">
                    生日
                  </p>
                  <p className="text-[12px] font-black text-stone-900">
                    <span className="text-red-600">{calculatedAge}</span> 歲
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
                className="mt-4 text-[13px] font-bold text-red-600 text-center"
                role="alert"
              >
                {ageGateError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void onSubmitAgeGate()}
              disabled={ageGateSaving}
              className="mt-8 w-full rounded-2xl border-2 border-stone-900 bg-[#f4dc3a] px-4 py-3.5 text-[16px] font-black text-stone-900 shadow-[5px_5px_0_0_#0f2420] active:translate-y-px active:shadow-none transition-all disabled:opacity-50"
            >
              {ageGateSaving ? "儲存中..." : "開啟我的膠囊"}
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
