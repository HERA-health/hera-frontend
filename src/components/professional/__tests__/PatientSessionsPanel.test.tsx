import React from "react";
import { Dimensions } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { PatientSessionsPanel } from "../patient-detail/PatientSessionsPanel";
import * as professional from "../../../services/professionalService";
import {
  getPatientSessions,
  type PatientSessionPage,
} from "../../../services/patientDetailService";
import { billingService } from "../../../services/billingService";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock("../../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: require("../../../constants/theme").lightTheme }),
}));
jest.mock("../../../services/professionalService", () => ({
  getProfessionalSessionDetail: jest.fn(),
}));
jest.mock("../../../services/patientDetailService", () => ({
  getPatientSessions: jest.fn(),
}));
jest.mock("../../../services/billingService", () => ({
  billingService: { getAttachableInvoicesForSession: jest.fn() },
}));
jest.mock("../../../services/sessionPaymentService", () => ({
  getPayment: jest.fn(),
  cancelPayment: jest.fn(),
  paymentAmount: jest.fn(),
}));
jest.mock("../ManagedSessionSchedulerModal", () => ({
  ManagedSessionSchedulerModal: () => null,
}));
jest.mock("../ClinicalSessionInvoiceSheet", () => ({
  ClinicalSessionInvoiceSheet: () => null,
}));
jest.mock("../SessionMeetingControls", () => ({
  SessionMeetingControls: () => null,
}));
jest.mock("../../common/alert", () => ({
  useAppAlert: () => jest.fn(),
  showAppAlert: jest.fn(),
}));

const client: professional.Client = {
  id: "patient",
  userId: null,
  source: "MANAGED",
  user: {
    id: "patient-user",
    name: "Paciente sintético",
    email: "patient@example.test",
    userType: "CLIENT",
  },
};
const detail = (id: string): professional.ProfessionalSessionDetail => ({
  id,
  clientId: "patient",
  specialistId: "professional",
  date:
    id === "first" ? "2026-10-19T10:00:00.000Z" : "2026-10-18T10:00:00.000Z",
  duration: 50,
  type: "IN_PERSON",
  status: "COMPLETED",
  bookedServiceName: "Servicio reservado",
  price: { amount: 50, currency: "EUR", tariffName: null },
  professional: {
    id: "professional",
    displayName: "Especialista",
    professionalTitle: null,
  },
  clinicalTarget: null,
  invoice: {
    id: `invoice-${id}`,
    invoiceNumber: `FACTURA-${id}`,
    status: "PAID",
    total: 50,
  },
});
beforeEach(() => jest.clearAllMocks());

test("a parent refresh after scheduling reloads the list and selected session without resetting filters", async () => {
  const dimensions = jest.spyOn(Dimensions, "get")
    .mockReturnValue({ width: 1440, height: 900, scale: 1, fontScale: 1 });
  jest.mocked(getPatientSessions).mockResolvedValue({
    items: [{ ...detail("first"), collectionState: "PAID" }], total: 1, page: 1, totalPages: 1,
  });
  jest.mocked(professional.getProfessionalSessionDetail).mockResolvedValue(detail("first"));
  const callbacks = { onClinical: jest.fn(), onSchedule: jest.fn(), onRefresh: jest.fn(async () => undefined) };
  const view = render(<PatientSessionsPanel client={client} refreshVersion={0} {...callbacks} />);
  await screen.findByText("FACTURA-first");
  fireEvent.changeText(screen.getByLabelText("Buscar sesiones"), "individual");
  await waitFor(() => expect(getPatientSessions).toHaveBeenLastCalledWith("patient", { page: 1, search: "individual" }));
  const before = jest.mocked(getPatientSessions).mock.calls.length;
  jest.mocked(getPatientSessions).mockResolvedValue({
    items: ["first", "second"].map((id) => ({ ...detail(id), collectionState: "PAID" })),
    total: 2, page: 1, totalPages: 1,
  });
  view.rerender(<PatientSessionsPanel client={client} refreshVersion={1} {...callbacks} />);
  await screen.findByRole("button", { name: /18 oct 2026/ });
  expect(getPatientSessions).toHaveBeenCalledTimes(before + 1);
  expect(getPatientSessions).toHaveBeenLastCalledWith("patient", { page: 1, search: "individual" });
  await screen.findByText("FACTURA-first");
  expect(professional.getProfessionalSessionDetail).toHaveBeenCalledTimes(2);
  dimensions.mockRestore();
});
test("the list and detail keep their places while loading, including detail failure and retry", async () => {
  const dimensions = jest
    .spyOn(Dimensions, "get")
    .mockReturnValue({ width: 1440, height: 900, scale: 1, fontScale: 1 });
  let finishList: (page: PatientSessionPage) => void = () => undefined;
  let failDetail: (error: Error) => void = () => undefined;
  const listRequest = new Promise<PatientSessionPage>((resolve) => {
    finishList = resolve;
  });
  const detailRequest = new Promise<professional.ProfessionalSessionDetail>(
    (_, reject) => {
      failDetail = reject;
    },
  );
  const page: PatientSessionPage = {
    items: [{ ...detail("first"), collectionState: "PAID" }],
    total: 1,
    page: 1,
    totalPages: 1,
  };
  jest
    .mocked(getPatientSessions)
    .mockReturnValueOnce(listRequest)
    .mockResolvedValue(page);
  jest
    .mocked(professional.getProfessionalSessionDetail)
    .mockReturnValueOnce(detailRequest)
    .mockResolvedValue(detail("first"));
  render(
    <PatientSessionsPanel
      client={client}
      onClinical={jest.fn()}
      onSchedule={jest.fn()}
      onRefresh={jest.fn(async () => undefined)}
    />,
  );
  expect(screen.getByTestId("patient-session-list-column")).toBeTruthy();
  expect(screen.getByTestId("patient-session-detail-column")).toBeTruthy();
  expect(screen.getByLabelText("Cargando sesiones")).toBeTruthy();
  expect(screen.getByLabelText("Cargando detalle de la sesión")).toBeTruthy();
  await waitFor(() => expect(getPatientSessions).toHaveBeenCalled());
  await act(async () => {
    finishList(page);
    await listRequest;
  });
  await waitFor(() =>
    expect(professional.getProfessionalSessionDetail).toHaveBeenCalledWith(
      "first",
    ),
  );
  expect(screen.queryByLabelText("Cargando sesiones")).toBeNull();
  expect(screen.getByLabelText("Cargando detalle de la sesión")).toBeTruthy();
  await act(async () => {
    failDetail(new Error("No se pudo abrir la sesión."));
    await detailRequest.catch(() => undefined);
  });
  await screen.findByText("No se pudo abrir la sesión.");
  expect(screen.queryByLabelText("Cargando detalle de la sesión")).toBeNull();
  expect(screen.getByTestId("patient-session-detail-column")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
  await screen.findByText("FACTURA-first");
  expect(screen.queryByLabelText("Cargando detalle de la sesión")).toBeNull();
  dimensions.mockRestore();
});

test("switching sessions clears the previous invoice and ignores a late detail response", async () => {
  const dimensions = jest
    .spyOn(Dimensions, "get")
    .mockReturnValue({ width: 1440, height: 900, scale: 1, fontScale: 1 });
  let finishSecond: (
    value: professional.ProfessionalSessionDetail,
  ) => void = () => undefined;
  const second = new Promise<professional.ProfessionalSessionDetail>(
    (resolve) => {
      finishSecond = resolve;
    },
  );
  jest.mocked(getPatientSessions).mockResolvedValue({
    items: ["first", "second"].map((id) => ({
      ...detail(id),
      collectionState: "PAID" as const,
    })),
    total: 2,
    page: 1,
    totalPages: 1,
  });
  jest
    .mocked(professional.getProfessionalSessionDetail)
    .mockImplementation((id) =>
      id === "second" ? second : Promise.resolve(detail(id)),
    );
  render(
    <PatientSessionsPanel
      client={client}
      onClinical={jest.fn()}
      onSchedule={jest.fn()}
      onRefresh={jest.fn(async () => undefined)}
    />,
  );
  await screen.findByText("FACTURA-first");
  fireEvent.press(screen.getByRole("button", { name: /18 oct 2026/ }));
  expect(screen.queryByText("FACTURA-first")).toBeNull();
  await waitFor(() =>
    expect(professional.getProfessionalSessionDetail).toHaveBeenCalledWith(
      "second",
    ),
  );
  fireEvent.press(screen.getByRole("button", { name: /19 oct 2026/ }));
  await screen.findByText("FACTURA-first");
  await act(async () => {
    finishSecond(detail("second"));
    await second;
  });
  expect(screen.queryByText("FACTURA-second")).toBeNull();
  expect(screen.getByText("FACTURA-first")).toBeTruthy();
  expect(
    screen.getByRole("header", { name: "Facturación de esta sesión" }),
  ).toBeTruthy();
  dimensions.mockRestore();
});

test("a late invoice lookup cannot overwrite the next session or display its old error", async () => {
  const dimensions = jest
    .spyOn(Dimensions, "get")
    .mockReturnValue({ width: 1440, height: 900, scale: 1, fontScale: 1 });
  let fail: (reason: Error) => void = () => undefined;
  const lookup = new Promise<never>((_, reject) => {
    fail = reject;
  });
  jest
    .mocked(billingService.getAttachableInvoicesForSession)
    .mockReturnValue(lookup);
  jest.mocked(getPatientSessions).mockResolvedValue({
    items: ["first", "second"].map((id) => ({
      ...detail(id),
      collectionState: "PAID" as const,
    })),
    total: 2,
    page: 1,
    totalPages: 1,
  });
  jest
    .mocked(professional.getProfessionalSessionDetail)
    .mockImplementation(async (id) => ({
      ...detail(id),
      invoice: id === "first" ? null : detail(id).invoice,
    }));
  render(
    <PatientSessionsPanel
      client={client}
      onClinical={jest.fn()}
      onSchedule={jest.fn()}
      onRefresh={jest.fn(async () => undefined)}
    />,
  );
  fireEvent.press(await screen.findByText("Gestionar factura"));
  expect(billingService.getAttachableInvoicesForSession).toHaveBeenCalledWith(
    "first",
  );
  fireEvent.press(screen.getByRole("button", { name: /18 oct 2026/ }));
  await screen.findByText("FACTURA-second");
  await act(async () => {
    fail(new Error("Error antiguo de factura"));
    await lookup.catch(() => undefined);
  });
  expect(screen.queryByText("Error antiguo de factura")).toBeNull();
  expect(screen.getByText("FACTURA-second")).toBeTruthy();
  dimensions.mockRestore();
});
