import type { ScoreBreakdown as SB } from "@/lib/types";

const ROWS: { key: "frequency" | "consistency" | "diversity" | "uCenter"; label: string; weight: number; hint: string }[] = [
  { key: "frequency", label: "ความถี่", weight: 40, hint: "จำนวนธุรกรรมที่นับ (60 รายการ = เต็ม)" },
  { key: "consistency", label: "ความสม่ำเสมอ", weight: 25, hint: "จำนวนวันที่ใช้ + streak" },
  { key: "diversity", label: "ความหลากหลาย", weight: 20, hint: "หมวดร้าน ประเภทธุรกรรม จำนวนร้าน" },
  { key: "uCenter", label: "ระดับ U-center", weight: 15, hint: "แพ็กเกจสมาชิก U-center" },
];

export default function ScoreBreakdown({ score }: { score: SB }) {
  return (
    <div className="space-y-3">
      {ROWS.map((r) => {
        const v = score[r.key];
        return (
          <div key={r.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">
                {r.label} <span className="text-xs text-muted">×{r.weight}%</span>
              </span>
              <span className="tabular-nums">
                {v.toFixed(1)}
                <span className="text-xs text-muted"> /100</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${v}%` }} />
            </div>
            <p className="mt-0.5 text-xs text-muted">{r.hint}</p>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
        <span className="text-muted">Base Score × Trust</span>
        <span className="tabular-nums">
          {score.baseScore.toFixed(1)} × {score.trustMultiplier.toFixed(2)} ={" "}
          <span className="font-bold text-brand">{score.finalScore.toFixed(1)}</span>
        </span>
      </div>
    </div>
  );
}
