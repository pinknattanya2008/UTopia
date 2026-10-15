/**
 * ฝั่งผู้จัดงาน (Organizer/Admin): สร้าง แก้ไข เผยแพร่คอนเสิร์ต + ภาพรวมรายได้
 * ยังไม่มีระบบล็อกอินจริง — ใช้ผู้จัดจำลอง ORGANIZER
 */
import { concertStats, BookingError } from "./booking";
import { getConcert, ORGANIZER, saveState, store } from "./data";
import type { Concert, OrganizerPlan, Section, VenueTemplateId, Zone } from "./types";
import { getTemplate, MAX_ROWS, MAX_SEATS_PER_ROW, PLANS, sectionCapacity, withZoneCapacity, ZONE_COLORS } from "./venue";

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
  sections: { id: string; zoneId: string; rows?: number; seatsPerRow?: number; capacity?: number }[];
  status?: Concert["status"];
}

const clampInt = (v: unknown, min: number, max: number, field: string) => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) throw new BookingError(`${field} ต้องอยู่ระหว่าง ${min}–${max}`);
  return n;
};
const text = (v: unknown, field: string, max = 120) => {
  const s = String(v ?? "").trim();
  if (!s) throw new BookingError(`กรุณากรอก${field}`);
  return s.slice(0, max);
};

/** ตรวจและแปลง input เป็น Concert (section ใช้ตำแหน่งจาก template) */
function buildConcert(input: ConcertInput, base: Pick<Concert, "id" | "createdAt" | "organizerId">): Concert {
  const tpl = getTemplate(input.template);
  const date = Date.parse(input.date);
  const open = Date.parse(input.salesOpenAt);
  if (!Number.isFinite(date) || !Number.isFinite(open)) throw new BookingError("วันที่ไม่ถูกต้อง");
  if (open >= date) throw new BookingError("เวลาเปิดขายต้องอยู่ก่อนวันแสดง");

  const zones: Zone[] = tpl.zones.map((tz, i) => {
    const z = input.zones.find((x) => x.id === tz.id) ?? tz;
    return {
      id: tz.id,
      name: text(z.name, `ชื่อโซน ${tz.id}`, 40),
      priceTHB: clampInt(z.priceTHB, 0, 100_000, `ราคา ${z.name}`),
      view: String(z.view ?? "").slice(0, 80),
      color: /^#[0-9a-f]{6}$/i.test(z.color ?? "") ? z.color! : ZONE_COLORS[i % ZONE_COLORS.length],
      capacity: 0,
    };
  });
  const sections: Section[] = tpl.sections.map((ts) => {
    const s = input.sections.find((x) => x.id === ts.id) ?? ts;
    const zoneId = zones.some((z) => z.id === s.zoneId) ? s.zoneId : ts.zoneId;
    const sec: Section =
      ts.kind === "seated"
        ? {
            ...ts,
            zoneId,
            rows: clampInt(s.rows ?? ts.rows, 1, MAX_ROWS, `จำนวนแถว ${ts.id}`),
            seatsPerRow: clampInt(s.seatsPerRow ?? ts.seatsPerRow, 1, MAX_SEATS_PER_ROW, `ที่นั่งต่อแถว ${ts.id}`),
            capacity: 0,
          }
        : { ...ts, zoneId, capacity: clampInt(s.capacity ?? ts.capacity, 1, 20_000, `ความจุ ${ts.id}`) };
    return { ...sec, capacity: sectionCapacity(sec) };
  });

  return {
    ...base,
    artist: text(input.artist, "ชื่อศิลปิน", 60),
    title: text(input.title, "ชื่องาน"),
    venue: text(input.venue, "สถานที่"),
    date: new Date(date).toISOString(),
    salesOpenAt: new Date(open).toISOString(),
    description: String(input.description ?? "").slice(0, 400),
    template: tpl.id,
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
    input = { ...input, template: current.template, sections: current.sections };
  }
  const updated = buildConcert({ ...input, status: input.status ?? current.status }, current);
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
