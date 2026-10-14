// User-facing wording for features that are still MOCK (services/mockApi.js) — Support, Meeting rooms and office
// requests. Kept in one place so every screen says the same thing and tests can check it. Nothing here is sent
// to MAZ, so no wording may claim that something was sent, emailed, assigned or answered by MAZ.
// Remove an entry once its feature is backed by a real MAZ endpoint (see services/serviceConfig.js).

export const DEMO_NOTES = {
  // Support (SupportScreen, NewEnquiryScreen, EnquiryDetailScreen)
  support: "Demo support — these enquiries are samples kept in this app. They aren't sent to MAZ, so no replies will arrive.",
  enquirySaved: "Enquiry saved in demo mode — it hasn't been sent to MAZ.",
  newEnquiry: "Demo mode: your enquiry is saved in this app only. It isn't sent to MAZ and won't receive a reply.",
  enquiryDetail: "Demo enquiry — kept in this app only and not sent to MAZ.",
  sampleReplyTitle: "Sample reply (demo)",
  noReplyTitle: "No reply in demo mode",
  noReplyMessage: "Demo enquiries don't receive replies. Once MAZ's support service is connected, replies will appear here.",

  // Meeting rooms (MeetingRoomsScreen, BookMeetingRoomScreen)
  meetingRooms: "Demo bookings — sample rooms and availability. Bookings are kept in this app only and aren't sent to MAZ.",
  bookingSaved: "Demo booking saved — it hasn't been sent to MAZ.",
  bookingCancelled: "Demo booking cancelled.",
  bookRoom: "Sample availability — this booking is kept in this app only and isn't sent to MAZ.",

  // Office requests (ReviewRequestScreen, RequestStatusScreen, MyRequestsScreen, HomeDashboardScreen)
  reviewRequest: "Demo request — submitting saves it in this app only. It isn't sent to MAZ yet.",
  requests: "Demo requests — kept in this app only and not sent to MAZ yet.",
  requestStatus:
    "Demo request — the stages, unit and invoice below are simulated in this app. Nothing has been sent to MAZ and no emails are sent.",
  sampleUnitTitle: "Your office (sample)",
  sampleUnitLabel: "Sample unit",

  // Dashboard quick actions (HomeDashboardScreen)
  quickActions: "Support and Violations show demo data for now.",
};

// RequestStatus's per-stage wording for the DEMO request (shown instead of data/requestSteps.js' description / next,
// which describe the live service — e.g. "We've emailed you a confirmation"). Same stage keys and labels.
export const DEMO_REQUEST_STAGE_TEXT = {
  submitted: {
    description: "Your request is saved in this app. In the live service, MAZ would confirm it by email.",
    next: "In this demo, use the link below to move to the next stage.",
  },
  emailSent: {
    description: "Demo stage — no email is sent. In the live service, MAZ emails you a confirmation here.",
    next: "Admin review (simulated).",
  },
  adminReview: {
    description: "Demo stage — in the live service, MAZ's team reviews your details and selects a unit.",
    next: "A sample unit is shown (simulated).",
  },
  unitAssigned: {
    description: "Demo stage — a sample unit is shown. MAZ hasn't assigned a real unit.",
    next: "A sample invoice is prepared (simulated).",
  },
  invoiceGenerated: {
    description: "A sample invoice is ready. Paying it is a demo payment — no money is charged.",
    next: "Pay the sample invoice (demo payment).",
  },
};

export const DEMO_AFTER_PAYMENT_NEXT = "In the live service, MAZ would review and activate your contract.";
