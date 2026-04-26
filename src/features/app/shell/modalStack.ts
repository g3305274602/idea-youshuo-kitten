import { useCallback, useMemo, useState } from "react";

export type ModalType =
  | "profile"
  | "password"
  | "report"
  | "adminEdit"
  | "adminAdd"
  | "adminReport"
  | "outboxEdit"
  | "outboxDeleteConfirm"
  | "banNotice"
  | "chatPeerProfile"
  | "publish"
  | "introEdit"
  | "custom";

export type ModalNode<TPayload = unknown> = {
  id: string;
  type: ModalType;
  payload?: TPayload;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
};

function createModalId() {
  return `modal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useModalStack() {
  const [stack, setStack] = useState<ModalNode[]>([]);

  const push = useCallback((node: Omit<ModalNode, "id">) => {
    setStack((prev) => [...prev, { ...node, id: createModalId() }]);
  }, []);

  const replaceTop = useCallback((node: Omit<ModalNode, "id">) => {
    setStack((prev) => {
      if (prev.length === 0) return [{ ...node, id: createModalId() }];
      return [...prev.slice(0, -1), { ...node, id: createModalId() }];
    });
  }, []);

  const pop = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    setStack([]);
  }, []);

  const popToType = useCallback((type: ModalType) => {
    setStack((prev) => {
      let index = -1;
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        if (prev[i]?.type === type) {
          index = i;
          break;
        }
      }
      if (index < 0) return prev;
      return prev.slice(0, index + 1);
    });
  }, []);

  const dismissLastByType = useCallback((type: ModalType) => {
    setStack((prev) => {
      let index = -1;
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        if (prev[i]?.type === type) {
          index = i;
          break;
        }
      }
      if (index < 0) return prev;
      return [...prev.slice(0, index), ...prev.slice(index + 1)];
    });
  }, []);

  const isOpen = useCallback(
    (type: ModalType) => stack.some((node) => node.type === type),
    [stack],
  );

  const top = stack.length > 0 ? stack[stack.length - 1] : null;

  return useMemo(
    () => ({
      stack,
      top,
      push,
      replaceTop,
      pop,
      clear,
      popToType,
      dismissLastByType,
      isOpen,
      hasModal: stack.length > 0,
    }),
    [stack, top, push, replaceTop, pop, clear, popToType, dismissLastByType, isOpen],
  );
}
