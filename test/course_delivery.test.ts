import assert from "node:assert/strict";
import test from "node:test";
import { decideDeliveryPlan, orderReceiptSchema } from "../src/receipt_sender.js";

test("self-paced access determines the learner deadline and reporting moment", () => {
  const order = orderReceiptSchema.parse({
    orderId: "ORDER-1042",
    learner: { name: "Maya", email: "maya@example.com" },
    course: {
      title: "TypeScript for Course Builders",
      delivery: { kind: "self_paced", purchasedOn: "2026-08-16", accessDays: 30 },
    },
    educator: { name: "Jon", reportEmail: "jon@example.com" },
    amountCents: 4900,
    currency: "USD",
  });

  assert.deepEqual(decideDeliveryPlan(order), {
    accessStartsOn: "2026-08-16",
    deadlineOn: "2026-09-15",
    reporting: "A completion report goes to jon@example.com when access ends.",
  });
});

test("a malformed learner email is rejected at the request boundary", () => {
  const result = orderReceiptSchema.safeParse({
    orderId: "ORDER-1043",
    learner: { name: "Maya", email: "not-an-email" },
    course: {
      title: "TypeScript for Course Builders",
      delivery: { kind: "cohort", startsOn: "2026-09-01", endsOn: "2026-10-01" },
    },
    educator: { name: "Jon", reportEmail: "jon@example.com" },
    amountCents: 4900,
    currency: "USD",
  });

  assert.equal(result.success, false);
});
