// The 5 stages an office request moves through (from the recruiter's "Request an Office" flow).
// Single source of truth for StatusStepper and for mapping the API's status to a step number.
// `description` is what RequestStatus shows while the request is at that stage; `next` is the
// "Next:" line — what happens (or what the customer does) after it.
export const REQUEST_STEPS = [
  {
    key: "submitted",
    label: "Request Submitted",
    description: "We've received your request and will confirm it by email shortly.",
    next: "MAZ will email you a confirmation.",
  },
  {
    key: "emailSent",
    label: "Email Confirmation Sent",
    description: "We've emailed you a confirmation. Our team will review your request next.",
    next: "MAZ will review your request.",
  },
  {
    key: "adminReview",
    label: "Admin Review",
    description: "Our team is reviewing your details and selecting a suitable unit for you.",
    next: "MAZ will assign a unit to you.",
  },
  {
    key: "unitAssigned",
    label: "Unit Assigned",
    description: "A unit has been reserved for you. Your invoice is being prepared.",
    next: "MAZ will issue your invoice.",
  },
  {
    key: "invoiceGenerated",
    label: "Invoice Generated",
    description: "Your invoice is ready. Pay it to secure your office.",
    next: "Pay your invoice to secure your office.",
  },
];

// Once the invoice is paid, every stage is complete and the contract is with MAZ for review.
export const AFTER_PAYMENT_NEXT = "MAZ will review and activate your contract.";
