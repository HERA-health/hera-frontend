import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RequiredLegalAcceptanceScreen } from '../RequiredLegalAcceptanceScreen';
import { withdrawReligion } from '../../../services/profileDiscoveryService';
import { acceptLegalDocuments } from '../../../services/legalService';

jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ logout: jest.fn(), user: { type: 'professional' } }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../../../components/common/PrivacyPreferences', () => ({ PrivacyPreferencesButton: () => null }));
jest.mock('../../../services/googleCalendarService', () => ({ disconnectGoogleCalendar: jest.fn() }));
jest.mock('../../../services/profileDiscoveryService', () => ({ withdrawReligion: jest.fn() }));
jest.mock('../../../services/legalService', () => ({ acceptLegalDocuments: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

test('withdraws without accepting new documents and preserves the legal gate', async () => {
  jest.mocked(withdrawReligion).mockResolvedValue({ religionCode: null, hasPublication: false, hasDeclaration: false });
  const onAccepted = jest.fn();
  render(<RequiredLegalAcceptanceScreen requiredDocumentKeys={['PRIVACY_POLICY']} onAccepted={onAccepted} />);
  expect(screen.getByText('Aceptar y continuar')).toBeDisabled();
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
  fireEvent.press(screen.getByText('Retirar mi religión o creencias'));
  await waitFor(() => expect(screen.getByText('Retirar mi religión o creencias')).not.toBeDisabled());
  expect(screen.queryByText('Tu declaración de religión o creencias se ha eliminado.')).toBeNull();
  fireEvent.press(screen.getByText('Retirar mi religión o creencias'));
  await screen.findByText('Tu declaración de religión o creencias se ha eliminado.');
  expect(withdrawReligion).toHaveBeenCalledTimes(2);
});
