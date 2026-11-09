import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { lightTheme as mockTheme } from '../../../constants/theme';
import { RegisterScreen } from '../RegisterScreen';
import { LEGAL_DOCUMENTS } from '../../../constants/legal';
import { RegistrationPhoneError } from '../../../utils/registrationPhone';

let mockParams: { userType?: string } | undefined;
let mockQuestionnaireReady = false;
jest.mock('../../../contexts/QuestionnaireDraftContext', () => ({ useQuestionnaireDraft: () => ({ ready: mockQuestionnaireReady }) }));
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
  const { Text, View, Pressable } = jest.requireActual('react-native');
  return {
    AuthSplitLayout: ({ eyebrow, form }: { eyebrow: string; form: React.ReactNode }) => <View><Text>{eyebrow}</Text>{form}</View>,
    GoogleAuthButton: ({ onCredential }: { onCredential: (token: string) => void }) => <Pressable accessibilityRole="button" onPress={() => onCredential('test-google-token')}><Text>Continuar con Google</Text></Pressable>,
    PasswordRequirementsChecklist: () => null,
  };
});

beforeEach(() => {
  mockParams = undefined;
  mockQuestionnaireReady = false;
  jest.clearAllMocks();
  mockRegister.mockReset();
  mockGoogle.mockReset();
  mockLegalCatalog.mockResolvedValue(Object.values(LEGAL_DOCUMENTS));
});

it('preserves standard registration when a questionnaire is pending', async () => {
  mockQuestionnaireReady = true;
  render(<RegisterScreen />);
  await waitFor(() => expect(mockLegalCatalog).toHaveBeenCalledTimes(1));
  expect(screen.getAllByText('Crear cuenta').length).toBeGreaterThan(0);
  expect(screen.getByText('Matching inteligente con especialistas')).toBeTruthy();
  expect(screen.queryByText('Un paso más para ver tus resultados')).toBeNull();
  expect(screen.queryByText('Tu cuestionario está listo para guardar')).toBeNull();
  await act(async () => { fireEvent.press(screen.getByText('Especialista')); });
  expect(screen.queryByText('Tu cuestionario está listo para guardar')).toBeNull();
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
  await act(async () => fireEvent.press(screen.getByText('Especialista')));
  expect(screen.getByText('Alta profesional')).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText('Clínica')));
  expect(screen.getByText('Alta de clínica')).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText('Paciente')));
  expect(screen.getByText('Alta paciente')).toBeTruthy();
});

const phoneLabel = 'Teléfono de contacto (obligatorio)';
const acceptTerms = () => fireEvent.press(screen.getByText(/Confirmo haber recibido/));
const fillEmailRegistration = () => {
  fireEvent.changeText(screen.getByPlaceholderText('Tu nombre y apellidos'), 'Profesional de prueba');
  fireEvent.changeText(screen.getByPlaceholderText('tu@email.com'), 'professional@example.test');
  fireEvent.changeText(screen.getByPlaceholderText('Crea tu contraseña'), 'Password1!');
  fireEvent.changeText(screen.getByPlaceholderText('Repite tu contraseña'), 'Password1!');
};
const openProfessional = async () => {
  mockParams = { userType: 'PROFESSIONAL' };
  render(<RegisterScreen />);
  await waitFor(() => expect(mockLegalCatalog).toHaveBeenCalledTimes(1));
  acceptTerms();
};

it.each(['', 'invalid-phone'])('blocks email signup with phone %s and preserves the form and terms for retry', async phone => {
  await openProfessional();
  fillEmailRegistration();
  fireEvent.changeText(screen.getByLabelText(phoneLabel), phone);
  fireEvent.press(screen.getByRole('button', { name: /Crear cuenta/ }));
  await screen.findByText(phone ? /Introduce un teléfono válido/ : /Introduce un teléfono de contacto para crear/);
  expect(mockRegister).not.toHaveBeenCalled();
  expect(mockLegalCatalog).toHaveBeenCalledTimes(1);
  expect(screen.getByPlaceholderText('tu@email.com').props.value).toBe('professional@example.test');

  fireEvent.changeText(screen.getByLabelText(phoneLabel), '600 123 456');
  fireEvent.press(screen.getByRole('button', { name: /Crear cuenta/ }));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
  expect(mockRegister.mock.calls[0][7]).toBe('+34600123456');
});

it('allows Google to identify an existing account without requiring a phone locally', async () => {
  await openProfessional();
  fireEvent.press(screen.getByRole('button', { name: 'Continuar con Google' }));
  await waitFor(() => expect(mockGoogle).toHaveBeenCalledWith(expect.objectContaining({ phone: '', userType: 'PROFESSIONAL' })));
  expect(screen.queryByText(/Introduce un teléfono de contacto para crear/)).toBeNull();
});

it.each(['PHONE_REQUIRED', 'INVALID_PHONE'] as const)('shows Google %s at the field and retries without resetting terms', async code => {
  await openProfessional();
  mockGoogle.mockRejectedValueOnce(new RegistrationPhoneError(code));
  fireEvent.press(screen.getByRole('button', { name: 'Continuar con Google' }));
  await screen.findByText(new RegistrationPhoneError(code).message);
  expect(mockLegalCatalog).toHaveBeenCalledTimes(1);
  fireEvent.changeText(screen.getByLabelText(phoneLabel), '+44 20 7946 0958');
  fireEvent.press(screen.getByRole('button', { name: 'Continuar con Google' }));
  await waitFor(() => expect(mockGoogle).toHaveBeenCalledTimes(2));
  expect(mockGoogle).toHaveBeenLastCalledWith(expect.objectContaining({ phone: '+44 20 7946 0958' }));
});

it.each(['Paciente', 'Clínica'])('clears phone errors and omits phone when switching to %s', async type => {
  await openProfessional();
  mockGoogle.mockRejectedValueOnce(new RegistrationPhoneError('INVALID_PHONE'));
  fireEvent.changeText(screen.getByLabelText(phoneLabel), 'invalid-phone');
  fireEvent.press(screen.getByRole('button', { name: 'Continuar con Google' }));
  await screen.findByText(/Introduce un teléfono válido/);
  fireEvent.press(screen.getByText(type));
  await waitFor(() => expect(mockLegalCatalog).toHaveBeenCalledTimes(2));
  expect(screen.queryByLabelText(phoneLabel)).toBeNull();
  expect(screen.queryByText(/Introduce un teléfono válido/)).toBeNull();
  if (type === 'Clínica') fireEvent.changeText(screen.getByPlaceholderText('Clínica HERA Norte'), 'Clínica de prueba');
  acceptTerms();
  fireEvent.press(screen.getByRole('button', { name: 'Continuar con Google' }));
  await waitFor(() => expect(mockGoogle).toHaveBeenCalledTimes(2));
  expect(mockGoogle.mock.calls[1][0]).not.toHaveProperty('phone');
});


it('registers a patient with separate name and surnames and an optional phone', async () => {
  mockParams = { userType: 'CLIENT' };
  render(<RegisterScreen />);
  await waitFor(() => expect(mockLegalCatalog).toHaveBeenCalledTimes(1));
  fireEvent.changeText(screen.getByPlaceholderText('Tu nombre'), 'Ana');
  fireEvent.changeText(screen.getByLabelText('Apellidos'), 'García López');
  fireEvent.changeText(screen.getByPlaceholderText('tu@email.com'), 'patient@example.test');
  fireEvent.changeText(screen.getByPlaceholderText('Crea tu contraseña'), 'Password1!');
  fireEvent.changeText(screen.getByPlaceholderText('Repite tu contraseña'), 'Password1!');
  acceptTerms();
  fireEvent.press(screen.getByRole('button', { name: /Crear cuenta/ }));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
  expect(mockRegister.mock.calls[0][2]).toBe('Ana García López');
  expect(mockRegister.mock.calls[0][7]).toBeUndefined();
});
