import { orderReceiptSchema, sendOrderReceipt } from "../src/receipt_sender.js";

const recipient = process.env.RECEIPT_TO;
if (!recipient) throw new Error("RECEIPT_TO is required");

const order = orderReceiptSchema.parse({
  orderId: "ORDER-1042",
  learner: { name: "Maya Chen", email: recipient },
  course: {
    title: "Ship Your First TypeScript Service",
    delivery: { kind: "self_paced", purchasedOn: "2026-08-16", accessDays: 30 },
  },
  educator: { name: "Jon Bell", reportEmail: "educator@example.com" },
  amountCents: 4900,
  currency: "USD",
});

const sent = await sendOrderReceipt(order);
console.log(`Receipt accepted with message_id ${sent.message_id}`);
