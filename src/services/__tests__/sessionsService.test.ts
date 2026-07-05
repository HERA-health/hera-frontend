jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import { api } from '../api';
import {
  createPublicSession,
  createSession,
  getAvailableSlots,
  getBookingQuote,
  getPublicBookingQuote,
} from '../sessionsService';

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
          status: 'CONFIRMED',
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
      status: 'CONFIRMED',
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

  it('requests a public quote without patient identity', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        data: {
          specialistId: 'specialist-1',
          duration: 60,
          currency: 'EUR',
          price: 80,
          basePrice: 80,
          tariffId: null,
          tariffName: null,
          baseTariffName: null,
          firstVisitFreeApplied: false,
        },
      },
    });

    await expect(
      getPublicBookingQuote({
        specialistId: 'specialist-1',
        duration: 60,
        type: 'VIDEO_CALL',
      })
    ).resolves.toMatchObject({
      price: 80,
      firstVisitFreeApplied: false,
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/sessions/public-booking-quote', {
      specialistId: 'specialist-1',
      duration: 60,
      type: 'VIDEO_CALL',
    });
  });

  it('requests an estimated public quote without patient email', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        data: {
          specialistId: 'specialist-1',
          duration: 60,
          currency: 'EUR',
          price: 80,
          basePrice: 80,
          tariffId: null,
          tariffName: null,
          baseTariffName: null,
          firstVisitFreeApplied: false,
        },
      },
    });

    await expect(
      getPublicBookingQuote({
        specialistId: 'specialist-1',
        duration: 60,
        type: 'VIDEO_CALL',
      })
    ).resolves.toMatchObject({
      price: 80,
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/sessions/public-booking-quote', {
      specialistId: 'specialist-1',
      duration: 60,
      type: 'VIDEO_CALL',
    });
  });

  it('creates a public session with contact data and privacy acceptance', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        data: {
          id: 'session-public-1',
          status: 'PENDING',
        },
      },
    });

    await expect(
      createPublicSession({
        specialistId: 'specialist-1',
        date: '2026-05-20T10:00:00.000Z',
        duration: 60,
        type: 'VIDEO_CALL',
        patient: {
          firstName: 'Lucia',
          lastName: 'Gomez',
          email: 'lucia@example.com',
          phone: '+34600000000',
        },
        privacyAccepted: true,
        privacyVersion: 'privacy-policy-v1',
      })
    ).resolves.toMatchObject({
      id: 'session-public-1',
      status: 'PENDING',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/sessions/public', {
      specialistId: 'specialist-1',
      date: '2026-05-20T10:00:00.000Z',
      duration: 60,
      type: 'VIDEO_CALL',
      patient: {
        firstName: 'Lucia',
        lastName: 'Gomez',
        email: 'lucia@example.com',
        phone: '+34600000000',
      },
      privacyAccepted: true,
      privacyVersion: 'privacy-policy-v1',
    });
  });

  it('prefers slotOptions when available slots include disabled options', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        data: {
          slots: [
            { startTime: '11:30', endTime: '12:30' },
          ],
          slotOptions: [
            { startTime: '10:15', endTime: '11:15', available: false },
            { startTime: '11:30', endTime: '12:30', available: true },
          ],
        },
      },
    });

    await expect(getAvailableSlots('specialist-1', '2026-06-15')).resolves.toEqual([
      { startTime: '10:15', endTime: '11:15', available: false },
      { startTime: '11:30', endTime: '12:30', available: true },
    ]);

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/specialists/specialist-1/available-slots?date=2026-06-15'
    );
  });
});
