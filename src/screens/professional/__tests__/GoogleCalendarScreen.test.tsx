import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GoogleCalendarScreen } from '../GoogleCalendarScreen';
import { completeGoogleCalendar } from '../../../services/googleCalendarService';
import { clearCalendarIntent } from '../../../services/googleCalendarIntent';

const mockDispatch = jest.fn();
const mockNavigation = { dispatch: mockDispatch, navigate: jest.fn() };
let mockAttempt: string | undefined = 'attempt';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { attempt: mockAttempt } }),
  StackActions: { replace: (name: string, params: unknown) => ({ type: 'REPLACE', payload: { name, params } }) },
}));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'professional', type: 'professional' } }) }));
jest.mock('../../../components/professional/GoogleCalendarCard', () => ({ GoogleCalendarCard: () => null }));
jest.mock('../../../services/googleCalendarService', () => ({ completeGoogleCalendar: jest.fn() }));
jest.mock('../../../services/googleCalendarIntent', () => ({ clearCalendarIntent: jest.fn(), getCalendarIntent: () => null }));

beforeEach(() => { jest.clearAllMocks(); mockAttempt = 'attempt'; });

test('old setup links without an OAuth attempt redirect to the Google tab', async () => {
  mockAttempt = undefined;
  render(<GoogleCalendarScreen />);
  await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: 'REPLACE', payload: { name: 'ProfessionalProfile', params: { initialTab: 'google' } } }));
  expect(completeGoogleCalendar).not.toHaveBeenCalled();
});

test('successful authorization replaces the callback with the Google tab automatically', async () => {
  jest.mocked(completeGoogleCalendar).mockResolvedValue({ enabled: true, status: 'CONNECTED', email: null, pending: 0, failed: 0, lastSyncedAt: null, errorCode: null, reconciling: true });
  render(<GoogleCalendarScreen />);
  await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: 'REPLACE', payload: { name: 'ProfessionalProfile', params: { initialTab: 'google' } } }));
  expect(completeGoogleCalendar).toHaveBeenCalledWith('professional', 'attempt');
  expect(clearCalendarIntent).toHaveBeenCalled();
});

test('failed authorization remains visible instead of redirecting as if connected', async () => {
  jest.mocked(completeGoogleCalendar).mockRejectedValue(new Error('La vinculación ha caducado.'));
  render(<GoogleCalendarScreen />);
  await screen.findByRole('alert');
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(screen.getByText('Volver a ajustes de Google')).toBeTruthy();
  fireEvent.press(screen.getByText('Volver a ajustes de Google'));
  expect(mockNavigation.navigate).toHaveBeenCalledWith('ProfessionalProfile', { initialTab: 'google' });
  expect(clearCalendarIntent).toHaveBeenCalled();
});
