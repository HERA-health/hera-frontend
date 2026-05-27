import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import * as clinicService from '../../services/clinicService';

const SELECTED_CLINIC_STORAGE_PREFIX = 'hera:clinic:selected:';

interface ClinicWorkspaceState {
  memberships: clinicService.ClinicMembershipSummary[];
  selectedClinicId: string | null;
  selectedMembership: clinicService.ClinicMembershipSummary | null;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  selectClinic: (clinicId: string) => Promise<void>;
}

const getSelectedClinicStorageKey = (userId: string | undefined): string =>
  `${SELECTED_CLINIC_STORAGE_PREFIX}${userId ?? 'anonymous'}`;

export function useClinicWorkspace(): ClinicWorkspaceState {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<clinicService.ClinicMembershipSummary[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const storageKey = useMemo(() => getSelectedClinicStorageKey(user?.id), [user?.id]);

  const selectedMembership = useMemo(
    () => memberships.find((membership) => membership.clinic.id === selectedClinicId) ?? null,
    [memberships, selectedClinicId],
  );

  const loadMemberships = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [nextMemberships, storedClinicId] = await Promise.all([
        clinicService.getMyClinicMemberships(),
        AsyncStorage.getItem(storageKey).catch(() => null),
      ]);
      const validStoredClinicId = storedClinicId
        ? nextMemberships.some((membership) => membership.clinic.id === storedClinicId)
        : false;
      const nextSelectedClinicId = validStoredClinicId
        ? storedClinicId
        : nextMemberships[0]?.clinic.id ?? null;

      setMemberships(nextMemberships);
      setSelectedClinicId(nextSelectedClinicId);

      if (nextSelectedClinicId && nextSelectedClinicId !== storedClinicId) {
        await AsyncStorage.setItem(storageKey, nextSelectedClinicId).catch(() => undefined);
      }
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la clínica');
      setMemberships([]);
      setSelectedClinicId(null);
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      await loadMemberships();
      if (!active) {
        return;
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [loadMemberships]);

  const selectClinic = useCallback(async (clinicId: string) => {
    setSelectedClinicId(clinicId);
    await AsyncStorage.setItem(storageKey, clinicId).catch(() => undefined);
  }, [storageKey]);

  return {
    memberships,
    selectedClinicId,
    selectedMembership,
    loading,
    error,
    reload: loadMemberships,
    selectClinic,
  };
}
