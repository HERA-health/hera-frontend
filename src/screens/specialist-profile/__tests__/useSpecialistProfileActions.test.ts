import { act, renderHook, waitFor } from '@testing-library/react-native';
import { showAppAlert } from '../../../components/common/alert';
import * as specialistsService from '../../../services/specialistsService';
import type { Specialist } from '../types';
import { useSpecialistProfileActions } from '../useSpecialistProfileActions';

jest.mock('../../../components/common/alert', () => ({
  showAppAlert: jest.fn(),
  useAppAlert: () => ({ show: jest.fn() }),
}));

jest.mock('../../../services/specialistsService', () => ({
  getFavoriteSpecialistStatus: jest.fn(),
  addFavoriteSpecialist: jest.fn(),
  removeFavoriteSpecialist: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

const mockedService = jest.mocked(specialistsService);
const mockedShowAppAlert = jest.mocked(showAppAlert);
const specialist = {
  id: 'specialist-1',
  publicSlug: 'maria-lansac',
  name: 'María Lansac',
} as Specialist;

describe('useSpecialistProfileActions', () => {
  beforeEach(() => {
    mockedService.getFavoriteSpecialistStatus.mockResolvedValue(false);
    mockedService.addFavoriteSpecialist.mockResolvedValue();
    mockedService.removeFavoriteSpecialist.mockResolvedValue();
  });

  afterEach(() => jest.clearAllMocks());

  it('does not request favorite state for visitors or non-client users', async () => {
    const { result } = renderHook(() => useSpecialistProfileActions({
      specialist,
      favoriteEnabled: false,
    }));

    await waitFor(() => expect(result.current.favoriteLoading).toBe(false));
    expect(mockedService.getFavoriteSpecialistStatus).not.toHaveBeenCalled();
    expect(result.current.isFavorite).toBe(false);
  });

  it('loads and removes an existing favorite', async () => {
    mockedService.getFavoriteSpecialistStatus.mockResolvedValue(true);
    const { result } = renderHook(() => useSpecialistProfileActions({
      specialist,
      favoriteEnabled: true,
    }));

    await waitFor(() => expect(result.current.isFavorite).toBe(true));
    await act(async () => result.current.toggleFavorite());

    expect(mockedService.getFavoriteSpecialistStatus).toHaveBeenCalledWith('specialist-1');
    expect(mockedService.removeFavoriteSpecialist).toHaveBeenCalledWith('specialist-1');
    expect(result.current.isFavorite).toBe(false);
  });

  it('adds a new favorite optimistically', async () => {
    const { result } = renderHook(() => useSpecialistProfileActions({
      specialist,
      favoriteEnabled: true,
    }));

    await waitFor(() => expect(result.current.favoriteLoading).toBe(false));
    await act(async () => result.current.toggleFavorite());

    expect(mockedService.addFavoriteSpecialist).toHaveBeenCalledWith('specialist-1');
    expect(result.current.isFavorite).toBe(true);
  });

  it('restores state and reports a recoverable favorite error', async () => {
    mockedService.addFavoriteSpecialist.mockRejectedValue(new Error('Network'));
    const { result } = renderHook(() => useSpecialistProfileActions({
      specialist,
      favoriteEnabled: true,
    }));

    await waitFor(() => expect(result.current.favoriteLoading).toBe(false));
    await act(async () => result.current.toggleFavorite());

    expect(result.current.isFavorite).toBe(false);
    expect(mockedShowAppAlert).toHaveBeenCalledWith(
      expect.anything(),
      'No se pudo actualizar',
      'Tu selección no se ha perdido. Inténtalo de nuevo.',
    );
  });

  it('ignores a favorite mutation that settles after changing specialist', async () => {
    const secondSpecialist = {
      ...specialist,
      id: 'specialist-2',
      publicSlug: 'ana-garcia',
      name: 'Ana García',
    };
    let rejectRemoval: (reason: Error) => void = () => undefined;
    mockedService.getFavoriteSpecialistStatus.mockImplementation(async (specialistId) => (
      specialistId === specialist.id
    ));
    mockedService.removeFavoriteSpecialist.mockImplementation(() => new Promise<void>(
      (_resolve, reject) => { rejectRemoval = reject; },
    ));
    const { result, rerender } = renderHook(
      ({ currentSpecialist }: { currentSpecialist: Specialist }) =>
        useSpecialistProfileActions({
          specialist: currentSpecialist,
          favoriteEnabled: true,
        }),
      { initialProps: { currentSpecialist: specialist } },
    );

    await waitFor(() => expect(result.current.isFavorite).toBe(true));
    let pendingRemoval: Promise<void> | undefined;
    act(() => {
      pendingRemoval = result.current.toggleFavorite();
    });
    rerender({ currentSpecialist: secondSpecialist });
    await waitFor(() => {
      expect(result.current.isFavorite).toBe(false);
      expect(result.current.favoriteLoading).toBe(false);
    });

    await act(async () => {
      rejectRemoval(new Error('Late network error'));
      await pendingRemoval;
    });

    expect(result.current.isFavorite).toBe(false);
    expect(result.current.favoriteLoading).toBe(false);
    expect(mockedShowAppAlert).not.toHaveBeenCalled();
  });
});
