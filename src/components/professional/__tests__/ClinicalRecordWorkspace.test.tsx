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
  consentPanel: <Text>Autorización HERA</Text>,
  onError: jest.fn(),
  onRefresh: jest.fn(async () => undefined),
  onLock: jest.fn(),
  onSection: jest.fn(),
});
beforeEach(() => {
  jest.clearAllMocks();
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

test("pending authorization exposes no note content and offers the existing consent flow", () => {
  render(
    <ClinicalRecordWorkspace
      {...props()}
      record={{ ...record, consentStatus: "PENDING" }}
    />,
  );
  expect(screen.queryByText("Contenido confidencial")).toBeNull();
  expect(entries.searchNotes).not.toHaveBeenCalled();
  fireEvent.press(
    screen.getAllByRole("button", { name: "Gestionar autorización" })[1],
  );
  expect(screen.getByText("Autorización HERA")).toBeTruthy();
});
