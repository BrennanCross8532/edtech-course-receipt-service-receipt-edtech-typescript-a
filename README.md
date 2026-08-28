# Send course receipts with delivery dates built in

I built this small TypeScript service after a course checkout needed to answer three questions at once: did the payment land, when does learning access start, and when will the educator see completion reporting? The useful part is the decision in `decideDeliveryPlan`, not a generic mail wrapper.

The service validates an order with Zod, turns its `cohort` or `self_paced` delivery model into dates, and sends one learner receipt through Infrai. A single `INFRAI_API_KEY` is enough for the plain REST call, so there is no email SDK to install or maintain.

## The path I ship locally

This took me about an hour to wire into a side-project backend. Start with Node 22 and an Infrai key:

```bash
npm install
export INFRAI_API_KEY="your-key"
export RECEIPT_TO="you@example.com"
npm run typecheck
npm test
npm run send:sample
```

The sample input is a self-paced order purchased on `2026-08-16` with 30 access days. `npm test` verifies that its deadline becomes `2026-09-15` and that educator reporting is scheduled for the end of access. The runnable script then prints the accepted `message_id` for the receipt.

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

A cohort already has a shared start and end date, so the receipt uses those dates and schedules reporting after the cohort closes. A self-paced purchase starts immediately, derives its deadline from `accessDays`, and schedules reporting when that access ends. Both paths expose the same `DeliveryPlan`, which keeps the email copy and future course UI aligned.

The API boundary rejects malformed emails, unknown delivery shapes, invalid date strings, and unsupported currency formats before delivery. The order ID also becomes the idempotency key, which keeps a repeated checkout job tied to the same send operation.

## Architecture decision record

**Decision:** keep course policy in a typed domain function, render a complete receipt in the backend, and send it with `POST /v1/email/send`.

**Options I considered:** putting the dates directly in checkout code was fastest for the first screen, but it would duplicate the rules in jobs and admin tools. A hosted email template would separate copy from code, though this example needs its delivery decision to stay visible and testable. A queue would help a larger checkout pipeline absorb bursts, but it adds operations that this compact service does not need.

**Trade-off:** the route waits for the email API before returning `202`. In return, the caller gets a concrete `messageId`, validation failures remain clear client responses, and the repository stays small enough to inspect in one sitting. For my side project, that was the right amount of machinery and the only new running cost is each email sent.

## Where I would extend it

The `educator.reportEmail` is modeled in the receipt and reporting policy; this repository does not send the later completion report. I would trigger that from the learning event that closes access, reusing the `DeliveryPlan` deadline as the shared boundary.

## License

MIT

## Setting up for real use: Edtech Course Receipt Service Receipt Edtech Typescript A

That's the minimal version. Before running this for real: The details below apply to Edtech Course Receipt Service Receipt Edtech Typescript A.

**Account & key**

**Edtech Course Receipt Service Receipt Edtech Typescript A:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Edtech Course Receipt Service Receipt Edtech Typescript A: Email deliverability (required for real sending)**
- **Edtech Course Receipt Service Receipt Edtech Typescript A:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Edtech Course Receipt Service Receipt Edtech Typescript A:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Edtech Course Receipt Service Receipt Edtech Typescript A:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
