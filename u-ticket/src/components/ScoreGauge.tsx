import type { TierName } from "@/lib/types";

const COLOR: Record<TierName, string> = {
  Diamond: "#67e8f9",
  Gold: "#ffd400",
  Silver: "#d4d4d8",
  General: "#71717a",
};

/** เกจครึ่งวงกลมแสดง finalScore 0–100 พร้อมขีด Tier ที่ 40/60/80 */
export default function ScoreGauge({ score, tier }: { score: number; tier: TierName }) {
  const r = 80;
  const len = Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const tick = (v: number) => {
    const a = Math.PI * (1 - v / 100);
    return { x1: 100 + (r - 14) * Math.cos(a), y1: 100 - (r - 14) * Math.sin(a), x2: 100 + (r + 12) * Math.cos(a), y2: 100 - (r + 12) * Math.sin(a) };
  };
  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={`Fan Score ${score} จาก 100`}>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#2a2a38" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke={COLOR[tier]}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.5s" }}
        />
        {[40, 60, 80].map((v) => (
          <line key={v} {...tick(v)} stroke="#0b0b10" strokeWidth="2.5" />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-4xl font-bold tabular-nums leading-none">{score.toFixed(1)}</p>
        <p className="text-xs text-muted">Fan Score / 100</p>
      </div>
    </div>
  );
}
