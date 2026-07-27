import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '../constants/types';

const STORAGE_KEY = '@hera_pending_booking_intent_v1';
const INTENT_TTL_MS = 30 * 60 * 1000;

export interface PendingBookingIntent {
  specialistId: string;
  initialDate: string;
  initialSlotStartTime: string;
  initialSlotEndTime: string;
  createdAt: number;
  expiresAt: number;
}

export type PendingBookingIntentInput = Omit<
  PendingBookingIntent,
  'createdAt' | 'expiresAt'
>;

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (record: Record<string, unknown>, key: keyof PendingBookingIntent): string | null =>
  typeof record[key] === 'string' && record[key].trim().length > 0
    ? record[key]
    : null;

const readNumber = (record: Record<string, unknown>, key: keyof PendingBookingIntent): number | null =>
  typeof record[key] === 'number' && Number.isFinite(record[key])
    ? record[key]
    : null;

const parsePendingBookingIntent = (value: unknown): PendingBookingIntent | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  const specialistId = readString(value, 'specialistId');
  const initialDate = readString(value, 'initialDate');
  const initialSlotStartTime = readString(value, 'initialSlotStartTime');
  const initialSlotEndTime = readString(value, 'initialSlotEndTime');
  const createdAt = readNumber(value, 'createdAt');
  const expiresAt = readNumber(value, 'expiresAt');

  if (
    !specialistId
    || !initialDate
    || !initialSlotStartTime
    || !initialSlotEndTime
    || createdAt === null
    || expiresAt === null
  ) {
    return null;
  }

  return {
    specialistId,
    initialDate,
    initialSlotStartTime,
    initialSlotEndTime,
    createdAt,
    expiresAt,
  };
};

export const savePendingBookingIntent = async (
  input: PendingBookingIntentInput
): Promise<void> => {
  const createdAt = Date.now();
  const intent: PendingBookingIntent = {
    ...input,
    createdAt,
    expiresAt: createdAt + INTENT_TTL_MS,
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
};

export const clearPendingBookingIntent = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};

export const getPendingBookingIntent = async (): Promise<PendingBookingIntent | null> => {
  const serializedIntent = await AsyncStorage.getItem(STORAGE_KEY);
  if (!serializedIntent) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedIntent);
  } catch {
    await clearPendingBookingIntent();
    return null;
  }

  const intent = parsePendingBookingIntent(parsed);
  if (!intent || intent.expiresAt <= Date.now()) {
    await clearPendingBookingIntent();
    return null;
  }

  return intent;
};

export const consumePendingBookingIntent = async (): Promise<PendingBookingIntent | null> => {
  const intent = await getPendingBookingIntent();
  if (intent) {
    await clearPendingBookingIntent();
  }

  return intent;
};

export const mapPendingIntentToBookingParams = (
  intent: PendingBookingIntent
): RootStackParamList['Booking'] => ({
  specialistId: intent.specialistId,
  initialDate: intent.initialDate,
  initialSlotStartTime: intent.initialSlotStartTime,
  initialSlotEndTime: intent.initialSlotEndTime,
});
