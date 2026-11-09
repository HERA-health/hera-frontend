import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';

let mockReady = false;
let mockUserType = 'CLIENT';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), canGoBack: () => false }),
  useRoute: () => ({ params: { userType: mockUserType } }),
}));
jest.mock('../../../contexts/QuestionnaireDraftContext', () => ({ useQuestionnaireDraft: () => ({ ready: mockReady }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ login: jest.fn(), authenticateWithGoogle: jest.fn(), logout: jest.fn(), clearError: jest.fn(), loading: false }) }));
jest.mock('../../../services/analyticsService', () => ({ trackScreen: jest.fn(), track: jest.fn() }));
jest.mock('../../../components/auth', () => ({
  AuthSplitLayout: ({ form, variant = 'split' }: { form: React.ReactNode; variant?: string }) => {
    const { View } = jest.requireActual('react-native');
    return <View testID={'auth-layout-' + variant}>{form}</View>;
  },
  GoogleAuthButton: () => null,
}));

test.each([
  [false, 'CLIENT'],
  [true, 'CLIENT'],
  [true, 'PROFESSIONAL'],
  [true, 'CLINIC'],
])('preserves standard login with pending questionnaire %s and account %s', (ready, userType) => {
  mockReady = ready;
  mockUserType = userType;
  render(<LoginScreen />);
  expect(screen.getByTestId('auth-layout-split')).toBeTruthy();
  expect(screen.getByText('Accede con tu cuenta para continuar.')).toBeTruthy();
  expect(screen.queryByText('Tu cuestionario está listo para guardar')).toBeNull();
});
