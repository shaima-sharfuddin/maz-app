// Like tests/register.mjs, but WITHOUT the fake live-auth swap: modules load exactly as in the app (services/liveAuth.js
// as written). Used by tests/live-config-boundary.test.mjs to check the app's own boundary in a child process.
import { register } from "node:module";

register("./loader-hooks.mjs", import.meta.url, { data: { fakeLiveAuth: false } });
