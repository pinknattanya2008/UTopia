/**
 * ฝั่งผู้จัดงาน (Organizer/Admin): สร้าง แก้ไข เผยแพร่คอนเสิร์ต + ภาพรวมรายได้
 * ยังไม่มีระบบล็อกอินจริง — ใช้ผู้จัดจำลอง ORGANIZER
 */
import { concertStats, BookingError } from "./booking";
import { getConcert, ORGANIZER, saveState, store } from "./data";
import type { Concert, MapRect, OrganizerPlan, Section, VenueTemplateId, Zone } from "./types";
import {
  getTemplate,
  MAP_H,
  MAP_W,
  MAX_ROWS,
  MAX_SEATS_PER_ROW,
  PLANS,
  removedSet,
  sectionCapacity,
  withZoneCapacity,
  ZONE_COLORS,
} from "./venue";

export interface ConcertInput {
  artist: string;
  title: string;
  venue: string;
  date: string; // ISO
  salesOpenAt: string; // ISO
  description?: string;
  template: VenueTemplateId;
  plan: OrganizerPlan;
  maxTicketsPerUser: number;
  zones: { id: string; name: string; priceTHB: number; view: string; color?: string }[];
  sections: Partial<Section>[];
  stage?: MapRect;
  background?: { image: string; opacity: number } | null;
  status?: Concert["status"];
}

const clampInt = (v: unknown, min: number, max: number, field: string) => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) throw new BookingError(`${field} ต้องอยู่ระหว่าง ${min}–${max}`);
  return n;
};
const clampNum = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 10) / 10)) : fallback;
};
const text = (v: unknown, field: string, max = 120) => {
  const s = String(v ?? "").trim();
  if (!s) throw new BookingError(`กรุณากรอก${field}`);
  return s.slice(0, max);
};

const ID_RE = /^[A-Za-z0-9]{1,8}$/;
const TEMPLATE_IDS: VenueTemplateId[] = ["arena", "theater", "hall", "custom"];
/** รูปผังที่อัปโหลด (data URL) ไม่เกิน ~2 MB */
export const MAX_BACKGROUND_CHARS = 2_000_000;

function rect(v: Partial<MapRect> | undefined, fallback: MapRect): MapRect {
  const w = clampNum(v?.w, 20, MAP_W, fallback.w);
  const h = clampNum(v?.h, 20, MAP_H, fallback.h);
  return { x: clampNum(v?.x, -w / 2, MAP_W - w / 2, fallback.x), y: clampNum(v?.y, -h / 2, MAP_H - h / 2, fallback.y), w, h };
}

/** ตรวจและแปลง input เป็น Concert — ผังเป็นแบบอิสระ (section/เวที/รูปพื้นหลังจากผู้จัด) */
function buildConcert(input: ConcertInput, base: Pick<Concert, "id" | "createdAt" | "organizerId">): Concert {
  const templateId = TEMPLATE_IDS.includes(input.template) ? input.template : "custom";
  const tpl = getTemplate(templateId);
  const date = Date.parse(input.date);
  const open = Date.parse(input.salesOpenAt);
  if (!Number.isFinite(date) || !Number.isFinite(open)) throw new BookingError("วันที่ไม่ถูกต้อง");
  if (open >= date) throw new BookingError("เวลาเปิดขายต้องอยู่ก่อนวันแสดง");

  // ---- โซนราคา
  const zoneInputs = Array.isArray(input.zones) ? input.zones : [];
  if (zoneInputs.length < 1 || zoneInputs.length > 8) throw new BookingError("ต้องมีโซนราคา 1–8 โซน");
  const zoneIds = new Set<string>();
  const zones: Zone[] = zoneInputs.map((z, i) => {
    if (!ID_RE.test(z.id ?? "") || zoneIds.has(z.id)) throw new BookingError(`รหัสโซน "${z.id}" ไม่ถูกต้องหรือซ้ำ`);
    zoneIds.add(z.id);
    return {
      id: z.id,
      name: text(z.name, `ชื่อโซน ${z.id}`, 40),
      priceTHB: clampInt(z.priceTHB, 0, 100_000, `ราคา ${z.name}`),
      view: String(z.view ?? "").slice(0, 80),
      color: /^#[0-9a-f]{6}$/i.test(z.color ?? "") ? z.color! : ZONE_COLORS[i % ZONE_COLORS.length],
      capacity: 0,
    };
  });

  // ---- Section
  const secInputs = Array.isArray(input.sections) ? input.sections : [];
  if (secInputs.length < 1 || secInputs.length > 40) throw new BookingError("ต้องมี section 1–40 ส่วน");
  const secIds = new Set<string>();
  const sections: Section[] = secInputs.map((s) => {
    const id = String(s.id ?? "");
    if (!ID_RE.test(id) || secIds.has(id)) throw new BookingError(`รหัส section "${id}" ต้องเป็นตัวอักษร/ตัวเลข 1–8 ตัวและไม่ซ้ำ`);
    secIds.add(id);
    if (!zoneIds.has(s.zoneId ?? "")) throw new BookingError(`section ${id} ยังไม่ได้เลือกโซนราคา`);
    const kind = s.kind === "standing" ? "standing" : "seated";
    const shape = rect(s.shape, { x: 300, y: 250, w: 200, h: 120 });
    const rotation = s.rotation === undefined || s.rotation === null ? undefined : clampNum(s.rotation, -180, 180, 0);
    const sec: Section =
      kind === "seated"
        ? {
            id,
            zoneId: s.zoneId!,
            name: String(s.name ?? id).trim().slice(0, 20) || id,
            kind,
            rows: clampInt(s.rows, 1, MAX_ROWS, `จำนวนแถว ${id}`),
            seatsPerRow: clampInt(s.seatsPerRow, 1, MAX_SEATS_PER_ROW, `ที่นั่งต่อแถว ${id}`),
            capacity: 0,
            shape,
            ...(rotation !== undefined ? { rotation } : {}),
          }
        : {
            id,
            zoneId: s.zoneId!,
            name: String(s.name ?? id).trim().slice(0, 20) || id,
            kind,
            rows: 0,
            seatsPerRow: 0,
            capacity: clampInt(s.capacity, 1, 20_000, `ความจุ ${id}`),
            shape,
            ...(rotation !== undefined ? { rotation } : {}),
          };
    if (kind === "seated" && Array.isArray(s.removedSeats) && s.removedSeats.length) {
      const removed = [...removedSet({ ...sec, removedSeats: s.removedSeats.map(String) })];
      if (removed.length) sec.removedSeats = removed.sort();
    }
    sec.capacity = sectionCapacity(sec);
    if (sec.capacity < 1) throw new BookingError(`section ${id} ต้องเหลือที่นั่งอย่างน้อย 1 ที่`);
    return sec;
  });
  if (sections.reduce((n, s) => n + s.capacity, 0) > 100_000) throw new BookingError("ความจุรวมต้องไม่เกิน 100,000 ที่");

  // ---- เวทีและรูปพื้นหลัง
  const stage = input.stage ? rect(input.stage, tpl.stage) : undefined;
  let background: Concert["background"];
  if (input.background?.image) {
    const img = String(input.background.image);
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(img)) throw new BookingError("รูปผังต้องเป็น PNG, JPEG หรือ WebP");
    if (img.length > MAX_BACKGROUND_CHARS) throw new BookingError("รูปผังใหญ่เกินไป (ไม่เกิน ~1.5 MB)");
    background = { image: img, opacity: clampNum(input.background.opacity, 0.05, 1, 0.5) };
  }

  return {
    ...base,
    artist: text(input.artist, "ชื่อศิลปิน", 60),
    title: text(input.title, "ชื่องาน"),
    venue: text(input.venue, "สถานที่"),
    date: new Date(date).toISOString(),
    salesOpenAt: new Date(open).toISOString(),
    description: String(input.description ?? "").slice(0, 400),
    template: templateId,
    ...(stage ? { stage } : {}),
    ...(background ? { background } : {}),
    plan: input.plan === "basic" ? "basic" : "pro",
    maxTicketsPerUser: clampInt(input.maxTicketsPerUser, 1, 10, "จำนวนบัตรสูงสุดต่อบัญชี"),
    zones: withZoneCapacity(zones, sections),
    sections,
    status: input.status === "published" ? "published" : "draft",
  };
}

function hasSales(id: string) {
  return store.bookings.some((b) => b.concertId === id && (b.status === "paid" || b.status === "held")) || store.presold.has(id);
}

export function createConcert(input: ConcertInput): Concert {
  const next = Math.max(0, ...store.concerts.map((c) => Number(c.id.replace(/\D/g, "")) || 0)) + 1;
  const concert = buildConcert(input, { id: `c${next}`, createdAt: new Date().toISOString(), organizerId: ORGANIZER.id });
  store.concerts.push(concert);
  saveState();
  return concert;
}

export function updateConcert(id: string, input: ConcertInput): Concert {
  const current = getConcert(id);
  if (!current) throw new BookingError("ไม่พบคอนเสิร์ต", 404);
  if (hasSales(id)) {
    // มียอดขายแล้ว: ล็อกผังที่นั่งไว้ แก้ได้เฉพาะข้อมูลงานและราคา
    input = {
      ...input,
      template: current.template,
      sections: current.sections,
      stage: current.stage,
      zones: current.zones.map((z) => ({ ...z, ...input.zones.find((x) => x.id === z.id), id: z.id })),
      status: current.status,
    };
  }
  const updated = buildConcert({ ...input, status: input.status ?? current.status }, current);
  // ล้าง field ที่ถูกเอาออก (เช่น ลบรูปพื้นหลัง) แล้วค่อยใส่ค่าใหม่
  for (const k of Object.keys(current) as (keyof Concert)[]) if (!(k in updated)) delete current[k];
  Object.assign(current, updated);
  saveState();
  return current;
}

export function setConcertStatus(id: string, status: Concert["status"]) {
  const c = getConcert(id);
  if (!c) throw new BookingError("ไม่พบคอนเสิร์ต", 404);
  if (status === "draft" && hasSales(id)) throw new BookingError("มียอดขายแล้ว ยกเลิกการเผยแพร่ไม่ได้", 409);
  c.status = status;
  saveState();
  return c;
}

export function deleteConcert(id: string) {
  const c = getConcert(id);
  if (!c) throw new BookingError("ไม่พบคอนเสิร์ต", 404);
  if (c.status !== "draft" || hasSales(id)) throw new BookingError("ลบได้เฉพาะงานที่เป็นร่างและยังไม่มียอดขาย", 409);
  store.concerts = store.concerts.filter((x) => x.id !== id);
  saveState();
}

export function adminOverview() {
  const concerts = store.concerts
    .filter((c) => c.organizerId === ORGANIZER.id)
    .map((c) => ({
      id: c.id,
      title: c.title,
      artist: c.artist,
      venue: c.venue,
      date: c.date,
      salesOpenAt: c.salesOpenAt,
      status: c.status,
      plan: c.plan,
      stats: concertStats(c),
    }));
  const sum = (k: "gross" | "commission" | "serviceFees" | "discounts" | "platformRevenue" | "organizerPayout" | "ticketsSold") =>
    concerts.reduce((n, c) => n + c.stats[k], 0);
  return {
    organizer: ORGANIZER,
    plans: PLANS,
    concerts,
    totals: {
      concerts: concerts.length,
      published: concerts.filter((c) => c.status === "published").length,
      ticketsSold: sum("ticketsSold"),
      gross: sum("gross"),
      commission: sum("commission"),
      serviceFees: sum("serviceFees"),
      discounts: sum("discounts"),
      platformRevenue: sum("platformRevenue"),
      organizerPayout: sum("organizerPayout"),
      blockedAttempts: concerts.reduce((n, c) => n + c.stats.blockedAttempts, 0),
    },
  };
}
