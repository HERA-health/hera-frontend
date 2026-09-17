import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { GoogleCalendarScreen } from '../GoogleCalendarScreen';
import { completeGoogleCalendar } from '../../../services/googleCalendarService';
import { clearCalendarIntent } from '../../../services/googleCalendarIntent';

const mockDispatch = jest.fn();
const mockNavigation = { dispatch: mockDispatch, navigate: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { attempt: 'attempt' } }),
  StackActions: { replace: (name: string, params: unknown) => ({ type: 'REPLACE', payload: { name, params } }) },
}));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'professional', type: 'professional' } }) }));
jest.mock('../../../components/professional/GoogleCalendarCard', () => ({ GoogleCalendarCard: () => null }));
jest.mock('../../../services/googleCalendarService', () => ({ completeGoogleCalendar: jest.fn() }));
jest.mock('../../../services/googleCalendarIntent', () => ({ clearCalendarIntent: jest.fn(), getCalendarIntent: () => null }));

beforeEach(() => jest.clearAllMocks());

test('successful authorization replaces the callback with account settings automatically', async () => {
  jest.mocked(completeGoogleCalendar).mockResolvedValue({ enabled: true, status: 'CONNECTED', email: null, pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: true });
  render(<GoogleCalendarScreen />);
  await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: 'REPLACE', payload: { name: 'ProfessionalProfile', params: { initialTab: 'account' } } }));
  expect(completeGoogleCalendar).toHaveBeenCalledWith('professional', 'attempt');
  expect(clearCalendarIntent).toHaveBeenCalled();
});

test('failed authorization remains visible instead of redirecting as if connected', async () => {
  jest.mocked(completeGoogleCalendar).mockRejectedValue(new Error('La vinculación ha caducado.'));
  render(<GoogleCalendarScreen />);
  await screen.findByRole('alert');
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(screen.getByText('Volver a ajustes de cuenta')).toBeTruthy();
});
