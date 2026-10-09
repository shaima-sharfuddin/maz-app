import { ApiError } from "../apiError";
import { PAYMENT_METHODS } from "../../data/paymentMethods";
import { toISODate } from "../../utils/formatDate";
import { recordDemoPayment } from "./demoPaymentLedger";

// ⚠️ MOCK PAYMENT PROVIDER — DEMO / TEST only. MAZ has no payment endpoint and no gateway is connected.
// - Nothing is sent to MAZ (no network request at all) and no money is charged.
// - A successful demo payment is recorded in the session-only ledger (demoPaymentLedger.js), so its bills show
//   "Paid (demo)" until the app reloads. Real MAZ bills / receipts are never modified.
// - The outcome is chosen by the tester on Payment Review ("succeed" | "decline"), so both paths can be shown.
//
// A real provider (e.g. services/mazPayments.js) must export the same functions and shapes:
//   getPaymentMethods() → [{ id, label, description, icon }]
//   createPayment({ bills, amount, methodId }) → { paymentId, status: "processing" }   (start at the gateway)
//   getPaymentResult(paymentId) → { status: "succeeded", receipt } | { status: "failed", message }
//                                                                    (confirmed by MAZ, e.g. after a webhook)

const PROCESSING_MS = 1200;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pending = new Map(); // paymentId → the payment being "processed"

export function getPaymentMethods() {
  return PAYMENT_METHODS.map((method) => ({ ...method }));
}

// bills: [{ number, contractId, amount }]. testOutcome: "succeed" | "decline" (demo only).
export async function createPayment({ bills, amount, methodId, testOutcome = "succeed" }) {
  const method = PAYMENT_METHODS.find((m) => m.id === methodId);
  if (!method) throw new ApiError("INVALID_METHOD", "Choose a payment method.");
  if (!bills?.length || !(amount > 0)) throw new ApiError("NOTHING_DUE", "There's nothing to pay.");
  await wait(PROCESSING_MS / 2);
  const paymentId = `DEMO-PAY-${Date.now().toString().slice(-6)}`;
  pending.set(paymentId, { bills, amount, method, testOutcome });
  return { paymentId, status: "processing" };
}

export async function getPaymentResult(paymentId) {
  const payment = pending.get(paymentId);
  if (!payment) throw new ApiError("NOT_FOUND", "Payment not found.");
  await wait(PROCESSING_MS / 2);
  pending.delete(paymentId);

  if (payment.testOutcome === "decline") {
    return { status: "failed", message: "The demo payment was declined (test outcome). No money was charged." };
  }

  const now = new Date();
  const paidDate = toISODate(now);
  const receiptNumber = `DEMO-RCP-${paidDate.replace(/-/g, "")}-${String(now.getTime()).slice(-4)}`;
  const billNumbers = payment.bills.map((bill) => bill.number);
  recordDemoPayment(billNumbers, { receipt: receiptNumber, paidDate, method: payment.method.label });

  const contractIds = [...new Set(payment.bills.map((bill) => bill.contractId))];
  return {
    status: "succeeded",
    receipt: {
      demo: true,
      receipt: receiptNumber,
      amount: payment.amount,
      paidDate,
      method: payment.method.label,
      contractId: contractIds.length === 1 ? contractIds[0] : null,
      contractIds,
      unit: contractIds.length === 1 ? (payment.bills[0]?.unit ?? null) : null,
      bills: billNumbers,
    },
  };
}
