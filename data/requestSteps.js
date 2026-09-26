// The 5 stages an office request moves through (from the recruiter's "Request an Office" flow).
// Single source of truth for StatusStepper and for mapping the API's status to a step number.
export const REQUEST_STEPS = [
  { key: "submitted", label: "Request Submitted" },
  { key: "emailSent", label: "Email Confirmation Sent" },
  { key: "adminReview", label: "Admin Review" },
  { key: "unitAssigned", label: "Unit Assigned" },
  { key: "invoiceGenerated", label: "Invoice Generated" },
];
