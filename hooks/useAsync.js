import { useCallback, useEffect, useState } from "react";

// Runs an async loader and tracks { loading, data, error }. `asyncFn` must be stable
// (a module-level function or a useCallback), or it will re-run on every render.
// When asyncFn changes (e.g. its useCallback deps change) or reload() is called, the previous
// result is treated as stale immediately, so callers never render old data against new inputs.
export default function useAsync(asyncFn) {
  const [attempt, setAttempt] = useState(0);
  // Remembers which loader + attempt the stored result belongs to.
  const [result, setResult] = useState({ fn: null, attempt: -1, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    asyncFn().then(
      (data) => !cancelled && setResult({ fn: asyncFn, attempt, data, error: null }),
      (error) => !cancelled && setResult({ fn: asyncFn, attempt, data: null, error })
    );
    return () => {
      cancelled = true;
    };
  }, [asyncFn, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const loading = result.fn !== asyncFn || result.attempt !== attempt;
  return {
    loading,
    data: loading ? null : result.data,
    error: loading ? null : result.error,
    reload,
  };
}
