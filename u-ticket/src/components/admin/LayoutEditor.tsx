"use client";

import { useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import HideImageOutlinedIcon from "@mui/icons-material/HideImageOutlined";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RestoreIcon from "@mui/icons-material/Restore";
import type { MapRect, Section, Zone } from "@/lib/types";
import { MAP } from "@/lib/theme";
import { MAP_H, MAP_W, MAX_ROWS, MAX_SEATS_PER_ROW, removedSet, sectionBounds, sectionCapacity } from "@/lib/venue";

type Background = { image: string; opacity: number } | null;
type Target = "stage" | string; // "stage" หรือ section id

export interface LayoutPatch {
  sections?: Section[];
  stage?: MapRect;
  background?: Background;
}

/** ทุกอย่างบนผังจัดตามกริด 10 หน่วย */
const GRID = 10;
const MIN_W = 40;
const MIN_H = 30;
const MAX_BG_CHARS = 1_900_000;
const snap = (v: number) => Math.round(v / GRID) * GRID;

/** บังคับให้กรอบ (รวมส่วนที่หมุน) อยู่ในผังทั้งหมด */
function clampInside(shape: MapRect, rotation = 0): MapRect {
  const b = sectionBounds({ shape, rotation });
  let dx = 0;
  let dy = 0;
  if (b.x < 0) dx = -b.x;
  else if (b.x + b.w > MAP_W) dx = MAP_W - (b.x + b.w);
  if (b.y < 0) dy = -b.y;
  else if (b.y + b.h > MAP_H) dy = MAP_H - (b.y + b.h);
  return { ...shape, x: Math.round(shape.x + dx), y: Math.round(shape.y + dy) };
}

/** ขนาดที่พอดีกับจำนวนแถว × ที่นั่ง (ช่องละ ~7 หน่วย) */
function fitSize(s: Pick<Section, "rows" | "seatsPerRow">) {
  return {
    w: Math.min(MAP_W, Math.max(MIN_W, snap(s.seatsPerRow * 7 + 16))),
    h: Math.min(MAP_H, Math.max(MIN_H, snap(s.rows * 7 + 16))),
  };
}

/** ย่อรูปให้ไม่เกิน 1600px แล้วแปลงเป็น data URL (JPEG) ให้ขนาดไม่เกินที่ server รับ */
async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("อ่านรูปไม่ได้"));
      i.src = url;
    });
    for (const [maxDim, q] of [
      [1600, 0.85],
      [1280, 0.75],
      [1000, 0.65],
    ] as const) {
      const k = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/jpeg", q);
      if (data.length <= MAX_BG_CHARS) return data;
    }
    throw new Error("รูปใหญ่เกินไป ลองใช้รูปที่เล็กลง");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** คู่ที่วางทับกัน (เทียบกรอบหลังหมุน, ยอมให้ชิดกันได้) */
function findOverlaps(sections: Section[], stage: MapRect): string[] {
  const boxes = [{ name: "เวที", b: stage }, ...sections.map((s) => ({ name: s.name, b: sectionBounds(s) }))];
  const out: string[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const p = boxes[i].b;
      const q = boxes[j].b;
      const ox = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x);
      const oy = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
      if (ox > 2 && oy > 2) out.push(`${boxes[i].name} กับ ${boxes[j].name}`);
    }
  }
  return out;
}

function nextId(prefix: string, used: string[]) {
  for (let i = 1; ; i++) if (!used.includes(`${prefix}${i}`)) return `${prefix}${i}`;
}

/** ช่องตัวเลข + ปุ่ม −/+ */
function NumberStepper({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  onSet,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onSet: (v: number) => void;
}) {
  return (
    <label className="space-y-1 text-xs">
      <span className="text-muted">{label}</span>
      <div className="flex">
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onSet(Math.max(min, value - step))}
          className="grid w-8 shrink-0 place-items-center rounded-l-md border border-line hover:text-brand disabled:opacity-40"
          aria-label={`ลด${label}`}
        >
          <RemoveIcon sx={{ fontSize: 14 }} />
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => onSet(Math.min(max, Math.max(min, Math.round(Number(e.target.value) || min))))}
          className="w-full min-w-0 border-y border-line bg-background px-1 py-1.5 text-center text-sm tabular-nums focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onSet(Math.min(max, value + step))}
          className="grid w-8 shrink-0 place-items-center rounded-r-md border border-line hover:text-brand disabled:opacity-40"
          aria-label={`เพิ่ม${label}`}
        >
          <AddIcon sx={{ fontSize: 14 }} />
        </button>
      </div>
    </label>
  );
}

/**
 * ตัวจัดผังแบบง่าย
 * - บนผัง: กดเพื่อเลือก, ลากเพื่อย้าย (ล็อกกริด 10 หน่วย, อยู่ในกรอบเสมอ), ลูกศรบนคีย์บอร์ดเลื่อนทีละช่อง
 * - ขนาด/หมุน/แถว/ที่นั่ง ปรับที่แผงด้านล่างด้วยปุ่มและช่องตัวเลข
 * - ระหว่างลากอัปเดตเฉพาะในตัวแก้ไข แล้วค่อยส่งค่าให้ฟอร์มตอนปล่อย
 */
export default function LayoutEditor({
  zones,
  sections,
  stage,
  background,
  locked,
  onChange,
}: {
  zones: Zone[];
  sections: Section[];
  stage: MapRect;
  background: Background;
  locked: boolean;
  onChange: (patch: LayoutPatch) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sel, setSel] = useState<Target | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ตำแหน่งชั่วคราวระหว่างลาก
  const [dragShape, setDragShape] = useState<{ target: Target; shape: MapRect } | null>(null);
  const drag = useRef<{ target: Target; start: { x: number; y: number }; orig: MapRect; rot: number; moved: boolean } | null>(null);

  const zoneOf = (id: string) => zones.find((z) => z.id === id);
  const selected = sel && sel !== "stage" ? sections.find((s) => s.id === sel) : undefined;
  const shapeOf = (t: Target) =>
    dragShape?.target === t ? dragShape.shape : t === "stage" ? stage : sections.find((s) => s.id === t)?.shape;

  // ---------------- อัปเดต
  const setSection = (id: string, patch: Partial<Section>) =>
    onChange({
      sections: sections.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        next.shape = clampInside(next.shape, next.rotation ?? 0);
        return { ...next, capacity: sectionCapacity(next) };
      }),
    });

  const commitShape = (t: Target, shape: MapRect) => {
    if (t === "stage") onChange({ stage: clampInside(shape) });
    else setSection(t, { shape });
  };

  // ---------------- ลากเพื่อย้าย
  const toMap = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };

  const onPointerDown = (e: React.PointerEvent, t: Target) => {
    e.stopPropagation();
    setSel(t);
    svgRef.current?.focus({ preventScroll: true });
    if (locked) return;
    const orig = shapeOf(t);
    if (!orig) return;
    const rot = t === "stage" ? 0 : (sections.find((s) => s.id === t)?.rotation ?? 0);
    drag.current = { target: t, start: toMap(e.clientX, e.clientY), orig, rot, moved: false };
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toMap(e.clientX, e.clientY);
    const dx = p.x - d.start.x;
    const dy = p.y - d.start.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return; // กันคลิกเฉย ๆ แล้วขยับ
    d.moved = true;
    setDragShape({ target: d.target, shape: clampInside({ ...d.orig, x: snap(d.orig.x + dx), y: snap(d.orig.y + dy) }, d.rot) });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    if (d?.moved && dragShape) commitShape(d.target, dragShape.shape);
    setDragShape(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!sel || locked) return;
    const step = e.shiftKey ? GRID * 5 : GRID;
    const delta = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[e.key];
    if (!delta) return;
    e.preventDefault();
    const shape = shapeOf(sel);
    if (shape) commitShape(sel, { ...shape, x: shape.x + delta[0], y: shape.y + delta[1] });
  };

  // ---------------- เพิ่ม / สำเนา / ลบ
  function addSection(kind: "seated" | "standing") {
    const id = nextId(kind === "seated" ? "S" : "GA", sections.map((s) => s.id));
    const zoneId = zones[0]?.id ?? "";
    const base: Section =
      kind === "seated"
        ? { id, zoneId, name: id, kind, rows: 10, seatsPerRow: 16, capacity: 0, shape: { x: 330, y: 260, w: 140, h: 90 }, rotation: 0 }
        : { id, zoneId, name: id, kind, rows: 0, seatsPerRow: 0, capacity: 300, shape: { x: 320, y: 260, w: 160, h: 90 }, rotation: 0 };
    if (kind === "seated") base.shape = { ...base.shape, ...fitSize(base) };
    onChange({ sections: [...sections, { ...base, capacity: sectionCapacity(base) }] });
    setSel(id);
  }

  function duplicate() {
    if (!selected) return;
    const id = nextId(selected.id.replace(/\d+$/, "") || "S", sections.map((s) => s.id));
    const copy: Section = {
      ...selected,
      id,
      name: id,
      removedSeats: selected.removedSeats?.map((sid) => `${id}${sid.slice(sid.lastIndexOf("-"))}`),
      shape: clampInside({ ...selected.shape, x: selected.shape.x + 20, y: selected.shape.y + 20 }, selected.rotation ?? 0),
    };
    onChange({ sections: [...sections, { ...copy, capacity: sectionCapacity(copy) }] });
    setSel(id);
  }

  function remove() {
    if (!selected || sections.length <= 1) return;
    onChange({ sections: sections.filter((s) => s.id !== selected.id) });
    setSel(null);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      onChange({ background: { image: await compressImage(file), opacity: background?.opacity ?? 0.5 } });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const btn =
    "flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs transition hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40";
  const input =
    "w-full rounded-md border border-line bg-background px-2 py-1.5 text-sm focus:border-brand focus:outline-none disabled:opacity-50";

  const selShape = sel ? shapeOf(sel) : undefined;
  const stageShape = shapeOf("stage")!;

  return (
    <div className="space-y-3">
      {/* แถบเครื่องมือ */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={btn} onClick={() => addSection("seated")} disabled={locked || sections.length >= 40}>
          <AddIcon fontSize="inherit" /> โซนที่นั่ง
        </button>
        <button type="button" className={btn} onClick={() => addSection("standing")} disabled={locked || sections.length >= 40}>
          <AddIcon fontSize="inherit" /> โซนยืน
        </button>
        <span className="mx-1 h-5 w-px bg-line" />
        <button type="button" className={btn} onClick={() => fileRef.current?.click()} disabled={locked}>
          <ImageOutlinedIcon fontSize="inherit" /> {background ? "เปลี่ยนรูปผัง" : "วางรูปผังสถานที่"}
        </button>
        {background && (
          <>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              ความชัด
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={background.opacity}
                onChange={(e) => onChange({ background: { ...background, opacity: Number(e.target.value) } })}
                className="w-20 accent-[var(--brand)]"
                aria-label="ความชัดของรูปผัง"
              />
            </label>
            <button type="button" className={btn} onClick={() => onChange({ background: null })} disabled={locked}>
              <HideImageOutlinedIcon fontSize="inherit" /> เอารูปออก
            </button>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="rounded-md bg-danger/10 p-2 text-xs text-danger">{error}</p>}

      {/* ผัง */}
      <div className="overflow-hidden rounded-lg border border-line">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="aspect-[4/3] h-auto w-full touch-none select-none bg-[var(--map-bg)] outline-none"
          onPointerDown={() => setSel(null)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="application"
          aria-label="ตัวจัดผังสถานที่"
        >
          <defs>
            <pattern id="ed-grid" width={GRID * 2} height={GRID * 2} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID * 2} 0 L 0 0 0 ${GRID * 2}`} fill="none" stroke={MAP.grid} strokeWidth={1} />
            </pattern>
          </defs>
          <rect width={MAP_W} height={MAP_H} fill="url(#ed-grid)" />
          {background && (
            <image
              href={background.image}
              width={MAP_W}
              height={MAP_H}
              preserveAspectRatio="xMidYMid meet"
              opacity={background.opacity}
              pointerEvents="none"
            />
          )}

          {/* เวที */}
          <g onPointerDown={(e) => onPointerDown(e, "stage")} className={locked ? "" : "cursor-move"}>
            <rect
              x={stageShape.x}
              y={stageShape.y}
              width={stageShape.w}
              height={stageShape.h}
              rx={8}
              fill={MAP.stage}
              stroke={sel === "stage" ? MAP.ink : "none"}
              strokeWidth={3}
            />
            <text
              x={stageShape.x + stageShape.w / 2}
              y={stageShape.y + stageShape.h / 2 + 6}
              textAnchor="middle"
              fontSize={18}
              fontWeight={700}
              fill={MAP.stageText}
              pointerEvents="none"
            >
              STAGE
            </text>
          </g>

          {/* section เป็นบล็อก: ชื่อ + ขนาด + จำนวนที่ (ไม่วาดที่นั่งทีละจุด จะได้ลื่น) */}
          {sections.map((s) => {
            const { x, y, w, h } = shapeOf(s.id)!;
            const rot = s.rotation ?? 0;
            const c = zoneOf(s.zoneId)?.color ?? "#999";
            const isSel = sel === s.id;
            return (
              <g
                key={s.id}
                transform={rot ? `rotate(${rot} ${x + w / 2} ${y + h / 2})` : undefined}
                onPointerDown={(e) => onPointerDown(e, s.id)}
                className={locked ? "" : "cursor-move"}
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={6}
                  fill={c}
                  fillOpacity={s.kind === "standing" ? 0.35 : 0.22}
                  stroke={isSel ? MAP.ink : c}
                  strokeWidth={isSel ? 3 : 1.5}
                  strokeDasharray={s.kind === "standing" ? "6 4" : undefined}
                />
                {/* แถว A อยู่ด้านบนของบล็อก */}
                {s.kind === "seated" && <line x1={x + 6} y1={y + 5} x2={x + w - 6} y2={y + 5} stroke={c} strokeWidth={3} pointerEvents="none" />}
                <text x={x + w / 2} y={y + h / 2 - 2} textAnchor="middle" fontSize={14} fontWeight={700} fill={MAP.ink} pointerEvents="none">
                  {s.name}
                </text>
                <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fontSize={10} fill={MAP.inkMuted} pointerEvents="none">
                  {s.kind === "seated"
                    ? `${s.rows}×${s.seatsPerRow} · ${s.capacity.toLocaleString("th-TH")} ที่`
                    : `ยืน · ${s.capacity.toLocaleString("th-TH")} ที่`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {(() => {
        const overlaps = findOverlaps(sections, stage);
        return overlaps.length ? (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
            มีโซนวางทับกัน: {overlaps.slice(0, 4).join(", ")}
            {overlaps.length > 4 && ` และอีก ${overlaps.length - 4} คู่`} — ลากแยกออกจากกันก่อนเผยแพร่
          </p>
        ) : null;
      })()}
      <p className="text-xs text-muted">
        กดเพื่อเลือก แล้วลากเพื่อย้าย · ลูกศรบนคีย์บอร์ดเลื่อนทีละช่อง (Shift = 5 ช่อง) · เส้นหนาด้านบนของบล็อกคือแถว A ควรหันเข้าหาเวที
      </p>

      {/* รายการ section */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSel("stage")}
          className={`rounded-md border px-2.5 py-0.5 text-xs ${sel === "stage" ? "border-brand text-brand" : "border-line text-muted"}`}
        >
          เวที
        </button>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSel(s.id)}
            className={`flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs ${
              sel === s.id ? "border-brand text-brand" : "border-line text-muted"
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: zoneOf(s.zoneId)?.color }} />
            {s.name} · {s.capacity.toLocaleString("th-TH")}
          </button>
        ))}
      </div>

      {/* แผงตั้งค่าของสิ่งที่เลือก */}
      {sel === "stage" && (
        <div className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-4">
          <p className="text-sm font-semibold sm:col-span-4">เวที</p>
          <NumberStepper label="กว้าง" value={stageShape.w} min={MIN_W} max={MAP_W} step={GRID} disabled={locked} onSet={(v) => commitShape("stage", { ...stageShape, w: v })} />
          <NumberStepper label="สูง" value={stageShape.h} min={MIN_H} max={200} step={GRID} disabled={locked} onSet={(v) => commitShape("stage", { ...stageShape, h: v })} />
        </div>
      )}

      {selected && selShape && (
        <div className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-4">
          <label className="space-y-1 text-xs sm:col-span-2">
            <span className="text-muted">ชื่อ (รหัส {selected.id})</span>
            <input className={input} value={selected.name} disabled={locked} onChange={(e) => setSection(selected.id, { name: e.target.value })} />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted">โซนราคา</span>
            <select className={input} value={selected.zoneId} disabled={locked} onChange={(e) => setSection(selected.id, { zoneId: e.target.value })}>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted">ประเภท</span>
            <select
              className={input}
              value={selected.kind}
              disabled={locked}
              onChange={(e) =>
                setSection(
                  selected.id,
                  e.target.value === "standing"
                    ? { kind: "standing", rows: 0, seatsPerRow: 0, capacity: Math.max(1, selected.capacity), removedSeats: undefined }
                    : { kind: "seated", rows: 10, seatsPerRow: 16 },
                )
              }
            >
              <option value="seated">ที่นั่ง</option>
              <option value="standing">ยืน</option>
            </select>
          </label>

          {selected.kind === "seated" ? (
            <>
              <NumberStepper label="จำนวนแถว" value={selected.rows} min={1} max={MAX_ROWS} disabled={locked} onSet={(v) => setSection(selected.id, { rows: v })} />
              <NumberStepper
                label="ที่นั่งต่อแถว"
                value={selected.seatsPerRow}
                min={1}
                max={MAX_SEATS_PER_ROW}
                disabled={locked}
                onSet={(v) => setSection(selected.id, { seatsPerRow: v })}
              />
            </>
          ) : (
            <div className="sm:col-span-2">
              <NumberStepper
                label="ความจุ (บัตรยืน)"
                value={selected.capacity}
                min={1}
                max={20_000}
                step={50}
                disabled={locked}
                onSet={(v) => setSection(selected.id, { capacity: v })}
              />
            </div>
          )}
          <NumberStepper label="กว้าง" value={selShape.w} min={MIN_W} max={MAP_W} step={GRID} disabled={locked} onSet={(v) => setSection(selected.id, { shape: { ...selShape, w: v } })} />
          <NumberStepper label="สูง" value={selShape.h} min={MIN_H} max={MAP_H} step={GRID} disabled={locked} onSet={(v) => setSection(selected.id, { shape: { ...selShape, h: v } })} />

          <div className="flex flex-wrap items-center gap-1.5 sm:col-span-4">
            <span className="mr-1 text-xs text-muted">หมุน {selected.rotation ?? 0}°</span>
            <button type="button" className={btn} disabled={locked} onClick={() => setSection(selected.id, { rotation: Math.max(-180, (selected.rotation ?? 0) - 15) })}>
              <RotateLeftIcon fontSize="inherit" /> 15°
            </button>
            <button type="button" className={btn} disabled={locked || !selected.rotation} onClick={() => setSection(selected.id, { rotation: 0 })}>
              ตรง 0°
            </button>
            <button type="button" className={btn} disabled={locked} onClick={() => setSection(selected.id, { rotation: Math.min(180, (selected.rotation ?? 0) + 15) })}>
              <RotateRightIcon fontSize="inherit" /> 15°
            </button>
            {selected.kind === "seated" && (
              <button type="button" className={btn} disabled={locked} onClick={() => setSection(selected.id, { shape: { ...selShape, ...fitSize(selected) } })}>
                ขนาดพอดีที่นั่ง
              </button>
            )}
            <span className="ml-auto flex gap-1.5">
              <button type="button" className={btn} onClick={duplicate} disabled={locked || sections.length >= 40}>
                <ContentCopyIcon fontSize="inherit" /> ทำสำเนา
              </button>
              <button type="button" className={`${btn} hover:!border-danger hover:!text-danger`} onClick={remove} disabled={locked || sections.length <= 1}>
                <DeleteOutlineIcon fontSize="inherit" /> ลบ
              </button>
            </span>
          </div>

          {selected.kind === "seated" && removedSet(selected).size > 0 && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted sm:col-span-4">
              มีที่นั่งที่เอาออกไว้ {removedSet(selected).size} ที่ (ทางเดิน)
              <button type="button" className={btn} disabled={locked} onClick={() => setSection(selected.id, { removedSeats: undefined })}>
                <RestoreIcon fontSize="inherit" /> คืนที่นั่งทั้งหมด
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
