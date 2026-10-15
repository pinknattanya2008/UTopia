import { getUser } from "@/lib/fan";
import { conciergeStream, type ChatMessage } from "@/lib/concierge";

export const dynamic = "force-dynamic";

/** POST แชต AI Concierge แบบ streaming (text/plain) */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { messages?: ChatMessage[]; userId?: string };
  const user = getUser(body.userId ?? "");
  if (!user) return Response.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
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
