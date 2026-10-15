import { notFound } from "next/navigation";
import ConcertForm from "@/components/admin/ConcertForm";
import { currentProfile } from "@/lib/auth";
import { concertStats } from "@/lib/booking";
import { getConcert, ready } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EditConcertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ready();
  const p = await currentProfile();
  const concert = getConcert(id);
  // ผู้จัดแก้ได้เฉพาะคอนของตัวเอง (layout ตรวจ role แล้ว)
  if (!concert || !p || (p.role !== "admin" && p.organizer_id !== concert.organizerId)) notFound();
  const stats = await concertStats(concert);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">แก้ไข: {concert.title}</h1>
      </div>
      <ConcertForm concert={concert} layoutLocked={stats.ticketsSold > 0 || stats.held > 0} />
    </div>
  );
}
