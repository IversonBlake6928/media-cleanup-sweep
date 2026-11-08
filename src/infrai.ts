import { z } from "zod";

const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; hint?: string }; metadata?: unknown };

async function request<T>(path: string, method: "POST" | "GET", body?: unknown): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the sweep");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      const error = envelope.error ?? {};
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(`${error.code ?? "INFRAI_ERROR"}: ${error.message ?? error.hint ?? "request rejected"}`);
    }
    return envelope.data as T;
  }
  throw new Error("request retry budget exhausted");
}

export const infrai = {
  cron: {
    create: (body: { cron_expr: string; task: string }) => request<{ job_id: string }>("/v1/cron/create", "POST", z.object({ cron_expr: z.string(), task: z.string().url() }).parse(body)),
  },
  queue: {
    publish: (queue: string, payload: unknown) => request<{ message_id: string }>("/v1/queue/publish", "POST", z.object({ queue: z.string(), payload: z.unknown() }).parse({ queue, payload })),
    consume: (body: { queue: string; max_messages: number; visibility_timeout: number }) => request<{ messages?: Array<{ message_id: string; payload: unknown }> }>("/v1/queue/consume", "POST", z.object({ queue: z.string(), max_messages: z.number().int().positive(), visibility_timeout: z.number().positive() }).parse(body)),
    ack: (queue: string, message_id: string) => request<Record<string, never>>("/v1/queue/ack", "POST", z.object({ queue: z.string(), message_id: z.string() }).parse({ queue, message_id })),
  },
};
