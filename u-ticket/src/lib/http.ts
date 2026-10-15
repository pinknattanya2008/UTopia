import { BookingError } from "./errors";

/** แปลง BookingError เป็น JSON response ภาษาไทย */
export async function handle(fn: () => unknown | Promise<unknown>) {
  try {
    return Response.json(await fn());
  } catch (err) {
    if (err instanceof BookingError) return Response.json({ error: err.message }, { status: err.status });
    console.error(err);
    return Response.json({ error: "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง" }, { status: 500 });
  }
}

export async function body<T>(req: Request): Promise<T> {
  return (await req.json().catch(() => ({}))) as T;
}
