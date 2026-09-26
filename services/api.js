// The ONLY module screens import API functions from.
// Today every function is simulated in ./mockApi. To go live, add ./httpApi.js exporting the same
// function names (using fetch()) and change this line — or re-export individual functions from
// httpApi as each real endpoint becomes available. Screens need no changes.
export * from "./mockApi";
export { ApiError } from "./apiError";
