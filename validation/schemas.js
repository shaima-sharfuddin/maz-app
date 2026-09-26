import { z } from "zod";

// Reusable field rules for every form in the app (used via hooks/useZodForm.js).
// Plain Zod, no React — so the same rules can later be shared with the backend.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BH_PHONE_RE = /^(\+973)?[136]\d{7}$/; // Bahrain: 8 digits starting 3/6 (mobile) or 1 (landline)
// Latin (incl. accented) and Arabic letters; explicit ranges rather than \p{L} for Hermes safety.
const NAME_RE = /^[A-Za-zÀ-ɏ؀-ۿ][A-Za-zÀ-ɏ؀-ۿ .'-]*$/;
const CR_RE = /^\d{1,6}-\d{1,3}$/; // e.g. 123456-1
const CPR_RE = /^\d{9}$/;
const VAT_RE = /^\d{15}$/; // Bahrain VAT account number

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

export const signUpSchema = z.object({
  fullName,
  email,
  phone,
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
  }),
});

export const submitRequestSchema = z.object({
  fullName,
  email,
  companyName: requiredText("Company Name"),
  activity: requiredSelect("Activity"),
  remark: z.string().trim().max(500, "Keep remarks under 500 characters"),
});
