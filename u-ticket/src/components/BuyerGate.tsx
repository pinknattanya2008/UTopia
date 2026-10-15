import Link from "next/link";
import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/auth";

/** หน้าของผู้ซื้อ: ต้องล็อกอินด้วยบัญชีผู้ซื้อ (ผู้จัด/แอดมิน/staff เห็นข้อความแนะนำแทน) */
export default async function BuyerGate({ path, children }: { path: string; children: React.ReactNode }) {
  const p = await currentProfile();
  if (!p) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (p.role !== "buyer") {
    const home = p.role === "staff" ? "/staff" : "/admin";
    return (
      <div className="mx-auto max-w-md space-y-3 py-16 text-center">
        <h1 className="text-xl font-bold">หน้านี้สำหรับบัญชีผู้ซื้อ</h1>
        <p className="text-sm text-muted">ตอนนี้ล็อกอินเป็น {p.display_name}</p>
        <div className="flex justify-center gap-2">
          <Link href={home} className="rounded-lg bg-brand px-5 py-2.5 font-bold text-white">
            ไปหน้าของบัญชีนี้
          </Link>
          <Link href={`/login?next=${encodeURIComponent(path)}`} className="rounded-lg border border-line px-5 py-2.5">
            เปลี่ยนบัญชี
          </Link>
        </div>
      </div>
    );
  }
  return children;
}
