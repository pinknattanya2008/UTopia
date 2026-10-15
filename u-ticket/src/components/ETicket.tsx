import { LogoMark } from "./Logo";
import TicketQR from "./TicketQR";

/**
 * ตั๋วดิจิทัล (จากไฟล์ออกแบบ "digital ticket"): การ์ดกรมท่า, ชื่องานตัวใหญ่,
 * เส้นปรุแบ่งต้นขั้ว + รอยบากบน/ล่าง, QR บนพื้นขาว — ธีมมืดยกพื้นขึ้น 1 ระดับ + เส้นขอบ เพราะพื้นหน้าเป็นกรมท่าเหมือนกัน
 */
export default function ETicket({
  eventName,
  dateVenue,
  seat,
  ticketId,
  checkedInAt,
}: {
  eventName: string;
  dateVenue: string;
  seat: string;
  ticketId: string;
  checkedInAt?: string | null;
}) {
  return (
    <article className="relative flex overflow-hidden rounded-xl bg-[#0F1A30] text-white dark:bg-surface dark:ring-1 dark:ring-line" aria-label={`ตั๋ว ${eventName} ${seat}`}>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-6 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <LogoMark size={26} accent="#4F7BFF" />
          <span className="font-display text-sm leading-none tracking-[-0.02em]">
            <span className="font-bold">U</span> <span className="font-medium">Ticket</span>
          </span>
        </div>
        <div className="space-y-1.5">
          <p className="font-display text-xl font-bold leading-tight tracking-[-0.02em] sm:text-2xl">{eventName}</p>
          <p className="text-sm font-medium text-[#AEB8D0]">{dateVenue}</p>
          <p className="pt-1 text-sm font-semibold">{seat}</p>
          {checkedInAt && (
            <p className="inline-block rounded-md bg-[#45b883]/20 px-2 py-0.5 text-xs font-semibold text-[#7fe0ad]">
              เช็คอินแล้ว {new Date(checkedInAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })}
            </p>
          )}
        </div>
      </div>
      <div className="flex w-32 shrink-0 flex-col items-center justify-center gap-2.5 border-l-2 border-dashed border-[#3A4766] p-3 sm:w-40">
        <TicketQR value={ticketId} size={88} />
        <p className="text-center text-[11px] font-medium text-[#AEB8D0]">{ticketId}</p>
      </div>
      {/* รอยบากบน/ล่างตรงเส้นปรุ — สีเดียวกับพื้นหลังหน้า */}
      <span className="absolute -top-3 right-[7.25rem] h-6 w-6 rounded-full bg-background sm:right-[9.25rem]" aria-hidden />
      <span className="absolute -bottom-3 right-[7.25rem] h-6 w-6 rounded-full bg-background sm:right-[9.25rem]" aria-hidden />
    </article>
  );
}
