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
- auth/AuthContext.js: AuthProvider + useAuth() → { ready, isSignedIn, user: { email, name }, token,
  profileComplete, justCompletedProfile, signIn(logInResult), completeProfile(name), signOut() }
- The session is stored encrypted with expo-secure-store (key maz.session) and restored on launch; the splash
  screen waits for it, so logged-in users never see Welcome flash first. Demo exception: Settings → Demo data →
  "Always start at Welcome" discards it at launch instead
- App.js renders route groups by auth state (React Navigation's auth-flow pattern): signed out → Welcome,
  SignUp, VerifyAccount, Login; signed in without profile → CompleteProfile, Settings; signed in → dashboard
  and all tenant screens. Screens never navigate across these groups — they call signIn / completeProfile /
  signOut and the navigator switches. Any new screen must be added to the right group
- Mock accounts: emails signed up this session must verify (code 123456) and complete their profile; any
  other email logs in as the existing tenant "Sara". logOut() never fails (best effort)
- Not yet: session expiry / 401 handling and token refresh — add once the real API defines them

## Theme system (light + dark) — never hardcode colors
- theme/theme.js defines BRAND plus PALETTES.light / PALETTES.dark (same token names in both)
- theme/ThemeContext.js: ThemeProvider + useTheme() → { colors, scheme, isDark, preference, setPreference, ready }
- Preference is "system" | "light" | "dark", persisted in AsyncStorage (key maz.themePreference), default "system"
- Every component/screen reads colors via `const { colors } = useTheme()` and applies them with `style`.
  NativeWind className is for layout, spacing and type only — no color classes (tailwind.config has no colors)
- Status bar is set once in App.js from the theme; screens must not render their own <StatusBar>
- App.js holds the splash screen until the saved preference loads, so the first frame is never the wrong theme
- User toggles the theme in screens/SettingsScreen.js (gear icon on HomeDashboard)

## Tech stack decisions already made
- Expo (managed workflow), NativeWind v4 for styling, React Navigation (native-stack)
- expo-haptics for button feedback, @react-native-community/datetimepicker for dates
- Screens live in /screens, reusable UI in /components
- No backend/API yet — using placeholder/mock data until the recruiter provides it
- Forms: react-hook-form + zod (+ @hookform/resolvers). See "Forms & API calls" below

## User flow (full sequence, in order)
1. Sign up (name, email, phone)
2. Verify account (6-digit code sent by email — VerifyAccountScreen)
3. Log in
4. Complete profile (company + owner details — matches MAZ's real "Create Customer" form)
5. Home dashboard (new user state: prompt to browse plans; active tenant state: contract status, quick actions)
6. Core actions (from the recruiter's "Request an Office" wireframe):
   Browse plans → Select plan → Select duration (SelectTermScreen: 1/3/6/12 months + estimated amount) →
   Submit request (SubmitRequestScreen: name, email, company, activity, remark) →
   the request then moves through 5 stages, tracked on RequestStatusScreen via StatusStepper:
     1. Request Submitted → 2. Email Confirmation Sent → 3. Admin Review → 4. Unit Assigned → 5. Invoice Generated
   → Payment (e.g. BenefitPay) → active contract appears on the dashboard (contract detail, bills, payments).
   The office admin assigns the actual unit — users request a plan, not a specific unit.
7. Ongoing tenant features: Book meeting rooms, track violations/compliance,
   renew/extend contract, notifications, support enquiries
8. Log out (Settings → Account)

## Screens built so far (working, in JavaScript)
- screens/WelcomeScreen.js ✅
- screens/SignUpScreen.js ✅ — signUp → VerifyAccount { email }
- screens/VerifyAccountScreen.js ✅ — 6-digit OtpInput (auto-submits), resend with 30s cooldown, verifyEmail →
  replaces itself with Login { email, justVerified }. Shows "Demo mode: use code 123456" (MOCK_OTP_CODE)
- screens/LoginScreen.js ✅ — logIn → signIn(session) (navigator switches automatically); EMAIL_NOT_VERIFIED
  offers "Verify email"; Forgot password → requestPasswordReset
- screens/CompleteProfileScreen.js ✅ — fields match MAZ's "Create Customer" form exactly (Company Details
  open, Owner Details collapsed); required: Customer Name, Owner Name, Gender. First screen for a new account:
  "Not you? Log out" instead of Back. Save → saveProfile → completeProfile() → dashboard
- screens/HomeDashboardScreen.js ✅ — two states, chosen by the Settings demo toggle (useDemo):
  • Tenant (default): "Welcome back, Sara", StatCards (Active / Expired contracts, Payment due), "Quick
    actions" 2×2 tiles (QuickAction), "Your contracts" rows (StatusBadge, tap → ContractDetail),
    "Find a new office" → BrowsePlans
  • Header: notifications bell (unread dot from fetchUnreadCount, refreshed on focus) + settings gear
  • New user: "no office leased" card with Browse Plans, trust stats, services, testimonials placeholder
- screens/SettingsScreen.js ✅ — Account (logged-in user + Log out with confirmation), Appearance (System / Light /
  Dark, persisted), Demo data (dashboard state, error simulation)
- screens/BrowsePlansScreen.js ✅ — trust stats + a card per service with Select; selecting shows a fixed
  "Continue with {plan}" footer → SelectTerm (passes { plan })
- screens/SelectTermScreen.js ✅ — "Select your duration": SegmentedControl 1/3/6/12 months (default 1) +
  live estimated-amount card (placeholder rate) → SubmitRequest (passes { plan, termMonths })
- screens/SubmitRequestScreen.js ✅ — (this is the screen previously listed as "BookingForm") Full Name, Email,
  Company Name, Activity dropdown, optional Remark + RequestSummaryCard built by buildRequestSummary
  (term is real; location and rate are PLACEHOLDERS).
  Submit validates, calls mock submitRequest, then PUSHES RequestStatus (no stack reset), so Back retraces
  RequestStatus → SubmitRequest → SelectTerm → BrowsePlans → dashboard. After submitting, the form's button
  becomes "View request status" so it can't be sent twice
- screens/RequestStatusScreen.js ✅ — StatusStepper + confirmation + summary; loads fetchRequestStatus.
  Back → previous step; "Back to dashboard" → popToTop
  (mock always returns step 1 — swap for the real API to show the true stage)
- screens/ContractDetailScreen.js ✅ — per the recruiter wireframe: contract no. + unit + StatusBadge, Contract term
  (start / end, plus the pending renewal), Bill details, Payment details, Payment due + bills list, "Pay outstanding
  balance" → Payment. Expired / fully paid contracts show "No outstanding balance" instead of the dues section.
  Active contracts without a pending renewal show "Renew contract" → RenewContract. "View bill" (Bill details) and
  each bills-list row → BillViewer
- screens/BillViewerScreen.js ✅ — bill summary from fetchBill: status, contract + billing period + due date,
  Charges (PLACEHOLDER single rent line) + total, Payment (when paid), "Pay outstanding balance" when due
- screens/PaymentScreen.js ✅ — MOCK payment: amount due + due bills, payment method (BenefitPay / card —
  PLACEHOLDER options), "Pay BHD …" → payOutstandingBalance → resets stack to
  [HomeDashboard, ContractDetail, PaymentReceipt] so both re-load with the settled balance
- screens/PaymentReceiptScreen.js ✅ — success state + receipt details; "Back to contract" / "Go to dashboard".
  Labelled "Demo receipt — no money was charged"
- screens/NotificationsScreen.js ✅ — in-app notifications (fetchNotifications): unread rows tinted with a dot,
  tap marks read (best effort) and opens `target` { screen, params }; "Mark all as read". No push yet
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
- screens/RenewContractScreen.js ✅ — renewal REQUEST (admin approves): SegmentedControl 1/3/6/12 months +
  EstimateCard (current rate × months, current → new end date) + optional Remark (renewalSchema) →
  requestRenewal → resets to [HomeDashboard, ContractDetail { renewalRequested }]. Non-active or already-requested
  contracts show an EmptyState instead of the form
- screens/ViolationsScreen.js ✅ — read-only notices grouped Open / Resolved → ViolationDetail
- screens/ViolationDetailScreen.js ✅ — details (DetailCard; fine if any, "added to your contract balance"),
  description, resolution; "Contact support" → NewEnquiry with prefill (category "Violation query")

## Components built so far (working, in JavaScript)
- components/AnimatedButton.js ✅ — press-scale animation + haptic; `disabled` (greyed, inert) and `loading`
  (spinner, taps ignored) props
- components/StyledInput.js ✅ — text input with crimson border on focus; `error` prop → danger border + FieldError.
  DateField, SelectField and SegmentedControl take the same `error` (+ `onBlur`) props
- components/SectionCard.js ✅ — collapsible card wrapper (title, subtitle, defaultExpanded)
- components/DateField.js ✅ — tappable field; native dialog on Android, inline spinner on iOS
- components/SelectField.js ✅ — dropdown field opening a bottom-sheet list (search box when > 10 options)
- components/SegmentedControl.js ✅ — inline toggle between options (used for Gender)
- components/TrustStats.js ✅ — row of stat tiles (reuse on BrowsePlans)
- components/PressableScale.js ✅ — shared press feedback (scale + light haptic); AnimatedButton is built on it
- components/ScreenTitle.js ✅ — standard heading block (optional eyebrow, 2xl title, subtitle, mb-8)
- components/BackButton.js ✅ / components/TextLink.js ✅ — 44pt back button and secondary text links
- components/EmptyState.js ✅ — icon + title + message (+ optional action); `dashed` for "coming soon"
- components/Skeleton.js ✅ — Skeleton block + SkeletonCard for loading placeholders
- components/StatusStepper.js ✅ — reusable horizontal step tracker; props currentStep (1-based) + optional
  steps (defaults to REQUEST_STEPS). Completed = check, current = filled crimson, upcoming = muted
- components/RequestSummaryCard.js ✅ — Plan / Location / Term / Estimated price recap
- data/requestSteps.js — REQUEST_STEPS, the 5 request stages (single source for StatusStepper + API mapping)
- data/pricing.js — TERM_OPTIONS, formatTerm, formatBHD (3 decimals), estimateTotal, buildRequestSummary,
  extendEndDate (renewal end date);
  PLACEHOLDER_MONTHLY_RATE_BHD and PLACEHOLDER_LOCATION until real pricing/location exist
- components/StatusBadge.js ✅ — pill for active / expired / due / paid / upcoming / open / resolved / answered /
  confirmed / cancelled / requested (theme success/danger tints, muted otherwise)
- components/EstimateCard.js ✅ — "Estimated amount" rows + big total + note (SelectTerm, RenewContract)
- components/SlotPicker.js ✅ — FormField-compatible grid of time-slot pills; `slots` [{ value, label, disabled }]
- components/DetailCard.js ✅ — titled card of label/value rows (value may be a node, e.g. StatusBadge); used by
  ContractDetail, EnquiryDetail and other detail screens
- components/StatCard.js ✅ — label + big value + caption card (dashboard stats)
- utils/formatDate.js — formatDate ("05 Mar 2027"), formatMonth ("Oct 2026"), formatTime ("14:00" → "2:00 PM"),
  formatTimestamp ("Today, 2:05 PM" / "24 Sep 2026"), toISODate (local "YYYY-MM-DD"); shared with DateField
- data/meetingRooms.js — PLACEHOLDER rooms, opening hours (08–18), durations, booking window
- data/mockViolations.js — MOCK notices (2 open, 1 resolved with a fine); PLACEHOLDER types
- data/mockEnquiries.js — MOCK support enquiries (one open, one answered)
- data/mockNotifications.js — MOCK notifications per demo account type; mock actions (e.g. payment) push new ones
- data/mockTenant.js — MOCK tenant name + 3 contracts from the wireframe (dates moved to 2026), each with
  startDate / endDate / monthlyRate; `renewal` is added by requestRenewal
- data/paymentMethods.js — PLACEHOLDER payment options (BenefitPay, card) until the gateway is confirmed
- demo/DemoContext.js — DEMO ONLY: DemoProvider + useDemo() → { userState: "tenant" | "newUser", simulateErrors,
  startAtWelcome }, persisted in AsyncStorage (maz.demoUserState, maz.demoSimulateErrors, maz.demoStartAtWelcome),
  toggled in Settings → "Demo data". simulateErrors drives setMockFailuresEnabled; startAtWelcome makes
  AuthProvider discard the saved session at launch (every launch opens Welcome). Remove once real account data
  exists (and drop the useDemo() read in auth/AuthContext.js)
- services/api.js — the ONLY module screens import API functions from (re-exports ./mockApi today)
- services/mockApi.js — every mock endpoint (signUp, verifyEmail, resendVerificationCode, logIn, logOut,
  requestPasswordReset, saveProfile, fetchPlans,
  submitRequest, fetchRequestStatus, fetchDashboard, fetchContract, payOutstandingBalance,
  fetchNotifications, fetchUnreadCount, markNotificationRead, markAllNotificationsRead,
  fetchEnquiries, fetchEnquiry, submitEnquiry,
  fetchMeetingRooms, fetchRoomAvailability, bookMeetingRoom, fetchBookings, cancelBooking,
  fetchViolations, fetchViolation, requestRenewal, fetchBill), all via simulate()
- services/apiError.js — ApiError { code, message } that every API function rejects with
- validation/schemas.js — reusable Zod field + form schemas (see "Forms & API calls")
- hooks/useZodForm.js, hooks/useSubmit.js — form + submit-button standards (see "Forms & API calls");
  useSubmit also returns errorCode (the ApiError code) for screens that react to specific errors
- hooks/useAsync.js — { loading, data, error, reload } for any loader; results go stale when the loader changes
- components/FormField.js — react-hook-form Controller wrapper for any field component
- components/FieldError.js — inline field error (icon + danger text); used by all field components
- components/ErrorBanner.js — submit-failure banner with "Try again" (custom retryLabel supported)
- components/OtpInput.js — 6-box one-time-code field (single hidden TextInput: paste + OS code autofill), FormField-compatible
- auth/AuthContext.js — session (see "Auth & sessions")
- data/formOptions.js — dropdown options; COMPANIES holds the 4 real values from MAZ's admin panel;
  ACTIVITIES is a PLACEHOLDER until the real Activity list comes from the API; SUPPORT_CATEGORIES is a PLACEHOLDER
- data/brand.js — TRUST_STATS, BAHRAIN_ADVANTAGES, SERVICES from MAZ's marketing site

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
- Cards: radius 16, colors.surface + colors.surfaceBorder. Fields/buttons: radius 12, fields minHeight 48
- Every tappable element uses PressableScale (cards/rows: scaleTo 0.98); all tap targets ≥ 44x44pt.
  Exception: form field triggers (DateField/SelectField) match StyledInput's crimson focus border instead
- Anything loaded from the API: Skeleton while loading, EmptyState when empty, EmptyState + "Try again" on error
- Forms and submit buttons follow "Forms & API calls" below (react-hook-form + zod, useSubmit, ErrorBanner)
- Icons: Ionicons from @expo/vector-icons
- Status/alert text uses colors.success / colors.danger (+ successSoft / dangerSoft), not brand crimson —
  crimson text is hard to read on the dark background
- Mock data that differs per account type should read useDemo().userState (demo toggle), never a hardcoded flag

## Forms & API calls — the standard for EVERY screen (existing and future)
Every screen follows this pattern; don't hand-roll validation, loading flags or try/catch in screens.

**Validation (react-hook-form + zod)**
- Field rules live in validation/schemas.js (email, phone [Bahrain], fullName, password, loginPassword,
  crNumber, cprNumber, vatNumber, futureDate, pastOrTodayDate, requiredText, requiredSelect, optional()).
  Add new reusable rules there; build each form's schema there too (signUpSchema, loginSchema, …).
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
- Every mock function goes through simulate() in services/mockApi.js: random 800–1200 ms latency and a
  random failure MOCK_FAILURE_RATE (15%) of the time, rejecting with ApiError { code, message }.
  Rule-based errors throw ApiError inside produce(). The random failure happens before produce(), so failed
  calls never mutate mock data.
- Going live: add services/httpApi.js with the same function names/shapes using fetch(), throwing ApiError on
  failure, then change the export in services/api.js (all at once, or per function). Screens don't change.
- Submit buttons: `const { submit, loading, error } = useSubmit(apiFn)` →
  `<AnimatedButton disabled={!isValid} loading={loading} … />` + `<ErrorBanner message={error} onRetry={onSubmit} />`.
  Navigate forward only when `await submit(...)` returns a result.
- Data screens: `useAsync(loader)` → Skeleton while loading, EmptyState when empty, EmptyState + "Try again" on error.
- Error simulation is ON by default (Settings → Demo data → "Simulate network errors"). Turn it OFF before a
  recruiter demo. In dev, log in with the password "wrong" to force an INVALID_CREDENTIALS error.

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

  ## Open questions (waiting on recruiter)
- Company dropdown in CompleteProfileScreen: currently hardcoded to MAZ's 4 known
  entities (MAZ Company, MAZ Business Center Incubator, MAZ Business Center, MAZ BDB).
  Waiting to confirm if this should later pull from a live API endpoint instead.
- Document upload / contract review & signing: the earlier generic flow assumed these steps, but the
  recruiter's 5-stage request flow ends at "Invoice Generated". Confirm whether they still exist.
- Duration step: SelectTermScreen (1/3/6/12 months) is now built from the recruiter's wireframe, but
  the recruiter hasn't formally confirmed it. Still open: (a) real per-plan pricing — currently the
  wireframe's sample BHD 100.000/month for every plan; (b) how location is chosen — currently a
  placeholder "Seef District" (MAZ assigns the unit). Both live in data/pricing.js and are labelled
  as samples on screen via RequestSummaryCard's isPlaceholder note.
- SubmitRequest's Activity dropdown uses placeholder options; should come from the real API.
- Payment: which gateway (the wireframe shows BenefitPay) and what the real pay flow looks like (redirect to
  BenefitPay app? card form?). PaymentScreen is a MOCK — method options and the success result are
  placeholders; nothing is charged. Also confirm whether receipts are emailed.
- Bills: BillViewer is an in-app summary with one rent line. Confirm the real invoice format — official PDF
  (download/share), VAT breakdown, other charges (services, fines) — and whether invoices are also emailed.
- Notifications: in-app only for now. Push notifications need expo-notifications + a backend that sends them —
  confirm which events MAZ wants pushed (bills, request stages, bookings, notices).
- Meeting rooms: the real rooms, opening hours, how far ahead / how long bookings can be, the cancellation
  cutoff, and whether bookings are charged, use included hours, or are free for tenants (no price shown yet).
  Availability of other tenants is simulated (data/meetingRooms.js + roomSlots in mockApi).
- Violations: what MAZ actually records (building rules, documents, late payments?), whether tenants
  acknowledge or respond to a notice in-app, and whether fines are paid separately or only via the contract
  balance (currently read-only; questions go through a pre-filled support enquiry).
- Renewal: real renewal pricing (currently the contract's current monthly rate), whether renewals can change
  unit or plan, how far before the end date a renewal can be requested, and whether expired contracts can be
  renewed (currently no — they start a new request).
- Support: real enquiry categories, where enquiries are routed (email / WhatsApp / ticketing), whether tenants
  can reply in-app, and any response-time commitment to show.
- Contracts/bills/payments API shape — all tenant data is mock (data/mockTenant.js) until then.