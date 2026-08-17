import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
import { SimpleDropdown, type DropdownOption } from '../common/SimpleDropdown';
import { borderRadius, spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import type {
  ClinicPatientSummary,
  ClinicSessionSummary,
  CreateClinicSessionPayload,
} from '../../services/clinicService';
import { getMadridDateKey } from '../../utils/madridTime';
import {
  createClinicSessionSchedulerForm,
  type ClinicSessionSchedulerErrors,
  type ClinicSessionSchedulerForm,
  type ClinicSessionSchedulerType,
  validateClinicSessionSchedulerForm,
} from './clinicSessionSchedulerDomain';

export interface ClinicSessionSchedulerModalProps {
  visible: boolean;
  clinicName?: string | null;
  patients: ClinicPatientSummary[];
  lockedPatientId?: string | null;
  patientOptions?: DropdownOption<string>[];
  patientLookupSearch?: string;
  patientLookupLoading?: boolean;
  patientLookupLoadingMore?: boolean;
  patientLookupHasMore?: boolean;
  patientLookupError?: string;
  onPatientSearchChange?: (search: string) => void;
  onLoadMorePatients?: () => void;
  onRetryPatientLookup?: () => void;
  onClose: () => void;
  onSubmit: (payload: CreateClinicSessionPayload) => Promise<ClinicSessionSummary>;
  onCreated: (session: ClinicSessionSummary) => void;
}

const TYPE_OPTIONS: Array<{
  value: ClinicSessionSchedulerType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    value: 'IN_PERSON',
    label: 'Presencial',
    description: 'En la clínica',
    icon: 'location-outline',
  },
  {
    value: 'PHONE_CALL',
    label: 'Teléfono',
    description: 'Llamada de voz',
    icon: 'call-outline',
  },
];

export function ClinicSessionSchedulerModal({
  visible,
  clinicName,
  patients,
  lockedPatientId,
  patientOptions = [],
  patientLookupSearch = '',
  patientLookupLoading = false,
  patientLookupLoadingMore = false,
  patientLookupHasMore = false,
  patientLookupError = '',
  onPatientSearchChange,
  onLoadMorePatients,
  onRetryPatientLookup,
  onClose,
  onSubmit,
  onCreated,
}: ClinicSessionSchedulerModalProps): React.ReactElement | null {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const compact = width < 720;
  const styles = useMemo(() => createStyles(theme, compact), [compact, theme]);
  const [form, setForm] = useState<ClinicSessionSchedulerForm>(() => (
    createClinicSessionSchedulerForm(lockedPatientId ?? '')
  ));
  const [errors, setErrors] = useState<ClinicSessionSchedulerErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedPatientSnapshot, setSelectedPatientSnapshot] =
    useState<ClinicPatientSummary | null>(null);
  const initializedForOpenRef = useRef(false);
  const openGenerationRef = useRef(0);
  const submittingRef = useRef(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const locked = Boolean(lockedPatientId);
  const currentSelectedPatient = patients.find((patient) => patient.id === form.clinicPatientId) ?? null;
  const selectedPatient = currentSelectedPatient ?? (
    selectedPatientSnapshot?.id === form.clinicPatientId ? selectedPatientSnapshot : null
  );
  const selectablePatientOptions = useMemo(() => {
    if (
      !selectedPatientSnapshot
      || patientOptions.some((option) => option.value === selectedPatientSnapshot.id)
    ) {
      return patientOptions;
    }

    return [
      {
        label: selectedPatientSnapshot.displayName,
        value: selectedPatientSnapshot.id,
        subtitle: selectedPatientSnapshot.activeAssignment?.clinicSpecialistDisplayName
          ?? 'Sin responsable',
      },
      ...patientOptions,
    ];
  }, [patientOptions, selectedPatientSnapshot]);
  const validationPatients = useMemo(() => {
    if (
      !selectedPatientSnapshot
      || patients.some((patient) => patient.id === selectedPatientSnapshot.id)
    ) {
      return patients;
    }

    return [selectedPatientSnapshot, ...patients];
  }, [patients, selectedPatientSnapshot]);
  const initials = selectedPatient
    ? [selectedPatient.firstName, selectedPatient.lastName]
      .filter(Boolean)
      .map((value) => value?.trim().charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || 'P'
    : 'P';

  useEffect(() => {
    openGenerationRef.current += 1;

    if (!visible) {
      initializedForOpenRef.current = false;
      submittingRef.current = false;
      setSubmitting(false);
      setErrors({});
      setSelectedPatientSnapshot(null);
      return;
    }

    if (initializedForOpenRef.current) return;
    initializedForOpenRef.current = true;

    setForm({
      ...createClinicSessionSchedulerForm(lockedPatientId ?? ''),
      date: getMadridDateKey(),
    });
    setErrors({});
    setSelectedPatientSnapshot(
      patients.find((patient) => patient.id === lockedPatientId) ?? null,
    );
  }, [lockedPatientId, visible]);

  useEffect(() => {
    if (!visible || !currentSelectedPatient) return;
    setSelectedPatientSnapshot(currentSelectedPatient);
  }, [currentSelectedPatient, visible]);

  const updateField = <K extends keyof ClinicSessionSchedulerForm>(
    field: K,
    value: ClinicSessionSchedulerForm[K],
  ): void => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      ...(field === 'clinicPatientId' ? { clinicSpecialistId: undefined } : {}),
      form: undefined,
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (submittingRef.current) return;

    const validation = validateClinicSessionSchedulerForm(form, validationPatients);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    const submissionGeneration = openGenerationRef.current;
    submittingRef.current = true;
    try {
      setSubmitting(true);
      setErrors({});
      const session = await onSubmit(validation.payload);
      if (
        !visibleRef.current
        || openGenerationRef.current !== submissionGeneration
      ) {
        return;
      }
      onCreated(session);
    } catch (error: unknown) {
      if (
        !visibleRef.current
        || openGenerationRef.current !== submissionGeneration
      ) {
        return;
      }
      setErrors({
        form: error instanceof Error ? error.message : 'No se pudo crear la cita.',
      });
    } finally {
      if (
        visibleRef.current
        && openGenerationRef.current === submissionGeneration
      ) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={submitting ? undefined : onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <Card
          variant="default"
          padding="none"
          style={[
            styles.modalCard,
            {
              maxHeight: Math.min(height - spacing.xl * 2, 760),
              backgroundColor: theme.bgCard,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Agenda de clínica</Text>
              <Text style={styles.title}>Nueva cita</Text>
              <Text style={styles.subtitle}>
                Programa una cita confirmada dentro del contexto asistencial de la clínica.
              </Text>
            </View>
            <AnimatedPressable
              accessibilityLabel="Cerrar creación de cita"
              accessibilityRole="button"
              disabled={submitting}
              hoverLift={false}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={theme.textPrimary} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={Platform.OS === 'web'}
          >
            <View style={styles.contextStrip} accessibilityRole="summary">
              <View style={styles.contextIcon}>
                <Ionicons name="business-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.contextCopy}>
                <Text style={styles.contextLabel}>Contexto bloqueado</Text>
                <Text style={styles.contextValue}>{clinicName ?? 'Clínica seleccionada'}</Text>
                <Text style={styles.contextHint}>La cita no puede convertirse en una consulta particular.</Text>
              </View>
              <Ionicons name="lock-closed-outline" size={17} color={theme.textMuted} />
            </View>

            {locked ? (
              <View style={styles.patientCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.patientCopy}>
                  <Text style={styles.patientLabel}>Paciente preseleccionado</Text>
                  <Text style={styles.patientName}>{selectedPatient?.displayName ?? 'Paciente no disponible'}</Text>
                  <Text style={styles.patientMeta}>
                    Responsable: {selectedPatient?.activeAssignment?.clinicSpecialistDisplayName ?? 'Sin responsable activo'}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={21} color={theme.success} />
              </View>
            ) : (
              <View style={styles.sectionRaised}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name="person-outline" size={17} color={theme.primary} />
                  </View>
                  <View style={styles.sectionHeaderCopy}>
                    <Text style={styles.sectionTitle}>Paciente</Text>
                    <Text style={styles.sectionHint}>Solo aparecen pacientes activos con responsable asignado.</Text>
                  </View>
                </View>
                <Input
                  label="Buscar paciente"
                  accessibilityLabel="Buscar paciente para la cita"
                  placeholder="Nombre o apellidos"
                  value={patientLookupSearch}
                  onChangeText={onPatientSearchChange}
                  editable={!submitting}
                  containerStyle={styles.lookupInput}
                  leftIcon={<Ionicons name="search-outline" size={17} color={theme.textMuted} />}
                />
                <SimpleDropdown
                  accessibilityLabel="Paciente de la cita"
                  options={selectablePatientOptions}
                  value={form.clinicPatientId || null}
                  onSelect={(value) => {
                    const patient = patients.find((item) => item.id === value);
                    if (patient) setSelectedPatientSnapshot(patient);
                    updateField('clinicPatientId', value);
                  }}
                  placeholder={patientLookupLoading ? 'Cargando pacientes…' : 'Selecciona paciente'}
                  maxHeight={260}
                />
                {patientLookupError ? (
                  <View accessibilityRole="alert" style={styles.lookupState}>
                    <Ionicons name="alert-circle-outline" size={17} color={theme.error} />
                    <Text style={styles.lookupErrorText}>{patientLookupError}</Text>
                    {onRetryPatientLookup ? (
                      <Button
                        variant="ghost"
                        size="small"
                        onPress={onRetryPatientLookup}
                        disabled={patientLookupLoading || submitting}
                      >
                        Reintentar
                      </Button>
                    ) : null}
                  </View>
                ) : null}
                {!patientLookupLoading
                  && !patientLookupError
                  && selectablePatientOptions.length === 0 ? (
                    <View style={styles.lookupState}>
                      <Ionicons name="people-outline" size={17} color={theme.textMuted} />
                      <Text accessibilityLiveRegion="polite" style={styles.lookupEmptyText}>
                        No hay pacientes activos con responsable asignado para esta búsqueda.
                      </Text>
                    </View>
                  ) : null}
                {patientLookupHasMore && onLoadMorePatients ? (
                  <Button
                    variant="ghost"
                    size="small"
                    onPress={onLoadMorePatients}
                    loading={patientLookupLoadingMore}
                    disabled={patientLookupLoading || submitting}
                  >
                    Cargar más pacientes
                  </Button>
                ) : null}
                {errors.clinicPatientId ? (
                  <Text accessibilityRole="alert" style={styles.error}>{errors.clinicPatientId}</Text>
                ) : null}
                {errors.clinicSpecialistId ? (
                  <Text accessibilityRole="alert" style={styles.error}>{errors.clinicSpecialistId}</Text>
                ) : null}
                {selectedPatient ? (
                  <View style={styles.responsibleRow}>
                    <Ionicons name="person-circle-outline" size={17} color={theme.secondaryDark} />
                    <Text style={styles.responsibleText}>
                      Responsable: {selectedPatient.activeAssignment?.clinicSpecialistDisplayName ?? 'Sin responsable activo'}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            <View style={styles.scheduleGrid}>
              <Input
                label="Fecha"
                accessibilityLabel="Fecha de la cita"
                value={form.date}
                onChangeText={(value) => updateField('date', value)}
                error={errors.date}
                helperText="Formato AAAA-MM-DD · Europe/Madrid"
                editable={!submitting}
                containerStyle={styles.scheduleInput}
                leftIcon={<Ionicons name="calendar-outline" size={17} color={theme.primary} />}
              />
              <Input
                label="Hora"
                accessibilityLabel="Hora de la cita"
                value={form.time}
                onChangeText={(value) => updateField('time', value)}
                error={errors.time}
                helperText="Formato HH:MM"
                editable={!submitting}
                containerStyle={styles.scheduleInput}
                leftIcon={<Ionicons name="time-outline" size={17} color={theme.primary} />}
              />
              <Input
                label="Duración"
                accessibilityLabel="Duración de la cita en minutos"
                value={form.duration}
                onChangeText={(value) => updateField('duration', value)}
                error={errors.duration}
                helperText="Entre 15 y 180 minutos"
                keyboardType="numeric"
                editable={!submitting}
                containerStyle={styles.scheduleInput}
                leftIcon={<Ionicons name="hourglass-outline" size={17} color={theme.primary} />}
              />
            </View>

            <View style={styles.modalitySection}>
              <Text style={styles.sectionTitle}>Modalidad</Text>
              <View style={styles.typeGrid}>
                {TYPE_OPTIONS.map((option) => {
                  const active = form.type === option.value;
                  return (
                    <AnimatedPressable
                      key={option.value}
                      accessibilityLabel={`${option.label}, ${option.description}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active, disabled: submitting }}
                      disabled={submitting}
                      hoverLift={false}
                      onPress={() => updateField('type', option.value)}
                      style={[
                        styles.typeOption,
                        active ? styles.typeOptionActive : null,
                      ]}
                    >
                      <View style={[styles.typeIcon, active ? styles.typeIconActive : null]}>
                        <Ionicons
                          name={option.icon}
                          size={18}
                          color={active ? theme.actionPrimaryText : theme.textSecondary}
                        />
                      </View>
                      <View style={styles.typeCopy}>
                        <Text style={[styles.typeLabel, active ? styles.typeLabelActive : null]}>{option.label}</Text>
                        <Text style={styles.typeDescription}>{option.description}</Text>
                      </View>
                      {active ? <Ionicons name="checkmark-circle" size={18} color={theme.primary} /> : null}
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            {errors.form ? (
              <View accessibilityRole="alert" style={styles.formError}>
                <Ionicons name="alert-circle-outline" size={19} color={theme.error} />
                <Text style={styles.formErrorText}>{errors.form}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.footerHint}>La disponibilidad volverá a validarse al guardar.</Text>
            <View style={styles.footerActions}>
              <Button variant="ghost" size="medium" onPress={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="medium"
                onPress={() => { void handleSubmit(); }}
                loading={submitting}
                disabled={submitting || !selectedPatient}
                icon={<Ionicons name="calendar-outline" size={18} color={theme.actionPrimaryText} />}
              >
                Crear cita
              </Button>
            </View>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme, compact: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: compact ? spacing.sm : spacing.xl,
  },
  modalCard: {
    width: compact ? '100%' : 680,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    padding: compact ? spacing.lg : spacing.xl,
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 3 },
  eyebrow: {
    color: theme.primary,
    fontFamily: theme.fontSansSemiBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.textPrimary,
    fontFamily: theme.fontHeading,
    fontSize: compact ? 22 : 25,
    lineHeight: compact ? 28 : 32,
  },
  subtitle: {
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 520,
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.full,
    backgroundColor: theme.bgMuted,
  },
  body: { flexShrink: 1 },
  bodyContent: {
    padding: compact ? spacing.lg : spacing.xl,
    gap: spacing.lg,
  },
  contextStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: theme.primaryAlpha20,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.primaryAlpha12,
    padding: spacing.md,
  },
  contextIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: theme.bgCard,
  },
  contextCopy: { flex: 1, minWidth: 0 },
  contextLabel: {
    color: theme.primary,
    fontFamily: theme.fontSansSemiBold,
    fontSize: 11,
    lineHeight: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  contextValue: {
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  contextHint: {
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    fontSize: 12,
    lineHeight: 17,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.xl,
    backgroundColor: theme.bgAlt,
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: theme.primary,
  },
  avatarText: {
    color: theme.actionPrimaryText,
    fontFamily: theme.fontSansBold,
    fontSize: 15,
  },
  patientCopy: { flex: 1, minWidth: 0 },
  patientLabel: {
    color: theme.textMuted,
    fontFamily: theme.fontSansMedium,
    fontSize: 11,
    lineHeight: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  patientName: {
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  patientMeta: {
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionRaised: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.xl,
    backgroundColor: theme.bgAlt,
    padding: spacing.md,
    zIndex: 30,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: theme.primaryAlpha12,
  },
  sectionHeaderCopy: { flex: 1, minWidth: 0 },
  sectionTitle: {
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  sectionHint: {
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    fontSize: 12,
    lineHeight: 17,
  },
  lookupInput: { marginBottom: 0 },
  lookupState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.bgMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lookupErrorText: {
    flex: 1,
    color: theme.error,
    fontFamily: theme.fontSansMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  lookupEmptyText: {
    flex: 1,
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    fontSize: 12,
    lineHeight: 17,
  },
  responsibleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  responsibleText: {
    flex: 1,
    color: theme.textSecondary,
    fontFamily: theme.fontSansMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    color: theme.error,
    fontFamily: theme.fontSans,
    fontSize: 12,
    lineHeight: 17,
  },
  scheduleGrid: {
    flexDirection: compact ? 'column' : 'row',
    alignItems: 'flex-start',
    gap: compact ? 0 : spacing.md,
  },
  scheduleInput: {
    flex: compact ? undefined : 1,
    width: compact ? '100%' : undefined,
    minWidth: 0,
    marginBottom: compact ? spacing.sm : 0,
  },
  modalitySection: { gap: spacing.sm },
  typeGrid: { flexDirection: compact ? 'column' : 'row', gap: spacing.sm },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 64,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.bgMuted,
    padding: spacing.sm,
  },
  typeOptionActive: { borderColor: theme.primary, backgroundColor: theme.primaryAlpha12 },
  typeIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: theme.bgCard,
  },
  typeIconActive: { backgroundColor: theme.primary },
  typeCopy: { flex: 1, minWidth: 0 },
  typeLabel: {
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  typeLabelActive: { color: theme.primary },
  typeDescription: {
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    fontSize: 11,
    lineHeight: 15,
  },
  formError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: theme.error,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.errorBg,
    padding: spacing.md,
  },
  formErrorText: {
    flex: 1,
    color: theme.error,
    fontFamily: theme.fontSansMedium,
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    flexDirection: compact ? 'column' : 'row',
    alignItems: compact ? 'stretch' : 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.bgCard,
    padding: compact ? spacing.md : spacing.lg,
  },
  footerHint: {
    flex: compact ? undefined : 1,
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    fontSize: 11,
    lineHeight: 16,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
