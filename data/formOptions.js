import { GENDER, OWNER_TYPE } from "./enums";

// Exact values from MAZ's admin "Create Customer" form.
export const COMPANIES = ["MAZ COMPANY", "MAZ BUSINESS CENTER INCUBATOR", "MAZ BUSINESS CENTER", "MAZ BDB"];

// Labels from the backend's GENDER enum ("m" → "Male", "f" → "Female"). The form stores the label;
// convert back to the code when profiles are POSTed to /customers.
export const GENDERS = Object.values(GENDER);

// New User sign-up (client feedback, 2026-10-07): a short GCC-focused list. Bahrain asks for a CPR number,
// every other choice for a passport number. Country names, unlike NATIONALITIES' demonyms below — the
// format the backend expects for nationality is still unconfirmed.
export const BAHRAIN = "Bahrain";
export const GCC_NATIONALITIES = [BAHRAIN, "Saudi Arabia", "UAE", "Kuwait", "Qatar", "Oman", "Other"];

// { value: code, label } from the backend's OwnerTypeEnum — the form stores the code ("o", "p" …),
// ready to send to the API as-is.
export const OWNER_TYPES = Object.entries(OWNER_TYPE).map(([value, label]) => ({ value, label }));

// PLACEHOLDER — SAMPLE Bahrain business activities for the New User sign-up's Activity field (Company step).
// Not MAZ's list: MAZ links activities to a contract by numeric id (contracts.activity_id, e.g. [145, 21]) and there
// is no endpoint to fetch the list yet. Replace with the real Activity list from the API once available.
export const ACTIVITIES = [
  "Management Consultancy",
  "Real Estate Activities",
  "Construction of Buildings",
  "Computer Programming & IT Consultancy",
  "Accounting & Auditing",
  "Advertising & Marketing",
  "General Trading",
  "Legal Activities",
];

export const NATIONALITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Argentine", "Armenian",
  "Australian", "Austrian", "Azerbaijani", "Bahamian", "Bahraini", "Bangladeshi", "Barbadian",
  "Belarusian", "Belgian", "Belizean", "Beninese", "Bhutanese", "Bolivian", "Bosnian", "Botswanan",
  "Brazilian", "British", "Bruneian", "Bulgarian", "Burkinabe", "Burmese", "Burundian", "Cambodian",
  "Cameroonian", "Canadian", "Cape Verdean", "Central African", "Chadian", "Chilean", "Chinese",
  "Colombian", "Comoran", "Congolese", "Costa Rican", "Croatian", "Cuban", "Cypriot", "Czech",
  "Danish", "Djiboutian", "Dominican", "Dutch", "Ecuadorian", "Egyptian", "Emirati",
  "Equatorial Guinean", "Eritrean", "Estonian", "Eswatini", "Ethiopian", "Fijian", "Filipino",
  "Finnish", "French", "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek", "Grenadian",
  "Guatemalan", "Guinean", "Guyanese", "Haitian", "Honduran", "Hungarian", "Icelandic", "Indian",
  "Indonesian", "Iranian", "Iraqi", "Irish", "Italian", "Ivorian", "Jamaican", "Japanese",
  "Jordanian", "Kazakh", "Kenyan", "Kuwaiti", "Kyrgyz", "Lao", "Latvian", "Lebanese", "Liberian",
  "Libyan", "Liechtensteiner", "Lithuanian", "Luxembourgish", "Malagasy", "Malawian", "Malaysian",
  "Maldivian", "Malian", "Maltese", "Mauritanian", "Mauritian", "Mexican", "Moldovan", "Monegasque",
  "Mongolian", "Montenegrin", "Moroccan", "Mozambican", "Namibian", "Nepalese", "New Zealander",
  "Nicaraguan", "Nigerian", "Nigerien", "North Korean", "North Macedonian", "Norwegian", "Omani",
  "Pakistani", "Palestinian", "Panamanian", "Papua New Guinean", "Paraguayan", "Peruvian", "Polish",
  "Portuguese", "Qatari", "Romanian", "Russian", "Rwandan", "Saudi", "Senegalese", "Serbian",
  "Seychellois", "Sierra Leonean", "Singaporean", "Slovak", "Slovenian", "Somali", "South African",
  "South Korean", "South Sudanese", "Spanish", "Sri Lankan", "Sudanese", "Surinamese", "Swedish",
  "Swiss", "Syrian", "Taiwanese", "Tajik", "Tanzanian", "Thai", "Togolese", "Tunisian", "Turkish",
  "Turkmen", "Ugandan", "Ukrainian", "Uruguayan", "Uzbek", "Venezuelan", "Vietnamese", "Yemeni",
  "Zambian", "Zimbabwean",
];

// PLACEHOLDER — support enquiry categories until MAZ confirms how enquiries are routed.
export const SUPPORT_CATEGORIES = [
  "Billing & payments",
  "Contract & renewal",
  "Facilities & maintenance",
  "Meeting rooms",
  "Violation query",
  "Other",
];
