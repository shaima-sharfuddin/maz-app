# MAZ App — Project Context

## What this app is
A mobile app (iOS + Android) for MAZ Business Center, a business-setup and office-leasing
company in Bahrain. Built with Expo (React Native) + JavaScript + NativeWind (Tailwind).

## Language: JavaScript only
This project uses plain JavaScript (.js / .jsx files). Do not use TypeScript syntax,
type annotations, interfaces, or generics anywhere. This was already converted from
an earlier TypeScript version — the conversion is complete and current files are correct.

## Brand colors (exact, pulled from their real logo — do not change these)
- Navy: #1a3966
- Deep navy background: #101828
- Crimson: #a31c37

## Auth & sessions
- auth/AuthContext.js: AuthProvider + useAuth() → { ready, isSignedIn, user: { email, name, companyName,
  customerId, activity }, token, profileComplete, justCompletedProfile, sessionExpired, hasSignedInBefore (device flag for
  Welcome's tagline), signIn(result), completeProfile(name), updateUserDetails({ name, companyName }), signOut() }. customerId = the MAZ
  customer the login belongs to (null = no customer yet, e.g. a New User). Every session change goes through one
  setter that also calls authService.setCurrentSession synchronously, so the data layer sees it before the first
  screen loads
- AUTH IS MOCK (Existing User phase 2, 2026-10-08): services/authService.js is the only auth entry (logIn, logOut,
  requestPasswordReset, AUTH_IS_MOCK, current session, onSessionExpired); its provider is services/mock/mockAuth.js
  (wraps mockApi's demo accounts). Customer identity: services/customerService.js (getCurrentCustomerId /
  requireCurrentCustomerId → ApiError NO_CUSTOMER) reads the session; the session's customerId is decided ONLY in
  services/mock/mockCustomerIdentity.js — demo Existing User logins → customer 1 (real MAZ data, not necessarily the
  person's — dashboard to be labelled "Demo account"), a New User who signed up this session → null. Going live:
  add services/mazAuth.js with the same functions (login response / GET /me must supply the customer id), switch the
  provider line in authService, set SERVICE_SOURCES.auth = "real" (services/serviceConfig.js)
- Sessions saved before customerId existed (no customerId key) are discarded at launch → log in again
- The session is stored encrypted with expo-secure-store (key maz.session) and restored on launch; the splash
  screen waits for it, so logged-in users never see Welcome flash first. Demo exception: Settings → Demo data →
  "Always start at Welcome" discards it at launch instead
- App.js renders route groups by auth state (React Navigation's auth-flow pattern): signed out → Welcome,
  NewUserSignUp, Login; signed in without profile → CompleteProfile, Settings (no current path creates such an
  account — kept for safety); signed in → dashboard and all tenant screens. Screens never navigate across these groups — they call signIn / completeProfile /
  signOut and the navigator switches. Any new screen must be added to the right group
- Mock accounts: a New User sign-up (quickSignUp) starts UNVERIFIED; verifyEmail with the OTP (123456) returns
  its session. Logging in before verifying fails with EMAIL_NOT_VERIFIED ("Verify email" → VerifyAccount);
  afterwards login returns the same name and company. Any other email logs in as the existing tenant "Sara".
  logOut() never fails (best effort)
- Right after a New User verifies their email, VerifyAccount sets the demo toggle to "New user" (a new account has
  no contracts) and calls signIn(session) → the navigator opens straight on the new-user dashboard
  ("What are you looking for?"). (The write-only justSignedUp flag was removed in Cleanup 4, 2026-10-08.)
- Session expiry: httpClient maps a MAZ 401 to ApiError UNAUTHORIZED and calls the handler AuthContext registers
  (onSessionExpired) → signed out, Login shows "Your session has expired". Only a REAL provider's token is sent
  (Authorization: Bearer); while auth is mock no token is sent, so this can't fire yet. Not yet: token refresh

## Theme system (light + dark) — never hardcode colors
- THE 5-COLOUR PALETTE — permanent rule (premium redesign, client 2026-10-10; REPLACES the 2026-10-09 crimson-primary
  rule), PALETTE in theme/theme.js: soft off-white #f6f7f9 (main background) · pure white #ffffff (cards / content
  surfaces) · deep navy #1a3966 = THE PRIMARY colour (colors.primary: primary buttons, important headings —
  colors.heading on ScreenTitle — selected states, the selected tab, focus borders, icon tiles; plus HeroPanel /
  PhotoHero "navy") · warm ivory #f2eee7 (subtle premium accent — colors.ivory / ivoryText, and the "inverse" button
  on navy panels) · crimson #a31c37 used SPARINGLY, only for meaningful highlights / alerts (colors.highlight /
  highlightSoft: unread markers, the SectionHeading brand square) — never a primary button. Dark mode: primary is a
  lighter accessible navy #9db4d9 with dark text (onPrimary #101828); highlight is brightened to #e0566f. Any reference
  photo or design input that doesn't match is recoloured / adapted to fit (authentic MAZ photos are never
  recoloured). Kept exceptions (listed in theme.js): dark mode's navy page background and translucent (not white)
  cards; status tones (success / warning / danger / info) outside the palette; dark hero navy #16294a; slate-grey
  dark-mode eyebrows. Tab bar tokens (Checkpoint 5): tabBar, tabBarBorder, tabActive (= primary), tabInactive
- theme/theme.js defines BRAND plus PALETTES.light / PALETTES.dark (same token names in both). Status tones:
  success / danger / warning, each with a *Soft background (warning = amber, e.g. a contract under review)
- theme/ThemeContext.js: ThemeProvider + useTheme() → { colors, scheme, isDark, preference, setPreference, ready }
- Preference is "system" | "light" | "dark", persisted in AsyncStorage (key maz.themePreference), default "system"
- Every component/screen reads colors via `const { colors } = useTheme()` and applies them with `style`.
  NativeWind className is for layout, spacing and type only — no color classes (tailwind.config has no colors)
- Status bar is set once in App.js from the theme; screens must not render their own <StatusBar>
- App.js holds the splash screen until the saved preference loads, so the first frame is never the wrong theme
- User toggles the theme in screens/SettingsScreen.js (gear icon on HomeDashboard)

## Tech stack decisions already made
- Expo (managed workflow), NativeWind v4 for styling, React Navigation (native-stack)
- expo-haptics for button feedback, @react-native-community/datetimepicker for dates, expo-print + expo-sharing
  for the (demo) invoice PDF download (utils/invoicePdf.js; both are in Expo Go — a dev build needs a native rebuild)
- Screens live in /screens, reusable UI in /components
- Real backend (Laravel, read-only so far): contracts, customers and units are LIVE via services/httpApi.js;
  everything else is still mock data until the recruiter provides endpoints (see "Real API" below)
- Forms: react-hook-form + zod (+ @hookform/resolvers). See "Forms & API calls" below

## User flow (full sequence, in order)
Simplified per the client's demo feedback (2026-10-07):
1. Welcome — logo, trust stats, two equal buttons: "Get Started" → NewUserSignUp; "Log in" → Login
2. New User: NewUserSignUp (3 steps — Company: Company Name, Customer Name · Contact: Email, Mobile Number
   (country-code picker for any country + number; stored as countryCode "+971" + phoneNumber "501234567" + phoneCountry
   ISO — data/countryCodes.js, mobileNumberIssue in validation/schemas.js; mock only, never sent to MAZ) · Identification:
   Nationality, then CPR Number for Bahrain or Passport Number otherwise — then a Review step) → VerifyAccount
   (6-digit email OTP; demo code 123456) → signed in at once → new-user dashboard (no confirmation screen)
   Existing User: Login → dashboard
3. Home dashboard (new user state: "What are you looking for?" services + their office request; tenant state:
   contract status, quick actions)
4. Request an office (everyone — new users and tenants via "Find a new office"):
   Dashboard services / Browse plans → tap a service → straight to Term & payments (Meeting Rooms → the hourly
   booking instead) → Term & payments (SelectTermScreen: lease length 1–36 months + payment frequency + first-invoice
   estimate) → ReviewRequest: "Submit request" sends it with the signed-in user's name, email and company (no
   separate details form) →
   the request then moves through 5 stages, tracked on RequestStatusScreen via StatusStepper:
     1. Request Submitted → 2. Email Confirmation Sent → 3. Admin Review → 4. Unit Assigned → 5. Invoice Generated
   → Invoice (RequestInvoice) → Payment (e.g. BenefitPay) → Payment Successful (PaymentReceipt) → "View invoice" →
   Invoice → "Download invoice (PDF)" (demo) → active contract appears on the dashboard (contract detail, bills, payments).
   The office admin assigns the actual unit — users request a plan, not a specific unit.
5. Ongoing tenant features: Book meeting rooms, track violations/compliance,
   renew/extend contract, notifications, support enquiries
6. Edit profile and Log out (Settings → Account)
REMOVED (Cleanup 4, 2026-10-08 — were retired and unregistered): SignUpScreen, SubmitRequestScreen and ServiceDetailScreen
(a service opens SelectTerm directly; ReviewRequest submits). PaymentReceiptScreen was briefly retired and is RESTORED (client, 2026-10-07: Pay →
Payment Successful → View invoice → Invoice → Download PDF; no automatic redirect to the dashboard). VerifyAccount's "You're
verified" success state is removed too (it was a state inside VerifyAccountScreen, not its own route — the OTP
screen itself stays registered). CompleteProfileScreen is still registered but no current path reaches it.
Navigation shortcuts (client feedback on the latest build): verification → dashboard; service tap → SelectTerm
(Meeting Rooms → MeetingRooms).

## Screens built so far (working, in JavaScript)
- screens/WelcomeScreen.js ✅ — MAZ's REAL reception photo (maz-reception.jpg) as the hero at the TOP of the screen,
  fading into the page (PhotoHero "fade") — the original layout, RESTORED by the client (2026-10-10) after full-bleed
  photo / glass-button variants were tried and rejected. NO BrandMark logo chip on Welcome (the photo shows the real
  wall logo; other screens keep theirs) — a context tagline (headline + supporting line), inline TrustStats
  (TRUST_STATS: 4.9 Google rating, 18+ years, 25+ companies), then two same-size pills: "Get Started" (navy primary)
  → NewUserSignUp, "Log in" (outlined, variant "secondary" — two navy fills would look identical) → Login. Tagline = data/brand.js WELCOME_TAGLINES: `newUser` ("Where ambitious businesses begin.")
  on a device where nobody has signed in yet, `returning` ("Welcome back to your workspace.") once someone has
  (useAuth().hasSignedInBefore — AsyncStorage maz.hasSignedInBefore, kept across logouts). RESOLVED (2026-10-09): the
  tagline is an explicit, APPROVED addition — it closes the earlier "developer superseded the client's no-tagline
  feedback" question. The wording is FINAL (approved 2026-10-09)
- screens/NewUserSignUpScreen.js ✅ — one form (newUserSignUpSchema) shown a step at a time with StepProgress ("Step 1
  of 3 · Company"): Company (Company Name, Customer Name, Activity — required
  single-choice SelectField of the SAMPLE ACTIVITIES, ActivityField in AccountDetailsFields; restored by the recruiter
  2026-10-10, shown on the Review step too) → Contact (Email) → Identification (Nationality
  GCC_NATIONALITIES SelectField, then CPR Number (Bahrain) or Passport Number (others), masked with StyledInput
  `revealable`; useWatch on nationality swaps the field and clears the other one) → Review (DetailCard of the
  entered values, ID masked "•••••1234"; "Submit & verify email" / "Edit details" → step 1). Each step's Continue is
  disabled until that step's fields pass the schema; Back (button, hardware, swipe — usePreventRemove) goes to the
  previous step. Submit → quickSignUp (unverified account) → VerifyAccount { email }
- screens/VerifyAccountScreen.js ✅ — the New User OTP step (signed-out group): 6-digit OtpInput (auto-submits),
  resend with 30s cooldown, verifyEmail. A New User's result carries the session → demo toggle "New user" →
  signIn(session) → new-user dashboard (no "You're verified" state any more); any other account → replaces itself with Login
  { email, justVerified }. Shows "Demo mode: use code 123456" (MOCK_OTP_CODE)
- screens/LoginScreen.js ✅ — the "Existing User" path. logIn (authService, MOCK) → sets the dashboard demo state
  from the account (customerId → "tenant", none → "newUser" — a stale "New user" setting can no longer open the
  New User dashboard for an Existing User) → signIn(session) (navigator switches automatically). Shows "Demo sign-in —
  MAZ accounts aren't connected yet…" while AUTH_IS_MOCK, and the session-expired notice;
  Forgot password → requestPasswordReset; "Don't have an account? Sign up" → NewUserSignUp; EMAIL_NOT_VERIFIED
  (signed up but never entered the code) → "Verify email" → VerifyAccount
- screens/CompleteProfileScreen.js ✅ (registered, but no current path reaches it — New User sign-ups are
  complete at once) — fields match MAZ's "Create Customer" form exactly (Company Details
  open, Owner Details collapsed); required: Customer Name, Owner Name, Owner Type, Gender. Owner Type (SelectField,
  right after Owner Name) uses OWNER_TYPES from the real OwnerTypeEnum and stores the code ("o", "p" …). First screen for a new account:
  "Not you? Log out" instead of Back. Save → saveProfile → completeProfile() → dashboard. The fields come from
  components/ProfileFormFields.js
- screens/EditProfileScreen.js ✅ — Settings → Account → "Edit profile" (signed-in group, only once the profile is
  complete). Non-sensitive fields only (editProfileSchema; CompanyFields + EmailField from
  components/AccountDetailsFields.js), in two open SectionCards: Company (Company Name, Customer Name), Contact
  (Email — read-only, the verified sign-in address: "Contact MAZ to change it"). PRIVACY (Cleanup 1, 2026-10-08):
  NO Nationality, CPR or Passport field and no reveal — the login is mapped to a demo MAZ customer, so the real
  record's identity data must never be shown. Pre-filled by fetchProfile(user) WITHOUT any request: edits saved
  this session → else the company / name a New User entered at sign-up this session (mockSignUpProfile) → else the
  session's name / company / email. "Save changes" disabled until valid AND changed ("Complete the highlighted
  fields to save." / "No changes to save.") → MOCK updateProfile(email, { companyName, customerName }) (in memory;
  also updates the mock account so a later login returns the new name / company) → updateUserDetails → back to
  Settings { profileUpdated } ("✓ Profile updated in demo mode — not sent to MAZ"). Screen note: "Demo mode:
  changes are kept in the app for this session and aren't sent to MAZ."
- screens/HomeDashboardScreen.js ✅ — two states, chosen by the Settings demo toggle (useDemo):
  • Tenant (default): "Welcome back, {session name}", "Demo account — the contracts shown are a MAZ demo
    customer's, not necessarily yours" (while AUTH_IS_MOCK), "Contract expiring soon" alert (ExpiringSoonAlert —
    data.expiringSoon from contractService.expiringSoon: every ACTIVE contract with 10 days or fewer left, incl. the end
    date itself, soonest first; each row "{contract} expires on {date}" + unit · "Expires in N days" / "Expires today"
    + "Renew contract ›" → that contract's ContractDetail; plus getExpiryNote(); hidden when none qualify, never for
    expired contracts), Contracts card (ONLY Total / Active / Expired from the REAL
    contracts — no other breakdown, client 2026-10-08; tap → ContractList), Payment card (DetailCard: Total contract amount
    / Amount paid / Balance / Due amount of the ACTIVE contracts only — client 2026-10-08; expired contracts keep their
    own Pay on Contract / Bill Details — CALCULATED from the real installments — "Provisional — not confirmed by MAZ"
    (+ "Includes BHD … paid with demo payments this session"); "Pay now · BHD …" pays the due amount first, else the
    outstanding balance → PaymentReview { scope: { type: "account" } }; nothing outstanding → "No payment due", no button), "Quick actions" tiles (QuickAction: Meeting rooms, Support, Violations — their only entry points; NO
    Notifications tile, the header bell is the single entry), then the office request card (only once a request
    exists) and a secondary (ghost) "Find a new office" → BrowsePlans. Cleanup 2 (2026-10-08): the "Your contracts"
    list was REMOVED — contracts are listed on ContractList via the Contracts card. Data (progressive, performance
    phase 2026-10-09): fetchDashboard(userState, { withUnits: false }) first (counts + Payment — /contracts only),
    fetchDashboard(userState) to fill in unit names (same shared download), fetchDashboardActivity (Quick-action
    captions, no network) and fetchTenantName (customer-record name fallback, never blocks). Only the Payment +
    Contracts sections show a skeleton; Quick actions and "Find a new office" render at once
  • Header: notifications bell (unread dot from fetchUnreadCount, refreshed on focus) + settings gear
  • New user: "What are you looking for?" (or "Looking for something else?" once a request exists) — ServiceCard
    per service from fetchPlans → SelectTerm { plan } (Meeting Rooms → MeetingRooms); then Why MAZ (trust stats, Bahrain advantages), testimonials placeholder
  • Both states: "Your office request" card (RequestRow; fetchLatestRequest, refreshed on focus) → RequestStatus,
    + "View all requests" → MyRequests; caption + badge show the stage, "Invoice ready · BHD … due by …" (due) or,
    once paid, "Paid · Contract under review" with a Reviewing badge
- screens/SettingsScreen.js ✅ — Account (logged-in user, "Edit profile" once the profile is complete, Log out with
  confirmation), Appearance (System / Light /
  Dark, persisted), Demo data (dashboard state, error simulation, always start at Welcome) — developer controls,
  HIDDEN unless the bundler is started with EXPO_PUBLIC_SHOW_DEMO_CONTROLS=true (DEMO_CONTROLS_ENABLED). The temporary 365-day
  expiry demo toggle was REMOVED (client, 2026-10-08) — the 10-day rule is permanent
- screens/BrowsePlansScreen.js ✅ — "What are you looking for?": a ServiceCard per service → SelectTerm { plan } (Meeting
  Rooms, `hourly` → MeetingRooms, never the lease flow), trust stats below. Shows exactly 3 services (fetchPlans filters by BROWSE_PLAN_IDS): Office Suites, Meeting Rooms, CR
  Registration — Startup Incubator hidden (confirmed), not deleted
- screens/SelectTermScreen.js ✅ — "Your term and payments": Lease length MonthsStepper (any whole number of
  months 1–36, default 1, quick picks 3 / 6 / 9 / 12) + a required Payment frequency SegmentedControl (Monthly /
  Quarterly / Half-Yearly / Yearly from INSTALLMENTS; selectTermSchema, no default — "Review request" disabled until
  chosen) + EstimateCard: first installment and deposit as separate lines, lease total (rent), total "First
  invoice". Review request → ReviewRequest { plan, termMonths, paymentFrequency }
- screens/ReviewRequestScreen.js ✅ — "Review your request": RequestSummaryCard (buildRequestSummary) + "Requesting
  as" (name / company / activity / email from the session). Submit request → submitRequest with those details
  (activity = the session's sign-up Activity, null for tenants; remark "") → PUSHES RequestStatus { requestId, summary }; afterwards the button becomes "View request status" so
  it can't be sent twice. "Edit" → back to SelectTerm
- screens/RequestStatusScreen.js ✅ — per-stage title + vertical StatusStepper timeline (date each stage was reached from
  stageReachedAt, current stage's REQUEST_STEPS.description) + "Next: …" (REQUEST_STEPS.next / AFTER_PAYMENT_NEXT) +
  summary; loads fetchRequestStatus.
  Step 4+: "Your office" (assigned unit). Step 5: Invoice card (First installment and Deposit lines, total, "View full
  invoice" → RequestInvoice) + primary "Pay BHD …" → Payment { requestId }. Paid: every stage complete, Payment
  card + "Your contract" card with status Reviewing (CONTRACT_STATUS "b").
  Back → previous step; "Back to dashboard" → popToTop. DEMO ONLY: "Demo mode: move to the next stage" link
  (advanceRequestStage) — remove once the real API reports the stage
- screens/RequestInvoiceScreen.js ✅ — { requestId }: the request's first invoice as a document (fetchRequestStatus):
  MAZ logo + Paid / Unpaid badge, invoice no. / date / due (or paid) date / request, Bill to (session company, name,
  email), Details (service, lease length, payment frequency, unit), Charges (line items; Subtotal + VAT only if the
  invoice has `vat`), Total (22 / 700) + sample-pricing note. Unpaid → "Pay BHD …" → Payment.
  "Download invoice (PDF)" (ghost; primary once paid) → downloadInvoicePdf (utils/invoicePdf.js, via useSubmit +
  ErrorBanner): DEMO — renders the same content (number, dates, Bill to, details, line items, total, a "not an official
  tax invoice" note) as an A4 HTML page → expo-print printToFileAsync (PDF in the cache directory) → expo-sharing share
  sheet (save to Files / Drive, email …). Where file sharing isn't available (web) it falls back to React Native's
  Share with the invoice as text. Labelled on screen "Demo PDF generated on your device". Replace with MAZ's official
  invoice PDF once the backend provides one
- screens/MyRequestsScreen.js ✅ — every submitted request, newest first (fetchRequests, refreshed on focus): RequestRow
  with request no. + submitted date → RequestStatus; empty → "No requests yet" → BrowsePlans
- screens/ContractListScreen.js ✅ — Dashboard Contracts card → "Your contracts": SegmentedControl All / Active / Expired
  (route param `filter` preselects) over the logged-in customer's REAL contracts (fetchContracts, contractService) as
  ContractRows → ContractDetail. Skeleton / per-filter EmptyState / error + Try again
- screens/ContractDetailScreen.js ✅ — per the recruiter wireframe: contract no. + unit + StatusBadge, Contract term
  (Unit row = the unit name, start / end, plus the pending renewal), "Rent and deposit"
  (REAL MAZ fields with a clear meaning: Monthly rent rent_monthly_amt, Number of months number_of_months, Payment
  frequency installment → INSTALLMENTS, Deposit deposit_amt; plus "Total rent (calculated)" — and VAT / Total incl.
  VAT when VAT > 0 — summed from the installments by contractService.contractAmounts, with "Calculated totals add up
  this contract's N installments"; MAZ's rent_total is NOT shown, its meaning is unconfirmed), Bill details, Payment details, Payment due + bills list, "Pay outstanding
  balance" → Payment. Expired / fully paid contracts show "No outstanding balance" instead of the dues section.
  Active contracts without a pending renewal show "Renew contract" → RenewContract. "View bill" (Bill details) and
  each bills-list row → BillViewer. Bill badges are just Paid / Unpaid (paymentBadge, utils/billStatus.js).
  Real API contracts show their real status badge (data/enums.js); their bills show Paid / Unpaid from a
  PROVISIONAL rule (services/billService.js: receipt_date set = paid — all Unpaid today), but the outstanding balance
  stays unknown (null), so they list installments with a "Paid / Unpaid: Provisional — MAZ confirms payments" note
  (badges show "Paid (demo)" for bills paid with a demo payment this session, + a note saying so) and, when anything is
  unpaid, "Pay due amount · BHD …" (due first) or "Pay outstanding balance · BHD …" → PaymentReview { scope: { type:
  "contract", contractId } } — never "all paid up" — and no Renew (renewable: false, no renewal API). NOT_FOUND (e.g. a mock notification pointing at a mock contract id) → "no longer available"
- screens/BillViewerScreen.js ✅ — bill summary from fetchBill: status, contract + billing period + due date,
  Charges (PLACEHOLDER single rent line) + total, Payment (when paid), "Pay outstanding balance" when due.
  Real API bills (fetchBill, services/billService.js) show their period label ("RENT INST-1 (Sep 2026 – Nov 2026)"),
  Rent (+ VAT when > 0) and a Paid / Unpaid badge with "Provisional — MAZ confirms payments" beside it (PDF: status
  "Unpaid (provisional)" + the same note). Unpaid → "Pay this bill · BHD …" → PaymentReview { scope: { type: "bill",
  contractId, billNumber } } ("Demo payment — no money is charged"). Paid with a demo payment → "Paid (demo)" badge,
  "Demo payment this session — not sent to MAZ", a "Payment (demo)" card (paid on, method, demo receipt) and the PDF
  says "Paid (demo)" + a DEMO / TEST note. "Download invoice (PDF)" (ghost when Pay is shown, else primary) → downloadBillPdf (DEMO, utils/invoicePdf.js) with the session's Bill To. Also opened from
  PaymentReceipt's "View invoice" after a contract payment
- screens/PaymentReviewScreen.js ✅ — Existing User payment review (scope { type: "account" | "contract" | "bill", … } →
  paymentService.preparePayment from the REAL bills): "You're paying for" (contract(s), unit, number of bills), the
  bills (number, description, due date, amount), Amount (Due amount, Total payable + provisional note), payment method
  (PaymentMethodOption), DEMO-only "Demo test outcome" Succeed / Decline + "DEMO / TEST payment — no money is charged
  and nothing is sent to MAZ", "Confirm demo payment · BHD …" (label follows progress: Starting / Processing) and
  Cancel. Succeeded → resets to [HomeDashboard, (ContractDetail if one contract), PaymentReceipt { receipt }];
  failed → PaymentFailed; network errors → ErrorBanner; NOTHING_DUE → "Nothing to pay"
- screens/PaymentFailedScreen.js ✅ — { amount, message }: danger icon, "Payment failed", amount, message, DEMO / TEST note;
  "Try again" → back to the review, "Back to dashboard" → popToTop
- screens/PaymentScreen.js ✅ — the New User request-invoice payment ({ requestId }, MOCK via mockApi; unchanged). Its
  { contractId } mode (mock contracts' payOutstandingBalance) is no longer reached — Existing User payments go
  through PaymentReview. Method rows are components/PaymentMethodOption.js. Original notes:
  amount due + due bills, payment method (BenefitPay / card — PLACEHOLDER options). { contractId } → fetchContract +
  payOutstandingBalance;
  { requestId } (new office request's invoice; adds a "You're paying for" card: invoice no., service, frequency) →
  fetchRequestInvoice + payRequestInvoice. A successful payment resets the stack to [HomeDashboard, ContractDetail |
  RequestStatus, PaymentReceipt { receipt }] (Back from the receipt can't reach the paid Payment screen)
- screens/PaymentReceiptScreen.js ✅ — "Payment successful": success IconBadge, amount (32 / 800), "Your payment of BHD …
  has been received." + receipt details; primary "View invoice" → RequestInvoice { requestId } (request invoice) or
  BillViewer { contractId, billNumber } (the paid bill; "View invoices" → back to ContractDetail's bills list when
  several were paid), then "Back to request" / "Back to contract" (or "Back to dashboard" for a payment covering
  several contracts) and "Go to dashboard". Existing User demo receipts (receipt.demo, contractIds) say "The bills you
  paid now show as Paid (demo) for this app session" and "DEMO / TEST payment — no money was charged and nothing was
  sent to MAZ. Not an official MAZ receipt or tax invoice."; New User invoice receipts keep "Demo receipt — no money
  was charged"
- screens/NotificationsScreen.js ✅ — in-app notifications (fetchNotifications, services/notificationService.js): unread rows
  tinted with a dot, tap marks read (best effort) and opens `target` { screen, params }; "Mark all as read". Demo
  records show "· Demo" after the time, and the list starts with NOTIFICATIONS_DEMO_NOTE ("Demo notifications — created
  in the app from your contract data; not sent by MAZ. No emails or push notifications are sent."). Icons include
  expiry (time) and account (person). No push yet
- screens/SupportScreen.js ✅ — "New enquiry" + the tenant's enquiries (StatusBadge open / answered) → EnquiryDetail
- screens/NewEnquiryScreen.js ✅ — Category, optional Contract, Subject, Message (supportEnquirySchema) →
  submitEnquiry → resets to [HomeDashboard, Support { submitted }]. `prefill` { category, contractId, subject }
  param pre-fills it (used by violations)
- screens/EnquiryDetailScreen.js ✅ — details (DetailCard), your message, MAZ's reply or "Awaiting reply"
- screens/MeetingRoomsScreen.js ✅ — upcoming bookings (cancel with confirmation → cancelBooking) + room cards
  → BookMeetingRoom { room }
- screens/BookMeetingRoomScreen.js ✅ — Date (today … +60 days), Duration 1/2/3 h, SlotPicker of start times from
  fetchRoomAvailability (a start is offered only if the whole duration is free; a stale pick is cleared), Notes →
  bookMeetingRoom → resets to [HomeDashboard, MeetingRooms]. SLOT_TAKEN reloads the grid
- screens/RenewContractScreen.js ✅ — renewal REQUEST (never automatic; the real contract is never changed), phase 5:
  Select term (SegmentedControl RENEWAL_TERM_OPTIONS 1/3/6/12 + EstimateCard: current → proposed end date, monthly rent
  × months "at your current monthly rent" + optional Remark, renewalSchema) → "Review request" → review step (contract,
  unit, current / proposed end date, term, estimate, remark; "Submit renewal request (demo)" / Edit; Back / hardware back
  → term step via usePreventRemove) → requestRenewal (renewalService, MOCK) → PUSHES RenewalStatus; this screen then
  shows "View renewal status" (Back retraces). Contract + renewal load together (fetchContract — REAL, fetchRenewal —
  MOCK). renewalEligibility: not active → "can't be renewed"; already requested → "View renewal status". Demo note:
  "kept in the app for this session and is not sent to MAZ"
- screens/RenewalStatusScreen.js ✅ — { contractId }: StatusStepper over RENEWAL_STEPS (Request Submitted → MAZ Review →
  Decision), "Renewal request (demo)" DetailCard (status badge, contract, unit, current / proposed end date, term,
  requested, remark), demo note, "Back to contract", DEMO-only "Demo mode: move to the next stage" (advanceRenewalDemo:
  requested → reviewing → approved; title "Renewal approved (demo)"). No request → EmptyState
- screens/ViolationsScreen.js ✅ — (the violations list; the dashboard's "Violations" quick action opens it,
  captioned "N open · demo" / "All clear") read-only notices grouped Open / Resolved, open ones show "Due {date}" in
  danger text; empty → "No violations — you're all clear" → ViolationDetail. FULLY MOCK via
  services/violationService.js: every row has a "Demo data" badge and the list starts with a demo note; demo records
  aren't linked to a real contract
- screens/ViolationDetailScreen.js ✅ — (fetchViolation, violationService — MOCK) Source "Demo data" badge, Contract "Not linked
  (demo record)", demo note; details (DetailCard: status, contract, unit, issued, due date when open;
  fine if any, "added to your contract balance"), description, resolution; "Contact support" → NewEnquiry with prefill (category "Violation query")

## Components built so far (working, in JavaScript)
- components/AnimatedButton.js ✅ — press-scale animation + haptic; `disabled` (greyed, inert) and `loading`
  (spinner, taps ignored) props
- components/StyledInput.js ✅ — text input with a primary (navy) border on focus; `error` prop → danger border + FieldError;
  `revealable` masks the value (CPR / passport) with a 44pt show / hide eye and no autofill.
  DateField, SelectField and SegmentedControl take the same `error` (+ `onBlur`) props
- components/AccountDetailsFields.js ✅ — the New User account fields: EMPTY_ACCOUNT_DETAILS, useIdentityFields(control,
  setValue) (watches nationality, clears the ID that no longer applies), CompanyFields, EmailField (`readOnly`),
  IdentificationFields (CPR / passport `revealable`). Used by NewUserSignUp (one group per step) and EditProfile —
  change account fields here, never in one screen only
- components/ProfileFormFields.js ✅ — the Create Customer form's two SectionCards (Company / Owner Details) +
  EMPTY_PROFILE, useMissingProfileFields(watch) and ProfileSaveHint. Now used only by CompleteProfile (unreachable);
  EditProfile uses AccountDetailsFields
- components/SectionCard.js ✅ — collapsible card wrapper (title, subtitle, defaultExpanded); 32pt bottom margin
  (section spacing), so don't add extra top margin to what follows it
- components/DateField.js ✅ — tappable field; native dialog on Android, inline spinner on iOS
- components/SelectField.js ✅ — dropdown field opening a bottom-sheet list (search box when > 10 options); options
  are strings or { value, label } (stores value, shows label — for enum codes)
- components/SegmentedControl.js ✅ — inline toggle between options (used for Gender)
- components/MonthsStepper.js ✅ — FormField-compatible whole-month picker: − / + (44pt, disabled at min / max) around
  the value + quick-pick chips; accessible as "adjustable" (SelectTerm's Lease length)
- components/TrustStats.js ✅ — row of stat tiles (reuse on BrowsePlans); big heavy numbers (32 / 800) over small
  muted captions
- components/ServiceCard.js ✅ — tappable service row: icon tile, name, description ("Booked by the hour" for hourly),
  chevron. New-user dashboard + BrowsePlans → SelectTerm (hourly → MeetingRooms)
- components/StepProgress.js ✅ — "Step 2 of 3 · Contact" + segmented bar for multi-step forms (NewUserSignUp)
- components/RequestRow.js ✅ — office request row (title, StatusBadge, stage caption from requestCaption; `showId` adds
  request no. + submitted date). Dashboard + MyRequests
- components/PressableScale.js ✅ — shared press feedback (scale + light haptic); AnimatedButton is built on it
- components/ScreenTitle.js ✅ — standard heading block (optional eyebrow, 2xl title, subtitle, mb-8)
- components/SectionHeading.js ✅ — the xs uppercase accent label that opens a section ("Quick actions", "Bills" …);
  `style` for spacing tweaks only. Never re-create it inline
- components/IconBadge.js ✅ — Ionicon centred in a soft circle (icon = half the size); tone "primary" | "success".
  Hero icon on sparse screens (VerifyAccount) and the Settings account avatar
- components/BackButton.js ✅ / components/TextLink.js ✅ — 44pt back button and secondary text links
- components/EmptyState.js ✅ — icon + title + message (+ optional action); `dashed` for "coming soon"
- components/Skeleton.js ✅ — Skeleton block + SkeletonCard for loading placeholders
- components/StatusStepper.js ✅ — reusable step tracker; props currentStep (1-based) + optional steps (defaults to
  REQUEST_STEPS). Completed = check, current = filled primary (navy), upcoming = muted. orientation "horizontal" (default)
  or "vertical" (RequestStatus timeline: `dates` per step, "In progress" caption + description on the current step)
- components/RequestSummaryCard.js ✅ — Service / Location / Lease length / Payment frequency / Monthly rate, then First
  installment + Deposit as separate lines and the First invoice total (older summaries: Estimated total)
- data/requestSteps.js — REQUEST_STEPS, the 5 request stages (single source for StatusStepper + API mapping), each
  with label, description and `next` ("Next: …"); AFTER_PAYMENT_NEXT once the invoice is paid
- data/pricing.js — MIN_LEASE_MONTHS / MAX_LEASE_MONTHS / DEFAULT_LEASE_MONTHS (1 / 36 / 1) + LEASE_QUICK_PICKS
  (3, 6, 9, 12) for new requests, RENEWAL_TERM_OPTIONS (1/3/6/12),
  PAYMENT_FREQUENCY_OPTIONS (INSTALLMENTS codes, Monthly first), firstInstallmentAmount (one period's months,
  capped at the lease length, × rate: 9 months → 100 / 300 / 600 / 900), firstInvoice(perYear, months)
  ({ installment, deposit, total }),
  formatTerm, formatBHD (3 decimals), estimateTotal, buildRequestSummary, extendEndDate (renewal end date);
  PLACEHOLDER_MONTHLY_RATE_BHD, PLACEHOLDER_DEPOSIT_BHD (100, as in the sample contracts) and PLACEHOLDER_LOCATION
  until real values exist
- utils/billStatus.js — paymentBadge(status, bill?): "paid" | "paidDemo" (bill.demoPaid) | "unpaid" | null for bill badges
  (display only — the paid RULE for real bills is in services/billService.js)
- components/PaymentMethodOption.js ✅ — payment method radio row (moved out of PaymentScreen; also PaymentReview)
- components/ContractRow.js ✅ — contract row (unit, StatusBadge, contractCaption: number + dates / ended / due / "Expires in
  N days" from contract.expiry — the confirmed 10-day window). Dashboard + ContractList
- components/StatusBadge.js ✅ — pill for contract statuses draft / reviewing / active / expired / renewed /
  terminated (renewed = success tone), bills paid / paidDemo ("Paid (demo)") / unpaid, renewal approved (success),
  demo ("Demo data", muted — marks a mock record), and
  due / paid / upcoming / open / resolved / answered / confirmed / cancelled / requested. Tones: success (active,
  paid, resolved, answered, confirmed), danger (due, open), warning (reviewing), muted otherwise (incl. draft,
  expired, terminated). Renders nothing for a null (unknown) status, e.g. real bills
- components/EstimateCard.js ✅ — "Estimated amount" rows + big total + note (SelectTerm, RenewContract)
- components/SlotPicker.js ✅ — FormField-compatible grid of time-slot pills; `slots` [{ value, label, disabled }]
- components/DetailCard.js ✅ — titled card of label/value rows (value may be a node, e.g. StatusBadge); used by
  ContractDetail, EnquiryDetail and other detail screens
- utils/invoicePdf.js — DEMO invoice download: downloadInvoicePdf(requestStatus, billTo) (RequestInvoice) and
  downloadBillPdf(bill, billTo) (BillViewer; status pill only when the bill's status is known) build an escaped A4 HTML
  invoice (fixed print colours + BRAND navy / crimson — paper, not the app theme) → expo-print PDF → expo-sharing;
  text fallback via Share. Rejects with ApiError PDF_FAILED
- utils/formatDate.js — formatDate ("05 Mar 2027"), formatMonth ("Oct 2026"), formatTime ("14:00" → "2:00 PM"),
  formatTimestamp ("Today, 2:05 PM" / "24 Sep 2026"), formatDateTime ("07 Oct 2026 · 10:32 AM"), toISODate (local "YYYY-MM-DD"); shared with DateField
- data/meetingRooms.js — PLACEHOLDER rooms, opening hours (08–18), durations, booking window
- data/mockViolations.js — MOCK notices (2 open with dueDate, 1 resolved) using REAL violation types from MAZ's
  admin panel (e.g. "No Signboard", "Audited financial report should be submitted"); dates/wording are samples.
  Shape: { id, contractId, title, issuedOn, dueDate (open only), status "open" | "resolved", description, fine,
  resolvedOn, resolution }
- data/mockEnquiries.js — MOCK support enquiries (one open, one answered)
- data/mockNotifications.js — MOCK notifications per demo account type; mock actions (e.g. payment) push new ones
- data/mockTenant.js — MOCK tenant name + 3 contracts from the wireframe (dates moved to 2026), each with
  startDate / endDate / monthlyRate; `renewal` is added by requestRenewal
- data/paymentMethods.js — PLACEHOLDER payment options (BenefitPay, card) until the gateway is confirmed
- demo/DemoContext.js — DEMO ONLY: DemoProvider + useDemo() → { userState: "tenant" | "newUser", simulateErrors,
  startAtWelcome }, persisted in AsyncStorage (maz.demoUserState, maz.demoSimulateErrors, maz.demoStartAtWelcome),
  toggled in Settings → "Demo data" (only shown when DEMO_CONTROLS_ENABLED — EXPO_PUBLIC_SHOW_DEMO_CONTROLS=true;
  while hidden, simulateErrors and startAtWelcome are forced off and their saved values ignored). simulateErrors
  defaults to OFF. simulateErrors drives setMockFailuresEnabled; startAtWelcome makes
  AuthProvider discard the saved session at launch (every launch opens Welcome). Remove once real account data
  exists (and drop the useDemo() read in auth/AuthContext.js)
- services/api.js — the ONLY module screens import API functions from: `export *` from ./mockApi, then explicit
  re-exports override it: ./httpApi (fetchCustomer, fetchUnits, fetchProfile), ./authService (logIn, logOut,
  requestPasswordReset, AUTH_IS_MOCK), ./contractService (fetchDashboard, fetchContracts, fetchContract,
  summarizeContracts, contractAmounts) and ./billService (fetchBill, PAYMENT_STATUS_NOTE)
- services/contractService.js — REAL contracts for the session's customer: fetchContracts, fetchContract (bills get
  their status from billService.withPaymentStatus), summarizeContracts (total / active / expired /
  latest expiry), contractAmounts (MAZ money fields + totals calculated from the installments), fetchDashboard
  (userState, { withUnits }) → { summary, payment: summarizePayments(contracts), expiringSoon, contracts } ("newUser" →
  { lease: null }), fetchDashboardActivity (Quick-action figures — MOCK via mockTenantActivity + violationService),
  fetchTenantName (GET /customers/{id} name)
- services/paymentSummary.js — pure: contractsForAccountPayments(contracts) (ACTIVE only — the dashboard card and
  "account" Pay now use it), summarizePayments(contracts) → { total, paid, balance, due (unpaid with due date ≤
  today), demoPaidAmount, unpaidBills, dueBills } CALCULATED from the real installments + the provisional / demo
  status; payNowTarget(summary) → { kind "due" | "balance", amount, bills } or null; PAYMENT_SUMMARY_NOTE
  ("Provisional — not confirmed by MAZ"). Replace with MAZ's own balances once they exist
- services/paymentService.js — the ONLY payment entry for screens: PAYMENTS_ARE_DEMO, getPaymentMethods,
  preparePayment(scope) (REAL bills → { kind, amount, dueAmount, bills, contractIds }; NOTHING_DUE when nothing is
  owed), submitPayment(plan, methodId, { testOutcome, onProgress }) → { status "succeeded", receipt } | { status
  "failed", message }. Provider: services/mock/mockPayments.js (MOCK). Going live: mazPayments.js with createPayment /
  getPaymentResult / getPaymentMethods, switch the provider line, SERVICE_SOURCES.payments = "real", and delete the
  demo overlay (mock/demoPaymentLedger.js + its use in billService)
- services/billService.js — REAL bills + the PROVISIONAL paid rule, isolated: withPaymentStatus(bill) → status "paid"
  when receipt_date is set, else "unpaid", + statusProvisional; fetchBill; PAYMENT_STATUS_NOTE ("Provisional — MAZ
  confirms payments"). When MAZ confirms its paid field / rule, change only provisionalStatus() here. DEMO overlay: a
  bill in mock/demoPaymentLedger.js shows status "paid" + demoPaid + demoPayment (screen only; MAZ data unchanged)
- services/serviceConfig.js — SERVICE_SOURCES: which Existing User area is "real" / "mock" / "provisional" (auth,
  customerIdentity, payments, renewals, notifications, violations: mock; emailDelivery: none; customer, contracts,
  bills, expiryAlerts (confirmed rule on real dates): real; billPaidStatus, paymentSummary: provisional) +
  EXPIRY_WARNING_DAYS = 10 — the CONFIRMED business rule (client, 2026-10-08): an ACTIVE contract shows the expiry /
  renewal alert and can request a renewal only with 10 days or fewer left before its end date, whatever the contract's
  length; expired contracts can't. Update SERVICE_SOURCES whenever a mock is replaced
- services/mock/ — Existing User mock providers, kept out of screens and out of mockApi.js (which keeps the New User,
  Support and Meeting rooms mocks): mockAuth.js, mockCustomerIdentity.js, mockPayments.js (DEMO / TEST payments: no
  network request, no money; createPayment → getPaymentResult with a tester-chosen outcome), demoPaymentLedger.js
  (bills paid with a demo payment — in memory only, so it resets on every app reload / restart), mockRenewals.js
  (renewal requests in memory; stages requested → reviewing → approved), mockNotifications.js (session events, read
  state, and an email OUTBOX where every email is "not_sent"), mockViolations.js (data/mockViolations.js records as
  demo: true, contractId / unit null). All session-only; none makes a network request
- services/mock/mockDemoContracts.js — ONE DEMO-ONLY contract for recruiter demos of the renewal flow: DEMO-RENEWAL-001,
  "Demo Office 101", ACTIVE, end date always 7 days from today (start = a 12-month term before it), BHD 250/month,
  12 months, Quarterly, deposit 250, NO bills, demo: true. Only for the mock demo customer (isDemoTenantCustomer in
  mockCustomerIdentity.js) and only while SERVICE_SOURCES.auth is "mock" — never with real login. contractService
  merges it into fetchContracts / answers fetchContract for it without a network request, so the normal expiry →
  dashboard "Contract expiring soon" alert → Contract Details → Renew → Review → Submit (demo) → Renewal Status flow
  applies. Kept OUT of the Contracts card counts (summarizeContracts), the payment figures (contractsForAccountPayments)
  and the email outbox; labelled "Demo data" badge (ContractRow, ContractDetail), "Demo contract" eyebrow + note on
  Contract Details, "· Demo contract" in the dashboard alert, "DEMO contract — not MAZ data" in its notification.
  Never sent to MAZ; real contracts untouched. Remove the file and its use in contractService when no longer needed
- services/expiryService.js — expiry from the REAL end date (contracts.to_date) with the CONFIRMED 10-day rule:
  getExpiryStatus(contract, { today, thresholdDays = getExpiryWarningDays() }) → { state "expired" (date passed, or MAZ
  status Expired) | "expiring" (today … +10 days, inclusive — day 0 counts) | "ok" (11+ days) | "unknown" (no end
  date), endDate, daysLeft, thresholdDays }; describeExpiry ("Expires in 9 days" / "Expires today" / "Ended 3 days
  ago"); warningStartDate; getExpiryNote() ("Renewal opens 10 days before the end date. This alert is shown by the app —
  it isn't sent by MAZ."); getExpiryWarningDays() (always EXPIRY_WARNING_DAYS = 10 — the 365-day demo override was
  removed). Never changes contract data; no network request. contractService attaches it as contract.expiry (endDate
  untouched) and builds the dashboard's expiringSoon list. ContractDetail shows an ExpiryAlert card ONLY for an active
  contract that is "expiring" (never once expired) with "Request renewal" when eligible. With today's real contracts
  (ending 2027) nothing qualifies, so no alert shows until a contract is within 10 days of its end date
- services/renewalService.js — renewal REQUESTS (MOCK provider): RENEWALS_ARE_DEMO, RENEWAL_TERM_OPTIONS, RENEWAL_STEPS,
  fetchRenewal(contractId), renewalEligibility(contract, renewal) → { canRequest, reason, opensOn }: only an ACTIVE
  contract INSIDE the expiry window (ends today … +getExpiryWarningDays(), i.e. the confirmed 10 days) with no
  request in progress — reasons already-requested / not-active / expired / no-end-date / outside-window (+ opensOn);
  the window comes from expiryService. requestRenewal(contractId, { termMonths, remark }) (reads the REAL contract;
  errors RENEWAL_PENDING / NOT_ACTIVE / RENEWAL_NOT_OPEN / NO_END_DATE / INVALID_TERM; proposed end = extendEndDate),
  advanceRenewalDemo. RenewContract explains each blocked reason ("Renewal isn't open yet … from {date}");
  ContractDetail shows "Renewal requests open {date} (10 days before the end date)" instead of the button.
  Each step records a renewal notification
- services/notificationService.js — the ONLY notifications entry: fetchNotifications / fetchUnreadCount /
  markNotificationRead / markAllNotificationsRead (userState param). "newUser" → the old New User mocks (mockApi,
  unchanged; their ids start "NTF-"). Existing User with a customer → DEMO list built in the app: expiry alerts
  (EXP-{contract} while expiring, END-{contract} for up to 10 days after the end) and one payment-due alert (DUE-…,
  active contracts, provisional) from REAL data + session events (payment succeeded / failed — recorded by
  paymentService; renewal submitted / updated — renewalService) + a "Demo account" notice. All demo: true;
  basedOnRealData on the alerts. No customer → []. recordNotificationEvent(event) for other services. Emails:
  requestEmail() only RECORDS each one in the mock outbox as "not_sent" (EMAIL_DELIVERY_AVAILABLE = false) —
  getEmailOutbox() for checks
- services/violationService.js — VIOLATIONS_ARE_DEMO, DEMO_DATA_LABEL ("Demo data"), fetchViolations() (no customer → []),
  fetchViolation(id) (NO_CUSTOMER / NOT_FOUND), countOpenViolations() (dashboard caption via contractService)
- services/httpClient.js — real transport: API_BASE_URL (HTTPS), get() with a 15 s timeout (covers the body read),
  getAllPages() (follows Laravel links.next — at most MAX_PAGES 50, never the same URL twice, only https links on the
  MAZ API host; anything else → INVALID_RESPONSE). Error codes (error handling phase, 2026-10-09): NETWORK, TIMEOUT,
  BAD_REQUEST (400 / 422 / other 4xx), UNAUTHORIZED (401 to a request that CARRIED a token → the app signs out),
  NOT_AUTHORIZED (401 without a token — auth is mock — no sign-out), FORBIDDEN (403), NOT_FOUND, RATE_LIMITED (429),
  SERVER (5xx), INVALID_RESPONSE (empty / malformed / HTML / wrong-shape body). Messages are fixed sentences from
  services/errorMessages.js (server error bodies are never shown — the backend has debug output on). Auth hooks set by
  authService: setAuthTokenProvider (Bearer token — null while auth is mock) and setUnauthorizedHandler (401)
- services/errorMessages.js — ERROR_MESSAGES (the wording per code) + errorMessage(error) (exported via services/api.js):
  every screen's load-error panel shows errorMessage(error) under its own title — never a hardcoded "check your
  connection". Unexpected (non-ApiError) exceptions get a generic sentence, never their technical text
- Error resilience: /units failure → unit names null ("Unit to be confirmed"), contracts still load, units retried on the
  next load; apiMappers toNumber → null for invalid numbers (never NaN); customer ids compared as text. useAsync option
  { keepDataOnError } keeps the last good data after a failed refresh with stale: true → components/StaleDataNote
  ("Couldn't refresh — showing earlier information." + Try again). ONLY for read-only data (dashboard bell + request
  card, My Requests, Renewal Status) — never on screens with Pay / Renew actions (a test enforces it).
  components/ErrorBoundary.js (App.js root): a render error shows "Something went wrong" + Try again (remounts), no
  technical details. Tests: `npm test` (node:test, no dependency; tests/ — fake fetch, synthetic fixtures, never MAZ)
- services/apiMappers.js — the ONLY place API field names appear: toUiContract, toUiBill, toUiCustomer. null means
  "unknown", never zero. CONTRACT_STATUS_MAP (built from CONTRACT_STATUS) gives each contract status (key, e.g.
  "active"), statusLabel and statusColor (backend colour name); an unlisted code → status null (no badge).
  type = "incubator" | "office" from units.is_incubation — raw data only: the Existing User UI never shows
  "Incubator" or an office / incubator split (client, 2026-10-08). Contracts also carry numberOfMonths, installmentsPerYear +
  paymentFrequency (INSTALLMENTS label), deposit; rent_total is deliberately not mapped. Bill rows carry rent, vat,
  amount and the raw receipt fields receiptDate / receiptAmount / receiptOn with status null — billService sets the
  status. Customer gender codes → GENDER labels.
- services/httpApi.js — real read-only endpoints with the mock's names/shapes. The customer id comes from
  customerService (the session) — no constant. ⚠️ DEV-ONLY SCOPING: GET /contracts returns every customer's contracts,
  so loadTenantContracts filters by the session's customer on the phone (isolated in that one function; replace with
  a customer-scoped authenticated endpoint). No customer → NO_CUSTOMER, and nothing is requested. CONTRACTS CACHE
  (2026-10-09): the customer's raw /contracts is shared by simultaneous callers and reused for 60 s
  (CONTRACTS_CACHE_MS), keyed to the session object + customer (logout / new login / other customer → fresh download);
  failures aren't kept; the demo-payment overlay and expiry are applied on every read. Screens of one visit (dashboard,
  bell, Contract List / Details, bills, payments, renewals, notifications, enquiries) share one download. Units are
  cached in memory for the life of the app process — NOT cleared on logout or a customer change (the list isn't
  customer-specific); gone after an app restart; a failed load isn't kept, so the next load retries (/units is the only source of unit names: /units/{id} answers an empty 200 and ?ids= / ?id= /
  ?page= are ignored). Exposes fetchCustomerContracts / fetchContract / fetchBill / fetchCustomer / fetchUnits / fetchProfile (no request —
  session / mock values only, never the customer record's identity fields);
  the dashboard is assembled in contractService.
  Contract ids in the app are the API contract number (name, "CN-2026-00001"); bills are receipts by vch_no
- utils/formatUnit.js — unitWithLocation(unit, location): "Office 204 · Seef District" or just "INC 009"
- services/mockApi.js — every mock endpoint (quickSignUp [New User sign-up; stores the full form in memory],
  verifyEmail / resendVerificationCode [VerifyAccount], logIn, logOut,
  requestPasswordReset, saveProfile, updateProfile + mockProfileEdits + mockSignUpProfile (EditProfile's mock save / pre-fill, keyed by email), fetchPlans,
  submitRequest, fetchRequestStatus, fetchLatestRequest, fetchRequests [My Requests], advanceRequestStage [DEMO], fetchRequestInvoice,
  payRequestInvoice, payOutstandingBalance [only PaymentScreen's { contractId } mode — unreachable today],
  fetchNotifications, fetchUnreadCount, markNotificationRead, markAllNotificationsRead,
  fetchEnquiries, fetchEnquiry, submitEnquiry,
  fetchMeetingRooms, fetchRoomAvailability, bookMeetingRoom, fetchBookings, cancelBooking,
  mockTenantActivity), all via simulate(). The old tenant mocks shadowed by the per-area services (fetchDashboard,
  fetchContract, fetchBill, fetchViolations, fetchViolation, requestRenewal) and signUp were REMOVED in Cleanup 4
  (2026-10-08); mockTenantActivity() still feeds the mock dashboard figures (open enquiries, next booking)
- services/apiError.js — ApiError { code, message } that every API function rejects with
- validation/schemas.js — reusable Zod field + form schemas (see "Forms & API calls"); newUserSignUpSchema uses
  superRefine for the nationality-dependent CPR / Passport requirement
- hooks/useZodForm.js, hooks/useSubmit.js — form + submit-button standards (see "Forms & API calls");
  useSubmit also returns errorCode (the ApiError code) for screens that react to specific errors
- hooks/useAsync.js — { loading, data, error, reload } for any loader; results go stale when the loader changes.
  useAsync(loader, { keepData: true }) keeps the last data visible while reload() runs (focus refreshes, demo controls)
- components/FormField.js — react-hook-form Controller wrapper for any field component
- components/FieldError.js — inline field error (icon + danger text); used by all field components
- components/ErrorBanner.js — submit-failure banner with "Try again" (custom retryLabel supported)
- components/OtpInput.js — 6-box one-time-code field (single hidden TextInput: paste + OS code autofill), FormField-compatible
- auth/AuthContext.js — session (see "Auth & sessions")
- data/enums.js — the backend's PHP enums, code → label, copied exactly: UNIT_STATUS, SERVICE_TYPE, PAYMENT_MODE,
  OWNER_TYPE, MUNICIPALITY_STATUS, INSTALLMENTS, GENDER, ENQUIRY_STATUS, CONTRACT_STATUS ({ label, color }).
  Contract code "e" Renewed is ENABLED (recruiter, 2026-10-05; colour "success" is the app's choice — not in the
  backend code we have). "f" Archived is still disabled in the backend — add it (+ a StatusBadge label) if enabled
- data/formOptions.js — dropdown options; BAHRAIN + GCC_NATIONALITIES (New User sign-up: Bahrain, Saudi Arabia,
  UAE, Kuwait, Qatar, Oman, Other — country names, unlike NATIONALITIES' demonyms); GENDERS = the GENDER enum's labels; OWNER_TYPES = { value, label } from
  OWNER_TYPE; COMPANIES holds the 4 real values
  from MAZ's admin panel;
  ACTIVITIES is a PLACEHOLDER (sample options used by New User sign-up's Activity) until the real Activity list
  comes from the API; SUPPORT_CATEGORIES is a PLACEHOLDER
- data/brand.js — TRUST_STATS, WELCOME_TAGLINES (final copy),
  BAHRAIN_ADVANTAGES, SERVICES (each with an Ionicons `icon`) from MAZ's marketing
  site; BROWSE_PLAN_IDS (the 3 services Browse Plans shows, in order); CONTACT { phone, phoneDial, email, hours[] } — MAZ's real contact details, saved for the Support screen
  (not displayed yet)

## Screens NOT built yet
- Unconfirmed (see Open questions): DocumentUpload, ContractReview

## Design conventions to follow for every new screen
- Colors come from the theme (colors.background, colors.text, colors.primary for primary buttons, …);
  every new screen must look right in both light and dark
- Buttons use the existing AnimatedButton component — don't rebuild button logic from scratch
- Text inputs use the existing StyledInput component — don't rebuild input logic from scratch
- Long forms should use a SectionCard component (collapsible sections) — build this component
  if it doesn't exist yet when a screen needs it
- Keep it minimal and fast-feeling — no bouncy animations, no unnecessary motion
- Match the navigation pattern already used in App.js (React Navigation native-stack,
  headerShown: false, screens registered in RootStackParamList-style object)
- Screen shell: SafeAreaView (style backgroundColor: colors.background) → (KeyboardAvoidingView for forms) → ScrollView →
  View "flex-1 px-6 pt-8 pb-10"; BackButton + ScreenTitle at the top; sections spaced mb-8
- Design tokens (visual styling phase 1, 2026-10-08) live in theme/theme.js: SPACING, RADIUS, TYPE (type scale — spread into
  Text styles; figures use tabular numerals) and ELEVATION (soft card shadow in LIGHT mode only — never in dark, where
  Android draws it through translucent surfaces). Extra colour tokens: divider (hairlines inside cards), surfaceMuted,
  info / infoSoft (neutral notices, e.g. the demo banner), warningBorder. useTheme() also returns `elevation`
- Cards: use useCardStyle() (theme/surfaces.js) — radius 16, colors.surface + 1px colors.surfaceBorder + the light-mode
  shadow; rows inside a card are split by colors.divider. Fields: radius 12, minHeight 48. Buttons: pill (RADIUS.pill).
  Buttons: AnimatedButton variant "primary" (navy, one per screen) / "brand" (hero navy) / "inverse" (ivory fill, navy
  label — the action ON a navy HeroPanel, e.g. dashboard "Pay now") / "secondary" (outlined) / "ghost" (text-only)
- Visual system (phases 2–3, 2026-10-08) — reuse these few patterns, don't invent new card styles:
  • PhotoHero — full-width workspace photo with a scrim: overlay "navy" (onHero text: Browse Plans banner, Contract
    Details cover, renewal screens) or "fade" (photo dissolves into the page: Welcome, dashboard). Rounded sheet bottom
  • HeroPanel — the navy panel for a screen's ONE headline block (dashboard Payment, Payment Review amount, Settings
    profile), brand staircase in the corner. AmountHero for the figure (size "display" | "hero")
  • DocumentSheet — documents / receipts: one sheet, sections split by Perforation (dashed tear line + edge notches)
    (Contract Details body, Bill, Payment Receipt / Failed). DetailRows (components/DetailCard.js) render its rows
  • ContractRow / ServiceCard — navy icon tile; contract rows are document cards with a term footer strip
  • Grouped lists (bills, notifications, quick actions) are one surface with colors.divider hairlines
  • Brand motif: BrandSquares (the wordmark's rising squares), the crimson square on SectionHeading (colors.highlight), BrandMark (logo on
    a white chip — the navy squares vanish on dark / photos)
  • InfoNote for demo / provisional notes; FadeIn (staggered entrance, honours Reduce motion — MOTION tokens);
    IconBadge `animate`; AnimatedButton variants primary / brand / inverse / secondary / ghost
  • Photos: theme/imagery.js WORKSPACE_PHOTOS (welcome, dashboard, plans, contract, renewal) → assets/images/workspace/
    (CREDITS.md). REAL MAZ photos (2026-10-09) replace the stock placeholders on Welcome (maz-reception.jpg — MAZ's
    reception, pre-cropped to a portrait frame so the wall logo survives the cover crop) and the Home dashboard
    (maz-waterfront.jpg — Amwaj Islands waterfront, the SAME photo for both the tenant and New User states). plans /
    contract / renewal are still licensed Unsplash stock — generic offices, NOT MAZ's; never caption them as MAZ's.
    Do NOT use the real photos on BrowsePlans' service cards. maz-meeting-room.jpg is RESERVED / UNUSED for a future
    screen (not yet received as a file). welcome-lobby.jpg / dashboard-corridor.jpg are no longer referenced.
    Bundled, never fetched
  • Lint: run `npx eslint .` — `expo lint` reports nothing in this project (it skipped a deliberate syntax error)
  Padding: tappable rows / tiles 16; content cards (DetailCard, EstimateCard, RequestSummaryCard, text cards) 20
  horizontal. Stacked cards 16 apart; sections 32 (mb-8); last form field → primary button: wrap the button in mt-4
- Type scale (use TYPE from theme/theme.js, don't invent sizes): screen title 28 / 700 (ScreenTitle) · section label xs semibold uppercase
  accent (SectionHeading / eyebrow) · card & row titles 16 / 600 · body 14 · captions & meta 12–13 muted ·
  headline numbers 32 / 800 (TrustStats, receipt amount) · card totals 22 / 700 (EstimateCard).
  Auth / onboarding screens carry the eyebrow "MAZ Business Center", like HomeDashboard and BrowsePlans
- Every tappable element uses PressableScale (cards/rows: scaleTo 0.98); all tap targets ≥ 44x44pt.
  Exception: form field triggers (DateField/SelectField) match StyledInput's primary (navy) focus border instead
- Anything loaded from the API: Skeleton while loading, EmptyState when empty, EmptyState + "Try again" on error
- Forms and submit buttons follow "Forms & API calls" below (react-hook-form + zod, useSubmit, ErrorBanner)
- Icons: Ionicons from @expo/vector-icons, outline style (filled only for error alerts and checkmark glyphs).
  Chevrons 18 · icons in circles are half the circle (36→18, 40→20, 44→22, 56→28)
- Status/alert text uses colors.success / colors.danger (+ successSoft / dangerSoft), not brand crimson —
  crimson text is hard to read on the dark background
- Mock data that differs per account type should read useDemo().userState (demo toggle), never a hardcoded flag

## Forms & API calls — the standard for EVERY screen (existing and future)
Every screen follows this pattern; don't hand-roll validation, loading flags or try/catch in screens.

**Validation (react-hook-form + zod)**
- Field rules live in validation/schemas.js (email, phone [Bahrain], fullName, password, loginPassword,
  crNumber, cprNumber, vatNumber, futureDate, pastOrTodayDate, requiredText, requiredSelect, optional()).
  Add new reusable rules there; build each form's schema there too (loginSchema, editProfileSchema, …).
- Optional-but-validated fields use optional(schema) — never z.union, which loses the specific message.
- Screens create the form with `useZodForm(schema, defaultValues)` (mode "onTouched": errors show after a
  field is left, then update live) and render every field through
  `<FormField control={control} name="…" component={StyledInput | DateField | SelectField | SegmentedControl} … />`.
- Each field shows its inline error (danger border + FieldError). New field components must accept
  `value`, `onChange` (or be marked `isTextField` for onChangeText), `onBlur` and `error`.
- Submit buttons: `disabled={!isValid}` — greyed out until the form is valid. If required fields can be
  hidden (collapsed SectionCard), explain what's missing under the button and offer a way to reveal them.

**API calls (services/)**
- Screens import ONLY from services/api.js. Never import services/mockApi.js from a screen.
- Every mock function goes through simulate() in services/mockApi.js: random 800–1200 ms latency and (only while error simulation is on — OFF by default) a
  random failure MOCK_FAILURE_RATE (15%) of the time, rejecting with ApiError { code, message }.
  Rule-based errors throw ApiError inside produce(). The random failure happens before produce(), so failed
  calls never mutate mock data.
- Going live: implement the function in services/httpApi.js with the same name/shape (via httpClient, mapping
  fields in apiMappers), then add it to the explicit re-export in services/api.js. Screens don't change.
  The "Simulate network errors" switch only affects mock functions.
- Submit buttons: `const { submit, loading, error } = useSubmit(apiFn)` →
  `<AnimatedButton disabled={!isValid} loading={loading} … />` + `<ErrorBanner message={error} onRetry={onSubmit} />`.
  Navigate forward only when `await submit(...)` returns a result.
- Data screens: `useAsync(loader)` → Skeleton while loading, EmptyState when empty, EmptyState + "Try again" on error.
- Error simulation is OFF by default (Cleanup 1, 2026-10-08). To test error states, start the bundler with
  EXPO_PUBLIC_SHOW_DEMO_CONTROLS=true and turn on Settings → Demo data → "Simulate network errors". In dev, log in
  with the password "wrong" to force an INVALID_CREDENTIALS error.

**No dead buttons:** every button/link/tappable card must be disabled (invalid form), loading, navigating,
or showing an error/result. Nothing may do nothing when tapped.

## Brand positioning & tone (from MAZ's marketing site)
- MAZ is a premium/luxury serviced-office brand, not a generic compliance app
- Copy is premium, polished, confident — words like "prestigious", "seamless", "concierge";
  never casual or playful, no emoji
- Approved trust stats (keep in data/brand.js): 4.9 Google rating, 18+ years of excellence,
  25+ companies supported, 0% corporate tax, 100% foreign ownership
- Services: Office Suites, CR Registration, Startup Incubator, Meeting Rooms
- Testimonials: do NOT add stock or copied client quotes — placeholder section only, until MAZ grants permission
- BrowsePlans should reuse components/TrustStats.js and match HomeDashboard's card styling

## Recruiter decisions (2026-10-05) — implemented
- No real payment gateway for now. Bill payment status is shown as just Paid / Unpaid (success / danger badges).
  Real bills use a PROVISIONAL rule until the paid field is confirmed: receipt_date set = Paid (all Unpaid today) —
  services/billService.js, labelled "Provisional — MAZ confirms payments".
  Outstanding balance / Payment due / Pay stay unknown on real contracts (badges only)
- New contracts were a fixed 9 months — SUPERSEDED by the client (2026-10-07): any lease length 1–36 months.
  Renewals keep 1/3/6/12
- The tenant chooses a payment frequency (INSTALLMENTS: Monthly / Quarterly / Half-Yearly / Yearly), carried
  through SelectTerm → SubmitRequest summary → the request's invoice
- The first invoice = first installment + deposit, always shown as separate lines (deposit is a PLACEHOLDER
  BHD 100 until MAZ gives the real amount)
- Contract status "e" Renewed is enabled; an approved renewal results in a Renewed contract (the renewal request
  itself is still mock)
- Once a tenant pays the request invoice, the resulting contract's status is Reviewing (CONTRACT_STATUS "b")

## Client decisions (demo feedback, 2026-10-07) — implemented
- Welcome offers two equal paths: "New User" (short NewUserSignUp form) and "Existing User" (Login)
- New User sign-up collects Company Name, Customer Name, Email, Nationality and CPR (Bahrain) / Passport
  (others), then verifies the email with an OTP (VerifyAccount — client confirmed OTP stays), then goes
  straight to Browse Plans. The old SignUp and CompleteProfile steps are retired (confirmed with the developer,
  2026-10-07): Login's "Sign up" link also goes to NewUserSignUp
- The request flow skips the details form for everyone: SelectTerm submits with the stored name, email and
  company; RequestStatus and Payment are unchanged
- Browse Plans shows only Office Suites, Meeting Rooms and CR Registration (existing titles kept). Startup
  Incubator hidden there — CONFIRMED by the client (data kept, not deleted)
- Meeting Rooms stay hourly only: picking them on Browse Plans opens the existing hourly booking (unchanged),
  never the lease / payment-frequency flow
- Lease length is the tenant's choice: any whole number of months, 1–36 (replaces the fixed 9 months)
- Activity — RESTORED (recruiter, 2026-10-10; supersedes the client's 2026-10-07 "not for now"): a REQUIRED,
  single-choice field on New User sign-up's Company step (+ Review step), validated by newUserSignUpSchema (must be one
  of ACTIVITIES). Kept through quickSignUp → VerifyAccount's session (user.activity, saved with the session; sessions
  saved earlier simply have none) → a later mock login → ReviewRequest, which sends it in the office / CR request
  (fetchRequestStatus returns it). MOCK / app-only: never sent to MAZ. Existing Users (tenants) have no activity
  (null) and aren't asked; NOT on EditProfile. Tests: tests/new-user-activity.test.mjs

## Open questions (waiting on recruiter)
- New User flow: OTP, Startup Incubator and Meeting Rooms are answered (see "Client decisions"). Still open:
  Activity — the REAL list (MAZ links activities to a contract by numeric id: contracts.activity_id is an ARRAY, e.g.
  [145, 21] — so MAZ may want multiple choice later, which needs a new multi-select component) and an endpoint to fetch
  it / save the choice; the
  1–36 month range is the app's choice for "any length" — confirm MAZ's real minimum / maximum; the GCC
  nationality list (used by sign-up and EditProfile) uses country names ("Bahrain") while the backend's
  customer nationality format is unknown (CompleteProfile's NATIONALITIES uses demonyms, "Bahraini") — confirm it
- Company dropdown in CompleteProfileScreen: currently hardcoded to MAZ's 4 known
  entities (MAZ Company, MAZ Business Center Incubator, MAZ Business Center, MAZ BDB).
  Waiting to confirm if this should later pull from a live API endpoint instead.
- Document upload / contract review & signing: the earlier generic flow assumed these steps, but the
  recruiter's 5-stage request flow ends at "Invoice Generated". Confirm whether they still exist.
- Pricing placeholders (term and frequency are decided — see above): (a) real per-plan pricing — currently
  the wireframe's sample BHD 100.000/month for every plan; (b) the real deposit amount (placeholder BHD 100);
  (c) how location is chosen — currently a placeholder "Seef District" (MAZ assigns the unit). All live in
  data/pricing.js and are labelled as samples on screen via RequestSummaryCard's isPlaceholder note.
- Activity options (ACTIVITIES in data/formOptions.js) are SAMPLE placeholders used by New User sign-up; should come from the real API.
- New User polish (2026-10-07) — backend needed for: (a) service details (location, capacity, size, furnishing,
  amenities — no screen shows plan.details now); (b) "Action required" on a request (a field MAZ sets
  + a way for the customer to respond — the unused ActionRequiredCard UI was removed in Cleanup 4; rebuild it once the field exists); (c) a requests
  list endpoint for My Requests (fetchRequests) and per-stage timestamps (stageReachedAt); (d) VAT on the request
  invoice (RequestInvoice shows Subtotal + VAT only if the invoice has `vat`); (e) a real payment transaction id;
  (f) an official invoice PDF (the in-app download is a device-generated demo)
- Office request / enquiry endpoints — ON HOLD (recruiter, 2026-10-05: "hold on for now"). Requests, their stage,
  the assigned unit (PLACEHOLDER "Office 312") and the invoice (first installment + deposit, due in 7 days) are
  all mock, in memory (lost on reload). Paying does NOT create a contract in the app — contracts come from the
  real API, which the app can't write to — so the request shows the contract as Reviewing until the backend adds
  it to GET /contracts
- Existing User payments (phase 4, 2026-10-08) are DEMO: PaymentReview → mockPayments → "Paid (demo)" for the session;
  nothing is sent to MAZ. Needed from MAZ to go live: payment endpoint + gateway, confirmation (webhook / status), the
  paid field, balances.
- Payment recording — PENDING: no gateway is being built (decided), and PaymentScreen stays a MOCK (BenefitPay /
  card are placeholders; nothing is charged). Still unknown: which field marks a receipt as paid (receipt_on /
  receipt_date / receipt_amt — the Paid / Unpaid rule is a placeholder), how a payment is actually confirmed and
  recorded (receipt_mode / PAYMENT_MODE Cash / Bank), and whether receipts are emailed.
- Bills: BillViewer is an in-app summary with one rent line. Confirm the real invoice format — official PDF
  (download/share), VAT breakdown, other charges (services, fines) — and whether invoices are also emailed.
- Notifications: in-app only, and for Existing Users DEMO (phase 5, 2026-10-08 — services/notificationService.js). Needed
  from MAZ: a customer-scoped notifications API (list, read state), server-side expiry / payment alerts with MAZ's real
  10-day rule (confirmed by the client; the app applies it today), an email service (emails are only recorded "not_sent" today), and
  which events to push (push needs expo-notifications + a sender).
- Meeting rooms — ON HOLD (recruiter, 2026-10-05; enums / endpoints later): the real rooms, opening hours, how far ahead / how long bookings can be, the cancellation
  cutoff, and whether bookings are charged, use included hours, or are free for tenants (no price shown yet).
  Availability of other tenants is simulated (data/meetingRooms.js + roomSlots in mockApi).
- Violations — ON HOLD (recruiter, 2026-10-05): there is NO real /violations API endpoint yet — ViolationsScreen / ViolationDetail are fully mock
  (phase 5: via services/violationService.js, labelled "Demo data", not linked to real contracts)
  until the recruiter confirms one exists (contracts carry a violation_id[] array, always empty so far).
  Real violation types are known from the admin panel; still open: how notices link to a contract / customer,
  whether there is a due date and fine per notice, whether tenants
  acknowledge or respond to a notice in-app, and whether fines are paid separately or only via the contract
  balance (currently read-only; questions go through a pre-filled support enquiry).
- Renewal (Renewed status decided — see above): no renewal endpoint yet (phase 5: requests are DEMO via
  services/renewalService.js, kept in memory, never sent; any active contract may request); real renewal pricing (currently the contract's current monthly rate), whether renewals can change
  unit or plan, how far before the end date a renewal can be requested, and whether expired contracts can be
  renewed (currently no — they start a new request).
- Support — ON HOLD (recruiter, 2026-10-05; ticket enums / endpoints later): real enquiry categories, where enquiries are routed (email / WhatsApp / ticketing), whether tenants
  can reply in-app, and any response-time commitment to show.
- Real API (https://maz.beeinfosoft.com/public/api; GET units, CRUD contracts + customers — only GETs are wired):
  • RESOLVED (2026-10-04): status / type codes — all enums are now in data/enums.js; contract status is live
    (badges, Active / Expired counts). Still open: customer company_id → company name; nationality format; where
    SERVICE_TYPE and ENQUIRY_STATUS appear in API records (none of the 3 endpoints return them — ENQUIRY_STATUS's
    values look like sales leads; enquiry endpoints are on hold)
  • Municipality Status — PENDING: the recruiter confirmed tenants SHOULD see it (2026-10-05), but which record it
    belongs to is still unknown — no UI until that's known
  • Owner Type / POST + PUT /customers — PENDING ("will come later", recruiter 2026-10-05): Owner Type is
    collected (required) in CompleteProfile (no longer in EditProfile) as an OwnerTypeEnum code, but GET /customers has no
    owner-type field; the API field name and the POST / PUT /customers fields come later. Until then
    CompleteProfile's saveProfile and EditProfile's updateProfile are MOCK (EditProfile pre-fills from the real
    GET for nationality / ID). Which customer fields Company Name and Customer Name map to in POST / PUT /customers
  is still to be confirmed
  • Auth / per-tenant filtering — PENDING ("comes later, not urgent", recruiter 2026-10-05): no auth and no login →
    customer link (the app's mock identity maps demo logins to customer 1 — services/mock/mockCustomerIdentity.js); no server-side filtering (?customer_id= is ignored, so every tenant's
    contracts are downloaded) — needs a per-user endpoint
  • No unit location field; no receipt period dates (only the description text); no payment / renewal endpoints
  • Server debug mode is on (404s return stack traces) — ask MAZ to turn it off
  • Required fields / validation error shape for POST /customers (not probed — it would create a real record)