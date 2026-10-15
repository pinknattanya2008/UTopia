import { createConcert, type ConcertInput } from "@/lib/admin";
import { body, handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** POST สร้างคอนเสิร์ตใหม่ */
export async function POST(req: Request) {
  const input = await body<ConcertInput>(req);
  return handle(() => createConcert(input));
}
