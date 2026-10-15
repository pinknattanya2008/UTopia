/**
 * ระบบขายบัตร: สิทธิ์การซื้อตาม Tier, ล็อกที่นั่ง, ชำระเงิน (จำลอง), สรุปยอดขาย
 * state อยู่ใน store (memory) และบันทึกลงไฟล์ระหว่าง dev ผ่าน saveState()
 */
import { getConcert, getRewards, getUser, getUsers, saveState, store } from "./data";
import { getScore, getTrust } from "./fan";
import { tierInfo, TIERS } from "./scoring";
import type { Booking, BookingItem, Concert, TierName, User } from "./types";
import { HOLD_MINUTES, isValidSeat, MIN_TRUST_TO_BUY, PLANS, seatLabel, SERVICE_FEE_PER_TICKET } from "./venue";
import { CLOCK_PRESETS } from "./clock";

export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

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
  ticketsUsed: number; // ที่ถือ/ซื้อไปแล้วในคอนนี้
}

/**
 * ตรวจว่าผู้ใช้ซื้อบัตรคอนนี้ได้หรือยัง
 * @param clockOffset เวลาจำลอง (นาที) เทียบกับเวลาเปิดขายทั่วไป เช่น -60 = 1 ชม. ก่อนเปิดขาย
 */
export function checkAccess(concert: Concert, user: User, clockOffset?: number): AccessInfo {
  const { score } = getScore(user);
  const trust = getTrust(user).value;
  const presale = concert.plan === "pro";
  const open = Date.parse(concert.salesOpenAt);
  const now = open + clampClock(clockOffset) * 60_000;
  const lead = presale ? tierInfo(score.tier).leadMinutes : 0;
  const opensAt = open - lead * 60_000;
  const used = activeBookings(concert.id)
    .filter((b) => b.userId === user.id)
    .reduce((n, b) => n + b.items.length, 0);

  const base = {
    tier: score.tier,
    finalScore: score.finalScore,
    trustMultiplier: trust.trustMultiplier,
    presale,
    opensAt: new Date(opensAt).toISOString(),
    now: new Date(now).toISOString(),
    maxTickets: concert.maxTicketsPerUser,
    ticketsUsed: used,
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
export function recordBlocked(concertId: string, userId: string) {
  const list = store.blocked.get(concertId) ?? [];
  if (list.includes(userId)) return;
  store.blocked.set(concertId, [...list, userId]);
  saveState();
}

// ---------------------------------------------------------------- Occupancy

/** ปล่อยที่นั่งที่ล็อกไว้เกินเวลา */
export function expireHolds() {
  const now = Date.now();
  let changed = false;
  for (const b of store.bookings) {
    if (b.status === "held" && Date.parse(b.holdExpiresAt) < now) {
      b.status = "expired";
      changed = true;
    }
  }
  if (changed) saveState();
}

function activeBookings(concertId: string) {
  return store.bookings.filter((b) => b.concertId === concertId && (b.status === "held" || b.status === "paid"));
}

/** สถานะที่นั่งทั้งงาน */
function occupancy(concertId: string) {
  expireHolds();
  const presold = store.presold.get(concertId);
  const sold = new Set(presold?.seats ?? []);
  const held = new Map<string, string>(); // seatId → userId
  const standing = new Map<string, number>(presold?.standing ?? []);
  for (const b of activeBookings(concertId)) {
    for (const it of b.items) {
      if (it.seatId) {
        if (b.status === "paid") sold.add(it.seatId);
        else held.set(it.seatId, b.userId);
      } else {
        standing.set(it.sectionId, (standing.get(it.sectionId) ?? 0) + 1);
      }
    }
  }
  return { sold, held, standing };
}

/** จำนวนที่ว่างต่อ section (สำหรับผังรวม) */
export function sectionAvailability(concert: Concert) {
  const occ = occupancy(concert.id);
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

/** สถานะที่นั่งราย section (สำหรับผังที่นั่ง) */
export function sectionSeats(concert: Concert, sectionId: string, userId: string) {
  const occ = occupancy(concert.id);
  const prefix = `${sectionId}-`;
  const sold: string[] = [];
  const held: string[] = [];
  const mine: string[] = [];
  for (const id of occ.sold) if (id.startsWith(prefix)) sold.push(id);
  for (const [id, uid] of occ.held) if (id.startsWith(prefix)) (uid === userId ? mine : held).push(id);
  return { sold, held, mine };
}

// ---------------------------------------------------------------- Hold / Confirm / Cancel

export interface HoldRequest {
  userId: string;
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

export function holdSeats(req: HoldRequest): Booking {
  const concert = getConcert(req.concertId);
  const user = getUser(req.userId);
  if (!concert || !user) throw new BookingError("ไม่พบคอนเสิร์ตหรือผู้ใช้", 404);

  // ล็อกใหม่แทนอันเดิมของผู้ใช้คนนี้ในงานเดียวกัน
  for (const b of store.bookings) {
    if (b.userId === user.id && b.concertId === concert.id && b.status === "held") b.status = "cancelled";
  }

  const access = checkAccess(concert, user, req.clock);
  if (!access.allowed) {
    if (access.code === "blocked_trust") recordBlocked(concert.id, user.id);
    throw new BookingError(access.message, 403);
  }

  const seats = [...new Set(req.seats ?? [])];
  const standing = (req.standing ?? []).filter((s) => s.qty > 0);
  const count = seats.length + standing.reduce((n, s) => n + Math.floor(s.qty), 0);
  if (count === 0) throw new BookingError("ยังไม่ได้เลือกที่นั่ง");
  if (access.ticketsUsed + count > concert.maxTicketsPerUser) {
    throw new BookingError(`ซื้อได้สูงสุด ${concert.maxTicketsPerUser} ใบต่อบัญชี (มีอยู่แล้ว ${access.ticketsUsed} ใบ)`);
  }

  const occ = occupancy(concert.id);
  const zoneOf = (id: string) => concert.zones.find((z) => z.id === id);
  const items: BookingItem[] = [];

  for (const id of seats) {
    const section = concert.sections.find((s) => id.startsWith(`${s.id}-`) && isValidSeat(s, id));
    if (!section) throw new BookingError(`ที่นั่ง ${id} ไม่ถูกต้อง`);
    if (occ.sold.has(id) || occ.held.has(id)) throw new BookingError(`ที่นั่ง ${id} มีคนจองแล้ว กรุณาเลือกใหม่`, 409);
    const zone = zoneOf(section.zoneId);
    items.push({ sectionId: section.id, zoneId: section.zoneId, seatId: id, label: seatLabel(zone, section, id), priceTHB: zone?.priceTHB ?? 0 });
  }
  for (const s of standing) {
    const section = concert.sections.find((x) => x.id === s.sectionId && x.kind === "standing");
    if (!section) throw new BookingError("โซนยืนไม่ถูกต้อง");
    const left = section.capacity - (occ.standing.get(section.id) ?? 0);
    if (s.qty > left) throw new BookingError(`${section.name} เหลือ ${left} ใบ`, 409);
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
  store.bookings.push(booking);
  saveState();
  return booking;
}

/** ส่วนลดค่าบัตรจากรีวอร์ดประเภท discount (ชื่อ "ส่วนลดค่าบัตร N บาท") */
export function discountRewards() {
  return getRewards()
    .filter((r) => r.type === "discount")
    .map((r) => ({ ...r, amountTHB: Number(r.name.match(/([\d,]+)\s*บาท/)?.[1]?.replace(/,/g, "") ?? 0) }));
}

export function getBooking(id: string, userId: string) {
  expireHolds();
  const b = store.bookings.find((x) => x.id === id);
  if (!b || b.userId !== userId) throw new BookingError("ไม่พบรายการจอง", 404);
  return b;
}

export function confirmBooking(id: string, userId: string, discountRewardId?: string): Booking {
  const b = getBooking(id, userId);
  if (b.status !== "held") throw new BookingError(b.status === "expired" ? "หมดเวลาชำระเงิน ที่นั่งถูกปล่อยแล้ว" : "รายการนี้ชำระไม่ได้", 409);
  const user = getUser(userId)!;

  if (discountRewardId) {
    const r = discountRewards().find((x) => x.id === discountRewardId);
    if (!r) throw new BookingError("ส่วนลดไม่ถูกต้อง");
    if (user.points < r.costPoints) throw new BookingError("แต้มไม่พอสำหรับส่วนลดนี้");
    user.points -= r.costPoints;
    store.redemptions.push({ userId, rewardId: r.id, at: new Date().toISOString() });
    b.discount = Math.min(r.amountTHB, b.subtotal);
    b.discountRewardId = r.id;
  }
  b.total = b.subtotal - b.discount + b.serviceFee;
  b.status = "paid";
  b.paidAt = new Date().toISOString();
  saveState();
  return b;
}

export function cancelBooking(id: string, userId: string) {
  const b = getBooking(id, userId);
  if (b.status === "held") {
    b.status = "cancelled";
    saveState();
  }
  return b;
}

export function userBookings(userId: string) {
  expireHolds();
  return store.bookings
    .filter((b) => b.userId === userId && b.status === "paid")
    .sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));
}

// ---------------------------------------------------------------- สถิติสำหรับผู้จัด/แพลตฟอร์ม

export function concertStats(concert: Concert) {
  const avail = sectionAvailability(concert);
  const capacity = concert.sections.reduce((n, s) => n + s.capacity, 0);
  const available = Object.values(avail).reduce((n, a) => n + a.available, 0);
  const paid = store.bookings.filter((b) => b.concertId === concert.id && b.status === "paid");
  const heldCount = store.bookings
    .filter((b) => b.concertId === concert.id && b.status === "held")
    .reduce((n, b) => n + b.items.length, 0);

  // ยอดขายตั้งต้น (presold) คิดราคาหน้าบัตรของโซนนั้น
  const presold = store.presold.get(concert.id);
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
  for (const id of presold?.seats ?? []) addZone(zoneOfSection(id.slice(0, id.lastIndexOf("-"))), 1);
  for (const [sec, n] of presold?.standing ?? []) addZone(zoneOfSection(sec), n);
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
    blockedAttempts: store.blocked.get(concert.id)?.length ?? 0,
    riskyAccounts,
  };
}
