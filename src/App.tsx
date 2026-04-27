import { Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useSpacetimeDB } from "spacetimedb/react";
import catLoading from "./assets/images/common/cat1.png";
import { SPACETIME_TOKEN_KEY } from "./features/app/constants";
import SpacetimeMailboxApp from "./features/app/SpacetimeMailboxApp";

const CONNECTING_COPY = [
  "連線至 時空膠囊…",
  "正在喚醒星際通道…",
  "正在同步你的訊息宇宙…",
  "小貓正在幫你檢查訊號…",
  "即將進入膠囊星海…",
] as const;

export default function App() {
  const { identity, isActive: connected } = useSpacetimeDB();
  const [timedOut, setTimedOut] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [softRetryCount, setSoftRetryCount] = useState(0);
  const [copyIndex, setCopyIndex] = useState(0);

  useEffect(() => {
    if (connected && identity) {
      setTimedOut(false);
      setSoftRetryCount(0);
      setCopyIndex(0);
      return;
    }
    const timer = window.setTimeout(() => {
      setTimedOut(true);
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [connected, identity, retryTick]);

  useEffect(() => {
    if (connected && identity) return;
    if (timedOut) return;
    setCopyIndex(0);
    const timer = window.setInterval(() => {
      setCopyIndex((idx) => (idx + 1) % CONNECTING_COPY.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [connected, identity, timedOut, retryTick]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        // 手機切回前景時重啟一次等待流程，觸發連線重試觀察。
        setTimedOut(false);
        setRetryTick((x) => x + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const handleRetry = () => {
    setTimedOut(false);
    setCopyIndex(0);
    setSoftRetryCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        window.location.reload();
        return 0;
      }
      setRetryTick((x) => x + 1);
      return next;
    });
  };

  const handleReLogin = () => {
    localStorage.removeItem(SPACETIME_TOKEN_KEY);
    window.location.reload();
  };

  if (!connected || !identity) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#121319] font-sans text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(240,98,146,0.12),transparent_42%),radial-gradient(circle_at_82%_26%,rgba(255,213,79,0.1),transparent_44%),radial-gradient(circle_at_50%_100%,rgba(167,139,250,0.08),transparent_46%)]" />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6 pb-48">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-[#FFD54F]" />
          {!timedOut ? (
            <p className="text-[15px] text-white/70">{CONNECTING_COPY[copyIndex]}</p>
          ) : (
            <p className="mb-3 text-[15px] font-bold text-amber-200">
              連線失敗：目前網路不穩或會話失效
            </p>
          )}
          {!timedOut ? null : (
            <p className="mb-3 text-center text-[12px] text-white/55">
              請重試連線；若仍失敗可改用重新登入。
            </p>
          )}
          {!timedOut ? null : (
            <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-center text-[12px] text-white/55">
                先嘗試軟重連，連續失敗 3 次會自動重整。
              </p>
              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 text-[13px] font-bold text-white"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  重試
                </button>
                <button
                  type="button"
                  onClick={handleReLogin}
                  className="flex-1 rounded-xl border border-amber-300/40 bg-amber-300/15 px-3 py-2 text-[13px] font-bold text-amber-100"
                >
                  重新登入
                </button>
              </div>
            </div>
          )}
        </div>

        <img
          src={catLoading}
          alt="連線中小貓"
          className="pointer-events-none absolute bottom-0 left-1/2 z-0 w-[min(92vw,28rem)] -translate-x-1/2 select-none object-contain opacity-95"
          draggable={false}
        />
      </div>
    );
  }
  return <SpacetimeMailboxApp identity={identity} />;
}
