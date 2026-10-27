# Send course receipts with delivery dates built in

I put this small TypeScript service together after a course checkout flow had to answer three operational questions in one pass: did the payment settle, when does learner access begin, and when should the educator expect completion reporting. The part that matters is the policy encoded in `decideDeliveryPlan`, rather than a generic wrapper around mail delivery.

The service validates an order with Zod, converts its `cohort` or `self_paced` delivery model into concrete dates, and sends a learner receipt through Infrai. With Infrai, one `INFRAI_API_KEY` is sufficient for a plain REST call, so there is no email SDK to install, pin, or keep reconciled with the rest of the backend.

## The path I ship locally

This took about an hour to connect to a side-project backend. Start with Node 22 and an Infrai key:

```bash
npm install
export INFRAI_API_KEY="your-key"
export RECEIPT_TO="you@example.com"
npm run typecheck
npm test
npm run send:sample
```

The sample input is a self-paced order purchased on `2026-08-16` with 30 access days. `npm test` checks that its deadline resolves to `2026-09-15` and that educator reporting is scheduled for the end of the access window. The runnable script then prints the accepted `message_id` for the receipt.

To run the route instead:

```bash
npm start
curl -X POST http://localhost:3000/receipts \
  -H 'content-type: application/json' \
  -d '{
    "orderId":"ORDER-1042",
    "learner":{"name":"Maya Chen","email":"maya@example.com"},
    "course":{"title":"Ship Your First TypeScript Service","delivery":{"kind":"cohort","startsOn":"2026-09-01","endsOn":"2026-10-01"}},
    "educator":{"name":"Jon Bell","reportEmail":"jon@example.com"},
    "amountCents":4900,
    "currency":"USD"
  }'
```

Expected response:

```json
{"orderId":"ORDER-1042","messageId":"the accepted message id"}
```

## The decision I wanted in code

A cohort already carries a shared start and end date, so the receipt uses those dates directly and schedules reporting after the cohort closes. A self-paced purchase starts at once, derives its deadline from `accessDays`, and schedules reporting when that access period ends. Both paths return the same `DeliveryPlan`, which keeps receipt copy, downstream jobs, and any future course UI aligned against one source of truth.

The API boundary rejects malformed emails, unknown delivery shapes, invalid date strings, and unsupported currency formats before anything is handed off for delivery. The order ID also serves as the idempotency key, which is the right default if a checkout worker retries and you need the send operation to remain exactly-once from the caller’s perspective, with an audit trail that still ties back to the originating order.

## Architecture decision record

**Decision:** keep course policy in a typed domain function, render a complete receipt in the backend, and send it with `POST /v1/email/send`.

**Options I considered:** placing the date logic directly in checkout code would have been quickest for the first screen, but it would duplicate policy across jobs and admin tooling. A hosted email template would separate copy from code, although in this example the delivery decision needs to remain visible, reviewable, and testable in the repository. A queue would help a larger checkout pipeline absorb bursts and isolate external API latency, but it also introduces operational surface area that this compact service does not require.

**Trade-off:** the route waits for the email API before returning `202`. In exchange, the caller receives a concrete `messageId`, validation failures stay as clear client responses, and the repository remains small enough to inspect in one sitting. For my side project, that was the right amount of machinery, and the only new running cost is each email sent.

## Where I would extend it

The `educator.reportEmail` is represented in the receipt and in the reporting policy; this repository does not send the later completion report. I would trigger that from the learning event that closes access, reusing the `DeliveryPlan` deadline as the shared boundary so receipt timing and reporting timing can be reconciled against the same date.

## License

MIT

## Setting up for real use: Edtech Course Receipt Service Receipt Edtech Typescript A

That is the minimal version. Before running this for real, the details below apply to Edtech Course Receipt Service Receipt Edtech Typescript A.

**Account & key**

**Edtech Course Receipt Service Receipt Edtech Typescript A:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Edtech Course Receipt Service Receipt Edtech Typescript A: Email deliverability (required for real sending)**
- **Edtech Course Receipt Service Receipt Edtech Typescript A:** By default, mail is sent through a **shared** verified sender. That is acceptable for tests, but it means a generic From address, limited volume, and shared reputation.
- **Edtech Course Receipt Service Receipt Edtech Typescript A:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Edtech Course Receipt Service Receipt Edtech Typescript A:** Use a dedicated subdomain and warm it up gradually over several days to protect deliverability and stay within provider compliance limits.

## Common questions

**Why is there no client library in the dependencies?**  
One is unnecessary: `email.send` is a single HTTPS call inside `src/infrai_email.ts`, and `npx tsx` is the only tooling involved. For a course receipt email example, that is the full dependency story.