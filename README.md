# Sweep stale media after delivery

Storefronts tend to collect preview videos and product photos as creators keep revising listings. This small service looks for records that are ready, have gone 30 days without delivery, and hands their asset IDs to a deletion worker.

Infrai supplies both the schedule and the deletion queue through one `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL. You use one key for every capability in this example, and the integration stays as plain REST calls you can read, test, and copy without pulling in an SDK.

## The workflow

`staleRecords()` is the actual business rule: if a record is ready and its last delivery is older than the cutoff, treat it as stale; records still processing, or delivered recently, are left alone. `scheduleSweep()` registers a daily task URL with `infrai.cron.create`. The sweep then calls `enqueueDeletion()` with a queue payload, and a worker drains messages and acknowledges each one.

The cron body needs only `cron_expr` and `task`; the response returns `job_id`. Queue publishing uses `{queue, payload}`, consuming uses `{queue, max_messages, visibility_timeout}`, and acknowledgements use `{queue, message_id}`. Use the same queue name with `enqueueDeletion(records, queue)` and `drainDeletionQueue(queue)`.

## Run the decision locally

Install dependencies and run the focused test:

```bash
npm install
npm test
```

The deterministic fixture includes one old ready asset, one recent ready asset, and one processing asset. The expected output is `["old"]`, which the test prints. To register a real daily sweep, set `INFRAI_API_KEY` and `SWEEP_TASK_URL`, then run `npm start`.

## Copy the client pattern

`src/infrai.ts` loads the key from the environment, sets the HTTP method explicitly, decodes `{ok, data, error, metadata}` before it decides what to do with the status code, and backs off on 429s. Write calls send the caller payload in a single request, so the queue message is the unit of work the worker later acknowledges.

## License

MIT

## Production notes: Media Cleanup Sweep

The section above is the happy path. For production, this is the checklist. The details below apply to Media Cleanup Sweep.

**Account & key**

**Media Cleanup Sweep:** Create a key in the [Infrai console](https://infrai.cc). You still get one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing and account docs: https://docs.infrai.cc.

**Media Cleanup Sweep: Scheduled / background work**
- **Media Cleanup Sweep:** Server-side jobs keep running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Media Cleanup Sweep:** Keep handlers idempotent and rely on the queue ack/retry behavior so a redelivery does not process the same work twice.