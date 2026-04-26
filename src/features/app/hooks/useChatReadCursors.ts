import { useCallback, useEffect, useState } from "react";
import { loadReadCursorMap, saveReadCursorMap } from "../chatReadCursors";

export function useChatReadCursors(identityHex: string | undefined) {
  const [cursorMap, setCursorMap] = useState<Map<string, bigint>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!identityHex) {
      setCursorMap(new Map());
      return;
    }
    setCursorMap(loadReadCursorMap(identityHex));
  }, [identityHex]);

  const markThreadRead = useCallback(
    (threadKey: string, maxMessageMicros: bigint) => {
      setCursorMap((prev) => {
        const next = new Map(prev);
        const cur = next.get(threadKey) ?? 0n;
        const merged = maxMessageMicros > cur ? maxMessageMicros : cur;
        next.set(threadKey, merged);
        if (identityHex) saveReadCursorMap(identityHex, next);
        return next;
      });
    },
    [identityHex],
  );

  const getCursor = useCallback(
    (threadKey: string) => cursorMap.get(threadKey) ?? 0n,
    [cursorMap],
  );

  return { markThreadRead, getCursor, cursorMap };
}
