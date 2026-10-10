// Run by tests/live-config-boundary.test.mjs in a CHILD process loaded with tests/register-app.mjs — i.e. WITHOUT the
// fake live-auth swap, so every module (services/liveAuth.js included) is exactly what the app bundles. It tries every
// way it can to reach live customer data and prints a JSON report; the parent test asserts on it.
const requests = [];
globalThis.fetch = async (url) => {
  requests.push(String(url));
  throw new Error("blocked");
};

const report = { checks: [], requests };
const check = (name, ok, detail = null) => report.checks.push({ name, ok: Boolean(ok), detail });

const api = await import("../../services/api.js");
const auth = await import("../../services/authService.js");
const httpApi = await import("../../services/httpApi.js");
const { customerDataSource } = await import("../../services/customerService.js");
const { SERVICE_SOURCES } = await import("../../services/serviceConfig.js");
const liveAuth = await import("../../services/liveAuth.js");
const fake = await import("./fakeLiveAuth.mjs"); // only to prove it has NO effect without the test loader swap

auth.restoreDemoAccounts([]); // what AuthContext does at launch

// 1. The app's verifier verifies nothing.
const candidates = [null, {}, { token: "T", user: { customerId: 1, identity: "maz" } }, fake.issueVerifiedLiveSession({ token: "T", user: { customerId: 1 } })];
check("liveAuth verifies nothing", candidates.every((session) => liveAuth.isVerifiedLiveSession(session) === false));

// 2. Configuration can't be changed (and wouldn't matter).
let threw = false;
try {
  SERVICE_SOURCES.auth = "real";
} catch {
  threw = true;
}
check("SERVICE_SOURCES is frozen", Object.isFrozen(SERVICE_SOURCES) && threw && SERVICE_SOURCES.auth === "mock");

// 3. No session — demo tenant, New User, forged, or one the TEST fake "issued" — is live, and every live read refuses.
const liveReads = [
  () => httpApi.fetchCustomerContracts(),
  () => httpApi.fetchContract("CN-2026-00001"),
  () => httpApi.fetchBill("CN-2026-00001", "CN-2026-00001-1"),
  () => httpApi.fetchCustomer(),
  () => httpApi.fetchCustomer(1),
];
async function allRefused() {
  for (const read of liveReads) {
    try {
      await read();
      return false;
    } catch (error) {
      if (error?.code !== "NO_CUSTOMER") return false;
    }
  }
  return true;
}

const demo = await auth.logIn({ email: "probe.tenant@example.com", password: "x" });
const sessions = {
  "demo tenant": demo,
  "demo tenant relabelled maz": { ...demo, user: { ...demo.user, identity: "maz" } },
  "forged maz session": { token: "TKN", user: { email: "f@example.com", customerId: 3, identity: "maz", verified: true } },
  "session issued by the TEST fake (no swap here)": fake.issueVerifiedLiveSession({ token: "T", user: { email: "v@example.com", customerId: 1 } }),
};
for (const [name, session] of Object.entries(sessions)) {
  auth.setCurrentSession(session);
  check(`${name}: not live`, customerDataSource() !== "live", customerDataSource());
  check(`${name}: every live read refused`, await allRefused());
}

// 4. The demo tenant still works — on sample data.
auth.setCurrentSession(demo);
const contracts = await api.fetchContracts();
check("demo tenant sees its 3 sample contracts", contracts.length === 3 && contracts.every((contract) => contract.demo), contracts.map((c) => c.id));

check("no request reached the network", requests.length === 0, requests);
process.stdout.write(JSON.stringify(report));
