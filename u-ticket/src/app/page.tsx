import CreditCardIcon from "@mui/icons-material/CreditCard";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ConnectWallet from "@/components/ConnectWallet";
import FanScoreCard from "@/components/FanScoreCard";
import ConcertCard from "@/components/ConcertCard";
import { sectionAvailability } from "@/lib/booking";
import { getPublishedConcerts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function Home() {
  const concerts = getPublishedConcerts();
  return (
    <div className="space-y-12">
      <section className="relative grid gap-8 overflow-hidden rounded-[2rem] border border-line bg-gradient-to-br from-white via-[#fff6ee] to-[#ffe9d6] p-6 shadow-soft sm:p-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
        <div className="relative">
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand shadow-soft">
            <AutoAwesomeIcon fontSize="inherit" /> Real Fans First · AI-Powered Ticketing
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
            ใช้ทุกวัน
            <br />
            <span className="text-brand">ได้บัตรก่อนใคร</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted sm:text-lg">
            จ่ายค่ากาแฟ ค่าเดินทาง ด้วย U-topia ทุกวัน ระบบจะให้คะแนนแฟนตัวจริง แล้วเปิดให้คุณกดบัตรก่อน{" "}
            <span className="font-semibold text-foreground">นับความถี่ ไม่นับยอดเงิน</span> และ AI ช่วยกันบอทออกไป
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#concerts"
              className="flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 font-bold text-white shadow-glow transition hover:bg-brand-dark"
            >
              <ConfirmationNumberOutlinedIcon /> ดูคอนเสิร์ตที่เปิดขาย
            </a>
            <ConnectWallet />
          </div>
        </div>
        <div className="relative">
          <FanScoreCard />
        </div>
      </section>

      <section>
        <h2 id="concerts" className="mb-4 scroll-mt-28 text-xl font-bold">คอนเสิร์ตที่เปิดขาย</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {concerts.map((c) => {
            const avail = Object.values(sectionAvailability(c));
            return (
              <ConcertCard
                key={c.id}
                concert={c}
                available={avail.reduce((n, a) => n + a.available, 0)}
                capacity={avail.reduce((n, a) => n + a.capacity, 0)}
              />
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-bold">ได้บัตรง่าย ๆ ใน 3 ขั้นตอน</h2>
        <p className="mb-4 text-sm text-muted">ยิ่งใช้ U-topia สม่ำเสมอ ยิ่งได้กดบัตรก่อน</p>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            { Icon: CreditCardIcon, title: "ใช้ U-topia ทุกวัน", body: "รูด U-Card ซื้อกาแฟ จ่ายค่าเดินทาง โอนด้วย U-Pay ทุกรายการช่วยเพิ่ม Fan Score" },
            { Icon: SmartToyOutlinedIcon, title: "AI ตรวจและจัดคิวให้", body: "AI กันบอทและบัญชีปั๊มแต้มออก แฟนตัวจริงได้เข้าคิวก่อนตาม Tier" },
            { Icon: ConfirmationNumberOutlinedIcon, title: "เลือกที่นั่ง รับ e-ticket", body: "เลือกที่นั่งบนผังได้เอง ใช้แต้มแลกส่วนลด แล้วรับบัตรในแอปทันที" },
          ].map((s, i) => (
            <li key={s.title} className="relative rounded-3xl border border-line bg-surface p-5 shadow-soft">
              <span className="absolute right-4 top-4 text-4xl font-black text-brand/15">{i + 1}</span>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                <s.Icon />
              </span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
