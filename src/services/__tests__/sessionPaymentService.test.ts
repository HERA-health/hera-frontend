jest.mock("@react-native-async-storage/async-storage", () => ({ removeItem: jest.fn() }));
import AsyncStorage from "@react-native-async-storage/async-storage";
jest.mock("../api", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));
jest.mock("../heraCommissionService", () => ({
  durableCommandKey: jest.fn(async () => ({ commandKey: "stable-command", storageKey: "pending-refund" })),
}));
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(async () => "scoped-secret"),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device",
}));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));
import { api } from "../api";
import {
  getPayment,
  refundPayment,
  openCheckout,
  verifyPaymentAccess,
} from "../sessionPaymentService";
import { setItemAsync } from "expo-secure-store";

beforeEach(() => {
  jest.clearAllMocks();
});
it("sends limited guest access in a header and never in the URL", async () => {
  jest.mocked(api.get).mockResolvedValue({ data: { id: "reservation" } });
  expect(await getPayment("reservation", true)).toEqual({ id: "reservation" });
  expect(api.get).toHaveBeenCalledWith("/session-payments/guest/reservation", {
    headers: { "X-Hera-Payment-Access": "scoped-secret" },
  });
});
it("authenticated recovery uses server ownership and does not attach guest access", async () => {
  jest.mocked(api.post).mockResolvedValue({ data: { status: "PROCESSING" } });
  await getPayment("reservation", false, true);
  expect(api.post).toHaveBeenCalledWith(
    "/session-payments/reservation/reconcile",
    {},
    { headers: undefined },
  );
});
it("refund retries retain the durable command after a timeout and consume it only after success", async () => {
  jest.mocked(api.post).mockRejectedValueOnce(new Error("timeout"));
  await expect(refundPayment("reservation", 1250, "Ajuste acordado")).rejects.toThrow("timeout");
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  jest.mocked(api.post).mockResolvedValueOnce({data:{id:"refund"}});
  await refundPayment("reservation", 1250, "Ajuste acordado");
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith("pending-refund");
  expect(api.post).toHaveBeenLastCalledWith(
    "/session-payments/reservation/refunds",
    {
      amountCents: 1250,
      reason: "Ajuste acordado",
      commandKey: "stable-command",
    },
  );
});
it("rejects unexpected checkout hosts", async () => {
  await expect(
    openCheckout("https://checkout.stripe.com.attacker.invalid"),
  ).rejects.toThrow();
  await expect(openCheckout("http://checkout.stripe.com")).rejects.toThrow();
});
it("renewed guest access is persisted without navigating or paying", async () => {
  jest
    .mocked(api.post)
    .mockResolvedValue({ data: { accessToken: "renewed-secret" } });
  await verifyPaymentAccess("reservation", "123456");
  expect(setItemAsync).toHaveBeenCalledWith(
    "hera_payment_reservation",
    "renewed-secret",
    { keychainAccessible: "device" },
  );
  expect(api.post).toHaveBeenCalledTimes(1);
});
