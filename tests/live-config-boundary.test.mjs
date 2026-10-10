// The APP's own live-data boundary, checked in a child process loaded like the app (tests/register-app.mjs — no fake
// live-auth swap): services/liveAuth.js verifies nothing, SERVICE_SOURCES can't be changed, and no session — demo
// tenant, relabelled, forged, or even one the test fake "issued" — can make a live customer-data request. The demo
// tenant's sample data still works. See tests/fixtures/appBoundaryProbe.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("in the app (no test swap), nothing can unlock live customer data — and no request is made", () => {
  const output = execFileSync(process.execPath, ["--import", "./tests/register-app.mjs", "./tests/fixtures/appBoundaryProbe.mjs"], {
    cwd: root,
    encoding: "utf8",
    timeout: 60000,
  });
  const report = JSON.parse(output);
  assert.ok(report.checks.length >= 10, "the probe ran all its checks");
  for (const { name, ok, detail } of report.checks) assert.ok(ok, `${name}${detail ? ` — ${JSON.stringify(detail)}` : ""}`);
  assert.deepEqual(report.requests, []);
});

test("no app file can reach the test-only fake verifier, and the app's verifier answers a constant false", async () => {
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const appDirs = ["App.js", "index.js", "auth", "components", "data", "demo", "hooks", "screens", "services", "theme", "utils", "validation"];
  const files = [];
  const walk = (path) => {
    if (statSync(path).isDirectory()) readdirSync(path).forEach((name) => walk(join(path, name)));
    else if (/\.(js|jsx|mjs)$/.test(path)) files.push(path);
  };
  appDirs.forEach((dir) => walk(join(root, dir)));
  assert.ok(files.length > 50);
  for (const file of files) {
    const code = readFileSync(file, "utf8");
    // Imports only (static, dynamic, require) — comments may mention the test files.
    const imports = code.match(/(?:from\s*|import\s*\(\s*|require\s*\(\s*|^import\s*)["'][^"']+["']/gm) ?? [];
    for (const specifier of imports) {
      assert.doesNotMatch(specifier, /fakeLiveAuth|fixtures|tests\/|loader-hooks|register/, `${file} must not import test-only code`);
    }
  }
  const liveAuth = readFileSync(join(root, "services", "liveAuth.js"), "utf8");
  assert.match(liveAuth, /export function isVerifiedLiveSession\(\) \{\s*return false;\s*\}/);
});
