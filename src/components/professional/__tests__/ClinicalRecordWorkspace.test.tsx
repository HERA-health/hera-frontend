import React from "react";
import { Text } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { ClinicalRecordWorkspace } from "../patient-detail/ClinicalRecordWorkspace";
import * as entries from "../../../services/clinicalEntriesService";
import type { ClinicalRecord } from "../../../services/clinicalService";
import * as clinical from "../../../services/clinicalService";
import type { Client } from "../../../services/professionalService";
import { lightTheme as mockTheme } from "../../../constants/theme";
jest.mock("../../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: mockTheme }),
}));
// Portal positioning needs a measured native anchor in the test renderer.
jest.mock("../../common/AnimatedPressable", () => ({
  AnimatedPressable: ({ children, focusRef, ...props }: React.PropsWithChildren<{ focusRef?: React.Ref<{ measureInWindow: (callback: (...values: number[]) => void) => void; focus: () => void }> }>) => {
    const React = require("react");
    const { Pressable } = require("react-native");
    React.useImperativeHandle(focusRef, () => ({ measureInWindow: (callback: (...values: number[]) => void) => callback(20, 200, 300, 48), focus: () => {} }));
    return <Pressable {...props}>{children}</Pressable>;
  },
}));
jest.mock("../../../services/api", () => ({ api: {} }));
jest.mock("../../../services/clinicalService", () => ({
  ...jest.requireActual("../../../services/clinicalService"),
  closeClinicalProcess: jest.fn(),
  listClinicalConsentEvents: jest.fn(),
}));
jest.mock("../../../services/clinicalEntriesService", () => ({
  searchNotes: jest.fn(),
  searchHistory: jest.fn(),
  getNoteTags: jest.fn(),
}));
jest.mock("../ClinicalQuestionnairePanel", () => ({
  ClinicalQuestionnairePanel: () => null,
}));
jest.mock("../patient-detail/ClinicalExercisesWorkspace", () => ({
  ClinicalExercisesWorkspace: () =>
    require("react").createElement(
      require("react-native").Text,
      null,
      "Ejercicios conservados",
    ),
}));
jest.mock("../patient-detail/ClinicalDocumentsWorkspace", () => ({
  ClinicalDocumentsWorkspace: () =>
    require("react").createElement(
      require("react-native").Text,
      null,
      "Archivos protegidos",
    ),
}));
jest.mock("../../onboarding/TourTarget", () => ({
  TourTarget: ({ children }: { children: React.ReactNode }) => children,
}));
const client: Client = {
  id: "patient",
  source: "MANAGED",
  userId: null,
  user: {
    id: null,
    name: "Paciente",
    email: "fixture@example.test",
    userType: "CLIENT",
  },
  sessions: [],
};
const page = { limit: 10, total: 1, hasMore: false, nextCursor: null };
const record: ClinicalRecord = {
  id: "record",
  access: { canReadClinicalContent: true, canWriteClinicalContent: true },
  consentStatus: "GRANTED",
  consentGivenAt: null,
  consentRequestedAt: null,
  consentVersion: null,
  consentMethod: null,
  retentionUntil: null,
  closedAt: null,
  eligibleForManualReview: false,
  activeConsentRequest: null,
  guestConsentActionsEnabled: false,
  client: { ...client, questionnaireAnswers: null },
  notes: [],
  documents: [],
  consentEvents: [],
  sessionFolders: [],
  pagination: {
    notes: page,
    documents: page,
    consentEvents: page,
    sessionFolders: page,
  },
};
const note = {
  id: "note",
  title: "Nota protegida",
  type: "EVOLUTION" as const,
  tags: ["Trabajo"],
  authorId: "professional",
  authorName: "Profesional",
  sessionId: null,
  content: "Contenido confidencial",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  documents: [],
};
const props = () => ({
  client,
  record,
  token: "clinical-token",
  section: "notes" as const,
  consentPanel: <Text>Consentimiento informado</Text>,
  onError: jest.fn(),
  onRefresh: jest.fn(async () => undefined),
  onLock: jest.fn(),
  onSection: jest.fn(),
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(clinical.closeClinicalProcess).mockReset().mockResolvedValue({ closedAt: "2026-10-27T10:00:00Z" });
  jest.mocked(entries.getNoteTags).mockResolvedValue(["Etiqueta antigua"]);
  jest.mocked(entries.searchNotes).mockResolvedValue({
    items: [note],
    pageInfo: page,
    filters: {
      authors: [{ id: "professional", name: "Profesional" }],
      tags: ["Trabajo"],
    },
  });
  jest.mocked(entries.searchHistory).mockResolvedValue({
    items: [],
    pageInfo: { ...page, total: 0 },
    filters: { authors: [], tags: [] },
  });
});
test("tag options load only when the filter opens and remain available beyond the current page", async () => {
  render(<ClinicalRecordWorkspace {...props()} />, { createNodeMock: () => ({ measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(20, 200, 300, 44) }) });
  await screen.findAllByText("Nota protegida");
  expect(entries.getNoteTags).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
  fireEvent.press(screen.getByRole("button", { name: "Etiqueta clínica" }));
  await screen.findByText("Etiqueta antigua");
  expect(entries.getNoteTags).toHaveBeenCalledWith("patient", "clinical-token");
  fireEvent.press(screen.getByText("Etiqueta antigua"));
  fireEvent.press(screen.getByText("Aplicar"));
  await waitFor(() =>
    expect(entries.searchNotes).toHaveBeenLastCalledWith(
      "patient",
      "clinical-token",
      expect.objectContaining({ tag: "Etiqueta antigua" }),
    ),
  );
});
test("an older linked session retains its date when absent from the recent session list", async () => {
  jest.mocked(entries.searchNotes).mockResolvedValue({
    items: [{ ...note, sessionId: "old-session", sessionDate: "2025-09-01T10:00:00.000Z" }],
    pageInfo: page, filters: { authors: [], tags: [] },
  });
  render(<ClinicalRecordWorkspace {...props()} />);
  fireEvent.press(await screen.findByText("Nota protegida"));
  await screen.findByText("1 sept 2025, 12:00");
  expect(screen.queryByText("Sin fecha registrada")).toBeNull();
});

test("has exactly three clinical tabs and preserves exercises inside history", async () => {
  render(<ClinicalRecordWorkspace {...props()} />);
  await screen.findAllByText("Nota protegida");
  expect(screen.getAllByRole("tab")).toHaveLength(3);
  for (const name of [
    "Notas clínicas",
    "Historia clínica",
    "Documentación clínica",
  ])
    expect(screen.getByRole("tab", { name })).toBeTruthy();
  fireEvent.press(screen.getByRole("tab", { name: "Historia clínica" }));
  fireEvent.press(screen.getByRole("button", { name: "Ejercicios" }));
  expect(screen.getByText("Ejercicios conservados")).toBeTruthy();
  expect(screen.getAllByRole("tab")).toHaveLength(3);
});
test("search and a session target are sent to the server rather than applied to one local page", async () => {
  render(
    <ClinicalRecordWorkspace {...props()} focusSessionId="session-target" />,
  );
  await waitFor(() =>
    expect(entries.searchNotes).toHaveBeenCalledWith(
      "patient",
      "clinical-token",
      expect.objectContaining({ sessionId: "session-target" }),
    ),
  );
  fireEvent.changeText(
    screen.getByLabelText("Buscar notas clínicas"),
    "texto de otra página",
  );
  await waitFor(() =>
    expect(entries.searchNotes).toHaveBeenLastCalledWith(
      "patient",
      "clinical-token",
      expect.objectContaining({
        search: "texto de otra página",
        sessionId: "session-target",
      }),
    ),
  );
});
test("changing the target session ignores a late response from the previous session", async () => {
  type NotePage = Awaited<ReturnType<typeof entries.searchNotes>>;
  let finishOld!: (value: NotePage) => void;
  const old = new Promise<NotePage>((resolve) => { finishOld = resolve; });
  jest.mocked(entries.searchNotes).mockReturnValueOnce(old).mockResolvedValue({
    items: [{ ...note, id: "new-note", title: "Nota de la nueva cita", sessionId: "new-session" }],
    pageInfo: page, filters: { authors: [], tags: [] },
  });
  const stableProps = props();
  const view = render(<ClinicalRecordWorkspace {...stableProps} focusSessionId="old-session" />);
  await waitFor(() => expect(entries.searchNotes).toHaveBeenCalledWith(
    "patient", "clinical-token", expect.objectContaining({ sessionId: "old-session" }),
  ));
  view.rerender(<ClinicalRecordWorkspace {...stableProps} focusSessionId="new-session" />);
  await screen.findByText("Nota de la nueva cita");
  await act(async () => {
    finishOld({ items: [{ ...note, title: "Respuesta antigua", sessionId: "old-session" }], pageInfo: page, filters: { authors: [], tags: [] } });
    await old;
  });
  expect(screen.queryByText("Respuesta antigua")).toBeNull();
  expect(screen.getByText("Nota de la nueva cita")).toBeTruthy();
});

test("pending treatment is advisory even when historical HERA authorization was revoked", async () => {
  render(
    <ClinicalRecordWorkspace
      {...props()}
      record={{ ...record, consentStatus: "REVOKED" }}
    />,
  );
  await screen.findAllByText("Nota protegida");
  expect(entries.searchNotes).toHaveBeenCalled();
  fireEvent.press(
    screen.getByRole("button", { name: "Consentimiento informado" }),
  );
  expect(screen.queryByText("Autorización HERA")).toBeNull();
});

test('withdrawn treatment retains notes and removes clinical write actions', async () => {
  render(<ClinicalRecordWorkspace {...props()} record={{ ...record, access: { canReadClinicalContent: true, canWriteClinicalContent: false } }} />);
  await screen.findAllByText('Nota protegida');
  expect(screen.queryByRole('button', { name: 'Nueva nota' })).toBeNull();
});

test('closing remains reachable without HERA authorization and requires confirmation', async () => {
  const current = props();
  const onRequestRefreshClient = jest.fn(async () => undefined);
  render(<ClinicalRecordWorkspace {...current} onRequestRefreshClient={onRequestRefreshClient} record={{ ...record, consentStatus: 'REVOKED' }} />);
  await screen.findAllByText('Nota protegida');
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar proceso asistencial' }));
  expect(clinical.closeClinicalProcess).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
  expect(clinical.closeClinicalProcess).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar proceso asistencial' }));
  fireEvent.press(screen.getByRole('button', { name: 'Confirmar cierre' }));
  await screen.findByText('Proceso cerrado · Consulta disponible');
  expect(clinical.closeClinicalProcess).toHaveBeenCalledWith('patient', 'clinical-token');
  expect(current.onRefresh).toHaveBeenCalledTimes(1);
  expect(onRequestRefreshClient).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Nueva nota' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Cerrar proceso asistencial' })).toBeNull();
});

test('closing prevents duplicate submissions and permits retry after failure', async () => {
  let rejectClose!: (reason: Error) => void;
  jest.mocked(clinical.closeClinicalProcess).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectClose = reject; }));
  const current = props();
  render(<ClinicalRecordWorkspace {...current} />);
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar proceso asistencial' }));
  const confirm = screen.getByRole('button', { name: 'Confirmar cierre' });
  fireEvent.press(confirm);
  fireEvent.press(confirm);
  expect(clinical.closeClinicalProcess).toHaveBeenCalledTimes(1);
  await act(async () => rejectClose(new Error('No se pudo cerrar el proceso.')));
  await screen.findByText('No se pudo cerrar el proceso.');
  expect(current.onRefresh).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Confirmar cierre' }));
  await screen.findByText('Proceso cerrado · Consulta disponible');
  expect(clinical.closeClinicalProcess).toHaveBeenCalledTimes(2);
});

test('a successful closure remains read-only when reloading the record fails', async () => {
  const current = props();
  current.onRefresh.mockRejectedValueOnce(new Error('No se pudo actualizar la ficha'));
  render(<ClinicalRecordWorkspace {...current} />);
  await screen.findAllByText('Nota protegida');
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar proceso asistencial' }));
  fireEvent.press(screen.getByRole('button', { name: 'Confirmar cierre' }));
  await screen.findByText('Proceso cerrado · Consulta disponible');
  await waitFor(() => expect(current.onError).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: 'Nueva nota' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Cerrar proceso asistencial' })).toBeNull();
});

test('late closure responses cannot close another patient or refresh its data', async () => {
  let finishClose!: (value: unknown) => void;
  jest.mocked(clinical.closeClinicalProcess).mockImplementationOnce(() => new Promise((resolve) => { finishClose = resolve; }));
  const current = props();
  const view = render(<ClinicalRecordWorkspace {...current} />);
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar proceso asistencial' }));
  fireEvent.press(screen.getByRole('button', { name: 'Confirmar cierre' }));
  view.rerender(<ClinicalRecordWorkspace {...current} client={{ ...client, id: 'other-patient' }} />);
  await act(async () => finishClose({ closedAt: '2026-10-27T10:00:00Z' }));
  expect(current.onRefresh).not.toHaveBeenCalled();
  expect(screen.queryByText('Proceso cerrado · Consulta disponible')).toBeNull();
});

test('withdrawn consent permits process closure but a closed record cannot be closed again', async () => {
  const current = props();
  const view = render(<ClinicalRecordWorkspace {...current} record={{ ...record, access: { canReadClinicalContent: true, canWriteClinicalContent: false } }} />);
  expect(screen.getByRole('button', { name: 'Cerrar proceso asistencial' })).toBeTruthy();
  view.rerender(<ClinicalRecordWorkspace {...current} record={{ ...record, closedAt: '2026-10-27T10:00:00Z', access: { canReadClinicalContent: true, canWriteClinicalContent: false } }} />);
  expect(screen.queryByRole('button', { name: 'Cerrar proceso asistencial' })).toBeNull();
});

test('retains a read-only paginated history of previous authorizations and retention dates', async () => {
  const event: clinical.ClinicalConsentEvent = { id: 'old-event', status: 'GRANTED', method: 'DIGITAL_SIGNATURE', version: 'hera-v1', eventType: 'ACCEPTED', requestKind: 'GRANT', channel: 'HERA_ACCOUNT_EMAIL', createdAt: '2026-01-01T10:00:00Z' };
  jest.mocked(clinical.listClinicalConsentEvents).mockRejectedValueOnce(new Error('Error de historial')).mockResolvedValueOnce({ items: [{ ...event, id: 'older-event', eventType: 'REQUESTED' }], pageInfo: { ...page, hasMore: false, nextCursor: null } });
  render(<ClinicalRecordWorkspace {...props()} record={{ ...record, retentionUntil: '2031-01-01T10:00:00Z', consentEvents: [event], pagination: { ...record.pagination, consentEvents: { ...page, total: 2, hasMore: true, nextCursor: event.id } } }} />);
  fireEvent.press(screen.getByRole('button', { name: 'Consentimiento informado' }));
  expect(screen.getByText('Conservación mínima hasta')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Consultar autorizaciones anteriores' }));
  expect(screen.getByText(/Autorización aceptada/)).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Ver más autorizaciones anteriores' }));
  await screen.findByText('Error de historial');
  fireEvent.press(screen.getByRole('button', { name: 'Ver más autorizaciones anteriores' }));
  await screen.findByText(/Autorización solicitada/);
  expect(clinical.listClinicalConsentEvents).toHaveBeenLastCalledWith('patient', 'clinical-token', { cursor: 'old-event' });
  expect(screen.queryByRole('button', { name: 'Ver más autorizaciones anteriores' })).toBeNull();
});

test('late history pages never appear in another patient record', async () => {
  const event: clinical.ClinicalConsentEvent = { id: 'old-event', status: 'GRANTED', method: 'SPECIALIST_ATTESTATION', version: 'hera-v1', eventType: 'CONSENT_RECORDED', requestKind: null, channel: null, createdAt: '2026-01-01T10:00:00Z' };
  let finishPage!: (value: Awaited<ReturnType<typeof clinical.listClinicalConsentEvents>>) => void;
  jest.mocked(clinical.listClinicalConsentEvents).mockImplementationOnce(() => new Promise((resolve) => { finishPage = resolve; }));
  const current = props();
  const view = render(<ClinicalRecordWorkspace {...current} record={{ ...record, consentEvents: [event], pagination: { ...record.pagination, consentEvents: { ...page, total: 2, hasMore: true, nextCursor: event.id } } }} />);
  fireEvent.press(screen.getByRole('button', { name: 'Consentimiento informado' }));
  fireEvent.press(screen.getByRole('button', { name: 'Consultar autorizaciones anteriores' }));
  expect(screen.getByText(/Registro del profesional/)).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Ver más autorizaciones anteriores' }));
  view.rerender(<ClinicalRecordWorkspace {...current} client={{ ...client, id: 'other-patient' }} record={{ ...record, id: 'other-record', pagination: { ...record.pagination, consentEvents: { ...page, total: 0 } } }} />);
  await act(async () => finishPage({ items: [{ ...event, id: 'late-event' }], pageInfo: { ...page, total: 2 } }));
  expect(screen.queryByText(/Autorización registrada/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Consultar autorizaciones anteriores' })).toBeNull();
});
