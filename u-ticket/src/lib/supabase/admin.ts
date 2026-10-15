import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client ฝั่ง server ด้วย service role — ใช้ใน API routes / server components เท่านั้น
 * ห้าม import ไฟล์นี้จาก client component (key จะรั่ว)
 */
let _db: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (_db) return _db;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ยังไม่ได้ตั้ง NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  _db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _db;
}

/** ดึงทุกแถว (Supabase คืนครั้งละไม่เกิน 1000 แถว) */
export async function selectAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data as T[] | null) ?? [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}
