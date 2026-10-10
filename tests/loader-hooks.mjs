// Node module hooks for the tests: the app's own files are ES modules with extensionless relative imports
// ("./httpClient"), which Metro resolves but Node doesn't. These hooks add ".js" and load app files as ES modules.
// Test tooling only — never bundled into the app.
const isRelative = (specifier) => specifier.startsWith("./") || specifier.startsWith("../");

// Set by register(…, { data }) — tests/register.mjs (fake live auth on) or tests/register-app.mjs (off: as in the app).
let fakeLiveAuth = false;
export function initialize(data) {
  fakeLiveAuth = data?.fakeLiveAuth === true;
}
const FAKE_LIVE_AUTH_URL = new URL("./fixtures/fakeLiveAuth.mjs", import.meta.url).href;

// TEST-ONLY: services/liveAuth.js (always "not verified" in the app) → the fake that verifies the sessions it issued.
function swapLiveAuth(resolved) {
  return fakeLiveAuth && /\/services\/liveAuth\.js$/.test(resolved.url) ? { ...resolved, url: FAKE_LIVE_AUTH_URL } : resolved;
}

export async function resolve(specifier, context, nextResolve) {
  if (isRelative(specifier) && !/\.[cm]?js$/.test(specifier)) {
    try {
      return swapLiveAuth(await nextResolve(`${specifier}.js`, context));
    } catch {
      // fall through to the default resolution (and its error)
    }
  }
  return swapLiveAuth(await nextResolve(specifier, context));
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && url.endsWith(".js") && !url.includes("/node_modules/")) {
    return nextLoad(url, { ...context, format: "module" });
  }
  return nextLoad(url, context);
}
