import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '../constants/types';

const STORAGE_KEY = '@hera_pending_booking_intent_v1';
const INTENT_TTL_MS = 30 * 60 * 1000;

export interface PendingBookingIntent {
  specialistId: string;
  specialistName: string;
  pricePerSession: number;
  avatar?: string;
  title?: string;
  specializations?: string[];
  slotDuration?: number;
  offersOnline?: boolean;
  offersInPerson?: boolean;
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

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const readString = (record: Record<string, unknown>, key: keyof PendingBookingIntent): string | null =>
  typeof record[key] === 'string' && record[key].trim().length > 0
    ? record[key]
    : null;

const readOptionalString = (
  record: Record<string, unknown>,
  key: keyof PendingBookingIntent
): string | undefined =>
  typeof record[key] === 'string' && record[key].trim().length > 0
    ? record[key]
    : undefined;

const readNumber = (record: Record<string, unknown>, key: keyof PendingBookingIntent): number | null =>
  typeof record[key] === 'number' && Number.isFinite(record[key])
    ? record[key]
    : null;

const readOptionalNumber = (
  record: Record<string, unknown>,
  key: keyof PendingBookingIntent
): number | undefined =>
  typeof record[key] === 'number' && Number.isFinite(record[key])
    ? record[key]
    : undefined;

const readOptionalBoolean = (
  record: Record<string, unknown>,
  key: keyof PendingBookingIntent
): boolean | undefined =>
  typeof record[key] === 'boolean' ? record[key] : undefined;

const parsePendingBookingIntent = (value: unknown): PendingBookingIntent | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  const specialistId = readString(value, 'specialistId');
  const specialistName = readString(value, 'specialistName');
  const pricePerSession = readNumber(value, 'pricePerSession');
  const initialDate = readString(value, 'initialDate');
  const initialSlotStartTime = readString(value, 'initialSlotStartTime');
  const initialSlotEndTime = readString(value, 'initialSlotEndTime');
  const createdAt = readNumber(value, 'createdAt');
  const expiresAt = readNumber(value, 'expiresAt');

  if (
    !specialistId
    || !specialistName
    || pricePerSession === null
    || !initialDate
    || !initialSlotStartTime
    || !initialSlotEndTime
    || createdAt === null
    || expiresAt === null
  ) {
    return null;
  }

  const specializations = value.specializations;

  return {
    specialistId,
    specialistName,
    pricePerSession,
    avatar: readOptionalString(value, 'avatar'),
    title: readOptionalString(value, 'title'),
    specializations: isStringArray(specializations) ? specializations : undefined,
    slotDuration: readOptionalNumber(value, 'slotDuration'),
    offersOnline: readOptionalBoolean(value, 'offersOnline'),
    offersInPerson: readOptionalBoolean(value, 'offersInPerson'),
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
  specialistName: intent.specialistName,
  pricePerSession: intent.pricePerSession,
  avatar: intent.avatar,
  title: intent.title,
  specializations: intent.specializations,
  slotDuration: intent.slotDuration,
  offersOnline: intent.offersOnline,
  offersInPerson: intent.offersInPerson,
  initialDate: intent.initialDate,
  initialSlotStartTime: intent.initialSlotStartTime,
  initialSlotEndTime: intent.initialSlotEndTime,
});

