import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { TreatmentConsentPanel } from '../TreatmentConsentPanel';
import * as consent from '../../../services/treatmentConsentService';
import { pickClinicalFiles } from '../../../services/clinicalFilePicker';
import { releaseClinicalAssets } from '../../../services/clinicalFileCache';
import { ClinicalRequestError } from '../../../services/clinicalService';
import { createSecureRandomUuid } from '../../../utils/secureRandom';
import { lightTheme as mockTheme } from '../../../constants/theme';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: mockTheme }) }));
jest.mock('../../../services/treatmentConsentService', () => ({
  getTreatmentConsent: jest.fn(),
  uploadTreatmentPdf: jest.fn(),
  prepareTreatmentConsent: jest.fn(),
  sendTreatmentConsent: jest.fn(),
}));
jest.mock('../../../services/clinicalFilePicker', () => ({ pickClinicalFiles: jest.fn() }));
jest.mock('../../../services/clinicalFileCache', () => ({ releaseClinicalAssets: jest.fn() }));
jest.mock('../../../services/api', () => ({ api: {}, default: {} }));
jest.mock('../../../services/clinicalService', () => ({
  ...jest.requireActual('../../../services/clinicalService'),
  openClinicalDocument: jest.fn(),
}));
jest.mock('../../../utils/secureRandom', () => ({
  createSecureRandomUuid: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));
jest.mock('../TreatmentConsentDocument', () => ({
  TreatmentConsentDocument: ({ html }: { html: string }) => {
    const { Text } = require('react-native');
    return <Text>{html}</Text>;
  },
}));
const pending: consent.TreatmentConsent = {
  status: 'PENDING',
  method: null,
  eventId: null,
  recordedAt: null,
  signedAt: null,
  evidenceDocumentId: null,
  evidenceRequestId: null,
  activeRequest: null,
  capabilities: {
    canUpload: true,
    canPrepare: true,
    canSend: false,
    digitalUnavailableReason: 'Pendiente de validación jurídica.',
    legacyAuthorizationRequired: false,
  },
};
beforeEach(() => {
  jest.clearAllMocks();
  let key = 0;
  jest.mocked(createSecureRandomUuid).mockImplementation(() => `operation-${++key}`);
  jest.mocked(consent.getTreatmentConsent).mockResolvedValue(pending);
});
const show = () =>
  render(
    <TreatmentConsentPanel
      clientId="patient"
      token="unlock"
      onChanged={jest.fn(async () => undefined)}
    />,
  );

test('one PDF selection registers consent without a second confirmation and legal gate remains visible', async () => {
  jest
    .mocked(pickClinicalFiles)
    .mockResolvedValue([
      { uri: 'file:///synthetic.pdf', name: 'consent.pdf', mimeType: 'application/pdf' },
    ]);
  jest
    .mocked(consent.uploadTreatmentPdf)
    .mockResolvedValue({
      ...pending,
      status: 'SIGNED',
      method: 'UPLOADED_PDF',
      recordedAt: '2026-10-26',
      eventId: 'event',
    });
  show();
  await screen.findByText('Pendiente');
  expect(screen.getByRole('button', { name: 'Enviar para firma' })).toBeDisabled();
  fireEvent.press(screen.getByText('Subir PDF firmado'));
  await screen.findByText('Firmado');
  expect(consent.uploadTreatmentPdf).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Acreditar consentimiento')).toBeNull();
  expect(screen.getByText(/PDF aportado por el profesional/)).toBeTruthy();
});

test.each([undefined, 408, 503])('uncertain PDF response (%s) retains file and operation key for retry', async (status) => {
  jest
    .mocked(pickClinicalFiles)
    .mockResolvedValue([
      { uri: 'file:///synthetic.pdf', name: 'consent.pdf', mimeType: 'application/pdf' },
    ]);
  jest
    .mocked(consent.uploadTreatmentPdf)
    .mockRejectedValueOnce(status === undefined ? new Error('Respuesta desconocida') : new ClinicalRequestError({
      isAxiosError: true, response: { status, data: { error: 'Respuesta desconocida' } },
    }, 'Respuesta desconocida'))
    .mockResolvedValue(pending);
  show();
  await screen.findByText('Pendiente');
  fireEvent.press(screen.getByText('Subir PDF firmado'));
  await screen.findByText('Respuesta desconocida');
  fireEvent.press(screen.getByText('Reintentar subida'));
  await waitFor(() => expect(consent.uploadTreatmentPdf).toHaveBeenCalledTimes(2));
  expect(pickClinicalFiles).toHaveBeenCalledTimes(1);
  expect(jest.mocked(consent.uploadTreatmentPdf).mock.calls[0]).toEqual(
    jest.mocked(consent.uploadTreatmentPdf).mock.calls[1],
  );
});

test.each([400, 409, 413, 415])('a definitive PDF rejection (%s) allows a new selection and operation key', async (status) => {
  const invalid = { uri: 'file:///invalid.pdf', name: 'invalid.pdf', mimeType: 'application/pdf' };
  const corrected = { uri: 'file:///corrected.pdf', name: 'corrected.pdf', mimeType: 'application/pdf' };
  jest.mocked(pickClinicalFiles).mockResolvedValueOnce([invalid]).mockResolvedValueOnce([corrected]);
  jest.mocked(createSecureRandomUuid).mockReturnValueOnce('operation-1').mockReturnValueOnce('operation-2');
  const rejection = new ClinicalRequestError({
    isAxiosError: true, response: { status, data: { error: 'El PDF no es válido.' } },
  }, 'El PDF no es válido.');
  jest.mocked(consent.uploadTreatmentPdf).mockRejectedValueOnce(rejection).mockResolvedValue(pending);
  show();
  await screen.findByText('Pendiente');
  fireEvent.press(screen.getByText('Subir PDF firmado'));
  await screen.findByText('El PDF no es válido.');
  expect(releaseClinicalAssets).toHaveBeenCalledWith([invalid]);
  fireEvent.press(screen.getByText('Subir PDF firmado'));
  await waitFor(() => expect(consent.uploadTreatmentPdf).toHaveBeenCalledTimes(2));
  expect(pickClinicalFiles).toHaveBeenCalledTimes(2);
  expect(consent.uploadTreatmentPdf).toHaveBeenNthCalledWith(2, 'patient', 'unlock', corrected, 'operation-2');
});

test('review sends the exact prepared snapshot hash and preserves signed state while a renewal is pending', async () => {
  const prepared = {
    requestId: 'request',
    version: 'specialist-treatment-consent-v2',
    sha256: 'a'.repeat(64),
    html: 'Documento personalizado inmutable',
    canSend: true,
    pendingLegalReview: false,
  };
  const signed: consent.TreatmentConsent = {
    ...pending,
    status: 'SIGNED',
    method: 'DIGITAL_ACCEPTANCE',
    capabilities: { ...pending.capabilities, canSend: true },
    activeRequest: {
      id: 'request',
      stage: 'PREPARED',
      requestKind: 'GRANT',
      deliveryStatus: null,
      expiresAt: '2026-11-01',
      version: prepared.version,
      sha256: prepared.sha256,
    },
  };
  jest.mocked(consent.getTreatmentConsent).mockResolvedValue(signed);
  jest.mocked(consent.prepareTreatmentConsent).mockResolvedValue(prepared);
  jest.mocked(consent.sendTreatmentConsent).mockResolvedValue(signed);
  show();
  await screen.findByText('Firmado');
  fireEvent.press(screen.getByText('Enviar para firma'));
  fireEvent.press(screen.getByText('Revisar antes'));
  await screen.findByText('Documento personalizado inmutable');
  fireEvent.press(screen.getByText('Enviar por correo'));
  await waitFor(() =>
    expect(consent.sendTreatmentConsent).toHaveBeenCalledWith(
      'patient',
      'unlock',
      'request',
      prepared.sha256,
      expect.any(String),
    ),
  );
  expect(screen.getByText('Firmado')).toBeTruthy();
});

test('an outdated draft displays the server reason and cannot be sent', async () => {
  const reason = 'Este borrador utiliza una versión anterior. Prepara y revisa un documento nuevo antes de enviarlo.';
  const prepared: consent.TreatmentPreview = { requestId: 'old-request', version: 'specialist-treatment-consent-v1', sha256: 'b'.repeat(64), html: 'Documento anterior conservado', canSend: false, pendingLegalReview: false, sendUnavailableReason: reason };
  jest.mocked(consent.getTreatmentConsent).mockResolvedValue({ ...pending, capabilities: { ...pending.capabilities, canSend: true, digitalUnavailableReason: null }, activeRequest: { id: prepared.requestId, stage: 'PREPARED', requestKind: 'GRANT', deliveryStatus: null, expiresAt: '2026-11-01', version: prepared.version, sha256: prepared.sha256 } });
  jest.mocked(consent.prepareTreatmentConsent).mockResolvedValue(prepared);
  show();
  await screen.findByText('Pendiente');
  fireEvent.press(screen.getByText('Enviar para firma'));
  fireEvent.press(screen.getByText('Revisar antes'));
  await screen.findByText(reason);
  const button = screen.getByRole('button', { name: 'Enviar por correo' });
  expect(button).toBeDisabled();
  fireEvent.press(button);
  expect(consent.sendTreatmentConsent).not.toHaveBeenCalled();
});

const readyDocument: consent.TreatmentPreview = {
  requestId: 'new-request', version: 'specialist-treatment-consent-v2', sha256: 'c'.repeat(64),
  html: 'Documento para revisar', canSend: true, pendingLegalReview: false,
};
const enabled: consent.TreatmentConsent = {
  ...pending, capabilities: { ...pending.capabilities, canSend: true, digitalUnavailableReason: null },
};

test('direct sending asks first, then sends the prepared document without opening its preview', async () => {
  jest.mocked(consent.getTreatmentConsent).mockResolvedValue(enabled);
  jest.mocked(consent.prepareTreatmentConsent).mockResolvedValue(readyDocument);
  jest.mocked(consent.sendTreatmentConsent).mockResolvedValue({ ...enabled, status: 'SENT' });
  show();
  await screen.findByText('Pendiente');
  fireEvent.press(screen.getByText('Enviar para firma'));
  expect(screen.getByText('Revisar antes')).toBeTruthy();
  expect(consent.prepareTreatmentConsent).not.toHaveBeenCalled();
  expect(consent.sendTreatmentConsent).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Enviar ahora'));
  await screen.findByText('Enviado');
  expect(consent.prepareTreatmentConsent).toHaveBeenCalledWith('patient', 'unlock', expect.any(String), false);
  expect(consent.sendTreatmentConsent).toHaveBeenCalledWith('patient', 'unlock', readyDocument.requestId, readyDocument.sha256, expect.any(String));
  expect(screen.queryByText(readyDocument.html)).toBeNull();
  expect(screen.queryByText('Enviar ahora')).toBeNull();
});

test('an uncertain direct send retries the same request and operation without preparing another document', async () => {
  jest.mocked(consent.getTreatmentConsent).mockResolvedValue(enabled);
  jest.mocked(consent.prepareTreatmentConsent).mockResolvedValue(readyDocument);
  jest.mocked(consent.sendTreatmentConsent).mockRejectedValueOnce(new Error('Envío sin confirmar')).mockResolvedValue({ ...enabled, status: 'SENT' });
  show();
  await screen.findByText('Pendiente');
  fireEvent.press(screen.getByText('Enviar para firma'));
  fireEvent.press(screen.getByText('Enviar ahora'));
  await screen.findByText('Envío sin confirmar');
  fireEvent.press(screen.getByText('Enviar ahora'));
  await screen.findByText('Enviado');
  expect(consent.prepareTreatmentConsent).toHaveBeenCalledTimes(1);
  expect(jest.mocked(consent.sendTreatmentConsent).mock.calls[0]).toEqual(jest.mocked(consent.sendTreatmentConsent).mock.calls[1]);
});

test('direct sending respects a document that the server no longer allows sending', async () => {
  jest.mocked(consent.getTreatmentConsent).mockResolvedValue(enabled);
  jest.mocked(consent.prepareTreatmentConsent).mockResolvedValue({ ...readyDocument, canSend: false, sendUnavailableReason: 'Documento no disponible para enviar.' });
  show();
  await screen.findByText('Pendiente');
  fireEvent.press(screen.getByText('Enviar para firma'));
  fireEvent.press(screen.getByText('Enviar ahora'));
  await screen.findByText('Documento no disponible para enviar.');
  expect(consent.sendTreatmentConsent).not.toHaveBeenCalled();
});

test('a definitive send rejection allows preparing a fresh document with a new operation key', async () => {
  jest.mocked(consent.getTreatmentConsent).mockResolvedValue(enabled);
  jest.mocked(consent.prepareTreatmentConsent).mockResolvedValueOnce(readyDocument).mockResolvedValueOnce({ ...readyDocument, requestId: 'fresh-request' });
  jest.mocked(consent.sendTreatmentConsent).mockRejectedValueOnce(new ClinicalRequestError({
    isAxiosError: true, response: { status: 409, data: { error: 'Prepara un documento nuevo.' } },
  }, 'Prepara un documento nuevo.')).mockResolvedValue({ ...enabled, status: 'SENT' });
  show();
  await screen.findByText('Pendiente');
  fireEvent.press(screen.getByText('Enviar para firma'));
  fireEvent.press(screen.getByText('Enviar ahora'));
  await screen.findByText('Prepara un documento nuevo.');
  fireEvent.press(screen.getByText('Enviar ahora'));
  await screen.findByText('Enviado');
  expect(consent.prepareTreatmentConsent).toHaveBeenCalledTimes(2);
  const calls = jest.mocked(consent.sendTreatmentConsent).mock.calls;
  expect(calls[1][2]).toBe('fresh-request');
  expect(calls[1][4]).not.toBe(calls[0][4]);
});

test('changing patient while preparing does not send the previous patient document', async () => {
  let resolveDocument!: (document: consent.TreatmentPreview) => void;
  jest.mocked(consent.getTreatmentConsent).mockResolvedValue(enabled);
  jest.mocked(consent.prepareTreatmentConsent).mockImplementationOnce(() => new Promise(resolve => { resolveDocument = resolve; }));
  const view = show();
  await screen.findByText('Pendiente');
  fireEvent.press(screen.getByText('Enviar para firma'));
  fireEvent.press(screen.getByText('Enviar ahora'));
  view.rerender(<TreatmentConsentPanel clientId="another-patient" token="another-unlock" onChanged={async () => undefined} />);
  await act(async () => resolveDocument(readyDocument));
  expect(consent.sendTreatmentConsent).not.toHaveBeenCalled();
  expect(screen.queryByText(readyDocument.html)).toBeNull();
});

test('withdrawal remains available and direct sending keeps its distinct request kind', async () => {
  jest.mocked(consent.getTreatmentConsent).mockResolvedValue({ ...enabled, status: 'SIGNED', evidenceRequestId: 'accepted-request' });
  jest.mocked(consent.prepareTreatmentConsent).mockResolvedValue(readyDocument);
  jest.mocked(consent.sendTreatmentConsent).mockResolvedValue({ ...enabled, status: 'SIGNED' });
  show();
  await screen.findByText('Firmado');
  expect(screen.getByRole('button', { name: 'Ver documento aceptado' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Descargar justificante' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Registrar retirada' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Corregir registro' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Ver historial' })).toBeTruthy();
  fireEvent.press(screen.getByText('Solicitar retirada al paciente'));
  fireEvent.press(screen.getByText('Enviar ahora'));
  await waitFor(() => expect(consent.prepareTreatmentConsent).toHaveBeenCalledWith('patient', 'unlock', expect.any(String), true));
  await waitFor(() => expect(consent.sendTreatmentConsent).toHaveBeenCalledTimes(1));
});
