import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccountTreatmentConsentScreen } from '../AccountTreatmentConsentScreen';
import { ClinicalConsentScreen } from '../ClinicalConsentScreen';
import { useRoute } from '@react-navigation/native';
import * as legacyConsent from '../../../services/clinicalService';
import * as consent from '../../../services/treatmentConsentService';
import { useAuth } from '../../../contexts/AuthContext';
import { lightTheme as mockTheme } from '../../../constants/theme';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: mockTheme }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }), useRoute: jest.fn() }));
jest.mock('../../../services/clinicalService', () => ({ resolveDigitalConsentRequest: jest.fn() }));
jest.mock('../../../services/treatmentConsentService', () => ({
  getAccountTreatmentConsent: jest.fn(),
  decideAccountTreatmentConsent: jest.fn(),
  downloadAccountReceipt: jest.fn(),
}));
jest.mock('../../../components/professional/TreatmentConsentDocument', () => ({
  TreatmentConsentDocument: ({ html }: { html: string }) => {
    const { Text } = require('react-native');
    return <Text>{html}</Text>;
  },
}));
const doc: consent.AccountTreatmentConsent = {
  id: 'request',
  purpose: 'TREATMENT_CONSENT',
  status: 'PENDING',
  requestKind: 'GRANT',
  version: 'v1',
  sha256: 'a'.repeat(64),
  html: 'Documento privado sintético',
  acceptedAt: null,
};
const auth = (id: string) =>
  jest.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    isInitialized: true,
    loading: false,
    error: null,
    legalStatusSnapshot: null,
    verificationSubmitted: false,
    user: { id, type: 'client', name: 'Paciente sintético', email: 'synthetic@example.test' },
    markVerificationSubmitted: jest.fn(),
    login: jest.fn(),
    authenticateWithGoogle: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    setUserType: jest.fn(),
    updateUser: jest.fn(),
    refreshCurrentUser: jest.fn(),
    clearError: jest.fn(),
  });
beforeEach(() => {
  jest.clearAllMocks();
  auth('patient');
  jest.mocked(consent.getAccountTreatmentConsent).mockResolvedValue(doc);
  jest.mocked(consent.downloadAccountReceipt).mockResolvedValue(undefined);
});

test('account acceptance sends reviewed hash and exposes receipt only after acceptance', async () => {
  jest
    .mocked(consent.decideAccountTreatmentConsent)
    .mockResolvedValue({ ...doc, status: 'ACCEPTED', acceptedAt: '2026-10-26T12:00:00Z' });
  render(<AccountTreatmentConsentScreen requestId="request" token="token" />);
  await screen.findByText(doc.html);
  expect(screen.queryByText('Descargar documento y justificante')).toBeNull();
  fireEvent.press(screen.getByText('Aceptar consentimiento informado'));
  await screen.findByText('Tu consentimiento ha quedado registrado.');
  expect(consent.decideAccountTreatmentConsent).toHaveBeenCalledWith(
    'request',
    'token',
    doc.sha256,
    'ACCEPT',
  );
  fireEvent.press(screen.getByText('Descargar documento y justificante'));
  await waitFor(() => expect(consent.downloadAccountReceipt).toHaveBeenCalledWith('request'));
});

test('changing account immediately hides the previous personalized document', async () => {
  const view = render(<AccountTreatmentConsentScreen requestId="request" token="token" />);
  await screen.findByText(doc.html);
  auth('other-patient');
  jest
    .mocked(consent.getAccountTreatmentConsent)
    .mockRejectedValue(new Error('Solicitud no disponible'));
  view.rerender(<AccountTreatmentConsentScreen requestId="request" token="token" />);
  expect(screen.queryByText(doc.html)).toBeNull();
  await screen.findByText('Solicitud no disponible');
  expect(screen.queryByText('Aceptar consentimiento informado')).toBeNull();
});

test('changing from a treatment link to a historical HERA link resets the document screen', async () => {
  jest.mocked(useRoute).mockReturnValue({ key: 'consent', name: 'ClinicalConsent', params: { requestId: 'request', token: 'token' } });
  jest.mocked(legacyConsent.resolveDigitalConsentRequest).mockRejectedValue({ code: 'CLINICAL_TREATMENT_CONSENT_ROUTE_REQUIRED', message: 'Use treatment route' });
  const view = render(<ClinicalConsentScreen />);
  await screen.findByText(doc.html);
  jest.mocked(useRoute).mockReturnValue({ key: 'consent', name: 'ClinicalConsent', params: { requestId: 'historical', token: 'historical-token' } });
  jest.mocked(legacyConsent.resolveDigitalConsentRequest).mockRejectedValue(new Error('Enlace histórico no disponible'));
  view.rerender(<ClinicalConsentScreen />);
  expect(screen.queryByText(doc.html)).toBeNull();
  await screen.findByText('Enlace histórico no disponible');
  expect(legacyConsent.resolveDigitalConsentRequest).toHaveBeenLastCalledWith('historical', 'historical-token');
});
