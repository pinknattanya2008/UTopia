import { notFound } from "next/navigation";
import ConcertForm from "@/components/admin/ConcertForm";
import { concertStats } from "@/lib/booking";
import { getConcert } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EditConcertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const concert = getConcert(id);
  if (!concert) notFound();
  const stats = concertStats(concert);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">แก้ไข: {concert.title}</h1>
      </div>
      <ConcertForm concert={concert} layoutLocked={stats.ticketsSold > 0 || stats.held > 0} />
    </div>
  );
}
