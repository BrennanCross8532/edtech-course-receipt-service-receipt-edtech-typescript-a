import express from "express";
import { InfraiError } from "./infrai_email.js";
import { orderReceiptSchema, sendOrderReceipt } from "./receipt_sender.js";

export const receiptService = express();
receiptService.use(express.json({ limit: "32kb" }));

receiptService.post("/receipts", async (request, response) => {
  const parsed = orderReceiptSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: "invalid_order",
      issues: parsed.error.flatten(),
    });
    return;
  }

  try {
    const sent = await sendOrderReceipt(parsed.data);
    response.status(202).json({ orderId: parsed.data.orderId, messageId: sent.message_id });
  } catch (error) {
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.status(status).json({ error: error.code, message: error.message });
      return;
    }
    response.status(502).json({ error: "email_delivery_failed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
if (process.env.NODE_ENV !== "test") {
  receiptService.listen(port, () => {
    console.log(`Receipt service listening on http://localhost:${port}`);
  });
}
