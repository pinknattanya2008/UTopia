# U Ticket — ใช้ทุกวัน ได้บัตรก่อนใคร

แอปกดบัตรคอนเสิร์ตบนกระเป๋า **U-topia** ที่ให้สิทธิ์ presale กับคนที่ใช้ U-topia บ่อยและสม่ำเสมอ (**นับความถี่ ไม่นับยอดเงิน**) และใช้ AI คัดบอทกับคนปั๊มแต้มออก

> U-Hackathon 2026 · Track 1: AI — สเปกเต็มอยู่ที่ [`../docs/U-Ticket_Build_Spec.md`](../docs/U-Ticket_Build_Spec.md), ไอเดียและพิชที่ [`../docs/U-Ticket_Idea.md`](../docs/U-Ticket_Idea.md)

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · MUI Icons (`@mui/icons-material`) · OpenAI Node SDK (Responses API) + zod · ข้อมูลจำลองใน JSON

---

## เริ่มใช้งาน

ต้องใช้ **Node.js ≥ 22.18** (สคริปต์ `.ts` รันด้วย type stripping ของ Node โดยตรง ไม่ต้องลง tsx)

```bash
cd u-ticket
npm install
cp .env.example .env.local   # ใส่ค่า Supabase + OPENAI_API_KEY เอง (ห้าม commit)
npm run db:push              # สร้างตาราง/ฟังก์ชันใน Supabase (ต้อง supabase link ก่อน — ดูหัวข้อ Supabase)
npm run db:seed              # สร้างบัญชีเดโมทุกแบบ + อัปโหลดผู้ใช้ ธุรกรรม คอนตัวอย่าง
npm run dev                  # http://localhost:3000 → /login
```

## Supabase (ฐานข้อมูลจริง + ล็อกอิน)

Project: `u-ticket` (ref `gtypqawlclxeeeqpviiv`, Singapore) · schema อยู่ที่ `supabase/migrations/`

| ตาราง | เก็บอะไร |
|---|---|
| `profiles` | บัญชีทุกแบบ (ผูกกับ Supabase Auth ผ่าน `auth_id`) + role, แต้ม, Presale Boost, ข้อมูลแฟน |
| `organizers` | ผู้จัดงาน (Lunar Live = Pro, Echo House = Basic) |
| `transactions` | ธุรกรรม U-topia 30 วันของผู้ซื้อ (3,463 รายการ) |
| `concerts` | คอนเสิร์ต + ผัง (zones/sections/stage/รูปพื้นหลัง เป็น jsonb) |
| `bookings` | การจอง (held → paid / cancelled / expired) |
| `seat_locks` | ที่นั่งที่ล็อก/ขายแล้ว — primary key `(concert_id, seat_id)` กันจองซ้ำแม้มีหลาย server |
| `redemptions`, `blocked_attempts`, `checkins` | การแลกแต้ม, บัญชีที่ AI กันไม่ให้ซื้อ, การเช็คอินหน้างาน |

- **ทุกตารางเปิด RLS และไม่มี policy** → client อ่านเขียนตรงไม่ได้ ข้อมูลทั้งหมดผ่าน API routes ฝั่ง server ด้วย service role (`src/lib/supabase/admin.ts`)
- **ล็อกอิน:** Supabase Auth (อีเมล/รหัสผ่าน) session อยู่ใน cookie (`@supabase/ssr`) — API ทุกตัวอ่านตัวตนจาก session ไม่เชื่อ `userId` ที่ส่งมาจากหน้าเว็บ
- **งานที่ต้องทำครบทั้งชุด** เป็นฟังก์ชัน Postgres: `place_hold` (ล็อกที่นั่ง + ตรวจจำนวนบัตร/ความจุโซนยืน), `confirm_booking` (หักแต้ม + ชำระ), `cancel_booking`, `redeem_reward`
- **Cache ฝั่ง server:** profiles/concerts 15 วินาที (ล้างทันทีหลังเขียน), transactions/rewards โหลดครั้งเดียว, ผล AI ใน memory

```bash
supabase link --project-ref <ref> -p <db-password>   # ครั้งแรก
npm run db:push    # migration ใหม่
npm run db:seed    # อัปเดตบัญชี/ข้อมูลตั้งต้น (ไม่ลบการจอง)
npm run db:reset   # ล้างการจอง เช็คอิน แต้มที่ใช้ คอนที่สร้างเพิ่ม กลับเป็นค่าตั้งต้น
```

### บัญชีเดโม (รหัสผ่านทุกบัญชี = `DEMO_PASSWORD` ใน `.env.local`)

หน้า `/login` มีปุ่มเข้าบัญชีเดโมในคลิกเดียว (เปิดด้วย `DEMO_LOGIN=1`, รหัสผ่านอยู่ฝั่ง server เท่านั้น) และ Navbar มี dropdown สลับบัญชี

| Role | อีเมล | เข้าได้ |
|---|---|---|
| ผู้ซื้อ ×24 | `u01@demo.uticket.app` … `u24@demo.uticket.app` (u01 มายด์, u19 ShopKing99, u23 บอท ฯลฯ) | ซื้อบัตร, Fan Score, บัตรของฉัน, แลกแต้ม, Concierge |
| ผู้จัด · Pro | `organizer.pro@demo.uticket.app` (Lunar Live) | `/admin` เฉพาะ NOVA LUNE, SUNRISE Fest |
| ผู้จัด · Basic | `organizer.basic@demo.uticket.app` (Echo House) | `/admin` เฉพาะ Midnight Echo |
| แอดมิน | `admin@demo.uticket.app` | `/admin` ทุกคอน + รายได้ทั้งแพลตฟอร์ม + ล้างข้อมูลเดโม, `/staff` |
| Staff หน้างาน | `staff@demo.uticket.app` (Lunar Live) | `/staff` เช็คอินบัตรงานของ Lunar Live |

### ตัวแปรแวดล้อม (`.env.local`)

| ตัวแปร | ค่า | หมายเหตุ |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | **ไม่ใส่ก็เปิดแอปได้** ทุกฟีเจอร์ AI จะใช้ fallback จากกฎในโค้ด |
| `OPENAI_MODEL` | `gpt-5.4-mini` (ค่าเริ่มต้น) | เปลี่ยนเป็นโมเดลที่ใหญ่กว่าได้โดยไม่ต้องแก้โค้ด |
| `DEMO_OFFLINE` | `1` | ใช้ผล AI จาก `data/demo-cache.json` แทนการเรียก OpenAI |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | จาก Supabase | ใช้ล็อกอินฝั่งเว็บ |
| `SUPABASE_SERVICE_ROLE_KEY` | จาก Supabase | **server เท่านั้น** ใช้อ่านเขียนข้อมูลทั้งหมด |
| `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` | | ใช้กับ supabase CLI (`db:push`) |
| `DEMO_PASSWORD`, `DEMO_LOGIN` | | รหัสผ่านบัญชีเดโม / เปิดปุ่มล็อกอินเดโม |

### สคริปต์

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` / `build` / `start` / `lint` | มาตรฐาน Next.js |
| `npm run seed` | สร้างข้อมูลจำลองใหม่ใน `data/` (seed คงที่ ได้ผลเหมือนเดิมทุกครั้ง) |
| `npm run check-scores` | พิมพ์ตารางคะแนนทุกคน + ตรวจเงื่อนไขของเดโม (exit 1 ถ้าไม่ผ่าน) |
| `npm run build-demo-cache` | บันทึกผล AI ทั้งหมดลง `data/demo-cache.json` (ต้องเปิด server ที่มี key ไว้ก่อน — ล็อกอินบัญชีเดโมให้เอง) |
| `npm run db:push` / `db:seed` / `db:reset` | สร้างตารางใน Supabase / อัปโหลดข้อมูล + บัญชีเดโม / ล้างข้อมูลที่เกิดจากการใช้งาน |

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
| `/concert/[id]/book` | **เลือกที่นั่ง**: ผังรวมแสดงทุกที่นั่ง ซูม/เลื่อนได้ (ล้อเมาส์, ลาก, pinch, ปุ่ม) กดโซนเพื่อซูม แล้วกดที่นั่งเลือกได้ทันที · การ์ดรายละเอียดที่นั่ง (แถว/เลขที่นั่ง/ราคา/ระยะจากเวที/มุมมอง/ภาพจำลองมุมมอง) · บัตรยืนเลือกจำนวน → ล็อกที่นั่ง 10 นาที |
| `/checkout/[bookingId]` | ชำระเงิน (จำลอง U-Card) + ใช้แต้มแลกส่วนลด → e-ticket |
| `/tickets` | บัตรของฉัน (QR จำลอง) |
| `/admin` | **ผู้จัดงาน**: ยอดขาย, รายได้แพลตฟอร์ม 2 ทาง, รายการคอนเสิร์ต |
| `/admin/concerts/new` | สร้างคอนเสิร์ต: เริ่มจาก template (Arena / Theater / Hall) แล้วจัดผังด้วยตัวจัดผังแบบง่าย — ลากบล็อกเพื่อย้าย (ล็อกกริด 10 หน่วย อยู่ในกรอบเสมอ, ลูกศรเลื่อนทีละช่อง), ปรับแถว/ที่นั่ง/ขนาด/หมุนทีละ 15° ด้วยปุ่ม, เพิ่มโซนที่นั่ง/โซนยืน, ทำสำเนา/ลบ, วางรูปผังสถานที่เป็นพื้นหลัง, เตือนเมื่อโซนวางทับกัน, เพิ่ม/ลบโซนราคา, แพ็กเกจ Basic/Pro |
| `/admin/concerts/[id]` | สถิติรายคอน: ยอดขายตามโซน, ที่ว่างตาม section, การแบ่งรายได้, Fan insights, เผยแพร่/แก้ไข/ลบ |

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
| GET | `/api/concerts` | คอนที่เผยแพร่ + ราคาเริ่มต้น + ที่ว่าง |
| GET | `/api/concerts/[id]?userId=&clock=` | คอน + ที่ว่างต่อ section + สิทธิ์ซื้อของผู้ใช้ |
| GET | `/api/concerts/[id]/seats?section=&userId=` | ที่นั่งที่ขายแล้ว / ถูกล็อก / ของฉัน |
| POST | `/api/bookings` | ล็อกที่นั่ง `{ userId, concertId, seats?, standing?, clock? }` |
| GET | `/api/bookings?userId=` · `/api/bookings/[id]?userId=` | บัตรที่ชำระแล้ว · รายการจอง |
| POST | `/api/bookings/[id]/confirm` · `/cancel` | ชำระเงิน (`discountRewardId?`) · ยกเลิก |
| GET/POST | `/api/admin` · `/api/admin/concerts` | ภาพรวมผู้จัด · สร้างคอน |
| GET/PUT/PATCH/DELETE | `/api/admin/concerts/[id]` | สถิติ · แก้ไข · เผยแพร่ · ลบร่าง |
| POST | `/api/admin/reset` | ล้างข้อมูลเดโม |

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
- `SUPABASE_SERVICE_ROLE_KEY` ใช้ฝั่ง server เท่านั้น, ทุกตารางเปิด RLS, หน้า `/admin` `/staff` และหน้าของผู้ซื้อตรวจ role ทั้งใน layout และ API

### ระบบขายบัตรและรายได้ 2 ทาง

| ฝ่าย | จ่ายอะไร | ค่าเริ่มต้น (`src/lib/venue.ts`) |
|---|---|---|
| ผู้ซื้อ | ค่าบริการต่อบัตร | 40 บาท/ใบ (`SERVICE_FEE_PER_TICKET`) |
| ผู้จัด · Basic | ค่าคอมมิชชันจากยอดขายบัตร | 5% — ผังที่นั่ง, e-ticket, dashboard |
| ผู้จัด · Pro | ค่าคอมมิชชันจากยอดขายบัตร | 8% — เพิ่ม presale ตาม Fan Score, AI กันบอท (trust < 0.5 ซื้อไม่ได้), Fan insights |

รายได้แพลตฟอร์ม = คอมมิชชัน + ค่าบริการ − ส่วนลดจากแต้ม (แพลตฟอร์มออกเป็นต้นทุน loyalty)

- **เวลาจำลอง (เดโม):** หน้าเลือกที่นั่งของงาน Pro มีแถบเลือกเวลา 09:00 / 10:00 Diamond / 11:00 Gold / 11:30 Silver / 12:00 ทั่วไป เพื่อโชว์ว่าแต่ละ Tier เข้าซื้อได้คนละเวลา (server ตรวจซ้ำทุกครั้งที่ล็อกที่นั่ง)
- **ตัวจัดผัง:** แสดง section เป็นบล็อก (ไม่วาดที่นั่งรายจุด จึงลื่น) · ระหว่างลากอัปเดตเฉพาะในตัวจัดผัง แล้วบันทึกตอนปล่อย · รูปผังที่อัปโหลดถูกย่อเป็น JPEG ไม่เกิน ~1.5 MB · เส้นหนาด้านบนของบล็อกคือแถว A · หลังมียอดขายแล้วผังจะถูกล็อก
- **ยอดขายตั้งต้น:** c1 และ c2 มีที่นั่งที่ "ขายไปแล้ว" แบบ deterministic ให้ผังดูสมจริง คอนที่สร้างใหม่เริ่มจาก 0
- **การเก็บข้อมูล:** ทุกอย่างอยู่ใน Supabase — ปุ่ม "ล้างข้อมูลเดโม" (เฉพาะแอดมิน) หรือ `npm run db:reset` คืนค่าตั้งต้น
- **สิทธิ์:** ผู้จัดเห็น/แก้ได้เฉพาะคอนของตัวเอง, แอดมินเห็นทุกคอน, staff เช็คอินได้เฉพาะงานของผู้จัดที่สังกัด
- **เช็คอินหน้างาน** `/staff`: กรอก/สแกนรหัสบัตร `UT-XXXXXX-n` (อยู่ใต้ QR) → เข้างานได้ / เช็คอินไปแล้ว / ไม่พบบัตร — บัตรใน "บัตรของฉัน" แสดงเวลาที่เช็คอิน

### แบรนด์และธีม
ตามไฟล์ออกแบบโลโก้ (`../Logo on dark and light-html`, `../App icon, small sizes, digital ticket-html`):
- **โลโก้** `src/components/Logo.tsx` — สัญลักษณ์ตัว U + รอยบากแบบตั๋ว + จุดน้ำเงิน, ตัวหนังสือ "**U** Ticket" ฟอนต์ Sora · ตัว U ใช้ `currentColor` จึงเป็นกรมท่าบนพื้นสว่างและขาวบนพื้นมืดเอง
- **App icon** `src/app/icon.svg` (favicon), `src/app/apple-icon.tsx` (PNG 180px สร้างด้วย `next/og`), `src/app/manifest.ts`
- **ตั๋วดิจิทัล** `src/components/ETicket.tsx` — การ์ดกรมท่า, เส้นปรุ + รอยบาก, QR บนพื้นขาว (หน้า "บัตรของฉัน" และหน้าชำระเงินสำเร็จ)
- **สี:** กรมท่า `#0F1A30` + พื้นเทาอมฟ้า `#F4F6FB` / เส้น `#DCE2F0` + น้ำเงิน `#4F7BFF` เป็นสีเน้นสีเดียว · โหมดมืดใช้กรมท่าเป็นพื้น ตัวหนังสือรอง `#AEB8D0`
- **ฟอนต์:** Sora สำหรับโลโก้และตัวละตินในหัวข้อ, IBM Plex Sans Thai สำหรับภาษาไทยและเนื้อหา
- **โหมดสว่าง/มืด:** ปุ่มใน Navbar วน ตามเครื่อง → สว่าง → มืด (จำค่าไว้, สคริปต์ใน `<head>` ตั้งธีมก่อนแสดงผลจึงไม่กะพริบ) · สีทั้งหมดเป็น CSS variables ใน `src/app/globals.css` (`:root` = สว่าง, `[data-theme="dark"]` = มืด) และ SVG อ้างตัวแปรเดียวกันผ่าน `src/lib/theme.ts`

### Icons
UI ใช้ **MUI icons** แทน emoji ทั้งหมด (import ทีละไฟล์ เช่น `@mui/icons-material/CreditCard`) และห่อด้วย `AppRouterCacheProvider` (`enableCssLayer`) ให้ Tailwind utilities override style ของ MUI ได้
- avatar ผู้ใช้เป็นวงกลมสี + อักษรแรกของชื่อ (`components/UserAvatar.tsx`) ฟิลด์ `avatar` ใน `users.json` เก็บสี
- prompt ทุกตัวสั่ง "ห้ามใช้ emoji" และ `stripEmoji()` ใน `lib/ai.ts` ตัด emoji ที่ AI อาจส่งมาออกอีกชั้น

### Guardrail ของ Trust
ผล AI ถูก clamp เป็น 0–1 และปรับให้สอดคล้องกับหลักฐานจากกฎ: ถ้าไม่มี flag เลย trust ≥ 0.8 (กัน AI กล่าวหาเกินข้อมูล), ถ้ามี flag ≥ 2 ข้อ trust ≤ 0.45

---

## Deploy บน Vercel

1. Import repo บน Vercel แล้วตั้ง **Root Directory = `u-ticket`**
2. ตั้ง Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_PASSWORD`, `DEMO_LOGIN`, `OPENAI_API_KEY`, `OPENAI_MODEL` (และ `DEMO_OFFLINE=1` ถ้าต้องการโหมดออฟไลน์)
3. Deploy — ข้อมูลอยู่ใน Supabase จึงใช้ร่วมกันทุก instance (มีแค่ cache ของผล AI ที่แยกต่อ instance)
4. ถ้าเปิดให้คนนอกใช้จริง ให้ตั้ง `DEMO_LOGIN=` (ว่าง) เพื่อปิดปุ่มล็อกอินเดโม

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

6. *(ถ้ามีเวลา)* **ซื้อบัตรจริง**: มายด์ → คอนเสิร์ต → เลือกที่นั่ง (เวลาจำลอง 11:00 รอบ Gold) → เลือก A2 → ชำระด้วยส่วนลด 800 → e-ticket แล้วสลับเป็น ShopKing99 จะเห็นว่าถูก AI ระงับสิทธิ์ซื้อ
7. **ฝั่งผู้จัด** `/admin`: รายได้ 2 ทาง (คอมมิชชันจากผู้จัด + ค่าบริการจากผู้ซื้อ) และสร้างคอนใหม่จาก template ได้ในไม่กี่คลิก

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
