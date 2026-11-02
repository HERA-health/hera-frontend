import React, { useCallback, useState } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getPatientActivity, type PatientActivitySummary } from '../../services/patientDirectoryService';
import { subscribeProfessionalHomeChanges } from '../../services/dashboardService';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';

export function PatientActivityCount({ value }: { value?: PatientActivitySummary }) {
  const { theme } = useTheme();
  const [data, setData] = useState<PatientActivitySummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    if (value !== undefined) return;
    let active = true; let generation = 0; let loading = 0;
    let lastForegroundRefresh = -Infinity;
    const foreground = () => Platform.OS === 'web'
      ? typeof document === 'undefined' || document.visibilityState !== 'hidden'
      : AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    const load = async (force = false) => {
      const id = ++generation;
      loading += 1;
      try {
        const result = await getPatientActivity(force);
        if (active && generation === id) {
          setData(previous => result.unavailable && previous?.activePatients != null ? { ...previous, stale: true } : result);
          setFailed(result.unavailable);
        }
      }
      catch { if (active && generation === id) setFailed(true); }
      finally { loading -= 1; }
    };
    const onForeground = () => {
      // Visibility and focus can describe the same return to a browser tab.
      if (!active || !foreground() || loading > 0 || Date.now() - lastForegroundRefresh < 1000) return;
      lastForegroundRefresh = Date.now();
      void load(true);
    };
    if (foreground()) void load(retry > 0);
    const unsubscribe = subscribeProfessionalHomeChanges(() => { if (foreground()) void load(true); });
    const subscription = Platform.OS !== 'web'
      ? AppState.addEventListener('change', state => { if (state === 'active') onForeground(); })
      : undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onForeground);
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('focus', onForeground);
    return () => {
      active = false; unsubscribe(); subscription?.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onForeground);
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('focus', onForeground);
    };
  }, [value, retry]));
  const current = value ?? data;
  return <View style={{ gap: 4, paddingVertical: 12 }}>
    <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }}>Pacientes activos · últimos 60 días: {current?.activePatients ?? '—'}</Text>
    <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12 }}>Personas únicas · independiente del archivo y del período seleccionado</Text>
    {current?.computedAt && <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{failed || current.stale ? 'Dato anterior' : 'Calculado'}: {new Date(current.computedAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}</Text>}
    {(failed || current?.unavailable) && <Text accessibilityRole="alert" style={{ color: theme.textSecondary }}>El recuento no está disponible.</Text>}
    {current?.restricted && <Text style={{ color: theme.textSecondary }}>Recuento restringido por las protecciones de las métricas de personas.</Text>}
    {value === undefined && <Button variant="ghost" onPress={() => setRetry(v => v + 1)}>Actualizar actividad</Button>}
  </View>;
}
