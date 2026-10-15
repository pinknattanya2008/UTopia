"use client";

import { memo, useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import OpenWithIcon from "@mui/icons-material/OpenWith";
import EventSeatOutlinedIcon from "@mui/icons-material/EventSeatOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import HideImageOutlinedIcon from "@mui/icons-material/HideImageOutlined";
import GridOnIcon from "@mui/icons-material/GridOn";
import RestoreIcon from "@mui/icons-material/Restore";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutlined";
import type { MapRect, Section, Zone } from "@/lib/types";
import { MAP } from "@/lib/theme";
import {
  MAP_H,
  MAP_W,
  MAX_ROWS,
  MAX_SEATS_PER_ROW,
  removedSet,
  rotatePoint,
  sectionCapacity,
  seatLayout,
} from "@/lib/venue";

type Background = { image: string; opacity: number } | null;
type Selection = { kind: "section"; id: string } | { kind: "stage" } | null;
type Drag =
  | { type: "move"; target: "stage" | string; start: { x: number; y: number }; orig: MapRect }
  | { type: "resize"; target: "stage" | string; orig: MapRect; rot: number }
  | { type: "rotate"; id: string; center: { x: number; y: number } }
  | { type: "paint"; id: string; remove: boolean; done: Set<string> };

export interface LayoutPatch {
  sections?: Section[];
  stage?: MapRect;
  background?: Background;
}

const MAX_BG_CHARS = 1_900_000;
const snapTo = (v: number, on: boolean, step = 5) => (on ? Math.round(v / step) * step : Math.round(v * 10) / 10);

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

function nextId(prefix: string, used: string[]) {
  for (let i = 1; ; i++) if (!used.includes(`${prefix}${i}`)) return `${prefix}${i}`;
}

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
  const [sel, setSel] = useState<Selection>(null);
  const [mode, setMode] = useState<"layout" | "seats">("layout");
  const [snap, setSnap] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<Drag | null>(null);

  const selected = sel?.kind === "section" ? sections.find((s) => s.id === sel.id) : undefined;
  const zoneOf = (id: string) => zones.find((z) => z.id === id);

  const setSection = (id: string, patch: Partial<Section>) =>
    onChange({
      sections: sections.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        return { ...next, capacity: sectionCapacity(next) };
      }),
    });

  // ---------------- pointer → พิกัดบนผัง
  const toMap = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };

  const shapeOf = (target: "stage" | string) => (target === "stage" ? stage : sections.find((s) => s.id === target)?.shape);
  const applyShape = (target: "stage" | string, shape: MapRect) => {
    if (target === "stage") onChange({ stage: shape });
    else setSection(target, { shape });
  };

  const paintSeat = (d: Extract<Drag, { type: "paint" }>, seatId: string) => {
    if (d.done.has(seatId)) return;
    d.done.add(seatId);
    const s = sections.find((x) => x.id === d.id);
    if (!s) return;
    const set = removedSet(s);
    if (d.remove) set.add(seatId);
    else set.delete(seatId);
    if (s.rows * s.seatsPerRow - set.size < 1) return; // ต้องเหลืออย่างน้อย 1 ที่
    onChange({
      sections: sections.map((x) => (x.id === s.id ? { ...x, removedSeats: [...set], capacity: x.rows * x.seatsPerRow - set.size } : x)),
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    const el = e.target as Element;
    const role = el.getAttribute("data-ed");
    const id = el.getAttribute("data-id") ?? "";
    const p = toMap(e.clientX, e.clientY);

    if (mode === "seats") {
      const seat = el.getAttribute("data-eseat");
      const sid = el.getAttribute("data-sid");
      if (seat && sid) {
        const s = sections.find((x) => x.id === sid)!;
        const d: Drag = { type: "paint", id: sid, remove: !removedSet(s).has(seat), done: new Set() };
        drag.current = d;
        setSel({ kind: "section", id: sid });
        svgRef.current?.setPointerCapture(e.pointerId);
        paintSeat(d, seat);
      }
      return;
    }

    if (!role) {
      setSel(null);
      return;
    }
    const target = role.startsWith("stage") ? "stage" : id;
    setSel(target === "stage" ? { kind: "stage" } : { kind: "section", id });
    const orig = shapeOf(target);
    if (!orig) return;
    if (role.endsWith("body")) drag.current = { type: "move", target, start: p, orig };
    else if (role.endsWith("resize"))
      drag.current = { type: "resize", target, orig, rot: target === "stage" ? 0 : (sections.find((s) => s.id === id)?.rotation ?? 0) };
    else if (role === "rotate") drag.current = { type: "rotate", id, center: { x: orig.x + orig.w / 2, y: orig.y + orig.h / 2 } };
    svgRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toMap(e.clientX, e.clientY);
    if (d.type === "paint") {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const seat = el?.getAttribute("data-eseat");
      if (seat && el?.getAttribute("data-sid") === d.id) paintSeat(d, seat);
      return;
    }
    if (d.type === "move") {
      const nx = snapTo(d.orig.x + p.x - d.start.x, snap);
      const ny = snapTo(d.orig.y + p.y - d.start.y, snap);
      applyShape(d.target, {
        ...d.orig,
        x: Math.min(MAP_W - d.orig.w / 2, Math.max(-d.orig.w / 2, nx)),
        y: Math.min(MAP_H - d.orig.h / 2, Math.max(-d.orig.h / 2, ny)),
      });
    } else if (d.type === "resize") {
      // คำนวณในกรอบก่อนหมุน: มุมซ้ายบนคงที่
      const c = { x: d.orig.x + d.orig.w / 2, y: d.orig.y + d.orig.h / 2 };
      const local = rotatePoint(p.x, p.y, c.x, c.y, -d.rot);
      applyShape(d.target, {
        ...d.orig,
        w: Math.min(MAP_W, Math.max(30, snapTo(local.x - d.orig.x, snap))),
        h: Math.min(MAP_H, Math.max(24, snapTo(local.y - d.orig.y, snap))),
      });
    } else if (d.type === "rotate") {
      let deg = (Math.atan2(p.y - d.center.y, p.x - d.center.x) * 180) / Math.PI + 90;
      if (deg > 180) deg -= 360;
      setSection(d.id, { rotation: snap ? Math.round(deg / 5) * 5 : Math.round(deg) });
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    drag.current = null;
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
  };

  // ---------------- toolbar actions
  function addSection(kind: "seated" | "standing") {
    const id = nextId(kind === "seated" ? "S" : "GA", sections.map((s) => s.id));
    const zoneId = zones[0]?.id ?? "";
    const base: Section =
      kind === "seated"
        ? { id, zoneId, name: id, kind, rows: 8, seatsPerRow: 14, capacity: 0, shape: { x: 320, y: 260, w: 160, h: 100 }, rotation: 0 }
        : { id, zoneId, name: id, kind, rows: 0, seatsPerRow: 0, capacity: 300, shape: { x: 320, y: 260, w: 160, h: 90 }, rotation: 0 };
    onChange({ sections: [...sections, { ...base, capacity: sectionCapacity(base) }] });
    setSel({ kind: "section", id });
    setMode("layout");
  }

  function duplicate() {
    if (!selected) return;
    const id = nextId(selected.id.replace(/\d+$/, "") || "S", sections.map((s) => s.id));
    const copy: Section = { ...selected, id, name: id, shape: { ...selected.shape, x: selected.shape.x + 20, y: selected.shape.y + 20 } };
    delete copy.removedSeats;
    if (selected.removedSeats?.length) {
      copy.removedSeats = selected.removedSeats.map((sid) => `${id}${sid.slice(sid.lastIndexOf("-"))}`);
    }
    onChange({ sections: [...sections, { ...copy, capacity: sectionCapacity(copy) }] });
    setSel({ kind: "section", id });
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
    "w-full rounded-lg border border-line bg-background px-2 py-1.5 text-sm focus:border-brand focus:outline-none disabled:opacity-50";

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex overflow-hidden rounded-md border border-line text-xs">
          <button
            type="button"
            onClick={() => setMode("layout")}
            className={`flex items-center gap-1 px-2.5 py-1.5 ${mode === "layout" ? "bg-brand font-semibold text-white" : "text-muted"}`}
          >
            <OpenWithIcon fontSize="inherit" /> จัดวาง
          </button>
          <button
            type="button"
            onClick={() => setMode("seats")}
            disabled={locked}
            className={`flex items-center gap-1 px-2.5 py-1.5 disabled:opacity-40 ${mode === "seats" ? "bg-brand font-semibold text-white" : "text-muted"}`}
          >
            <EventSeatOutlinedIcon fontSize="inherit" /> แก้ที่นั่ง
          </button>
        </div>
        <button type="button" className={btn} onClick={() => addSection("seated")} disabled={locked || sections.length >= 40}>
          <AddIcon fontSize="inherit" /> ที่นั่ง
        </button>
        <button type="button" className={btn} onClick={() => addSection("standing")} disabled={locked || sections.length >= 40}>
          <PeopleOutlineIcon fontSize="inherit" /> โซนยืน
        </button>
        <button type="button" className={btn} onClick={duplicate} disabled={locked || !selected}>
          <ContentCopyIcon fontSize="inherit" /> สำเนา
        </button>
        <button type="button" className={`${btn} hover:!border-danger hover:!text-danger`} onClick={remove} disabled={locked || !selected || sections.length <= 1}>
          <DeleteOutlineIcon fontSize="inherit" /> ลบ
        </button>
        <button type="button" className={`${btn} ${snap ? "border-brand/60 text-brand" : ""}`} onClick={() => setSnap((v) => !v)}>
          <GridOnIcon fontSize="inherit" /> Snap {snap ? "เปิด" : "ปิด"}
        </button>
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <button type="button" className={btn} onClick={() => fileRef.current?.click()} disabled={locked}>
          <ImageOutlinedIcon fontSize="inherit" /> {background ? "เปลี่ยนรูปผัง" : "วางรูปผัง"}
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
                className="w-20 accent-[#ee6c1f]"
                aria-label="ความโปร่งใสรูปผัง"
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
      {error && <p className="rounded-lg bg-danger/10 p-2 text-xs text-danger">{error}</p>}

      {/* Canvas */}
      <div className="overflow-hidden rounded-lg border border-line">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className={`aspect-[4/3] h-auto w-full touch-none select-none bg-[#fafafa] ${mode === "seats" ? "cursor-crosshair" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          role="application"
          aria-label="ตัวแก้ไขผังสถานที่"
        >
          {/* เส้นกริด */}
          <defs>
            <pattern id="ed-grid" width={20} height={20} patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={MAP.grid} strokeOpacity={0.6} strokeWidth={1} />
            </pattern>
          </defs>
          <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="url(#ed-grid)" />
          {background && (
            <image
              href={background.image}
              x={0}
              y={0}
              width={MAP_W}
              height={MAP_H}
              preserveAspectRatio="xMidYMid meet"
              opacity={background.opacity}
              pointerEvents="none"
            />
          )}

          {/* เวที */}
          <g>
            <rect
              data-ed="stage-body"
              x={stage.x}
              y={stage.y}
              width={stage.w}
              height={stage.h}
              rx={10}
              fill={MAP.stage}
              stroke={sel?.kind === "stage" ? MAP.ink : "none"}
              strokeWidth={3}
              className={mode === "layout" && !locked ? "cursor-move" : ""}
            />
            <text x={stage.x + stage.w / 2} y={stage.y + stage.h / 2 + 7} textAnchor="middle" fontSize={20} fontWeight={700} fill={MAP.stageText} pointerEvents="none">
              STAGE
            </text>
            {sel?.kind === "stage" && mode === "layout" && !locked && (
              <rect data-ed="stage-resize" x={stage.x + stage.w - 7} y={stage.y + stage.h - 7} width={14} height={14} rx={3} fill="#fff" stroke={MAP.ink} className="cursor-nwse-resize" />
            )}
          </g>

          {sections.map((s) => (
            <EditorSection
              key={s.id}
              section={s}
              color={zoneOf(s.zoneId)?.color ?? "#999"}
              stage={stage}
              selected={sel?.kind === "section" && sel.id === s.id}
              mode={mode}
              locked={locked}
            />
          ))}
        </svg>
      </div>
      <p className="text-xs text-muted">
        {mode === "layout"
          ? "ลาก section/เวทีเพื่อย้าย · จุดขาวมุมขวาล่าง = ปรับขนาด · จุดกลมด้านบน = หมุน (ด้านบนของกรอบคือแถว A ควรหันเข้าหาเวที)"
          : "กดหรือลากบนที่นั่งเพื่อเอาออก (ทำทางเดิน/รูปทรงพิเศษ) · กดซ้ำที่จุดโปร่งเพื่อคืนที่นั่ง"}
      </p>

      {/* รายการ section (เลือกง่ายบนมือถือ) */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSel({ kind: "stage" })}
          className={`rounded-full border px-2.5 py-0.5 text-xs ${sel?.kind === "stage" ? "border-brand text-brand" : "border-line text-muted"}`}
        >
          เวที
        </button>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSel({ kind: "section", id: s.id })}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${
              sel?.kind === "section" && sel.id === s.id ? "border-brand text-brand" : "border-line text-muted"
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: zoneOf(s.zoneId)?.color }} />
            {s.name} · {s.capacity.toLocaleString("th-TH")}
          </button>
        ))}
      </div>

      {/* คุณสมบัติของสิ่งที่เลือก */}
      {selected && (
        <div className="grid gap-3 rounded-lg border border-line bg-surface-2/50 p-3 sm:grid-cols-4">
          <label className="space-y-1 text-xs sm:col-span-2">
            <span className="text-muted">ชื่อ section (รหัส {selected.id})</span>
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
                    : { kind: "seated", rows: 8, seatsPerRow: 14 },
                )
              }
            >
              <option value="seated">ที่นั่ง</option>
              <option value="standing">ยืน</option>
            </select>
          </label>
          {selected.kind === "seated" ? (
            <>
              <label className="space-y-1 text-xs">
                <span className="text-muted">จำนวนแถว (สูงสุด {MAX_ROWS})</span>
                <input
                  type="number"
                  min={1}
                  max={MAX_ROWS}
                  className={input}
                  disabled={locked}
                  value={selected.rows}
                  onChange={(e) => setSection(selected.id, { rows: Math.min(MAX_ROWS, Math.max(1, Number(e.target.value) || 1)) })}
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-muted">ที่นั่งต่อแถว (สูงสุด {MAX_SEATS_PER_ROW})</span>
                <input
                  type="number"
                  min={1}
                  max={MAX_SEATS_PER_ROW}
                  className={input}
                  disabled={locked}
                  value={selected.seatsPerRow}
                  onChange={(e) =>
                    setSection(selected.id, { seatsPerRow: Math.min(MAX_SEATS_PER_ROW, Math.max(1, Number(e.target.value) || 1)) })
                  }
                />
              </label>
            </>
          ) : (
            <label className="space-y-1 text-xs sm:col-span-2">
              <span className="text-muted">ความจุ (บัตรยืน)</span>
              <input
                type="number"
                min={1}
                className={input}
                disabled={locked}
                value={selected.capacity}
                onChange={(e) => setSection(selected.id, { capacity: Math.max(1, Number(e.target.value) || 1) })}
              />
            </label>
          )}
          <label className="space-y-1 text-xs sm:col-span-2">
            <span className="text-muted">หมุน {selected.rotation ?? 0}°</span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              disabled={locked}
              value={selected.rotation ?? 0}
              onChange={(e) => setSection(selected.id, { rotation: Number(e.target.value) })}
              className="w-full accent-[#ee6c1f]"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:col-span-4">
            <span className="text-muted">
              ความจุ <span className="font-semibold text-foreground">{selected.capacity.toLocaleString("th-TH")}</span> ที่
              {selected.kind === "seated" && removedSet(selected).size > 0 && ` · เอาออก ${removedSet(selected).size} ที่`}
              {" · "}ตำแหน่ง {Math.round(selected.shape.x)},{Math.round(selected.shape.y)} ขนาด {Math.round(selected.shape.w)}×
              {Math.round(selected.shape.h)}
            </span>
            {selected.kind === "seated" && removedSet(selected).size > 0 && (
              <button type="button" className={btn} disabled={locked} onClick={() => setSection(selected.id, { removedSeats: undefined })}>
                <RestoreIcon fontSize="inherit" /> คืนที่นั่งทั้งหมด
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** section เดียวในตัวแก้ไข — memo ไว้ ลาก section อื่นจะไม่ render ที่นั่งของ section นี้ใหม่ */
const EditorSection = memo(function EditorSection({
  section: s,
  color,
  stage,
  selected,
  mode,
  locked,
}: {
  section: Section;
  color: string;
  stage: MapRect;
  selected: boolean;
  mode: "layout" | "seats";
  locked: boolean;
}) {
  const { x, y, w, h } = s.shape;
  const rot = s.rotation ?? 0;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const { seats, r } = seatLayout(s, stage, { includeRemoved: true });
  const editable = !locked && mode === "layout";
  return (
    <g>
      <g transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}>
        <rect
          data-ed={editable ? "body" : undefined}
          data-id={s.id}
          x={x}
          y={y}
          width={w}
          height={h}
          rx={8}
          fill={color}
          fillOpacity={s.kind === "standing" ? 0.45 : 0.14}
          stroke={selected ? MAP.ink : color}
          strokeWidth={selected ? 2.5 : 1.2}
          strokeDasharray={s.kind === "standing" ? "6 4" : undefined}
          className={editable ? "cursor-move" : ""}
        />
        {s.kind === "seated" && (
          <text x={cx} y={y - 3} textAnchor="middle" fontSize={8} fill={color} pointerEvents="none" opacity={0.9}>
            แถว A
          </text>
        )}
        {selected && editable && (
          <>
            <line x1={cx} y1={y} x2={cx} y2={y - 22} stroke={MAP.ink} strokeWidth={1.5} pointerEvents="none" />
            <circle data-ed="rotate" data-id={s.id} cx={cx} cy={y - 26} r={7} fill="#fff" stroke={MAP.ink} strokeWidth={2} className="cursor-grab" />
            <rect data-ed="resize" data-id={s.id} x={x + w - 7} y={y + h - 7} width={14} height={14} rx={3} fill="#fff" stroke={MAP.ink} strokeWidth={2} className="cursor-nwse-resize" />
          </>
        )}
      </g>
      {seats.map((seat) =>
        seat.removed ? (
          <circle
            key={seat.id}
            data-eseat={mode === "seats" ? seat.id : undefined}
            data-sid={s.id}
            cx={seat.cx}
            cy={seat.cy}
            r={r}
            fill={mode === "seats" ? "transparent" : "none"}
            stroke={color}
            strokeOpacity={mode === "seats" ? 0.6 : 0.15}
            strokeWidth={r * 0.3}
            pointerEvents={mode === "seats" ? "all" : "none"}
          />
        ) : (
          <circle
            key={seat.id}
            data-eseat={mode === "seats" ? seat.id : undefined}
            data-sid={s.id}
            cx={seat.cx}
            cy={seat.cy}
            r={r}
            fill={color}
            opacity={0.9}
            pointerEvents={mode === "seats" ? "all" : "none"}
          />
        ),
      )}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill={MAP.ink} pointerEvents="none" stroke="#fff" strokeWidth={4} paintOrder="stroke">
        {s.name}
      </text>
    </g>
  );
});
