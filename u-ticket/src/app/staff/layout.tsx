import Link from "next/link";
import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** หน้าเช็คอินหน้างาน: เฉพาะ staff และแอดมิน */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const p = await currentProfile();
  if (!p) redirect("/login?next=/staff");
  if (p.role !== "staff" && p.role !== "admin") {
    return (
      <div className="mx-auto max-w-md space-y-3 py-16 text-center">
        <h1 className="text-xl font-bold">ส่วนนี้สำหรับ Staff หน้างาน</h1>
        <p className="text-sm text-muted">บัญชี {p.display_name} ไม่มีสิทธิ์เช็คอินบัตร</p>
        <Link href="/login?next=/staff" className="inline-block rounded-lg bg-brand px-5 py-2.5 font-bold text-white">
          เปลี่ยนบัญชี
        </Link>
      </div>
    );
  }
  return children;
}
