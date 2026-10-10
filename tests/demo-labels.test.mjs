// Phase 1 (audit 2026-10-10): every MOCK feature a recruiter can reach is labelled as demo, and no screen claims that
// something was sent to MAZ, emailed, assigned or answered when nothing was. Screens can't be rendered in these Node
// tests, so the screens' SOURCE is checked: each one imports the shared wording (data/demoNotes.js) and none still
// contains the old misleading phrases. The look on a phone is checked by hand.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { api, callsTo, resetCalls } from "./helpers.mjs";
import { DEMO_NOTES, DEMO_REQUEST_STAGE_TEXT, DEMO_AFTER_PAYMENT_NEXT } from "../data/demoNotes.js";
import { REQUEST_STEPS } from "../data/requestSteps.js";
import { MOCK_NOTIFICATIONS } from "../data/mockNotifications.js";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// Screen → the demo note(s) it must show.
const LABELLED = {
  "screens/SupportScreen.js": ["support", "enquirySaved"],
  "screens/NewEnquiryScreen.js": ["newEnquiry"],
  "screens/EnquiryDetailScreen.js": ["enquiryDetail", "sampleReplyTitle", "noReplyTitle", "noReplyMessage"],
  "screens/MeetingRoomsScreen.js": ["meetingRooms", "bookingSaved", "bookingCancelled"],
  "screens/BookMeetingRoomScreen.js": ["bookRoom"],
  "screens/ReviewRequestScreen.js": ["reviewRequest"],
  "screens/RequestStatusScreen.js": ["requestStatus", "sampleUnitTitle", "sampleUnitLabel"],
  "screens/MyRequestsScreen.js": ["requests"],
  "screens/HomeDashboardScreen.js": ["requests", "quickActions"],
};

// Claims the mock features can't back up (nothing is sent, emailed, assigned or answered by MAZ).
const MISLEADING = [
  /reply by email/i,
  /Reply from MAZ/,
  /Enquiry sent/,
  /Booking confirmed/,
  /We['’]ve emailed/i,
  /We['’]ll email/i,
  /updates by email/i,
  /Your office is secured/i,
  /MAZ reviews every request/,
  /"Assigned unit"/,
];

test("each mock screen shows the shared demo wording", () => {
  for (const [path, keys] of Object.entries(LABELLED)) {
    const code = source(path);
    assert.match(code, /from "\.\.\/data\/demoNotes"/, `${path} must import data/demoNotes`);
    for (const key of keys) {
      assert.ok(DEMO_NOTES[key], `DEMO_NOTES.${key} must exist`);
      assert.match(code, new RegExp(`DEMO_NOTES\\.${key}\\b`), `${path} must show DEMO_NOTES.${key}`);
    }
  }
});

test("no mock screen still claims something was sent, emailed, assigned or answered", () => {
  for (const path of Object.keys(LABELLED)) {
    const code = source(path);
    for (const phrase of MISLEADING) assert.doesNotMatch(code, phrase, `${path} still says ${phrase}`);
  }
});

test("the demo notes say plainly that nothing reaches MAZ, and never claim it did", () => {
  for (const [key, text] of Object.entries(DEMO_NOTES)) {
    for (const phrase of MISLEADING) assert.doesNotMatch(text, phrase, `DEMO_NOTES.${key}`);
  }
  for (const key of ["support", "newEnquiry", "enquiryDetail", "meetingRooms", "bookRoom", "reviewRequest", "requests", "requestStatus"]) {
    assert.match(DEMO_NOTES[key], /^(Demo|Sample)/, `DEMO_NOTES.${key} opens by saying it's demo / sample`);
    assert.match(DEMO_NOTES[key], /(isn't|aren't|not) sent to MAZ|Nothing has been sent to MAZ/, `DEMO_NOTES.${key}`);
  }
});

test("RequestStatus has demo wording for every request stage (labels unchanged)", () => {
  assert.deepEqual(Object.keys(DEMO_REQUEST_STAGE_TEXT).sort(), REQUEST_STEPS.map((step) => step.key).sort());
  for (const [key, text] of Object.entries(DEMO_REQUEST_STAGE_TEXT)) {
    assert.ok(text.description && text.next, `${key} needs a description and a next line`);
    for (const phrase of MISLEADING) {
      assert.doesNotMatch(text.description, phrase, key);
      assert.doesNotMatch(text.next, phrase, key);
    }
  }
  assert.match(DEMO_REQUEST_STAGE_TEXT.emailSent.description, /no email is sent/);
  // The stage LABEL is shown everywhere (stepper, request card caption): it must not say an email was sent.
  const emailStage = REQUEST_STEPS.find((step) => step.key === "emailSent");
  assert.equal(REQUEST_STEPS.indexOf(emailStage), 1, "still stage 2 of 5");
  assert.equal(REQUEST_STEPS.length, 5);
  assert.doesNotMatch(emailStage.label, /\bsent\b/i);
  assert.match(emailStage.label, /simulated/i);
  assert.match(DEMO_AFTER_PAYMENT_NEXT, /live service/);
  const screen = source("screens/RequestStatusScreen.js");
  assert.match(screen, /steps=\{DEMO_STEPS\}/);
  assert.doesNotMatch(screen, /[^_]AFTER_PAYMENT_NEXT/, "the live 'after payment' line isn't shown");
});

test("New User notifications are marked demo, and the list still comes from the app (no request to MAZ)", async () => {
  assert.ok(MOCK_NOTIFICATIONS.newUser.length > 0);
  for (const notification of MOCK_NOTIFICATIONS.newUser) assert.equal(notification.demo, true, notification.id);

  resetCalls();
  const shown = await api.fetchNotifications("newUser");
  assert.ok(shown.length > 0);
  assert.ok(shown.every((notification) => notification.demo === true));
  assert.equal(callsTo(""), 0, "New User notifications make no network request");

  // The note above every demo list fits New Users too (they have no contracts).
  assert.doesNotMatch(api.NOTIFICATIONS_DEMO_NOTE, /contract/i);
  assert.match(api.NOTIFICATIONS_DEMO_NOTE, /^Demo notifications — simulated in this app, not sent by MAZ\./);
});
