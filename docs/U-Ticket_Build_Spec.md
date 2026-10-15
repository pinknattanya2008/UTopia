# 🛠️ U-Ticket: Build Spec สำหรับทำเว็บแอป (MVP)

> ไฟล์นี้เป็น **สเปกพร้อมสร้าง** เอาไปให้ Claude Code / Cursor สร้างเว็บแอปได้ทันที หรือให้ทีมแบ่งงานกันตามหัวข้อ
> เอกสารไอเดียและพิชอยู่ที่ `U-Ticket_Idea.md`
>
> **U-Hackathon 2026 · Track 1: AI** · เดโมบนเวทีบ่ายวันศุกร์ 16 ต.ค. 2026

---

## 0. วิธีใช้ไฟล์นี้กับ AI Coding Agent

คัดลอกข้อความด้านล่างไปวางใน Claude Code หรือ Cursor พร้อมแนบไฟล์นี้:

```
อ่าน U-Ticket_Build_Spec.md ทั้งไฟล์ แล้วสร้างเว็บแอปตามสเปก
ทำตามลำดับใน "13. ลำดับการสร้าง" ทีละเฟส
หลังจบแต่ละเฟส ให้รัน `npm run build` ให้ผ่านก่อนไปเฟสถัดไป
ห้ามเปลี่ยนสูตรคะแนนในหัวข้อ 6 โดยไม่ถาม
UI ทั้งหมดเป็นภาษาไทย
```

---

## 1. เป้าหมายของ MVP

**ต้องทำได้:**
1. แสดงคอนเสิร์ต 1 งานพร้อมโซนที่นั่งและรอบ presale ตาม Tier
2. เลือกผู้ใช้จำลอง (แทนการล็อกอิน) แล้วดู **Fan Score**, Tier, streak และคะแนนแยกตามองค์ประกอบ
3. **AI Missions:** AI สร้างภารกิจเฉพาะตัวจากประวัติธุรกรรม
4. **AI อธิบายคะแนน** เป็นภาษาไทย
5. **AI ตรวจจับการปั๊มแต้มและบอท** แล้วปรับ Trust Multiplier
6. **จำลองการเปิดขาย presale:** เรียงคิวผู้ใช้ทุกคนสด ๆ โชว์ว่าบัญชีปั๊มแต้มโดนลดลำดับ
7. **AI Concierge:** แชตแนะนำโซนตามงบ (แบบ streaming)
8. **แลกแต้ม:** ส่วนลดและสิทธิ์สมาชิกแฟนคลับ

**ไม่ทำใน MVP:**
- เชื่อมต่อ U-topia จริง (ไม่มี API สาธารณะ จึงใช้ข้อมูลจำลองทั้งหมด)
- ชำระเงินจริง ระบบล็อกอินจริง และ smart contract / NFT

---

## 2. Tech Stack

| ส่วน | เลือกใช้ |
|---|---|
| Framework | **Next.js (App Router) + TypeScript** |
| Styling | **Tailwind CSS** (+ shadcn/ui ถ้าทีมคุ้นเคย) |
| AI | **OpenAI Node SDK** (`openai`, Responses API) + **zod** สำหรับ structured output |
| Charts (ถ้ามีเวลา) | Recharts |
| Data | ไฟล์ JSON ใน `/data` (seed ครั้งเดียว) + state ใน memory ฝั่ง server |
| Deploy | Vercel |

**ตัวแปรแวดล้อม** (`.env.local`):
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-mini
```

---

## 3. โครงสร้างโฟลเดอร์

```
u-ticket/
├── app/
│   ├── layout.tsx                 # Navbar + ตัวเลือกผู้ใช้จำลอง
│   ├── page.tsx                   # หน้าแรก: การ์ดคอนเสิร์ต
│   ├── concert/[id]/page.tsx      # รายละเอียดคอน, โซน, รอบ presale
│   ├── dashboard/page.tsx         # Fan Score, Tier, Missions, อธิบายคะแนน
│   ├── presale/page.tsx           # จำลองคิว presale (หน้าไฮไลต์สำหรับเดโม)
│   ├── concierge/page.tsx         # แชต AI Concierge
│   ├── rewards/page.tsx           # แลกแต้ม
│   └── api/
│       ├── users/route.ts                 # GET รายชื่อผู้ใช้จำลอง
│       ├── score/[userId]/route.ts        # GET Fan Score (สูตร + Trust)
│       ├── trust/[userId]/route.ts        # POST ให้ AI ประเมินความน่าเชื่อถือ
│       ├── missions/[userId]/route.ts     # POST ให้ AI สร้างภารกิจ
│       ├── explain/[userId]/route.ts      # POST ให้ AI อธิบายคะแนน
│       ├── presale/simulate/route.ts      # POST จำลองคิว presale
│       ├── concierge/route.ts             # POST แชต (streaming)
│       └── rewards/redeem/route.ts        # POST แลกแต้ม
├── lib/
│   ├── types.ts                   # Type ทั้งหมด (หัวข้อ 4)
│   ├── data.ts                    # โหลด/แก้ไขข้อมูลใน memory
│   ├── scoring.ts                 # สูตร Fan Score (หัวข้อ 6) — ไม่ใช้ AI
│   ├── flags.ts                   # กฎตรวจความผิดปกติเบื้องต้น (หัวข้อ 7)
│   ├── ai.ts                      # OpenAI client + ฟังก์ชันเรียก AI
│   └── prompts.ts                 # System prompts ทั้งหมด (หัวข้อ 9)
├── data/
│   ├── users.json
│   ├── transactions.json
│   ├── concerts.json
│   └── rewards.json
├── scripts/
│   └── seed.ts                    # สร้างข้อมูลจำลอง (หัวข้อ 5)
└── components/
    ├── ScoreGauge.tsx
    ├── TierBadge.tsx
    ├── ScoreBreakdown.tsx
    ├── MissionCard.tsx
    ├── QueueTable.tsx
    ├── TrustBadge.tsx
    └── ChatBox.tsx
```

---

## 4. Data Models (`lib/types.ts`)

```ts
export type TierName = "Diamond" | "Gold" | "Silver" | "General";
export type UCenterPackage = "None" | "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
export type Persona = "true_fan" | "regular" | "new_user" | "farmer" | "bot";

export interface User {
  id: string;                 // "u01"
  displayName: string;        // "มายด์"
  avatar: string;             // emoji หรือ URL
  persona: Persona;           // ใช้ใน seed/เดโมเท่านั้น ห้ามส่งให้ AI
  uCenterPackage: UCenterPackage;
  joinedAt: string;           // ISO date
  points: number;             // แต้มรีวอร์ดที่แลกได้
  fanSignals: {               // สัญญาณความเป็นแฟน
    pastConcertsAttended: number;
    artistQuizScore: number;  // 0–100
  };
}

export type TxType = "card_purchase" | "upay_transfer" | "swap" | "self_transfer";

export interface Transaction {
  id: string;
  userId: string;
  type: TxType;
  amountTHB: number;
  merchant?: string;          // สำหรับ card_purchase
  merchantCategory?: "food" | "transport" | "shopping" | "entertainment" | "bills" | "travel";
  counterpartyId?: string;    // สำหรับ upay_transfer / self_transfer
  timestamp: string;          // ISO
}

export interface Concert {
  id: string;
  artist: string;             // ใช้ชื่อศิลปินสมมติ
  title: string;
  venue: string;
  date: string;
  salesOpenAt: string;        // เวลาเปิดขายทั่วไป
  zones: Zone[];
}

export interface Zone {
  id: string;                 // "VIP", "A", "B", "C"
  name: string;
  priceTHB: number;
  capacity: number;
  view: string;               // คำอธิบายมุมมอง ให้ Concierge ใช้
}

export interface ScoreBreakdown {
  frequency: number;          // 0–100
  consistency: number;        // 0–100
  diversity: number;          // 0–100
  uCenter: number;            // 0–100
  baseScore: number;          // 0–100 (ถ่วงน้ำหนักแล้ว)
  trustMultiplier: number;    // 0.0–1.0
  finalScore: number;         // baseScore × trustMultiplier
  tier: TierName;
  currentStreakDays: number;
  validTxCount30d: number;
}

export interface TrustAssessment {
  trustMultiplier: number;    // 0.0–1.0
  riskLevel: "low" | "medium" | "high";
  isLikelyBot: boolean;
  reasons: string[];          // ภาษาไทย อ่านเข้าใจง่าย
}

export interface Mission {
  title: string;              // "จ่ายค่ากาแฟด้วย U-Card 3 ครั้ง"
  description: string;
  targetCount: number;
  scoreImpact: string;        // "+6 คะแนน (ช่วยขึ้น Gold)"
  category: "frequency" | "consistency" | "diversity";
}

export interface QueueEntry {
  rank: number;
  userId: string;
  displayName: string;
  finalScore: number;
  tier: TierName;
  entryTime: string;          // เวลาเข้าคิวตาม Tier window
  flagged: boolean;
  flagReason?: string;
}

export interface Reward {
  id: string;
  name: string;               // "ส่วนลด 500 บาท"
  costPoints: number;
  type: "discount" | "presale_boost" | "fan_membership" | "merch";
}
```

---

## 5. ข้อมูลจำลอง (`scripts/seed.ts`)

สร้างข้อมูล **30 วันย้อนหลัง** จากวันที่ 16 ต.ค. 2026 ใช้ seed คงที่ เพื่อให้ได้ข้อมูลเหมือนเดิมทุกครั้งที่รัน

### ผู้ใช้ 24 คน แบ่งตาม persona

| Persona | จำนวน | พฤติกรรมธุรกรรม |
|---|---|---|
| `true_fan` | 6 | 1–4 รายการ/วัน เกือบทุกวัน ร้านหลากหลาย ยอด 40–1,500 บาท มีประวัติไปคอน 2–6 ครั้ง |
| `regular` | 8 | 0–2 รายการ/วัน ใช้ 50–70% ของวัน ร้านปานกลาง |
| `new_user` | 4 | สมัครเมื่อ 7–12 วันก่อน ใช้วันละ 1–3 รายการ (โชว์ว่าคนใหม่ไต่ Tier ได้) |
| `farmer` | 4 | **ปั๊มแต้ม:** 2 คนโอนวน `self_transfer` / `upay_transfer` ไปกลับกับบัญชีเครือข่ายเดียวกัน 20–40 รายการ/วัน, อีก 2 คนเงียบ 20 วันแล้วพุ่ง 15+ รายการ/วันในช่วง 5 วันสุดท้าย |
| `bot` | 2 | รายการถี่เป็นช่วงเวลาเท่ากันเป๊ะ (ทุก 90 วินาที), ยอดเท่ากันทุกครั้ง, ร้านเดียว, ไม่มีประวัติไปคอน |

ผู้ใช้หลักสำหรับเดโม: **u01 "มายด์"** (`true_fan`, U-center Gold) และ **u19 "ShopKing99"** (`farmer`, โอนวน)

### คอนเสิร์ต 1 งาน (ศิลปินสมมติ)
```json
{
  "id": "c1",
  "artist": "NOVA LUNE",
  "title": "NOVA LUNE World Tour 2026 — Bangkok",
  "venue": "Impact Arena, Bangkok",
  "date": "2026-12-12T19:00:00+07:00",
  "salesOpenAt": "2026-10-16T12:00:00+07:00",
  "zones": [
    { "id": "VIP", "name": "VIP Standing", "priceTHB": 7500, "capacity": 300,  "view": "ยืนติดเวที ใกล้ศิลปินที่สุด" },
    { "id": "A",   "name": "Zone A",       "priceTHB": 5500, "capacity": 1200, "view": "ที่นั่งชั้นล่าง เห็นเวทีชัด" },
    { "id": "B",   "name": "Zone B",       "priceTHB": 3500, "capacity": 2500, "view": "ชั้น 2 มุมเฉียง เห็นจอใหญ่ชัด" },
    { "id": "C",   "name": "Zone C",       "priceTHB": 1800, "capacity": 4000, "view": "ชั้นบน ไกลเวที เน้นบรรยากาศ" }
  ]
}
```

### รีวอร์ด
| id | ชื่อ | แต้ม | ประเภท |
|---|---|---|---|
| r1 | ส่วนลดค่าบัตร 300 บาท | 300 | discount |
| r2 | ส่วนลดค่าบัตร 800 บาท | 700 | discount |
| r3 | Presale Boost (+5 คะแนน รอบนี้) | 500 | presale_boost |
| r4 | สมาชิกแฟนคลับ NOVA LUNE 1 ปี | 1,200 | fan_membership |
| r5 | เสื้อทัวร์ลิมิเต็ด | 900 | merch |

---

## 6. สูตร Fan Score (`lib/scoring.ts`) — คำนวณด้วยโค้ด ไม่ใช้ AI

> หลักการ: **นับความถี่ ไม่นับยอดเงิน** และ AI เป็นตัวปรับความน่าเชื่อถือเท่านั้น สูตรนี้ต้องคำนวณซ้ำได้และอธิบายได้

### 6.1 กรองธุรกรรมที่นับ (valid transactions)
- นับเฉพาะ `card_purchase`, `upay_transfer`, `swap`
- **ไม่นับ** `self_transfer`
- `amountTHB < 20` ไม่นับ (กันรายการจิ๋ว)
- นับได้ **สูงสุด 5 รายการต่อวัน**
- `upay_transfer` ไปหาคนเดิม นับได้ **สูงสุด 1 ครั้งต่อวัน**

### 6.2 องค์ประกอบ (ทุกตัว 0–100)
```ts
frequency   = min(validTxCount30d / 60, 1) * 100          // 2 รายการ/วัน = เต็ม
consistency = (activeDays30d / 30) * 70
            + min(currentStreakDays / 14, 1) * 30          // streak 14 วัน = เต็มส่วนนี้
diversity   = min(uniqueMerchantCategories / 5, 1) * 50
            + min(uniqueTxTypes / 3, 1) * 30
            + min(uniqueMerchants / 15, 1) * 20
uCenter     = { None: 0, Bronze: 20, Silver: 40, Gold: 60, Platinum: 80, Diamond: 100 }[pkg]
```

### 6.3 รวมคะแนน
```ts
baseScore  = frequency*0.40 + consistency*0.25 + diversity*0.20 + uCenter*0.15
finalScore = round(baseScore * trustMultiplier, 1)   // trustMultiplier จากหัวข้อ 7
```

### 6.4 Tier และรอบ presale
| Tier | finalScore | เข้าคิวก่อนเปิดขาย |
|---|---|---|
| 💎 Diamond | ≥ 80 | 120 นาที |
| 🥇 Gold | 60–79.9 | 60 นาที |
| 🥈 Silver | 40–59.9 | 30 นาที |
| 🎟️ General | < 40 | 0 นาที (เปิดขายทั่วไป) |

ในคิว presale เรียงตาม `entryTime` ก่อน แล้วภายใน Tier เดียวกันเรียงตาม `finalScore` จากมากไปน้อย

---

## 7. ตรวจจับการปั๊มแต้มและบอท (2 ชั้น)

### ชั้น 1: กฎในโค้ด (`lib/flags.ts`) — เร็ว ฟรี ใช้ทุกครั้ง
คำนวณ "ข้อสังเกต" แล้วส่งให้ AI เป็นข้อมูลประกอบ:
| Flag | เงื่อนไข |
|---|---|
| `circular_transfers` | มี A→B แล้ว B→A ภายใน 1 ชั่วโมง ≥ 5 ครั้ง |
| `self_transfer_heavy` | `self_transfer` > 30% ของรายการทั้งหมด |
| `sudden_spike` | รายการ 5 วันล่าสุด > 4 เท่าของค่าเฉลี่ย 25 วันก่อนหน้า |
| `fixed_interval` | ช่วงห่างระหว่างรายการมี std < 5 วินาที |
| `identical_amounts` | > 80% ของรายการยอดเท่ากัน |
| `single_merchant` | > 90% ของรายการเป็นร้านเดียว |
| `no_fan_history` | `pastConcertsAttended = 0` และ `artistQuizScore < 20` |

### ชั้น 2: AI ประเมิน (`/api/trust/[userId]`)
- ส่ง **สรุปสถิติ + flags + ตัวอย่างธุรกรรม 40 รายการล่าสุด** ให้ GPT (ห้ามส่งฟิลด์ `persona`)
- GPT ตอบเป็น JSON ตาม `TrustAssessment`
- **Cache ผลไว้ใน memory** ต่อ userId เพื่อประหยัดเวลาและค่า API ระหว่างเดโม
- **Fallback:** ถ้าเรียก AI ไม่สำเร็จ ให้คำนวณจากกฎ: `trust = max(0.1, 1 - 0.25 × จำนวน flags)`

---

## 8. API Routes

| Method | Path | Input | Output |
|---|---|---|---|
| GET | `/api/users` | — | `User[]` (ไม่มี `persona`) |
| GET | `/api/score/[userId]` | — | `ScoreBreakdown` |
| POST | `/api/trust/[userId]` | `{ force?: boolean }` | `TrustAssessment` |
| POST | `/api/missions/[userId]` | — | `{ missions: Mission[] }` (3 ภารกิจ) |
| POST | `/api/explain/[userId]` | — | `{ explanation: string }` |
| POST | `/api/presale/simulate` | `{ concertId }` | `{ queue: QueueEntry[], summary: string }` |
| POST | `/api/concierge` | `{ messages: {role, content}[], userId }` | **text stream** |
| POST | `/api/rewards/redeem` | `{ userId, rewardId }` | `{ ok, pointsLeft }` |

`/api/presale/simulate` ต้องทำงานตามลำดับนี้:
1. ประเมิน trust ของทุกคนแบบขนาน (`Promise.all`) โดยใช้ cache ถ้ามี
2. คำนวณ finalScore และ Tier
3. เรียงคิว
4. ให้ AI สรุปผล 2–3 ประโยค เช่น *"ตรวจพบ 6 บัญชีที่มีพฤติกรรมผิดปกติ ถูกเลื่อนลงไปอยู่ท้ายคิว…"*

---

## 9. การเรียก AI (`lib/ai.ts`, `lib/prompts.ts`)

### 9.1 ตั้งค่า client
```ts
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

export const client = new OpenAI(); // อ่าน OPENAI_API_KEY จาก env
export const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
```

### 9.2 Structured output (ใช้กับ trust, missions, explain, summary)
ใช้ **Responses API** + `zodTextFormat` (schema ชั้นนอกสุดต้องเป็น `z.object` เสมอ)
```ts
const TrustSchema = z.object({
  trustMultiplier: z.number(),
  riskLevel: z.enum(["low", "medium", "high"]),
  isLikelyBot: z.boolean(),
  reasons: z.array(z.string()),
});

export async function assessTrust(payload: unknown) {
  const res = await client.responses.parse({
    model: MODEL,
    reasoning: { effort: "low" },
    instructions: TRUST_SYSTEM_PROMPT,
    input: JSON.stringify(payload),
    text: { format: zodTextFormat(TrustSchema, "trust_assessment") },
  });
  const out = res.output_parsed;
  if (!out) return null; // ไปใช้ fallback ในหัวข้อ 7
  return { ...out, trustMultiplier: Math.min(1, Math.max(0, out.trustMultiplier)) };
}
```
- หลังได้ผลให้ **clamp ค่าเอง** (0–1) เสมอ
- ใช้ `reasoning: { effort: "low" }` กับงานจัดประเภทหรือสรุปสั้น เพื่อให้ตอบเร็วตอนเดโม
- ถ้าต้องการคำตอบที่ฉลาดขึ้น เปลี่ยน `OPENAI_MODEL` เป็นโมเดลที่ใหญ่กว่า (เช่น `gpt-5.5`) ได้โดยไม่ต้องแก้โค้ด ก่อนใช้ให้เช็กว่าบัญชีของทีมเรียกโมเดลนั้นได้ที่ platform.openai.com
- งานที่ตอบเป็นข้อความธรรมดา (เช่น explain) ใช้ `client.responses.create(...)` แล้วอ่าน `res.output_text`

### 9.3 Streaming (Concierge)
```ts
// app/api/concierge/route.ts
export async function POST(req: Request) {
  const { messages, userId } = await req.json(); // [{ role: "user" | "assistant", content: string }]
  const stream = client.responses.stream({
    model: MODEL,
    reasoning: { effort: "low" },
    instructions: buildConciergePrompt(userId), // ใส่ข้อมูลโซน ราคา Tier และแต้มของผู้ใช้
    input: messages,
  });
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === "response.output_text.delta") {
            controller.enqueue(encoder.encode(event.delta));
          }
        }
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
```

### 9.4 System Prompts (`lib/prompts.ts`)

**TRUST_SYSTEM_PROMPT**
```
คุณคือระบบตรวจสอบความน่าเชื่อถือของ U-Ticket ระบบขายบัตรคอนเสิร์ตที่ให้สิทธิ์ presale
ตามการใช้งานแอปการเงิน U-topia จริงอย่างสม่ำเสมอ

คุณจะได้รับสถิติธุรกรรม 30 วัน, flags จากกฎเบื้องต้น และตัวอย่างธุรกรรมล่าสุดของผู้ใช้ 1 คน
ให้ประเมินว่าการใช้งานนี้เป็นการใช้ชีวิตประจำวันจริง หรือเป็นการปั๊มแต้ม/บอท

แนวทาง:
- การใช้งานจริง: หลายร้าน หลายหมวด เวลาไม่สม่ำเสมอแบบเครื่องจักร ยอดหลากหลาย → trustMultiplier 0.9–1.0
- น่าสงสัยบางส่วน: มี flag 1 ข้อแต่ภาพรวมดูปกติ → 0.6–0.85
- ปั๊มแต้มชัดเจน: โอนวน, ยอดพุ่งผิดปกติก่อนเปิดขาย → 0.2–0.5
- บอท: ช่วงเวลาเท่ากันเป๊ะ ยอดเท่ากัน ร้านเดียว → 0.0–0.2 และ isLikelyBot = true
- ผู้ใช้ใหม่ที่ใช้น้อยแต่ปกติ ไม่ใช่สิ่งผิดปกติ อย่าลงโทษเพราะประวัติสั้น

reasons: 1–3 ข้อ ภาษาไทยสั้น อ่านเข้าใจง่าย อ้างอิงพฤติกรรมที่เห็นในข้อมูลจริง
ห้ามกล่าวหาเกินกว่าที่ข้อมูลแสดง
```

**MISSIONS_SYSTEM_PROMPT**
```
คุณคือโค้ชของ U-Ticket หน้าที่คือสร้างภารกิจ 3 ข้อที่ช่วยให้ผู้ใช้เพิ่ม Fan Score
ด้วยการใช้ U-topia ในชีวิตประจำวันจริง (U-Card, U-Pay, swap)

คุณจะได้รับ ScoreBreakdown, Tier ปัจจุบัน, คะแนนที่ต้องการเพื่อขึ้น Tier ถัดไป และหมวดร้านที่ผู้ใช้ใช้บ่อย
- โฟกัสองค์ประกอบที่คะแนนต่ำที่สุดก่อน
- ภารกิจต้องเป็นสิ่งที่ทำได้จริงใน 7 วัน และเป็นการใช้จ่ายที่คนทำอยู่แล้ว (กาแฟ เดินทาง ค่าอาหาร)
- ห้ามแนะนำให้โอนเงินวน หรือใช้จ่ายเกินจำเป็น
- scoreImpact ให้ประมาณจากสูตรที่ให้มา และบอกว่าช่วยขึ้น Tier ไหน
ภาษาไทย กระชับ เป็นกันเอง
```

**EXPLAIN_SYSTEM_PROMPT**
```
อธิบาย Fan Score ของผู้ใช้เป็นภาษาไทย 3–5 ประโยค เป็นกันเอง
บอกว่า Tier ปัจจุบันคืออะไร จุดแข็ง 1 ข้อ จุดที่ควรพัฒนา 1 ข้อ และต้องทำอะไรเพื่อขึ้น Tier ถัดไป
ถ้า trustMultiplier < 0.9 ให้บอกเหตุผลอย่างสุภาพ และบอกวิธีกลับมาได้คะแนนเต็ม
ใช้ตัวเลขจากข้อมูลจริงเท่านั้น
```

**CONCIERGE_SYSTEM_PROMPT** (สร้างแบบ dynamic)
```
คุณคือ U-Ticket Concierge ผู้ช่วยเลือกบัตรคอนเสิร์ต {concert.title}
ข้อมูลโซน: {zones เป็นตาราง: ชื่อ ราคา มุมมอง}
ผู้ใช้: {displayName}, Tier {tier} (เข้าคิวก่อน {minutes} นาที), แต้ม {points}
รีวอร์ดที่แลกได้: {rewards ที่แต้มพอ}

- แนะนำโซนตามงบและความต้องการ บอกเหตุผลสั้น ๆ
- ถ้าแต้มพอแลกส่วนลด ให้บอกราคาหลังหักส่วนลด
- บอกโอกาสได้บัตรตาม Tier อย่างตรงไปตรงมา ไม่สัญญาว่าได้แน่นอน
- ถ้าถามเรื่องซื้อบัตรนอกระบบ เตือนเรื่องมิจฉาชีพ และแนะนำตลาดขายต่อในแอป (ไม่เกินราคาหน้าบัตร)
ตอบภาษาไทย ไม่เกิน 120 คำ
```

---

## 10. หน้าจอและ UI

**ธีม:** โทนสีเข้ม + ไฮไลต์เหลือง (ใกล้กับแบรนด์ U-topia) ฟอนต์ไทย เช่น **IBM Plex Sans Thai** หรือ **Noto Sans Thai** ใช้งานบนมือถือได้

| หน้า | องค์ประกอบ |
|---|---|
| **Navbar** | โลโก้ U-Ticket, เมนู, **dropdown เลือกผู้ใช้จำลอง** (แสดงชื่อ + Tier) |
| **หน้าแรก** `/` | Hero: *"U-Ticket — ใช้ทุกวัน ได้บัตรก่อนใคร"*, การ์ดคอน NOVA LUNE, ปุ่ม "เชื่อมกระเป๋า U-topia" (จำลอง) |
| **คอนเสิร์ต** `/concert/c1` | ผังโซน + ราคา, ไทม์ไลน์รอบ presale ตาม Tier, ไฮไลต์รอบของผู้ใช้ปัจจุบัน |
| **Dashboard** `/dashboard` | `ScoreGauge` (finalScore), `TierBadge`, streak 🔥, `ScoreBreakdown` (4 แท่ง), `TrustBadge`, ปุ่ม **"AI อธิบายคะแนน"**, การ์ด **AI Missions** 3 ใบ, ประวัติธุรกรรม 10 รายการล่าสุด |
| **Presale** `/presale` | ปุ่มใหญ่ **"▶ จำลองเปิดขาย presale"** → แสดง loading *"AI กำลังตรวจสอบ 24 บัญชี…"* → `QueueTable` เรียงลำดับพร้อม animation, แถวที่โดน flag เป็นสีแดงพร้อมเหตุผล, กล่องสรุปจาก AI ด้านบน, ตัวนับ "บอท/ปั๊มแต้มที่ถูกคัดออก" |
| **Concierge** `/concierge` | `ChatBox` แบบ streaming, ปุ่มคำถามตัวอย่าง: *"งบ 5,000 อยากเห็นเวทีชัด"*, *"มีคนขายบัตรใน Facebook ถูกกว่า ซื้อดีไหม"* |
| **Rewards** `/rewards` | แต้มคงเหลือ, การ์ดรีวอร์ด, ปุ่มแลก (ปิดถ้าแต้มไม่พอ) |

---

## 11. เดโมโหมด (สำคัญสำหรับบนเวที)

- ปุ่มลัดใน Navbar: **"เดโม: มายด์"** และ **"เดโม: ShopKing99"** สลับผู้ใช้ได้ในคลิกเดียว
- **Pre-warm:** เมื่อเปิดแอปให้เรียก `/api/trust` ของทุกคนไว้ล่วงหน้า เพื่อให้หน้า presale ขึ้นผลทันทีบนเวที
- มีไฟล์ `data/demo-cache.json` เก็บผล AI ที่รันไว้แล้ว ใช้แทนเมื่ออินเทอร์เน็ตในงานมีปัญหา (เปิดด้วย env `DEMO_OFFLINE=1`)

### ลำดับเดโม 3 นาที
1. Dashboard ของ **มายด์**: Gold, streak 18 วัน → กด "AI อธิบายคะแนน" → ดู AI Missions
2. สลับไป **ShopKing99**: ยอดธุรกรรมสูงกว่ามายด์ แต่ TrustBadge แดง และ AI อธิบายว่าเป็นการโอนวน
3. หน้า **Presale** → กดจำลอง → มายด์อยู่หัวคิว ส่วนบัญชีปั๊มแต้มและบอทตกไปท้ายคิว
4. **Concierge**: ถาม "งบ 5,000 อยากเห็นเวทีชัด" → AI แนะนำโซน + ส่วนลดจากแต้ม
5. ปิดด้วยตัวเลขคุณค่าทางธุรกิจ (จาก `U-Ticket_Idea.md` หัวข้อ 11)

---

## 12. Error Handling ขั้นต่ำ

- ทุก route ที่เรียก AI ต้องมี **try/catch + fallback** ที่ทำให้หน้าเว็บยังใช้งานได้
- ถ้า `output_parsed` เป็น `null` หรือ `res.status` ไม่ใช่ `"completed"` (เช่น ถูกปฏิเสธหรือคำตอบถูกตัด) ให้ใช้ fallback
- แสดงข้อความภาษาไทยเมื่อ AI ช้าหรือล้ม: *"AI กำลังยุ่ง แสดงผลจากการคำนวณพื้นฐานแทน"*
- **ห้ามเปิดเผย `OPENAI_API_KEY` ฝั่ง client**: เรียก AI จาก API route เท่านั้น

---

## 13. ลำดับการสร้าง (ตามเวลาแข่ง)

| เฟส | งาน | เวลาโดยประมาณ |
|---|---|---|
| **1. Setup** | สร้างโปรเจกต์ Next.js + Tailwind, ติดตั้ง `openai zod`, `lib/types.ts` | 30 นาที |
| **2. Data** | `scripts/seed.ts` → สร้าง JSON ทั้งหมด, `lib/data.ts` | 1 ชม. |
| **3. Scoring** | `lib/scoring.ts`, `lib/flags.ts`, `/api/users`, `/api/score` + ทดสอบว่า persona แต่ละแบบได้คะแนนสมเหตุสมผล | 1.5 ชม. |
| **4. AI Core** | `lib/ai.ts`, `lib/prompts.ts`, `/api/trust`, `/api/explain`, `/api/missions` | 2 ชม. |
| **5. Presale** | `/api/presale/simulate` + หน้า `/presale` พร้อม animation | 2 ชม. |
| **6. UI หลัก** | หน้าแรก, คอนเสิร์ต, Dashboard | 2.5 ชม. |
| **7. Concierge + Rewards** | streaming chat, หน้าแลกแต้ม | 1.5 ชม. |
| **8. Demo polish** | เดโมโหมด, pre-warm, offline cache, deploy Vercel, ซ้อมเดโม | 2 ชม. |

**แบ่งงานทีม 4 คน (แนะนำ):**
- คนที่ 1: เฟส 2–3 (ข้อมูล + สูตร)
- คนที่ 2: เฟส 4 + Concierge (AI ทั้งหมด)
- คนที่ 3: เฟส 6 + Rewards (UI)
- คนที่ 4: เฟส 5 + 8 (Presale + เดโม + สไลด์พิช)

---

## 14. Acceptance Criteria (เช็กก่อนขึ้นเวที)

- [ ] `npm run build` ผ่าน และ deploy บน Vercel ได้
- [ ] persona `true_fan` ส่วนใหญ่ได้ Gold ขึ้นไป, `farmer` และ `bot` ได้ trustMultiplier < 0.5
- [ ] **ShopKing99 มีจำนวนธุรกรรมมากกว่ามายด์ แต่ finalScore ต่ำกว่า** (หัวใจของเดโม)
- [ ] ผู้ใช้ `new_user` อย่างน้อย 1 คนได้ Silver (โชว์ว่าคนใหม่ไต่ได้)
- [ ] หน้า Presale แสดงผลภายใน 3 วินาทีหลัง pre-warm
- [ ] AI ทุกตัวตอบเป็นภาษาไทย และไม่มีข้อความกล่าวหาเกินข้อมูล
- [ ] ถ้าถอด `OPENAI_API_KEY` ออก แอปยังเปิดได้และใช้ fallback
- [ ] ใช้งานบนมือถือได้ (กรรมการและชุมชนอาจเปิดดูจากมือถือ)
- [ ] ไม่มี API key ในโค้ดฝั่ง client หรือใน git
