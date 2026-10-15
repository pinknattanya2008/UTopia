/**
 * สร้างข้อมูลจำลอง U-Ticket (Build Spec หัวข้อ 5)
 * รัน: npm run seed  → เขียนไฟล์ใน data/
 * ใช้ random seed คงที่ ได้ข้อมูลเหมือนเดิมทุกครั้ง
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  Concert,
  MerchantCategory,
  Persona,
  Reward,
  Transaction,
  TxType,
  UCenterPackage,
  User,
} from "../src/lib/types.ts";

// ---------- Seeded RNG (mulberry32) ----------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261016);
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;

// ---------- Time window: 30 วันก่อน 16 ต.ค. 2026 (เวลาไทย) ----------
const DAYS = 30;
const START_DAY_UTC = Date.UTC(2026, 8, 16); // 2026-09-16 (day index 0) … 2026-10-15 (day index 29)
const HOUR = 3600_000;

/** เวลา (ms) ของวัน d ชั่วโมง h นาที m วินาที s ตามเวลาไทย (+07:00) */
function ts(d: number, h: number, m: number, s = 0) {
  return START_DAY_UTC + d * 24 * HOUR + (h - 7) * HOUR + m * 60_000 + s * 1000;
}

// ---------- Merchants ----------
const MERCHANTS: { name: string; category: MerchantCategory; min: number; max: number }[] = [
  { name: "Café Amazon", category: "food", min: 45, max: 120 },
  { name: "Starbucks", category: "food", min: 120, max: 260 },
  { name: "7-Eleven", category: "food", min: 25, max: 250 },
  { name: "MK Restaurants", category: "food", min: 350, max: 1200 },
  { name: "After You", category: "food", min: 150, max: 450 },
  { name: "BTS Skytrain", category: "transport", min: 30, max: 65 },
  { name: "MRT", category: "transport", min: 25, max: 50 },
  { name: "Grab", category: "transport", min: 80, max: 350 },
  { name: "Bolt", category: "transport", min: 70, max: 280 },
  { name: "Shopee", category: "shopping", min: 99, max: 1500 },
  { name: "Lazada", category: "shopping", min: 120, max: 1400 },
  { name: "Central World", category: "shopping", min: 300, max: 1500 },
  { name: "Lotus's", category: "shopping", min: 150, max: 900 },
  { name: "Major Cineplex", category: "entertainment", min: 220, max: 520 },
  { name: "Spotify", category: "entertainment", min: 149, max: 149 },
  { name: "Netflix", category: "entertainment", min: 169, max: 419 },
  { name: "AIS", category: "bills", min: 299, max: 899 },
  { name: "การไฟฟ้านครหลวง", category: "bills", min: 400, max: 1500 },
  { name: "AirAsia", category: "travel", min: 900, max: 1500 },
  { name: "Agoda", category: "travel", min: 800, max: 1500 },
];

// ---------- Users ----------
type Spec = {
  id: string;
  displayName: string;
  avatar: string;
  persona: Persona;
  pkg: UCenterPackage;
  concerts: number;
  quiz: number;
  joinedDaysAgo: number;
};

const SPECS: Spec[] = [
  // true_fan (6)
  { id: "u01", displayName: "มายด์", avatar: "#f59e0b", persona: "true_fan", pkg: "Gold", concerts: 5, quiz: 92, joinedDaysAgo: 210 },
  { id: "u02", displayName: "แพรวา", avatar: "#ec4899", persona: "true_fan", pkg: "Silver", concerts: 4, quiz: 85, joinedDaysAgo: 180 },
  { id: "u03", displayName: "ต้นกล้า", avatar: "#22c55e", persona: "true_fan", pkg: "Platinum", concerts: 6, quiz: 78, joinedDaysAgo: 300 },
  { id: "u04", displayName: "แบม", avatar: "#a855f7", persona: "true_fan", pkg: "Bronze", concerts: 3, quiz: 88, joinedDaysAgo: 150 },
  { id: "u05", displayName: "จูน", avatar: "#6366f1", persona: "true_fan", pkg: "Silver", concerts: 2, quiz: 95, joinedDaysAgo: 120 },
  { id: "u06", displayName: "ฟ้าใส", avatar: "#0ea5e9", persona: "true_fan", pkg: "Gold", concerts: 4, quiz: 70, joinedDaysAgo: 240 },
  // regular (8)
  { id: "u07", displayName: "ก้อง", avatar: "#14b8a6", persona: "regular", pkg: "Bronze", concerts: 1, quiz: 45, joinedDaysAgo: 200 },
  { id: "u08", displayName: "นุ่น", avatar: "#84cc16", persona: "regular", pkg: "None", concerts: 0, quiz: 38, joinedDaysAgo: 160 },
  { id: "u09", displayName: "เจมส์", avatar: "#f97316", persona: "regular", pkg: "Silver", concerts: 2, quiz: 52, joinedDaysAgo: 400 },
  { id: "u10", displayName: "ปิ่น", avatar: "#e11d48", persona: "regular", pkg: "None", concerts: 1, quiz: 30, joinedDaysAgo: 90 },
  { id: "u11", displayName: "บอส", avatar: "#64748b", persona: "regular", pkg: "Gold", concerts: 0, quiz: 25, joinedDaysAgo: 365 },
  { id: "u12", displayName: "มิว", avatar: "#8b5cf6", persona: "regular", pkg: "Bronze", concerts: 2, quiz: 66, joinedDaysAgo: 130 },
  { id: "u13", displayName: "ต่อ", avatar: "#06b6d4", persona: "regular", pkg: "None", concerts: 0, quiz: 41, joinedDaysAgo: 75 },
  { id: "u14", displayName: "ใบเตย", avatar: "#10b981", persona: "regular", pkg: "Silver", concerts: 1, quiz: 58, joinedDaysAgo: 220 },
  // new_user (4) — สมัคร 7–12 วันก่อน
  { id: "u15", displayName: "น้ำหวาน", avatar: "#eab308", persona: "new_user", pkg: "Bronze", concerts: 1, quiz: 74, joinedDaysAgo: 12 },
  { id: "u16", displayName: "ไอซ์", avatar: "#3b82f6", persona: "new_user", pkg: "None", concerts: 0, quiz: 60, joinedDaysAgo: 10 },
  { id: "u17", displayName: "ปั้น", avatar: "#d946ef", persona: "new_user", pkg: "None", concerts: 0, quiz: 48, joinedDaysAgo: 8 },
  { id: "u18", displayName: "ออม", avatar: "#f43f5e", persona: "new_user", pkg: "Bronze", concerts: 2, quiz: 81, joinedDaysAgo: 7 },
  // farmer (4)
  { id: "u19", displayName: "ShopKing99", avatar: "#ca8a04", persona: "farmer", pkg: "Silver", concerts: 0, quiz: 8, joinedDaysAgo: 95 },
  { id: "u20", displayName: "PointHunter", avatar: "#0891b2", persona: "farmer", pkg: "Bronze", concerts: 0, quiz: 12, joinedDaysAgo: 88 },
  { id: "u21", displayName: "FlashBuyer", avatar: "#7c3aed", persona: "farmer", pkg: "None", concerts: 0, quiz: 15, joinedDaysAgo: 140 },
  { id: "u22", displayName: "LuckyDraw88", avatar: "#db2777", persona: "farmer", pkg: "Bronze", concerts: 0, quiz: 5, joinedDaysAgo: 110 },
  // bot (2)
  { id: "u23", displayName: "tkt_bot_7781", avatar: "#475569", persona: "bot", pkg: "None", concerts: 0, quiz: 0, joinedDaysAgo: 60 },
  { id: "u24", displayName: "auto_seat_02", avatar: "#0d9488", persona: "bot", pkg: "None", concerts: 0, quiz: 0, joinedDaysAgo: 45 },
];

// ---------- Transaction builders ----------
const txs: { t: number; tx: Omit<Transaction, "id" | "timestamp"> }[] = [];

function addCard(userId: string, t: number, pool = MERCHANTS) {
  const m = pick(pool);
  txs.push({ t, tx: { userId, type: "card_purchase", amountTHB: int(m.min, m.max), merchant: m.name, merchantCategory: m.category } });
}
function addUpay(userId: string, t: number, counterpartyId: string, amountTHB: number) {
  txs.push({ t, tx: { userId, type: "upay_transfer", amountTHB, counterpartyId } });
}
function addSwap(userId: string, t: number) {
  txs.push({ t, tx: { userId, type: "swap", amountTHB: int(200, 1500) } });
}
function addSelf(userId: string, t: number, amountTHB: number) {
  txs.push({ t, tx: { userId, type: "self_transfer", amountTHB, counterpartyId: `${userId}_vault` } });
}

/** ธุรกรรมชีวิตประจำวันทั่วไป */
function addDailyLife(
  userId: string,
  d: number,
  count: number,
  weights: { card: number; upay: number; swap: number },
  pool = MERCHANTS,
) {
  for (let i = 0; i < count; i++) {
    const t = ts(d, int(7, 22), int(0, 59), int(0, 59));
    const r = rand();
    if (r < weights.card) addCard(userId, t, pool);
    else if (r < weights.card + weights.upay) addUpay(userId, t, `friend_${userId}_${int(1, 6)}`, int(50, 800));
    else addSwap(userId, t);
  }
}

function subPool(n: number) {
  const copy = [...MERCHANTS];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

for (const s of SPECS) {
  const firstDay = Math.max(0, DAYS - s.joinedDaysAgo);
  switch (s.persona) {
    case "true_fan": {
      if (s.id === "u01") {
        // มายด์: ใช้ทุกวันต่อเนื่อง 18 วันล่าสุด (streak 18), ก่อนหน้านั้นเว้นบางวัน
        // ใช้ 1–2 รายการ/วัน ร้านหลากหลาย → Gold (ไม่ใช่คนใช้เยอะที่สุด แต่สม่ำเสมอ)
        const pool = subPool(13);
        for (let d = 0; d < DAYS; d++) {
          if (d === DAYS - 19) continue; // วันที่ทำให้ streak เริ่มนับ 18 วัน
          if (d < DAYS - 19 && chance(0.25)) continue;
          addDailyLife(s.id, d, int(1, 2), { card: 0.82, upay: 0.12, swap: 0.06 }, pool);
        }
      } else {
        const pool = subPool(int(10, 16));
        for (let d = 0; d < DAYS; d++) {
          if (!chance(0.88)) continue;
          addDailyLife(s.id, d, int(1, 3), { card: 0.78, upay: 0.14, swap: 0.08 }, pool);
        }
      }
      break;
    }
    case "regular": {
      const activeP = 0.5 + rand() * 0.2;
      const pool = subPool(int(6, 9));
      for (let d = 0; d < DAYS; d++) {
        if (!chance(activeP)) continue;
        addDailyLife(s.id, d, int(1, 2), { card: 0.85, upay: 0.15, swap: 0 }, pool);
      }
      break;
    }
    case "new_user": {
      const pool = subPool(int(7, 10));
      for (let d = firstDay; d < DAYS; d++) {
        if (!chance(0.9)) continue;
        addDailyLife(s.id, d, int(1, 3), { card: 0.85, upay: 0.1, swap: 0.05 }, pool);
      }
      break;
    }
    case "farmer": {
      if (s.id === "u19" || s.id === "u20") {
        // โอนวนกับบัญชีเครือข่ายเดียวกัน (u19 ↔ u20) + โอนเข้ากระเป๋าตัวเอง (สร้างใน block ของ u19)
        if (s.id === "u20") break;
        for (let d = 0; d < DAYS; d++) {
          const pairs = int(5, 8);
          for (let i = 0; i < pairs; i++) {
            const t = ts(d, int(9, 23), int(0, 59), int(0, 59));
            const [a, b] = chance(0.5) ? ["u19", "u20"] : ["u20", "u19"];
            addUpay(a, t, b, 500);
            addUpay(b, t + int(2, 25) * 60_000, a, 500);
          }
          for (const u of ["u19", "u20"]) {
            const selfCount = int(10, 16);
            for (let i = 0; i < selfCount; i++) addSelf(u, ts(d, int(8, 23), int(0, 59), int(0, 59)), 500);
            if (chance(0.6)) addCard(u, ts(d, int(10, 21), int(0, 59)), MERCHANTS.slice(0, 3));
          }
        }
      } else {
        // เงียบ 20 วัน แล้วพุ่ง 15+ รายการ/วันใน 5 วันสุดท้าย
        const merchants = s.id === "u21" ? [MERCHANTS[2]] : [MERCHANTS[2], MERCHANTS[9]];
        for (let d = 20; d < 25; d++) if (chance(0.3)) addCard(s.id, ts(d, int(10, 20), int(0, 59)), merchants);
        for (let d = 25; d < DAYS; d++) {
          const n = int(16, 22);
          for (let i = 0; i < n; i++) {
            const m = merchants[i % merchants.length];
            txs.push({
              t: ts(d, int(8, 23), int(0, 59), int(0, 59)),
              tx: { userId: s.id, type: "card_purchase", amountTHB: 25, merchant: m.name, merchantCategory: m.category },
            });
          }
        }
      }
      break;
    }
    case "bot": {
      // ทุก 90 วินาทีเป๊ะ ยอดเท่ากัน ร้านเดียว
      const amount = s.id === "u23" ? 199 : 250;
      for (let d = firstDay; d < DAYS; d++) {
        const start = ts(d, int(1, 4), int(0, 59), 0);
        for (let i = 0; i < 24; i++) {
          txs.push({
            t: start + i * 90_000,
            tx: { userId: s.id, type: "card_purchase", amountTHB: amount, merchant: "Shopee", merchantCategory: "shopping" },
          });
        }
      }
      break;
    }
  }
}

txs.sort((a, b) => a.t - b.t);
const transactions: Transaction[] = txs.map((x, i) => ({
  id: `t${String(i + 1).padStart(5, "0")}`,
  ...x.tx,
  timestamp: new Date(x.t).toISOString(),
}));

// แต้มเริ่มต้น: ตามจำนวนรายการ (ตัดให้เท่าคนทั่วไป) + มายด์ตั้งไว้ให้พอแลกส่วนลดในเดโม
const users: User[] = SPECS.map((s) => {
  const count = transactions.filter((t) => t.userId === s.id && t.type !== "self_transfer").length;
  const points = s.id === "u01" ? 1450 : Math.round(Math.min(count, 90) * 12 + int(0, 200));
  return {
    id: s.id,
    displayName: s.displayName,
    avatar: s.avatar,
    persona: s.persona,
    uCenterPackage: s.pkg,
    joinedAt: new Date(START_DAY_UTC + (DAYS - s.joinedDaysAgo) * 24 * HOUR).toISOString().slice(0, 10),
    points,
    fanSignals: { pastConcertsAttended: s.concerts, artistQuizScore: s.quiz },
  };
});

const concerts: Concert[] = [
  {
    id: "c1",
    artist: "NOVA LUNE",
    title: "NOVA LUNE World Tour 2026 — Bangkok",
    venue: "Impact Arena, Bangkok",
    date: "2026-12-12T19:00:00+07:00",
    salesOpenAt: "2026-10-16T12:00:00+07:00",
    zones: [
      { id: "VIP", name: "VIP Standing", priceTHB: 7500, capacity: 300, view: "ยืนติดเวที ใกล้ศิลปินที่สุด" },
      { id: "A", name: "Zone A", priceTHB: 5500, capacity: 1200, view: "ที่นั่งชั้นล่าง เห็นเวทีชัด" },
      { id: "B", name: "Zone B", priceTHB: 3500, capacity: 2500, view: "ชั้น 2 มุมเฉียง เห็นจอใหญ่ชัด" },
      { id: "C", name: "Zone C", priceTHB: 1800, capacity: 4000, view: "ชั้นบน ไกลเวที เน้นบรรยากาศ" },
    ],
  },
];

const rewards: Reward[] = [
  { id: "r1", name: "ส่วนลดค่าบัตร 300 บาท", costPoints: 300, type: "discount" },
  { id: "r2", name: "ส่วนลดค่าบัตร 800 บาท", costPoints: 700, type: "discount" },
  { id: "r3", name: "Presale Boost (+5 คะแนน รอบนี้)", costPoints: 500, type: "presale_boost" },
  { id: "r4", name: "สมาชิกแฟนคลับ NOVA LUNE 1 ปี", costPoints: 1200, type: "fan_membership" },
  { id: "r5", name: "เสื้อทัวร์ลิมิเต็ด", costPoints: 900, type: "merch" },
];

const dir = join(import.meta.dirname, "..", "data");
mkdirSync(dir, { recursive: true });
const write = (name: string, data: unknown) => writeFileSync(join(dir, name), JSON.stringify(data, null, 1) + "\n");
write("users.json", users);
write("transactions.json", transactions);
write("concerts.json", concerts);
write("rewards.json", rewards);

const byType = transactions.reduce<Record<TxType, number>>(
  (acc, t) => ((acc[t.type] = (acc[t.type] ?? 0) + 1), acc),
  {} as Record<TxType, number>,
);
console.log(`seed: ${users.length} users, ${transactions.length} transactions`, byType);
