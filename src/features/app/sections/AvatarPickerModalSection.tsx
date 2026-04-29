import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useEscapeClose } from "../hooks/useEscapeClose";

type AvatarCatalogRow = {
  avatarKey: string;
  seriesKey: string;
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
  onClose: () => void;
  onSelectAvatar: (avatarKey: string) => void | Promise<void>;
  onUnlockAvatar: (avatarKey: string) => void | Promise<void>;
};

function buildAvatarUrl(row: AvatarCatalogRow): string {
  const base = row.basePath.endsWith("/") ? row.basePath : `${row.basePath}/`;
  return `${base}${row.fileName}`;
}

export function AvatarPickerModalSection({
  open,
  currentAvatarKey,
  availablePoints,
  catalogRows,
  unlockedKeys,
  unlockLoading,
  actionError,
  onClose,
  onSelectAvatar,
  onUnlockAvatar,
}: AvatarPickerModalSectionProps) {
  const [confirmKey, setConfirmKey] = useState<string>("");
  useEscapeClose(open && !unlockLoading, onClose);

  const groupedRows = useMemo(() => {
    const m = new Map<string, AvatarCatalogRow[]>();
    for (const row of [...catalogRows].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const list = m.get(row.seriesKey) ?? [];
      list.push(row);
      m.set(row.seriesKey, list);
    }
    return [...m.entries()];
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
            className="cd-modal-panel w-full max-w-[min(100%,26rem)] p-4"
          >
            <h3 id="avatar-picker-title" className="text-[18px] font-bold text-white">
              更換頭像
            </h3>
            <p className="mt-1 text-[12px] font-medium text-[#8E8E93]">
              可用積分：{availablePoints}
            </p>

            <div className="mt-3 max-h-[58vh] space-y-3 overflow-y-auto pr-1 apple-scroll">
              {groupedRows.map(([seriesKey, rows]) => (
                <section key={seriesKey} className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                    {seriesKey}
                  </p>
                  <div className="grid grid-cols-5 gap-2">
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
                          className={`relative overflow-hidden rounded-xl border ${
                            selected
                              ? "border-[#FFD54F] ring-2 ring-[#FFD54F]/35"
                              : "border-white/15"
                          }`}
                          title={row.avatarKey}
                        >
                          <img
                            src={src}
                            alt={row.avatarKey}
                            className={`h-14 w-full object-cover ${isUnlocked ? "" : "opacity-45"}`}
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full rounded-2xl border border-white/15 bg-[#121319] p-4"
                  >
                    {(() => {
                      const row = catalogRows.find((r) => r.avatarKey === confirmKey);
                      if (!row) return null;
                      const canUnlock = availablePoints >= row.pricePoints;
                      return (
                        <>
                          <p className="text-[15px] font-bold text-white">
                            解鎖 {row.seriesKey.toUpperCase()} 全系列中的單張
                          </p>
                          <p className="mt-1 text-[12px] text-white/75">
                            頭像：{row.avatarKey}
                          </p>
                          <p className="mt-1 text-[12px] text-white/75">
                            需要：{row.pricePoints} 積分
                          </p>
                          <p className="text-[12px] text-white/75">
                            目前：{availablePoints} 積分
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              className="cd-btn-ghost flex-1 py-2 text-[13px]"
                              onClick={() => setConfirmKey("")}
                              disabled={unlockLoading}
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              className="cd-btn-primary flex-1 py-2 text-[13px] disabled:opacity-60"
                              disabled={!canUnlock || unlockLoading}
                              onClick={() => void onUnlockAvatar(confirmKey)}
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
