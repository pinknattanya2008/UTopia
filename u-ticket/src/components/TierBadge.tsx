import { tierInfo } from "@/lib/scoring";
import type { TierName } from "@/lib/types";

const STYLE: Record<TierName, string> = {
  Diamond: "bg-cyan-400/15 text-cyan-300 ring-cyan-400/40",
  Gold: "bg-brand/15 text-brand ring-brand/40",
  Silver: "bg-zinc-300/15 text-zinc-200 ring-zinc-300/40",
  General: "bg-zinc-700/40 text-zinc-400 ring-zinc-600/50",
};

export default function TierBadge({ tier, size = "md" }: { tier: TierName; size?: "sm" | "md" | "lg" }) {
  const info = tierInfo(tier);
  const sz = size === "sm" ? "text-xs px-2 py-0.5" : size === "lg" ? "text-base px-3 py-1" : "text-sm px-2.5 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 whitespace-nowrap ${STYLE[tier]} ${sz}`}>
      <span aria-hidden>{info.emoji}</span>
      {tier}
    </span>
  );
}
