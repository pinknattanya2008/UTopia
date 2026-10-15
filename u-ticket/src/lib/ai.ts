/**
 * OpenAI client + ฟังก์ชันเรียก AI (Build Spec หัวข้อ 9)
 * ทุกฟังก์ชันคืน null หรือ throw เมื่อเรียกไม่สำเร็จ — ผู้เรียกต้องใช้ fallback เสมอ
 * เรียกจากฝั่ง server เท่านั้น (API routes)
 */
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { EXPLAIN_SYSTEM_PROMPT, MISSIONS_SYSTEM_PROMPT, PRESALE_SUMMARY_SYSTEM_PROMPT, TRUST_SYSTEM_PROMPT } from "./prompts";
import type { Mission, TrustAssessment } from "./types";

export const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

/** โหมดออฟไลน์: ใช้ผลจาก data/demo-cache.json แทนการเรียก OpenAI */
export function isOffline() {
  return process.env.DEMO_OFFLINE === "1";
}

/** เรียก AI ได้หรือไม่ (มี key และไม่ได้อยู่ในโหมดออฟไลน์) */
export function aiEnabled() {
  return Boolean(process.env.OPENAI_API_KEY) && !isOffline();
}

let _client: OpenAI | null = null;
function client(): OpenAI {
  // สร้างเมื่อใช้งานจริงเท่านั้น — ถ้าไม่มี key แอปยังเปิดได้
  _client ??= new OpenAI({ timeout: 25_000, maxRetries: 1 });
  return _client;
}

const TrustSchema = z.object({
  trustMultiplier: z.number(),
  riskLevel: z.enum(["low", "medium", "high"]),
  isLikelyBot: z.boolean(),
  reasons: z.array(z.string()),
});

const MissionsSchema = z.object({
  missions: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      targetCount: z.number(),
      scoreImpact: z.string(),
      category: z.enum(["frequency", "consistency", "diversity"]),
    }),
  ),
});

const SummarySchema = z.object({ summary: z.string() });

async function parse<T>(instructions: string, payload: unknown, format: ReturnType<typeof zodTextFormat>): Promise<T | null> {
  const res = await client().responses.parse({
    model: MODEL,
    reasoning: { effort: "low" },
    instructions,
    input: JSON.stringify(payload),
    text: { format },
  });
  if (res.status !== "completed" || !res.output_parsed) return null;
  return res.output_parsed as T;
}

export async function assessTrust(payload: unknown): Promise<TrustAssessment | null> {
  const out = await parse<z.infer<typeof TrustSchema>>(
    TRUST_SYSTEM_PROMPT,
    payload,
    zodTextFormat(TrustSchema, "trust_assessment"),
  );
  if (!out) return null;
  return {
    ...out,
    trustMultiplier: Math.min(1, Math.max(0, out.trustMultiplier)),
    reasons: out.reasons.slice(0, 3),
  };
}

export async function generateMissions(payload: unknown): Promise<Mission[] | null> {
  const out = await parse<z.infer<typeof MissionsSchema>>(
    MISSIONS_SYSTEM_PROMPT,
    payload,
    zodTextFormat(MissionsSchema, "missions"),
  );
  if (!out || out.missions.length === 0) return null;
  return out.missions.slice(0, 3).map((m) => ({ ...m, targetCount: Math.max(1, Math.round(m.targetCount)) }));
}

export async function explainScore(payload: unknown): Promise<string | null> {
  const res = await client().responses.create({
    model: MODEL,
    reasoning: { effort: "low" },
    instructions: EXPLAIN_SYSTEM_PROMPT,
    input: JSON.stringify(payload),
  });
  if (res.status !== "completed" || !res.output_text.trim()) return null;
  return res.output_text.trim();
}

export async function summarizePresale(payload: unknown): Promise<string | null> {
  const out = await parse<z.infer<typeof SummarySchema>>(
    PRESALE_SUMMARY_SYSTEM_PROMPT,
    payload,
    zodTextFormat(SummarySchema, "presale_summary"),
  );
  return out?.summary.trim() || null;
}

/** Concierge แบบ streaming: คืน async iterator ของข้อความทีละส่วน */
export async function* streamConcierge(
  instructions: string,
  messages: { role: "user" | "assistant"; content: string }[],
): AsyncGenerator<string> {
  const stream = client().responses.stream({
    model: MODEL,
    reasoning: { effort: "low" },
    instructions,
    input: messages,
  });
  for await (const event of stream) {
    if (event.type === "response.output_text.delta") yield event.delta;
  }
}
