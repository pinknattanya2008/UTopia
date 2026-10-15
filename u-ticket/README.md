# 🎫 U-Ticket — ใช้ทุกวัน ได้บัตรก่อนใคร

แอปกดบัตรคอนเสิร์ตบนกระเป๋า **U-topia** ที่ให้สิทธิ์ presale กับคนที่ใช้ U-topia บ่อยและสม่ำเสมอ (**นับความถี่ ไม่นับยอดเงิน**) และใช้ AI คัดบอทกับคนปั๊มแต้มออก

> U-Hackathon 2026 · Track 1: AI — สเปกเต็มอยู่ที่ [`../docs/U-Ticket_Build_Spec.md`](../docs/U-Ticket_Build_Spec.md), ไอเดียและพิชที่ [`../docs/U-Ticket_Idea.md`](../docs/U-Ticket_Idea.md)

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · OpenAI Node SDK (Responses API) + zod · ข้อมูลจำลองใน JSON

---

## เริ่มใช้งาน

ต้องใช้ **Node.js ≥ 22.18** (สคริปต์ `.ts` รันด้วย type stripping ของ Node โดยตรง ไม่ต้องลง tsx)

```bash
cd u-ticket
npm install
cp .env.example .env.local   # แล้วใส่ OPENAI_API_KEY เอง (ห้าม commit)
npm run dev                  # http://localhost:3000
```

### ตัวแปรแวดล้อม (`.env.local`)

| ตัวแปร | ค่า | หมายเหตุ |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | **ไม่ใส่ก็เปิดแอปได้** ทุกฟีเจอร์ AI จะใช้ fallback จากกฎในโค้ด |
| `OPENAI_MODEL` | `gpt-5.4-mini` (ค่าเริ่มต้น) | เปลี่ยนเป็นโมเดลที่ใหญ่กว่าได้โดยไม่ต้องแก้โค้ด |
| `DEMO_OFFLINE` | `1` | ใช้ผล AI จาก `data/demo-cache.json` แทนการเรียก OpenAI |

### สคริปต์

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` / `build` / `start` / `lint` | มาตรฐาน Next.js |
| `npm run seed` | สร้างข้อมูลจำลองใหม่ใน `data/` (seed คงที่ ได้ผลเหมือนเดิมทุกครั้ง) |
| `npm run check-scores` | พิมพ์ตารางคะแนนทุกคน + ตรวจเงื่อนไขของเดโม (exit 1 ถ้าไม่ผ่าน) |
| `npm run build-demo-cache` | บันทึกผล AI ทั้งหมดลง `data/demo-cache.json` (ต้องเปิด server ที่มี key ไว้ก่อน) |

---

## หน้าจอ

| Path | หน้าที่ |
|---|---|
| `/` | Hero, การ์ดคอน NOVA LUNE, ปุ่มเชื่อมกระเป๋า U-topia (จำลอง) |
| `/concert/c1` | ผังโซน + ราคา, ไทม์ไลน์รอบ presale ตาม Tier (ไฮไลต์รอบของผู้ใช้) |
| `/dashboard` | ScoreGauge, Tier, streak 🔥, คะแนน 4 องค์ประกอบ, TrustBadge, **AI อธิบายคะแนน**, **AI Missions**, ธุรกรรมล่าสุด |
| `/presale` | **หน้าไฮไลต์**: กดจำลอง → AI ตรวจ 24 บัญชี → คิวสลับลำดับแบบ animation, บัญชีโดน flag เป็นสีแดง |
| `/concierge` | แชต AI แบบ streaming แนะนำโซนตามงบ + ส่วนลดจากแต้ม + เตือนบัตรนอกระบบ |
| `/rewards` | แลกแต้ม (ส่วนลด, Presale Boost +5, สมาชิกแฟนคลับ, เสื้อทัวร์) |

เลือกผู้ใช้จำลองจาก dropdown บน Navbar หรือกดปุ่มลัด **เดโม: มายด์** / **เดโม: ShopKing99**

## API

| Method | Path | ผลลัพธ์ |
|---|---|---|
| GET | `/api/users` | ผู้ใช้ทั้งหมด (ไม่มี `persona`) + Tier ปัจจุบัน |
| GET | `/api/score/[userId]` | ScoreBreakdown + trust + flags + ธุรกรรมล่าสุด |
| POST | `/api/trust/[userId]` | TrustAssessment (`{ force: true }` = ประเมินใหม่) |
| POST | `/api/missions/[userId]` | `{ missions }` 3 ภารกิจ |
| POST | `/api/explain/[userId]` | `{ explanation }` |
| POST | `/api/presale/simulate` | `{ queue, summary, stats }` |
| POST | `/api/concierge` | text stream |
| GET | `/api/rewards?userId=` | รีวอร์ด + แต้มคงเหลือ |
| POST | `/api/rewards/redeem` | `{ ok, pointsLeft }` |

ทุก response จาก AI มีฟิลด์ `source`: `ai` (OpenAI), `cache` (demo-cache.json), `fallback` (กฎในโค้ด)

## โครงสร้างโค้ดหลัก

```
src/lib/
  types.ts      Data models (Spec §4)
  scoring.ts    สูตร Fan Score (Spec §6) — โค้ดล้วน ไม่ใช้ AI
  flags.ts      กฎตรวจความผิดปกติชั้น 1 + fallback trust (Spec §7)
  data.ts       โหลด JSON + state ใน memory (แต้ม, cache AI)
  ai.ts         OpenAI client (Responses API + zodTextFormat, streaming)
  prompts.ts    System prompts (Spec §9.4)
  insights.ts   trust / explain / missions: cache → offline cache → AI → fallback
  presale.ts    จำลองคิว presale + AI สรุป
  concierge.ts  แชต streaming + คำตอบ fallback
scripts/        seed.ts, check-scores.ts, build-demo-cache.ts
data/           users / transactions / concerts / rewards / demo-cache (.json)
```

### ความปลอดภัย
- เรียก OpenAI จาก API route ฝั่ง server เท่านั้น key ไม่เคยถูกส่งไป client
- `.env*.local` อยู่ใน `.gitignore`, มีแค่ `.env.example` ที่ไม่มีค่า key
- ฟิลด์ `persona` ไม่ถูกส่งให้ AI หรือ client

### Guardrail ของ Trust
ผล AI ถูก clamp เป็น 0–1 และปรับให้สอดคล้องกับหลักฐานจากกฎ: ถ้าไม่มี flag เลย trust ≥ 0.8 (กัน AI กล่าวหาเกินข้อมูล), ถ้ามี flag ≥ 2 ข้อ trust ≤ 0.45

---

## Deploy บน Vercel

1. Import repo บน Vercel แล้วตั้ง **Root Directory = `u-ticket`**
2. ตั้ง Environment Variables: `OPENAI_API_KEY`, `OPENAI_MODEL` (และ `DEMO_OFFLINE=1` ถ้าต้องการโหมดออฟไลน์)
3. Deploy — ข้อมูล JSON ถูก bundle ไปกับแอป ไม่ต้องตั้งฐานข้อมูล

> state (แต้มที่แลก, cache AI) อยู่ใน memory ของแต่ละ instance และหายเมื่อ instance ถูกสร้างใหม่ ซึ่งพอสำหรับเดโม

## เตรียมเดโม

1. **ก่อนขึ้นเวที (มีเน็ต):** `npm run dev` พร้อม key → อีก terminal `npm run build-demo-cache` → commit `data/demo-cache.json`
2. **Pre-warm:** เปิดหน้าใดก็ได้ แอปจะเรียก `/api/trust` ของทุกคนอัตโนมัติ (Navbar ขึ้น "AI กำลังเตรียมข้อมูล…") รอจนข้อความหายแล้วค่อยเริ่มเดโม
3. **เน็ตล่ม:** รันด้วย `DEMO_OFFLINE=1` (ต้อง `npm run build` ใหม่หลังอัปเดต cache เพราะไฟล์ถูก bundle)

### ลำดับเดโม 3 นาที

1. **Dashboard ของมายด์** (`เดโม: มายด์`): Gold 🥇, streak 18 วัน 🔥 → กด **AI อธิบายคะแนน** → ดู **AI Missions** (อีก ~1 คะแนนจะขึ้น Diamond)
2. **สลับไป ShopKing99**: ธุรกรรม 599 รายการ (มายด์มี 41) แต่ Fan Score แค่ ~7 — TrustBadge แดง, AI อธิบายว่าเป็นการโอนวนกับ u20 และโอนเข้ากระเป๋าตัวเอง
3. **Presale** → กด **▶ จำลองเปิดขาย presale**: ตอนแรกเรียงตามจำนวนธุรกรรม (บอท/ปั๊มแต้มอยู่บน) → AI จัดคิวใหม่ แฟนตัวจริงขึ้นหัวคิว มายด์คิวที่ 5 (อันดับ 1 ของ Gold), 6 บัญชีผิดปกติสีแดงตกไปท้ายคิว
4. **Concierge**: กด "งบ 5,000 อยากเห็นเวทีชัด" → แนะนำ Zone A 5,500 บาท แลกส่วนลด 800 เหลือ 4,700 บาท
5. ปิดด้วยคุณค่าทางธุรกิจ: คอนใหญ่ 1 งานมีคนแย่งบัตร 200,000 คน ถ้า 10% สมัคร U-topia และใช้วันละ 2 รายการ 30 วัน = **ผู้ใช้ใหม่ 20,000 คน, 1.2 ล้านธุรกรรม/คอน** *(ตัวเลขสมมติฐาน)*

> ทริก: แลก **Presale Boost** ให้มายด์ที่หน้า `/rewards` แล้วกลับไป Dashboard จะเห็นขึ้น Diamond ทันที

## ข้อมูลจำลอง

24 ผู้ใช้ 5 persona, ธุรกรรม 30 วัน (16 ก.ย. – 15 ต.ค. 2026), คอน NOVA LUNE (ศิลปินสมมติ), รีวอร์ด 5 รายการ
ผลจาก `npm run check-scores` (trust จาก fallback):

| Persona | ผล |
|---|---|
| `true_fan` ×6 | Diamond 4, Gold 2 (มายด์ 78.8 Gold) |
| `regular` ×8 | Silver ทั้งหมด |
| `new_user` ×4 | Silver 1, General 3 |
| `farmer` ×4 | trust 0.1–0.25, General (ShopKing99 7.0) |
| `bot` ×2 | trust 0.1, General |
