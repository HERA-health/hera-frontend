import { formatPrivatePrice, parsePrivatePrice } from '../../utils/privateTariff';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePreventRemove } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing, layout } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import type { ScreenProps } from '../../constants/types';
import { Button } from '../../components/common/Button';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { getErrorMessage } from '../../constants/errors';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { loadPrivateCatalog, savePrivateCatalog, type PrivateServiceCatalog, type PrivateServiceOption } from '../../services/privateCatalogService';
import type { SessionType } from '../../services/sessionsService';

const MODALITIES = [
  { type: 'VIDEO_CALL', label: 'Videollamada', icon: 'videocam-outline' },
  { type: 'IN_PERSON', label: 'Presencial', icon: 'location-outline' },
  { type: 'PHONE_CALL', label: 'Llamada', icon: 'call-outline' },
] as const;
type DraftOption = PrivateServiceOption & { priceText: string; isNew?: boolean };
const visibility = [{ value: 'public', label: 'Reservable por pacientes' }, { value: 'private', label: 'Solo para mi agenda' }, { value: 'off', label: 'Desactivada' }] as const;
const makeDraft = (catalog: PrivateServiceCatalog): DraftOption[] => {
  const options = catalog.options.map(o => ({ ...o, priceText: String(o.priceCents / 100).replace('.', ',') }));
  return [...options, ...MODALITIES.filter(m => !options.some(o => o.modality === m.type)).map(m => newOption(m.type, 60))];
};
const newOption = (modality: SessionType, durationMinutes: number): DraftOption => ({
  id: `new:${modality}:${durationMinutes}`, serviceId: '', name: 'Sesión individual', modality, durationMinutes,
  priceCents: 0, priceText: '', currency: 'EUR', isActive: false, isPublic: false, isPreferred: false,
  version: 0, legacyDuration: false, legacyTariffId: null, isNew: true,
});

export function ProfessionalTariffsScreen({ navigation }: ScreenProps<'ProfessionalTariffs'>) {
  const { theme } = useTheme();
  const alert = useAppAlert();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [width, setWidth] = useState(0);
  const [catalog, setCatalog] = useState<PrivateServiceCatalog | null>(null);
  const [draft, setDraft] = useState<DraftOption[]>([]);
  const [free, setFree] = useState(false);
  const [expanded, setExpanded] = useState<Partial<Record<SessionType, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [conflict, setConflict] = useState(false);
  const sequence = useRef(0);
  const baseline = useRef('');
  const dirty = !!catalog && JSON.stringify({ draft, free }) !== baseline.current;
  const compact = width < 640;
  const wide = width >= 1040;
  const publicOptions = draft.filter(o => o.isActive && o.isPublic && !catalog?.restrictions[o.modality] && parsePrivatePrice(o.priceText) !== null);
  const applyCatalog = useCallback((value: PrivateServiceCatalog) => {
    const options = makeDraft(value);
    baseline.current = JSON.stringify({ draft: options, free: value.firstVisitFree });
    setCatalog(value); setDraft(options); setFree(value.firstVisitFree); setConflict(false);
  }, []);
  const load = useCallback(async () => {
    const token = ++sequence.current;
    setLoading(true); setError('');
    try { const value = await loadPrivateCatalog(); if (token === sequence.current) applyCatalog(value); }
    catch (e) { if (token === sequence.current) setError(getErrorMessage(e, 'No se pudieron cargar las tarifas.')); }
    finally { if (token === sequence.current) setLoading(false); }
  }, [applyCatalog]);
  useEffect(() => { void load(); return () => { sequence.current++; }; }, [load]);
  usePreventRemove(dirty, ({ data }) => {
    showAppAlert(alert, 'Cambios sin guardar', 'Puedes seguir editando o salir y descartar estos cambios.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar y salir', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  const edit = (id: string, patch: Partial<DraftOption>) => { setMessage(''); setDraft(rows => rows.map(o => o.id === id ? { ...o, ...patch } : o)); };
  const setVisibility = (option: DraftOption, value: string) => {
    setMessage('');
    setDraft(rows => {
      const others = rows.filter(o => o.modality === option.modality && o.id !== option.id && o.isActive);
      return rows.map(o => o.id === option.id ? { ...o, isActive: value !== 'off', isPublic: value === 'public', isPreferred: value !== 'off' && (option.isPreferred || !others.some(v => v.isPreferred)) }
        : value === 'off' && option.isPreferred && o.id === others[0]?.id ? { ...o, isPreferred: true } : o);
    });
  };
  const save = async () => {
    if (!catalog || saving) return;
    setShowErrors(true); setError(''); setMessage('');
    if (draft.some(o => (!o.isNew || o.isActive) && parsePrivatePrice(o.priceText) === null)) {
      setError('Revisa los importes indicados. Usa un máximo de dos decimales.'); return;
    }
    setSaving(true);
    try {
      const next = await savePrivateCatalog({ version: catalog.version, firstVisitFree: free,
        options: draft.filter(o => !o.isNew || o.isActive).map(o => ({
          ...(o.isNew ? {} : { id: o.id }), modality: o.modality, durationMinutes: o.durationMinutes,
          priceCents: parsePrivatePrice(o.priceText) ?? o.priceCents, isActive: o.isActive, isPublic: o.isPublic, isPreferred: o.isPreferred,
        })) });
      applyCatalog(next); setMessage('Tarifas guardadas. Las citas ya reservadas mantienen su precio.');
    } catch (e) { const text = getErrorMessage(e, 'No se pudieron guardar las tarifas. Tu borrador se conserva.'); setError(text); setConflict(text.includes('otra ventana')); }
    finally { setSaving(false); }
  };
  const priceInput = (option: DraftOption) => <View style={styles.priceCell}>
    <View style={[styles.priceInput, showErrors && (!option.isNew || option.isActive) && parsePrivatePrice(option.priceText) === null && { borderColor: theme.error }]}>
      <TextInput accessibilityLabel={`Precio de ${MODALITIES.find(m => m.type === option.modality)?.label}, ${option.durationMinutes} minutos`}
        value={option.priceText} onChangeText={priceText => edit(option.id, { priceText })} editable={!saving}
        keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={theme.textSecondary} style={styles.input} />
      <Text style={styles.secondary}>€</Text>
    </View>
    {showErrors && (!option.isNew || option.isActive) && parsePrivatePrice(option.priceText) === null && <Text style={styles.error}>Importe no válido</Text>}
  </View>;
  return <View style={styles.root} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    <View style={[styles.toolbar, compact && styles.vertical]}>
      <View style={styles.flex}><Text style={styles.heading}>Tu oferta, de un vistazo</Text><Text style={styles.secondary}>Define cuánto dura y cuánto cuesta cada modalidad de atención.</Text></View>
      <Button onPress={() => void save()} disabled={!dirty || loading || conflict} loading={saving}>Guardar cambios</Button>
    </View>
    {loading ? <View style={styles.loading}><ActivityIndicator color={theme.primary} /><Text style={styles.secondary}>Cargando tus tarifas…</Text></View> : <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {!!error && <View accessibilityRole="alert" style={styles.feedback}><Text style={styles.error}>{error}</Text>
        {!catalog && <Button variant="outline" onPress={() => void load()}>Reintentar</Button>}
        {conflict && <Button variant="outline" onPress={() => showAppAlert(alert, 'Cargar tarifas actuales', 'Se descartará este borrador y se cargarán los cambios guardados.', [{ text: 'Conservar borrador', style: 'cancel' }, { text: 'Cargar versión actual', onPress: () => void load() }])}>Cargar versión actual</Button>}
      </View>}
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text>}
      {catalog && <View style={[styles.composition, !wide && styles.vertical]}>
        <View style={styles.editor}>
          <View style={styles.surface}>
            <View style={styles.sectionTitle}><Text style={styles.title}>Modalidades y precios</Text><Text style={styles.secondary}>Precio final por sesión</Text></View>
            {!compact && <View style={styles.tableHeading}><Text style={[styles.overline, styles.modalityCell]}>MODALIDAD</Text><Text style={[styles.overline, styles.durationCell]}>DURACIÓN</Text><Text style={[styles.overline, styles.priceCell]}>PRECIO</Text><Text style={[styles.overline, styles.audienceCell]}>DISPONIBILIDAD</Text></View>}
            {MODALITIES.map(modality => {
              const options = draft.filter(o => o.modality === modality.type);
              const main = options.find(o => o.isActive && o.isPreferred) ?? options.find(o => o.isActive) ?? options[0];
              if (!main) return null;
              const activeCount = options.filter(o => o.isActive).length;
              return <View key={modality.type} style={styles.modalitySection}>
                <View style={[styles.row, compact && styles.vertical]}>
                  <View style={[styles.modalityCell, styles.modalityLabel]}><Ionicons name={modality.icon} size={22} color={theme.primary} /><View><Text style={styles.label}>{modality.label}</Text><Text style={styles.small}>{activeCount ? `${activeCount} ${activeCount === 1 ? 'duración' : 'duraciones'}` : 'Sin activar'}</Text></View></View>
                  <View style={[styles.controls, compact && styles.mobileControls]}>
                    <View style={styles.durationCell}><SimpleDropdown disabled={saving} accessibilityLabel={`Duración principal de ${modality.label}`} value={main.durationMinutes} options={[...new Set([...options.map(o => o.durationMinutes), 45, 50, 60])].sort((a,b) => a-b).map(d => ({ label: `${d} min`, value: d }))} onSelect={duration => {
                      const target = options.find(o => o.durationMinutes === duration) ?? newOption(modality.type, duration);
                      setDraft(rows => [...rows.filter(o => o.id !== target.id).map(o => o.modality === modality.type ? { ...o, isPreferred: false } : o), { ...target, isActive: true, isPreferred: true }]);
                    }} /></View>
                    {priceInput(main)}
                    <View style={styles.audienceCell}><SimpleDropdown disabled={saving} accessibilityLabel={`Disponibilidad de ${modality.label}`} value={!main.isActive ? 'off' : main.isPublic ? 'public' : 'private'} options={visibility} onSelect={value => setVisibility(main, value)} /></View>
                  </View>
                </View>
                {!!catalog.restrictions[modality.type] && <View style={styles.restriction}><Text style={styles.small}>{catalog.restrictions[modality.type]}</Text><Button disabled={saving} size="small" variant="ghost" onPress={() => navigation.navigate('ProfessionalProfile')}>Ir al perfil</Button></View>}
                <View style={styles.rowActions}><Button disabled={saving} size="small" variant="ghost" onPress={() => setExpanded(v => ({ ...v, [modality.type]: !v[modality.type] }))}>{expanded[modality.type] ? 'Ocultar otras duraciones' : 'Otras duraciones'}</Button></View>
                {expanded[modality.type] && <View style={styles.details}>
                  <View style={{ gap: 8 }}>
                    <Text style={styles.small}>Copiar un precio a {modality.label.toLowerCase()}, {main.durationMinutes} min</Text>
                    <SimpleDropdown disabled={saving} accessibilityLabel={`Copiar precio a ${modality.label}, ${main.durationMinutes} minutos`}
                      value={null} placeholder="Elegir precio de otra opción"
                      options={draft.filter(o => o.id !== main.id && o.isActive && parsePrivatePrice(o.priceText) !== null).map(o => ({ value: o.id,
                        label: `${MODALITIES.find(m => m.type === o.modality)?.label} · ${o.durationMinutes} min · ${formatPrivatePrice(parsePrivatePrice(o.priceText) ?? 0)}` }))}
                      onSelect={id => { const source = draft.find(o => o.id === id); if (source) edit(main.id, { priceText: source.priceText }); }} />
                  </View>
                  {options.filter(o => o.id !== main.id).map(option => <View key={option.id} style={[styles.extraRow, compact && styles.vertical]}>
                    <Text style={styles.label}>{option.durationMinutes} min</Text>{priceInput(option)}
                    <View style={styles.audienceCell}><SimpleDropdown disabled={saving} accessibilityLabel={`Disponibilidad de ${option.durationMinutes} minutos, ${modality.label}`} value={!option.isActive ? 'off' : option.isPublic ? 'public' : 'private'} options={visibility} onSelect={v => setVisibility(option, v)} /></View>
                    <Button disabled={saving} size="small" variant="ghost" onPress={() => edit(option.id, { priceText: main.priceText })}>Copiar precio principal</Button>
                  </View>)}
                  {[45,50,60].filter(d => !options.some(o => o.durationMinutes === d)).map(d => <Button key={d} size="small" variant="ghost" onPress={() => setDraft(rows => [...rows, newOption(modality.type, d)])}>Añadir {d} min</Button>)}
                </View>}
              </View>;
            })}
          </View>
          <View style={styles.policy}><View style={styles.flex}><Text style={styles.title}>Primera sesión gratuita</Text><Text style={styles.secondary}>Una vez por paciente en tu consulta privada, también cuando creas tú la cita.</Text></View><Switch accessibilityLabel="Ofrecer primera sesión gratuita" value={free} onValueChange={setFree} disabled={saving} trackColor={{ true: theme.primary }} /></View>
          <Text style={styles.small}>Los cambios se aplican a nuevas reservas. Las citas y facturas anteriores conservan sus condiciones.</Text>
        </View>
        <View style={[styles.preview, wide && { width: 320 }]}>
          <View style={styles.previewHeader}><Ionicons name="eye-outline" size={22} color={theme.primary} /><Text style={styles.title}>Así lo verán tus pacientes</Text></View>
          <Text style={styles.small}>{dirty ? 'Vista previa · Cambios sin guardar' : 'Tu oferta pública'}</Text>
          <Text style={styles.previewPrice}>{publicOptions.length ? `${new Set(publicOptions.map(o => parsePrivatePrice(o.priceText))).size > 1 ? 'Desde ' : ''}${formatPrivatePrice(Math.min(...publicOptions.map(o => parsePrivatePrice(o.priceText) ?? 0)))}` : 'Solo agenda privada'}</Text>
          <Text style={styles.secondary}>{publicOptions.length ? 'por sesión · precio final' : 'No tienes opciones reservables por pacientes.'}</Text>
          {MODALITIES.map(m => {
            const rows = publicOptions.filter(o => o.modality === m.type).sort((a,b) => a.durationMinutes-b.durationMinutes);
            return rows.length ? <View key={m.type} style={styles.previewModality}><Text style={styles.label}>{m.label}</Text>{rows.map(o => <View style={styles.previewLine} key={o.id}><Text style={styles.secondary}>{o.durationMinutes} min</Text><Text style={styles.label}>{formatPrivatePrice(parsePrivatePrice(o.priceText) ?? 0)}</Text></View>)}</View> : null;
          })}
          {free && <Text style={styles.freeNote}>Primera sesión sin coste para pacientes elegibles.</Text>}
          <View style={styles.previewFooter}><Text style={styles.small}>Los horarios disponibles se calculan según la duración elegida y tus descansos.</Text><Button variant="ghost" size="small" onPress={() => navigation.navigate('ProfessionalAvailability')}>Gestionar disponibilidad</Button></View>
        </View>
      </View>}
    </ScrollView>}
  </View>;
}

const createStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg }, flex: { flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 24, borderBottomWidth: 1, borderBottomColor: t.border },
  heading: { color: t.textPrimary, fontFamily: t.fontSans, fontSize: 22, fontWeight: '700', marginBottom: 6 },
  title: { color: t.textPrimary, fontFamily: t.fontSans, fontSize: 16, fontWeight: '600' }, label: { color: t.textPrimary, fontFamily: t.fontSans, fontSize: 14, fontWeight: '600' },
  secondary: { color: t.textSecondary, fontFamily: t.fontSans, fontSize: 14, lineHeight: 21 }, small: { color: t.textSecondary, fontFamily: t.fontSans, fontSize: 12, lineHeight: 18 },
  scroll: { padding: spacing.lg, gap: 16, maxWidth: layout.contentMaxWidth + 48, width: '100%', alignSelf: 'center', paddingBottom: 48 },
  composition: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' }, vertical: { flexDirection: 'column', alignItems: 'stretch' },
  editor: { flex: 1, gap: 20, minWidth: 0, width: '100%' }, surface: { backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, borderRadius: borderRadius.xl, overflow: 'hidden' },
  sectionTitle: { padding: 20, gap: 4 }, tableHeading: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: t.bgAlt },
  overline: { color: t.textSecondary, fontFamily: t.fontSans, fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  modalitySection: { padding: 20, borderTopWidth: 1, borderTopColor: t.border, gap: 8 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalityLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 }, modalityCell: { width: 142 }, durationCell: { width: 120 }, priceCell: { width: 96 }, audienceCell: { flex: 1, minWidth: 160 },
  controls: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }, mobileControls: { width: '100%', flexWrap: 'wrap' },
  priceInput: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingHorizontal: 10, backgroundColor: t.bg },
  input: { flex: 1, color: t.textPrimary, fontFamily: t.fontSans, fontSize: 16, minHeight: 42, minWidth: 0, padding: 0 }, rowActions: { alignItems: 'flex-start' },
  details: { gap: 12, paddingTop: 8 }, extraRow: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap', paddingVertical: 8 },
  restriction: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  policy: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 4 },
  preview: { backgroundColor: t.bgAlt, borderRadius: 16, padding: 24, gap: 8, width: '100%' }, previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewPrice: { color: t.primary, fontFamily: t.fontSans, fontSize: 30, fontWeight: '600', marginTop: 20 }, previewModality: { borderTopWidth: 1, borderTopColor: t.border, paddingTop: 16, marginTop: 12, gap: 8 },
  previewLine: { flexDirection: 'row', justifyContent: 'space-between' }, previewFooter: { borderTopWidth: 1, borderTopColor: t.border, paddingTop: 16, marginTop: 16, gap: 8 },
  freeNote: { color: t.primary, fontFamily: t.fontSans, fontSize: 13, lineHeight: 20, paddingTop: 16 }, loading: { padding: 48, alignItems: 'center', gap: 16 },
  feedback: { gap: 12, padding: 16, borderWidth: 1, borderColor: t.error, borderRadius: 12 }, error: { color: t.error, fontFamily: t.fontSans, fontSize: 13 }, success: { color: t.success, fontFamily: t.fontSans, fontSize: 14 },
});
