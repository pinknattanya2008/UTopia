/**
 * แปลงระหว่าง type ในแอป (camelCase) กับแถวในตาราง Supabase (snake_case)
 * ไฟล์นี้ไม่มี value import (ใช้ได้ทั้ง Next.js และ node scripts)
 */
import type { Booking, Concert, Reward, Transaction, UCenterPackage, User } from "./types";

export type Role = "buyer" | "organizer" | "admin" | "staff";

export interface ProfileRow {
  id: string;
  auth_id: string | null;
  email: string | null;
  role: Role;
  organizer_id: string | null;
  display_name: string;
  avatar: string;
  persona: string | null;
  ucenter_package: string;
  joined_at: string;
  points: number;
  presale_boost: number;
  past_concerts: number;
  quiz_score: number;
}

/** บัญชีที่ล็อกอินอยู่ (ไม่มี persona) */
export interface Account {
  id: string;
  email: string | null;
  role: Role;
  organizerId: string | null;
  displayName: string;
  avatar: string;
}

export function profileToUser(r: ProfileRow): User & { presaleBoost: number } {
  return {
    id: r.id,
    displayName: r.display_name,
    avatar: r.avatar,
    persona: (r.persona ?? "regular") as User["persona"],
    uCenterPackage: r.ucenter_package as UCenterPackage,
    joinedAt: r.joined_at,
    points: r.points,
    fanSignals: { pastConcertsAttended: r.past_concerts, artistQuizScore: r.quiz_score },
    presaleBoost: r.presale_boost,
  };
}

export function profileToAccount(r: ProfileRow): Account {
  return { id: r.id, email: r.email, role: r.role, organizerId: r.organizer_id, displayName: r.display_name, avatar: r.avatar };
}

export function userToProfileRow(u: User, extra: Partial<ProfileRow> = {}): Omit<ProfileRow, "auth_id"> {
  return {
    id: u.id,
    email: null,
    role: "buyer",
    organizer_id: null,
    display_name: u.displayName,
    avatar: u.avatar,
    persona: u.persona,
    ucenter_package: u.uCenterPackage,
    joined_at: u.joinedAt,
    points: u.points,
    presale_boost: 0,
    past_concerts: u.fanSignals.pastConcertsAttended,
    quiz_score: u.fanSignals.artistQuizScore,
    ...extra,
  };
}

export interface TxRow {
  id: string;
  user_id: string;
  type: Transaction["type"];
  amount_thb: number;
  merchant: string | null;
  merchant_category: string | null;
  counterparty_id: string | null;
  ts: string;
}

export function txToRow(t: Transaction): TxRow {
  return {
    id: t.id,
    user_id: t.userId,
    type: t.type,
    amount_thb: t.amountTHB,
    merchant: t.merchant ?? null,
    merchant_category: t.merchantCategory ?? null,
    counterparty_id: t.counterpartyId ?? null,
    ts: t.timestamp,
  };
}

export function rowToTx(r: TxRow): Transaction {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    amountTHB: Number(r.amount_thb),
    ...(r.merchant ? { merchant: r.merchant } : {}),
    ...(r.merchant_category ? { merchantCategory: r.merchant_category as Transaction["merchantCategory"] } : {}),
    ...(r.counterparty_id ? { counterpartyId: r.counterparty_id } : {}),
    timestamp: new Date(r.ts).toISOString(),
  };
}

export interface ConcertRow {
  id: string;
  organizer_id: string;
  artist: string;
  title: string;
  venue: string;
  date: string;
  sales_open_at: string;
  status: Concert["status"];
  plan: Concert["plan"];
  max_tickets_per_user: number;
  template: Concert["template"];
  description: string | null;
  zones: Concert["zones"];
  sections: Concert["sections"];
  stage: Concert["stage"] | null;
  background: Concert["background"] | null;
  created_at: string;
}

export function concertToRow(c: Concert): ConcertRow {
  return {
    id: c.id,
    organizer_id: c.organizerId,
    artist: c.artist,
    title: c.title,
    venue: c.venue,
    date: c.date,
    sales_open_at: c.salesOpenAt,
    status: c.status,
    plan: c.plan,
    max_tickets_per_user: c.maxTicketsPerUser,
    template: c.template,
    description: c.description ?? null,
    zones: c.zones,
    sections: c.sections,
    stage: c.stage ?? null,
    background: c.background ?? null,
    created_at: c.createdAt,
  };
}

export function rowToConcert(r: ConcertRow): Concert {
  return {
    id: r.id,
    organizerId: r.organizer_id,
    artist: r.artist,
    title: r.title,
    venue: r.venue,
    date: new Date(r.date).toISOString(),
    salesOpenAt: new Date(r.sales_open_at).toISOString(),
    status: r.status,
    plan: r.plan,
    maxTicketsPerUser: r.max_tickets_per_user,
    template: r.template,
    ...(r.description ? { description: r.description } : {}),
    zones: r.zones,
    sections: r.sections,
    ...(r.stage ? { stage: r.stage } : {}),
    ...(r.background ? { background: r.background } : {}),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export interface BookingRow {
  id: string;
  code: string;
  user_id: string;
  concert_id: string;
  items: Booking["items"];
  status: Booking["status"];
  created_at: string;
  hold_expires_at: string;
  paid_at: string | null;
  subtotal: number;
  service_fee: number;
  discount: number;
  discount_reward_id: string | null;
  total: number;
  organizer_commission: number;
}

export function bookingToRow(b: Booking): BookingRow {
  return {
    id: b.id,
    code: b.code,
    user_id: b.userId,
    concert_id: b.concertId,
    items: b.items,
    status: b.status,
    created_at: b.createdAt,
    hold_expires_at: b.holdExpiresAt,
    paid_at: b.paidAt ?? null,
    subtotal: b.subtotal,
    service_fee: b.serviceFee,
    discount: b.discount,
    discount_reward_id: b.discountRewardId ?? null,
    total: b.total,
    organizer_commission: b.organizerCommission,
  };
}

export function rowToBooking(r: BookingRow): Booking {
  return {
    id: r.id,
    code: r.code,
    userId: r.user_id,
    concertId: r.concert_id,
    items: r.items,
    status: r.status,
    createdAt: new Date(r.created_at).toISOString(),
    holdExpiresAt: new Date(r.hold_expires_at).toISOString(),
    ...(r.paid_at ? { paidAt: new Date(r.paid_at).toISOString() } : {}),
    subtotal: r.subtotal,
    serviceFee: r.service_fee,
    discount: r.discount,
    ...(r.discount_reward_id ? { discountRewardId: r.discount_reward_id } : {}),
    total: r.total,
    organizerCommission: r.organizer_commission,
  };
}

export interface RewardRow {
  id: string;
  name: string;
  cost_points: number;
  type: Reward["type"];
}

export const rewardToRow = (r: Reward): RewardRow => ({ id: r.id, name: r.name, cost_points: r.costPoints, type: r.type });
export const rowToReward = (r: RewardRow): Reward => ({ id: r.id, name: r.name, costPoints: r.cost_points, type: r.type });

// ---------------------------------------------------------------- บัญชีเดโม

export const DEMO_EMAIL_DOMAIN = "demo.uticket.app";

export const ORGANIZERS = [
  { id: "o1", name: "Lunar Live Entertainment" },
  { id: "o2", name: "Echo House Productions" },
];

/** คอนตัวอย่าง → ผู้จัด (c1, c3 = Lunar Live แพ็กเกจ Pro, c2 = Echo House แพ็กเกจ Basic) */
export const CONCERT_ORGANIZER: Record<string, string> = { c1: "o1", c2: "o2", c3: "o1" };

/** บัญชีที่ไม่ใช่ผู้ซื้อ */
export const STAFF_ACCOUNTS: (Omit<ProfileRow, "auth_id" | "persona" | "ucenter_package" | "joined_at" | "points" | "presale_boost" | "past_concerts" | "quiz_score"> & {
  note: string;
})[] = [
  { id: "org-lunar", email: `organizer.pro@${DEMO_EMAIL_DOMAIN}`, role: "organizer", organizer_id: "o1", display_name: "Lunar Live (ผู้จัด · Pro)", avatar: "#4f7bff", note: "ผู้จัด NOVA LUNE, SUNRISE Fest — แพ็กเกจ Pro" },
  { id: "org-echo", email: `organizer.basic@${DEMO_EMAIL_DOMAIN}`, role: "organizer", organizer_id: "o2", display_name: "Echo House (ผู้จัด · Basic)", avatar: "#14b8a6", note: "ผู้จัด Midnight Echo — แพ็กเกจ Basic" },
  { id: "admin", email: `admin@${DEMO_EMAIL_DOMAIN}`, role: "admin", organizer_id: null, display_name: "แอดมิน U Ticket", avatar: "#0f1a30", note: "เห็นทุกคอนและรายได้ทั้งแพลตฟอร์ม" },
  { id: "staff-lunar", email: `staff@${DEMO_EMAIL_DOMAIN}`, role: "staff", organizer_id: "o1", display_name: "Staff หน้างาน (Lunar Live)", avatar: "#8e7cff", note: "สแกน/เช็คอินบัตรงานของ Lunar Live" },
];

export const buyerEmail = (id: string) => `${id}@${DEMO_EMAIL_DOMAIN}`;
