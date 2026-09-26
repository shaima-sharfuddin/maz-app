import { useCallback, useRef, useState } from "react";

// Wraps an API call for a submit button: tracks loading, blocks double taps, and keeps the
// error message for ErrorBanner. submit() resolves to the result, or undefined if it failed.
export default function useSubmit(asyncFn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const submit = useCallback(
    async (...args) => {
      if (inFlight.current) return undefined;
      inFlight.current = true;
      setLoading(true);
      setError("");
      try {
        return await asyncFn(...args);
      } catch (e) {
        setError(e?.message || "Something went wrong. Please try again.");
        return undefined;
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [asyncFn]
  );

  const clearError = useCallback(() => setError(""), []);

  return { submit, loading, error, clearError };
}
