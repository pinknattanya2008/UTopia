"use client";

import ScheduleIcon from "@mui/icons-material/Schedule";
import { CLOCK_PRESETS } from "@/lib/clock";
import { fmtTime } from "@/lib/client";
import { useUser } from "./UserProvider";

/** แถบเลือกเวลาจำลอง (เดโม) ให้เห็นการเปิดขายเป็นรอบตาม Tier */
export default function DemoClock({ salesOpenAt }: { salesOpenAt: string }) {
  const { clock, setClock } = useUser();
  const open = Date.parse(salesOpenAt);
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
        <ScheduleIcon fontSize="inherit" /> เวลาจำลอง (เดโม) — เปิดขายทั่วไป {fmtTime(salesOpenAt)} น.
      </p>
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {CLOCK_PRESETS.map((p) => (
          <button
            key={p.offsetMinutes}
            onClick={() => setClock(p.offsetMinutes)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
              clock === p.offsetMinutes ? "border-brand bg-brand font-semibold text-black" : "border-line text-muted hover:border-brand hover:text-brand"
            }`}
          >
            {fmtTime(new Date(open + p.offsetMinutes * 60_000).toISOString())} · {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
