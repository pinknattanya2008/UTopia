import { notFound } from "next/navigation";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import PresaleTimeline from "@/components/PresaleTimeline";
import { getConcert } from "@/lib/data";
import { fmtDate, fmtTHB } from "@/lib/client";

export default async function ConcertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const concert = getConcert(id);
  if (!concert) notFound();

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-brand">{concert.artist}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{concert.title}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
          <span className="flex items-center gap-1">
            <PlaceOutlinedIcon fontSize="small" /> {concert.venue}
          </span>
          <span className="flex items-center gap-1">
            <EventOutlinedIcon fontSize="small" /> {fmtDate(concert.date)} 19:00 น.
          </span>
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div>
          <h2 className="mb-3 text-lg font-bold">ผังโซนและราคา</h2>
          <div className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
            <div className="mx-auto mb-4 w-2/3 rounded-b-3xl bg-brand py-2 text-center text-sm font-bold text-black">เวที STAGE</div>
            <div className="space-y-2">
              {concert.zones.map((z, i) => (
                <div
                  key={z.id}
                  className="mx-auto flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3"
                  style={{ width: `${70 + i * 10}%`, background: `rgba(255,212,0,${0.22 - i * 0.05})` }}
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{z.name}</p>
                    <p className="truncate text-xs text-muted">{z.view}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-brand">{fmtTHB(z.priceTHB)}</p>
                    <p className="text-xs text-muted">{z.capacity.toLocaleString("th-TH")} ที่</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold">รอบ presale ตาม Tier</h2>
          <PresaleTimeline salesOpenAt={concert.salesOpenAt} />
        </div>
      </section>
    </div>
  );
}
