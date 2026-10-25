import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { PatientSessionPicker } from "../patient-detail/PatientSessionPicker";
import { patientDate } from "../patient-detail/PatientDetailPrimitives";
import { getPatientSessions } from "../../../services/patientDetailService";
import { lightTheme as mockTheme } from "../../../constants/theme";

jest.mock("../../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: mockTheme }),
}));
jest.mock("../../../services/patientDetailService", () => ({
  getPatientSessions: jest.fn(),
}));
const recent = {
  id: "recent",
  date: "2026-10-01T10:00:00.000Z",
  duration: 60,
  type: "IN_PERSON",
  status: "COMPLETED",
  collectionState: "PAID" as const,
};
const older = { ...recent, id: "older", date: "2020-01-01T10:00:00.000Z" };
beforeEach(() => jest.clearAllMocks());

test("session associations load on demand and can select an older paginated session", async () => {
  jest
    .mocked(getPatientSessions)
    .mockResolvedValueOnce({
      items: [recent],
      page: 1,
      total: 2,
      totalPages: 2,
    })
    .mockResolvedValueOnce({
      items: [older],
      page: 2,
      total: 2,
      totalPages: 2,
    });
  const onSelect = jest.fn();
  render(
    <PatientSessionPicker
      clientId="patient"
      value=""
      onSelect={onSelect}
      label="Vincular sesión"
      emptyLabel="Sin sesión"
    />,
  );
  expect(getPatientSessions).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole("button", { name: "Vincular sesión" }));
  await screen.findByText("1 / 2");
  fireEvent.press(screen.getByRole("button", { name: "Página siguiente" }));
  await screen.findByText("2 / 2");
  expect(getPatientSessions).toHaveBeenLastCalledWith("patient", {
    page: 2,
    search: "",
  });
  fireEvent.press(
    screen.getByRole("button", {
      name: `${patientDate(older.date, true)} · 60 min`,
    }),
  );
  expect(onSelect).toHaveBeenCalledWith("older", older);
});

test("a failed page remains retryable without presenting stale sessions", async () => {
  jest
    .mocked(getPatientSessions)
    .mockRejectedValueOnce(new Error("Carga interrumpida"))
    .mockResolvedValueOnce({
      items: [recent],
      page: 1,
      total: 1,
      totalPages: 1,
    });
  render(
    <PatientSessionPicker
      clientId="patient"
      value=""
      onSelect={jest.fn()}
      label="Vincular sesión"
      emptyLabel="Sin sesión"
    />,
  );
  fireEvent.press(screen.getByRole("button", { name: "Vincular sesión" }));
  await screen.findByText("Carga interrumpida");
  fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
  await waitFor(() => expect(getPatientSessions).toHaveBeenCalledTimes(2));
  await screen.findByRole("button", {
    name: `${patientDate(recent.date, true)} · 60 min`,
  });
});
