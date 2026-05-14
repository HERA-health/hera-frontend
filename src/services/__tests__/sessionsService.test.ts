jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import { api } from '../api';
import { createSession, getBookingQuote } from '../sessionsService';

const mockedApi = api as jest.Mocked<typeof api>;

describe('sessionsService.getBookingQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests the authenticated booking quote with specialist, type and duration', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        data: {
          specialistId: 'specialist-1',
          duration: 60,
          currency: 'EUR',
          price: 0,
          basePrice: 85,
          tariffId: 'tariff-standard',
          tariffName: 'Primera sesión gratuita',
          baseTariffName: 'Sesión estándar',
          firstVisitFreeApplied: true,
        },
      },
    });

    await expect(
      getBookingQuote('specialist-1', 'VIDEO_CALL', 60)
    ).resolves.toMatchObject({
      price: 0,
      basePrice: 85,
      firstVisitFreeApplied: true,
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/sessions/booking-quote', {
      params: {
        specialistId: 'specialist-1',
        type: 'VIDEO_CALL',
        duration: 60,
      },
    });
  });

  it('returns the created session snapshot from booking creation', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        data: {
          id: 'session-1',
          bookedPrice: 0,
          bookedCurrency: 'EUR',
          bookedTariffId: 'tariff-standard',
          bookedTariffName: 'Primera sesión gratuita',
          bookedDuration: 60,
        },
      },
    });

    await expect(
      createSession({
        specialistId: 'specialist-1',
        date: '2026-05-20T10:00:00.000Z',
        duration: 60,
        type: 'VIDEO_CALL',
      })
    ).resolves.toMatchObject({
      id: 'session-1',
      bookedPrice: 0,
      bookedCurrency: 'EUR',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/sessions', {
      specialistId: 'specialist-1',
      date: '2026-05-20T10:00:00.000Z',
      duration: 60,
      type: 'VIDEO_CALL',
    });
  });
});
