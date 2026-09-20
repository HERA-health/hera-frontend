import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform, ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';
import { configureAnalytics, reset } from '../../services/analyticsService';
import { getErrorMessage } from '../../constants/errors';
import { Button } from './Button';

const VERSION = '2026-09-20';
const STORAGE = 'hera:visitor-analytics-preference';
type Preference = { enabled: boolean; version: string; decidedAt: string | null };
export function PrivacyControls() {
  const { user, isInitialized } = useAuth();
  const { theme } = useTheme();
  const [preference, setPreference] = useState<Preference | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const saving = useRef(false);
  const load = useCallback(async () => {
    const revision = ++generation.current;
    reset();
    try {
      let next: Preference | null = null;
      if (user) next = (await api.get<Preference>('/legal/preferences')).data;
      else {
        const raw = await AsyncStorage.getItem(STORAGE);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && 'version' in parsed && parsed.version === VERSION && 'enabled' in parsed && typeof parsed.enabled === 'boolean') next = { enabled: parsed.enabled, version: VERSION, decidedAt: 'local' };
        }
      }
      if (revision !== generation.current) return;
      setPreference(next); setError('');
      configureAnalytics(next?.enabled === true && next.version === VERSION);
      if (!next?.decidedAt) setOpen(true);
    } catch (cause) { if (revision === generation.current) setError(getErrorMessage(cause, 'No hemos podido cargar tu elección. Las estadísticas de uso siguen desactivadas.')); }
  }, [user?.id]);
  useEffect(() => {
    reset(); setPreference(null); setOpen(false);
    if (!isInitialized) return;
    void load();
    const refresh = () => { if (!saving.current) void load(); };
    const sub = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    if (Platform.OS === 'web') window.addEventListener('focus', refresh);
    return () => { generation.current++; reset(); sub.remove(); if (Platform.OS === 'web') window.removeEventListener('focus', refresh); };
  }, [load, isInitialized]);
  const save = async (enabled: boolean) => {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(''); reset();
    const revision = ++generation.current;
    try {
      const next = { enabled, version: VERSION, decidedAt: new Date().toISOString() };
      if (user) await api.put('/legal/preferences', { enabled, version: VERSION });
      else await AsyncStorage.setItem(STORAGE, JSON.stringify(next));
      if (revision !== generation.current) return;
      setPreference(next); configureAnalytics(enabled); setOpen(false);
    } catch (cause) { if (revision === generation.current) setError(getErrorMessage(cause)); }
    finally { saving.current = false; setBusy(false); }
  };
  return <>
    <View style={{ backgroundColor: theme.bg, paddingHorizontal: 12, alignItems: 'flex-end' }}>
      <Button size="small" variant="ghost" onPress={() => setOpen(true)}>Preferencias de privacidad</Button>
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => { if (!busy) setOpen(false); }}>
      <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 24 }}>
        <ScrollView style={{ maxHeight: '85%', backgroundColor: theme.bgCard, borderRadius: 12, width: '100%', maxWidth: 560, alignSelf: 'center' }} contentContainerStyle={{ padding: 24, gap: 18 }}>
          <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontSize: 26, fontFamily: theme.fontDisplay }}>Tu privacidad</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 16, lineHeight: 24, fontFamily: theme.fontSans }}>Guardamos lo necesario para que puedas iniciar sesión y usar HERA con seguridad. También puedes permitirnos recoger datos generales sobre cómo se usa la aplicación para mejorarla. Estas estadísticas no incluyen información clínica ni datos de Google. Es opcional: tendrás las mismas funciones elijas lo que elijas y podrás cambiar de opinión cuando quieras.</Text>
          <Text style={{ color: theme.textSecondary }}>Estadísticas de uso: {preference?.enabled ? 'activadas' : 'desactivadas'}</Text>
          {error ? <Text accessibilityRole="alert" style={{ color: theme.warning }}>{error}</Text> : null}
          <Button variant="outline" disabled={busy} onPress={() => void save(true)}>Permitir estadísticas de uso</Button>
          <Button variant="outline" disabled={busy} onPress={() => void save(false)}>{preference?.enabled ? 'Desactivar estadísticas de uso' : 'No permitir estadísticas de uso'}</Button>
          <Button variant="ghost" onPress={() => void Linking.openURL('https://health-hera.com/legal/privacidad')}>Leer política de privacidad</Button>
          <Button variant="ghost" disabled={busy} onPress={() => setOpen(false)}>Cerrar</Button>
        </ScrollView>
      </View>
    </Modal>
  </>;
}
