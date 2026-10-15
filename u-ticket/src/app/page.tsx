import Link from "next/link";
import ConnectWallet from "@/components/ConnectWallet";
import TierBadge from "@/components/TierBadge";
import { getConcert } from "@/lib/data";
import { fmtDate, fmtTHB } from "@/lib/client";
import { TIERS } from "@/lib/scoring";

export default function Home() {
  const concert = getConcert("c1")!;
  const minPrice = Math.min(...concert.zones.map((z) => z.priceTHB));
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface-2 via-surface to-background p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
        <p className="mb-3 inline-block rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand">
          Real Fans First · AI-Powered Ticketing on U-topia
        </p>
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
          <span className="text-brand">U-Ticket</span> — ใช้ทุกวัน
          <br />
          ได้บัตรก่อนใคร
        </h1>
        <p className="mt-4 max-w-2xl text-muted sm:text-lg">
          ใช้ U-Card, U-Pay และ Wallet ในชีวิตประจำวัน สะสม Fan Score เพื่อรับสิทธิ์ presale ก่อนใคร{" "}
          <span className="text-foreground">นับความถี่ ไม่นับยอดเงิน</span> และให้ AI คัดบอทกับคนปั๊มแต้มออก
        </p>
        <div className="mt-6">
          <ConnectWallet />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">คอนเสิร์ตที่เปิดให้สะสมสิทธิ์</h2>
        <Link
          href="/concert/c1"
          className="group grid overflow-hidden rounded-3xl border border-line bg-surface transition hover:border-brand sm:grid-cols-[2fr_3fr]"
        >
          <div className="relative grid min-h-48 place-items-center bg-[radial-gradient(circle_at_30%_30%,#ffd40055,transparent_60%),radial-gradient(circle_at_70%_80%,#7c3aed66,transparent_55%)] p-6">
            <p className="text-center text-4xl font-black tracking-widest">
              NOVA
              <br />
              LUNE
            </p>
            <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs">🌙 World Tour 2026</span>
          </div>
          <div className="space-y-3 p-5 sm:p-6">
            <h3 className="text-xl font-bold group-hover:text-brand">{concert.title}</h3>
            <p className="text-sm text-muted">
              📍 {concert.venue}
              <br />
              📅 {fmtDate(concert.date)} · 19:00 น.
            </p>
            <p className="text-sm">
              เปิดขายทั่วไป {fmtDate(concert.salesOpenAt)} 12:00 น. · บัตรเริ่มต้น{" "}
              <span className="font-semibold text-brand">{fmtTHB(minPrice)}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {TIERS.slice(0, 3).map((t) => (
                <span key={t.name} className="flex items-center gap-1 text-xs text-muted">
                  <TierBadge tier={t.name} size="sm" /> {t.label}
                </span>
              ))}
            </div>
            <span className="inline-block font-semibold text-brand">ดูโซนและรอบ presale →</span>
          </div>
        </Link>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">ทำงานอย่างไร</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: "💳", title: "ใช้ U-topia ทุกวัน", body: "รูด U-Card ซื้อกาแฟ จ่ายค่าเดินทาง โอนด้วย U-Pay ทุกรายการนับเป็น Fan Score" },
            { icon: "🤖", title: "AI คัดบอทและคนปั๊มแต้ม", body: "ตรวจการโอนวน รายการถี่แบบเครื่องจักร และยอดพุ่งก่อนเปิดขาย แล้วลด Trust Multiplier" },
            { icon: "🎟️", title: "แฟนตัวจริงได้กดก่อน", body: "เปิดขายเป็นรอบตาม Tier: Diamond → Gold → Silver → ทั่วไป แลกแต้มเป็นส่วนลดได้" },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-3xl">{s.icon}</p>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
