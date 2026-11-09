import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePatientSpecialists } from '../usePatientSpecialists';
import * as service from '../../../services/specialistsService';
import { useDiscoveryRevalidation } from '../../../hooks/useDiscoveryRevalidation';
jest.mock('../../../hooks/useDiscoveryRevalidation', () => ({ useDiscoveryRevalidation: jest.fn() }));
jest.mock('../../../services/specialistsService', () => ({
  getAllSpecialists: jest.fn(), getSpecialistPersonalization: jest.fn(), getMatchedSpecialists: jest.fn(),
  addFavoriteSpecialist: jest.fn(), removeFavoriteSpecialist: jest.fn(),
}));
const person: service.SpecialistData = { id: 'one', userId: 'u-one', user: { name: 'Elena' }, avatar: null,
  professionalType: null, professionalTypeLabel: 'Especialista', specialization: 'Psicología',
  description: '', pricePerSession: 60, rating: 0, reviewCount: 0, firstVisitFree: false };
const empty: service.SpecialistPersonalizationResponse = { primarySpecialist: null, favoriteSpecialists: [], favoriteSpecialistIds: [] };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(service.getAllSpecialists).mockResolvedValue([person]);
  jest.mocked(service.getSpecialistPersonalization).mockResolvedValue(empty);
  jest.mocked(service.getMatchedSpecialists).mockResolvedValue({ specialists: [], hasCompletedQuestionnaire: false });
  jest.mocked(service.addFavoriteSpecialist).mockResolvedValue();
  jest.mocked(service.removeFavoriteSpecialist).mockResolvedValue();
});
test('changing filters reloads only the directory and ignores outdated responses', async () => {
  const old = deferred<service.SpecialistData[]>();
  jest.mocked(service.getAllSpecialists).mockReturnValueOnce(old.promise);
  const hook = renderHook(({ filters }: { filters: service.SpecialistFilters }) => usePatientSpecialists(filters, true), { initialProps: { filters: {} } });
  await waitFor(() => expect(hook.result.current.personalLoading).toBe(false));
  hook.rerender({ filters: { modality: 'ONLINE' } });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  await act(async () => old.resolve([]));
  expect(hook.result.current.available).toEqual([person]);
  expect(service.getSpecialistPersonalization).toHaveBeenCalledTimes(1);
  expect(service.getMatchedSpecialists).toHaveBeenCalledTimes(1);
});
test('confirms a save once, preserves failures, and removes the last favorite', async () => {
  const pending = deferred<void>();
  jest.mocked(service.addFavoriteSpecialist).mockReturnValueOnce(pending.promise);
  const filters = {};
  const hook = renderHook(() => usePatientSpecialists(filters, true));
  await waitFor(() => expect(hook.result.current.personalLoading).toBe(false));
  act(() => { void hook.result.current.toggleFavorite(person); void hook.result.current.toggleFavorite(person); });
  expect(service.addFavoriteSpecialist).toHaveBeenCalledTimes(1);
  expect(hook.result.current.pendingIds.has('one')).toBe(true);
  expect(hook.result.current.personalization?.favoriteSpecialistIds).toEqual([]);
  await act(async () => pending.resolve());
  expect(hook.result.current.personalization?.favoriteSpecialistIds).toEqual(['one']);
  jest.mocked(service.removeFavoriteSpecialist).mockRejectedValueOnce(new Error('offline'));
  await act(async () => hook.result.current.toggleFavorite(person));
  expect(hook.result.current.personalization?.favoriteSpecialistIds).toEqual(['one']);
  expect(hook.result.current.favoriteError).toContain('Vuelve a intentarlo');
  await act(async () => hook.result.current.toggleFavorite(person));
  expect(hook.result.current.personalization?.favoriteSpecialists).toEqual([]);
});
test('unknown favorite state blocks writes without blocking exploration and can be retried', async () => {
  jest.mocked(service.getSpecialistPersonalization).mockRejectedValueOnce(new Error('offline'));
  const filters = {};
  const hook = renderHook(() => usePatientSpecialists(filters, true));
  await waitFor(() => expect(hook.result.current.personalError).toBe(true));
  expect(hook.result.current.available).toEqual([person]);
  await act(async () => hook.result.current.toggleFavorite(person));
  expect(service.addFavoriteSpecialist).not.toHaveBeenCalled();
  await act(async () => hook.result.current.retryPersonalization());
  expect(hook.result.current.personalError).toBe(false);
});
test('refreshes favorite changes from the profile and skips private reads during writes', async () => {
  const filters = {};
  const hook = renderHook(() => usePatientSpecialists(filters, true));
  await waitFor(() => expect(hook.result.current.personalLoading).toBe(false));
  jest.mocked(service.getSpecialistPersonalization).mockResolvedValue({ ...empty, favoriteSpecialists: [person], favoriteSpecialistIds: ['one'] });
  const refresh = jest.mocked(useDiscoveryRevalidation).mock.calls.at(-1)?.[0];
  await act(async () => { await refresh?.(); });
  expect(hook.result.current.personalization?.favoriteSpecialistIds).toEqual(['one']);
  const pending = deferred<void>();
  jest.mocked(service.removeFavoriteSpecialist).mockReturnValueOnce(pending.promise);
  act(() => { void hook.result.current.toggleFavorite(person); });
  await act(async () => { await refresh?.(); });
  expect(service.getSpecialistPersonalization).toHaveBeenCalledTimes(2);
  await act(async () => pending.resolve());
  expect(hook.result.current.personalization?.favoriteSpecialistIds).toEqual([]);
});
test('an unmounted account cannot populate the next account with an old response', async () => {
  const pending = deferred<service.SpecialistPersonalizationResponse>();
  jest.mocked(service.getSpecialistPersonalization).mockReturnValueOnce(pending.promise);
  const filters = {};
  const previous = renderHook(() => usePatientSpecialists(filters, true));
  previous.unmount();
  const next = renderHook(() => usePatientSpecialists(filters, true));
  await waitFor(() => expect(next.result.current.personalLoading).toBe(false));
  await act(async () => pending.resolve({ ...empty, favoriteSpecialists: [person], favoriteSpecialistIds: ['one'] }));
  expect(next.result.current.personalization).toEqual(empty);
});

test('a save overtaking a refresh ignores its old response and releases the loading state', async () => {
  const filters = {};
  const hook = renderHook(() => usePatientSpecialists(filters, true));
  await waitFor(() => expect(hook.result.current.personalLoading).toBe(false));
  const refresh = deferred<service.SpecialistPersonalizationResponse>();
  const save = deferred<void>();
  jest.mocked(service.getSpecialistPersonalization).mockReturnValueOnce(refresh.promise);
  jest.mocked(service.addFavoriteSpecialist).mockReturnValueOnce(save.promise);
  act(() => {
    void hook.result.current.retryPersonalization();
    void hook.result.current.toggleFavorite(person);
  });
  await act(async () => save.resolve());
  await act(async () => refresh.resolve(empty));
  expect(hook.result.current.personalization?.favoriteSpecialistIds).toEqual(['one']);
  expect(hook.result.current.personalLoading).toBe(false);
  await act(async () => hook.result.current.toggleFavorite(person));
  expect(hook.result.current.personalization?.favoriteSpecialistIds).toEqual([]);
});

test('independent favorite saves preserve both results when responses arrive out of order', async () => {
  const filters = {};
  const hook = renderHook(() => usePatientSpecialists(filters, true));
  await waitFor(() => expect(hook.result.current.personalLoading).toBe(false));
  const first = deferred<void>();
  const second = deferred<void>();
  jest.mocked(service.addFavoriteSpecialist).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  act(() => {
    void hook.result.current.toggleFavorite(person);
    void hook.result.current.toggleFavorite({ ...person, id: 'two' });
  });
  await act(async () => second.resolve());
  expect(hook.result.current.pendingIds).toEqual(new Set(['one']));
  await act(async () => first.resolve());
  expect(hook.result.current.personalization?.favoriteSpecialistIds).toEqual(['one', 'two']);
  expect(hook.result.current.pendingIds.size).toBe(0);
});
