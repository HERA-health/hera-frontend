import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { usePaymentPolling } from "../usePaymentPolling";
import {
  GeneralRateLimitError,
  resetGeneralRateLimit,
} from "../../../services/generalRateLimit";

let mockFocused = true;
jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => mockFocused,
}));
let stateListener: ((state: AppStateStatus) => void) | undefined;
beforeEach(() => {
  jest.useFakeTimers();
  mockFocused = true;
  AppState.currentState = "active";
  resetGeneralRateLimit();
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_event, listener) => {
      stateListener = listener;
      return { remove: jest.fn() };
    });
});
afterEach(() => {
  jest.restoreAllMocks();
  resetGeneralRateLimit();
  jest.useRealTimers();
});
const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

it("retries a failed return reconciliation before resuming ordinary reads", async () => {
  const refresh = jest.fn(async (_reconcile?: boolean) => undefined);
  refresh.mockRejectedValueOnce(new Error("offline on return"));
  renderHook(() => usePaymentPolling(true, refresh, jest.fn()));
  await advance(0);
  await advance(5000);
  expect(refresh.mock.calls).toEqual([[true], [true]]);
  await advance(10000);
  expect(refresh).toHaveBeenLastCalledWith();
});

it("respects Retry-After when the return reconciliation is rate limited", async () => {
  const refresh = jest.fn(async (_reconcile?: boolean) => undefined);
  refresh.mockRejectedValueOnce(new GeneralRateLimitError(Date.now() + 60000));
  renderHook(() => usePaymentPolling(true, refresh, jest.fn()));
  await advance(0);
  await advance(5000);
  await advance(54999);
  expect(refresh).toHaveBeenCalledTimes(1);
  await advance(1);
  expect(refresh.mock.calls).toEqual([[true], [true]]);
});

it("polls for 30 minutes within the anonymous request budget without repeated reconciliation", async () => {
  const refresh = jest.fn(async (_reconcile?: boolean) => undefined),
    error = jest.fn();
  const view = renderHook(() => usePaymentPolling(true, refresh, error));
  await advance(5000);
  await advance(10000);
  await advance(20000);
  for (let i = 0; i < 60; i++) await advance(30000);
  expect(refresh.mock.calls.filter(([reconcile]) => reconcile)).toHaveLength(1);
  expect(refresh.mock.calls.length).toBeLessThan(70);
  expect(refresh.mock.calls.length).toBeGreaterThan(60);
  view.unmount();
  const calls = refresh.mock.calls.length;
  await advance(60000);
  expect(refresh).toHaveBeenCalledTimes(calls);
});

it("recovers from network errors and respects Retry-After before the next read", async () => {
  const refresh = jest.fn(async (_reconcile?: boolean) => undefined),
    error = jest.fn();
  renderHook(() => usePaymentPolling(true, refresh, error));
  await advance(0);
  refresh.mockRejectedValueOnce(new Error("offline"));
  await advance(5000);
  expect(error).toHaveBeenCalledTimes(1);
  await advance(10000);
  expect(refresh).toHaveBeenCalledTimes(3);
  refresh.mockRejectedValueOnce(new GeneralRateLimitError(Date.now() + 120000));
  await advance(20000);
  const count = refresh.mock.calls.length;
  await advance(99999);
  expect(refresh).toHaveBeenCalledTimes(count);
  await advance(1);
  expect(refresh).toHaveBeenCalledTimes(count + 1);
});

it("pauses in background and when unfocused, reconciles on return, and stops when work finishes", async () => {
  const refresh = jest.fn(async (_reconcile?: boolean) => undefined),
    error = jest.fn();
  const view = renderHook(
    ({ pending }: { pending: boolean }) =>
      usePaymentPolling(pending, refresh, error),
    { initialProps: { pending: true } },
  );
  await advance(0);
  await act(async () => {
    stateListener?.("background");
  });
  const count = refresh.mock.calls.length;
  await advance(60000);
  expect(refresh).toHaveBeenCalledTimes(count);
  await act(async () => {
    stateListener?.("active");
  });
  expect(refresh).toHaveBeenLastCalledWith(true);
  mockFocused = false;
  view.rerender({ pending: true });
  const paused = refresh.mock.calls.length;
  await advance(60000);
  expect(refresh).toHaveBeenCalledTimes(paused);
  mockFocused = true;
  view.rerender({ pending: false });
  await advance(0);
  const finished = refresh.mock.calls.length;
  await advance(60000);
  expect(refresh).toHaveBeenCalledTimes(finished);
});
