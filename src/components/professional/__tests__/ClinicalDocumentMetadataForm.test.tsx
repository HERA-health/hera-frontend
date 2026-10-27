import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { ClinicalDocumentsWorkspace } from "../patient-detail/ClinicalDocumentsWorkspace";
import * as clinical from "../../../services/clinicalService";
import { searchDocuments } from "../../../services/clinicalEntriesService";
import { pickClinicalFiles } from "../../../services/clinicalFilePicker";
import { lightTheme as mockTheme } from "../../../constants/theme";

jest.mock("../../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: mockTheme }),
}));
jest.mock("../../../services/clinicalEntriesService", () => ({
  searchDocuments: jest.fn(),
}));
jest.mock("../../../services/clinicalService", () => ({
  uploadClinicalDocument: jest.fn(),
  updateClinicalDocument: jest.fn(),
  isClinicalSaveUncertain: () => false,
}));
jest.mock("../../../services/clinicalFilePicker", () => ({
  pickClinicalFiles: jest.fn(),
}));
jest.mock("../../../services/clinicalFileCache", () => ({
  releaseClinicalAssets: jest.fn(),
}));
jest.mock("../patient-detail/ClinicalDocumentPreview", () => ({
  ClinicalDocumentPreview: () => null,
}));
const file = {
  uri: "synthetic:consent",
  fileName: "consentimiento-firmado.pdf",
  mimeType: "application/pdf",
  fileSize: 120,
};

test("treatment upload opens the single consent section instead of ordinary document upload", async () => {
  jest.mocked(searchDocuments).mockResolvedValue({ items: [], pageInfo: { limit: 10, total: 0, hasMore: false, nextCursor: null }, filters: { authors: [], tags: [] } });
  const onConsent = jest.fn();
  render(<ClinicalDocumentsWorkspace clientId="patient" token="clinical-token" writable uploadRequest={{ id: 2, classification: "TREATMENT_CONSENT" }} onUploadConsumed={jest.fn()} onChanged={jest.fn()} onError={jest.fn()} onParent={jest.fn()} onConsent={onConsent} />);
  expect(onConsent).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Seleccionar archivos")).toBeNull();
  await screen.findByText("No hay documentos que coincidan con estos filtros.");
});

test("ordinary report metadata links to the selected history entry", async () => {
  jest.mocked(searchDocuments).mockResolvedValue({
    items: [],
    pageInfo: { limit: 10, total: 0, hasMore: false, nextCursor: null },
    filters: { authors: [], tags: [] },
  });
  jest.mocked(pickClinicalFiles).mockResolvedValue([file]);
  jest.mocked(clinical.uploadClinicalDocument).mockResolvedValue({
    id: "document",
    fileName: file.fileName,
    mimeType: file.mimeType,
    sizeBytes: 120,
    uploadedAt: "2026-10-24T10:00:00.000Z",
    category: "GENERAL",
    classification: "REPORT",
    historyEntryId: "history-entry",
  });
  render(
    <ClinicalDocumentsWorkspace
      clientId="patient"
      token="clinical-token"
      writable
      uploadRequest={{
        id: 1,
        historyEntryId: "history-entry",
        classification: "REPORT",
      }}
      onUploadConsumed={jest.fn()}
      onChanged={jest.fn()}
      onError={jest.fn()}
      onParent={jest.fn()}
    />,
  );

  expect(
    screen.getByText(/PDF, DOCX e imágenes · Hasta 15 MB por archivo/),
  ).toBeTruthy();
  expect(screen.getByText("Descripción · Opcional")).toBeTruthy();
  await screen.findByText("No hay documentos que coincidan con estos filtros.");
  fireEvent.changeText(
    screen.getByLabelText("Descripción del documento"),
    "Documento firmado registrado por el profesional",
  );
  fireEvent.press(screen.getByText("Seleccionar archivos"));
  await screen.findByText(file.fileName);
  expect(clinical.uploadClinicalDocument).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("Subir documentos"));
  await waitFor(() =>
    expect(clinical.uploadClinicalDocument).toHaveBeenCalledWith(
      "patient",
      file,
      "clinical-token",
      "GENERAL",
      undefined,
      {
        historyEntryId: "history-entry",
        classification: "REPORT",
        description: "Documento firmado registrado por el profesional",
      },
    ),
  );
  await waitFor(() =>
    expect(screen.queryByText("Subir documentos")).toBeNull(),
  );
  await screen.findByText("No hay documentos que coincidan con estos filtros.");
});
