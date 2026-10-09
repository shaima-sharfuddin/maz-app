import * as mockPayments from "./mock/mockPayments";
import { ApiError } from "./apiError";
import { fetchContracts, fetchContract } from "./contractService";
import { billsOf, summarizePayments, payNowTarget, contractsForAccountPayments } from "./paymentSummary";
import { SERVICE_SOURCES } from "./serviceConfig";
import { recordNotificationEvent } from "./notificationService";
import { formatBHD } from "../data/pricing";

// Existing User payments — the ONLY payment entry point for screens (via services/api.js).
// What to pay is worked out from REAL MAZ bills (contractService); the payment itself goes to the provider.

// ⚠️ PAYMENT PROVIDER: MOCK (services/mock/mockPayments.js) — MAZ has no payment API / gateway yet.
// Going live: create services/mazPayments.js with the same functions (see mockPayments.js), import it here instead,
// set SERVICE_SOURCES.payments to "real", and remove the demo overlay (mock/demoPaymentLedger.js + billService).
const provider = mockPayments;

export const PAYMENTS_ARE_DEMO = SERVICE_SOURCES.payments !== "real";

export const getPaymentMethods = () => provider.getPaymentMethods();

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
// testOutcome ("succeed" | "decline") only matters for the DEMO provider.
// → { status: "succeeded", receipt } | { status: "failed", message }. Network / validation problems reject.
export async function submitPayment(plan, methodId, { testOutcome = "succeed", onProgress } = {}) {
  onProgress?.("starting");
  const { paymentId } = await provider.createPayment({ bills: plan.bills, amount: plan.amount, methodId, testOutcome });
  onProgress?.("processing");
  const result = await provider.getPaymentResult(paymentId);
  notifyPaymentResult(plan, result);
  return result;
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
  const demo = PAYMENTS_ARE_DEMO ? " (demo)" : "";
  recordNotificationEvent(
    result.status === "succeeded"
      ? {
          type: "payment",
          title: `Payment successful${demo}`,
          body: `${formatBHD(plan.amount)} for ${plan.bills.length} ${plan.bills.length === 1 ? "bill" : "bills"} · receipt ${result.receipt.receipt}.${PAYMENTS_ARE_DEMO ? " No money was charged." : ""}`,
          target,
        }
      : { type: "payment", title: `Payment failed${demo}`, body: `${formatBHD(plan.amount)} — ${result.message}`, target }
  );
}

export { summarizePayments, payNowTarget, PAYMENT_SUMMARY_NOTE } from "./paymentSummary";
