// useAsync's state rules (asyncState): previous data after a failed refresh, stale marking, no cross-loader leaks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { asyncState } from "../hooks/useAsync.js";

const loaderA = () => {};
const loaderB = () => {};
const settled = (fn, attempt, { data = null, error = null, lastData = data } = {}) => ({ fn, attempt, data, error, lastData });
const boom = new Error("refresh failed");

test("default (no options): unchanged behaviour — loading clears data, failure shows the error", () => {
  const ok = settled(loaderA, 0, { data: ["x"] });
  assert.deepEqual(asyncState(ok, { fn: loaderA, attempt: 0 }), { loading: false, data: ["x"], error: null, stale: false });
  assert.deepEqual(asyncState(ok, { fn: loaderA, attempt: 1 }), { loading: true, data: null, error: null, stale: false });
  const failed = settled(loaderA, 1, { error: boom, lastData: ["x"] });
  assert.deepEqual(asyncState(failed, { fn: loaderA, attempt: 1 }), { loading: false, data: null, error: boom, stale: false });
});

test("keepData: the last data stays visible while the same loader reloads", () => {
  const ok = settled(loaderA, 0, { data: ["x"] });
  assert.deepEqual(asyncState(ok, { fn: loaderA, attempt: 1 }, { keepData: true }), {
    loading: true,
    data: ["x"],
    error: null,
    stale: false,
  });
});

test("keepDataOnError: a failed refresh keeps the last good data, marked stale, with no error state", () => {
  const failed = settled(loaderA, 1, { error: boom, lastData: ["x"] });
  assert.deepEqual(asyncState(failed, { fn: loaderA, attempt: 1 }, { keepData: true, keepDataOnError: true }), {
    loading: false,
    data: ["x"],
    error: null,
    stale: true,
  });
  // retrying from the stale state: still shows the earlier data (marked stale) while loading
  assert.deepEqual(asyncState(failed, { fn: loaderA, attempt: 2 }, { keepData: true, keepDataOnError: true }), {
    loading: true,
    data: ["x"],
    error: null,
    stale: true,
  });
  // the retry succeeds → fresh, not stale
  const recovered = settled(loaderA, 2, { data: ["y"] });
  assert.deepEqual(asyncState(recovered, { fn: loaderA, attempt: 2 }, { keepData: true, keepDataOnError: true }), {
    loading: false,
    data: ["y"],
    error: null,
    stale: false,
  });
});

test("keepDataOnError with nothing loaded before → the normal error state", () => {
  const failed = settled(loaderA, 0, { error: boom, lastData: null });
  assert.deepEqual(asyncState(failed, { fn: loaderA, attempt: 0 }, { keepData: true, keepDataOnError: true }), {
    loading: false,
    data: null,
    error: boom,
    stale: false,
  });
});

test("a different loader (other params / another user) never inherits earlier data", () => {
  const okA = settled(loaderA, 0, { data: ["customer A"] });
  assert.deepEqual(asyncState(okA, { fn: loaderB, attempt: 0 }, { keepData: true, keepDataOnError: true }), {
    loading: true,
    data: null,
    error: null,
    stale: false,
  });
});
