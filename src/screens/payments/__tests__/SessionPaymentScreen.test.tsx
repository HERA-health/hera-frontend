import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import * as payments from "../../../services/sessionPaymentService";
import { SessionPaymentScreen } from "../SessionPaymentScreen";
const mockNavigate = jest.fn();
let mockUser: { type: "professional" | "client" } | null = null;

jest.mock("@expo/vector-icons", () => ({ Feather: () => null }));
jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: { bookingId: "test-booking" } }),
  useNavigation: () => ({ canGoBack: () => false, navigate: mockNavigate }),
}));
jest.mock("../../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: require("../../../constants/theme").lightTheme }),
}));
jest.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock("../../../components/common/alert", () => ({
  useAppAlert: () => ({ confirm: jest.fn() }),
}));
jest.mock("../../../components/payments/usePaymentPolling", () => ({
  usePaymentPolling: jest.fn(),
}));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));
jest.mock("../../../services/sessionPaymentService", () => ({
  getPayment: jest.fn(),
  openCheckout: jest.fn(),
  requestPaymentAccess: jest.fn(),
  verifyPaymentAccess: jest.fn(),
  paymentStatus: (status: string) =>
    status === "CONFIRMED" ? "Cita confirmada" : "Pendiente de pago",
  paymentAmount: () => "50,00 €",
}));
const payment: payments.SessionPayment = {
  id: "test-booking",
  sessionId: "session",
  status: "CONFIRMED",
  sessionStatus: "CONFIRMED",
  date: "2030-10-09T13:15:00Z",
  expiresAt: "2030-10-06T16:00:00Z",
  acceptanceDeadline: null,
  totalCents: 5000,
  currency: "EUR",
  paidAt: "2030-10-06T15:30:00Z",
  specialistName: "Especialista de prueba",
  netCents: null,
  refundedCents: 0,
  disputeSettledCents: 0,
  operationsPending: false,
  refundableCents: 5000,
  cancellationRefundCents: 5000,
  checkoutUrl: null,
  refunds: [],
  documents: [],
  issues: [],
  issueCode: null,
  dispute: null,
  canCancel: true,
  canRefund: false,
  canAccept: false,
};
beforeEach(() => {
  mockUser = null;
  jest.clearAllMocks();
  jest.clearAllMocks();
  jest.mocked(payments.getPayment).mockResolvedValue(payment);
});

test.each([
  [null, "Volver al inicio", "Landing"],
  ["client", "Volver a mis citas", "Sessions"],
  ["professional", "Volver a Cobros", "ProfessionalPayments"],
] as const)(
  "returns %s to an available route after Checkout",
  async (type, label, destination) => {
    mockUser = type ? { type } : null;
    render(<SessionPaymentScreen />);
    await screen.findByText("Cita confirmada");
    fireEvent.press(screen.getByText(label));
    expect(mockNavigate).toHaveBeenCalledWith(destination);
  },
);

test("shows the confirmed booking without an unsupported app link or another checkout", async () => {
  render(<SessionPaymentScreen />);
  await screen.findByText("Cita confirmada");
  expect(screen.getByText("Especialista de prueba")).toBeTruthy();
  expect(screen.queryByText("Abrir en la app")).toBeNull();
  expect(screen.queryByText("Pagar 50,00 €")).toBeNull();
  fireEvent.press(screen.getByText("Comprobar estado"));
  await waitFor(() =>
    expect(payments.getPayment).toHaveBeenLastCalledWith(
      "test-booking",
      true,
      true,
    ),
  );
});

test("opens the existing checkout instead of creating a second payment", async () => {
  jest.mocked(payments.getPayment).mockResolvedValue({
    ...payment,
    status: "CHECKOUT",
    paidAt: null,
    checkoutUrl: "https://checkout.stripe.com/test",
  });
  render(<SessionPaymentScreen />);
  fireEvent.press(await screen.findByText("Pagar 50,00 €"));
  await waitFor(() => expect(payments.openCheckout).toHaveBeenCalledTimes(1));
  expect(payments.openCheckout).toHaveBeenCalledWith(
    "https://checkout.stripe.com/test",
  );
});

test("shows verification while Stripe is consulted and then the confirmed booking", async () => {
  jest.mocked(payments.getPayment).mockResolvedValueOnce({
    ...payment,
    status: "CHECKOUT",
    paidAt: null,
    checkoutUrl: "https://checkout.stripe.com/test",
  });
  render(<SessionPaymentScreen />);
  await screen.findByText("Pagar 50,00 €");
  let complete!: (value: payments.SessionPayment) => void;
  jest.mocked(payments.getPayment).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  fireEvent.press(screen.getByText("Comprobar estado"));
  await screen.findByText("Comprobando el pago");
  expect(screen.queryByText("Pagar 50,00 €")).toBeNull();
  await act(async () => complete(payment));
  await screen.findByText("Cita confirmada");
});

test("keeps guest recovery available after a failed read", async () => {
  jest
    .mocked(payments.getPayment)
    .mockRejectedValueOnce(new Error("Sin acceso"));
  render(<SessionPaymentScreen />);
  fireEvent.press(await screen.findByText("Recibir código por correo"));
  await screen.findByLabelText("Código de acceso");
  expect(payments.requestPaymentAccess).toHaveBeenCalledWith("test-booking");
  fireEvent.changeText(screen.getByLabelText("Código de acceso"), "123456");
  fireEvent.press(screen.getByText("Consultar reserva"));
  await screen.findByText("Cita confirmada");
  expect(payments.verifyPaymentAccess).toHaveBeenCalledWith(
    "test-booking",
    "123456",
  );
});
