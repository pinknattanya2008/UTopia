import type { Mission } from "@/lib/types";

const CAT = {
  frequency: { label: "ความถี่", icon: "⚡" },
  consistency: { label: "ความสม่ำเสมอ", icon: "🔥" },
  diversity: { label: "ความหลากหลาย", icon: "🧭" },
};

export default function MissionCard({ mission, index }: { mission: Mission; index: number }) {
  const c = CAT[mission.category] ?? CAT.frequency;
  return (
    <div
      className="animate-fade-up flex flex-col rounded-2xl border border-line bg-surface p-4"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">
          {c.icon} {c.label}
        </span>
        <span className="text-muted">เป้าหมาย {mission.targetCount} ครั้ง</span>
      </div>
      <h3 className="font-semibold leading-snug">{mission.title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted">{mission.description}</p>
      <p className="mt-3 text-sm font-semibold text-brand">{mission.scoreImpact}</p>
    </div>
  );
}
