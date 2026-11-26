import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getAgendaPreferences, updateAgendaPreferences } from '../../../../services/professionalService';

// Both screens wait for an in-flight write before reading the signed-in professional's setting.
let pendingSave: Promise<void> | null = null;

export function useBookingConfirmation() {
  const [value, setValue] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const generation = useRef(0);

  useFocusEffect(useCallback(() => {
    const request = ++generation.current;
    setValue(null);
    setSaving(false);
    setError('');
    const load = async () => {
      await pendingSave;
      if (request !== generation.current) return;
      try {
        const preferences = await getAgendaPreferences();
        if (!preferences) throw new Error('Missing agenda preferences');
        if (request === generation.current) setValue(preferences.autoConfirmSessionRequests);
      } catch {
        if (request === generation.current) setError('No se pudo cargar la confirmación automática.');
      }
    };
    void load();
    return () => { generation.current += 1; };
  }, [refresh]));

  const change = (next: boolean) => {
    if (value === null || error || next === value || pendingSave) return;
    const request = generation.current;
    const previous = value;
    setValue(next);
    setSaving(true);
    setError('');
    pendingSave = updateAgendaPreferences({ autoConfirmSessionRequests: next })
      .then(confirmed => {
        if (request === generation.current) setValue(confirmed.autoConfirmSessionRequests);
      })
      .catch(() => {
        if (request !== generation.current) return;
        setValue(previous);
        setError('No se pudo confirmar el cambio. Actualiza el estado antes de volver a intentarlo.');
      })
      .finally(() => {
        pendingSave = null;
        if (request === generation.current) setSaving(false);
      });
  };

  return { value, saving, error, change, reload: () => setRefresh(count => count + 1) };
}
