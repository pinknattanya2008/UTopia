/**
 * ระบบขายบัตร: สิทธิ์การซื้อตาม Tier, ล็อกที่นั่ง, ชำระเงิน (จำลอง), สรุปยอดขาย
 * ข้อมูลการจองอยู่ใน Supabase — ล็อกที่นั่ง/ชำระเงิน/ยกเลิก ทำผ่านฟังก์ชัน Postgres (ครบทั้งชุดหรือไม่ทำเลย)
 * ตาราง seat_locks มี primary key (concert_id, seat_id) จึงจองที่นั่งเดียวกันซ้ำไม่ได้แม้มีหลาย server
 */
import { CLOCK_PRESETS } from "./clock";
import { getConcert, getRewards, getUser, getUsers, invalidate, presoldOf } from "./data";
import { BookingError } from "./errors";
import { getScore, getTrust } from "./fan";
import { bookingToRow, rowToBooking, type BookingRow } from "./mappers";
import { tierInfo, TIERS } from "./scoring";
import { db, selectAll } from "./supabase/admin";
import type { Booking, BookingItem, Concert, TierName, User } from "./types";
import { HOLD_MINUTES, isValidSeat, MIN_TRUST_TO_BUY, PLANS, seatLabel, SERVICE_FEE_PER_TICKET } from "./venue";

export { BookingError };

// ---------------------------------------------------------------- เวลา & สิทธิ์

function clampClock(offset: number | undefined) {
  const allowed: number[] = CLOCK_PRESETS.map((c) => c.offsetMinutes);
  return allowed.includes(Number(offset)) ? Number(offset) : 0;
}

export interface AccessInfo {
  allowed: boolean;
  code: "ok" | "not_published" | "blocked_trust" | "not_yet";
  message: string;
  tier: TierName;
  finalScore: number;
  trustMultiplier: number;
  presale: boolean; // คอนนี้ใช้ presale ตาม Tier หรือไม่ (แพ็กเกจ Pro)
  opensAt: string; // เวลาที่ผู้ใช้คนนี้เข้าซื้อได้
  now: string; // เวลาจำลองตอนนี้
  maxTickets: number;
  ticketsUsed: number; // ที่ซื้อไปแล้วในคอนนี้
}

/** จำนวนบัตรที่ผู้ใช้ซื้อแล้วในคอนนี้ */
async function ticketsUsed(concertId: string, userId: string) {
  const { data, error } = await db().from("bookings").select("items").eq("concert_id", concertId).eq("user_id", userId).eq("status", "paid");
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((n, b: { items: unknown[] }) => n + b.items.length, 0);
}

/**
 * ตรวจว่าผู้ใช้ซื้อบัตรคอนนี้ได้หรือยัง
 * @param clockOffset เวลาจำลอง (นาที) เทียบกับเวลาเปิดขายทั่วไป เช่น -60 = 1 ชม. ก่อนเปิดขาย
 */
export async function checkAccess(concert: Concert, user: User, clockOffset?: number): Promise<AccessInfo> {
  const { score } = getScore(user);
  const trust = getTrust(user).value;
  const presale = concert.plan === "pro";
  const open = Date.parse(concert.salesOpenAt);
  const now = open + clampClock(clockOffset) * 60_000;
  const lead = presale ? tierInfo(score.tier).leadMinutes : 0;
  const opensAt = open - lead * 60_000;

  const base = {
    tier: score.tier,
    finalScore: score.finalScore,
    trustMultiplier: trust.trustMultiplier,
    presale,
    opensAt: new Date(opensAt).toISOString(),
    now: new Date(now).toISOString(),
    maxTickets: concert.maxTicketsPerUser,
    ticketsUsed: await ticketsUsed(concert.id, user.id),
  };
  if (concert.status !== "published") {
    return { ...base, allowed: false, code: "not_published", message: "คอนเสิร์ตนี้ยังไม่เปิดขาย" };
  }
  if (presale && (trust.trustMultiplier < MIN_TRUST_TO_BUY || trust.isLikelyBot)) {
    return {
      ...base,
      allowed: false,
      code: "blocked_trust",
      message: `ระบบ AI ตรวจพบพฤติกรรมผิดปกติ จึงระงับสิทธิ์ซื้อบัตรชั่วคราว: ${trust.reasons[0] ?? ""}`,
    };
  }
  if (now < opensAt) {
    return {
      ...base,
      allowed: false,
      code: "not_yet",
      message: presale ? `รอบของ Tier ${score.tier} ยังไม่เปิด` : "ยังไม่ถึงเวลาเปิดขาย",
    };
  }
  return { ...base, allowed: true, code: "ok", message: presale ? `รอบของ Tier ${score.tier} เปิดแล้ว` : "เปิดขายแล้ว" };
}

/** บันทึกบัญชีที่ AI กันไม่ให้ซื้อ (นับไม่ซ้ำต่อคอน) */
export async function recordBlocked(concertId: string, userId: string) {
  await db().from("blocked_attempts").upsert({ concert_id: concertId, user_id: userId }, { ignoreDuplicates: true });
}

// ---------------------------------------------------------------- Occupancy

type LockRow = { seat_id: string; bookings: { status: string; user_id: string; hold_expires_at: string } };
type ActiveRow = { items: BookingItem[]; status: string; hold_expires_at: string };

const isActive = (status: string, holdExpiresAt: string) =>
  status === "paid" || (status === "held" && Date.parse(holdExpiresAt) > Date.now());

/** สถานะที่นั่งทั้งงาน: ยอดขายตั้งต้น + ที่นั่งที่ล็อก/ขายแล้วใน DB (ล็อกที่หมดเวลาถือว่าว่าง) */
async function occupancy(concert: Concert) {
  const [locks, active] = await Promise.all([
    selectAll<LockRow>((a, b) =>
      db().from("seat_locks").select("seat_id, bookings!inner(status, user_id, hold_expires_at)").eq("concert_id", concert.id).range(a, b),
    ),
    selectAll<ActiveRow>((a, b) =>
      db().from("bookings").select("items, status, hold_expires_at").eq("concert_id", concert.id).in("status", ["held", "paid"]).range(a, b),
    ),
  ]);
  const presold = presoldOf(concert);
  const sold = new Set(presold.seats);
  const held = new Map<string, string>(); // seatId → userId
  for (const l of locks) {
    if (!isActive(l.bookings.status, l.bookings.hold_expires_at)) continue;
    if (l.bookings.status === "paid") sold.add(l.seat_id);
    else held.set(l.seat_id, l.bookings.user_id);
  }
  const standing = new Map<string, number>(presold.standing);
  for (const b of active) {
    if (!isActive(b.status, b.hold_expires_at)) continue;
    for (const it of b.items) if (!it.seatId) standing.set(it.sectionId, (standing.get(it.sectionId) ?? 0) + 1);
  }
  return { sold, held, standing };
}

function availabilityFrom(concert: Concert, occ: Awaited<ReturnType<typeof occupancy>>) {
  const takenBySection = new Map<string, number>();
  for (const id of [...occ.sold, ...occ.held.keys()]) {
    const sec = id.slice(0, id.lastIndexOf("-"));
    takenBySection.set(sec, (takenBySection.get(sec) ?? 0) + 1);
  }
  return Object.fromEntries(
    concert.sections.map((s) => {
      const taken = s.kind === "standing" ? (occ.standing.get(s.id) ?? 0) : (takenBySection.get(s.id) ?? 0);
      return [s.id, { capacity: s.capacity, available: Math.max(0, s.capacity - taken) }];
    }),
  );
}

/** จำนวนที่ว่างต่อ section (สำหรับผังรวม) */
export async function sectionAvailability(concert: Concert) {
  return availabilityFrom(concert, await occupancy(concert));
}

/** สถานะที่นั่งราย section หรือทั้งงาน (sectionId = null) */
export async function sectionSeats(concert: Concert, sectionId: string | null, userId: string) {
  const occ = await occupancy(concert);
  const prefix = sectionId ? `${sectionId}-` : "";
  const sold: string[] = [];
  const held: string[] = [];
  const mine: string[] = [];
  for (const id of occ.sold) if (id.startsWith(prefix)) sold.push(id);
  for (const [id, uid] of occ.held) if (id.startsWith(prefix)) (uid === userId ? mine : held).push(id);
  return { sold, held, mine };
}

// ---------------------------------------------------------------- Hold / Confirm / Cancel

export interface HoldRequest {
  concertId: string;
  seats?: string[]; // seat ids (seated)
  standing?: { sectionId: string; qty: number }[];
  clock?: number;
}

function newCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `UT-${s}`;
}

/** แปลง error จากฟังก์ชัน Postgres เป็นข้อความภาษาไทย */
function dbError(err: { code?: string; message: string }, concert?: Concert): BookingError {
  if (err.code === "23505") return new BookingError("มีคนจองที่นั่งบางที่ไปก่อนแล้ว กรุณาเลือกใหม่", 409);
  const [tag, a, b] = err.message.split(":");
  switch (tag) {
    case "LIMIT":
      return new BookingError(`ซื้อได้สูงสุด ${concert?.maxTicketsPerUser ?? "-"} ใบต่อบัญชี (ซื้อไปแล้ว ${a} ใบ)`);
    case "STANDING": {
      const name = concert?.sections.find((s) => s.id === a)?.name ?? a;
      return new BookingError(`${name} เหลือ ${b} ใบ`, 409);
    }
    case "NOT_FOUND":
      return new BookingError("ไม่พบรายการ", 404);
    case "NOT_HELD":
      return new BookingError(a === "expired" ? "หมดเวลาชำระเงิน ที่นั่งถูกปล่อยแล้ว" : "รายการนี้ชำระไม่ได้", 409);
    case "EXPIRED":
      return new BookingError("หมดเวลาชำระเงิน ที่นั่งถูกปล่อยแล้ว", 409);
    case "POINTS":
      return new BookingError("แต้มไม่พอสำหรับส่วนลดนี้");
    case "BOOST_USED":
      return new BookingError("ใช้ Presale Boost ในรอบนี้ไปแล้ว", 409);
    default:
      console.error(err);
      return new BookingError("ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง", 500);
  }
}

export async function holdSeats(userId: string, req: HoldRequest): Promise<Booking> {
  const concert = getConcert(req.concertId);
  const user = getUser(userId);
  if (!concert || !user) throw new BookingError("ไม่พบคอนเสิร์ตหรือผู้ใช้", 404);

  const access = await checkAccess(concert, user, req.clock);
  if (!access.allowed) {
    if (access.code === "blocked_trust") await recordBlocked(concert.id, user.id);
    throw new BookingError(access.message, 403);
  }

  const seats = [...new Set(req.seats ?? [])];
  const standing = (req.standing ?? []).map((s) => ({ ...s, qty: Math.floor(s.qty) })).filter((s) => s.qty > 0);
  const count = seats.length + standing.reduce((n, s) => n + s.qty, 0);
  if (count === 0) throw new BookingError("ยังไม่ได้เลือกที่นั่ง");
  if (access.ticketsUsed + count > concert.maxTicketsPerUser) {
    throw new BookingError(`ซื้อได้สูงสุด ${concert.maxTicketsPerUser} ใบต่อบัญชี (ซื้อไปแล้ว ${access.ticketsUsed} ใบ)`);
  }

  // ตรวจเบื้องต้นเพื่อแจ้งที่นั่งที่ไม่ว่างให้ชัด — ฐานข้อมูลตรวจซ้ำอีกชั้นตอนล็อก
  const presold = presoldOf(concert);
  const zoneOf = (id: string) => concert.zones.find((z) => z.id === id);
  const items: BookingItem[] = [];
  for (const id of seats) {
    const section = concert.sections.find((s) => id.startsWith(`${s.id}-`) && isValidSeat(s, id));
    if (!section) throw new BookingError(`ที่นั่ง ${id} ไม่ถูกต้อง`);
    if (presold.seats.has(id)) throw new BookingError(`ที่นั่ง ${id} มีคนจองแล้ว กรุณาเลือกใหม่`, 409);
    const zone = zoneOf(section.zoneId);
    items.push({ sectionId: section.id, zoneId: section.zoneId, seatId: id, label: seatLabel(zone, section, id), priceTHB: zone?.priceTHB ?? 0 });
  }
  const standingCaps: { section_id: string; qty: number; available: number }[] = [];
  for (const s of standing) {
    const section = concert.sections.find((x) => x.id === s.sectionId && x.kind === "standing");
    if (!section) throw new BookingError("โซนยืนไม่ถูกต้อง");
    standingCaps.push({ section_id: section.id, qty: s.qty, available: section.capacity - (presold.standing.get(section.id) ?? 0) });
    const zone = zoneOf(section.zoneId);
    for (let i = 0; i < s.qty; i++) {
      items.push({ sectionId: section.id, zoneId: section.zoneId, label: seatLabel(zone, section), priceTHB: zone?.priceTHB ?? 0 });
    }
  }

  const subtotal = items.reduce((n, it) => n + it.priceTHB, 0);
  const serviceFee = items.length * SERVICE_FEE_PER_TICKET;
  const now = Date.now();
  const booking: Booking = {
    id: `bk_${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    code: newCode(),
    userId: user.id,
    concertId: concert.id,
    items,
    status: "held",
    createdAt: new Date(now).toISOString(),
    holdExpiresAt: new Date(now + HOLD_MINUTES * 60_000).toISOString(),
    subtotal,
    serviceFee,
    discount: 0,
    total: subtotal + serviceFee,
    organizerCommission: Math.round(subtotal * PLANS[concert.plan].commissionRate),
  };
  const { data, error } = await db().rpc("place_hold", {
    p_booking: bookingToRow(booking),
    p_seats: seats,
    p_standing: standingCaps,
    p_max: concert.maxTicketsPerUser,
  });
  if (error) throw dbError(error, concert);
  return rowToBooking(data as BookingRow);
}

/** ส่วนลดค่าบัตรจากรีวอร์ดประเภท discount (ชื่อ "ส่วนลดค่าบัตร N บาท") */
export function discountRewards() {
  return getRewards()
    .filter((r) => r.type === "discount")
    .map((r) => ({ ...r, amountTHB: Number(r.name.match(/([\d,]+)\s*บาท/)?.[1]?.replace(/,/g, "") ?? 0) }));
}

export async function getBooking(id: string, userId: string): Promise<Booking> {
  const { data, error } = await db().from("bookings").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new BookingError("ไม่พบรายการจอง", 404);
  const b = rowToBooking(data as BookingRow);
  // แสดงสถานะหมดเวลาให้ถูกต้อง (DB เปลี่ยนสถานะจริงตอนมีคนล็อกครั้งถัดไป)
  if (b.status === "held" && Date.parse(b.holdExpiresAt) < Date.now()) b.status = "expired";
  return b;
}

export async function confirmBooking(id: string, userId: string, discountRewardId?: string): Promise<Booking> {
  const r = discountRewardId ? discountRewards().find((x) => x.id === discountRewardId) : undefined;
  if (discountRewardId && !r) throw new BookingError("ส่วนลดไม่ถูกต้อง");
  const { data, error } = await db().rpc("confirm_booking", {
    p_id: id,
    p_user: userId,
    p_reward: r?.id ?? null,
    p_discount: r?.amountTHB ?? 0,
    p_cost: r?.costPoints ?? 0,
  });
  if (error) throw dbError(error);
  if (r) invalidate(); // แต้มเปลี่ยน
  return rowToBooking(data as BookingRow);
}

export async function cancelBooking(id: string, userId: string): Promise<Booking> {
  const { data, error } = await db().rpc("cancel_booking", { p_id: id, p_user: userId });
  if (error) throw dbError(error);
  if (!data || !(data as BookingRow).id) throw new BookingError("ไม่พบรายการจอง", 404);
  return rowToBooking(data as BookingRow);
}

/** บัตรที่ชำระแล้วของผู้ใช้ + เวลาที่เช็คอินของแต่ละใบ */
export async function userBookings(userId: string) {
  const { data, error } = await db().from("bookings").select("*").eq("user_id", userId).eq("status", "paid").order("paid_at", { ascending: false });
  if (error) throw new Error(error.message);
  const bookings = (data as BookingRow[]).map(rowToBooking);
  const ids = bookings.map((b) => b.id);
  const checkins = new Map<string, string>();
  if (ids.length) {
    const { data: rows } = await db().from("checkins").select("ticket_id, at").in("booking_id", ids);
    for (const r of rows ?? []) checkins.set(r.ticket_id as string, r.at as string);
  }
  return bookings.map((b) => ({ ...b, checkedIn: b.items.map((_, i) => checkins.get(`${b.code}-${i + 1}`) ?? null) }));
}

// ---------------------------------------------------------------- สถิติสำหรับผู้จัด/แพลตฟอร์ม

export async function concertStats(concert: Concert) {
  const [occ, bookingRows, blocked, checkins] = await Promise.all([
    occupancy(concert),
    selectAll<BookingRow>((a, b) => db().from("bookings").select("*").eq("concert_id", concert.id).in("status", ["held", "paid"]).range(a, b)),
    db().from("blocked_attempts").select("user_id", { count: "exact", head: true }).eq("concert_id", concert.id),
    db().from("checkins").select("ticket_id", { count: "exact", head: true }).eq("concert_id", concert.id),
  ]);
  const avail = availabilityFrom(concert, occ);
  const capacity = concert.sections.reduce((n, s) => n + s.capacity, 0);
  const available = Object.values(avail).reduce((n, a) => n + a.available, 0);
  const bookings = bookingRows.map(rowToBooking);
  const paid = bookings.filter((b) => b.status === "paid");
  const heldCount = bookings.filter((b) => b.status === "held" && Date.parse(b.holdExpiresAt) > Date.now()).reduce((n, b) => n + b.items.length, 0);

  // ยอดขายตั้งต้น (presold) คิดราคาหน้าบัตรของโซนนั้น
  const presold = presoldOf(concert);
  const zonePrice = (zoneId: string) => concert.zones.find((z) => z.id === zoneId)?.priceTHB ?? 0;
  const zoneOfSection = (secId: string) => concert.sections.find((s) => s.id === secId)?.zoneId ?? "";
  const byZone = new Map(concert.zones.map((z) => [z.id, { sold: 0, gross: 0 }]));
  const addZone = (zoneId: string, n: number) => {
    const z = byZone.get(zoneId);
    if (z) {
      z.sold += n;
      z.gross += n * zonePrice(zoneId);
    }
  };
  for (const id of presold.seats) addZone(zoneOfSection(id.slice(0, id.lastIndexOf("-"))), 1);
  for (const [sec, n] of presold.standing) addZone(zoneOfSection(sec), n);
  for (const b of paid) for (const it of b.items) addZone(it.zoneId, 1);

  const ticketsSold = [...byZone.values()].reduce((n, z) => n + z.sold, 0);
  const gross = [...byZone.values()].reduce((n, z) => n + z.gross, 0);
  const rate = PLANS[concert.plan].commissionRate;
  const commission = Math.round(gross * rate);
  const serviceFees = ticketsSold * SERVICE_FEE_PER_TICKET;
  const discounts = paid.reduce((n, b) => n + b.discount, 0);

  // ผู้ซื้อในระบบเดโมแยกตาม Tier
  const buyersByTier = Object.fromEntries(TIERS.map((t) => [t.name, 0])) as Record<TierName, number>;
  for (const uid of new Set(paid.map((b) => b.userId))) {
    const u = getUser(uid);
    if (u) buyersByTier[getScore(u).score.tier]++;
  }
  // บัญชีที่ AI ระงับสิทธิ์ (เฉพาะ Pro)
  const riskyAccounts =
    concert.plan === "pro"
      ? getUsers().filter((u) => {
          const t = getTrust(u).value;
          return t.trustMultiplier < MIN_TRUST_TO_BUY || t.isLikelyBot;
        }).length
      : 0;

  return {
    concertId: concert.id,
    capacity,
    available,
    held: heldCount,
    ticketsSold,
    sellThrough: capacity ? ticketsSold / capacity : 0,
    gross,
    commissionRate: rate,
    commission,
    serviceFees,
    discounts,
    platformRevenue: commission + serviceFees - discounts,
    organizerPayout: gross - commission,
    byZone: concert.zones.map((z) => ({ zoneId: z.id, name: z.name, color: z.color, capacity: z.capacity, ...byZone.get(z.id)! })),
    sections: avail,
    ordersInApp: paid.length,
    buyersByTier,
    blockedAttempts: blocked.count ?? 0,
    riskyAccounts,
    checkedIn: checkins.count ?? 0,
  };
}
