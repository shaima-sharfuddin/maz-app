// REAL MAZ login (services/mazAuth.js) over the axios transport (services/http/apiClient.js): the request MAZ gets,
// the session the app keeps, the Bearer token on every later request, and the failure cases. Fake fetch only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { api, auth, json, status, networkDown, setRoutes, requests, resetCalls, loginBody, rejectionOf } from "./helpers.mjs";
import * as apiClient from "../services/http/apiClient.js";
import { customerDataSource } from "../services/customerService.js";
import { ERROR_MESSAGES } from "../services/errorMessages.js";

const header = (request, name) =>
  Object.entries(request.headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];

test("login: one JSON POST /login { username, password } with no Authorization header", async () => {
  auth.setCurrentSession(null);
  resetCalls();
  setRoutes({ "/login": json(loginBody({ customerId: null, token: "1|abc", username: "sara@example.com", name: "Sara" })) });
  await api.logIn({ email: "  sara@example.com ", password: "pw-123" });

  assert.equal(requests.length, 1);
  const [request] = requests;
  assert.equal(request.path, "/login");
  assert.equal(request.method, "POST");
  assert.match(header(request, "Content-Type"), /application\/json/);
  assert.deepEqual(JSON.parse(request.body), { username: "sara@example.com", password: "pw-123" });
  assert.equal(header(request, "Authorization"), undefined, "the login never carries a token");
});

test("login maps MAZ's answer into the session (customer_id null → New User)", async () => {
  setRoutes({ "/login": json(loginBody({ customerId: null, token: "1|abc", username: "sara@example.com", name: "Sara" })) });
  const session = await api.logIn({ email: "sara@example.com", password: "pw" });
  assert.equal(session.token, "1|abc");
  assert.equal(session.user.email, "sara@example.com");
  assert.equal(session.user.name, "Sara");
  assert.equal(session.user.customerId, null);
  assert.equal(session.user.identity, "maz");
  assert.ok(Object.isFrozen(session), "issued sessions are frozen");

  auth.setCurrentSession(session);
  assert.equal(customerDataSource(), null);
  await assert.rejects(api.fetchContracts(), { code: "NO_CUSTOMER" });
});

test("a customer login keeps the id as text and loads that customer's data with the Bearer token", async () => {
  setRoutes({ "/login": json(loginBody({ customerId: 1, token: "2|tok" })) });
  const session = await api.logIn({ email: "live@example.com", password: "pw" });
  assert.equal(session.user.customerId, "1");
  auth.setCurrentSession(session);
  assert.equal(customerDataSource(), "live");

  setRoutes({});
  resetCalls();
  await api.fetchContracts();
  const contractRequests = requests.filter((request) => request.path.startsWith("/contracts"));
  assert.ok(contractRequests.length > 0);
  for (const request of requests) assert.equal(header(request, "Authorization"), "Bearer 2|tok", request.path);
});

test("wrong credentials (MAZ answers 422) → INVALID_CREDENTIALS, never the server's text", async () => {
  auth.setCurrentSession(null);
  setRoutes({
    "/login": json(JSON.stringify({ message: "Invalid username or password", errors: { username: ["Invalid username or password"] } }), 422),
  });
  const error = await rejectionOf(api.logIn({ email: "sara@example.com", password: "nope" }));
  assert.equal(error?.code, "INVALID_CREDENTIALS");
  assert.equal(error.message, ERROR_MESSAGES.INVALID_CREDENTIALS);
});

test("a 401 to the login is wrong credentials too — and doesn't fire the session-expired sign-out", async () => {
  let signOuts = 0;
  apiClient.setUnauthorizedHandler(() => signOuts++);
  auth.setCurrentSession(null);
  setRoutes({ "/login": status(401) });
  const error = await rejectionOf(api.logIn({ email: "sara@example.com", password: "nope" }));
  assert.equal(error?.code, "INVALID_CREDENTIALS");
  assert.equal(signOuts, 0);
});

test("a 2xx login without a token or user → INVALID_RESPONSE (no guessed session)", async () => {
  for (const body of ['{"message":"Login successful"}', '{"token":"","user":{}}', '{"token":"x"}', "<html>ok</html>"]) {
    setRoutes({ "/login": json(body) });
    const error = await rejectionOf(api.logIn({ email: "sara@example.com", password: "pw" }));
    assert.equal(error?.code, "INVALID_RESPONSE", body);
  }
});

test("server / network failures keep their own codes", async () => {
  setRoutes({ "/login": status(500) });
  assert.equal((await rejectionOf(api.logIn({ email: "a@example.com", password: "pw" })))?.code, "SERVER");
  setRoutes({ "/login": networkDown() });
  assert.equal((await rejectionOf(api.logIn({ email: "a@example.com", password: "pw" })))?.code, "NETWORK");
});

test("logout: POST /logout with the session's token; never rejects, even on 401 or a network failure", async () => {
  setRoutes({ "/login": json(loginBody({ customerId: 1, token: "3|bye" })) });
  auth.setCurrentSession(await api.logIn({ email: "live@example.com", password: "pw" }));
  let signOuts = 0;
  apiClient.setUnauthorizedHandler(() => signOuts++);

  for (const route of [json('{"message":"Logged out"}'), status(401), networkDown()]) {
    setRoutes({ "/logout": route });
    resetCalls();
    assert.deepEqual(await api.logOut(), { loggedOut: true });
    assert.equal(requests[0].path, "/logout");
    assert.equal(requests[0].method, "POST");
    assert.equal(header(requests[0], "Authorization"), "Bearer 3|bye");
  }
  assert.equal(signOuts, 0, "a 401 on logout doesn't trigger the session-expired handler");
});
