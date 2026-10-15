"use client";

import type { Concert } from "@/lib/types";
import { getTemplate, MAP_H, MAP_W } from "@/lib/venue";

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
  concert: Pick<Concert, "template" | "zones" | "sections">;
  availability?: Availability;
  selected?: string | null;
  onSelect?: (sectionId: string) => void;
}) {
  const stage = getTemplate(concert.template).stage;
  const zoneOf = (id: string) => concert.zones.find((z) => z.id === id);

  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-auto w-full select-none" role="group" aria-label="ผังสถานที่">
      <rect x={0} y={0} width={MAP_W} height={MAP_H} rx={24} fill="#111118" />
      <rect x={stage.x} y={stage.y} width={stage.w} height={stage.h} rx={10} fill="#ffd400" />
      <text x={stage.x + stage.w / 2} y={stage.y + stage.h / 2 + 7} textAnchor="middle" fontSize={20} fontWeight={700} fill="#000">
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
        return (
          <g
            key={s.id}
            onClick={clickable ? () => onSelect(s.id) : undefined}
            onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && onSelect(s.id) : undefined}
            role={onSelect ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={`${zone?.name ?? ""} ${s.name}${a ? ` ว่าง ${a.available} ที่` : ""}`}
            aria-pressed={onSelect ? isSel : undefined}
            className={clickable ? "cursor-pointer outline-none [&:focus-visible>rect]:stroke-white" : ""}
          >
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={10}
              fill={soldOut ? "#2a2a38" : (zone?.color ?? "#555")}
              fillOpacity={soldOut ? 1 : isSel ? 0.95 : 0.35 + 0.45 * ratio}
              stroke={isSel ? "#fff" : soldOut ? "#3a3a4a" : (zone?.color ?? "#555")}
              strokeWidth={isSel ? 4 : 1.5}
              className="transition-[fill-opacity,stroke-width] duration-200 hover:fill-opacity-100"
            />
            <text
              x={x + w / 2}
              y={y + h / 2 - (a ? 4 : -6)}
              textAnchor="middle"
              fontSize={Math.min(22, Math.max(13, w / 8))}
              fontWeight={700}
              fill={soldOut ? "#71717a" : isSel ? "#000" : "#fff"}
            >
              {s.name}
            </text>
            {a && (
              <text
                x={x + w / 2}
                y={y + h / 2 + 18}
                textAnchor="middle"
                fontSize={13}
                fill={soldOut ? "#71717a" : isSel ? "#000" : "#e4e4e7"}
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
