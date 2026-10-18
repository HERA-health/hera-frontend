import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { lightTheme as mockTheme } from '../../../constants/theme';
import { RegisterScreen } from '../RegisterScreen';

let mockParams: { userType?: string } | undefined;
const mockRegister = jest.fn();
const mockGoogle = jest.fn();
const mockLegalCatalog = jest.fn().mockResolvedValue([]);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), canGoBack: () => false }),
  useRoute: () => ({ key: 'register', name: 'Register', params: mockParams }),
}));
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister, authenticateWithGoogle: mockGoogle, loading: false, clearError: jest.fn() }),
}));
jest.mock('../../../services/legalService', () => ({ getLegalCatalog: () => mockLegalCatalog() }));
jest.mock('../../../services/authService', () => ({ sendVerificationEmail: jest.fn() }));
jest.mock('../../../services/analyticsService', () => ({ trackScreen: jest.fn(), track: jest.fn() }));
jest.mock('../../../components/auth', () => {
  const { Text, View } = jest.requireActual('react-native');
  return {
    AuthSplitLayout: ({ eyebrow, form }: { eyebrow: string; form: React.ReactNode }) => <View><Text>{eyebrow}</Text>{form}</View>,
    GoogleAuthButton: () => null,
    PasswordRequirementsChecklist: () => null,
  };
});

beforeEach(() => {
  mockParams = undefined;
  jest.clearAllMocks();
});

it.each([
  [undefined, 'Alta paciente'],
  [{}, 'Alta paciente'],
  [{ userType: 'CLIENT' }, 'Alta paciente'],
  [{ userType: 'PROFESSIONAL' }, 'Alta profesional'],
  [{ userType: 'CLINIC' }, 'Alta de clínica'],
  [{ userType: '' }, 'Alta paciente'],
  [{ userType: 'unrecognized' }, 'Alta paciente'],
])('opens registration with params %j', async (params, eyebrow) => {
  mockParams = params;
  render(<RegisterScreen />);
  await waitFor(() => expect(mockLegalCatalog).toHaveBeenCalledTimes(1));
  expect(screen.getByText(eyebrow)).toBeTruthy();
  expect(screen.getByText('Paciente')).toBeTruthy();
  expect(screen.getByText('Especialista')).toBeTruthy();
  expect(screen.getByText('Clínica')).toBeTruthy();
  expect(mockRegister).not.toHaveBeenCalled();
  expect(mockGoogle).not.toHaveBeenCalled();
});

it('lets direct visitors choose another account type', async () => {
  render(<RegisterScreen />);
  await waitFor(() => expect(mockLegalCatalog).toHaveBeenCalledTimes(1));
  fireEvent.press(screen.getByText('Especialista'));
  expect(screen.getByText('Alta profesional')).toBeTruthy();
  fireEvent.press(screen.getByText('Clínica'));
  expect(screen.getByText('Alta de clínica')).toBeTruthy();
  fireEvent.press(screen.getByText('Paciente'));
  expect(screen.getByText('Alta paciente')).toBeTruthy();
});
