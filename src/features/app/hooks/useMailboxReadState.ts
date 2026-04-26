import { useEffect, useMemo, useRef, useState } from "react";
import type { AppTab, Message } from "../types";
import {
  loadMailboxRead,
  maxCreatedMs,
  messageCreatedMs,
  saveMailboxRead,
} from "../mailboxReadCursors";

/**
 * 飄向我的／我丟出的：用「已看到的最晚 createdAt」作為游標，僅有 createdAt
 * 大於游標的列視為新訊息；切到對應分頁時將游標拉到目前列表 max（等同已讀）。
 */
export function useMailboxReadState(
  identityHex: string | undefined,
  inbox: readonly Message[],
  outbox: readonly Message[],
  activeTab: AppTab,
) {
  const [inboxWm, setInboxWm] = useState(0);
  const [outboxWm, setOutboxWm] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const needBaseline = useRef(false);

  useEffect(() => {
    if (!identityHex) {
      setInboxWm(0);
      setOutboxWm(0);
      setHydrated(false);
      needBaseline.current = false;
      return;
    }
    const s = loadMailboxRead(identityHex);
    if (s) {
      setInboxWm(s.inboxWatermarkMs);
      setOutboxWm(s.outboxWatermarkMs);
      needBaseline.current = false;
    } else {
      setInboxWm(0);
      setOutboxWm(0);
      needBaseline.current = true;
    }
    setHydrated(true);
  }, [identityHex]);

  useEffect(() => {
    if (!identityHex || !hydrated) return;
    if (!needBaseline.current) return;
    const im = maxCreatedMs(inbox);
    const om = maxCreatedMs(outbox);
    if (im === 0 && om === 0) return;
    setInboxWm(im);
    setOutboxWm(om);
    saveMailboxRead(identityHex, {
      inboxWatermarkMs: im,
      outboxWatermarkMs: om,
    });
    needBaseline.current = false;
  }, [identityHex, hydrated, inbox, outbox]);

  useEffect(() => {
    if (!identityHex) return;
    if (activeTab === "inbox") {
      setInboxWm(maxCreatedMs(inbox));
    } else if (activeTab === "outbox") {
      setOutboxWm(maxCreatedMs(outbox));
    }
  }, [activeTab, identityHex, inbox, outbox]);

  useEffect(() => {
    if (!identityHex || !hydrated) return;
    saveMailboxRead(identityHex, {
      inboxWatermarkMs: inboxWm,
      outboxWatermarkMs: outboxWm,
    });
  }, [identityHex, hydrated, inboxWm, outboxWm]);

  const inboxUnreadCount = useMemo(
    () => inbox.filter((m) => messageCreatedMs(m) > inboxWm).length,
    [inbox, inboxWm],
  );

  const outboxUnreadCount = useMemo(
    () => outbox.filter((m) => messageCreatedMs(m) > outboxWm).length,
    [outbox, outboxWm],
  );

  return { inboxUnreadCount, outboxUnreadCount };
}
