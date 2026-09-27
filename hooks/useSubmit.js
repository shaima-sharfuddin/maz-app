import { useCallback, useRef, useState } from "react";

// Wraps an API call for a submit button: tracks loading, blocks double taps, and keeps the
// error for ErrorBanner. submit() resolves to the result, or undefined if it failed.
// `errorCode` is the ApiError code (e.g. "INVALID_CREDENTIALS") for screens that react to specific errors.
export default function useSubmit(asyncFn) {
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState({ message: "", code: null });
  const inFlight = useRef(false);

  const submit = useCallback(
    async (...args) => {
      if (inFlight.current) return undefined;
      inFlight.current = true;
      setLoading(true);
      setFailure({ message: "", code: null });
      try {
        return await asyncFn(...args);
      } catch (e) {
        setFailure({ message: e?.message || "Something went wrong. Please try again.", code: e?.code ?? null });
        return undefined;
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [asyncFn]
  );

  const clearError = useCallback(() => setFailure({ message: "", code: null }), []);

  return { submit, loading, error: failure.message, errorCode: failure.code, clearError };
}
