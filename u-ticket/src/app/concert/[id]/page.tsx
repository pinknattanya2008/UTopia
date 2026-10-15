import Link from "next/link";
import { notFound } from "next/navigation";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import EventSeatOutlinedIcon from "@mui/icons-material/EventSeatOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import PresaleTimeline from "@/components/PresaleTimeline";
import VenueMap from "@/components/VenueMap";
import { sectionAvailability } from "@/lib/booking";
import { getConcert, ready } from "@/lib/data";
import { fmtDate, fmtTHB, fmtTime } from "@/lib/client";

export const dynamic = "force-dynamic";

export default async function ConcertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ready();
  const concert = getConcert(id);
  if (!concert) notFound();
  const availability = await sectionAvailability(concert);
  const zoneAvail = (zoneId: string) =>
    concert.sections.filter((s) => s.zoneId === zoneId).reduce((n, s) => n + (availability[s.id]?.available ?? 0), 0);

  return (
    <div className="space-y-8">
      {concert.status === "draft" && (
        <p className="rounded-lg border border-brand/40 bg-brand/10 p-3 text-sm">หน้านี้เป็นร่าง (ตัวอย่างสำหรับผู้จัด) ยังไม่เปิดขาย</p>
      )}
      <section className="rounded-xl border border-line bg-surface">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <h1 className="text-2xl font-bold sm:text-4xl">{concert.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1">
                <PlaceOutlinedIcon fontSize="small" /> {concert.venue}
              </span>
              <span className="flex items-center gap-1">
                <EventOutlinedIcon fontSize="small" /> {fmtDate(concert.date)} {fmtTime(concert.date)} น.
              </span>
            </p>
            {concert.description && <p className="mt-3 max-w-2xl text-sm">{concert.description}</p>}
          </div>
          <Link
            href={`/concert/${concert.id}/book`}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 font-bold text-white hover:bg-brand-dark"
          >
            <EventSeatOutlinedIcon /> เลือกที่นั่ง / ซื้อบัตร
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div>
          <h2 className="mb-3 text-lg font-bold">ผังสถานที่และราคา</h2>
          <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
            <VenueMap concert={concert} availability={availability} />
            <div className="mt-4 divide-y divide-line">
              {concert.zones.map((z) => (
                <div key={z.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: z.color }} />
                    <div className="min-w-0">
                      <p className="font-semibold">{z.name}</p>
                      <p className="truncate text-xs text-muted">{z.view}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-brand">{fmtTHB(z.priceTHB)}</p>
                    <p className="text-xs text-muted">
                      ว่าง {zoneAvail(z.id).toLocaleString("th-TH")}/{z.capacity.toLocaleString("th-TH")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold">{concert.plan === "pro" ? "รอบ presale ตาม Tier" : "รอบการขาย"}</h2>
          {concert.plan === "pro" ? (
            <PresaleTimeline salesOpenAt={concert.salesOpenAt} />
          ) : (
            <div className="rounded-lg border border-line bg-surface p-4">
              <p className="flex items-center gap-2 font-semibold">
                <StorefrontOutlinedIcon className="text-brand" /> เปิดขายทั่วไปพร้อมกันทุกคน
              </p>
              <p className="mt-1 text-sm text-muted">
                {fmtDate(concert.salesOpenAt)} {fmtTime(concert.salesOpenAt)} น. · ซื้อได้สูงสุด {concert.maxTicketsPerUser} ใบ/บัญชี
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
