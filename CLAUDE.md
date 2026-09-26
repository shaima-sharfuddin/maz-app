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
2. Verify account (OTP or email link)
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
8. Log out

## Screens built so far (working, in JavaScript)
- screens/WelcomeScreen.js ✅
- screens/SignUpScreen.js ✅
- screens/LoginScreen.js ✅
- screens/CompleteProfileScreen.js ✅ — fields match MAZ's "Create Customer" form exactly (Company Details
  open, Owner Details collapsed); required: Customer Name, Owner Name, Gender. Save validates, then resets
  the stack to HomeDashboard (nothing persisted — no backend)
- screens/HomeDashboardScreen.js ✅ — two states, chosen by the Settings demo toggle (useDemo):
  • Tenant (default): "Welcome back, Sara", StatCards (Active / Expired contracts, Payment due), "Your
    contracts" rows (StatusBadge, tap → ContractDetail), "Find a new office" → BrowsePlans
  • New user: "no office leased" card with Browse Plans, trust stats, services, testimonials placeholder
- screens/SettingsScreen.js ✅ — Appearance: System / Light / Dark theme toggle (persisted)
- screens/BrowsePlansScreen.js ✅ — trust stats + a card per service with Select; selecting shows a fixed
  "Continue with {plan}" footer → SelectTerm (passes { plan })
- screens/SelectTermScreen.js ✅ — "Select your duration": SegmentedControl 1/3/6/12 months (default 1) +
  live estimated-amount card (placeholder rate) → SubmitRequest (passes { plan, termMonths })
- screens/SubmitRequestScreen.js ✅ — (this is the screen previously listed as "BookingForm") Full Name, Email,
  Company Name, Activity dropdown, optional Remark + RequestSummaryCard built by buildRequestSummary
  (term is real; location and rate are PLACEHOLDERS).
  Submit validates, calls mock submitRequest, then resets the stack to [HomeDashboard, RequestStatus]
- screens/RequestStatusScreen.js ✅ — StatusStepper + confirmation + summary; loads fetchRequestStatus
  (mock always returns step 1 — swap for the real API to show the true stage)
- screens/ContractDetailScreen.js ✅ — per the recruiter wireframe: contract no. + unit + StatusBadge, Bill details,
  Payment details, Payment due + bills list, "Pay outstanding balance" → Payment. Expired / fully paid
  contracts show "No outstanding balance" instead of the dues section
- screens/PaymentScreen.js ✅ — MOCK payment: amount due + due bills, payment method (BenefitPay / card —
  PLACEHOLDER options), "Pay BHD …" → payOutstandingBalance → resets stack to
  [HomeDashboard, ContractDetail, PaymentReceipt] so both re-load with the settled balance
- screens/PaymentReceiptScreen.js ✅ — success state + receipt details; "Back to contract" / "Go to dashboard".
  Labelled "Demo receipt — no money was charged"

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
- data/pricing.js — TERM_OPTIONS, formatTerm, formatBHD (3 decimals), estimateTotal, buildRequestSummary;
  PLACEHOLDER_MONTHLY_RATE_BHD and PLACEHOLDER_LOCATION until real pricing/location exist
- components/StatusBadge.js ✅ — pill for active / expired / due / paid / upcoming (theme success/danger tints)
- components/StatCard.js ✅ — label + big value + caption card (dashboard stats)
- utils/formatDate.js — formatDate ("05 Mar 2027") and formatMonth ("Oct 2026"); shared with DateField
- data/mockTenant.js — MOCK tenant name + 3 contracts from the wireframe (dates moved to 2026)
- data/paymentMethods.js — PLACEHOLDER payment options (BenefitPay, card) until the gateway is confirmed
- demo/DemoContext.js — DEMO ONLY: DemoProvider + useDemo() → { userState: "tenant" | "newUser", simulateErrors },
  persisted in AsyncStorage (maz.demoUserState, maz.demoSimulateErrors), toggled in Settings → "Demo data".
  simulateErrors drives setMockFailuresEnabled. Remove once real account data exists
- services/api.js — the ONLY module screens import API functions from (re-exports ./mockApi today)
- services/mockApi.js — every mock endpoint (signUp, logIn, requestPasswordReset, saveProfile, fetchPlans,
  submitRequest, fetchRequestStatus, fetchDashboard, fetchContract, payOutstandingBalance), all via simulate()
- services/apiError.js — ApiError { code, message } that every API function rejects with
- validation/schemas.js — reusable Zod field + form schemas (see "Forms & API calls")
- hooks/useZodForm.js, hooks/useSubmit.js — form + submit-button standards (see "Forms & API calls")
- hooks/useAsync.js — { loading, data, error, reload } for any loader; results go stale when the loader changes
- components/FormField.js — react-hook-form Controller wrapper for any field component
- components/FieldError.js — inline field error (icon + danger text); used by all field components
- components/ErrorBanner.js — submit-failure banner with "Try again"
- data/formOptions.js — dropdown options; COMPANIES holds the 4 real values from MAZ's admin panel;
  ACTIVITIES is a PLACEHOLDER until the real Activity list comes from the API
- data/brand.js — TRUST_STATS, BAHRAIN_ADVANTAGES, SERVICES from MAZ's marketing site

## Screens NOT built yet
- BillViewer ("View bill" in the wireframe),
  MeetingRoomBooking, ViolationsList, Notifications, SupportEnquiries
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
- Bills: is there a bill/invoice viewer ("View bill" in the wireframe) — PDF, in-app, or email only?
- Contracts/bills/payments API shape — all tenant data is mock (data/mockTenant.js) until then.