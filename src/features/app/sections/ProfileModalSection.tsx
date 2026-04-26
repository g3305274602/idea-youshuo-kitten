import { AnimatePresence, motion } from "motion/react";
import type { User } from "../types";

type WheelPickerProps = {
  options: number[];
  value: number;
  onChange: (val: number) => void;
  label: string;
  repeatCount?: number;
};

type ProfileForm = {
  displayName: string;
  profileNote: string;
};

type ProfileModalSectionProps = {
  user: User | null;
  isProfileModalVisible: boolean;
  profileSaving: boolean;
  profileError: string;
  profileForm: ProfileForm;
  ageGateGender: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  yearOptions: number[];
  monthOptions: number[];
  dayOptions: number[];
  calculateAgeFromDate: (birthDate: Date | null) => number;
  WheelPickerComponent: React.ComponentType<WheelPickerProps>;
  onCloseProfileModal: () => void;
  onSubmitProfile: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onSetProfileForm: React.Dispatch<React.SetStateAction<ProfileForm>>;
  onSetAgeGateGender: (value: string) => void;
  onSetBirthYear: (value: number) => void;
  onSetBirthMonth: (value: number) => void;
  onSetBirthDay: (value: number) => void;
};

export function ProfileModalSection({
  user,
  isProfileModalVisible,
  profileSaving,
  profileError,
  profileForm,
  ageGateGender,
  birthYear,
  birthMonth,
  birthDay,
  yearOptions,
  monthOptions,
  dayOptions,
  calculateAgeFromDate,
  WheelPickerComponent,
  onCloseProfileModal,
  onSubmitProfile,
  onSetProfileForm,
  onSetAgeGateGender,
  onSetBirthYear,
  onSetBirthMonth,
  onSetBirthDay,
}: ProfileModalSectionProps) {
  return (
    <AnimatePresence>
      {isProfileModalVisible && user ? (
        <motion.div
          key="profile-modal"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[225] flex items-end justify-center sm:items-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={() => {
            if (profileSaving) return;
            onCloseProfileModal();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="cd-modal-panel w-full max-w-[min(100%,22rem)] p-5"
          >
            <h3
              id="profile-modal-title"
              className="text-[18px] font-bold tracking-tight text-white"
            >
              個人資料
            </h3>
            <p className="mt-1 text-[12px] font-medium text-[#8E8E93]">登入信箱：{user.email}</p>
            <form onSubmit={(e) => void onSubmitProfile(e)} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                  暱稱
                </label>
                <input
                  value={profileForm.displayName}
                  onChange={(e) =>
                    onSetProfileForm((f) => ({
                      ...f,
                      displayName: e.target.value,
                    }))
                  }
                  maxLength={32}
                  required
                  className="cd-field"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                  性別
                </label>
                <select
                  value={ageGateGender}
                  onChange={(e) => onSetAgeGateGender(e.target.value)}
                  required
                  className="cd-field"
                >
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                  <option value="unspecified">不願透露</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                    出生年月日 (目前{" "}
                    {calculateAgeFromDate(new Date(birthYear, birthMonth - 1, birthDay))}{" "}
                    歲)
                  </label>
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

              {profileError ? (
                <p className="text-[13px] font-bold text-red-300" role="alert">
                  {profileError}
                </p>
              ) : null}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={profileSaving}
                  onClick={onCloseProfileModal}
                  className="cd-btn-ghost flex-1 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="cd-btn-primary flex-1 disabled:opacity-50"
                >
                  {profileSaving ? "儲存中…" : "儲存"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
