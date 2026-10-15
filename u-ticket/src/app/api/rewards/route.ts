import { requireProfile } from "@/lib/auth";
import { getRewards, getUser } from "@/lib/data";
import { handle } from "@/lib/http";
import { db } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** GET รายการรีวอร์ด + แต้มคงเหลือและประวัติการแลกของผู้ซื้อที่ล็อกอินอยู่ */
export async function GET() {
  return handle(async () => {
    const p = await requireProfile(["buyer"]);
    const { data, error } = await db().from("redemptions").select("reward_id, at").eq("user_id", p.id).order("at", { ascending: false });
    if (error) throw new Error(error.message);
    return {
      rewards: getRewards(),
      points: getUser(p.id)?.points ?? 0,
      redeemed: (data ?? []).map((r) => ({ rewardId: r.reward_id as string, at: r.at as string })),
    };
  });
}
