"use client";

import type { Concert } from "@/lib/types";
import { MAP } from "@/lib/theme";
import { MAP_H, MAP_W, sectionBounds, stageOf } from "@/lib/venue";

type Availability = Record<string, { capacity: number; available: number }>;

/**
 * ผังสถานที่แบบ SVG: เวที + บล็อก section สีตามโซนราคา
 * ถ้าส่ง onSelect มา จะกดเลือก section ได้ (section ที่เต็มแล้วกดไม่ได้)
 */
export default function VenueMap({
  concert,
  availability,
  selected,
  onSelect,
}: {
  concert: Pick<Concert, "template" | "zones" | "sections" | "stage" | "background">;
  availability?: Availability;
  selected?: string | null;
  onSelect?: (sectionId: string) => void;
}) {
  const stage = stageOf(concert);
  const zoneOf = (id: string) => concert.zones.find((z) => z.id === id);

  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-auto w-full select-none" role="group" aria-label="ผังสถานที่">
      <rect x={0} y={0} width={MAP_W} height={MAP_H} rx={24} fill={MAP.bg} stroke={MAP.grid} />
      {concert.background && (
        <image
          href={concert.background.image}
          x={0}
          y={0}
          width={MAP_W}
          height={MAP_H}
          preserveAspectRatio="xMidYMid meet"
          opacity={concert.background.opacity}
          pointerEvents="none"
        />
      )}
      <rect x={stage.x} y={stage.y} width={stage.w} height={stage.h} rx={10} fill={MAP.stage} />
      <text x={stage.x + stage.w / 2} y={stage.y + stage.h / 2 + 7} textAnchor="middle" fontSize={20} fontWeight={700} fill={MAP.stageText}>
        STAGE
      </text>

      {concert.sections.map((s) => {
        const zone = zoneOf(s.zoneId);
        const a = availability?.[s.id];
        const soldOut = a ? a.available === 0 : false;
        const isSel = selected === s.id;
        const clickable = !!onSelect && !soldOut;
        const ratio = a ? a.available / Math.max(1, a.capacity) : 1;
        const { x, y, w, h } = s.shape;
        const b = sectionBounds(s);
        return (
          <g
            key={s.id}
            onClick={clickable ? () => onSelect(s.id) : undefined}
            onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && onSelect(s.id) : undefined}
            role={onSelect ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={`${zone?.name ?? ""} ${s.name}${a ? ` ว่าง ${a.available} ที่` : ""}`}
            aria-pressed={onSelect ? isSel : undefined}
            className={clickable ? "cursor-pointer outline-none [&:focus-visible>rect]:stroke-[#3a2a1e]" : ""}
          >
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              transform={s.rotation ? `rotate(${s.rotation} ${x + w / 2} ${y + h / 2})` : undefined}
              rx={10}
              fill={soldOut ? MAP.sold : (zone?.color ?? "#999")}
              fillOpacity={soldOut ? 1 : isSel ? 0.95 : 0.25 + 0.5 * ratio}
              stroke={isSel ? MAP.ink : soldOut ? MAP.soldStroke : (zone?.color ?? "#999")}
              strokeWidth={isSel ? 4 : 1.5}
              className="transition-[fill-opacity,stroke-width] duration-200 hover:fill-opacity-100"
            />
            <text
              x={x + w / 2}
              y={y + h / 2 - (a ? 4 : -6)}
              textAnchor="middle"
              fontSize={Math.min(22, Math.max(13, b.w / 8))}
              fontWeight={700}
              fill={soldOut ? MAP.inkMuted : isSel ? "#fff" : MAP.ink}
            >
              {s.name}
            </text>
            {a && (
              <text
                x={x + w / 2}
                y={y + h / 2 + 18}
                textAnchor="middle"
                fontSize={13}
                fill={soldOut ? MAP.inkMuted : isSel ? "#fff" : MAP.ink}
              >
                {soldOut ? "เต็ม" : `ว่าง ${a.available.toLocaleString("th-TH")}`}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
