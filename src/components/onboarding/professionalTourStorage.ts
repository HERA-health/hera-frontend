import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ProfessionalTourDefinition,
  ProfessionalTourId,
  ProfessionalTourSeenStatus,
} from './professionalTourTypes';

const STORAGE_PREFIX = '@hera/professional_tour';

interface StoredTourState {
  status: ProfessionalTourSeenStatus;
  tourId: ProfessionalTourId;
  version: number;
  updatedAt: string;
}

export function getProfessionalTourStorageKey(
  userId: string,
  definition: Pick<ProfessionalTourDefinition, 'id' | 'version'>,
): string {
  return `${STORAGE_PREFIX}:${userId}:${definition.id}:v${definition.version}`;
}

export async function hasSeenProfessionalTour(
  userId: string,
  definition: Pick<ProfessionalTourDefinition, 'id' | 'version'>,
): Promise<boolean> {
  const rawValue = await AsyncStorage.getItem(
    getProfessionalTourStorageKey(userId, definition),
  );

  return rawValue !== null;
}

export async function markProfessionalTourSeen(
  userId: string,
  definition: Pick<ProfessionalTourDefinition, 'id' | 'version'>,
  status: ProfessionalTourSeenStatus,
): Promise<void> {
  const payload: StoredTourState = {
    status,
    tourId: definition.id,
    version: definition.version,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(
    getProfessionalTourStorageKey(userId, definition),
    JSON.stringify(payload),
  );
}

export async function clearProfessionalTourSeen(
  userId: string,
  definition: Pick<ProfessionalTourDefinition, 'id' | 'version'>,
): Promise<void> {
  await AsyncStorage.removeItem(getProfessionalTourStorageKey(userId, definition));
}
