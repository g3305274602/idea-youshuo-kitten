import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import {
  groupRowsBySeriesKey,
  loadAvatarSeriesDisplayOrder,
  mergePersistedSeriesOrder,
} from "../avatarSeriesDisplayOrder";
import { useEscapeClose } from "../hooks/useEscapeClose";

type AvatarCatalogRow = {
  avatarKey: string;
  seriesKey: string;
  seriesDisplayName?: string;
  basePath: string;
  fileName: string;
  pricePoints: number;
  isPublished: boolean;
  sortOrder: number;
};

type AvatarPickerModalSectionProps = {
  open: boolean;
  currentAvatarKey: string;
  availablePoints: number;
  catalogRows: readonly AvatarCatalogRow[];
  unlockedKeys: ReadonlySet<string>;
  unlockLoading: boolean;
  actionError: string;
  seriesOrderKeys?: readonly string[];
  onClose: () => void;
  onSelectAvatar: (avatarKey: string) => void | Promise<void>;
  onUnlockAvatar: (avatarKey: string) => void | Promise<void>;
};

function buildAvatarUrl(row: AvatarCatalogRow): string {
  const base = row.basePath.endsWith("/") ? row.basePath : `${row.basePath}/`;
  const joined = `${base}${row.fileName}`.replace(/\/{2,}/g, "/").replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${joined}`;
}

export function AvatarPickerModalSection({
  open,
  currentAvatarKey,
  availablePoints,
  catalogRows,
  unlockedKeys,
  unlockLoading,
  actionError,
  seriesOrderKeys,
  onClose,
  onSelectAvatar,
  onUnlockAvatar,
}: AvatarPickerModalSectionProps) {
  const [confirmKey, setConfirmKey] = useState<string>("");
  useEscapeClose(open && !unlockLoading, onClose);

  const groupedRows = useMemo(() => {
    const sortedFlat = [...catalogRows].sort((a, b) => a.sortOrder - b.sortOrder);
    const grouped = groupRowsBySeriesKey(sortedFlat);
    const keys = [...grouped.keys()];
    const orderedKeys = mergePersistedSeriesOrder(
      keys,
      grouped,
      seriesOrderKeys ?? loadAvatarSeriesDisplayOrder(),
    );
    return orderedKeys.map((seriesKey) => {
      const rows = (grouped.get(seriesKey) ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
      return [seriesKey, rows] as const;
    });
  }, [catalogRows]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="avatar-picker-modal"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[230] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          onClick={() => {
            if (unlockLoading) return;
            setConfirmKey("");
            onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-picker-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="cd-modal-panel w-full max-w-[min(100%,26rem)] p-4 lg:max-w-[min(100%,48rem)]"
          >
            <h3 id="avatar-picker-title" className="text-[18px] font-bold text-white">
              更換頭像
            </h3>
            <p className="mt-1 text-[12px] font-medium text-[#8E8E93]">
              可用積分：{availablePoints}
            </p>

            <div className="mt-3 max-h-[58vh] space-y-3 overflow-y-auto pr-1 apple-scroll" style={{ contain: 'layout style paint' }}>
              {groupedRows.map(([seriesKey, rows]) => (
                <section key={seriesKey} className="space-y-1.5">
                  <p className="text-[11px] font-bold tracking-wider text-[#8E8E93]">
                    {rows.find((r) => r.seriesDisplayName?.trim())?.seriesDisplayName || seriesKey}
                  </p>
                  <div className="grid grid-cols-5 gap-3 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-10">
                    {rows.map((row) => {
                      const isUnlocked =
                        row.pricePoints <= 0 || unlockedKeys.has(row.avatarKey);
                      const selected = currentAvatarKey === row.avatarKey;
                      const src = buildAvatarUrl(row);
                      return (
                        <button
                          key={row.avatarKey}
                          type="button"
                          onClick={() => {
                            if (isUnlocked) {
                              void onSelectAvatar(row.avatarKey);
                              return;
                            }
                            setConfirmKey(row.avatarKey);
                          }}
                          className={`relative aspect-square min-h-[4rem] overflow-hidden rounded-2xl border ${
                            selected
                              ? "border-[#FFD54F] ring-2 ring-[#FFD54F]/35"
                              : "border-white/15"
                          }`}
                          title={row.seriesDisplayName?.trim() || "頭像"}
                        >
                          <img
                            src={src}
                            alt=""
                            width={64}
                            height={64}
                            className={`h-full w-full object-contain ${isUnlocked ? "" : "opacity-45"}`}
                            loading="lazy"
                            decoding="async"
                          />
                          {!isUnlocked ? (
                            <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-[10px] font-bold text-[#FFD54F]">
                              {row.pricePoints}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {actionError ? (
              <p className="mt-2 text-[12px] font-bold text-red-300">{actionError}</p>
            ) : null}

            <div className="mt-3 flex justify-end">
              <button type="button" onClick={onClose} className="cd-btn-ghost px-4 py-2 text-[13px]">
                關閉
              </button>
            </div>

            <AnimatePresence>
              {confirmKey ? (
                <motion.div
                  key="avatar-unlock-confirm"
                  role="presentation"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-black/55 p-4"
                  onClick={() => !unlockLoading && setConfirmKey("")}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="avatar-unlock-confirm-title"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-[min(100%,17.5rem)] rounded-2xl border border-white/15 bg-[#121319] p-4 shadow-lg"
                  >
                    {(() => {
                      const row = catalogRows.find((r) => r.avatarKey === confirmKey);
                      if (!row) return null;
                      const canUnlock = availablePoints >= row.pricePoints;
                      const seriesLabel = row.seriesDisplayName?.trim() || "";
                      return (
                        <>
                          <p
                            id="avatar-unlock-confirm-title"
                            className="text-[15px] font-bold leading-snug text-white"
                          >
                            {seriesLabel
                              ? `解鎖「${seriesLabel}」中的此張頭像`
                              : "解鎖此張頭像"}
                          </p>
                          <p className="mt-2 text-[12px] leading-relaxed text-white/72">
                            解鎖後可隨時使用為顯示頭像
                          </p>
                          <p className="mt-2 text-[12px] text-white/75">
                            需要 {row.pricePoints} 積分 · 目前 {availablePoints} 積分
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              className="cd-btn-ghost min-w-0 flex-1 py-2 text-[13px]"
                              onClick={() => setConfirmKey("")}
                              disabled={unlockLoading}
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              className="cd-btn-primary min-w-0 flex-1 py-2 text-[13px] disabled:opacity-60"
                              disabled={!canUnlock || unlockLoading}
                              onClick={async () => {
                                if (!canUnlock || unlockLoading) return;
                                try {
                                  await Promise.resolve(onUnlockAvatar(confirmKey));
                                  setConfirmKey("");
                                } catch {
                                  /* 錯誤由 actionError / 父層顯示 */
                                }
                              }}
                            >
                              {canUnlock ? "確認解鎖" : "積分不足"}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
