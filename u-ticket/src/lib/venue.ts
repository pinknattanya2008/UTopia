/**
 * ผังสถานที่ (venue templates), ที่นั่ง และโครงสร้างค่าธรรมเนียม
 * ไฟล์นี้ไม่มี value import (ใช้ได้ทั้ง client, server และ node scripts)
 */
import type { OrganizerPlan, Section, VenueTemplateId, Zone } from "./types";

export const MAP_W = 800;
export const MAP_H = 600;
export const ROW_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const MAX_ROWS = ROW_LABELS.length;
export const MAX_SEATS_PER_ROW = 60;

// ---------------------------------------------------------------- รายได้แพลตฟอร์ม

/** ค่าบริการที่ผู้ซื้อจ่ายต่อบัตร 1 ใบ */
export const SERVICE_FEE_PER_TICKET = 40;
/** เวลาล็อกที่นั่งระหว่างชำระเงิน */
export const HOLD_MINUTES = 10;
/** trust ต่ำกว่านี้ซื้อบัตรไม่ได้ (เฉพาะแพ็กเกจ Pro ที่เปิด AI กันบอท) */
export const MIN_TRUST_TO_BUY = 0.5;

export const PLANS: Record<
  OrganizerPlan,
  { name: string; commissionRate: number; tagline: string; features: string[] }
> = {
  basic: {
    name: "Basic",
    commissionRate: 0.05,
    tagline: "ขายบัตรพร้อมผังที่นั่ง",
    features: ["ผังที่นั่งเลือกได้รายที่นั่ง", "e-ticket + ระบบล็อกที่นั่ง", "Dashboard ยอดขายเรียลไทม์"],
  },
  pro: {
    name: "Pro",
    commissionRate: 0.08,
    tagline: "ให้แฟนตัวจริงได้บัตรก่อน",
    features: [
      "ทุกอย่างใน Basic",
      "Presale ตาม Fan Score (Diamond → Gold → Silver)",
      "AI คัดบอท/บัญชีปั๊มแต้มออกก่อนซื้อ",
      "ข้อมูลกลุ่มแฟน (Fan insights)",
    ],
  },
};

// ---------------------------------------------------------------- ที่นั่ง

export function seatId(sectionId: string, rowIndex: number, num: number) {
  return `${sectionId}-${ROW_LABELS[rowIndex]}${num}`;
}

/** "A1-C12" → { sectionId: "A1", row: "C", num: 12 } */
export function parseSeatId(id: string) {
  const i = id.lastIndexOf("-");
  const m = id.slice(i + 1).match(/^([A-Z])(\d+)$/);
  if (i < 0 || !m) return null;
  return { sectionId: id.slice(0, i), row: m[1], rowIndex: ROW_LABELS.indexOf(m[1]), num: Number(m[2]) };
}

export function isValidSeat(section: Section, id: string) {
  const p = parseSeatId(id);
  return (
    !!p &&
    section.kind === "seated" &&
    p.sectionId === section.id &&
    p.rowIndex >= 0 &&
    p.rowIndex < section.rows &&
    p.num >= 1 &&
    p.num <= section.seatsPerRow
  );
}

export function seatLabel(zone: Zone | undefined, section: Section, id?: string) {
  const base = `${zone?.name ?? section.zoneId} · ${section.name}`;
  if (!id) return `${base} (บัตรยืน)`;
  const p = parseSeatId(id);
  return p ? `${base} แถว ${p.row} ที่นั่ง ${p.num}` : base;
}

export function sectionCapacity(s: Pick<Section, "kind" | "rows" | "seatsPerRow" | "capacity">) {
  return s.kind === "seated" ? s.rows * s.seatsPerRow : s.capacity;
}

/** คำนวณ capacity ของ zone จากผลรวมของ section */
export function withZoneCapacity(zones: Zone[], sections: Section[]): Zone[] {
  return zones.map((z) => ({
    ...z,
    capacity: sections.filter((s) => s.zoneId === z.id).reduce((n, s) => n + sectionCapacity(s), 0),
  }));
}

// ---------------------------------------------------------------- Templates

export const ZONE_COLORS = ["#f43f5e", "#ffd400", "#22d3ee", "#a78bfa", "#34d399", "#fb923c"];

type SectionSeed = Omit<Section, "capacity"> & { capacity?: number };

interface Template {
  id: VenueTemplateId;
  name: string;
  description: string;
  stage: { x: number; y: number; w: number; h: number };
  zones: Omit<Zone, "capacity">[];
  sections: SectionSeed[];
}

const seated = (id: string, zoneId: string, rows: number, seatsPerRow: number, shape: Section["shape"], name = id): SectionSeed => ({
  id,
  zoneId,
  name,
  kind: "seated",
  rows,
  seatsPerRow,
  shape,
});
const standing = (id: string, zoneId: string, capacity: number, shape: Section["shape"], name = id): SectionSeed => ({
  id,
  zoneId,
  name,
  kind: "standing",
  rows: 0,
  seatsPerRow: 0,
  capacity,
  shape,
});

export const TEMPLATES: Template[] = [
  {
    id: "arena",
    name: "Arena",
    description: "เวทีด้านหน้า โซนยืนติดเวที + ที่นั่งรอบด้าน (เช่น Impact Arena)",
    stage: { x: 280, y: 16, w: 240, h: 52 },
    zones: [
      { id: "VIP", name: "VIP Standing", priceTHB: 7500, view: "ยืนติดเวที ใกล้ศิลปินที่สุด", color: ZONE_COLORS[0] },
      { id: "A", name: "Zone A", priceTHB: 5500, view: "ที่นั่งชั้นล่าง เห็นเวทีชัด", color: ZONE_COLORS[1] },
      { id: "B", name: "Zone B", priceTHB: 3500, view: "ชั้น 2 มุมเฉียง เห็นจอใหญ่ชัด", color: ZONE_COLORS[2] },
      { id: "C", name: "Zone C", priceTHB: 1800, view: "ชั้นบน ไกลเวที เน้นบรรยากาศ", color: ZONE_COLORS[3] },
    ],
    sections: [
      standing("VIP", "VIP", 300, { x: 270, y: 86, w: 260, h: 84 }, "VIP Standing"),
      seated("A1", "A", 20, 20, { x: 150, y: 188, w: 140, h: 110 }),
      seated("A2", "A", 20, 20, { x: 300, y: 188, w: 200, h: 110 }),
      seated("A3", "A", 20, 20, { x: 510, y: 188, w: 140, h: 110 }),
      seated("B1", "B", 25, 25, { x: 30, y: 120, w: 110, h: 280 }),
      seated("B2", "B", 25, 25, { x: 660, y: 120, w: 110, h: 280 }),
      seated("B3", "B", 25, 25, { x: 150, y: 310, w: 240, h: 90 }),
      seated("B4", "B", 25, 25, { x: 410, y: 310, w: 240, h: 90 }),
      seated("C1", "C", 25, 40, { x: 30, y: 420, w: 180, h: 150 }),
      seated("C2", "C", 25, 40, { x: 220, y: 420, w: 175, h: 150 }),
      seated("C3", "C", 25, 40, { x: 405, y: 420, w: 175, h: 150 }),
      seated("C4", "C", 25, 40, { x: 590, y: 420, w: 180, h: 150 }),
    ],
  },
  {
    id: "theater",
    name: "Theater",
    description: "หอประชุม/โรงละคร ที่นั่งทั้งหมด ชั้นล่าง + ชั้นลอย",
    stage: { x: 220, y: 16, w: 360, h: 56 },
    zones: [
      { id: "P", name: "Premium", priceTHB: 4500, view: "แถวหน้ากลางเวที", color: ZONE_COLORS[0] },
      { id: "O", name: "Orchestra", priceTHB: 2900, view: "ชั้นล่าง เห็นเวทีเต็มตา", color: ZONE_COLORS[1] },
      { id: "BC", name: "Balcony", priceTHB: 1500, view: "ชั้นลอย มองภาพรวมทั้งเวที", color: ZONE_COLORS[3] },
    ],
    sections: [
      seated("P1", "P", 6, 24, { x: 240, y: 92, w: 320, h: 70 }, "Premium"),
      seated("O1", "O", 15, 14, { x: 60, y: 182, w: 200, h: 170 }),
      seated("O2", "O", 15, 22, { x: 280, y: 182, w: 240, h: 170 }),
      seated("O3", "O", 15, 14, { x: 540, y: 182, w: 200, h: 170 }),
      seated("BC1", "BC", 10, 26, { x: 60, y: 400, w: 330, h: 160 }),
      seated("BC2", "BC", 10, 26, { x: 410, y: 400, w: 330, h: 160 }),
    ],
  },
  {
    id: "hall",
    name: "Hall",
    description: "ฮอลล์คอนเสิร์ตยืน + ที่นั่งชั้นลอยด้านหลัง (เช่น Thunder Dome)",
    stage: { x: 200, y: 16, w: 400, h: 56 },
    zones: [
      { id: "FS", name: "Front Standing", priceTHB: 3900, view: "ยืนโซนหน้าเวที", color: ZONE_COLORS[0] },
      { id: "GA", name: "General Standing", priceTHB: 2500, view: "ยืนโซนหลัง พื้นที่กว้าง", color: ZONE_COLORS[2] },
      { id: "SB", name: "Seated Balcony", priceTHB: 3200, view: "ที่นั่งชั้นลอย มองเวทีชัด", color: ZONE_COLORS[4] },
    ],
    sections: [
      standing("FS", "FS", 800, { x: 150, y: 92, w: 500, h: 130 }, "Front Standing"),
      standing("GA", "GA", 1500, { x: 90, y: 240, w: 620, h: 160 }, "General Standing"),
      seated("SB1", "SB", 8, 30, { x: 60, y: 430, w: 330, h: 130 }),
      seated("SB2", "SB", 8, 30, { x: 410, y: 430, w: 330, h: 130 }),
    ],
  },
];

export function getTemplate(id: VenueTemplateId): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

/** สร้าง zones + sections จาก template (capacity คำนวณให้แล้ว) */
export function buildFromTemplate(id: VenueTemplateId): { zones: Zone[]; sections: Section[] } {
  const t = getTemplate(id);
  const sections: Section[] = t.sections.map((s) => ({ ...s, capacity: sectionCapacity({ ...s, capacity: s.capacity ?? 0 }) }));
  const zones = withZoneCapacity(
    t.zones.map((z) => ({ ...z, capacity: 0 })),
    sections,
  );
  return { zones, sections };
}

// ---------------------------------------------------------------- ตำแหน่งที่นั่งบนผัง

type Rect = { x: number; y: number; w: number; h: number };

export interface SeatPos {
  id: string;
  row: string;
  rowIndex: number;
  num: number;
  cx: number;
  cy: number;
}

/**
 * ตำแหน่งที่นั่งทุกที่ใน section บนผัง (หน่วยเดียวกับ viewBox 800×600)
 * - section ปกติ: แถวเรียงจากบนลงล่าง แถว A ใกล้เวที (เวทีอยู่ด้านบน)
 * - section ด้านข้างเวที (ทรงสูง): แถวเรียงในแนวตั้ง แถว A อยู่ฝั่งที่หันเข้าหาเวที
 */
export function seatLayout(section: Section, stage: Rect): { seats: SeatPos[]; r: number; vertical: boolean } {
  if (section.kind !== "seated") return { seats: [], r: 0, vertical: false };
  const { x, y, w, h } = section.shape;
  const pad = Math.min(8, w * 0.05, h * 0.05);
  const stageCx = stage.x + stage.w / 2;
  const vertical = h > w * 1.3 && (x + w <= stage.x + 10 || x >= stage.x + stage.w - 10);
  const leftOfStage = x + w / 2 < stageCx;
  const seats: SeatPos[] = [];
  let r: number;
  if (!vertical) {
    const cw = (w - 2 * pad) / section.seatsPerRow;
    const ch = (h - 2 * pad) / section.rows;
    r = Math.min(cw, ch) * 0.38;
    for (let ri = 0; ri < section.rows; ri++) {
      for (let n = 1; n <= section.seatsPerRow; n++) {
        seats.push({
          id: seatId(section.id, ri, n),
          row: ROW_LABELS[ri],
          rowIndex: ri,
          num: n,
          cx: x + pad + cw * (n - 1) + cw / 2,
          cy: y + pad + ch * ri + ch / 2,
        });
      }
    }
  } else {
    const cw = (w - 2 * pad) / section.rows;
    const ch = (h - 2 * pad) / section.seatsPerRow;
    r = Math.min(cw, ch) * 0.38;
    for (let ri = 0; ri < section.rows; ri++) {
      const col = leftOfStage ? section.rows - 1 - ri : ri;
      for (let n = 1; n <= section.seatsPerRow; n++) {
        seats.push({
          id: seatId(section.id, ri, n),
          row: ROW_LABELS[ri],
          rowIndex: ri,
          num: n,
          cx: x + pad + cw * col + cw / 2,
          cy: y + pad + ch * (n - 1) + ch / 2,
        });
      }
    }
  }
  return { seats, r, vertical };
}

/** 1 หน่วยบนผัง ≈ 0.1 เมตร (ผัง 800 หน่วย ≈ 80 ม.) — ใช้ประมาณระยะห่างจากเวที */
export const METERS_PER_UNIT = 0.1;

/** ระยะ (เมตร) และมุมจากจุด (cx, cy) ถึงขอบหน้าเวทีตรงกลาง */
export function viewFrom(cx: number, cy: number, stage: Rect) {
  const sx = stage.x + stage.w / 2;
  const sy = stage.y + stage.h;
  const dx = cx - sx;
  const dy = Math.max(1, cy - sy);
  const meters = Math.round(Math.hypot(dx, dy) * METERS_PER_UNIT);
  const angle = Math.round((Math.atan2(dx, dy) * 180) / Math.PI); // + = ขวาของเวที (มองจากผู้ชม), - = ซ้าย
  const abs = Math.abs(angle);
  const side = angle < 0 ? "ซ้าย" : "ขวา";
  const angleLabel = abs < 18 ? "ตรงกลางเวที" : abs < 50 ? `เฉียง${side}` : `ด้านข้าง${side}`;
  return { meters, angle, angleLabel };
}
