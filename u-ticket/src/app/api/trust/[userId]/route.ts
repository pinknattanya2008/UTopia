import { getUser } from "@/lib/fan";
import { AI_BUSY_NOTICE, ensureTrust } from "@/lib/insights";

export const dynamic = "force-dynamic";

/** POST ให้ AI ประเมินความน่าเชื่อถือ (cache ต่อ userId, ส่ง { force: true } เพื่อประเมินใหม่) */
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = getUser(userId);
  if (!user) return Response.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { force?: boolean };
  const { value, source } = await ensureTrust(user, Boolean(body.force));
  return Response.json({ ...value, source, notice: source === "fallback" ? AI_BUSY_NOTICE : undefined });
}
