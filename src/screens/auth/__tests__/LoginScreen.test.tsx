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
  AuthSplitLayout: ({ form }: { form: React.ReactNode }) => form,
  GoogleAuthButton: () => null,
}));

test.each([
  [false, 'CLIENT', false],
  [true, 'CLIENT', true],
  [true, 'PROFESSIONAL', false],
  [true, 'CLINIC', false],
])('pending questionnaire %s with %s access displays context: %s', (ready, userType, visible) => {
  mockReady = ready;
  mockUserType = userType;
  render(<LoginScreen />);
  expect(Boolean(screen.queryByText('Tu cuestionario está listo para guardar'))).toBe(visible);
});
