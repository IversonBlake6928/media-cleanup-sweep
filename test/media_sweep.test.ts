import assert from "node:assert/strict";
import { staleRecords } from "../src/media_sweep.js";

const now = new Date("2026-09-01T00:00:00Z");
const records = [
  { id: "old", creatorId: "c1", state: "ready" as const, lastDeliveredAt: "2026-07-01T00:00:00Z" },
  { id: "fresh", creatorId: "c2", state: "ready" as const, lastDeliveredAt: "2026-08-20T00:00:00Z" },
  { id: "working", creatorId: "c3", state: "processing" as const, lastDeliveredAt: "2026-06-01T00:00:00Z" },
];
assert.deepEqual(staleRecords(records, now).map((record) => record.id), ["old"]);
console.log("stale media decision: old is queued, fresh and processing are kept");
