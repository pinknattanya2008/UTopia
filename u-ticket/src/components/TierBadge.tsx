import TierIcon from "./TierIcon";
import type { TierName } from "@/lib/types";

const STYLE: Record<TierName, string> = {
  Diamond: "bg-sky-50 text-sky-700 ring-sky-200",
  Gold: "bg-amber-50 text-amber-700 ring-amber-200",
  Silver: "bg-slate-50 text-slate-600 ring-slate-200",
  General: "bg-stone-50 text-stone-500 ring-stone-200",
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
