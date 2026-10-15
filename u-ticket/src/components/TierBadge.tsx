import TierIcon from "./TierIcon";
import type { TierName } from "@/lib/types";

const STYLE: Record<TierName, string> = {
  Diamond: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30",
  Gold: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  Silver: "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-400/15 dark:text-slate-300 dark:ring-slate-400/30",
  General: "bg-stone-50 text-stone-500 ring-stone-200 dark:bg-zinc-500/15 dark:text-zinc-400 dark:ring-zinc-500/30",
};

export default function TierBadge({ tier, size = "md" }: { tier: TierName; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "text-xs px-2 py-0.5" : size === "lg" ? "text-base px-3 py-1" : "text-sm px-2.5 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 whitespace-nowrap ${STYLE[tier]} ${sz}`}>
      <TierIcon tier={tier} className="text-[1.15em]" />
      {tier}
    </span>
  );
}
