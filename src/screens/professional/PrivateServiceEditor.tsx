import { formatPrivatePrice, parsePrivatePrice } from '../../utils/privateTariff';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import axios from 'axios';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import type { ScreenProps } from '../../constants/types';
import { Button } from '../../components/common/Button';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { ServicePatientAssignments } from './ServicePatientAssignments';
import { getErrorMessage } from '../../constants/errors';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { savePrivateService, type CatalogOptionInput, type PrivateServiceCatalog, type PrivateService } from '../../services/privateCatalogService';
import { PRIVATE_MODALITIES, makePrivateServiceDraft, hasSharedPrivateValues, needsPrivateServiceSimplification,
  parsePrivateDuration, type PrivateServiceDraftOption } from '../../utils/privateServiceDraft';

const sharedLabel = 'Misma duración y precio para todas las modalidades';
const visibility = [
  { value: true, label: 'Tarifa pública', icon: 'globe-outline', text: 'Aparece en tu perfil y en el directorio. Cualquier paciente puede reservarla online.' },
  { value: false, label: 'Tarifa privada', icon: 'lock-closed-outline', text: 'No es visible para los pacientes. Solo tú la aplicas desde la agenda a quien quieras.' },
] as const;

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
  const [name, setName] = useState(service?.name ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [draft, setDraft] = useState(() => makePrivateServiceDraft(service?.options ?? []));
  const [shared, setShared] = useState(() => hasSharedPrivateValues(draft));
  const [isPublic, setIsPublic] = useState(() => !service || service.options.filter(o => o.isActive).every(o => o.isPublic));
  const [assignedClientIds, setAssignedClientIds] = useState(service?.assignedClientIds ?? []);
  const mixedVisibility = new Set(service?.options.filter(o => o.isActive).map(o => o.isPublic)).size > 1;
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [conflict, setConflict] = useState(false);
  const baseline = useRef(JSON.stringify({ draft, name, description, shared, isPublic, assignedClientIds }));
  const dirty = mixedVisibility || JSON.stringify({ draft, name, description, shared, isPublic, assignedClientIds }) !== baseline.current;
  const simplify = needsPrivateServiceSimplification(service?.options ?? []);
  const active = draft.filter(o => o.isActive);
  const common = active[0] ?? draft[0];
  const wide = width >= 960;
  const prices = active.map(o => parsePrivatePrice(o.priceText));
  const completePrices = prices.filter((p): p is number => p !== null);
  const previewPrice = active.length && completePrices.length === active.length
    ? `${new Set(completePrices).size > 1 ? 'Desde ' : ''}${formatPrivatePrice(Math.min(...completePrices))}` : 'Precio pendiente';
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);

  const editValues = (id: string, patch: Pick<Partial<PrivateServiceDraftOption>, 'durationText' | 'priceText'>) =>
    setDraft(rows => rows.map(o => shared || o.id === id ? { ...o, ...patch } : o));
  const toggleShared = (enabled: boolean) => {
    if (enabled) setDraft(rows => {
      const reference = rows.find(o => o.isActive) ?? rows[0];
      return rows.map(o => ({ ...o, durationText: reference.durationText, priceText: reference.priceText }));
    });
    setShared(enabled);
  };
  const toggleModality = (id: string) => setDraft(rows => {
    const reference = rows.find(o => o.isActive) ?? rows[0];
    return rows.map(o => o.id !== id ? o : { ...o, isActive: !o.isActive,
      ...(shared && !o.isActive ? { durationText: reference.durationText, priceText: reference.priceText } : {}) });
  });
  const save = async () => {
    if (savingRef.current || conflict) return;
    setShowErrors(true); setError('');
    if (!name.trim() || name.trim().length > 80 || description.trim().length > 240) {
      setError('Revisa el nombre y la descripción.'); return;
    }
    if (!active.length) { setError('Selecciona al menos una modalidad.'); return; }
    const options: CatalogOptionInput[] = [];
    for (const option of active) {
      const durationMinutes = parsePrivateDuration(option.durationText);
      const priceCents = parsePrivatePrice(option.priceText);
      if (durationMinutes === null || priceCents === null) {
        setError('Revisa la duración (de 5 a 240 minutos) y el precio (máximo dos decimales).'); return;
      }
      options.push({ ...(option.isNew ? {} : { id: option.id }), modality: option.modality,
        durationMinutes, priceCents, isActive: true, isPublic, isPreferred: true });
    }
    savingRef.current = true; setSaving(true); onSavingChange(true);
    try {
      const next = await savePrivateService(service?.id, { version: service?.version ?? 0, name: name.trim(),
        description: description.trim() || null, ...(service?.archivedAt ? { restore: true } : {}), options, assignedClientIds: isPublic ? [] : assignedClientIds });
      onSaved(next);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo guardar el servicio. Tu borrador se conserva.'));
      setConflict(axios.isAxiosError(e) && e.response?.data?.code === 'CATALOG_VERSION_CONFLICT');
    } finally { savingRef.current = false; setSaving(false); onSavingChange(false); }
  };
  const valueInputs = (option: PrivateServiceDraftOption, label: string) => <View style={styles.valueRow}>
    <View style={styles.valueCell}>
      <Text style={styles.small}>Duración</Text>
      <View style={[styles.numberField, showErrors && parsePrivateDuration(option.durationText) === null && styles.invalid]}>
        <TextInput accessibilityLabel={`Duración ${label}`} value={option.durationText}
          onChangeText={durationText => editValues(option.id, { durationText })} editable={!saving}
          keyboardType="number-pad" placeholder="60" placeholderTextColor={theme.textSecondary} style={styles.input} />
        <Text style={styles.secondary}>min</Text>
      </View>
      {showErrors && parsePrivateDuration(option.durationText) === null && <Text style={styles.error}>Entre 5 y 240 minutos enteros</Text>}
    </View>
    <View style={styles.valueCell}>
      <Text style={styles.small}>Precio por sesión</Text>
      <View style={[styles.numberField, showErrors && parsePrivatePrice(option.priceText) === null && styles.invalid]}>
        <TextInput accessibilityLabel={`Precio ${label}`} value={option.priceText}
          onChangeText={priceText => editValues(option.id, { priceText })} editable={!saving}
          keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={theme.textSecondary} style={styles.input} />
        <Text style={styles.secondary}>€</Text>
      </View>
      {showErrors && parsePrivatePrice(option.priceText) === null && <Text style={styles.error}>Importe no válido</Text>}
    </View>
  </View>;

  return <View style={styles.root} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    <ScrollView contentContainerStyle={[styles.scroll, width < 480 && { padding: 16 }]} keyboardShouldPersistTaps="handled">
      {!!error && <View accessibilityRole="alert" style={styles.feedback}><Text style={styles.error}>{error}</Text>
        {conflict && <Button variant="outline" onPress={() => showAppAlert(alert, 'Cargar versión actual', 'Se descartará este borrador y se cargarán los cambios guardados.', [
          { text: 'Conservar borrador', style: 'cancel' }, { text: 'Cargar versión actual', onPress: () => { void onReload().catch(e => setError(getErrorMessage(e, 'No se pudo actualizar. Tu borrador se conserva.'))); } },
        ])}>Cargar versión actual</Button>}
      </View>}
      <View style={[styles.composition, !wide && styles.vertical]}>
        <View style={styles.editor}>
          <View style={styles.identity}>
            <Text style={styles.label}>Nombre del servicio</Text>
            <TextInput autoFocus accessibilityLabel="Nombre del servicio" value={name} onChangeText={setName} editable={!saving}
              maxLength={80} placeholder="Nombre del servicio" placeholderTextColor={theme.textSecondary} style={styles.textField} />
            {showErrors && !name.trim() && <Text style={styles.error}>Introduce un nombre</Text>}
            <View style={styles.fieldHeading}><Text style={styles.label}>Descripción · opcional</Text><Text style={styles.small}>{description.length}/240</Text></View>
            <TextInput accessibilityLabel="Descripción pública" value={description} onChangeText={setDescription} editable={!saving} maxLength={240}
              multiline placeholder="Explica brevemente en qué consiste" placeholderTextColor={theme.textSecondary} style={[styles.textField, { minHeight: 64 }]} />
            {!!service?.archivedAt && <Text style={styles.note}>Al guardar se restaurará este servicio. Revisa sus modalidades antes de continuar.</Text>}
          </View>
          {simplify && <View style={styles.notice}>
            <Text style={styles.label}>Revisa la simplificación de este servicio</Text>
            <Text style={styles.small}>Hemos seleccionado la duración principal de cada modalidad. Al guardar, solo quedarán disponibles las opciones de la vista previa.</Text>
            {PRIVATE_MODALITIES.map(m => {
              const extras = service?.options.filter(o => o.isActive && o.modality === m.type && !draft.some(d => d.id === o.id)) ?? [];
              return extras.length ? <Text key={m.type} style={styles.small}>{m.label} · Se retirarán: {extras.map(o => `${o.durationMinutes} min · ${formatPrivatePrice(o.priceCents)}`).join('; ')}.</Text> : null;
            })}
            <Text style={styles.small}>Las citas, facturas y bonos adquiridos conservan sus condiciones. Las plantillas de bonos que incluyan opciones retiradas necesitarán revisión antes de nuevas adquisiciones.</Text>
          </View>}
          <View style={styles.surface}>
            <View style={styles.sectionHeading}><Text style={styles.title}>Modalidades</Text><Text style={styles.secondary}>Elige cómo ofreces este servicio</Text></View>
            <View style={styles.chips}>{draft.map(option => {
              const modality = PRIVATE_MODALITIES.find(m => m.type === option.modality)!;
              return <AnimatedPressable key={option.id} accessibilityRole="checkbox" accessibilityLabel={modality.label}
                accessibilityState={{ checked: option.isActive, disabled: saving }} disabled={saving} onPress={() => toggleModality(option.id)}
                hoverLift={false} pressScale={1}
                onKeyDown={event => {
                  if (event.key === ' ') {
                    event.preventDefault();
                    if (!saving && !event.repeat) toggleModality(option.id);
                  }
                }}
                style={[styles.chip, option.isActive && styles.selectedChip]}>
                <Ionicons name={modality.icon} size={18} color={option.isActive ? theme.primary : theme.textSecondary} />
                <Text style={styles.label}>{modality.label}</Text>
                <Ionicons name={option.isActive ? 'checkbox' : 'square-outline'} size={18} color={option.isActive ? theme.primary : theme.textSecondary} />
              </AnimatedPressable>;
            })}</View>
            {showErrors && !active.length && <Text style={styles.error}>Selecciona al menos una modalidad</Text>}
            <View style={styles.switchRow}>
              <Switch accessibilityLabel={sharedLabel} value={shared} onValueChange={toggleShared} disabled={saving}
                trackColor={{ false: theme.textMuted, true: theme.primary }} thumbColor={theme.textOnPrimary} />
              <Text style={[styles.label, styles.flex]}>{sharedLabel}</Text>
            </View>
            {shared && valueInputs(common, 'común')}
            {shared && <Text style={styles.small}>{active.length ? `Se aplicará a ${active.map(o => PRIVATE_MODALITIES.find(m => m.type === o.modality)?.label).join(', ')}.` : 'Selecciona las modalidades a las que se aplicarán estos valores.'} Desactiva la opción para configurar valores distintos.</Text>}
            {!shared && active.map(option => <View key={option.id} style={styles.modalityRow}>
              <Text style={styles.label}>{PRIVATE_MODALITIES.find(m => m.type === option.modality)?.label}</Text>
              {valueInputs(option, `de ${PRIVATE_MODALITIES.find(m => m.type === option.modality)?.label}`)}
            </View>)}
          </View>
          <View style={styles.surface}>
            <Text style={styles.title}>Visibilidad de la tarifa</Text>
            {mixedVisibility && <Text style={styles.small}>Este servicio tenía distinta visibilidad por modalidad. Al guardar se aplicará la selección a todas; hemos seleccionado privada para evitar publicar tarifas internas.</Text>}
            <View style={[styles.visibilityCards, width < 640 && styles.vertical]}>{visibility.map(choice => <AnimatedPressable
              key={String(choice.value)} accessibilityRole="radio" accessibilityLabel={choice.label}
              accessibilityState={{ checked: isPublic === choice.value, disabled: saving }} disabled={saving}
              onPress={() => setIsPublic(choice.value)} hoverLift={false} pressScale={1}
              onKeyDown={event => { if (event.key === ' ') { event.preventDefault(); if (!saving && !event.repeat) setIsPublic(choice.value); } }}
              style={[styles.visibilityCard, isPublic === choice.value && styles.selectedChip]}>
              <View style={styles.previewHeader}><Ionicons name={choice.icon} size={18} color={theme.primary} />
                <Text style={[styles.label, styles.flex]}>{choice.label}</Text><Ionicons name={isPublic === choice.value ? 'radio-button-on' : 'radio-button-off'} size={18} color={theme.primary} /></View>
              <Text style={styles.small}>{choice.text}</Text>
            </AnimatedPressable>)}</View>
            {isPublic && active.map(option => sourceCatalog.restrictions[option.modality] ? <View key={option.id} style={styles.restriction}>
              <Text style={[styles.small, styles.flex]}>{sourceCatalog.restrictions[option.modality]}</Text>
              <Button disabled={saving} size="small" variant="ghost" onPress={() => navigation.navigate('ProfessionalProfile')}>Ir al perfil</Button>
            </View> : null)}
            {!isPublic && <ServicePatientAssignments value={assignedClientIds} onChange={setAssignedClientIds} disabled={saving} />}
          </View>
          <Text style={styles.small}>Los cambios se aplican a nuevas reservas. Las citas y facturas anteriores conservan sus condiciones.</Text>
        </View>
        <View style={[styles.preview, wide && { width: 280 }]}>
          <View style={styles.previewHeader}><Ionicons name="eye-outline" size={22} color={theme.primary} /><Text style={styles.title}>Vista previa</Text></View>
          <Text style={styles.label}>{isPublic ? 'Pública · Visible en tu perfil' : 'Privada · No visible en tu perfil'}</Text>
          <Text style={styles.small}>{isPublic ? 'Así la verán tus pacientes al reservar' : 'Solo disponible desde tu agenda'}</Text>
          <Text style={styles.small}>{service?.archivedAt ? 'Al restaurar el servicio' : dirty || simplify ? 'Cambios sin guardar' : 'Configuración del servicio'}</Text>
          <Text style={styles.title}>{name.trim() || 'Nombre del servicio'}</Text>
          {!!description.trim() && <Text style={styles.secondary}>{description.trim()}</Text>}
          <Text style={styles.previewPrice}>{previewPrice}</Text>
          <Text style={styles.small}>por sesión · precio final</Text>
          {!active.length && <Text style={styles.secondary}>Selecciona al menos una modalidad.</Text>}
          {active.map(option => {
            const modality = PRIVATE_MODALITIES.find(m => m.type === option.modality)!;
            const duration = parsePrivateDuration(option.durationText);
            const price = parsePrivatePrice(option.priceText);
            return <View key={option.id} style={styles.previewModality}>
              <View style={styles.previewHeader}><Ionicons name={modality.icon} size={16} color={theme.primary} /><Text style={styles.label}>{modality.label}</Text></View>
              <View style={styles.previewLine}><Text style={styles.secondary}>{duration === null ? 'Duración pendiente' : `${duration} min`}</Text><Text style={styles.label}>{price === null ? 'Precio pendiente' : formatPrivatePrice(price)}</Text></View>
              {isPublic && !!sourceCatalog.restrictions[option.modality] && <Text style={styles.small}>Reserva online no disponible · revisa tu perfil</Text>}
            </View>;
          })}
          {sourceCatalog.firstVisitFree && <Text style={styles.note}>Primera sesión sin coste para pacientes elegibles.</Text>}
        </View>
      </View>
    </ScrollView>
    <View style={[styles.toolbar, width < 480 && { gap: 8, paddingHorizontal: 16 }]}>
      <View style={styles.flex}><Text style={styles.small}>{dirty || simplify ? 'Cambios sin guardar' : 'Sin cambios'}</Text></View>
      <Button variant="ghost" disabled={saving} onPress={onClose}>Cancelar</Button>
      <Button disabled={(!dirty && !simplify && !service?.archivedAt) || conflict} loading={saving} onPress={() => void save()}>{service?.archivedAt ? 'Restaurar y guardar' : 'Guardar servicio'}</Button>
    </View>
  </View>;
}

const createStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg }, flex: { flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderTopWidth: 1, borderTopColor: t.border },
  title: { color: t.textPrimary, fontFamily: t.fontSansSemiBold, fontSize: 17 },
  label: { color: t.textPrimary, fontFamily: t.fontSansSemiBold, fontSize: 14, lineHeight: 20 },
  secondary: { color: t.textSecondary, fontFamily: t.fontSans, fontSize: 14, lineHeight: 21 },
  small: { color: t.textSecondary, fontFamily: t.fontSans, fontSize: 12, lineHeight: 18 },
  scroll: { padding: spacing.lg, gap: 16, maxWidth: 1120, width: '100%', alignSelf: 'center', paddingBottom: 32 },
  identity: { gap: 10 }, textField: { borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, color: t.textPrimary, backgroundColor: t.bgCard, fontFamily: t.fontSans, fontSize: 15 },
  fieldHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  composition: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' }, vertical: { flexDirection: 'column', alignItems: 'stretch' },
  editor: { flex: 1, gap: 20, minWidth: 0, width: '100%' },
  surface: { backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, borderRadius: borderRadius.xl, padding: 20, gap: 16 },
  sectionHeading: { gap: 4 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: t.border, borderRadius: 24 },
  selectedChip: { backgroundColor: t.primaryAlpha12, borderColor: t.primary },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valueRow: { flexDirection: 'row', gap: 12 }, valueCell: { flex: 1, minWidth: 0, gap: 6 },
  numberField: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: t.bgElevated },
  input: { flex: 1, color: t.textPrimary, fontFamily: t.fontSans, fontSize: 16, minHeight: 44, minWidth: 0, padding: 0 },
  invalid: { borderColor: t.error }, modalityRow: { gap: 10, borderTopWidth: 1, borderTopColor: t.borderLight, paddingTop: 16 },
  visibilityCards: { flexDirection: 'row', gap: 12 },
  visibilityCard: { flex: 1, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border, borderRadius: 12 },
  restriction: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  notice: { padding: 16, gap: 8, borderRadius: 12, backgroundColor: t.surface, borderLeftWidth: 3, borderLeftColor: t.primary },
  preview: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 20, gap: 10, width: '100%' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  previewPrice: { color: t.textPrimary, fontFamily: t.fontSansBold, fontSize: 30, marginTop: 10 },
  previewModality: { borderTopWidth: 1, borderTopColor: t.borderLight, paddingTop: 14, marginTop: 6, gap: 6 },
  previewLine: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  note: { color: t.primary, fontFamily: t.fontSans, fontSize: 13, lineHeight: 20, paddingTop: 12 },
  feedback: { gap: 12, padding: 16, borderWidth: 1, borderColor: t.error, borderRadius: 12 },
  error: { color: t.error, fontFamily: t.fontSans, fontSize: 13 },
});
