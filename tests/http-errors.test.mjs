// HTTP error classification, safe messages, timeout, invalid responses and pagination guards.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { api, contract, setRoutes, status, json, networkDown, calls, resetCalls, callsTo, loginExistingUser, rejectionOf } from "./helpers.mjs";
import * as httpClient from "../services/httpClient.js";
import { ERROR_MESSAGES } from "../services/errorMessages.js";

const API = "https://maz.beeinfosoft.com/public/api";

async function contractsFailure(route) {
  await loginExistingUser(); // new session → the contracts cache can't answer
  setRoutes({ "/contracts": route });
  return rejectionOf(api.fetchContracts());
}

const expectations = [
  [400, "BAD_REQUEST"],
  [404, "NOT_FOUND"],
  [403, "FORBIDDEN"],
  [422, "BAD_REQUEST"],
  [429, "RATE_LIMITED"],
  [500, "SERVER"],
  [503, "SERVER"],
];
for (const [code, expected] of expectations) {
  test(`HTTP ${code} → ${expected} with a fixed, safe message`, async () => {
    const error = await contractsFailure(status(code));
    assert.equal(error?.code, expected);
    assert.equal(error.message, ERROR_MESSAGES[expected]);
    assert.doesNotMatch(error.message, /stack|var\/www|Controllers|Whoops/i, "server body must never reach the user");
  });
}

test("HTTP 401 without a token (mock auth) → NOT_AUTHORIZED and NO sign-out", async () => {
  let signOuts = 0;
  httpClient.setUnauthorizedHandler(() => signOuts++);
  const error = await contractsFailure(status(401));
  assert.equal(error?.code, "NOT_AUTHORIZED");
  assert.equal(signOuts, 0);
});

test("HTTP 401 with a real token → UNAUTHORIZED and the sign-out handler runs", async () => {
  let signOuts = 0;
  httpClient.setUnauthorizedHandler(() => signOuts++);
  httpClient.setAuthTokenProvider(() => "real-token");
  try {
    const error = await contractsFailure(status(401));
    assert.equal(error?.code, "UNAUTHORIZED");
    assert.equal(signOuts, 1);
  } finally {
    httpClient.setAuthTokenProvider(() => null); // auth is mock: no token is ever sent
  }
});

test("network failure → NETWORK", async () => {
  const error = await contractsFailure(networkDown());
  assert.equal(error?.code, "NETWORK");
  assert.equal(error.message, ERROR_MESSAGES.NETWORK);
});

test("no answer within 15 s → TIMEOUT (request aborted)", async () => {
  await loginExistingUser();
  let aborted = false;
  setRoutes({
    "/contracts": (_path, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          aborted = true;
          reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
        });
      }),
  });
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const pending = rejectionOf(api.fetchContracts());
    await new Promise((resolve) => setImmediate(resolve)); // let the request start
    mock.timers.tick(14999);
    assert.equal(aborted, false, "not before 15 s");
    mock.timers.tick(1);
    const error = await pending;
    assert.equal(aborted, true);
    assert.equal(error?.code, "TIMEOUT");
  } finally {
    mock.timers.reset();
  }
});

const invalidBodies = {
  "empty body": "",
  "whitespace body": "   ",
  "malformed JSON": '{"data": [',
  "an HTML page": "<html>Maintenance</html>",
  "no data key": "{}",
  "data is not a list": '{"data": {}}',
};
for (const [name, body] of Object.entries(invalidBodies)) {
  test(`200 with ${name} → INVALID_RESPONSE`, async () => {
    const error = await contractsFailure(json(body));
    assert.equal(error?.code, "INVALID_RESPONSE");
    assert.equal(error.message, ERROR_MESSAGES.INVALID_RESPONSE);
  });
}

test("a single-record request with an empty body → INVALID_RESPONSE", async () => {
  await loginExistingUser();
  setRoutes({ "/customers": json("") });
  const error = await rejectionOf(api.fetchTenantName());
  assert.equal(error?.code, "INVALID_RESPONSE");
});

test("a valid empty list is not an error", async () => {
  await loginExistingUser();
  setRoutes({ "/contracts": json('{"data": [], "links": {"next": null}}') });
  const list = await api.fetchContracts();
  assert.equal(list.filter((c) => !c.demo).length, 0);
});

test("pagination: a repeated page URL stops with INVALID_RESPONSE (no loop)", async () => {
  await loginExistingUser();
  resetCalls();
  setRoutes({ "/contracts": json(JSON.stringify({ data: [], links: { next: `${API}/contracts` } })) });
  const error = await rejectionOf(api.fetchContracts());
  assert.equal(error?.code, "INVALID_RESPONSE");
  assert.equal(callsTo("/contracts"), 1);
});

test(`pagination: stops after MAX_PAGES (${httpClient.MAX_PAGES}) pages`, async () => {
  await loginExistingUser();
  resetCalls();
  setRoutes({
    "/contracts": (path) => {
      const page = Number(new URL(`${API}${path}`).searchParams.get("page") ?? 1);
      return json(JSON.stringify({ data: [], links: { next: `${API}/contracts?page=${page + 1}` } }))();
    },
  });
  const error = await rejectionOf(api.fetchContracts());
  assert.equal(error?.code, "INVALID_RESPONSE");
  assert.equal(callsTo("/contracts"), httpClient.MAX_PAGES);
});

test("pagination: never follows a link to another host, or to plain http", async () => {
  for (const next of ["https://evil.example.com/api/contracts?page=2", "http://maz.beeinfosoft.com/public/api/contracts?page=2", "javascript:alert(1)"]) {
    await loginExistingUser();
    resetCalls();
    setRoutes({ "/contracts": json(JSON.stringify({ data: [], links: { next } })) });
    const error = await rejectionOf(api.fetchContracts());
    assert.equal(error?.code, "INVALID_RESPONSE", next);
    assert.equal(calls.length, 1, `nothing requested from ${next}`);
  }
});

test("pagination: a proper second page is followed and merged", async () => {
  await loginExistingUser();
  setRoutes({
    "/contracts?page=2": json(JSON.stringify({ data: [contract({ id: 7, name: "CN-PAGE-2", receipts: [] })], links: { next: null } })),
    "/contracts": json(JSON.stringify({ data: [], links: { next: `${API}/contracts?page=2` } })),
  });
  const list = await api.fetchContracts();
  assert.deepEqual(
    list.filter((c) => !c.demo).map((c) => c.id),
    ["CN-PAGE-2"]
  );
});

test("errorMessage(): ApiError messages pass through; other errors get a generic sentence", async () => {
  const error = await contractsFailure(status(503));
  assert.equal(api.errorMessage(error), ERROR_MESSAGES.SERVER);
  assert.equal(api.errorMessage(new TypeError("undefined is not an object (evaluating 'x.y')")), "Something went wrong. Please try again.");
  assert.equal(api.errorMessage(null), "Something went wrong. Please try again.");
});
