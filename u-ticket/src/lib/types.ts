export type TierName = "Diamond" | "Gold" | "Silver" | "General";
export type UCenterPackage = "None" | "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
export type Persona = "true_fan" | "regular" | "new_user" | "farmer" | "bot";

export interface User {
  id: string; // "u01"
  displayName: string; // "มายด์"
  avatar: string; // สีพื้นหลังของ avatar (hex) — แสดงเป็นวงกลมพร้อมอักษรแรกของชื่อ
  persona: Persona; // ใช้ใน seed/เดโมเท่านั้น ห้ามส่งให้ AI หรือ client
  uCenterPackage: UCenterPackage;
  joinedAt: string; // ISO date
  points: number; // แต้มรีวอร์ดที่แลกได้
  fanSignals: {
    pastConcertsAttended: number;
    artistQuizScore: number; // 0–100
  };
}

/** User ที่ส่งให้ client ได้ (ไม่มี persona) */
export type PublicUser = Omit<User, "persona">;

export type TxType = "card_purchase" | "upay_transfer" | "swap" | "self_transfer";

export type MerchantCategory = "food" | "transport" | "shopping" | "entertainment" | "bills" | "travel";

export interface Transaction {
  id: string;
  userId: string;
  type: TxType;
  amountTHB: number;
  merchant?: string; // สำหรับ card_purchase
  merchantCategory?: MerchantCategory;
  counterpartyId?: string; // สำหรับ upay_transfer / self_transfer
  timestamp: string; // ISO
}

export interface Concert {
  id: string;
  artist: string; // ใช้ชื่อศิลปินสมมติ
  title: string;
  venue: string;
  date: string;
  salesOpenAt: string; // เวลาเปิดขายทั่วไป
  zones: Zone[];
  // ---- ระบบขายบัตร/ผู้จัด (ส่วนขยายจาก Build Spec) ----
  sections: Section[]; // บล็อกที่นั่งบนผัง (หลาย section ต่อ 1 zone ราคา)
  template: VenueTemplateId;
  status: "draft" | "published";
  organizerId: string;
  description?: string;
  plan: OrganizerPlan; // แพ็กเกจที่ผู้จัดเลือก (กำหนดค่าคอมมิชชันและฟีเจอร์)
  maxTicketsPerUser: number;
  createdAt: string;
}

export interface Zone {
  id: string; // "VIP", "A", "B", "C"
  name: string;
  priceTHB: number;
  capacity: number; // รวมจากทุก section ของโซนนี้
  view: string; // คำอธิบายมุมมอง ให้ Concierge ใช้
  color: string; // สีบนผัง
}

export type VenueTemplateId = "arena" | "theater" | "hall";
export type OrganizerPlan = "basic" | "pro";

/** บล็อกบนผังสถานที่ — seated: แถว × ที่นั่งต่อแถว, standing: ขายเป็นจำนวน */
export interface Section {
  id: string; // "A1"
  zoneId: string;
  name: string;
  kind: "seated" | "standing";
  rows: number; // seated เท่านั้น (สูงสุด 26 = A–Z)
  seatsPerRow: number; // seated เท่านั้น
  capacity: number; // standing: จำนวนบัตร, seated: rows × seatsPerRow
  shape: { x: number; y: number; w: number; h: number }; // ตำแหน่งบนผัง viewBox 800×600
}

export interface BookingItem {
  sectionId: string;
  zoneId: string;
  seatId?: string; // "A1-C12" (seated) — standing ไม่มี
  label: string; // "Zone A · A1 แถว C ที่นั่ง 12"
  priceTHB: number;
}

export interface Booking {
  id: string;
  code: string; // "UT-7K2Q9F"
  userId: string;
  concertId: string;
  items: BookingItem[];
  status: "held" | "paid" | "cancelled" | "expired";
  createdAt: string;
  holdExpiresAt: string;
  paidAt?: string;
  subtotal: number; // ราคาบัตรรวม
  serviceFee: number; // ค่าบริการที่ผู้ซื้อจ่าย (รายได้แพลตฟอร์ม)
  discount: number; // ส่วนลดจากแต้ม (แพลตฟอร์มออก)
  discountRewardId?: string;
  total: number; // subtotal - discount + serviceFee
  organizerCommission: number; // ค่าคอมมิชชันที่หักจากผู้จัด (รายได้แพลตฟอร์ม)
}

export interface ScoreBreakdown {
  frequency: number; // 0–100
  consistency: number; // 0–100
  diversity: number; // 0–100
  uCenter: number; // 0–100
  baseScore: number; // 0–100 (ถ่วงน้ำหนักแล้ว)
  trustMultiplier: number; // 0.0–1.0
  finalScore: number; // baseScore × trustMultiplier
  tier: TierName;
  currentStreakDays: number;
  validTxCount30d: number;
}

export interface TrustAssessment {
  trustMultiplier: number; // 0.0–1.0
  riskLevel: "low" | "medium" | "high";
  isLikelyBot: boolean;
  reasons: string[]; // ภาษาไทย อ่านเข้าใจง่าย
}

export interface Mission {
  title: string;
  description: string;
  targetCount: number;
  scoreImpact: string;
  category: "frequency" | "consistency" | "diversity";
}

export interface QueueEntry {
  rank: number;
  userId: string;
  displayName: string;
  finalScore: number;
  tier: TierName;
  entryTime: string; // เวลาเข้าคิวตาม Tier window
  flagged: boolean;
  flagReason?: string;
}

export interface Reward {
  id: string;
  name: string;
  costPoints: number;
  type: "discount" | "presale_boost" | "fan_membership" | "merch";
}

/** แหล่งที่มาของผล AI: ai = เรียก OpenAI สำเร็จ, cache = demo-cache.json, fallback = กฎในโค้ด */
export type AiSource = "ai" | "cache" | "fallback";
