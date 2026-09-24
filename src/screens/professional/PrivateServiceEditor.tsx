import { formatPrivatePrice, parsePrivatePrice } from '../../utils/privateTariff';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import axios from 'axios';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import type { ScreenProps } from '../../constants/types';
import { Button } from '../../components/common/Button';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { getErrorMessage } from '../../constants/errors';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { savePrivateService, type PrivateServiceCatalog, type PrivateServiceOption, type PrivateService } from '../../services/privateCatalogService';
import type { SessionType } from '../../services/sessionsService';

const MODALITIES = [
  { type: 'VIDEO_CALL', label: 'Videollamada', icon: 'videocam-outline' },
  { type: 'IN_PERSON', label: 'Presencial', icon: 'location-outline' },
  { type: 'PHONE_CALL', label: 'Teléfono', icon: 'call-outline' },
] as const;
type DraftOption = PrivateServiceOption & { priceText: string; isNew?: boolean; visibilityChosen?: boolean };
const visibility = [{ value: 'public', label: 'Agenda + reserva online' }, { value: 'private', label: 'Solo agenda' }, { value: 'off', label: 'Desactivada' }] as const;
const makeDraft = (catalog: PrivateServiceCatalog): DraftOption[] => {
  const options = catalog.options.map(o => ({ ...o, priceText: String(o.priceCents / 100).replace('.', ',') }));
  return [...options, ...MODALITIES.filter(m => !options.some(o => o.modality === m.type)).map(m => newOption(m.type, 60))];
};
const newOption = (modality: SessionType, durationMinutes: number): DraftOption => ({
  id: `new:${modality}:${durationMinutes}`, serviceId: '', name: 'Sesión individual', modality, durationMinutes,
  priceCents: 0, priceText: '', currency: 'EUR', isActive: false, isPublic: false, isPreferred: false,
  version: 0, legacyDuration: false, legacyTariffId: null, isNew: true,
});

export function PrivateServiceEditor({ navigation, service, sourceCatalog, onSaved, onClose, onDirtyChange, onSavingChange, onReload }: {
  navigation: Pick<ScreenProps<'ProfessionalTariffs'>['navigation'], 'navigate'>; service: PrivateService | null;
  sourceCatalog: PrivateServiceCatalog; onSaved: (catalog: PrivateServiceCatalog) => void;
  onClose: () => void; onDirtyChange: (dirty: boolean) => void; onSavingChange: (saving: boolean) => void;
  onReload: () => Promise<void>;
}) {
  const { theme } = useTheme();
  const alert = useAppAlert();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [width, setWidth] = useState(0);
  const [catalog] = useState<PrivateServiceCatalog>({ ...sourceCatalog, options: service?.options ?? [], version: service?.version ?? 0 });
  const [name, setName] = useState(service?.name ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [draft, setDraft] = useState<DraftOption[]>(() => makeDraft(catalog));
  const free = sourceCatalog.firstVisitFree;
  const [expanded, setExpanded] = useState<Partial<Record<SessionType, boolean>>>({});

  const [selectedModality, setSelectedModality] = useState<SessionType>('VIDEO_CALL');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [conflict, setConflict] = useState(false);
  const baseline = useRef(JSON.stringify({ draft: makeDraft(catalog), name: service?.name ?? '', description: service?.description ?? '' }));
  const dirty = JSON.stringify({ draft, name, description }) !== baseline.current;
  const wide = width >= 960;
  const publicOptions = draft.filter(o => o.isActive && o.isPublic && !catalog.restrictions[o.modality] && parsePrivatePrice(o.priceText) !== null);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  const edit = (id: string, patch: Partial<DraftOption>) => { setMessage(''); setDraft(rows => rows.map(o => o.id === id ? { ...o, ...patch } : o)); };
  const setVisibility = (option: DraftOption, value: string) => {
    setMessage('');
    setDraft(rows => {
      const others = rows.filter(o => o.modality === option.modality && o.id !== option.id && o.isActive);
      return rows.map(o => o.id === option.id ? { ...o, visibilityChosen: true, isActive: value !== 'off', isPublic: value === 'public', isPreferred: value !== 'off' && (option.isPreferred || !others.some(v => v.isPreferred)) }
        : value === 'off' && option.isPreferred && o.id === others[0]?.id ? { ...o, isPreferred: true } : o);
    });
  };
  const save = async () => {
    if (!catalog || saving) return;
    setShowErrors(true); setError(''); setMessage('');
    if (draft.some(o => (!o.isNew || o.isActive) && parsePrivatePrice(o.priceText) === null)) {
      setError('Revisa los importes indicados. Usa un máximo de dos decimales.'); return;
    }
    if (!name.trim() || name.trim().length > 80 || description.trim().length > 240) { setError('Revisa el nombre y la descripción.'); return; }
    if (service?.key !== 'base' && !draft.some(o => o.isActive)) { setError('Activa al menos una modalidad y configura su precio.'); return; }
    if (draft.some(o => o.isNew && o.isActive && !o.visibilityChosen)) { setError('Elige la disponibilidad de cada opción nueva.'); return; }
    setSaving(true); onSavingChange(true);
    try {
      const next = await savePrivateService(service?.id, { version: catalog.version, name: name.trim(), description: description.trim() || null, ...(service?.archivedAt ? { restore: true } : {}),
        options: draft.filter(o => !o.isNew || o.isActive).map(o => ({
          ...(o.isNew ? {} : { id: o.id }), modality: o.modality, durationMinutes: o.durationMinutes,
          priceCents: parsePrivatePrice(o.priceText) ?? o.priceCents, isActive: o.isActive, isPublic: o.isPublic, isPreferred: o.isPreferred,
        })) });
      onSaved(next);
    } catch (e) { const text = getErrorMessage(e, 'No se pudieron guardar las tarifas. Tu borrador se conserva.'); setError(text); setConflict(axios.isAxiosError(e) && e.response?.data?.code === 'CATALOG_VERSION_CONFLICT'); }
    finally { setSaving(false); onSavingChange(false); }
  };
  const priceInput = (option: DraftOption) => <View style={styles.priceCell}><Text style={styles.small}>Precio por sesión</Text>
    <View style={[styles.priceInput, showErrors && (!option.isNew || option.isActive) && parsePrivatePrice(option.priceText) === null && { borderColor: theme.error }]}>
      <TextInput accessibilityLabel={`Precio de ${MODALITIES.find(m => m.type === option.modality)?.label}, ${option.durationMinutes} minutos`}
        value={option.priceText} onChangeText={priceText => edit(option.id, { priceText })} editable={!saving}
        keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={theme.textSecondary} style={styles.input} />
      <Text style={styles.secondary}>€</Text>
    </View>
    {showErrors && (!option.isNew || option.isActive) && parsePrivatePrice(option.priceText) === null && <Text style={styles.error}>Importe no válido</Text>}
  </View>;
  return <View style={styles.root} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {!!error && <View accessibilityRole="alert" style={styles.feedback}><Text style={styles.error}>{error}</Text>
        {conflict && <Button variant="outline" onPress={() => showAppAlert(alert, 'Cargar versión actual', 'Se descartará este borrador y se cargarán los cambios guardados.', [
          { text: 'Conservar borrador', style: 'cancel' }, { text: 'Cargar versión actual', onPress: () => { void onReload().catch(e => setError(getErrorMessage(e, 'No se pudo actualizar. Tu borrador se conserva.'))); } },
        ])}>Cargar versión actual</Button>}
      </View>}
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text>}
      {catalog && <View style={[styles.composition, !wide && styles.vertical]}>
        <View style={styles.editor}>
          <View style={styles.identity}>
            <Text style={styles.label}>Nombre del servicio</Text>
            <TextInput autoFocus accessibilityLabel="Nombre del servicio" value={name} onChangeText={setName} editable={!saving} maxLength={80} placeholder="Nombre del servicio" placeholderTextColor={theme.textSecondary} style={styles.textField} />
            {showErrors && !name.trim() && <Text style={styles.error}>Introduce un nombre</Text>}
            <View style={styles.fieldHeading}><Text style={styles.label}>Descripción · opcional</Text><Text style={styles.small}>{description.length}/240</Text></View>
            <TextInput accessibilityLabel="Descripción pública" value={description} onChangeText={setDescription} editable={!saving} maxLength={240} multiline placeholder="Explica brevemente en qué consiste" placeholderTextColor={theme.textSecondary} style={[styles.textField, { minHeight: 64 }]} />
            {!!service?.archivedAt && <Text style={styles.freeNote}>Al guardar se restaurará este servicio. Revisa las opciones públicas en la vista previa antes de continuar.</Text>}
          </View>
          <View style={styles.surface}>
            <View style={styles.sectionTitle}><Text style={styles.title}>Modalidades</Text>
              <Text style={styles.small}>Las opciones activas siempre están disponibles en tu agenda. La reserva online permite que también las reserven tus pacientes.</Text>
            </View>
            <View style={styles.modalityTabs}>{MODALITIES.map(m => <Pressable key={m.type} accessibilityRole="tab" accessibilityState={{ selected: selectedModality === m.type }} onPress={() => setSelectedModality(m.type)} style={[styles.modalityTab, width < 720 && { flexDirection: 'column' }, selectedModality === m.type && { borderBottomColor: theme.primary, backgroundColor: theme.surface }]}><Ionicons name={m.icon} size={18} color={selectedModality === m.type ? theme.primary : theme.textSecondary} /><Text style={styles.label}>{m.label}</Text></Pressable>)}</View>

            {MODALITIES.filter(m => m.type === selectedModality).map(modality => {
              const options = draft.filter(o => o.modality === modality.type);
              const main = options.find(o => o.isActive && o.isPreferred) ?? options.find(o => o.isActive) ?? options[0];
              if (!main) return null;
              const activeCount = options.filter(o => o.isActive).length;
              return <View key={modality.type} style={styles.modalitySection}>
                <View style={[styles.row, styles.vertical]}>
                  <View style={[styles.modalityLabel, { width: '100%' }]}><Ionicons name={modality.icon} size={22} color={theme.primary} /><View><Text style={styles.label}>{modality.label}</Text><Text style={styles.small}>{activeCount ? `${activeCount} ${activeCount === 1 ? 'duración' : 'duraciones'}` : 'Sin activar'}</Text></View><View style={{ flex: 1 }} /><Switch accessibilityLabel={`Activar ${modality.label}`} value={activeCount > 0} disabled={saving} trackColor={{ false: theme.textMuted, true: theme.primary }} thumbColor={theme.textOnPrimary} onValueChange={enabled => setDraft(rows => rows.map(o => o.modality !== modality.type ? o : enabled ? o.id === main.id ? { ...o, isActive: true, isPreferred: true } : o : { ...o, isActive: false, isPublic: false, isPreferred: false }))} /></View>
                  {activeCount > 0 && <View style={[styles.controls, styles.mobileControls]}>
                    <View style={styles.durationCell}><Text style={styles.small}>Duración principal</Text><SimpleDropdown presentation="portal" highlightSelection={false} disabled={saving} accessibilityLabel={`Duración principal de ${modality.label}`} value={main.durationMinutes} options={[...new Set([...options.map(o => o.durationMinutes), 45, 50, 60])].sort((a,b) => a-b).map(d => ({ label: `${d} min`, value: d }))} onSelect={duration => {
                      const target = options.find(o => o.durationMinutes === duration) ?? newOption(modality.type, duration);
                      const replacePlaceholder = main.isNew && !main.priceText.trim() && !main.visibilityChosen;
                      setDraft(rows => [
                        ...rows.filter(o => o.id !== target.id && !(replacePlaceholder && o.id === main.id))
                          .map(o => o.modality === modality.type ? { ...o, isPreferred: false } : o),
                        { ...target, isActive: true, isPreferred: true },
                      ]);
                    }} /></View>
                    {priceInput(main)}
                    <View style={styles.audienceCell}><Text style={styles.small}>Disponibilidad</Text><SimpleDropdown presentation="portal" highlightSelection={false} disabled={saving} accessibilityLabel={`Disponibilidad de ${modality.label}`} value={main.isNew && !main.visibilityChosen ? null : !main.isActive ? 'off' : main.isPublic ? 'public' : 'private'} placeholder="Elige disponibilidad" options={visibility} onSelect={value => setVisibility(main, value)} /></View>
                  </View>}
                </View>
                {service?.key === 'base' && main.legacyTariffId && <Text style={styles.small}>{main.name}</Text>}
                {!!catalog.restrictions[modality.type] && <View style={styles.restriction}><Text style={styles.small}>{catalog.restrictions[modality.type]}</Text><Button disabled={saving} size="small" variant="ghost" onPress={() => navigation.navigate('ProfessionalProfile')}>Ir al perfil</Button></View>}
                {activeCount > 0 && <View style={styles.rowActions}><Button disabled={saving} size="small" variant="secondary" style={{ alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10 }} onPress={() => setExpanded(v => ({ ...v, [modality.type]: !v[modality.type] }))}>{expanded[modality.type] ? 'Cerrar otras duraciones' : `Otras duraciones${options.length > 1 ? ` · ${options.length - 1}` : ''}`}</Button></View>}
                {activeCount > 0 && expanded[modality.type] && <View style={styles.details}>
                  {options.filter(o => o.id !== main.id).map(option => <View key={option.id} style={styles.extraRow}>
                    <View><Text style={styles.label}>{option.durationMinutes} min</Text>{service?.key === 'base' && option.legacyTariffId && <Text style={styles.small}>Tarifa anterior: {option.name}</Text>}</View>{priceInput(option)}
                    <View style={styles.audienceCell}><Text style={styles.small}>Disponibilidad</Text><SimpleDropdown presentation="portal" highlightSelection={false} disabled={saving} accessibilityLabel={`Disponibilidad de ${option.durationMinutes} minutos, ${modality.label}`} value={option.isNew && !option.visibilityChosen ? null : !option.isActive ? 'off' : option.isPublic ? 'public' : 'private'} placeholder="Elige disponibilidad" options={visibility} onSelect={v => setVisibility(option, v)} /></View>
                  </View>)}
                  {[45,50,60].filter(d => !options.some(o => o.durationMinutes === d)).map(d => <Button key={d} disabled={saving} size="small" variant="ghost" onPress={() => setDraft(rows => [...rows, newOption(modality.type, d)])}>Añadir {d} min</Button>)}
                </View>}
              </View>;
            })}
          </View>

          <Text style={styles.small}>Los cambios se aplican a nuevas reservas. Las citas y facturas anteriores conservan sus condiciones.</Text>
        </View>
        <View style={[styles.preview, wide && { width: 280 }]}>
          <View style={styles.previewHeader}><Ionicons name="eye-outline" size={22} color={theme.primary} /><Text style={styles.title}>Vista previa</Text></View>
          <Text style={styles.small}>{service?.archivedAt ? 'Vista previa al restaurar' : dirty ? 'Vista previa · Cambios sin guardar' : 'Reserva online'}</Text>
          <Text style={styles.title}>{name.trim() || 'Nombre del servicio'}</Text>
          {!!description.trim() && <Text style={styles.secondary}>{description.trim()}</Text>}
          <Text style={styles.previewPrice}>{publicOptions.length ? `${new Set(publicOptions.map(o => parsePrivatePrice(o.priceText))).size > 1 ? 'Desde ' : ''}${formatPrivatePrice(Math.min(...publicOptions.map(o => parsePrivatePrice(o.priceText) ?? 0)))}` : 'Solo agenda'}</Text>
          <Text style={styles.secondary}>{publicOptions.length ? 'por sesión · precio final' : 'No tienes opciones reservables por pacientes.'}</Text>
          {MODALITIES.map(m => {
            const rows = publicOptions.filter(o => o.modality === m.type).sort((a,b) => a.durationMinutes-b.durationMinutes);
            return rows.length ? <View key={m.type} style={styles.previewModality}><Text style={styles.label}>{m.label}</Text>{rows.map(o => <View style={styles.previewLine} key={o.id}><Text style={styles.secondary}>{o.durationMinutes} min</Text><Text style={styles.label}>{formatPrivatePrice(parsePrivatePrice(o.priceText) ?? 0)}</Text></View>)}</View> : null;
          })}
          {free && <Text style={styles.freeNote}>Primera sesión sin coste para pacientes elegibles.</Text>}
        </View>
      </View>}
    </ScrollView>
    <View style={[styles.toolbar, width < 480 && { gap: 8, paddingHorizontal: 16 }]}><View style={styles.flex}><Text style={styles.small}>{dirty ? 'Cambios sin guardar' : 'Sin cambios'}</Text></View><Button variant="ghost" disabled={saving} onPress={onClose}>Cancelar</Button><Button disabled={(!dirty && !service?.archivedAt) || conflict} loading={saving} onPress={() => void save()}>{service?.archivedAt ? 'Restaurar y guardar' : 'Guardar servicio'}</Button></View>
  </View>;
}

const createStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg }, flex: { flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderTopWidth: 1, borderBottomColor: t.border },
  heading: { color: t.textPrimary, fontFamily: t.fontSansBold, fontSize: 24, marginBottom: 6 },
  title: { color: t.textPrimary, fontFamily: t.fontSansSemiBold, fontSize: 17 }, label: { color: t.textPrimary, fontFamily: t.fontSansSemiBold, fontSize: 14 },
  secondary: { color: t.textSecondary, fontFamily: t.fontSans, fontSize: 14, lineHeight: 21 }, small: { color: t.textSecondary, fontFamily: t.fontSans, fontSize: 12, lineHeight: 18 },
  scroll: { padding: spacing.lg, gap: 16, maxWidth: 1120, width: '100%', alignSelf: 'center', paddingBottom: 48 },
  fixedName: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: t.border, borderRadius: 10, backgroundColor: t.surface, padding: 14, gap: 10 }, identity: { gap: 10 }, textField: { borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, color: t.textPrimary, backgroundColor: t.bgCard, fontFamily: t.fontSans, fontSize: 15 },
  fieldHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalityTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.border }, modalityTab: { flex: 1, minHeight: 52, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  composition: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' }, vertical: { flexDirection: 'column', alignItems: 'stretch' },
  editor: { flex: 1, gap: 16, minWidth: 0, width: '100%' }, surface: { backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, borderRadius: borderRadius.xl, overflow: 'hidden' },
  sectionTitle: { padding: 16, gap: 6 }, tableHeading: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: t.bg },
  overline: { color: t.textSecondary, fontFamily: t.fontSans, fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  modalitySection: { padding: 20, borderTopWidth: 1, borderTopColor: t.border, gap: 8 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalityLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 }, modalityCell: { width: 142 }, durationCell: { width: 124, gap: 6 }, priceCell: { width: 104, gap: 6 }, audienceCell: { flex: 1, minWidth: 160, gap: 6 },
  controls: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }, mobileControls: { width: '100%', flexWrap: 'wrap' },
  priceInput: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingHorizontal: 12, backgroundColor: t.bgElevated },
  input: { flex: 1, color: t.textPrimary, fontFamily: t.fontSans, fontSize: 16, minHeight: 42, minWidth: 0, padding: 0 }, rowActions: { alignItems: 'flex-start' },
  details: { gap: 12, paddingTop: 8 }, extraRow: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap', paddingVertical: 8 },
  restriction: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  policy: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 4 },
  preview: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 24, gap: 8, width: '100%' }, previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  previewPrice: { color: t.textPrimary, fontFamily: t.fontSansBold, fontSize: 36, marginTop: 20 }, previewModality: { borderTopWidth: 1, borderTopColor: t.borderLight, paddingTop: 16, marginTop: 12, gap: 8 },
  previewLine: { flexDirection: 'row', justifyContent: 'space-between' }, previewFooter: { borderTopWidth: 1, borderTopColor: t.border, paddingTop: 16, marginTop: 16, gap: 8 },
  freeNote: { color: t.primary, fontFamily: t.fontSans, fontSize: 13, lineHeight: 20, paddingTop: 16 }, loading: { padding: 48, alignItems: 'center', gap: 16 },
  feedback: { gap: 12, padding: 16, borderWidth: 1, borderColor: t.error, borderRadius: 12 }, error: { color: t.error, fontFamily: t.fontSans, fontSize: 13 }, success: { color: t.success, fontFamily: t.fontSans, fontSize: 14 },
});
