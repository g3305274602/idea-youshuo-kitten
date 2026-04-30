import { useCallback, useEffect, useState } from "react";
import { loadReadCursorMap, saveReadCursorMap } from "../chatReadCursors";

export function useChatReadCursors(ownerKey: string | undefined) {
  const [cursorMap, setCursorMap] = useState<Map<string, bigint>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!ownerKey) {
      setCursorMap(new Map());
      return;
    }
    setCursorMap(loadReadCursorMap(ownerKey));
  }, [ownerKey]);

  const markThreadRead = useCallback(
    (threadKey: string, maxMessageMicros: bigint) => {
      setCursorMap((prev) => {
        const next = new Map(prev);
        const cur = next.get(threadKey) ?? 0n;
        const merged = maxMessageMicros > cur ? maxMessageMicros : cur;
        next.set(threadKey, merged);
        if (ownerKey) saveReadCursorMap(ownerKey, next);
        return next;
      });
    },
    [ownerKey],
  );

  const getCursor = useCallback(
    (threadKey: string) => cursorMap.get(threadKey) ?? 0n,
    [cursorMap],
  );

  return { markThreadRead, getCursor, cursorMap };
}
