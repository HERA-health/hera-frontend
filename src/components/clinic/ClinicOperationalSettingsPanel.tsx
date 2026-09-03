import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Input, useAppAlert } from '../common';
import { borderRadius, spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
  archiveClinicLocation,
  createClinicLocation,
  getClinicOperationalConfiguration,
  updateClinicLocation,
  updateClinicOperationalProfile,
  type ClinicLocation,
  type ClinicLocationInput,
  type ClinicOperationalConfiguration,
  type ClinicWeeklySchedule,
} from '../../services/clinicService';

const dayLabels: Array<{ key: keyof ClinicWeeklySchedule; label: string }> = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const emptySchedule = (): ClinicWeeklySchedule => ({
  monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [],
});

const emptyLocation = (): ClinicLocationInput => ({
  name: '',
  addressLine: '',
  postalCode: null,
  city: null,
  country: 'Spain',
  contactEmail: null,
  contactPhone: null,
  weeklySchedule: emptySchedule(),
  instructions: null,
  isPrimary: false,
});

const toNullable = (value: string | null | undefined): string | null => value?.trim() || null;

export function ClinicOperationalSettingsPanel({
  clinicId,
  canEdit,
}: {
  clinicId: string;
  canEdit: boolean;
}): React.ReactElement {
  const { theme } = useTheme();
  const alert = useAppAlert();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [config, setConfig] = useState<ClinicOperationalConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [location, setLocation] = useState<ClinicLocationInput>(emptyLocation);
  const [profile, setProfile] = useState({
    coordinationName: '', operationalEmail: '', operationalPhone: '', supportChannel: '', generalInstructions: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await getClinicOperationalConfiguration(clinicId);
      setConfig(next);
      setProfile({
        coordinationName: next.operationalProfile?.coordinationName ?? '',
        operationalEmail: next.operationalProfile?.operationalEmail ?? '',
        operationalPhone: next.operationalProfile?.operationalPhone ?? '',
        supportChannel: next.operationalProfile?.supportChannel ?? '',
        generalInstructions: next.operationalProfile?.generalInstructions ?? '',
      });
    } catch (loadError: unknown) {
      setConfig(null);
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la operativa.');
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    setConfig(null);
    setShowLocationEditor(false);
    setEditingLocationId(null);
    setLocation(emptyLocation());
    void load();
  }, [load]);

  const saveProfile = async (): Promise<void> => {
    if (!canEdit) return;
    if (!profile.operationalEmail.trim() && !profile.operationalPhone.trim() && !profile.supportChannel.trim()) {
      await alert.warning({ title: 'Falta un canal operativo', message: 'Indica email, teléfono o canal de soporte.' });
      return;
    }
    setSaving(true);
    try {
      await updateClinicOperationalProfile(clinicId, {
        coordinationName: toNullable(profile.coordinationName),
        operationalEmail: toNullable(profile.operationalEmail),
        operationalPhone: toNullable(profile.operationalPhone),
        supportChannel: toNullable(profile.supportChannel),
        generalInstructions: toNullable(profile.generalInstructions),
        expectedVersion: config?.operationalProfile?.version,
      });
      await load();
      await alert.success({ title: 'Información guardada', message: 'El profesional verá estos datos en Mi clínica.' });
    } catch (saveError: unknown) {
      await alert.error({ title: 'No se pudo guardar', message: saveError instanceof Error ? saveError.message : 'Inténtalo de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  const openLocation = (current?: ClinicLocation): void => {
    setEditingLocationId(current?.id ?? null);
    setLocation(current ? {
      name: current.name,
      addressLine: current.addressLine,
      postalCode: current.postalCode,
      city: current.city,
      country: current.country,
      contactEmail: current.contactEmail,
      contactPhone: current.contactPhone,
      weeklySchedule: current.weeklySchedule,
      instructions: current.instructions,
      isPrimary: current.isPrimary,
    } : emptyLocation());
    setShowLocationEditor(true);
  };

  const saveLocation = async (): Promise<void> => {
    if (!canEdit || !location.name.trim() || !location.addressLine.trim()) {
      await alert.warning({ title: 'Revisa la sede', message: 'El nombre y la dirección operativa son obligatorios.' });
      return;
    }
    setSaving(true);
    try {
      const payload: ClinicLocationInput = {
        ...location,
        name: location.name.trim(),
        addressLine: location.addressLine.trim(),
        postalCode: toNullable(location.postalCode),
        city: toNullable(location.city),
        contactEmail: toNullable(location.contactEmail),
        contactPhone: toNullable(location.contactPhone),
        instructions: toNullable(location.instructions),
      };
      const current = config?.locations.find((item) => item.id === editingLocationId);
      if (current) {
        await updateClinicLocation(clinicId, current.id, { ...payload, expectedVersion: current.version });
      } else {
        await createClinicLocation(clinicId, payload);
      }
      setShowLocationEditor(false);
      setEditingLocationId(null);
      setLocation(emptyLocation());
      await load();
    } catch (saveError: unknown) {
      await alert.error({ title: 'No se pudo guardar la sede', message: saveError instanceof Error ? saveError.message : 'Inténtalo de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  const archiveLocation = async (current: ClinicLocation): Promise<void> => {
    const confirmed = await alert.confirm({
      title: 'Archivar sede',
      message: `La sede ${current.name} dejará de mostrarse a profesionales. Su historial se conserva.`,
      confirmLabel: 'Archivar',
      destructive: true,
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await archiveClinicLocation(clinicId, current.id, current.version);
      await load();
    } catch (archiveError: unknown) {
      await alert.error({ title: 'No se pudo archivar', message: archiveError instanceof Error ? archiveError.message : 'Inténtalo de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  const updateInterval = (
    day: keyof ClinicWeeklySchedule,
    index: number,
    field: 'start' | 'end',
    value: string,
  ): void => setLocation((current) => ({
    ...current,
    weeklySchedule: {
      ...current.weeklySchedule,
      [day]: current.weeklySchedule[day].map((interval, intervalIndex) => (
        intervalIndex === index ? { ...interval, [field]: value } : interval
      )),
    },
  }));

  if (loading && !config) return <View style={styles.state}><ActivityIndicator color={theme.primary} /><Text style={styles.muted}>Cargando coordinación y sedes…</Text></View>;
  if (!config) return <View style={styles.state}><Text style={styles.error}>{error}</Text><Button variant="outline" onPress={() => { void load(); }}>Reintentar</Button></View>;

  return (
    <View style={styles.root}>
      <View style={styles.sectionHeader}>
        <View style={styles.flex}>
          <Text style={styles.title}>Coordinación y soporte</Text>
          <Text style={styles.muted}>Datos operativos visibles para profesionales. No se usa el domicilio fiscal.</Text>
        </View>
      </View>
      <View style={styles.grid}>
        <Input label="Nombre de coordinación" value={profile.coordinationName} onChangeText={(value) => setProfile((current) => ({ ...current, coordinationName: value }))} editable={canEdit && !saving} />
        <Input label="Email operativo" value={profile.operationalEmail} onChangeText={(value) => setProfile((current) => ({ ...current, operationalEmail: value }))} autoCapitalize="none" keyboardType="email-address" editable={canEdit && !saving} />
        <Input label="Teléfono operativo" value={profile.operationalPhone} onChangeText={(value) => setProfile((current) => ({ ...current, operationalPhone: value }))} keyboardType="phone-pad" editable={canEdit && !saving} />
        <Input label="Canal de soporte" value={profile.supportChannel} onChangeText={(value) => setProfile((current) => ({ ...current, supportChannel: value }))} editable={canEdit && !saving} />
      </View>
      <Input label="Instrucciones generales" value={profile.generalInstructions} onChangeText={(value) => setProfile((current) => ({ ...current, generalInstructions: value }))} multiline editable={canEdit && !saving} />
      <View style={styles.actions}><Button size="small" onPress={() => { void saveProfile(); }} loading={saving} disabled={!canEdit}>Guardar información operativa</Button></View>

      <View style={styles.divider} />
      <View style={styles.sectionHeader}>
        <View style={styles.flex}><Text style={styles.title}>Sedes</Text><Text style={styles.muted}>Archiva sedes antiguas; no se eliminan.</Text></View>
        <Button size="small" variant="outline" onPress={() => openLocation()} disabled={!canEdit || saving}>Nueva sede</Button>
      </View>
      {config.locations.filter((item) => item.status === 'ACTIVE').length === 0 ? <Text style={styles.muted}>No hay sedes activas.</Text> : config.locations.filter((item) => item.status === 'ACTIVE').map((item) => (
        <View key={item.id} style={styles.locationCard}>
          <View style={styles.flex}>
            <View style={styles.locationTitleRow}><Text style={styles.locationTitle}>{item.name}</Text>{item.isPrimary ? <Text style={styles.primary}>Principal</Text> : null}</View>
            <Text style={styles.muted}>{[item.addressLine, item.postalCode, item.city].filter(Boolean).join(', ')}</Text>
            <Text style={styles.small}>{item.specialistLinks.length} profesionales vinculados</Text>
          </View>
          <View style={styles.actions}>
            <Button size="small" variant="ghost" onPress={() => openLocation(item)} disabled={!canEdit || saving}>Editar</Button>
            <Button size="small" variant="ghost" onPress={() => { void archiveLocation(item); }} disabled={!canEdit || saving || item.isPrimary}>Archivar</Button>
          </View>
        </View>
      ))}

      {showLocationEditor ? <View style={styles.editor}>
        <View style={styles.sectionHeader}><Text style={styles.title}>{editingLocationId ? 'Editar sede' : 'Nueva sede'}</Text><Button size="small" variant="ghost" onPress={() => setShowLocationEditor(false)}>Cerrar</Button></View>
        <View style={styles.grid}>
          <Input label="Nombre" value={location.name} onChangeText={(value) => setLocation((current) => ({ ...current, name: value }))} />
          <Input label="Dirección operativa" value={location.addressLine} onChangeText={(value) => setLocation((current) => ({ ...current, addressLine: value }))} />
          <Input label="Código postal" value={location.postalCode ?? ''} onChangeText={(value) => setLocation((current) => ({ ...current, postalCode: value }))} />
          <Input label="Ciudad" value={location.city ?? ''} onChangeText={(value) => setLocation((current) => ({ ...current, city: value }))} />
          <Input label="Email de sede" value={location.contactEmail ?? ''} onChangeText={(value) => setLocation((current) => ({ ...current, contactEmail: value }))} />
          <Input label="Teléfono de sede" value={location.contactPhone ?? ''} onChangeText={(value) => setLocation((current) => ({ ...current, contactPhone: value }))} />
        </View>
        <View style={styles.switchRow}><View style={styles.flex}><Text style={styles.locationTitle}>Sede principal</Text><Text style={styles.muted}>Solo puede existir una sede principal activa.</Text></View><Switch value={location.isPrimary} onValueChange={(value) => setLocation((current) => ({ ...current, isPrimary: value }))} /></View>
        <Text style={styles.scheduleTitle}>Horario semanal · Europe/Madrid</Text>
        {dayLabels.map(({ key, label }) => (
          <View key={key} style={styles.dayRow}>
            <Text style={styles.dayLabel}>{label}</Text>
            <View style={styles.intervals}>
              {location.weeklySchedule[key].map((interval, index) => (
                <View key={`${key}-${index}`} style={styles.intervalRow}>
                  <Input label="Desde" value={interval.start} onChangeText={(value) => updateInterval(key, index, 'start', value)} placeholder="09:00" />
                  <Input label="Hasta" value={interval.end} onChangeText={(value) => updateInterval(key, index, 'end', value)} placeholder="14:00" />
                  <Button size="small" variant="ghost" onPress={() => setLocation((current) => ({ ...current, weeklySchedule: { ...current.weeklySchedule, [key]: current.weeklySchedule[key].filter((_, intervalIndex) => intervalIndex !== index) } }))}>Quitar</Button>
                </View>
              ))}
              {location.weeklySchedule[key].length < 3 ? <Button size="small" variant="ghost" onPress={() => setLocation((current) => ({ ...current, weeklySchedule: { ...current.weeklySchedule, [key]: [...current.weeklySchedule[key], { start: '09:00', end: '14:00' }] } }))}>Añadir intervalo</Button> : null}
            </View>
          </View>
        ))}
        <Input label="Instrucciones de la sede" value={location.instructions ?? ''} onChangeText={(value) => setLocation((current) => ({ ...current, instructions: value }))} multiline />
        <View style={styles.actions}><Button onPress={() => { void saveLocation(); }} loading={saving}>{editingLocationId ? 'Guardar sede' : 'Crear sede'}</Button></View>
      </View> : null}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  root: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgCard, borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.md },
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  title: { color: theme.textPrimary, fontFamily: theme.fontHeading, fontSize: 18, lineHeight: 24 },
  muted: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 13, lineHeight: 19 },
  small: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 17 },
  error: { color: theme.error, fontFamily: theme.fontSans, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
  divider: { height: 1, backgroundColor: theme.borderLight, marginVertical: spacing.sm },
  locationCard: { borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.bgMuted, borderRadius: borderRadius.lg, padding: spacing.md, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  locationTitleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  locationTitle: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 14 },
  primary: { color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 11, textTransform: 'uppercase' },
  editor: { borderTopWidth: 1, borderTopColor: theme.border, marginTop: spacing.md, paddingTop: spacing.lg, gap: spacing.md },
  switchRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scheduleTitle: { color: theme.textPrimary, fontFamily: theme.fontHeading, fontSize: 16 },
  dayRow: { borderTopWidth: 1, borderTopColor: theme.borderLight, paddingTop: spacing.sm, gap: spacing.sm },
  dayLabel: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 13 },
  intervals: { gap: spacing.sm },
  intervalRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: spacing.sm },
});
