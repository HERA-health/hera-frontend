import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../components/common/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import { borderRadius, spacing } from '../../constants/colors';
import * as service from '../../services/heraCommissionService';
import { subscribeCommissionAcceptance } from '../../services/commissionAcceptanceEvents';
import { Check, dateTime } from './CommissionElements';

export function pendingLiveCommissionTerms(config: service.Configuration): service.Terms | null {
  const terms = config.terms;
  if (config.mode !== 'LIVE' || !terms || terms.mode !== 'LIVE' || !config.canAccept) return null;
  // A terminated agreement cannot be accepted again: a new version is required.
  const accepted = config.accounts.some(account => account.mode === 'LIVE'
    && account.operatorKey === terms.operatorKey
    && account.acceptances.some(acceptance => acceptance.termsId === terms.id));
  return accepted ? null : terms;
}

/** Mounted only in the signed-in professional workspace, after the legal/email gates. */
export function ProfessionalCommissionNotice({ suppressed = false }: { suppressed?: boolean }) {
  const { theme } = useTheme();
  const [terms, setTerms] = useState<service.Terms | null>(null);
  const [deferred, setDeferred] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const generation = useRef(0);
  const inFlight = useRef<number | null>(null);
  const refreshAgain = useRef(false);
  const acceptedHere = useRef(new Set<string>());

  const refresh = useCallback(async (): Promise<void> => {
    if (inFlight.current !== null) { refreshAgain.current = true; return; }
    const request = ++generation.current;
    inFlight.current = request;
    setRefreshing(true);
    try {
      const config = await service.configuration();
      if (request !== generation.current) return;
      const pending = pendingLiveCommissionTerms(config);
      setTerms(pending && !acceptedHere.current.has(pending.id) ? pending : null);
      setLoadError(false);
    } catch {
      if (request === generation.current) setLoadError(true);
    } finally {
      if (inFlight.current === request) {
        inFlight.current = null;
        if (request === generation.current) {
          setRefreshing(false);
          if (refreshAgain.current) { refreshAgain.current = false; void refresh(); }
        }
      }
    }
  }, []);

  const accepted = useCallback((termsId: string) => {
    acceptedHere.current.add(termsId);
    setTerms(current => current?.id === termsId ? null : current);
  }, []);

  useEffect(() => {
    void refresh();
    // Recheck server state: an old account's request may finish after logout.
    const unsubscribe = subscribeCommissionAcceptance(() => { void refresh(); });
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    const onFocus = () => { void refresh(); };
    if (Platform.OS === 'web') window.addEventListener('focus', onFocus);
    return () => {
      generation.current++;
      inFlight.current = null;
      refreshAgain.current = false;
      subscription.remove();
      unsubscribe();
      if (Platform.OS === 'web') window.removeEventListener('focus', onFocus);
    };
  }, [accepted, refresh]);

  // The commission workspace owns its agreement and acceptance presentation.
  if (suppressed) return null;

  if (!terms) return loadError ? (
    <View style={[styles.banner, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <Text style={[styles.bannerText, { color: theme.textSecondary }]}>No hemos podido comprobar las novedades del Directorio. Puedes seguir trabajando.</Text>
      <Button size="small" variant="ghost" loading={refreshing} onPress={() => void refresh()}>Reintentar</Button>
    </View>
  ) : null;

  return <>
    {deferred === terms.id ? (
      <View style={[styles.banner, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
        <Text style={[styles.bannerText, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>Tienes pendientes las condiciones para recibir nuevos pacientes del Directorio.</Text>
        <Button size="small" variant="ghost" onPress={() => setDeferred(null)}>Revisar condiciones</Button>
      </View>
    ) : (
      <CommissionTermsDialog key={terms.id} terms={terms} onAccepted={accepted} onRefresh={refresh} onLater={() => setDeferred(terms.id)} />
    )}
  </>;
}

function CommissionTermsDialog({ terms, onAccepted, onRefresh, onLater }: {
  terms: service.Terms;
  onAccepted: (termsId: string) => void;
  onRefresh: () => Promise<void>;
  onLater: () => void;
}) {
  const { theme } = useTheme();
  const [explanationExpanded, setExplanationExpanded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const dismiss = () => { if (!submitting.current) onLater(); };
  const submit = async () => {
    if (!checked || !expanded || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await service.accept(terms.id);
      if (mounted.current) onAccepted(terms.id);
    } catch (err: unknown) {
      if (mounted.current) {
        setError(getErrorMessage(err, 'No hemos podido guardar tu aceptación. Inténtalo de nuevo.'));
        void onRefresh();
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const body = { color: theme.textSecondary, fontFamily: theme.fontSans };
  return (
    <Modal visible transparent animationType="none" onRequestClose={dismiss}>
      <SafeAreaView style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: theme.bgCard, borderColor: theme.border }]} accessibilityViewIsModal onAccessibilityEscape={dismiss}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Ionicons name="people-outline" size={30} color={theme.primary} />
            <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>Una actualización para seguir conectando contigo</Text>
            <Text style={[styles.copy, body]}>Hemos actualizado las condiciones de las comisiones HERA para los pacientes que te llegan a través del Directorio.</Text>
            <Button variant="ghost" disabled={busy} onPress={() => setExplanationExpanded(value => !value)} accessibilityLabel="Qué cambia para ti" accessibilityState={{ expanded: explanationExpanded }} iconPosition="right" icon={<Ionicons name={explanationExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.primary} />}>
              Qué cambia para ti
            </Button>
            {explanationExpanded ? <View style={styles.terms}>
              <Text style={[styles.copy, body]}>Queremos que tengas toda la información antes de decidir. Para recibir nuevos pacientes del Directorio, necesitamos que revises y aceptes estas condiciones.</Text>
              <View style={[styles.reassurance, { backgroundColor: theme.bg }]}>
                <Text style={[styles.copy, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Tus pacientes actuales siguen contigo</Text>
                <Text style={[styles.copy, body]}>Si prefieres hacerlo más adelante, podrás seguir atendiendo a tus pacientes y gestionando sus citas. Mientras tanto, no se habilitarán nuevas reservas de pacientes nuevos del Directorio.</Text>
              </View>
            </View> : null}
            <Button variant="outline" disabled={busy} onPress={() => setExpanded(value => !value)} accessibilityState={{ expanded }}>
              {expanded ? 'Ocultar condiciones' : 'Leer las condiciones'}
            </Button>
            {expanded ? <View style={styles.terms}>
              <Text style={[styles.copy, body]}>Condiciones vigentes desde el {dateTime(terms.effectiveAt)}</Text>
              <Text style={[styles.copy, body]}>Titular: {terms.operatorName}</Text>
              <Text selectable style={[styles.copy, body]}>{terms.contractText}</Text>
              <Text selectable style={[styles.copy, body]}>Fiscalidad de HERA: {terms.fiscalTreatment}</Text>
              <Check label="He leído y acepto esta versión de las condiciones y su tratamiento fiscal" checked={checked} onChange={setChecked} disabled={busy} />
            </View> : null}
            {error ? <Text accessibilityRole="alert" style={[styles.copy, { color: theme.error }]}>{error}</Text> : null}
            {expanded ? <Button fullWidth disabled={!checked || busy} loading={busy} onPress={() => void submit()}>Aceptar condiciones y continuar</Button> : null}
            <Button variant="ghost" fullWidth disabled={busy} onPress={dismiss}>Ahora no</Button>
            <Text style={[styles.footnote, body]}>Podrás revisarlas cuando quieras en Comisiones HERA.</Text>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  bannerText: { flex: 1, minWidth: 200, fontSize: 13, lineHeight: 19 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md, backgroundColor: 'rgba(0,0,0,0.45)' },
  dialog: { width: '100%', maxWidth: 640, maxHeight: '100%', borderWidth: 1, borderRadius: borderRadius.xl, overflow: 'hidden' },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 26, lineHeight: 33 },
  copy: { fontSize: 14, lineHeight: 22 },
  reassurance: { padding: spacing.md, borderRadius: borderRadius.md, gap: spacing.sm },
  terms: { gap: spacing.md },
  footnote: { textAlign: 'center', fontSize: 12, lineHeight: 18 },
});
