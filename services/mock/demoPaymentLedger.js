// ⚠️ DEMO PAYMENT STATE — which bills were paid with a DEMO payment in this app session.
//
// Kept in memory only (this module's Map): nothing is stored on the phone or sent to MAZ, and it is empty again
// after every app reload / restart AND whenever the signed-in account changes or signs out (clearDemoPayments, called
// by services/mock/demoSession.js) — every demo Existing User login shares customer 1's bills, so one person's demo
// payments must never show as "Paid (demo)" for the next. Real MAZ bill data is never changed — services/billService.js shows a bill
// recorded here as "Paid (demo)" on top of the real data.
//
// Remove when MAZ provides real payments: a real payment changes the bill on MAZ's side, so no overlay is needed.

const paidBills = new Map(); // bill number (MAZ vch_no) → { receipt, paidDate, method, amount }

export function recordDemoPayment(billNumbers, payment) {
  billNumbers.forEach((number) => paidBills.set(number, { ...payment }));
}

// The demo payment that paid this bill, or null.
export function getDemoPayment(billNumber) {
  const payment = paidBills.get(billNumber);
  return payment ? { ...payment } : null;
}

export function clearDemoPayments() {
  paidBills.clear();
}
