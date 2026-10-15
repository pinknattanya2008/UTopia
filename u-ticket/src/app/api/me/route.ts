import { currentProfile } from "@/lib/auth";
import { getOrganizers, getUser, toPublicUser } from "@/lib/data";
import { getScore } from "@/lib/fan";
import { handle } from "@/lib/http";
import { profileToAccount } from "@/lib/mappers";

export const dynamic = "force-dynamic";

/** GET บัญชีที่ล็อกอินอยู่ (+ Fan Score ถ้าเป็นผู้ซื้อ) หรือ { account: null } */
export async function GET() {
  return handle(async () => {
    const p = await currentProfile();
    if (!p) return { account: null };
    const account = { ...profileToAccount(p), organizerName: getOrganizers().find((o) => o.id === p.organizer_id)?.name ?? null };
    const u = p.role === "buyer" ? getUser(p.id) : undefined;
    if (!u) return { account };
    const { score } = getScore(u);
    return { account, user: { ...toPublicUser(u), tier: score.tier, finalScore: score.finalScore } };
  });
}
