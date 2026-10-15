import CreditCardIcon from "@mui/icons-material/CreditCard";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import ConnectWallet from "@/components/ConnectWallet";
import ConcertCard from "@/components/ConcertCard";
import { sectionAvailability } from "@/lib/booking";
import { getPublishedConcerts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function Home() {
  const concerts = getPublishedConcerts();
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
        <h2 className="mb-4 text-xl font-bold">คอนเสิร์ตที่เปิดขาย</h2>
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
        <h2 className="mb-4 text-xl font-bold">ทำงานอย่างไร</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { Icon: CreditCardIcon, title: "ใช้ U-topia ทุกวัน", body: "รูด U-Card ซื้อกาแฟ จ่ายค่าเดินทาง โอนด้วย U-Pay ทุกรายการนับเป็น Fan Score" },
            { Icon: SmartToyOutlinedIcon, title: "AI คัดบอทและคนปั๊มแต้ม", body: "ตรวจการโอนวน รายการถี่แบบเครื่องจักร และยอดพุ่งก่อนเปิดขาย แล้วลด Trust Multiplier" },
            { Icon: ConfirmationNumberOutlinedIcon, title: "แฟนตัวจริงได้กดก่อน", body: "เปิดขายเป็นรอบตาม Tier: Diamond → Gold → Silver → ทั่วไป แลกแต้มเป็นส่วนลดได้" },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border border-line bg-surface p-5">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/15 text-brand">
                <s.Icon />
              </span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
