import demoCacheJson from "../../data/demo-cache.json";
import { db, selectAll } from "./supabase/admin";
import {
  profileToUser,
  rowToConcert,
  rowToReward,
  rowToTx,
  type ConcertRow,
  type ProfileRow,
  type RewardRow,
  type TxRow,
} from "./mappers";
import type { AiSource, Concert, Mission, PublicUser, Reward, Transaction, TrustAssessment, User } from "./types";
import { removedSet, ROW_LABELS, seatId } from "./venue";

/**
 * ข้อมูลจาก Supabase + cache ฝั่ง server
 * - profiles / concerts: cache ไม่เกิน 15 วินาที และล้างทันทีหลังเขียน (invalidate)
 * - transactions / rewards: ข้อมูลคงที่ โหลดครั้งเดียวต่อ instance
 * - การจอง / ล็อกที่นั่ง / แต้ม: อ่านเขียน database ตรงทุกครั้ง (ดู booking.ts)
 * - ผล AI (trust, explain, missions): cache ใน memory ต่อ instance
 *
 * API route / server component ต้อง `await ready()` ก่อนเรียกฟังก์ชันอ่านข้อมูลแบบ sync ด้านล่าง
 */
type Cached<T> = { value: T; source: AiSource };
export type AppUser = User & { presaleBoost: number };

interface Snapshot {
  profiles: ProfileRow[];
  users: AppUser[]; // เฉพาะผู้ซื้อ
  concerts: Concert[];
  organizers: { id: string; name: string }[];
  loadedAt: number;
}

interface Store {
  snapshot: Snapshot | null;
  loading: Promise<void> | null;
  transactions: Transaction[] | null;
  txByUser: Map<string, Transaction[]>;
  rewards: Reward[];
  presold: Map<string, { key: string; seats: Set<string>; standing: Map<string, number> }>;
  trust: Map<string, Cached<TrustAssessment>>;
  explain: Map<string, Cached<string>>;
  missions: Map<string, Cached<Mission[]>>;
  summaries: Map<string, Cached<string>>;
  inflight: Map<string, Promise<unknown>>; // กันเรียก AI ซ้ำซ้อนขณะรอผล
}

const g = globalThis as unknown as { __uticketStore?: Store };
export const store: Store = (g.__uticketStore ??= {
  snapshot: null,
  loading: null,
  transactions: null,
  txByUser: new Map(),
  rewards: [],
  presold: new Map(),
  trust: new Map(),
  explain: new Map(),
  missions: new Map(),
  summaries: new Map(),
  inflight: new Map(),
});

const TTL_MS = 15_000;

async function loadStatic() {
  const [txRows, rewardRows] = await Promise.all([
    selectAll<TxRow>((a, b) => db().from("transactions").select("*").order("id").range(a, b)),
    selectAll<RewardRow>((a, b) => db().from("rewards").select("*").order("id").range(a, b)),
  ]);
  const txs = txRows.map(rowToTx);
  const byUser = new Map<string, Transaction[]>();
  for (const t of txs) {
    const list = byUser.get(t.userId) ?? [];
    list.push(t);
    byUser.set(t.userId, list);
  }
  store.transactions = txs;
  store.txByUser = byUser;
  store.rewards = rewardRows.map(rowToReward);
}

async function loadSnapshot() {
  const [profiles, concerts, organizers] = await Promise.all([
    selectAll<ProfileRow>((a, b) => db().from("profiles").select("*").order("id").range(a, b)),
    selectAll<ConcertRow>((a, b) => db().from("concerts").select("*").order("id").range(a, b)),
    selectAll<{ id: string; name: string }>((a, b) => db().from("organizers").select("id, name").order("id").range(a, b)),
  ]);
  store.snapshot = {
    profiles,
    users: profiles.filter((p) => p.role === "buyer").map(profileToUser),
    concerts: concerts.map(rowToConcert),
    organizers,
    loadedAt: Date.now(),
  };
}

/** โหลดข้อมูลจาก Supabase ถ้ายังไม่มีหรือเก่าเกิน 15 วินาที */
export async function ready(force = false) {
  const stale = !store.snapshot || force || Date.now() - store.snapshot.loadedAt > TTL_MS;
  if (!stale && store.transactions) return;
  store.loading ??= (async () => {
    try {
      await Promise.all([store.transactions ? null : loadStatic(), stale ? loadSnapshot() : null]);
    } finally {
      store.loading = null;
    }
  })();
  await store.loading;
}

/** ล้าง cache หลังเขียนข้อมูล (แต้ม, คอนเสิร์ต) — ครั้งถัดไปจะโหลดใหม่ */
export function invalidate() {
  if (store.snapshot) store.snapshot.loadedAt = 0;
}

function snap(): Snapshot {
  if (!store.snapshot) throw new Error("ยังไม่ได้โหลดข้อมูล — เรียก await ready() ก่อน");
  return store.snapshot;
}

// ---------------------------------------------------------------- อ่านข้อมูล (หลัง ready())

export function getUsers(): AppUser[] {
  return snap().users;
}

export function getUser(id: string): AppUser | undefined {
  return snap().users.find((u) => u.id === id);
}

export function getProfile(id: string): ProfileRow | undefined {
  return snap().profiles.find((p) => p.id === id);
}

export function getProfileByAuthId(authId: string): ProfileRow | undefined {
  return snap().profiles.find((p) => p.auth_id === authId);
}

export function getProfiles(): ProfileRow[] {
  return snap().profiles;
}

/** ตัด persona ออกก่อนส่งให้ client หรือ AI */
export function toPublicUser(u: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { persona, ...rest } = u;
  return rest;
}

export function getAllTransactions(): Transaction[] {
  return store.transactions ?? [];
}

export function getUserTransactions(userId: string): Transaction[] {
  return store.txByUser.get(userId) ?? [];
}

export function getConcert(id: string): Concert | undefined {
  return snap().concerts.find((c) => c.id === id);
}

export function getConcerts(): Concert[] {
  return snap().concerts;
}

export function getPublishedConcerts(): Concert[] {
  return snap().concerts.filter((c) => c.status === "published");
}

export function getOrganizers() {
  return snap().organizers;
}

export function getRewards(): Reward[] {
  return store.rewards;
}

// ---------------------------------------------------------------- ยอดขายตั้งต้นของคอนตัวอย่าง

/** [concertId, ระดับยอดขาย 0–1] — c1 ขายรอบ Diamond ไปแล้วบางส่วน, c2 เปิดขายมาหลายวัน */
const SEED_SALES: Record<string, number> = { c1: 0.45, c2: 0.8 };

function hashSeed(str: string) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * ที่นั่งที่ "ขายไปแล้ว" ให้ผู้ซื้อนอกระบบเดโม (คำนวณแบบ deterministic จากผังของคอน ไม่ได้เก็บใน DB)
 * ใช้เฉพาะคอนตัวอย่าง c1, c2 — คอนที่สร้างใหม่เริ่มจาก 0
 */
export function presoldOf(concert: Concert) {
  const level = SEED_SALES[concert.id];
  const key = JSON.stringify(concert.sections);
  const cached = store.presold.get(concert.id);
  if (cached && cached.key === key) return cached;
  const seats = new Set<string>();
  const standing = new Map<string, number>();
  if (level) {
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
  }
  const result = { key, seats, standing };
  store.presold.set(concert.id, result);
  return result;
}

// ---------------------------------------------------------------- ผล AI ที่บันทึกไว้ (DEMO_OFFLINE=1)

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
