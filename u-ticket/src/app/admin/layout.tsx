import Link from "next/link";
import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** ส่วนผู้จัด: เฉพาะบัญชีผู้จัด (organizer) และแอดมิน */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const p = await currentProfile();
  if (!p) redirect("/login?next=/admin");
  if (p.role !== "organizer" && p.role !== "admin") {
    return (
      <div className="mx-auto max-w-md space-y-3 py-16 text-center">
        <h1 className="text-xl font-bold">ส่วนนี้สำหรับผู้จัดงาน</h1>
        <p className="text-sm text-muted">บัญชี {p.display_name} ไม่มีสิทธิ์จัดการคอนเสิร์ต — ล็อกอินด้วยบัญชีผู้จัดหรือแอดมิน</p>
        <Link href="/login?next=/admin" className="inline-block rounded-lg bg-brand px-5 py-2.5 font-bold text-white">
          เปลี่ยนบัญชี
        </Link>
      </div>
    );
  }
  return children;
}
