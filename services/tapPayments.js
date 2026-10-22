import { post, API_BASE_URL } from "./http/apiClient";
import { ApiError } from "./apiError";
import { ERROR_MESSAGES } from "./errorMessages";
import { toApiTapCharge, toUiTapCharge, toUiTapResult } from "./apiMappers";

// REAL payment provider — Tap Payments through MAZ (2026-10-20), ON by default; EXPO_PUBLIC_TAP_PAYMENTS=false switches
// back to the demo provider (serviceConfig.tapPaymentsEnabled; paymentService picks the provider).
//   POST /tap/create-charge { amount, order_id, customer_name, customer_email, customer_mobile }
//   → { payment_url, charge_id } (CONFIRMED in Postman, 2026-10-20): Tap's hosted checkout page, where the customer
//   picks the method (card, BenefitPay …). Public today (an empty body → 422); the session's Bearer token is sent
//   anyway, so the route keeps working once MAZ protects it.
// The page runs in a WebView (screens/TapCheckoutScreen.js). After paying, Tap redirects to MAZ's callback
// (TAP_CALLBACK_URL?tap_id=…), which records the charge and answers JSON; the WebView reads that page
// (parseTapCallback → apiMappers.toUiTapResult) — the callback is loaded once, by the WebView, as Tap intends.
// Contract bills stay as MAZ reports them until MAZ records the payment (the paid rule is still provisional).

export const TAP_METHOD = Object.freeze({
  id: "tap",
  label: "Card or BenefitPay",
  description: "Pay securely on Tap's payment page",
  icon: "card-outline",
});

export function getPaymentMethods() {
  return [{ ...TAP_METHOD }];
}

const saysFailed = (body) =>
  body != null && typeof body === "object" && (body.status === false || body.success === false || body.error != null);

const apiError = (code) => new ApiError(code, ERROR_MESSAGES[code]);

// A readable, unique order id for MAZ to match the charge to: the bill (one bill), else the contract, + a timestamp.
export function orderIdFor(bills, now = Date.now()) {
  const contractIds = [...new Set(bills.map((bill) => bill.contractId))];
  const ref = bills.length === 1 ? bills[0].number : contractIds.length === 1 ? contractIds[0] : "MAZ";
  return `${ref}-${now}`;
}

// { bills, amount, customer: { name, email, mobile } } → { status: "checkout", orderId, chargeId, checkoutUrl, amount }.
// Rejects PAYMENT_REJECTED (422), PAYMENT_NOT_STARTED (a 2xx that says it failed), INVALID_RESPONSE (no checkout link),
// or the transport's NETWORK / TIMEOUT / SERVER … A TIMEOUT is ambiguous: MAZ may have created the charge, but nothing
// is paid until the customer completes Tap's page.
export async function createCharge({ bills, amount, customer }) {
  if (!bills?.length || !(amount > 0)) throw new ApiError("NOTHING_DUE", "There's nothing to pay.");
  const orderId = orderIdFor(bills);
  let body;
  try {
    body = await post("/tap/create-charge", toApiTapCharge({ amount, orderId, customer }));
  } catch (error) {
    if (error?.code === "VALIDATION") throw apiError("PAYMENT_REJECTED");
    throw error;
  }
  if (saysFailed(body)) throw apiError("PAYMENT_NOT_STARTED");
  const charge = toUiTapCharge(body);
  if (!charge) throw apiError("INVALID_RESPONSE");
  return { status: "checkout", orderId, amount, ...charge };
}

// Where Tap sends the customer after paying (MAZ's callback route).
export const TAP_CALLBACK_URL = `${API_BASE_URL}/tap/callback`;

export function isTapCallbackUrl(url) {
  return typeof url === "string" && url.toLowerCase().startsWith(TAP_CALLBACK_URL.toLowerCase());
}

// The callback page's text (JSON) → toUiTapResult, or null when it can't be read.
export function parseTapCallback(text) {
  try {
    return toUiTapResult(JSON.parse(String(text ?? "").trim()));
  } catch {
    return null;
  }
}
