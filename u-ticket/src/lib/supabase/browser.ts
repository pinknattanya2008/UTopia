"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Supabase client ฝั่งเว็บ (anon key) — ใช้ล็อกอิน/ล็อกเอาต์เท่านั้น ข้อมูลอื่นผ่าน API routes */
export function browserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
