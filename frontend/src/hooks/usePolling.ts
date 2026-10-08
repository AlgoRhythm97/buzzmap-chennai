import { useEffect, useRef, useState } from 'react';

export const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 5000);

interface PollingState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  lastUpdated: Date | undefined;
}

/**
 * Calls `fetcher` now and then every `intervalMs`, keeping the last good data
 * when a refresh fails. Requests are aborted on unmount or when `deps` change,
 * and polling pauses while the browser tab is hidden.
 */
export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[] = [],
  intervalMs: number = POLL_INTERVAL_MS,
): PollingState<T> {
  const [state, setState] = useState<PollingState<T>>({
    data: undefined,
    error: undefined,
    loading: true,
    lastUpdated: undefined,
  });

  // Always call the latest fetcher without restarting the timer on every render
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let controller: AbortController | undefined;
    let cancelled = false;

    const tick = async () => {
      if (document.hidden) return;
      controller?.abort();
      controller = new AbortController();
      try {
        const data = await fetcherRef.current(controller.signal);
        if (!cancelled) setState({ data, error: undefined, loading: false, lastUpdated: new Date() });
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) return;
        setState((prev) => ({ ...prev, error: error as Error, loading: false }));
      }
    };

    setState((prev) => ({ ...prev, loading: true }));
    tick();
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);

    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return state;
}
