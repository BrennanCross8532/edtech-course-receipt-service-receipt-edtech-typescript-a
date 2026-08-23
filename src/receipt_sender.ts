import { z } from "zod";
import { infrai } from "./infrai_email.js";

export const orderReceiptSchema = z.object({
  orderId: z.string().min(1).max(80),
  learner: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
  }),
  course: z.object({
    title: z.string().min(1).max(160),
    delivery: z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("cohort"),
        startsOn: z.string().date(),
        endsOn: z.string().date(),
      }),
      z.object({
        kind: z.literal("self_paced"),
        purchasedOn: z.string().date(),
        accessDays: z.number().int().min(1).max(730),
      }),
    ]),
  }),
  educator: z.object({
    name: z.string().min(1).max(120),
    reportEmail: z.string().email(),
  }),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export type OrderReceipt = z.infer<typeof orderReceiptSchema>;

export type DeliveryPlan = {
  accessStartsOn: string;
  deadlineOn: string;
  reporting: string;
};

function addUtcDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function decideDeliveryPlan(order: OrderReceipt): DeliveryPlan {
  const delivery = order.course.delivery;
  if (delivery.kind === "cohort") {
    return {
      accessStartsOn: delivery.startsOn,
      deadlineOn: delivery.endsOn,
      reporting: `A completion report goes to ${order.educator.reportEmail} after the cohort closes.`,
    };
  }

  return {
    accessStartsOn: delivery.purchasedOn,
    deadlineOn: addUtcDays(delivery.purchasedOn, delivery.accessDays),
    reporting: `A completion report goes to ${order.educator.reportEmail} when access ends.`,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

export function buildReceiptEmail(order: OrderReceipt) {
  const plan = decideDeliveryPlan(order);
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: order.currency,
  }).format(order.amountCents / 100);

  return {
    to: order.learner.email,
    subject: `Receipt ${order.orderId}: ${order.course.title}`,
    html: [
      `<h1>You're enrolled, ${escapeHtml(order.learner.name)}</h1>`,
      `<p>Order <strong>${escapeHtml(order.orderId)}</strong> confirms ${escapeHtml(order.course.title)} for ${escapeHtml(amount)}.</p>`,
      `<p>Course access starts ${plan.accessStartsOn}. Your completion deadline is ${plan.deadlineOn}.</p>`,
      `<p>${escapeHtml(plan.reporting)}</p>`,
      `<p>Educator: ${escapeHtml(order.educator.name)}</p>`,
    ].join(""),
  };
}

export async function sendOrderReceipt(order: OrderReceipt) {
  const email = buildReceiptEmail(order);
  return infrai.email.send(email, `course-receipt:${order.orderId}`);
}
