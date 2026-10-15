import { requireProfile } from "@/lib/auth";
import { getUsers } from "@/lib/data";
import { handle } from "@/lib/http";
import { ensureAllTrust } from "@/lib/insights";

export const dynamic = "force-dynamic";

/** POST ให้ AI ประเมิน trust ของผู้ซื้อทุกคนไว้ล่วงหน้า (หน้า presale/ซื้อบัตรจะขึ้นผลทันที) */
export async function POST() {
  return handle(async () => {
    await requireProfile();
    const results = await ensureAllTrust(getUsers());
    return { ok: true, count: results.length };
  });
}
