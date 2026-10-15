import { getRewards, getUser, store } from "@/lib/data";

export const dynamic = "force-dynamic";

/** GET รายการรีวอร์ด + แต้มคงเหลือและประวัติการแลกของผู้ใช้ (?userId=) */
export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId") ?? "";
  const user = getUser(userId);
  return Response.json({
    rewards: getRewards(),
    points: user?.points ?? 0,
    redeemed: store.redemptions.filter((r) => r.userId === userId),
  });
}
