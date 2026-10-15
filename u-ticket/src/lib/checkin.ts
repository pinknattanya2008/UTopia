/**
 * เช็คอินบัตรหน้างาน: ตรวจรหัสบัตร "<รหัสจอง>-<ลำดับ>" (เช่น UT-ABC123-1)
 * staff เช็คอินได้เฉพาะงานของผู้จัดที่สังกัด แอดมินเช็คอินได้ทุกงาน — เช็คอินซ้ำไม่ได้ (primary key)
 */
import { getConcert, getConcerts, getUser, ready } from "./data";
import { BookingError } from "./errors";
import { rowToBooking, type BookingRow, type ProfileRow } from "./mappers";
import { db } from "./supabase/admin";

function canManage(p: ProfileRow, organizerId: string) {
  return p.role === "admin" || p.organizer_id === organizerId;
}

export async function checkIn(p: ProfileRow, rawTicketId: string) {
  await ready();
  const ticketId = rawTicketId.trim().toUpperCase();
  const m = ticketId.match(/^(UT-[A-Z0-9]{6})-(\d+)$/);
  if (!m) throw new BookingError("รูปแบบรหัสบัตรไม่ถูกต้อง (เช่น UT-ABC123-1)");
  const { data, error } = await db().from("bookings").select("*").eq("code", m[1]).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.status !== "paid") throw new BookingError("ไม่พบบัตรนี้ หรือยังไม่ได้ชำระเงิน", 404);
  const booking = rowToBooking(data as BookingRow);
  const index = Number(m[2]) - 1;
  const item = booking.items[index];
  if (!item) throw new BookingError("ไม่พบบัตรลำดับนี้ในรายการจอง", 404);
  const concert = getConcert(booking.concertId);
  if (!concert) throw new BookingError("ไม่พบคอนเสิร์ต", 404);
  if (!canManage(p, concert.organizerId)) throw new BookingError("บัตรนี้ไม่ใช่งานของผู้จัดที่คุณสังกัด", 403);

  const info = {
    ticketId,
    concert: concert.title,
    seat: item.label,
    holder: getUser(booking.userId)?.displayName ?? booking.userId,
  };
  const { error: insErr } = await db()
    .from("checkins")
    .insert({ ticket_id: ticketId, booking_id: booking.id, item_index: index, concert_id: concert.id, staff_id: p.id });
  if (insErr) {
    if (insErr.code !== "23505") throw new Error(insErr.message);
    const { data: prev } = await db().from("checkins").select("at").eq("ticket_id", ticketId).single();
    return { status: "already" as const, at: prev?.at as string, ...info };
  }
  return { status: "ok" as const, at: new Date().toISOString(), ...info };
}

/** สรุปการเช็คอินของงานที่ดูแล + 20 รายการล่าสุด */
export async function checkinSummary(p: ProfileRow) {
  await ready();
  const concerts = getConcerts().filter((c) => c.status === "published" && canManage(p, c.organizerId));
  const ids = concerts.map((c) => c.id);
  if (!ids.length) return { concerts: [], recent: [] };
  const [{ data: recent }, { data: paid }, { data: all }] = await Promise.all([
    db().from("checkins").select("ticket_id, concert_id, at, booking_id").in("concert_id", ids).order("at", { ascending: false }).limit(20),
    db().from("bookings").select("concert_id, items").in("concert_id", ids).eq("status", "paid"),
    db().from("checkins").select("concert_id").in("concert_id", ids),
  ]);
  return {
    concerts: concerts.map((c) => ({
      id: c.id,
      title: c.title,
      ticketsInApp: (paid ?? []).filter((b) => b.concert_id === c.id).reduce((n, b) => n + (b.items as unknown[]).length, 0),
      checkedIn: (all ?? []).filter((r) => r.concert_id === c.id).length,
    })),
    recent: (recent ?? []).map((r) => ({
      ticketId: r.ticket_id as string,
      concert: getConcert(r.concert_id as string)?.title ?? r.concert_id,
      at: r.at as string,
    })),
  };
}
