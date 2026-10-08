import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import {
  GeneralRateLimitError,
  getGeneralRateLimitRetryAt,
} from "../../services/generalRateLimit";

// Reads only. Reconciliation is reserved for explicit refresh and returning to the app.
export function usePaymentPolling(
  pending: boolean,
  refresh: (reconcile?: boolean) => Promise<void>,
  onError: (error: unknown) => void,
) {
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === "active");
  const report = useRef(onError);
  const reconciliation = useRef({ needed: false, retryAt: 0 });
  report.current = onError;
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!focused || !active) return;
    const attempt = { needed: false, retryAt: 0 };
    reconciliation.current = attempt;
    void refresh(true)
      .then(() => {
        attempt.needed = false;
      })
      .catch((error: unknown) => {
        attempt.needed = true;
        if (error instanceof GeneralRateLimitError)
          attempt.retryAt = error.retryAt;
        report.current(error);
      });
  }, [focused, active, refresh]);
  useEffect(() => {
    if (!pending || !focused || !active) return;
    let stopped = false;
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (retryAt = 0) => {
      const delay = Math.max(
        [5000, 10000, 20000, 30000][Math.min(step++, 3)],
        retryAt - Date.now(),
        getGeneralRateLimitRetryAt() - Date.now(),
      );
      timer = setTimeout(() => {
        void tick();
      }, delay);
    };
    const tick = async () => {
      let retryAt = 0;
      const attempt = reconciliation.current;
      if (attempt.needed && attempt.retryAt > Date.now()) {
        schedule(attempt.retryAt);
        return;
      }
      try {
        if (attempt.needed) {
          await refresh(true);
          attempt.needed = false;
        } else await refresh();
      } catch (error) {
        if (!stopped) report.current(error);
        if (error instanceof GeneralRateLimitError) retryAt = error.retryAt;
      }
      if (!stopped) schedule(retryAt);
    };
    schedule();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [pending, focused, active, refresh]);
}
