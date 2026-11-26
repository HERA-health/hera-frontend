import { useEffect } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAgendaPreferences, updateAgendaPreferences } from '../../../../../services/professionalService';
import { useBookingConfirmation } from '../useBookingConfirmation';

jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('../../../../../services/professionalService', () => ({ getAgendaPreferences: jest.fn(), updateAgendaPreferences: jest.fn() }));
const preferences = { autoConfirmSessionRequests: false, emailSessionRequestsEnabled: true, emailSessionCancellationsEnabled: false, emailSessionReminder24hEnabled: true };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useFocusEffect).mockImplementation(callback => useEffect(callback, [callback]));
  jest.mocked(getAgendaPreferences).mockResolvedValue(preferences);
});

it('reads the saved setting and submits only one change while saving', async () => {
  let complete: (value: typeof preferences) => void = () => {};
  jest.mocked(updateAgendaPreferences).mockReturnValue(new Promise(resolve => { complete = resolve; }));
  const { result } = renderHook(useBookingConfirmation);
  expect(result.current.value).toBeNull();
  await waitFor(() => expect(result.current.value).toBe(false));
  act(() => { result.current.change(true); result.current.change(true); });
  expect(result.current.saving).toBe(true);
  expect(updateAgendaPreferences).toHaveBeenCalledTimes(1);
  expect(updateAgendaPreferences).toHaveBeenCalledWith({ autoConfirmSessionRequests: true });
  await act(async () => complete({ ...preferences, autoConfirmSessionRequests: true }));
  expect(result.current.value).toBe(true);
  expect(result.current.saving).toBe(false);
});

it('recovers from missing preferences and rechecks the server after a failed write', async () => {
  jest.mocked(getAgendaPreferences).mockResolvedValueOnce(null);
  jest.mocked(updateAgendaPreferences).mockRejectedValueOnce(new Error('Network unavailable'));
  const { result } = renderHook(useBookingConfirmation);
  await waitFor(() => expect(result.current.error).toBeTruthy());
  expect(result.current.value).toBeNull();
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.value).toBe(false));
  await act(async () => result.current.change(true));
  expect(result.current.value).toBe(false);
  expect(result.current.error).toBeTruthy();
  jest.mocked(getAgendaPreferences).mockResolvedValueOnce({ ...preferences, autoConfirmSessionRequests: true });
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.value).toBe(true));
  expect(result.current.error).toBe('');
});

it('waits for a save from the previous screen before loading the new screen', async () => {
  let finishSave: (saved: typeof preferences) => void = () => {};
  jest.mocked(updateAgendaPreferences).mockReturnValue(new Promise(resolve => { finishSave = resolve; }));
  const previous = renderHook(useBookingConfirmation);
  await waitFor(() => expect(previous.result.current.value).toBe(false));
  act(() => previous.result.current.change(true));
  previous.unmount();
  const updated = { ...preferences, autoConfirmSessionRequests: true };
  jest.mocked(getAgendaPreferences).mockResolvedValue(updated);
  const next = renderHook(useBookingConfirmation);
  expect(next.result.current.value).toBeNull();
  expect(getAgendaPreferences).toHaveBeenCalledTimes(1);
  await act(async () => finishSave(updated));
  await waitFor(() => expect(next.result.current.value).toBe(true));
  expect(getAgendaPreferences).toHaveBeenCalledTimes(2);
});
