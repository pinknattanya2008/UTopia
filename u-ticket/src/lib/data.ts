import usersJson from "../../data/users.json";
import transactionsJson from "../../data/transactions.json";
import concertsJson from "../../data/concerts.json";
import rewardsJson from "../../data/rewards.json";
import demoCacheJson from "../../data/demo-cache.json";
import type { Concert, Mission, PublicUser, Reward, Transaction, TrustAssessment, User, AiSource } from "./types";

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
}

const g = globalThis as unknown as { __uticketStore?: Store };

function createStore(): Store {
  return {
    users: structuredClone(usersJson as User[]),
    trust: new Map(),
    explain: new Map(),
    missions: new Map(),
    summaries: new Map(),
    inflight: new Map(),
    boosts: new Map(),
    redemptions: [],
  };
}

export const store: Store = (g.__uticketStore ??= createStore());

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
  return (concertsJson as Concert[]).find((c) => c.id === id);
}

export function getConcerts(): Concert[] {
  return concertsJson as Concert[];
}

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
