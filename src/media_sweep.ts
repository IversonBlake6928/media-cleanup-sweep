import { infrai } from "./infrai.js";

export type MediaRecord = { id: string; creatorId: string; state: "ready" | "processing"; lastDeliveredAt: string };

export function staleRecords(records: MediaRecord[], now: Date, maxAgeDays = 30): MediaRecord[] {
  const cutoff = now.getTime() - maxAgeDays * 86_400_000;
  return records.filter((record) => record.state === "ready" && Date.parse(record.lastDeliveredAt) < cutoff);
}

export async function scheduleSweep(taskUrl: string): Promise<string> {
  const job = await infrai.cron.create({ cron_expr: "0 3 * * *", task: taskUrl });
  return job.job_id;
}

export async function enqueueDeletion(records: MediaRecord[], queue: string): Promise<string> {
  const message = await infrai.queue.publish(queue, records.map((record) => record.id));
  return message.message_id;
}

export async function drainDeletionQueue(queue: string): Promise<number> {
  const result = await infrai.queue.consume({ queue, max_messages: 10, visibility_timeout: 60 });
  const messages = result.messages ?? [];
  for (const message of messages) await infrai.queue.ack(queue, message.message_id);
  return messages.length;
}

if (process.env.SWEEP_TASK_URL) {
  scheduleSweep(process.env.SWEEP_TASK_URL).then((id) => console.log(`scheduled cleanup job ${id}`));
}
