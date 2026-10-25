import React from "react";
import { Button as NativeButton } from "react-native";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { PatientGeneralPanel } from "../patient-detail/PatientGeneralPanel";
import {
  savePatientProfile,
  type PatientSummary,
} from "../../../services/patientDetailService";
import type { Client } from "../../../services/professionalService";
import { lightTheme as mockTheme } from "../../../constants/theme";
import { CONTACT_METHOD_REQUIRED_MESSAGE } from "../../../constants/errors";
jest.mock("../../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: mockTheme }),
}));
jest.mock("../../../services/patientDetailService", () => ({
  savePatientProfile: jest.fn(),
}));
const client: Client = {
  id: "patient",
  source: "REGISTERED",
  userId: "account",
  user: {
    id: "account",
    name: "Paciente",
    email: "fixture@example.test",
    userType: "CLIENT",
  },
  primaryEmail: "fixture@example.test",
  billingTaxId: "EXISTENTE",
};
const summary: PatientSummary = {
  profile: {
    taxId: "EXISTENTE",
    birthDate: "1990-01-01",
    occupation: "Profesión existente",
    address: "Domicilio existente",
    postalCode: "08001",
    city: "Barcelona",
    country: "Spain",
    emergencyName: null,
    emergencyPhone: null,
    editableFields: ["emergencyName", "emergencyPhone"],
  },
  completed: 0,
  nextSession: null,
  lastSession: null,
  pendingAmountCents: 0,
  pendingInvoiceCount: 0,
  authorizationStatus: "PENDING",
  authorizationGrantedAt: null,
  closedAt: null,
  treatmentConsent: null,
  recentMovements: [],
  professionalName: "Profesional",
  relationshipSince: null,
  provenance: "OWN",
};
test("existing account and fiscal values remain visible while editing sends only permitted fields", async () => {
  const onRefresh = jest.fn(async () => undefined);
  jest.mocked(savePatientProfile).mockResolvedValue(summary.profile);
  render(
    <PatientGeneralPanel
      client={client}
      summary={summary}
      loading={false}
      error=""
      onRetry={jest.fn()}
      onRefresh={onRefresh}
      onEditBilling={jest.fn()}
      onConsent={jest.fn()}
      onOpenDocument={jest.fn()}
      onSession={jest.fn()}
      onPayments={jest.fn()}
    />,
  );
  expect(
    screen.getByText("Domicilio existente, 08001, Barcelona, España"),
  ).toBeTruthy();
  expect(screen.getByText("Profesión existente")).toBeTruthy();
  expect(screen.queryByText(/Pendiente de completar/)).toBeNull();
  fireEvent.press(screen.getAllByText("Editar")[0]);
  expect(
    screen.queryByLabelText("Fecha de nacimiento (AAAA-MM-DD)"),
  ).toBeNull();
  expect(screen.queryByLabelText("Dirección")).toBeNull();
  fireEvent.changeText(
    screen.getByLabelText("Contacto de emergencia"),
    "Contacto opcional",
  );
  fireEvent.press(screen.getByText("Guardar datos"));
  await waitFor(() =>
    expect(savePatientProfile).toHaveBeenCalledWith("patient", {
      emergencyName: "Contacto opcional",
    }),
  );
  await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(screen.queryByText("Editar datos personales")).toBeNull(),
  );
});
test("a managed patient can complete the permitted fields without copying account or fiscal identities", async () => {
  jest.mocked(savePatientProfile).mockClear();
  const managedSummary: PatientSummary = {
    ...summary,
    profile: {
      ...summary.profile,
      editableFields: [
        "birthDate",
        "occupation",
        "address",
        "postalCode",
        "city",
        "country",
        "emergencyName",
        "emergencyPhone",
      ],
    },
  };
  render(
    <PatientGeneralPanel
      client={{
        ...client,
        source: "MANAGED",
        firstName: "Paciente",
        userId: null,
      }}
      summary={managedSummary}
      loading={false}
      error=""
      onRetry={jest.fn()}
      onRefresh={jest.fn(async () => undefined)}
      onEditBilling={jest.fn()}
      onConsent={jest.fn()}
      onOpenDocument={jest.fn()}
      onSession={jest.fn()}
      onPayments={jest.fn()}
    />,
  );
  fireEvent.press(screen.getAllByText("Editar")[0]);
  fireEvent.press(screen.getByLabelText("Fecha de nacimiento"));
  fireEvent.press(screen.getByText("1992"));
  fireEvent.press(screen.getByText("Febrero"));
  fireEvent.press(screen.getByText("29"));
  fireEvent.press(screen.getByText("Confirmar"));
  fireEvent.changeText(
    screen.getByLabelText("Dirección"),
    "Domicilio corregido",
  );
  fireEvent.changeText(
    screen.getByLabelText("Profesión"),
    "Profesión registrada",
  );
  fireEvent.press(screen.getByText("Guardar datos"));
  await waitFor(() =>
    expect(savePatientProfile).toHaveBeenCalledWith("patient", {
      birthDate: "1992-02-29",
      occupation: "Profesión registrada",
      address: "Domicilio corregido",
    }),
  );
  await waitFor(() =>
    expect(screen.queryByText("Editar datos personales")).toBeNull(),
  );
});
test("a rejected removal of the last contact keeps the editor open and allows correction", async () => {
  const onRefresh = jest.fn(async () => undefined);
  const managedClient: Client = { ...client, source: "MANAGED", userId: null, primaryPhone: null };
  const profile = { ...summary.profile, email: "fixture@example.test", phone: null,
    editableFields: ["email", "phone"] as const };
  jest.mocked(savePatientProfile).mockReset()
    .mockRejectedValueOnce(new Error(CONTACT_METHOD_REQUIRED_MESSAGE))
    .mockResolvedValue({ ...profile, editableFields: [...profile.editableFields] });
  render(<PatientGeneralPanel client={managedClient}
    summary={{ ...summary, profile: { ...profile, editableFields: [...profile.editableFields] } }}
    loading={false} error="" onRetry={jest.fn()} onRefresh={onRefresh}
    onEditBilling={jest.fn()} onConsent={jest.fn()} onOpenDocument={jest.fn()}
    onSession={jest.fn()} onPayments={jest.fn()} />);
  fireEvent.press(screen.getAllByText("Editar")[0]);
  fireEvent.changeText(screen.getByLabelText("Email"), "");
  fireEvent.press(screen.getByText("Guardar datos"));
  await screen.findByText(CONTACT_METHOD_REQUIRED_MESSAGE);
  expect(onRefresh).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Email")).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText("Email"), "corrected@example.test");
  fireEvent.press(screen.getByText("Guardar datos"));
  await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  expect(savePatientProfile).toHaveBeenLastCalledWith("patient", { email: "corrected@example.test" });
});

test("a failed summary offers retry without describing unavailable personal data as missing", () => {
  const retry = jest.fn();
  render(
    <PatientGeneralPanel
      client={client}
      summary={null}
      loading={false}
      error="No se pudieron consultar los datos."
      onRetry={retry}
      onRefresh={jest.fn(async () => undefined)}
      onEditBilling={jest.fn()}
      onConsent={jest.fn()}
      onOpenDocument={jest.fn()}
      onSession={jest.fn()}
      onPayments={jest.fn()}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "No se pudieron consultar los datos.",
  );
  expect(screen.getAllByText("No disponible").length).toBeGreaterThan(0);
  expect(screen.queryByText(/Pendiente de completar/)).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
  expect(retry).toHaveBeenCalledTimes(1);
});

test("a More editing request is consumed and returning to the tab does not reopen the editor", async () => {
  function Harness() {
    const [request, setRequest] = React.useState(1);
    const [mount, setMount] = React.useState(0);
    return (
      <>
        <NativeButton
          title="Volver a información general"
          onPress={() => setMount((value) => value + 1)}
        />
        <PatientGeneralPanel
          key={mount}
          client={client}
          summary={summary}
          loading={false}
          error=""
          onRetry={jest.fn()}
          onRefresh={jest.fn(async () => undefined)}
          onEditBilling={jest.fn()}
          onConsent={jest.fn()}
          onOpenDocument={jest.fn()}
          onSession={jest.fn()}
          onPayments={jest.fn()}
          editRequest={request}
          onEditRequestConsumed={() => setRequest(0)}
        />
      </>
    );
  }
  render(<Harness />);
  await screen.findByText("Editar datos personales");
  fireEvent.press(screen.getByText("Cancelar"));
  await waitFor(() =>
    expect(screen.queryByText("Editar datos personales")).toBeNull(),
  );
  fireEvent.press(screen.getByText("Volver a información general"));
  expect(screen.queryByText("Editar datos personales")).toBeNull();
});
