jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearPendingBookingIntent,
  consumePendingBookingIntent,
  getPendingBookingIntent,
  mapPendingIntentToBookingParams,
  savePendingBookingIntent,
} from '../pendingBookingIntentService';

const mockedAsyncStorage = jest.mocked(AsyncStorage);

const baseIntentInput = {
  specialistId: 'specialist-1',
  specialistName: 'Dra. Prueba',
  pricePerSession: 80,
  avatar: 'https://cdn.example.com/avatar.jpg',
  title: 'Psicóloga sanitaria',
  specializations: ['Ansiedad'],
  slotDuration: 60,
  offersOnline: true,
  offersInPerson: false,
  initialDate: '2026-06-25',
  initialSlotStartTime: '10:00',
  initialSlotEndTime: '11:00',
};

describe('pendingBookingIntentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores a pending booking intent with a 30 minute expiry', async () => {
    await savePendingBookingIntent(baseIntentInput);

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledTimes(1);
    const [, serializedIntent] = mockedAsyncStorage.setItem.mock.calls[0];
    const storedIntent = JSON.parse(serializedIntent);

    expect(storedIntent).toMatchObject(baseIntentInput);
    expect(storedIntent.createdAt).toBe(1_800_000);
    expect(storedIntent.expiresAt).toBe(3_600_000);
  });

  it('reads and maps a valid pending intent to Booking params', async () => {
    mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
      ...baseIntentInput,
      createdAt: 1_800_000,
      expiresAt: 3_600_000,
    }));

    const intent = await getPendingBookingIntent();

    expect(intent).toMatchObject(baseIntentInput);
    expect(intent ? mapPendingIntentToBookingParams(intent) : null).toMatchObject({
      specialistId: 'specialist-1',
      specialistName: 'Dra. Prueba',
      initialDate: '2026-06-25',
      initialSlotStartTime: '10:00',
      initialSlotEndTime: '11:00',
    });
  });

  it('clears expired or malformed intents', async () => {
    mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
      ...baseIntentInput,
      createdAt: 0,
      expiresAt: 1000,
    }));

    await expect(getPendingBookingIntent()).resolves.toBeNull();
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledTimes(1);

    mockedAsyncStorage.getItem.mockResolvedValue('{');

    await expect(getPendingBookingIntent()).resolves.toBeNull();
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledTimes(2);
  });

  it('consumes an intent once and supports explicit clearing', async () => {
    mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
      ...baseIntentInput,
      createdAt: 1_800_000,
      expiresAt: 3_600_000,
    }));

    await expect(consumePendingBookingIntent()).resolves.toMatchObject(baseIntentInput);
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledTimes(1);

    await clearPendingBookingIntent();
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledTimes(2);
  });
});

