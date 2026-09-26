# MAZ App — Project Context

## What this app is
A mobile app (iOS + Android) for MAZ Business Center, a business-setup and office-leasing
company in Bahrain. Built with Expo (React Native) + JavaScript + NativeWind (Tailwind).

## IMPORTANT: Language is JavaScript, not TypeScript
The recruiter has requested plain JavaScript for this project. All files should use
.js / .jsx extensions, not .ts / .tsx. Do not add TypeScript type annotations,
interfaces, or generics anywhere. If any .ts/.tsx files still exist in this project,
they need to be converted to .js/.jsx as part of this change.

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

## Screens built so far (currently .tsx, need conversion to .jsx)
- WelcomeScreen.tsx ✅
- SignUpScreen.tsx ✅
- LoginScreen.tsx ✅

## Screens not built yet
- CompleteProfileScreen,Home Dashboard, Browse Plans, Booking form, Document Upload, Contract review,
  Payment, Meeting Room booking, Violations list, Notifications, Support/Enquiries

## Design conventions to follow for every new screen
- Dark navy background (#101828), white text, crimson (#a31c37) for primary buttons
- Buttons use the shared AnimatedButton component (press-scale + haptic feedback)
- Text inputs use the shared StyledInput component (crimson border on focus)
- Long forms use the shared SectionCard component (collapsible sections)
- Keep it minimal and fast-feeling — no bouncy animations, no unnecessary motion