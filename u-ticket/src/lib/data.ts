import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import usersJson from "../../data/users.json";
import transactionsJson from "../../data/transactions.json";
import concertsJson from "../../data/concerts.json";
import rewardsJson from "../../data/rewards.json";
import demoCacheJson from "../../data/demo-cache.json";
import type { Booking, Concert, Mission, PublicUser, Reward, Transaction, TrustAssessment, User, AiSource } from "./types";
import { removedSet, ROW_LABELS, seatId } from "./venue";

/**
 * State ใน memory ฝั่ง server (แต้ม, cache ผล AI)
 * เก็บไว้ที่ globalThis เพื่อไม่ให้หายตอน hot reload ระหว่าง dev
 * หมายเหตุ: บน Vercel แต่ละ instance มี memory ของตัวเอง — พอสำหรับ MVP/เดโม
 */
type Cached<T> = { value: T; source: AiSource };

interface Store {
  users: User[];
  trust: Map<string, Cached<TrustAssessment>>;
  explain: Map<string, Cached<string>>;
  missions: Map<string, Cached<Mission[]>>;
  summaries: Map<string, Cached<string>>;
  inflight: Map<string, Promise<unknown>>; // กันเรียก AI ซ้ำซ้อนขณะรอผล
  boosts: Map<string, number>; // presale boost (+คะแนน) จากการแลกแต้ม
  redemptions: { userId: string; rewardId: string; at: string }[];
  // ---- ระบบขายบัตร ----
  concerts: Concert[];
  bookings: Booking[];
  /** ยอดขายตั้งต้นของคอนตัวอย่าง (ผู้ซื้อรายอื่นนอกระบบเดโม) — สร้างแบบ deterministic */
  presold: Map<string, { seats: Set<string>; standing: Map<string, number> }>;
  /** บัญชีที่ AI กันไม่ให้ซื้อ (ไม่ซ้ำ) ต่อคอนเสิร์ต */
  blocked: Map<string, string[]>;
}

/** state ที่บันทึกลงไฟล์ระหว่าง dev (ไม่ทำบน Vercel เพราะ filesystem อ่านอย่างเดียว) */
interface PersistedState {
  concerts: Concert[];
  bookings: Booking[];
  points: Record<string, number>;
  redemptions: Store["redemptions"];
  boosts: Record<string, number>;
  blocked: Record<string, string[]>;
}

const STATE_FILE = join(process.cwd(), "data", "runtime-state.json");
const canPersist = !process.env.VERCEL;

function loadState(): PersistedState | null {
  if (!canPersist || !existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as PersistedState;
  } catch {
    return null;
  }
}

/** บันทึก state หลังมีการเปลี่ยนแปลง (สร้างคอน, จอง, แลกแต้ม) */
export function saveState() {
  if (!canPersist) return;
  const state: PersistedState = {
    concerts: store.concerts,
    bookings: store.bookings,
    points: Object.fromEntries(store.users.map((u) => [u.id, u.points])),
    redemptions: store.redemptions,
    boosts: Object.fromEntries(store.boosts),
    blocked: Object.fromEntries(store.blocked),
  };
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch (err) {
    console.error("[state] save failed:", (err as Error).message);
  }
}

/** ล้าง state กลับเป็นข้อมูลเริ่มต้น (ใช้จากหน้า Admin) */
export function resetState() {
  const fresh = createStore(null);
  Object.assign(store, fresh);
  saveState();
}

const g = globalThis as unknown as { __uticketStore?: Store };

function createStore(saved: PersistedState | null): Store {
  const users = structuredClone(usersJson as User[]);
  if (saved) for (const u of users) u.points = saved.points[u.id] ?? u.points;
  const concerts = saved?.concerts ?? structuredClone(concertsJson as Concert[]);
  return {
    users,
    trust: new Map(),
    explain: new Map(),
    missions: new Map(),
    summaries: new Map(),
    inflight: new Map(),
    boosts: new Map(Object.entries(saved?.boosts ?? {})),
    redemptions: saved?.redemptions ?? [],
    concerts,
    bookings: saved?.bookings ?? [],
    presold: new Map(SEED_SALES.map(([id, level]) => [id, makePresold(concerts.find((c) => c.id === id), level)])),
    blocked: new Map(Object.entries(saved?.blocked ?? {}).filter(([, v]) => Array.isArray(v))),
  };
}

// ---------------------------------------------------------------- ยอดขายตั้งต้นของคอนตัวอย่าง

/** [concertId, ระดับยอดขาย 0–1] — c1 ขายรอบ Diamond ไปแล้วบางส่วน, c2 เปิดขายมาหลายวัน */
const SEED_SALES: [string, number][] = [
  ["c1", 0.45],
  ["c2", 0.8],
];

function hashSeed(str: string) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function makePresold(concert: Concert | undefined, level: number) {
  const seats = new Set<string>();
  const standing = new Map<string, number>();
  if (!concert) return { seats, standing };
  let a = hashSeed(concert.id);
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // โซนแพง/แถวหน้า ขายไปก่อน
  const byPrice = [...concert.zones].sort((x, y) => y.priceTHB - x.priceTHB).map((z) => z.id);
  for (const s of concert.sections) {
    const rank = byPrice.indexOf(s.zoneId);
    const base = level * [1.2, 0.9, 0.55, 0.25, 0.2, 0.2][Math.max(0, rank)];
    if (s.kind === "standing") {
      standing.set(s.id, Math.floor(s.capacity * Math.min(0.95, base)));
      continue;
    }
    const removed = removedSet(s);
    for (let r = 0; r < s.rows && r < ROW_LABELS.length; r++) {
      const p = Math.min(0.97, base * (1.15 - (r / s.rows) * 0.8));
      for (let n = 1; n <= s.seatsPerRow; n++) {
        const id = seatId(s.id, r, n);
        if (rand() < p && !removed.has(id)) seats.add(id);
      }
    }
  }
  return { seats, standing };
}

export const store: Store = (g.__uticketStore ??= createStore(loadState()));

const transactions = transactionsJson as Transaction[];
const txByUser = new Map<string, Transaction[]>();
for (const t of transactions) {
  const list = txByUser.get(t.userId) ?? [];
  list.push(t);
  txByUser.set(t.userId, list);
}

export function getUsers(): User[] {
  return store.users;
}

export function getUser(id: string): User | undefined {
  return store.users.find((u) => u.id === id);
}

/** ตัด persona ออกก่อนส่งให้ client หรือ AI */
export function toPublicUser(u: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { persona, ...rest } = u;
  return rest;
}

export function getAllTransactions(): Transaction[] {
  return transactions;
}

export function getUserTransactions(userId: string): Transaction[] {
  return txByUser.get(userId) ?? [];
}

export function getConcert(id: string): Concert | undefined {
  return store.concerts.find((c) => c.id === id);
}

export function getConcerts(): Concert[] {
  return store.concerts;
}

export function getPublishedConcerts(): Concert[] {
  return store.concerts.filter((c) => c.status === "published");
}

/** ผู้จัดงานจำลอง (ยังไม่มีระบบล็อกอินจริง) */
export const ORGANIZER = { id: "o1", name: "Lunar Live Entertainment" };

export function getRewards(): Reward[] {
  return rewardsJson as Reward[];
}

/** ผล AI ที่บันทึกไว้ล่วงหน้าสำหรับโหมด DEMO_OFFLINE=1 (สร้างด้วย npm run build-demo-cache) */
export interface DemoCache {
  generatedAt: string | null;
  model: string | null;
  trust: Record<string, TrustAssessment>;
  explain: Record<string, string>;
  missions: Record<string, Mission[]>;
  presaleSummary: string | null;
  concierge: Record<string, string>; // key: "userId|คำถาม"
}

export const demoCache = demoCacheJson as unknown as DemoCache;
