import { useEffect, useRef } from "react";

const escapeLayerStack: string[] = [];

function stackRemove(id: string) {
  const idx = escapeLayerStack.lastIndexOf(id);
  if (idx >= 0) escapeLayerStack.splice(idx, 1);
}

function stackPushTop(id: string) {
  stackRemove(id);
  escapeLayerStack.push(id);
}

export function useEscapeClose(enabled: boolean, onClose: () => void) {
  const layerIdRef = useRef<string>(
    `esc-${Math.random().toString(36).slice(2)}-${Date.now()}`,
  );
  const layerId = layerIdRef.current;

  useEffect(() => {
    if (!enabled) {
      stackRemove(layerId);
      return;
    }
    stackPushTop(layerId);
    return () => stackRemove(layerId);
  }, [enabled, layerId]);

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (escapeLayerStack[escapeLayerStack.length - 1] !== layerId) return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onClose, layerId]);
}
