import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import * as payments from "../../../services/sessionPaymentService";
import { ProfessionalPaymentsScreen } from "../ProfessionalPaymentsScreen";

jest.mock("@expo/vector-icons", () => ({ Feather: () => null }));
jest.mock("../../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: require("../../../constants/theme").lightTheme }),
}));
jest.mock("../../../services/sessionPaymentService", () => ({
  getPaymentAccount: jest.fn(),
  startPaymentAccount: jest.fn(),
  syncPaymentAccount: jest.fn(),
  setPaymentPreference: jest.fn(),
}));
jest.mock("../../../components/payments/PaymentsList", () => ({
  PaymentsList: ({ action }: { action: React.ReactNode }) => {
    const { View, Text } = require("react-native");
    return (
      <View>
        {action}
        <Text>Listado de pagos</Text>
      </View>
    );
  },
}));
jest.mock("../../../components/payments/ConnectAccount", () => ({
  __esModule: true,
  default: ({ onExit }: { onExit: () => void }) => {
    const { Text, Pressable } = require("react-native");
    return (
      <Pressable onPress={onExit}>
        <Text>Formulario Stripe simulado</Text>
      </Pressable>
    );
  },
}));

const initial: payments.PaymentAccount = {
  available: true,
  termsVersion: "terms-test",
  enabled: false,
  hasAccount: false,
  status: "DISABLED",
  requirements: [],
  syncedAt: null,
};
const pending: payments.PaymentAccount = {
  ...initial,
  hasAccount: true,
  status: "ONBOARDING",
  requirements: ["individual.dob"],
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(payments.getPaymentAccount).mockResolvedValue(initial);
  jest.mocked(payments.startPaymentAccount).mockResolvedValue(pending);
  jest.mocked(payments.syncPaymentAccount).mockResolvedValue(pending);
});

test("requires explicit consent, preserves version and opens a dedicated view", async () => {
  render(<ProfessionalPaymentsScreen />);
  await screen.findByText("Elige cómo cobrar");
  expect(
    screen.getByRole("button", { name: "Configurar cobros" }),
  ).toBeDisabled();
  fireEvent.press(
    screen.getByRole("button", { name: "Condiciones y cancelaciones" }),
  );
  expect(screen.getByText(/lo que ocurra primero/)).toBeTruthy();
  expect(screen.queryByText("terms-test")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Cerrar información" }));
  expect(screen.queryByText(/lo que ocurra primero/)).toBeNull();
  fireEvent.press(screen.getByRole("checkbox"));
  fireEvent.press(screen.getByRole("button", { name: "Configurar cobros" }));
  await screen.findByText("Formulario Stripe simulado");
  expect(payments.startPaymentAccount).toHaveBeenCalledWith("terms-test");
  expect(screen.queryByText("Listado de pagos")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Volver a Cobros" }));
  await screen.findByText("Completar datos en Stripe");
  expect(payments.syncPaymentAccount).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Formulario Stripe simulado")).toBeNull();
});

test("blocks a duplicate submission and allows retry after failure", async () => {
  let reject!: (error: Error) => void;
  jest.mocked(payments.startPaymentAccount).mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  render(<ProfessionalPaymentsScreen />);
  await screen.findByRole("checkbox");
  fireEvent.press(screen.getByRole("checkbox"));
  const button = screen.getByRole("button", { name: "Configurar cobros" });
  fireEvent.press(button);
  fireEvent.press(button);
  expect(payments.startPaymentAccount).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error("Sin conexión")));
  expect(screen.queryByText("Formulario Stripe simulado")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Configurar cobros" }));
  await screen.findByText("Formulario Stripe simulado");
  expect(payments.startPaymentAccount).toHaveBeenCalledTimes(2);
});

test("explains outstanding identity checks without exposing Stripe field names or enabling payments", async () => {
  jest.mocked(payments.getPaymentAccount).mockResolvedValue({
    ...pending,
    requirements: [
      "individual.first_name",
      "individual.dob.day",
      "individual.address.city",
    ],
  });
  render(<ProfessionalPaymentsScreen />);
  await screen.findByText("Verificación pendiente");
  expect(
    screen.getAllByText("• Datos personales y verificación de identidad"),
  ).toHaveLength(1);
  expect(screen.queryByText(/individual\./)).toBeNull();
  expect(screen.getByText(/Tu cuenta está vinculada/)).toBeTruthy();
  expect(screen.getByRole("switch", { name: "Cobros online" })).toBeDisabled();
  fireEvent.press(
    screen.getByRole("button", { name: "Completar datos en Stripe" }),
  );
  await screen.findByText("Formulario Stripe simulado");
});

test("enables the activation action only after synchronization reports a ready account", async () => {
  jest.mocked(payments.getPaymentAccount).mockResolvedValue(pending);
  jest
    .mocked(payments.syncPaymentAccount)
    .mockResolvedValue({ ...initial, hasAccount: true });
  render(<ProfessionalPaymentsScreen />);
  await screen.findByText("Verificación pendiente");
  fireEvent.press(screen.getByRole("button", { name: "Actualizar estado" }));
  await waitFor(() =>
    expect(
      screen.getByRole("switch", { name: "Cobros online" }),
    ).not.toBeDisabled(),
  );
  expect(payments.setPaymentPreference).not.toHaveBeenCalled();
});

test.each(["ONBOARDING", "REVIEW", "ATTENTION"] as const)(
  "does not offer activation as ready during %s",
  async (status) => {
    jest
      .mocked(payments.getPaymentAccount)
      .mockResolvedValue({ ...pending, status, requirements: [] });
    render(<ProfessionalPaymentsScreen />);
    await screen.findByText("Tu cuenta de cobros");
    expect(
      screen.getByRole("switch", { name: "Cobros online" }),
    ).toBeDisabled();
  },
);

test("existing accounts remain manageable with new payments disabled; errors on return are visible", async () => {
  jest.mocked(payments.getPaymentAccount).mockResolvedValue({
    ...initial,
    hasAccount: true,
    enabled: true,
    available: false,
    status: "ACTIVE",
  });
  jest
    .mocked(payments.syncPaymentAccount)
    .mockRejectedValue(new Error("Sin conexión"));
  render(<ProfessionalPaymentsScreen />);
  await screen.findByText("El pago, dentro de HERA");
  expect(
    screen.getByRole("switch", { name: "Cobros online" }),
  ).not.toBeDisabled();
  expect(screen.queryByText("Listado de pagos")).toBeNull();
  fireEvent.press(screen.getByRole("tab", { name: "Pagos de sesiones" }));
  expect(screen.queryByText("El pago, dentro de HERA")).toBeNull();
  fireEvent.press(
    screen.getByRole("button", { name: "Saldo y transferencias" }),
  );
  await screen.findByText("Formulario Stripe simulado");
  fireEvent.press(screen.getByText("Formulario Stripe simulado"));
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(screen.getByText("Listado de pagos")).toBeTruthy();
  expect(
    screen.getByRole("tab", { name: "Pagos de sesiones" }),
  ).toHaveAccessibilityState({ selected: true });
  fireEvent.press(screen.getByRole("tab", { name: "Configuración" }));
  expect(screen.queryByText("Listado de pagos")).toBeNull();
  expect(screen.getByText("El pago, dentro de HERA")).toBeTruthy();
});

test("switch saves the choice once and reflects only the confirmed response", async () => {
  const ready = { ...initial, hasAccount: true };
  jest.mocked(payments.getPaymentAccount).mockResolvedValue(ready);
  let confirm!: (account: payments.PaymentAccount) => void;
  jest.mocked(payments.setPaymentPreference).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        confirm = resolve;
      }),
  );
  render(<ProfessionalPaymentsScreen />);
  const toggle = await screen.findByRole("switch", { name: "Cobros online" });
  fireEvent.press(toggle);
  fireEvent.press(toggle);
  expect(payments.setPaymentPreference).toHaveBeenCalledTimes(1);
  expect(payments.setPaymentPreference).toHaveBeenCalledWith(true);
  expect(screen.getByRole("switch").props.accessibilityState.checked).toBe(
    false,
  );
  await act(async () => confirm({ ...ready, enabled: true, status: "ACTIVE" }));
  expect(screen.getByRole("switch").props.accessibilityState.checked).toBe(
    true,
  );
  jest.mocked(payments.setPaymentPreference).mockResolvedValue(ready);
  fireEvent.press(screen.getByRole("switch"));
  await screen.findByText("El pago, por tu cuenta");
  expect(payments.setPaymentPreference).toHaveBeenLastCalledWith(false);
});

test("failed preference change retains the choice and can be retried", async () => {
  const ready = { ...initial, hasAccount: true };
  jest.mocked(payments.getPaymentAccount).mockResolvedValue(ready);
  jest
    .mocked(payments.setPaymentPreference)
    .mockRejectedValueOnce(new Error("Sin conexión"))
    .mockResolvedValue({ ...ready, enabled: true });
  render(<ProfessionalPaymentsScreen />);
  fireEvent.press(await screen.findByRole("switch"));
  await screen.findByRole("alert");
  expect(screen.getByRole("switch").props.accessibilityState.checked).toBe(
    false,
  );
  fireEvent.press(screen.getByRole("switch"));
  await screen.findByText("El pago, dentro de HERA");
});

test("no account keeps external payments available and fees open in a dismissible modal", async () => {
  render(<ProfessionalPaymentsScreen />);
  expect(await screen.findByRole("switch")).toBeDisabled();
  expect(
    screen.getByText(/Sigues recibiendo reservas y generando facturas/),
  ).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Comisiones" }));
  expect(screen.getByText(/Importe del pago/)).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Cerrar información" }));
  expect(screen.queryByText(/Importe del pago/)).toBeNull();
  expect(payments.setPaymentPreference).not.toHaveBeenCalled();
});
