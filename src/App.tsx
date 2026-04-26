import { Loader2 } from "lucide-react";
import { useSpacetimeDB } from "spacetimedb/react";
import SpacetimeMailboxApp from "./features/app/SpacetimeMailboxApp";
export default function App() {
  const { identity, isActive: connected } = useSpacetimeDB();

  if (!connected || !identity) {
    return (
      <div className="min-h-screen bg-apple-black flex flex-col items-center justify-center p-6 font-sans text-white">
        <Loader2 className="w-8 h-8 animate-spin text-apple-blue mb-4" />
        <p className="text-[15px] text-white/70">連線至 時空膠囊…</p>
      </div>
    );
  }
  return <SpacetimeMailboxApp identity={identity} />;
}
