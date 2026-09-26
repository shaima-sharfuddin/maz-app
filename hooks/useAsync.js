import { useCallback, useEffect, useState } from "react";

// Runs an async loader and tracks { loading, data, error }. `asyncFn` must be stable
// (a module-level function or a useCallback), or it will re-run on every render.
export default function useAsync(asyncFn) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    asyncFn().then(
      (data) => !cancelled && setState({ loading: false, data, error: null }),
      (error) => !cancelled && setState({ loading: false, data: null, error })
    );
    return () => {
      cancelled = true;
    };
  }, [asyncFn, attempt]);

  const reload = useCallback(() => {
    setState({ loading: true, data: null, error: null });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, reload };
}
