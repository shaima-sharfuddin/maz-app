// Loaded with `node --import ./tests/register.mjs --test …` (npm test): installs the module hooks.
// fakeLiveAuth: swaps services/liveAuth.js for tests/fixtures/fakeLiveAuth.mjs so the LIVE API code can be tested with
// sessions the fake "issues". Only this test loader can do that — the app (Metro) never runs these hooks.
import { register } from "node:module";

register("./loader-hooks.mjs", import.meta.url, { data: { fakeLiveAuth: true } });
