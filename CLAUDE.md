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

## Tech stack decisions already made
- Expo (managed workflow), NativeWind v4 for styling, React Navigation (native-stack)
- expo-haptics for button feedback, @react-native-community/datetimepicker for dates
- Screens live in /screens, reusable UI in /components
- No backend/API yet — using placeholder/mock data until the recruiter provides it

## User flow (full sequence, in order)
1. Sign up (name, email, phone)
2. Verify account (OTP or email link)
3. Log in
4. Complete profile (company + owner details — matches MAZ's real "Create Customer" form)
5. Home dashboard (new user state: prompt to browse plans; active tenant state: contract status, quick actions)
6. Core actions: Browse plans → Select plan & term → Submit enquiry/booking →
   company approves/rejects → Upload documents → Contract drafted → Review & sign →
   Payment → Download signed contract → (user uploads to Sijilat themselves)
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
- screens/HomeDashboardScreen.js ✅ — new-user state only: welcome, "no office leased" card with Browse Plans
  button (not wired — BrowsePlans doesn't exist), trust stats, services, testimonials placeholder

## Components built so far (working, in JavaScript)
- components/AnimatedButton.js ✅ — press-scale animation + haptic feedback on tap
- components/StyledInput.js ✅ — text input with crimson border on focus
- components/SectionCard.js ✅ — collapsible card wrapper (title, subtitle, defaultExpanded)
- components/DateField.js ✅ — tappable field; native dialog on Android, inline spinner on iOS
- components/SelectField.js ✅ — dropdown field opening a bottom-sheet list (search box when > 10 options)
- components/SegmentedControl.js ✅ — inline toggle between options (used for Gender)
- components/TrustStats.js ✅ — row of stat tiles (reuse on BrowsePlans)
- data/formOptions.js — dropdown options; COMPANIES holds the 4 real values from MAZ's admin panel
- data/brand.js — TRUST_STATS, BAHRAIN_ADVANTAGES, SERVICES from MAZ's marketing site

## Screens NOT built yet
- BrowsePlans, BookingForm, DocumentUpload, ContractReview,
  Payment, MeetingRoomBooking, ViolationsList, Notifications, SupportEnquiries

## Design conventions to follow for every new screen
- Dark navy background (#101828), white text, crimson (#a31c37) for primary buttons
- Buttons use the existing AnimatedButton component — don't rebuild button logic from scratch
- Text inputs use the existing StyledInput component — don't rebuild input logic from scratch
- Long forms should use a SectionCard component (collapsible sections) — build this component
  if it doesn't exist yet when a screen needs it
- Keep it minimal and fast-feeling — no bouncy animations, no unnecessary motion
- Match the navigation pattern already used in App.js (React Navigation native-stack,
  headerShown: false, screens registered in RootStackParamList-style object)

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