"use client";

import type { Section, Zone } from "@/lib/types";
import { ROW_LABELS, seatId } from "@/lib/venue";

export interface SeatState {
  sold: string[];
  held: string[];
  mine: string[];
}

/** ผังที่นั่งราย section: แถว A–Z × เลขที่นั่ง กดเลือก/ยกเลิกได้ทีละที่ */
export default function SeatMap({
  section,
  zone,
  state,
  selected,
  onToggle,
  canAddMore,
}: {
  section: Section;
  zone?: Zone;
  state: SeatState;
  selected: Set<string>;
  onToggle: (id: string) => void;
  canAddMore: boolean;
}) {
  const sold = new Set([...state.sold, ...state.held]);
  const color = zone?.color ?? "#ffd400";
  return (
    <div>
      <div className="mx-auto mb-3 w-1/2 rounded-b-xl bg-surface-2 py-1 text-center text-xs text-muted">ทิศทางเวที</div>
      <div className="overflow-x-auto pb-2">
        <div className="mx-auto w-max space-y-1">
          {Array.from({ length: section.rows }, (_, r) => (
            <div key={r} className="flex items-center gap-1">
              <span className="w-5 shrink-0 text-center text-[10px] text-muted">{ROW_LABELS[r]}</span>
              {Array.from({ length: section.seatsPerRow }, (_, i) => {
                const n = i + 1;
                const id = seatId(section.id, r, n);
                const taken = sold.has(id);
                const isSel = selected.has(id);
                const disabled = taken || (!isSel && !canAddMore);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggle(id)}
                    title={taken ? `แถว ${ROW_LABELS[r]} ที่ ${n} — ไม่ว่าง` : `แถว ${ROW_LABELS[r]} ที่ ${n}`}
                    aria-label={`แถว ${ROW_LABELS[r]} ที่นั่ง ${n}${taken ? " ไม่ว่าง" : isSel ? " เลือกแล้ว" : ""}`}
                    aria-pressed={isSel}
                    className={`h-[18px] w-[18px] shrink-0 rounded-t-md rounded-b-sm text-[8px] leading-none transition ${
                      taken
                        ? "cursor-not-allowed bg-zinc-700/70"
                        : isSel
                          ? "bg-white font-bold text-black ring-2 ring-white"
                          : disabled
                            ? "cursor-not-allowed opacity-40"
                            : "hover:scale-125"
                    }`}
                    style={!taken && !isSel ? { backgroundColor: color } : undefined}
                  >
                    {isSel ? n : ""}
                  </button>
                );
              })}
              <span className="w-5 shrink-0 text-center text-[10px] text-muted">{ROW_LABELS[r]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} /> ว่าง
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-white" /> ที่คุณเลือก
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-zinc-700" /> ไม่ว่าง
        </span>
      </div>
    </div>
  );
}
