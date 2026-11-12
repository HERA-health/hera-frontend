import { PrivacyControlsContext, PrivacyControlsVisibleContext } from './PrivacyPreferences';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Linking, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';
import { configureAnalytics, reset } from '../../services/analyticsService';
import { getErrorMessage } from '../../constants/errors';
import { Button } from './Button';
import { AnimatedPressable } from './AnimatedPressable';
import { borderRadius, spacing } from '../../constants/colors';

const VERSION = '2026-09-20';
const STORAGE = 'hera:visitor-analytics-preference';
type Preference = { enabled: boolean; version: string; decidedAt: string | null };
export function PrivacyControls({ children }: { children?: React.ReactNode }) {
  const { user, isInitialized } = useAuth();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const edgeSpacing = width < 768 ? spacing.sm + spacing.xs : spacing.xl;
  const [preference, setPreference] = useState<Preference | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const saving = useRef(false);
  useEffect(() => {
    if (!open || Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!saving.current) setOpen(false);
      return true;
    });
    return () => subscription.remove();
  }, [open]);
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
      const requested = Platform.OS === 'web' && new URLSearchParams(window.location.search).get('preferencias') === 'cookies';
      if (!next?.decidedAt || requested) setOpen(true);
      if (requested) {
        const target = new URL(window.location.href);
        target.searchParams.delete('preferencias');
        window.history.replaceState(window.history.state, '', target.href);
      }
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
  return <PrivacyControlsContext.Provider value={() => setOpen(true)}>
    <PrivacyControlsVisibleContext.Provider value={open}>
    {children}
    {open ? <View pointerEvents="box-none" style={[styles.overlay, {
      paddingTop: insets.top + edgeSpacing,
      paddingBottom: insets.bottom + edgeSpacing,
      paddingLeft: insets.left + edgeSpacing,
      paddingRight: insets.right + edgeSpacing,
    }]}>
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border, shadowColor: theme.shadowStrong }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Tu privacidad</Text>
            <AnimatedPressable accessibilityRole="button" accessibilityLabel="Cerrar aviso de privacidad" disabled={busy}
              onPress={() => setOpen(false)} hoverLift={false} style={styles.close}>
              <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
            </AnimatedPressable>
          </View>
          <Text style={[styles.description, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Usamos lo esencial para que HERA funcione con seguridad. Con tu permiso, recogemos estadísticas de uso para mejorarla, sin información clínica ni datos de Google. Es opcional: tendrás las mismas funciones y podrás cambiar tu elección cuando quieras.</Text>
          {preference?.decidedAt ? <Text style={[styles.status, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Estadísticas de uso: {preference.enabled ? 'activadas' : 'desactivadas'}</Text> : null}
          {error ? <Text accessibilityRole="alert" style={[styles.description, { color: theme.warning, fontFamily: theme.fontSans }]}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button size="small" variant="secondary" disabled={busy} style={styles.choice}
              accessibilityLabel="Aceptar estadísticas de uso" onPress={() => void save(true)}>Aceptar</Button>
            <Button size="small" variant="secondary" disabled={busy} style={styles.choice}
              accessibilityLabel="Rechazar estadísticas de uso"
              onPress={() => void save(false)}>Rechazar</Button>
          </View>
          <View style={[styles.footer, { borderColor: theme.borderLight }]}>
            <Button size="small" variant="ghost" style={styles.legalLink} textStyle={styles.legalText}
              accessibilityRole="link" accessibilityLabel="Leer política de privacidad"
              onPress={() => void Linking.openURL('https://www.health-hera.com/legal/privacidad')}>Privacidad</Button>
            <Button size="small" variant="ghost" style={styles.legalLink} textStyle={styles.legalText}
              accessibilityRole="link" accessibilityLabel="Leer política de cookies"
              onPress={() => void Linking.openURL('https://www.health-hera.com/legal/cookies')}>Cookies</Button>
          </View>
        </ScrollView>
      </View>
    </View> : null}
    </PrivacyControlsVisibleContext.Provider>
  </PrivacyControlsContext.Provider>;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, justifyContent: 'flex-end', alignItems: 'flex-end' },
  card: {
    width: '100%', maxWidth: 480, maxHeight: '100%', borderWidth: 1, borderRadius: borderRadius.lg,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  scroll: { flexGrow: 0, borderRadius: borderRadius.lg },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, lineHeight: 24, flexShrink: 1 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -spacing.sm },
  description: { fontSize: 14, lineHeight: 20 },
  status: { fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.xs },
  choice: { flex: 1, minHeight: 44, borderRadius: borderRadius.md, shadowOpacity: 0, elevation: 0 },
  footer: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1 },
  legalLink: { minHeight: 44, paddingHorizontal: spacing.xs },
  legalText: { fontSize: 12, textDecorationLine: 'underline' },
});
