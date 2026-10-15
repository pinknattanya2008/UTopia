import { requireProfile } from "@/lib/auth";
import { checkIn } from "@/lib/checkin";
import { body, handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** POST { ticketId } เช็คอินบัตรหน้างาน (staff / admin) */
export async function POST(req: Request) {
  const { ticketId } = await body<{ ticketId?: string }>(req);
  return handle(async () => {
    const p = await requireProfile(["staff", "admin"]);
    return checkIn(p, String(ticketId ?? ""));
  });
}
