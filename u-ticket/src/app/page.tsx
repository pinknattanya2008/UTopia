import ConnectWallet from "@/components/ConnectWallet";
import FanScoreCard from "@/components/FanScoreCard";
import ConcertCard from "@/components/ConcertCard";
import { sectionAvailability } from "@/lib/booking";
import { getPublishedConcerts, ready } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ready();
  const concerts = getPublishedConcerts();
  const avails = await Promise.all(concerts.map((c) => sectionAvailability(c)));
  return (
    <div className="space-y-12">
      <section className="grid gap-8 pt-4 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
            ใช้ทุกวัน
            <br />
            ได้บัตรก่อนใคร
          </h1>
          <p className="mt-4 max-w-xl text-muted sm:text-lg">
            จ่ายค่ากาแฟ ค่าเดินทาง ด้วย U-topia ทุกวัน ระบบจะให้คะแนนแฟนตัวจริง แล้วเปิดให้คุณกดบัตรก่อน{" "}
            <span className="font-semibold text-foreground">นับความถี่ ไม่นับยอดเงิน</span> และ AI ช่วยกันบอทออกไป
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#concerts"
              className="rounded-lg bg-brand px-6 py-3 font-bold text-white transition hover:bg-brand-dark"
            >
              ดูคอนเสิร์ตที่เปิดขาย
            </a>
            <ConnectWallet />
          </div>
        </div>
        <FanScoreCard />
      </section>

      <section>
        <h2 id="concerts" className="mb-4 scroll-mt-28 text-xl font-bold">คอนเสิร์ตที่เปิดขาย</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {concerts.map((c, i) => {
            const avail = Object.values(avails[i]);
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
        <ol className="grid gap-x-8 gap-y-5 border-t border-line pt-5 sm:grid-cols-3">
          {[
            { title: "ใช้ U-topia ทุกวัน", body: "รูด U-Card ซื้อกาแฟ จ่ายค่าเดินทาง โอนด้วย U-Pay ทุกรายการช่วยเพิ่ม Fan Score" },
            { title: "AI ตรวจและจัดคิวให้", body: "AI กันบอทและบัญชีปั๊มแต้มออก แฟนตัวจริงได้เข้าคิวก่อนตาม Tier" },
            { title: "เลือกที่นั่ง รับ e-ticket", body: "เลือกที่นั่งบนผังได้เอง ใช้แต้มแลกส่วนลด แล้วรับบัตรในแอปทันที" },
          ].map((s, i) => (
            <li key={s.title}>
              <h3 className="font-semibold">
                <span className="mr-2 text-brand">{i + 1}.</span>
                {s.title}
              </h3>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
