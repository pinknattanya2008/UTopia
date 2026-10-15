import Link from "next/link";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { fmtDate, fmtTHB } from "@/lib/client";
import type { Concert } from "@/lib/types";

export default function ConcertCard({ concert, available, capacity }: { concert: Concert; available: number; capacity: number }) {
  const minPrice = Math.min(...concert.zones.map((z) => z.priceTHB));
  const pct = capacity ? available / capacity : 0;
  return (
    <Link
      href={`/concert/${concert.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition hover:border-brand"
    >
      <div className="relative grid min-h-36 place-items-center border-b border-line bg-surface-2 p-6">
        <p className="text-center text-3xl font-black tracking-wide">{concert.artist}</p>
        {concert.plan === "pro" && (
          <span className="absolute left-3 top-3 rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-line">
            Presale ตาม Fan Score
          </span>
        )}
        {pct < 0.15 && (
          <span className="absolute right-3 top-3 rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">ใกล้เต็ม</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-bold leading-snug group-hover:text-brand">{concert.title}</h3>
        <div className="space-y-1 text-sm text-muted">
          <p className="flex items-center gap-1.5">
            <PlaceOutlinedIcon fontSize="small" /> {concert.venue}
          </p>
          <p className="flex items-center gap-1.5">
            <EventOutlinedIcon fontSize="small" /> {fmtDate(concert.date)}
          </p>
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <p className="text-sm">
            เริ่มต้น <span className="text-lg font-bold text-brand">{fmtTHB(minPrice)}</span>
          </p>
          <span className="flex items-center gap-1 text-sm font-semibold text-brand">
            ซื้อบัตร <ArrowForwardIcon fontSize="small" />
          </span>
        </div>
      </div>
    </Link>
  );
}
