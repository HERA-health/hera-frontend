import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RequiredLegalAcceptanceScreen } from '../RequiredLegalAcceptanceScreen';
import { withdrawReligion } from '../../../services/profileDiscoveryService';
import { acceptLegalDocuments, type LegalAcceptanceStatus } from '../../../services/legalService';
import { disconnectGoogleCalendar } from '../../../services/googleCalendarService';
import { PrivacyControlsVisibleContext } from '../../../components/common/PrivacyPreferences';

const mockNavigate = jest.fn();
let mockFocused = true;

jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ logout: jest.fn(), user: { type: 'professional' } }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }), useIsFocused: () => mockFocused }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../LegalGateLayout', () => ({ LegalGateLayout: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../../../services/googleCalendarService', () => ({ disconnectGoogleCalendar: jest.fn() }));
jest.mock('../../../services/profileDiscoveryService', () => ({ withdrawReligion: jest.fn() }));
jest.mock('../../../services/legalService', () => ({ acceptLegalDocuments: jest.fn() }));

beforeEach(() => { jest.clearAllMocks(); mockFocused = true; });

test('withdraws without accepting new documents and preserves the legal gate', async () => {
  jest.mocked(withdrawReligion).mockResolvedValue({ religionCode: null, hasPublication: false, hasDeclaration: false });
  const onAccepted = jest.fn();
  render(<RequiredLegalAcceptanceScreen requiredDocumentKeys={['PRIVACY_POLICY']} onAccepted={onAccepted} />);
  expect(screen.getByText('Aceptar y continuar')).toBeDisabled();
  expect(screen.queryByText('Retirar mi religión o creencias')).toBeNull();
  fireEvent.press(screen.getByText('Opciones de privacidad'));
  fireEvent.press(screen.getByText('Retirar mi religión o creencias'));
  await screen.findByText('Tu declaración de religión o creencias se ha eliminado.');
  expect(withdrawReligion).toHaveBeenCalledTimes(1);
  expect(acceptLegalDocuments).not.toHaveBeenCalled();
  expect(onAccepted).not.toHaveBeenCalled();
});

test('failed withdrawal remains retryable and never reports success', async () => {
  jest.mocked(withdrawReligion).mockRejectedValueOnce(new Error('Error de conexión'))
    .mockResolvedValueOnce({ religionCode: null, hasPublication: false });
  render(<RequiredLegalAcceptanceScreen requiredDocumentKeys={[]} onAccepted={jest.fn()} />);
  fireEvent.press(screen.getByText('Opciones de privacidad'));
  fireEvent.press(screen.getByText('Retirar mi religión o creencias'));
  await waitFor(() => expect(screen.getByText('Retirar mi religión o creencias')).not.toBeDisabled());
  expect(screen.queryByText('Tu declaración de religión o creencias se ha eliminado.')).toBeNull();
  fireEvent.press(screen.getByText('Retirar mi religión o creencias'));
  await screen.findByText('Tu declaración de religión o creencias se ha eliminado.');
  expect(withdrawReligion).toHaveBeenCalledTimes(2);
});

const acceptedStatus: LegalAcceptanceStatus = {
  documents: [], requiredDocumentKeys: [], acceptedDocuments: [], missingDocumentKeys: [], requiresAcceptance: false,
};

test('requires explicit acceptance, submits exact document versions once and handles the result', async () => {
  let resolveAcceptance!: (status: LegalAcceptanceStatus) => void;
  jest.mocked(acceptLegalDocuments).mockImplementationOnce(() => new Promise(resolve => { resolveAcceptance = resolve; }));
  const onAccepted = jest.fn();
  const documents = [{ key: 'PRIVACY_POLICY' as const, version: '2026-09-27', contentHash: 'version-proof', title: 'Política de privacidad', publicPath: '/legal/privacidad' }];
  render(<RequiredLegalAcceptanceScreen requiredDocumentKeys={['PRIVACY_POLICY']} documents={documents} onAccepted={onAccepted} />);
  fireEvent.press(screen.getByLabelText('Aceptar y continuar'));
  expect(acceptLegalDocuments).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.press(screen.getByLabelText('Aceptar y continuar'));
  fireEvent.press(screen.getByLabelText('Aceptar y continuar'));
  expect(acceptLegalDocuments).toHaveBeenCalledTimes(1);
  expect(acceptLegalDocuments).toHaveBeenCalledWith(['PRIVACY_POLICY'], 'required-gate', documents);
  expect(screen.getByLabelText('Cerrar sesión')).toBeDisabled();
  await act(async () => resolveAcceptance(acceptedStatus));
  expect(onAccepted).toHaveBeenCalledWith(acceptedStatus);
});

test('keeps the gate after a failed acceptance and allows retry', async () => {
  jest.mocked(acceptLegalDocuments).mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce(acceptedStatus);
  const onAccepted = jest.fn();
  render(<RequiredLegalAcceptanceScreen requiredDocumentKeys={['PRIVACY_POLICY']} onAccepted={onAccepted} />);
  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.press(screen.getByLabelText('Aceptar y continuar'));
  await screen.findByRole('alert');
  expect(onAccepted).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Aceptar y continuar'));
  await waitFor(() => expect(onAccepted).toHaveBeenCalledWith(acceptedStatus));
});

test('opens the requested version, hides while reading and restores the checkbox on return', () => {
  const props = { requiredDocumentKeys: ['PRIVACY_POLICY' as const], onAccepted: jest.fn() };
  const { rerender } = render(<RequiredLegalAcceptanceScreen {...props} />);
  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.press(screen.getByRole('button', { name: /Leer Política de privacidad/ }));
  expect(mockNavigate).toHaveBeenCalledWith('LegalDocument', expect.objectContaining({ documentKey: 'PRIVACY_POLICY', version: expect.any(String) }));
  mockFocused = false;
  rerender(<RequiredLegalAcceptanceScreen {...props} />);
  expect(screen.queryByRole('checkbox')).toBeNull();
  mockFocused = true;
  rerender(<RequiredLegalAcceptanceScreen {...props} />);
  expect(screen.getByRole('checkbox')).toBeChecked();
});

test('yields to privacy preferences without accepting and restores the mandatory dialog', () => {
  const onAccepted = jest.fn();
  const view = (visible: boolean) => <PrivacyControlsVisibleContext.Provider value={visible}>
    <RequiredLegalAcceptanceScreen requiredDocumentKeys={['PRIVACY_POLICY']} onAccepted={onAccepted} />
  </PrivacyControlsVisibleContext.Provider>;
  const { rerender } = render(view(false));
  rerender(view(true));
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(onAccepted).not.toHaveBeenCalled();
  rerender(view(false));
  expect(screen.getByLabelText('Aceptar y continuar')).toBeDisabled();
});

test('disconnects Calendar without accepting and displays a success, not an error', async () => {
  jest.mocked(disconnectGoogleCalendar).mockResolvedValue({
    enabled: false, status: 'DISCONNECTED', email: null, pending: 0, failed: 0,
    lastSyncedAt: null, errorCode: null, reconciling: false,
  });
  const onAccepted = jest.fn();
  render(<RequiredLegalAcceptanceScreen requiredDocumentKeys={['PRIVACY_POLICY']} onAccepted={onAccepted} />);
  fireEvent.press(screen.getByText('Opciones de privacidad'));
  fireEvent.press(screen.getByLabelText('Desconectar Google Calendar'));
  await screen.findByText('Desconexión solicitada. Las copias existentes permanecen en Google.');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(onAccepted).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Aceptar y continuar')).toBeDisabled();
});
