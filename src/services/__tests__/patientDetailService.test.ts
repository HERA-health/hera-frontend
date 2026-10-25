jest.mock("../api", () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}));
import { api } from "../api";
import {
  getPatientSummary,
  getPatientSessions,
  savePatientProfile,
} from "../patientDetailService";
import { searchNotes, saveHistory } from "../clinicalEntriesService";

beforeEach(() => jest.clearAllMocks());
test("invalid birth dates never reach the update endpoint", async () => {
  await expect(
    savePatientProfile("patient", { birthDate: "1990-02-30" }),
  ).rejects.toThrow("fecha de nacimiento válida");
  expect(api.patch).not.toHaveBeenCalled();
});

test("a malformed summary rejects with a safe message instead of displaying a zero balance", async () => {
  jest.mocked(api.get).mockResolvedValueOnce({
    data: {
      data: { pendingAmountCents: "invalid", privateFixture: "confidential" },
    },
  });
  await expect(getPatientSummary("patient")).rejects.toThrow(
    "No se pudo interpretar la información de la ficha",
  );
});
test("a malformed session page never reaches payment and scheduling actions", async () => {
  jest.mocked(api.get).mockResolvedValueOnce({
    data: {
      data: {
        items: [{ id: "session", price: { amount: "invalid" } }],
        page: 1,
        total: 1,
        totalPages: 1,
      },
    },
  });
  await expect(getPatientSessions("patient", {})).rejects.toThrow(
    "No se pudo interpretar la información",
  );
});
test("clinical searches send protected text in a request body and retain the clinical token", async () => {
  jest.mocked(api.post).mockResolvedValueOnce({
    data: {
      data: {
        items: [],
        pageInfo: { total: 0, limit: 10, hasMore: false, nextCursor: null },
        filters: { authors: [], tags: [] },
      },
    },
  });
  await searchNotes("patient", "unlocked", {
    search: "texto confidencial",
    sessionId: "session",
  });
  expect(api.post).toHaveBeenCalledWith(
    "/clinical/records/patient/entries/NOTE/search",
    { search: "texto confidencial", sessionId: "session" },
    { headers: { "x-clinical-access-token": "unlocked" } },
  );
});
test("history retries preserve the caller operation key and malformed responses do not expose payload details", async () => {
  jest
    .mocked(api.post)
    .mockResolvedValueOnce({ data: { data: { title: "private-response" } } });
  const input = {
    title: "Evaluación",
    type: "ASSESSMENT" as const,
    status: "DRAFT" as const,
    content: "Contenido",
    occurredAt: "2026-10-01T10:00:00.000Z",
    sessionIds: [],
  };
  await expect(
    saveHistory("patient", "unlocked", input, undefined, "same-operation-key"),
  ).rejects.toThrow("No se pudo guardar la entrada clínica");
  expect(api.post).toHaveBeenCalledWith(
    "/clinical/records/patient/history-entries",
    input,
    {
      headers: {
        "x-clinical-access-token": "unlocked",
        "Idempotency-Key": "same-operation-key",
      },
    },
  );
});
