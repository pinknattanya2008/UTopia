import Link from "next/link";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { fmtDate, fmtTHB } from "@/lib/client";
import type { Concert } from "@/lib/types";

/** โปสเตอร์ไล่สีจากสีโซนของงาน (ไม่ต้องมีรูป) */
export function posterStyle(c: Pick<Concert, "zones">) {
  const [a, b] = [c.zones[0]?.color ?? "#ffd400", c.zones[c.zones.length - 1]?.color ?? "#7c3aed"];
  return { background: `radial-gradient(circle at 25% 25%, ${a}66, transparent 60%), radial-gradient(circle at 75% 85%, ${b}77, transparent 55%), #15151d` };
}

export default function ConcertCard({ concert, available, capacity }: { concert: Concert; available: number; capacity: number }) {
  const minPrice = Math.min(...concert.zones.map((z) => z.priceTHB));
  const pct = capacity ? available / capacity : 0;
  return (
    <Link
      href={`/concert/${concert.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition hover:border-brand"
    >
      <div className="relative grid min-h-40 place-items-center p-6" style={posterStyle(concert)}>
        <p className="text-center text-3xl font-black uppercase tracking-widest">{concert.artist}</p>
        {concert.plan === "pro" && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-brand">
            <AutoAwesomeIcon fontSize="inherit" /> Fan Score Presale
          </span>
        )}
        {pct < 0.15 && (
          <span className="absolute right-3 top-3 rounded-full bg-danger px-2 py-0.5 text-xs font-semibold">ใกล้เต็ม</span>
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
