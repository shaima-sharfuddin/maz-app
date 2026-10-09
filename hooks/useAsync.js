import { useCallback, useEffect, useState } from "react";

// What the hook returns for a given stored result. Pure (no React), so the rules can be tested on their own.
//   result:  { fn, attempt, data, error, lastData } — the last settled load (lastData = the last SUCCESSFUL data of
//            this loader, kept across failures)
//   current: { fn, attempt } — the load the screen is waiting for now
// keepData        — while reload() of the SAME loader runs, the last data stays visible (no skeleton flash).
// keepDataOnError — if that reload FAILS, the last successful data stays visible with stale: true and no error,
//                   so the screen can say "showing earlier information". Only for read-only data: a screen must
//                   never act (pay, renew …) on stale data, so screens with such actions don't opt in.
// A different loader (e.g. other params or another user) never inherits data: everything starts fresh.
export function asyncState(result, current, { keepData = false, keepDataOnError = false } = {}) {
  const sameLoader = result.fn === current.fn;
  const loading = !sameLoader || result.attempt !== current.attempt;
  if (loading) {
    const keep = keepData && sameLoader;
    const keptData = keep ? (result.data ?? (keepDataOnError ? result.lastData : null)) : null;
    return { loading: true, data: keptData ?? null, error: null, stale: Boolean(keep && result.error && keptData) };
  }
  if (result.error && keepDataOnError && result.lastData != null) {
    return { loading: false, data: result.lastData, error: null, stale: true };
  }
  return { loading: false, data: result.data, error: result.error, stale: false };
}

// Runs an async loader and tracks { loading, data, error, stale }. `asyncFn` must be stable
// (a module-level function or a useCallback), or it will re-run on every render.
// When asyncFn changes (e.g. its useCallback deps change) or reload() is called, the previous
// result is treated as stale immediately, so callers never render old data against new inputs.
// Options (see asyncState): { keepData: true } keeps the last data visible during a reload of the same loader;
// { keepDataOnError: true } also keeps the last successful data if that reload fails (stale: true).
export default function useAsync(asyncFn, options) {
  const [attempt, setAttempt] = useState(0);
  // Remembers which loader + attempt the stored result belongs to.
  const [result, setResult] = useState({ fn: null, attempt: -1, data: null, error: null, lastData: null });

  useEffect(() => {
    let cancelled = false;
    asyncFn().then(
      (data) => !cancelled && setResult({ fn: asyncFn, attempt, data, error: null, lastData: data }),
      (error) =>
        !cancelled &&
        setResult((previous) => ({
          fn: asyncFn,
          attempt,
          data: null,
          error,
          // Only this loader's own last success is remembered — never another loader's (other user / params).
          lastData: previous.fn === asyncFn ? previous.lastData : null,
        }))
    );
    return () => {
      cancelled = true;
    };
  }, [asyncFn, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...asyncState(result, { fn: asyncFn, attempt }, options), reload };
}
