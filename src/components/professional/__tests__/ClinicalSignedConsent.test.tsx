jest.mock('../../../services/clinicalFileCache', () => ({ ownClinicalAsset: (asset: unknown) => asset, releaseClinicalAssets: jest.fn(), discardClinicalPickerCopies: jest.fn() }));
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as picker from 'expo-document-picker';
import { ClinicalGeneralWorkspace } from '../ClinicalGeneralWorkspace';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Client } from '../../../services/professionalService';
import type { ClinicalRecord } from '../../../services/clinicalService';
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('../../onboarding/TourTarget', () => ({ TourTarget: ({ children }: { children: React.ReactNode }) => children }));

const client: Client = { id: 'registered', source: 'REGISTERED', userId: 'user', user: { id: 'user', userType: 'CLIENT', name: 'Paciente', email: 'patient@example.test' } };
const page = { limit: 10, total: 0, nextCursor: null, hasMore: false };
const record: ClinicalRecord = { id: 'record', consentStatus: 'PENDING', consentMethod: null, consentGivenAt: null, consentRequestedAt: null, consentVersion: null, closedAt: null, retentionUntil: null, eligibleForManualReview: false, activeConsentRequest: null, guestConsentActionsEnabled: false, client: { ...client, questionnaireAnswers: null }, notes: [], documents: [], consentEvents: [], sessionFolders: [], pagination: { notes: page, documents: page, consentEvents: page, sessionFolders: page } };
test('a registered patient can upload and register signed evidence through one confirmed action', async () => {
  jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, isDark: false, mode: 'light', setMode: jest.fn() });
  jest.mocked(picker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{ uri: 'signed', name: 'firmado.pdf', mimeType: 'application/pdf', lastModified: 0 }] });
  const upload = jest.fn(async () => ({ id: 'evidence-1' }));
  const attest = jest.fn(async () => undefined);
  const noop = jest.fn(async () => undefined);
  render(<ClinicalGeneralWorkspace consentOnly client={client} record={record} isTablet noteSaving={false} documentUploading={false} consentSubmitting={false} closingProcess={false} openingDocumentId={null} loadingMoreNotes={false} loadingMoreDocuments={false} loadingMoreConsentEvents={false}
    onSaveNote={noop} onOpenDocument={noop} onUploadDocument={upload} onRequestDigitalConsent={noop} onAttestClinicalConsent={attest} onCloseClinicalProcess={noop} onLoadMoreNotes={noop} onLoadMoreDocuments={noop} onLoadMoreConsentEvents={noop} />);
  expect(screen.getByRole('button', { name: 'Guardar consentimiento firmado' })).toBeDisabled();
  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.press(screen.getByRole('button', { name: 'Guardar consentimiento firmado' }));
  await waitFor(() => expect(attest).toHaveBeenCalledWith('evidence-1'));
  expect(upload).toHaveBeenCalledWith(expect.objectContaining({ name: 'firmado.pdf' }), 'CONSENT_EVIDENCE');
  expect(screen.getByText('Todavía no concedida')).toBeTruthy();
});


test('after withdrawal the old evidence is not offered for reuse', async () => {
  jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, isDark: false, mode: 'light', setMode: jest.fn() });
  const noop = jest.fn(async () => undefined);
  const revoked: ClinicalRecord = { ...record, consentStatus: 'REVOKED', consentRenewalRequiredAfter: '2026-10-19T12:00:00Z', documents: [{ id: 'old', fileName: 'anterior.pdf', mimeType: 'application/pdf', uploadedAt: '2026-10-18T12:00:00Z', category: 'CONSENT_EVIDENCE', sizeBytes: 100 }] };
  render(<ClinicalGeneralWorkspace consentOnly client={client} record={revoked} isTablet noteSaving={false} documentUploading={false} consentSubmitting={false} closingProcess={false} openingDocumentId={null} loadingMoreNotes={false} loadingMoreDocuments={false} loadingMoreConsentEvents={false}
    onSaveNote={noop} onOpenDocument={noop} onUploadDocument={noop} onRequestDigitalConsent={noop} onAttestClinicalConsent={noop} onCloseClinicalProcess={noop} onLoadMoreNotes={noop} onLoadMoreDocuments={noop} onLoadMoreConsentEvents={noop} />);
  expect(screen.getByText(/Sube una nueva autorización firmada después/)).toBeTruthy();
  expect(screen.queryByText('Registrar documento ya subido')).toBeNull();
});

test('an uncertain attestation retries the uploaded evidence without another upload', async () => {
  jest.clearAllMocks();
  jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, isDark: false, mode: 'light', setMode: jest.fn() });
  jest.mocked(picker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{ uri: 'signed', name: 'firmado.pdf', mimeType: 'application/pdf', lastModified: 0 }] });
  const noop = jest.fn(async () => undefined);
  const upload = jest.fn(async () => ({ id: 'evidence-retry' }));
  const attest = jest.fn().mockRejectedValueOnce(new Error('Respuesta perdida')).mockResolvedValueOnce(undefined);
  render(<ClinicalGeneralWorkspace consentOnly client={client} record={record} isTablet noteSaving={false} documentUploading={false} consentSubmitting={false} closingProcess={false} openingDocumentId={null} loadingMoreNotes={false} loadingMoreDocuments={false} loadingMoreConsentEvents={false}
    onSaveNote={noop} onOpenDocument={noop} onUploadDocument={upload} onRequestDigitalConsent={noop} onAttestClinicalConsent={attest} onCloseClinicalProcess={noop} onLoadMoreNotes={noop} onLoadMoreDocuments={noop} onLoadMoreConsentEvents={noop} />);
  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.press(screen.getByRole('button', { name: 'Guardar consentimiento firmado' }));
  await screen.findByText('Respuesta perdida');
  fireEvent.press(screen.getByRole('button', { name: 'Guardar consentimiento firmado' }));
  await waitFor(() => expect(attest).toHaveBeenCalledTimes(2));
  expect(attest).toHaveBeenLastCalledWith('evidence-retry');
  expect(upload).toHaveBeenCalledTimes(1);
  expect(picker.getDocumentAsync).toHaveBeenCalledTimes(1);
});
