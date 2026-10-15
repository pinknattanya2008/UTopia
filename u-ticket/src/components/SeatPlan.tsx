"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CenterFocusStrongOutlinedIcon from "@mui/icons-material/CenterFocusStrongOutlined";
import type { Concert, Section } from "@/lib/types";
import { MAP } from "@/lib/theme";
import { MAP_H, MAP_W, sectionBounds, seatLayout, stageOf, type SeatPos } from "@/lib/venue";

type VB = { x: number; y: number; w: number; h: number };
const FULL: VB = { x: 0, y: 0, w: MAP_W, h: MAP_H };
const MAX_ZOOM = 8;
/** ซูมถึงระดับนี้แล้วจึงกดเลือกที่นั่งได้ (ต่ำกว่านี้ กด = ซูมเข้า section) */
export const SEAT_ZOOM = 2;

export interface SeatPick {
  seat: SeatPos;
  section: Section;
}

const clampVB = (v: VB): VB => {
  const w = Math.min(MAP_W, Math.max(MAP_W / MAX_ZOOM, v.w));
  const h = (w * MAP_H) / MAP_W;
  return { w, h, x: Math.min(MAP_W - w, Math.max(0, v.x)), y: Math.min(MAP_H - h, Math.max(0, v.y)) };
};

/**
 * ผังที่นั่งรวมทั้งงาน: ซูม/เลื่อนได้ (ล้อเมาส์, ลาก, pinch, ปุ่ม) และกดเลือกที่นั่งได้ตรงบนผัง
 * - ซูมน้อย: กด section = ซูมเข้า section นั้น
 * - ซูมมาก: กดที่นั่ง = เลือก/ยกเลิก, hover = ดูรายละเอียด
 * - โซนยืน: กด = เลือกโซน (เลือกจำนวนบัตรที่การ์ดด้านข้าง)
 */
export default function SeatPlan({
  concert,
  availability,
  unavailable,
  selected,
  focusId,
  disabled,
  onSeatClick,
  onSeatHover,
  onStandingClick,
}: {
  concert: Pick<Concert, "template" | "zones" | "sections" | "stage" | "background">;
  availability: Record<string, { capacity: number; available: number }>;
  unavailable: Set<string>;
  selected: string[];
  focusId: string | null;
  disabled?: boolean;
  onSeatClick: (pick: SeatPick) => void;
  onSeatHover: (pick: SeatPick | null) => void;
  onStandingClick: (section: Section) => void;
}) {
  const stage = useMemo(() => stageOf(concert), [concert]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [vb, setVb] = useState<VB>(FULL);
  const vbRef = useRef(vb);
  vbRef.current = vb;
  const zoom = MAP_W / vb.w;
  const seatMode = zoom >= SEAT_ZOOM - 0.01;

  const layouts = useMemo(
    () => concert.sections.map((s) => ({ section: s, ...seatLayout(s, stage) })),
    [concert.sections, stage],
  );
  const seatIndex = useMemo(() => {
    const m = new Map<string, SeatPick>();
    for (const l of layouts) for (const seat of l.seats) m.set(seat.id, { seat, section: l.section });
    return m;
  }, [layouts]);
  const radius = useMemo(() => new Map(layouts.map((l) => [l.section.id, l.r])), [layouts]);

  // ---------------- ซูม / เลื่อน
  const anim = useRef<number | null>(null);
  const animateTo = useCallback((target: VB) => {
    const from = vbRef.current;
    const to = clampVB(target);
    const start = performance.now();
    if (anim.current) cancelAnimationFrame(anim.current);
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 260);
      const e = 1 - (1 - k) ** 3;
      setVb({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e });
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, []);

  const toSvg = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const v = vbRef.current;
    return { x: v.x + ((clientX - r.left) / r.width) * v.w, y: v.y + ((clientY - r.top) / r.height) * v.h };
  };

  const zoomAt = useCallback((factor: number, cx: number, cy: number, animate = false) => {
    const v = vbRef.current;
    const w = v.w / factor;
    const next = { x: cx - ((cx - v.x) / v.w) * w, y: cy - ((cy - v.y) / v.h) * ((w * MAP_H) / MAP_W), w, h: (w * MAP_H) / MAP_W };
    if (animate) animateTo(next);
    else setVb(clampVB(next));
  }, [animateTo]);

  // wheel ต้องเป็น non-passive เพื่อ preventDefault
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toSvg(e.clientX, e.clientY);
      zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; vb: VB; moved: boolean; pinch?: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      vb: vbRef.current,
      moved: false,
      pinch: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) {
      // hover รายละเอียดที่นั่ง (เมาส์)
      if (e.pointerType === "mouse" && seatMode) {
        const id = (e.target as Element).getAttribute?.("data-seat");
        onSeatHover(id ? (seatIndex.get(id) ?? null) : null);
      }
      return;
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (!d) return;
    const pts = [...pointers.current.values()];
    const rect = svgRef.current!.getBoundingClientRect();
    if (pts.length === 2 && d.pinch) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = toSvg((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      zoomAt(dist / d.pinch, mid.x, mid.y);
      d.pinch = dist;
      d.moved = true;
      return;
    }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    setVb(clampVB({ ...d.vb, x: d.vb.x - (dx / rect.width) * d.vb.w, y: d.vb.y - (dy / rect.height) * d.vb.h }));
  };
  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) setTimeout(() => (drag.current = null), 0);
  };

  const onClick = (e: React.MouseEvent) => {
    if (drag.current?.moved || disabled) return;
    const target = e.target as Element;
    const seatIdAttr = target.getAttribute("data-seat");
    const sectionAttr = target.closest("[data-section]")?.getAttribute("data-section");
    if (seatMode && seatIdAttr) {
      const pick = seatIndex.get(seatIdAttr);
      if (pick && !unavailable.has(seatIdAttr)) onSeatClick(pick);
      else if (pick) onSeatHover(pick);
      return;
    }
    const section = concert.sections.find((s) => s.id === sectionAttr);
    if (!section) return;
    if (section.kind === "standing") {
      onStandingClick(section);
      return;
    }
    if (!seatMode) {
      // ซูมเข้า section ให้พอดีกรอบ (อัตราส่วน 4:3)
      const { x, y, w, h } = sectionBounds(section);
      const pad = 24;
      let tw = w + pad * 2;
      let th = h + pad * 2;
      if (tw / th > MAP_W / MAP_H) th = (tw * MAP_H) / MAP_W;
      else tw = (th * MAP_W) / MAP_H;
      tw = Math.min(tw, MAP_W / SEAT_ZOOM);
      th = (tw * MAP_H) / MAP_W;
      animateTo({ x: x + w / 2 - tw / 2, y: y + h / 2 - th / 2, w: tw, h: th });
    }
  };

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const focus = focusId ? seatIndex.get(focusId) : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="aspect-[4/3] h-auto w-full cursor-grab select-none rounded-lg active:cursor-grabbing"
        style={{ touchAction: zoom > 1.05 ? "none" : "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={(e) => {
          endPointer(e);
          if (e.pointerType === "mouse") onSeatHover(null);
        }}
        onClick={onClick}
        role="application"
        aria-label="ผังที่นั่ง ซูมและเลื่อนได้"
      >
        <rect x={0} y={0} width={MAP_W} height={MAP_H} fill={MAP.bg} />
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

        <SeatLayer concert={concert} layouts={layouts} unavailable={unavailable} availability={availability} showHints={!seatMode} />

        {/* ที่นั่งที่เลือก + ที่นั่งที่กำลังดูรายละเอียด */}
        <g pointerEvents="none">
          {[...selectedSet].map((id) => {
            const p = seatIndex.get(id);
            if (!p) return null;
            const r = radius.get(p.section.id) ?? 2;
            return <circle key={id} cx={p.seat.cx} cy={p.seat.cy} r={r * 1.15} fill={MAP.selected} stroke="#fff" strokeWidth={r * 0.3} />;
          })}
          {focus && (
            <circle
              cx={focus.seat.cx}
              cy={focus.seat.cy}
              r={(radius.get(focus.section.id) ?? 2) * 1.9}
              fill="none"
              stroke={MAP.focus}
              strokeWidth={(radius.get(focus.section.id) ?? 2) * 0.4}
            />
          )}
        </g>

        {/* ป้ายชื่อ section (ซ่อนเมื่อซูมเข้าไปเลือกที่นั่ง) */}
        <g pointerEvents="none" opacity={seatMode ? 0 : 1} style={{ transition: "opacity 200ms" }}>
          {concert.sections.map((s) => {
            const a = availability[s.id];
            const { x, y, w, h } = sectionBounds(s);
            return (
              <g key={s.id}>
                <rect x={x + w / 2 - 36} y={y + h / 2 - 20} width={72} height={a ? 38 : 24} rx={10} fill={MAP.labelBg} fillOpacity={0.92} stroke={MAP.grid} />
                <text x={x + w / 2} y={y + h / 2 - 2} textAnchor="middle" fontSize={15} fontWeight={700} fill={MAP.ink}>
                  {s.name.length > 8 ? s.id : s.name}
                </text>
                {a && (
                  <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" fontSize={11} fill={a.available ? MAP.inkMuted : MAP.danger}>
                    {a.available ? `ว่าง ${a.available.toLocaleString("th-TH")}` : "เต็ม"}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* เลขที่นั่ง (ทุก 5 ที่) เหนือแถวแรก เมื่อซูมมากพอ */}
        {zoom >= 3 && (
          <g pointerEvents="none">
            {layouts.map((l) =>
              l.seats
                .filter((s) => s.rowIndex === 0 && (s.num === 1 || s.num % 5 === 0))
                .map((s) => (
                  <text
                    key={`n-${s.id}`}
                    x={l.vertical ? s.cx + (s.cx < MAP_W / 2 ? l.r * 2.6 : -l.r * 2.6) : s.cx}
                    y={l.vertical ? s.cy + l.r * 0.45 : s.cy - l.r * 2}
                    textAnchor="middle"
                    fontSize={l.r * 1.1}
                    fill={MAP.inkMuted}
                  >
                    {s.num}
                  </text>
                )),
            )}
          </g>
        )}

        {/* เลขแถวเมื่อซูมเข้า */}
        {seatMode && (
          <g pointerEvents="none">
            {layouts.map((l) =>
              l.seats
                .filter((s) => s.num === 1)
                .map((s) => (
                  <text
                    key={s.id}
                    x={l.vertical ? s.cx : s.cx - l.r * 2.6}
                    y={l.vertical ? s.cy - l.r * 2.2 : s.cy + l.r * 0.45}
                    textAnchor="middle"
                    fontSize={l.r * 1.3}
                    fill={MAP.inkMuted}
                  >
                    {s.row}
                  </text>
                )),
            )}
          </g>
        )}
      </svg>

      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {[
          { icon: AddIcon, label: "ซูมเข้า", fn: () => zoomAt(1.6, vb.x + vb.w / 2, vb.y + vb.h / 2, true) },
          { icon: RemoveIcon, label: "ซูมออก", fn: () => zoomAt(1 / 1.6, vb.x + vb.w / 2, vb.y + vb.h / 2, true) },
          { icon: CenterFocusStrongOutlinedIcon, label: "ดูทั้งผัง", fn: () => animateTo(FULL) },
        ].map(({ icon: Icon, label, fn }) => (
          <button
            key={label}
            type="button"
            onClick={fn}
            aria-label={label}
            title={label}
            className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white/90 text-foreground hover:border-brand hover:text-brand"
          >
            <Icon fontSize="small" />
          </button>
        ))}
      </div>
      <p className="pointer-events-none absolute bottom-2 left-2 rounded-lg bg-white/90 px-2 py-1 text-[11px] text-muted">
        {seatMode ? "กดที่นั่งเพื่อเลือก · ลากเพื่อเลื่อน" : "กดที่โซนเพื่อซูมเข้าไปเลือกที่นั่ง"} · ซูม {zoom.toFixed(1)}x
      </p>
    </div>
  );
}

/** ชั้นที่นั่งทั้งหมด (หลายพันจุด) — memo ไว้ ไม่ render ใหม่ตอนซูม/เลื่อน/เลือก */
const SeatLayer = memo(function SeatLayer({
  concert,
  layouts,
  unavailable,
  availability,
  showHints,
}: {
  concert: Pick<Concert, "zones" | "sections">;
  layouts: { section: Section; seats: SeatPos[]; r: number }[];
  unavailable: Set<string>;
  availability: Record<string, { capacity: number; available: number }>;
  showHints: boolean;
}) {
  const color = (zoneId: string) => concert.zones.find((z) => z.id === zoneId)?.color ?? "#999";
  return (
    <g>
      {layouts.map(({ section: s, seats, r }) => {
        const c = color(s.zoneId);
        const a = availability[s.id];
        const soldOut = a ? a.available === 0 : false;
        const { x, y, w, h } = s.shape;
        return (
          <g key={s.id} data-section={s.id} className="cursor-pointer">
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              transform={s.rotation ? `rotate(${s.rotation} ${x + w / 2} ${y + h / 2})` : undefined}
              rx={10}
              fill={soldOut ? MAP.sold : c}
              fillOpacity={s.kind === "standing" ? 0.45 : 0.1}
              stroke={c}
              strokeOpacity={0.6}
              strokeWidth={1.5}
            />
            {s.kind === "standing" && showHints && (
              <text x={x + w / 2} y={y + h - 8} textAnchor="middle" fontSize={8} fill={MAP.ink} opacity={0.7} pointerEvents="none">
                บัตรยืน · กดเพื่อเลือกจำนวน
              </text>
            )}
            {seats.map((seat) => (
              <circle key={seat.id} data-seat={seat.id} cx={seat.cx} cy={seat.cy} r={r} fill={unavailable.has(seat.id) ? MAP.sold : c} />
            ))}
          </g>
        );
      })}
    </g>
  );
});
