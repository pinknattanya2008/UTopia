import { requireProfile } from "@/lib/auth";
import { conciergeStream, type ChatMessage } from "@/lib/concierge";
import { getUser } from "@/lib/data";
import { BookingError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** POST แชต AI Concierge แบบ streaming (text/plain) — ใช้ข้อมูลของผู้ซื้อที่ล็อกอินอยู่ */
export async function POST(req: Request) {
  let user;
  try {
    const p = await requireProfile(["buyer"]);
    user = getUser(p.id);
  } catch (err) {
    const e = err as BookingError;
    return Response.json({ error: e.message }, { status: e.status ?? 401 });
  }
  if (!user) return Response.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { messages?: ChatMessage[] };
  const messages = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  if (messages.length === 0) return Response.json({ error: "ไม่มีข้อความ" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of conciergeStream(user, messages)) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
