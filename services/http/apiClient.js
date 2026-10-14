import axios, { isCancel } from "axios";
import { ApiError } from "../apiError";
import { ERROR_MESSAGES } from "../errorMessages";

// Transport for the real MAZ backend (Laravel), built on axios. Only the services use it — screens never do.
// Reads (get / getAllPages) plus post(), used only by: the MAZ login / logout (services/mazAuth.js), the New User
// enquiry (POST /enquiries) and customer record (POST /customers) — both switched off by default
// (services/serviceConfig.js). No PUT / PATCH / DELETE.
//
// Every request carries "Authorization: Bearer <token>" for the signed-in MAZ session (services/authService.js plugs
// in the token), except the login itself ({ skipAuth: true }).

export const API_BASE_URL = "https://maz.beeinfosoft.com/public/api";
const API_ORIGIN = API_BASE_URL.match(/^https:\/\/[^/]+/)[0]; // "https://maz.beeinfosoft.com"
const REQUEST_TIMEOUT_MS = 15000;
export const MAX_PAGES = 50; // a list longer than this is treated as a broken pagination response

// Every failure becomes an ApiError with a FIXED, friendly message (services/errorMessages.js). The server runs with
// debug output on, so its error bodies (stack traces, file paths) are never shown.
//   NETWORK          — couldn't connect (offline, DNS, connection refused)
//   TIMEOUT          — no complete answer within REQUEST_TIMEOUT_MS
//   BAD_REQUEST      — 400 / 422 (to a GET) and other unexpected 4xx
//   UNAUTHORIZED     — 401 for a request that carried a session token → the app signs out
//   NOT_AUTHORIZED   — 401 for a request without a token (signed out) → no sign-out
//   FORBIDDEN        — 403
//   NOT_FOUND        — 404
//   RATE_LIMITED     — 429
//   SERVER           — 5xx (and any other non-success status)
//   INVALID_RESPONSE — empty / malformed / unexpected body, or an unsafe pagination link
//   VALIDATION       — 422 to a POST: MAZ rejected some fields. error.fields lists their names (from Laravel's
//                      { errors: { field: [...] } }); the server's wording is never shown
const failure = (code) => new ApiError(code, ERROR_MESSAGES[code]);

// The status → ApiError mapping and JSON parsing are ours, not axios's: every status resolves (validateStatus) and the
// body arrives as raw text (no transformResponse), so an empty 200 or an HTML page is caught as INVALID_RESPONSE.
// eslint-disable-next-line import/no-named-as-default-member -- axios.create is the documented API
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
  responseType: "text",
  transformResponse: [(data) => data],
  validateStatus: () => true,
});

// Auth hooks, set by services/authService.js — plugged-in functions so this transport never imports the auth layer.
// - getAuthToken() → the session token to send as "Authorization: Bearer …", or null when signed out.
// - onUnauthorized() → called when MAZ answers 401 to a request that carried a token (expired / revoked session),
//   so the app can sign out. A 401 without a token can't mean the session expired.
let getAuthToken = () => null;
let onUnauthorized = () => {};
export function setAuthTokenProvider(provider) {
  getAuthToken = provider;
}
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

apiClient.interceptors.request.use((config) => {
  const token = config.skipAuth ? null : getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function statusFailure(status, sentToken, { skipUnauthorizedHandler = false } = {}) {
  if (status === 401) {
    if (sentToken) {
      if (!skipUnauthorizedHandler) onUnauthorized();
      return failure("UNAUTHORIZED");
    }
    return failure("NOT_AUTHORIZED");
  }
  if (status === 403) return failure("FORBIDDEN");
  if (status === 404) return failure("NOT_FOUND");
  if (status === 429) return failure("RATE_LIMITED");
  if (status >= 400 && status < 500) return failure("BAD_REQUEST");
  return failure("SERVER");
}

// One request → { status, text, sentToken }. The timer covers the whole answer, body included; an abort is a TIMEOUT,
// anything else without an answer a NETWORK failure.
async function send(config) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const sentToken = !config.skipAuth && Boolean(getAuthToken());
  try {
    const response = await apiClient.request({ ...config, signal: controller.signal });
    return { status: response.status, text: typeof response.data === "string" ? response.data : "", sentToken };
  } catch (error) {
    const timedOut = controller.signal.aborted || isCancel(error) || error?.name === "AbortError";
    throw failure(timedOut ? "TIMEOUT" : "NETWORK");
  } finally {
    clearTimeout(timer);
  }
}

const isOk = (status) => status >= 200 && status < 300;

// GET a path ("/contracts") or a full URL (a pagination link) → parsed JSON.
export async function get(pathOrUrl) {
  const { status, text, sentToken } = await send({ method: "get", url: pathOrUrl });
  if (!isOk(status)) throw statusFailure(status, sentToken);
  if (!text || !text.trim()) throw failure("INVALID_RESPONSE"); // e.g. an empty 200
  try {
    return JSON.parse(text);
  } catch {
    throw failure("INVALID_RESPONSE"); // malformed JSON, an HTML page …
  }
}

// POST a JSON body to a path ("/enquiries") → the parsed JSON answer, or null when MAZ answers 2xx with no body
// (the 2xx status itself is MAZ's confirmation). Unlike get(), a TIMEOUT here is ambiguous: MAZ may still have saved
// the record, so callers must not resend automatically.
// options: skipAuth (send no token — the login) · skipUnauthorizedHandler (a 401 doesn't sign out — the logout).
export async function post(path, body, { skipAuth = false, skipUnauthorizedHandler = false } = {}) {
  const { status, text, sentToken } = await send({
    method: "post",
    url: path,
    data: JSON.stringify(body ?? {}),
    headers: { "Content-Type": "application/json" },
    skipAuth,
  });

  if (status === 422) {
    const error = failure("VALIDATION");
    try {
      error.fields = Object.keys(JSON.parse(text)?.errors ?? {});
    } catch {
      error.fields = [];
    }
    throw error;
  }
  if (!isOk(status)) throw statusFailure(status, sentToken, { skipUnauthorizedHandler });
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw failure("INVALID_RESPONSE"); // a 2xx HTML page is not a confirmation
  }
}

// A pagination link is followed only if it's on the configured MAZ API (same https host).
const isSafeApiUrl = (url) => typeof url === "string" && url.startsWith(`${API_ORIGIN}/`);

// Every item of a list endpoint. Laravel paginates with { data, links: { next } }; follows `next`
// until it runs out. Unpaginated lists ({ data } only, e.g. /units) come back in one request.
// Guards: at most MAX_PAGES pages, never the same page twice, and only links on the MAZ API host — anything else
// stops with INVALID_RESPONSE instead of looping or calling another server.
export async function getAllPages(path) {
  const items = [];
  const seen = new Set();
  let next = path;
  while (next) {
    const key = next.startsWith("http") ? next : `${API_BASE_URL}${next}`;
    if (seen.has(key) || seen.size >= MAX_PAGES) throw failure("INVALID_RESPONSE");
    seen.add(key);
    const page = await get(next);
    if (!Array.isArray(page?.data)) throw failure("INVALID_RESPONSE");
    items.push(...page.data);
    const link = page.links?.next ?? null;
    if (link != null && !isSafeApiUrl(link)) throw failure("INVALID_RESPONSE");
    next = link;
  }
  return items;
}
