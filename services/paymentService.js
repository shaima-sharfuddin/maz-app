import * as mockPayments from "./mock/mockPayments";
import * as tapPayments from "./tapPayments";
import { recordRequestPayment, mockSignUpMobile } from "./mockApi";
import { toISODate } from "../utils/formatDate";
import { ApiError } from "./apiError";
import { fetchContracts, fetchContract } from "./contractService";
import { billsOf, summarizePayments, payNowTarget, contractsForAccountPayments } from "./paymentSummary";
import { tapPaymentsEnabled } from "./serviceConfig";
import { recordNotificationEvent } from "./notificationService";
import { formatBHD } from "../data/pricing";

// Existing User payments — the ONLY payment entry point for screens (via services/api.js).
// What to pay is worked out from REAL MAZ bills (contractService); the payment itself goes to the provider.

// PAYMENT PROVIDER: the REAL Tap gateway (services/tapPayments.js — POST /tap/create-charge) by default; DEMO
// (services/mock/mockPayments.js) when the bundler is started with EXPO_PUBLIC_TAP_PAYMENTS=false (serviceConfig).
// Once MAZ confirms the paid rule and offers a charge-status endpoint: make Tap the only provider, set
// SERVICE_SOURCES.payments to "real", and remove the demo overlay (mock/demoPaymentLedger.js + billService).
const paymentsAreDemo = () => !tapPaymentsEnabled();

// Read once by screens (the switch is fixed at build time).
export const PAYMENTS_ARE_DEMO = paymentsAreDemo();

export const getPaymentMethods = () => (paymentsAreDemo() ? mockPayments : tapPayments).getPaymentMethods();

// What a Pay button will pay. scope:
//   { type: "account" }                          — dashboard Pay now (ACTIVE contracts only): due first, else balance
//   { type: "contract", contractId }             — Contract Details: the same, for one contract
//   { type: "bill", contractId, billNumber }     — Bill Details: that one bill, if unpaid
// → { kind: "due" | "balance" | "bill", amount, dueAmount, bills: [{ number, contractId, unit, periodLabel, dueDate,
//     amount }], contractIds }. Rejects with NOTHING_DUE when there's nothing to pay.
export async function preparePayment(scope) {
  let target = null;
  let dueAmount = 0;

  if (scope?.type === "bill") {
    const contract = await fetchContract(scope.contractId);
    const bill = billsOf([contract]).find((item) => item.number === scope.billNumber);
    if (!bill) throw new ApiError("NOT_FOUND", "Bill not found.");
    if (bill.status === "unpaid" || bill.status === "due") {
      target = { kind: "bill", amount: bill.amount, bills: [bill] };
      dueAmount = summarizePayments([contract]).dueBills.some((due) => due.number === bill.number) ? bill.amount : 0;
    }
  } else {
    const contracts =
      scope?.type === "contract"
        ? [await fetchContract(scope.contractId)]
        : contractsForAccountPayments(await fetchContracts());
    const summary = summarizePayments(contracts);
    target = payNowTarget(summary);
    dueAmount = summary.due;
  }

  if (!target || !(target.amount > 0)) throw new ApiError("NOTHING_DUE", "There's nothing to pay right now.");
  const bills = target.bills.map(({ number, contractId, unit, periodLabel, dueDate, amount }) => ({
    number,
    contractId,
    unit,
    periodLabel,
    dueDate,
    amount,
  }));
  return {
    kind: target.kind,
    amount: target.amount,
    dueAmount,
    bills,
    contractIds: [...new Set(bills.map((bill) => bill.contractId))],
  };
}

// Pays a prepared payment. onProgress("starting" | "processing") lets the screen show each step.
// DEMO → { status: "succeeded", receipt } | { status: "failed", message }; testOutcome ("succeed" | "decline") picks.
// TAP → { status: "checkout", checkoutUrl, orderId, chargeId, amount }: the screen opens checkoutUrl, where the
//   customer pays. customer { name, email, mobile } is required. Nothing is marked paid in the app — MAZ records it.
// Network / validation problems reject.
export async function submitPayment(plan, methodId, { testOutcome = "succeed", onProgress, customer } = {}) {
  onProgress?.("starting");
  if (!paymentsAreDemo()) return tapPayments.createCharge({ bills: plan.bills, amount: plan.amount, customer });
  const { paymentId } = await mockPayments.createPayment({ bills: plan.bills, amount: plan.amount, methodId, testOutcome });
  onProgress?.("processing");
  const result = await mockPayments.getPaymentResult(paymentId);
  notifyPaymentResult(plan, result);
  return result;
}

// The payer's mobile for Tap's customer_mobile (required by MAZ), when the app already knows it: the number given at
// sign-up this app run (national digits, e.g. "36123456"). null → the payment screen asks for it (client, 2026-10-22:
// no mobile field unless the app has no number). The MAZ login carries no mobile.
export function knownPayerMobile(email) {
  return mockSignUpMobile(email)?.phoneNumber ?? null;
}

// New User office request invoice (PaymentScreen { requestId }) → a LIVE Tap charge. invoice: fetchRequestInvoice's
// answer ({ invoiceNumber, outstanding }). → { status: "checkout", checkoutUrl, orderId, chargeId, amount }.
// ⚠️ The request and its invoice are still MOCK (sample pricing, never sent to MAZ) — the order id (invoice number +
// timestamp) is the only link MAZ gets, and the request stays "unpaid" in the app.
export async function submitInvoicePayment(invoice, { customer } = {}) {
  return tapPayments.createCharge({
    bills: [{ number: invoice.invoiceNumber, contractId: null }],
    amount: invoice.outstanding,
    customer,
  });
}

// The checkout WebView read MAZ's callback (tapPayments.parseTapCallback → result, or null when unreadable).
// purpose: { type: "invoice", requestId } (office request) | { type: "bills", contractIds } (contract bills).
// A CAPTURED invoice payment is recorded on the app-only request (it shows Paid, contract Reviewing); contract bills
// are MAZ's records, so nothing is changed in the app. Adds the in-app notification. → the result, unchanged
// (null → { outcome: "pending" } so the screen can say it's still being confirmed).
export async function completeTapPayment(purpose, result, { chargeId = null, amount = null } = {}) {
  const outcome = result ?? { outcome: "pending", chargeId, amount, currency: "BHD", card: null };
  if (outcome.outcome === "succeeded" && purpose?.type === "invoice") {
    await recordRequestPayment(purpose.requestId, {
      receipt: outcome.reference ?? outcome.chargeId ?? chargeId,
      paidDate: outcome.paidAt ? outcome.paidAt.slice(0, 10) : toISODate(new Date()),
      method: outcome.card ? `${outcome.card.brand} •••• ${outcome.card.lastFour}` : "Tap",
    }).catch(() => null); // the money is taken either way — the result screen must still show
  }
  const target =
    purpose?.type === "invoice"
      ? { screen: "RequestInvoice", params: { requestId: purpose.requestId } }
      : purpose?.contractIds?.length === 1
        ? { screen: "ContractDetail", params: { contractId: purpose.contractIds[0] } }
        : null;
  const shown = formatBHD(outcome.amount ?? amount ?? 0);
  if (outcome.outcome !== "pending") {
    recordNotificationEvent(
      outcome.outcome === "succeeded"
        ? { type: "payment", title: "Payment successful", body: `${shown} paid · reference ${outcome.reference ?? outcome.chargeId}.`, target }
        : { type: "payment", title: "Payment not completed", body: `${shown} — ${outcome.message ?? "the payment was declined"}. No money was taken.`, target }
    );
  }
  return outcome;
}

// In-app notification for the result (DEMO, notificationService) — opens the bill, or the contract.
function notifyPaymentResult(plan, result) {
  const singleContract = plan.contractIds.length === 1 ? plan.contractIds[0] : null;
  const target =
    plan.bills.length === 1
      ? { screen: "BillViewer", params: { contractId: plan.bills[0].contractId, billNumber: plan.bills[0].number } }
      : singleContract
        ? { screen: "ContractDetail", params: { contractId: singleContract } }
        : null;
  const demo = " (demo)"; // only demo payments report a result
  recordNotificationEvent(
    result.status === "succeeded"
      ? {
          type: "payment",
          title: `Payment successful${demo}`,
          body: `${formatBHD(plan.amount)} for ${plan.bills.length} ${plan.bills.length === 1 ? "bill" : "bills"} · receipt ${result.receipt.receipt}. No money was charged.`,
          target,
        }
      : { type: "payment", title: `Payment failed${demo}`, body: `${formatBHD(plan.amount)} — ${result.message}`, target }
  );
}

export { summarizePayments, payNowTarget, PAYMENT_SUMMARY_NOTE } from "./paymentSummary";
