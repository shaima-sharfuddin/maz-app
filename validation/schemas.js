import { z } from "zod";
import { BAHRAIN } from "../data/formOptions";
import { findCountry } from "../data/countryCodes";
import { MIN_LEASE_MONTHS, MAX_LEASE_MONTHS } from "../data/pricing";

// Reusable field rules for every form in the app (used via hooks/useZodForm.js).
// Plain Zod, no React — so the same rules can later be shared with the backend.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BH_PHONE_RE = /^(\+973)?[136]\d{7}$/; // Bahrain: 8 digits starting 3/6 (mobile) or 1 (landline)
// Latin (incl. accented) and Arabic letters; explicit ranges rather than \p{L} for Hermes safety.
const NAME_RE = /^[A-Za-zÀ-ɏ؀-ۿ][A-Za-zÀ-ɏ؀-ۿ .'-]*$/;
const CR_RE = /^\d{1,6}-\d{1,3}$/; // e.g. 123456-1
const CPR_RE = /^\d{9}$/;
const VAT_RE = /^\d{15}$/; // Bahrain VAT account number

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

// ---- Field schemas ---------------------------------------------------------

export const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .regex(EMAIL_RE, "Enter a valid email address, e.g. you@company.com");

export const phone = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .refine((v) => BH_PHONE_RE.test(v.replace(/[\s-]/g, "")), "Enter a valid Bahrain number, e.g. +973 3xxx xxxx");

// ---- International mobile number (New User sign-up) ------------------------
// The number is typed without the dial code (picked separately). Spaces, dashes, dots and brackets are ignored;
// a leading domestic "0" is dropped where people commonly type one (country.trunk, e.g. UK 07…).
const PHONE_SEPARATORS_RE = /[\s\-().]/g;

// (iso, typed) → the national number as stored: digits only, trunk "0" removed.
export function nationalPhoneDigits(iso, typed) {
  const digits = String(typed ?? "").replace(PHONE_SEPARATORS_RE, "");
  return findCountry(iso)?.trunk && digits.startsWith("0") ? digits.slice(1) : digits;
}

// The problem with a mobile number for the chosen country, or null when it's fine. Lengths come from
// data/countryCodes.js; countries without one get the international limits (E.164: at most 15 digits in all).
export function mobileNumberIssue(iso, typed) {
  if (!String(typed ?? "").trim()) return "Mobile Number is required";
  const country = findCountry(iso);
  if (!country) return "Select a country code";
  if (!/^\d+$/.test(String(typed).replace(PHONE_SEPARATORS_RE, ""))) return "Use digits only";
  const national = nationalPhoneDigits(iso, typed);
  const maxForCode = 15 - (country.dial.length - 1);
  const [min, max] = country.len ?? [4, maxForCode];
  if (national.length < min || national.length > Math.min(max, maxForCode)) {
    const digits = min === max ? `${min} digits` : `${min}–${max} digits`;
    return `Enter a valid ${country.name} number (${digits})`;
  }
  // +1 (US, Canada, Caribbean): area codes never start with 0 or 1.
  if (country.dial === "+1" && !/^[2-9]/.test(national)) return `Enter a valid ${country.name} number`;
  return null;
}

export const fullName = z
  .string()
  .trim()
  .min(1, "Name is required")
  .min(2, "Enter at least 2 characters")
  .max(80, "Keep it under 80 characters")
  .regex(NAME_RE, "Use letters, spaces, apostrophes or hyphens only");

// For creating a password (future sign-up / reset flows).
export const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

// For logging in: never enforce creation rules on an existing password.
export const loginPassword = z.string().min(1, "Password is required");

export const crNumber = z.string().trim().regex(CR_RE, "Enter a CR number like 123456-1");
export const cprNumber = z.string().trim().regex(CPR_RE, "CPR number must be exactly 9 digits");
export const vatNumber = z.string().trim().regex(VAT_RE, "VAT number must be exactly 15 digits");

// Expiry dates (CPR, passport, …) must be after today.
export const futureDate = z
  .date({ error: "Select a date" })
  .refine((d) => d > endOfToday(), "Date must be in the future");

// Registration / issue dates can't be in the future.
export const pastOrTodayDate = z
  .date({ error: "Select a date" })
  .refine((d) => d <= endOfToday(), "Date can't be in the future");

// Bookings: today or any later date.
export const todayOrFutureDate = z
  .date({ error: "Select a date" })
  .refine((d) => d >= startOfToday(), "Choose today or a later date");

export const otpCode = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");

export const requiredText = (label) => z.string().trim().min(1, `${label} is required`);
export const requiredSelect = (label) => z.string().min(1, `Select ${label.toLowerCase()}`);
export const optionalText = z.string().trim();

// Accepts an empty value ("" / null / undefined) but validates anything filled in, keeping the
// field schema's own error message (a plain z.union would replace it with a generic one).
export const optional = (schema) =>
  z.any().superRefine((value, ctx) => {
    if (value === "" || value === null || value === undefined) return;
    const result = schema.safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) ctx.addIssue({ code: "custom", message: issue.message });
    }
  });

// ---- Form schemas ----------------------------------------------------------

export const verifyAccountSchema = z.object({
  code: otpCode,
});

export const loginSchema = z.object({
  email,
  password: loginPassword,
});

// Mirrors MAZ's admin "Create Customer" form: only Customer Name, Owner Name and Gender are
// required; everything else is optional but must be valid when filled.
export const completeProfileSchema = z.object({
  customer: z.object({
    company: optionalText,
    customerName: requiredText("Customer Name"),
    vatNumber: optional(vatNumber),
    vatRegistrationDate: optional(pastOrTodayDate),
    crNumber: optional(crNumber),
    crRegistrationDate: optional(pastOrTodayDate),
    address: optionalText,
  }),
  owner: z.object({
    ownerName: fullName,
    ownerMobile: optional(phone),
    email: optional(email),
    cprNumber: optional(cprNumber),
    cprExpiryDate: optional(futureDate),
    passportNumber: optionalText,
    passportExpiryDate: optional(futureDate),
    nationality: optionalText,
    gender: requiredSelect("Gender"),
    ownerType: requiredSelect("Owner Type"),
  }),
});

export const supportEnquirySchema = z.object({
  category: requiredSelect("Category"),
  contract: optionalText,
  subject: requiredText("Subject").max(120, "Keep the subject under 120 characters"),
  message: requiredText("Message")
    .min(10, "Add a little more detail (at least 10 characters)")
    .max(1000, "Keep your message under 1000 characters"),
});

export const bookingSchema = z.object({
  date: todayOrFutureDate,
  start: z.string().min(1, "Select a time slot"),
  durationHours: z.number(),
  notes: z.string().trim().max(300, "Keep notes under 300 characters"),
});

// New User sign-up (WelcomeScreen → "New User"). Mobile Number: country code (any country) + a number valid for
// it (mobileNumberIssue). Bahrain → CPR Number required; any other nationality → Passport Number required. The screen only renders the field that applies and clears the other one.
export const newUserSignUpSchema = z
  .object({
    companyName: requiredText("Company Name"),
    customerName: requiredText("Customer Name"),
    // Business activity (restored at the recruiter's request, 2026-10-10): required, one choice from the dropdown —
    // MAZ's GET /activities labels, or the SAMPLE list if that fails (services/activityService.js). The options load
    // at runtime, so the field itself limits the choice to the list; the schema checks it's present and sane.
    // Kept in the app only; never sent to MAZ.
    activity: requiredSelect("Activity").max(200, "Select an activity from the list"),
    email,
    phoneCountry: requiredSelect("Country code"), // ISO code; the dial code is derived (data/countryCodes.js)
    phoneNumber: z.string(),
    nationality: requiredSelect("Nationality"),
    cprNumber: z.string(),
    passportNumber: z.string(),
    // Optional free text for MAZ's team — sent as the enquiry's `remarks` (POST /enquiries, when switched on).
    remarks: z.string().trim().max(500, "Keep remarks under 500 characters").optional(),
  })
  .superRefine((values, ctx) => {
    const phoneIssue = values.phoneCountry ? mobileNumberIssue(values.phoneCountry, values.phoneNumber) : null;
    if (phoneIssue) ctx.addIssue({ code: "custom", path: ["phoneNumber"], message: phoneIssue });
    if (!values.nationality) return;
    if (values.nationality === BAHRAIN) {
      const result = cprNumber.safeParse(values.cprNumber);
      if (!result.success) {
        const message = values.cprNumber.trim() ? result.error.issues[0].message : "CPR Number is required";
        ctx.addIssue({ code: "custom", path: ["cprNumber"], message });
      }
    } else if (!values.passportNumber.trim()) {
      ctx.addIssue({ code: "custom", path: ["passportNumber"], message: "Passport Number is required" });
    }
  });

// EditProfile: only the non-sensitive account fields (the email is shown read-only). Nationality and the
// CPR / passport number are collected at sign-up but never shown or edited in the signed-in app.
export const editProfileSchema = z.object({
  companyName: requiredText("Company Name"),
  customerName: requiredText("Customer Name"),
  email,
});

// SelectTerm: lease length in whole months (MIN_LEASE_MONTHS–MAX_LEASE_MONTHS) and how often the tenant
// pays — an INSTALLMENTS code ("12" Monthly, "4" Quarterly, "2" Half-Yearly, "1" Yearly).
export const selectTermSchema = z.object({
  termMonths: z
    .number()
    .int("Choose a whole number of months")
    .min(MIN_LEASE_MONTHS, `Choose at least ${MIN_LEASE_MONTHS} month`)
    .max(MAX_LEASE_MONTHS, `Choose up to ${MAX_LEASE_MONTHS} months`),
  paymentFrequency: requiredSelect("Payment frequency"),
});

export const renewalSchema = z.object({
  termMonths: z.number(),
  remark: z.string().trim().max(500, "Keep remarks under 500 characters"),
});
