import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { api } from "./api";
import { durableCommandKey } from "./heraCommissionService";

export interface PaymentAcceptance {
  termsVersion: string;
  country: string;
  billing?: {
    fiscalName: string;
    fiscalTaxId: string;
    fiscalAddress: string;
    fiscalPostalCode: string;
    fiscalCity: string;
    fiscalCountry: string;
  };
}
export interface PaymentRequired {
  kind: "payment";
  id: string;
  bookingId: string;
  status: string;
  expiresAt: string;
  checkoutUrl: string | null;
  accessToken?: string;
}
export interface PaymentAccount {
  available: boolean;
  termsVersion: string;
  enabled: boolean;
  hasAccount: boolean;
  status: "DISABLED" | "ATTENTION" | "ACTIVE" | "ONBOARDING" | "REVIEW";
  requirements: string[];
  syncedAt: string | null;
}
export interface SessionPayment {
  id: string;
  sessionId: string | null;
  status: string;
  sessionStatus: string | null;
  date: string;
  expiresAt: string;
  acceptanceDeadline: string | null;
  totalCents: number;
  currency: string;
  paidAt: string | null;
  specialistName: string;
  patientName?: string;
  feeCents?: number | null;
  netCents: number | null;
  refundedCents: number;
  disputeSettledCents: number;
  operationsPending: boolean;
  refundableCents: number;
  cancellationRefundCents: number;
  checkoutUrl: string | null;
  refunds: {
    id: string;
    amountCents: number;
    status: string;
    createdAt: string;
    reason: string;
  }[];
  documents: {
    id: string;
    invoiceNumber: string;
    documentPurpose: string;
    totalCents: number;
  }[];
  issues: { kind: string; errorCode: string | null }[];
  issueCode: string | null;
  dispute: { status: string; deadline: string | null } | null;
  canCancel: boolean;
  canRefund: boolean;
  canAccept: boolean;
}
export const paymentAmount = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
export const paymentStatus = (status: string) =>
  ({
    PREPARING: "Preparando el pago",
    CHECKOUT: "Pendiente de pago",
    PROCESSING: "Comprobando el pago",
    AWAITING_ACCEPTANCE: "Pagada · pendiente de aceptación",
    CONFIRMED: "Cita confirmada",
    CANCELLED: "Reserva cancelada",
    CANCELLING: "Cancelación en curso",
    EXPIRED: "Pago caducado",
  })[status] ?? status;
const accessKey = (id: string) => `hera_payment_${id}`;
export async function storePaymentAccess(id: string, token: string) {
  if (Platform.OS === "web") sessionStorage.setItem(accessKey(id), token);
  else
    await SecureStore.setItemAsync(accessKey(id), token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
}
async function paymentAccess(id: string, guest: boolean) {
  const token = guest
    ? Platform.OS === "web"
      ? sessionStorage.getItem(accessKey(id))
      : await SecureStore.getItemAsync(accessKey(id))
    : null;
  return {
    path: `/session-payments/${guest ? "guest/" : ""}${encodeURIComponent(id)}`,
    headers: token ? { "X-Hera-Payment-Access": token } : undefined,
  };
}
export async function getPayment(
  id: string,
  guest: boolean,
  reconcile = false,
): Promise<SessionPayment> {
  const { path, headers } = await paymentAccess(id, guest);
  return (
    reconcile
      ? await api.post(`${path}/reconcile`, {}, { headers })
      : await api.get(path, { headers })
  ).data;
}
export async function cancelPayment(
  id: string,
  guest: boolean,
  expectedRefundCents: number,
) {
  const { path, headers } = await paymentAccess(id, guest);
  return (
    await api.post<SessionPayment>(
      `${path}/cancel`,
      { expectedRefundCents },
      { headers },
    )
  ).data;
}
export const listPayments = async (page = 0) =>
  (
    await api.get<{ items: SessionPayment[]; hasMore: boolean }>(
      "/session-payments",
      { params: { page } },
    )
  ).data;
export const getPaymentAccount = async () =>
  (await api.get<PaymentAccount>("/session-payments/account")).data;
export const startPaymentAccount = async (termsVersion: string) =>
  (
    await api.post<PaymentAccount>("/session-payments/account", {
      termsVersion,
    })
  ).data;
export const syncPaymentAccount = async () =>
  (await api.post<PaymentAccount>("/session-payments/account/sync")).data;
export const setPaymentPreference = async (enabled: boolean) =>
  (await api.patch<PaymentAccount>("/session-payments/account", { enabled }))
    .data;
export const connectSession = async () =>
  (
    await api.post<{ clientSecret: string; publishableKey: string }>(
      "/session-payments/account/session",
    )
  ).data;
export const acceptPayment = async (id: string) =>
  (await api.post<SessionPayment>(`/session-payments/${id}/accept`)).data;
export const retryPayment = async (id: string) =>
  api.post(`/session-payments/${id}/retry`);
export async function refundPayment(
  id: string,
  amountCents: number,
  reason: string,
) {
  const { commandKey, storageKey } = await durableCommandKey(
    `payment-refund:${id}`,
    {
      amountCents,
      reason,
    },
  );
  await api.post(`/session-payments/${id}/refunds`, {
    amountCents,
    reason,
    commandKey,
  });
  await AsyncStorage.removeItem(storageKey);
}
export const requestPaymentAccess = async (id: string) =>
  api.post(`/session-payments/guest/${encodeURIComponent(id)}/otp`);
export async function verifyPaymentAccess(id: string, code: string) {
  const { data } = await api.post<{ accessToken: string }>(
    `/session-payments/guest/${encodeURIComponent(id)}/verify`,
    { code },
  );
  await storePaymentAccess(id, data.accessToken);
}
export async function openCheckout(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "checkout.stripe.com")
    throw new Error("No se ha podido abrir el pago. Actualiza la reserva.");
  if (Platform.OS === "web") window.location.assign(url);
  else await WebBrowser.openBrowserAsync(url);
}
export async function downloadPaymentDocument(
  id: string,
  documentId: string,
  guest: boolean,
) {
  const { path, headers } = await paymentAccess(id, guest);
  const { data } = await api.get<ArrayBuffer>(
    `${path}/documents/${encodeURIComponent(documentId)}`,
    { headers, responseType: "arraybuffer" },
  );
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([data], { type: "application/pdf" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `factura-${documentId}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const { File, Paths } = await import("expo-file-system");
    const { shareAsync } = await import("expo-sharing");
    const file = new File(Paths.cache, `factura-${documentId}.pdf`);
    file.write(new Uint8Array(data));
    try {
      await shareAsync(file.uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      });
    } finally {
      file.delete();
    }
  }
}
