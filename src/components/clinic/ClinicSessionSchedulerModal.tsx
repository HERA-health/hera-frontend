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
  ClinicSessionSlotOption,
  ClinicSessionSlotOptionsResult,
  ClinicSessionServiceOptionsResult,
  CreateClinicSessionPayload,
  GetClinicSessionSlotOptionsInput,
  GetClinicSessionServiceOptionsInput,
} from '../../services/clinicService';
import {
  isClinicSessionConflictError,
  isClinicSessionInvalidSlotError,
  isClinicSessionServiceRefreshError,
} from '../../services/clinic/sessionErrors';
import {
  formatMadridDateKey,
  getMadridDateKey,
  MADRID_TIME_ZONE,
} from '../../utils/madridTime';
import { getNextMadridSchedulerValue } from '../../utils/schedulerDateTime';
import { SchedulerDateTimeSelector } from '../scheduling/SchedulerDateTimeSelector';
import type { SchedulerOpenPanel } from '../scheduling/schedulerTypes';
import {
  createClinicSessionSchedulerForm,
  type ClinicSessionSchedulerErrors,
  type ClinicSessionSchedulerForm,
  type ClinicSessionSchedulerType,
  validateClinicSessionSchedulerForm,
} from './clinicSessionSchedulerDomain';
import { createClinicSchedulerSlots } from './clinicSessionSchedulerAdapter';
import { ClinicSessionServicePicker } from './ClinicSessionServicePicker';
import { useClinicSessionServiceOptions } from './useClinicSessionServiceOptions';

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
  onLoadSlotOptions: (
    input: GetClinicSessionSlotOptionsInput,
  ) => Promise<ClinicSessionSlotOptionsResult>;
  onLoadServiceOptions: (
    input: GetClinicSessionServiceOptionsInput,
  ) => Promise<ClinicSessionServiceOptionsResult>;
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

const formatDateLabel = (dateKey: string): string => {
  const label = formatMadridDateKey(dateKey, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return label.charAt(0).toUpperCase() + label.slice(1);
};

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
  onLoadSlotOptions,
  onLoadServiceOptions,
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
  const [openSchedulePanel, setOpenSchedulePanel] = useState<SchedulerOpenPanel>(null);
  const [slotOptions, setSlotOptions] = useState<ClinicSessionSlotOption[]>([]);
  const [slotOptionsLoading, setSlotOptionsLoading] = useState(false);
  const [slotOptionsError, setSlotOptionsError] = useState<string | null>(null);
  const [slotOptionsRefreshKey, setSlotOptionsRefreshKey] = useState(0);
  const [conflictRefreshPending, setConflictRefreshPending] = useState(false);
  const [conflictedSelection, setConflictedSelection] = useState<{
    clinicSpecialistId: string;
    date: string;
    duration: number;
    time: string;
  } | null>(null);
  const [selectedPatientSnapshot, setSelectedPatientSnapshot] =
    useState<ClinicPatientSummary | null>(null);
  const initializedForOpenRef = useRef(false);
  const openGenerationRef = useRef(0);
  const submittingRef = useRef(false);
  const slotOptionsRequestKeyRef = useRef('');
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const locked = Boolean(lockedPatientId);
  const currentSelectedPatient = patients.find((patient) => patient.id === form.clinicPatientId) ?? null;
  const selectedPatient = currentSelectedPatient ?? (
    selectedPatientSnapshot?.id === form.clinicPatientId ? selectedPatientSnapshot : null
  );
  const selectedAssignment = selectedPatient?.activeAssignment ?? null;
  const {
    catalogActivated,
    services: serviceOptions,
    selectedService,
    selectedServiceId,
    loading: serviceOptionsLoading,
    error: serviceOptionsError,
    selectService,
    retry: retryServiceOptions,
    refreshAfterConflict: refreshServiceOptionsAfterConflict,
  } = useClinicSessionServiceOptions({
    visible,
    contextKey: selectedPatient?.id ?? '',
    clinicSpecialistId: selectedAssignment?.clinicSpecialistStatus === 'ACTIVE'
      ? selectedAssignment.clinicSpecialistId
      : null,
    onLoad: onLoadServiceOptions,
  });
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
  const selectedDuration = catalogActivated
    ? selectedService?.durationMinutes ?? Number.NaN
    : Number(form.duration);
  const selectedDurationIsValid = Number.isInteger(selectedDuration)
    && selectedDuration >= 15
    && selectedDuration <= 180;
  const schedulerSlots = useMemo(
    () => createClinicSchedulerSlots(form.date, slotOptions, new Date(Date.now())),
    [form.date, slotOptions],
  );
  const selectedSchedulerSlot = schedulerSlots.find((slot) => slot.startTime === form.time);
  const selectedSlotIsBlocked = selectedSchedulerSlot ? !selectedSchedulerSlot.selectable : false;
  const selectedSlotHasKnownConflict = Boolean(
    conflictedSelection
    && selectedAssignment
    && conflictedSelection.clinicSpecialistId === selectedAssignment.clinicSpecialistId
    && conflictedSelection.date === form.date
    && conflictedSelection.duration === selectedDuration
    && conflictedSelection.time === form.time,
  );
  const todayDateKey = getMadridDateKey(new Date(Date.now()));
  const selectedDateLabel = form.date ? formatDateLabel(form.date) : 'Selecciona fecha';

  useEffect(() => {
    openGenerationRef.current += 1;

    if (!visible) {
      initializedForOpenRef.current = false;
      submittingRef.current = false;
      setSubmitting(false);
      setErrors({});
      setSelectedPatientSnapshot(null);
      setOpenSchedulePanel(null);
      setSlotOptions([]);
      setSlotOptionsLoading(false);
      setSlotOptionsError(null);
      setSlotOptionsRefreshKey(0);
      setConflictRefreshPending(false);
      setConflictedSelection(null);
      return;
    }

    if (initializedForOpenRef.current) return;
    initializedForOpenRef.current = true;

    const initialSchedule = getNextMadridSchedulerValue(new Date(Date.now()));
    setForm({
      ...createClinicSessionSchedulerForm(lockedPatientId ?? ''),
      ...initialSchedule,
    });
    setErrors({});
    setSelectedPatientSnapshot(
      patients.find((patient) => patient.id === lockedPatientId) ?? null,
    );
    setOpenSchedulePanel(null);
    setSlotOptions([]);
    setSlotOptionsLoading(false);
    setSlotOptionsError(null);
    setSlotOptionsRefreshKey(0);
    setConflictRefreshPending(false);
    setConflictedSelection(null);
  }, [lockedPatientId, visible]);

  useEffect(() => {
    if (!visible || !currentSelectedPatient) return;
    setSelectedPatientSnapshot(currentSelectedPatient);
  }, [currentSelectedPatient, visible]);

  useEffect(() => {
    if (!catalogActivated || !selectedService) return;
    setForm((current) => {
      const nextType = selectedService.modalities.includes(current.type)
        ? current.type
        : selectedService.modalities.includes('IN_PERSON')
          ? 'IN_PERSON'
          : 'PHONE_CALL';
      return {
        ...current,
        duration: String(selectedService.durationMinutes),
        type: nextType,
      };
    });
    setErrors((current) => ({
      ...current,
      duration: undefined,
      type: undefined,
      form: undefined,
    }));
  }, [catalogActivated, selectedService]);

  useEffect(() => {
    if (
      !visible
      || !form.date
      || !selectedDurationIsValid
      || !selectedAssignment
      || selectedAssignment.clinicSpecialistStatus !== 'ACTIVE'
      || catalogActivated === null
      || (catalogActivated && !selectedService)
    ) {
      slotOptionsRequestKeyRef.current = '';
      setSlotOptions([]);
      setSlotOptionsLoading(false);
      setSlotOptionsError(null);
      return;
    }

    const requestKey = [
      selectedAssignment.clinicSpecialistId,
      form.date,
      selectedDuration,
      selectedService?.id ?? 'legacy',
      selectedService?.version ?? 0,
      slotOptionsRefreshKey,
      openGenerationRef.current,
    ].join('|');
    slotOptionsRequestKeyRef.current = requestKey;
    let cancelled = false;
    setSlotOptions([]);
    setSlotOptionsLoading(true);
    setSlotOptionsError(null);

    const slotInput: GetClinicSessionSlotOptionsInput = catalogActivated && selectedService
      ? {
          clinicSpecialistId: selectedAssignment.clinicSpecialistId,
          date: form.date,
          clinicServiceId: selectedService.id,
          clinicServiceVersion: selectedService.version,
        }
      : {
          clinicSpecialistId: selectedAssignment.clinicSpecialistId,
          date: form.date,
          duration: selectedDuration,
        };

    onLoadSlotOptions(slotInput)
      .then((result) => {
        if (cancelled || slotOptionsRequestKeyRef.current !== requestKey) return;
        setSlotOptions(result.slots);
      })
      .catch((error: unknown) => {
        if (cancelled || slotOptionsRequestKeyRef.current !== requestKey) return;
        setSlotOptions([]);
        if (isClinicSessionServiceRefreshError(error)) {
          setErrors((current) => ({
            ...current,
            ...(error.code === 'CLINIC_SESSION_SERVICE_REQUIRED'
              ? { form: error.message, clinicServiceId: undefined }
              : { clinicServiceId: error.message }),
          }));
          refreshServiceOptionsAfterConflict(
            error.code === 'CLINIC_SESSION_SERVICE_UNAVAILABLE',
          );
          setSlotOptionsError('La configuración ha cambiado. Actualizando servicios y disponibilidad…');
          return;
        }
        setSlotOptionsError('No se pudieron comprobar huecos. Se validará al guardar.');
      })
      .finally(() => {
        if (!cancelled && slotOptionsRequestKeyRef.current === requestKey) {
          setSlotOptionsLoading(false);
          setConflictRefreshPending(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    form.date,
    onLoadSlotOptions,
    selectedAssignment,
    catalogActivated,
    selectedService,
    selectedDuration,
    selectedDurationIsValid,
    refreshServiceOptionsAfterConflict,
    slotOptionsRefreshKey,
    visible,
  ]);

  useEffect(() => {
    if (!visible || slotOptions.length === 0) return;

    const selected = slotOptions.find((slot) => slot.startTime === form.time);
    if (selected?.selectable) return;

    const firstAvailable = slotOptions.find((slot) => (
      slot.status === 'AVAILABLE' && slot.startTime >= form.time
    )) ?? slotOptions.find((slot) => slot.status === 'AVAILABLE');

    if (firstAvailable) {
      setForm((current) => ({ ...current, time: firstAvailable.startTime }));
      setErrors((current) => ({ ...current, time: undefined, form: undefined }));
    }
  }, [form.time, slotOptions, visible]);

  const updateField = <K extends keyof ClinicSessionSchedulerForm>(
    field: K,
    value: ClinicSessionSchedulerForm[K],
  ): void => {
    const patientChanged = field === 'clinicPatientId';
    if (patientChanged) {
      setOpenSchedulePanel(null);
      setConflictedSelection(null);
      setConflictRefreshPending(false);
    }
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      ...(patientChanged ? {
        clinicSpecialistId: undefined,
        clinicServiceId: undefined,
        duration: undefined,
        type: undefined,
      } : {}),
      form: undefined,
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (submittingRef.current || conflictRefreshPending || selectedSlotHasKnownConflict) return;

    const validation = validateClinicSessionSchedulerForm(
      form,
      validationPatients,
      new Date(),
      catalogActivated
        ? { catalogActivated: true, service: selectedService }
        : { catalogActivated: false },
    );
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    if (selectedSlotIsBlocked) {
      setErrors({
        time: selectedSchedulerSlot?.message ?? 'Ese hueco no está disponible. Elige otra hora.',
      });
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
      if (isClinicSessionConflictError(error)) {
        setErrors({ time: error.message });
        setConflictedSelection({
          clinicSpecialistId: validation.payload.clinicSpecialistId,
          date: form.date,
          duration: selectedDuration,
          time: form.time,
        });
        setConflictRefreshPending(true);
        setSlotOptionsRefreshKey((current) => current + 1);
        return;
      }
      if (isClinicSessionInvalidSlotError(error)) {
        setErrors({ time: error.message });
        return;
      }
      if (isClinicSessionServiceRefreshError(error)) {
        setErrors(error.code === 'CLINIC_SESSION_SERVICE_REQUIRED'
          ? { form: error.message }
          : { [error.field === 'type' ? 'type' : 'clinicServiceId']: error.message });
        refreshServiceOptionsAfterConflict(
          error.code === 'CLINIC_SESSION_SERVICE_UNAVAILABLE',
        );
        setSlotOptionsRefreshKey((current) => current + 1);
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

            {selectedAssignment ? (
              <View style={styles.serviceState}>
                {serviceOptionsLoading && catalogActivated === null ? (
                  <View accessibilityLiveRegion="polite" style={styles.inlineNotice}>
                    <Ionicons name="sync-outline" size={17} color={theme.primary} />
                    <Text style={styles.inlineNoticeText}>Cargando servicios disponibles…</Text>
                  </View>
                ) : null}
                {serviceOptionsError ? (
                  <View accessibilityRole="alert" style={styles.inlineNotice}>
                    <Ionicons name="alert-circle-outline" size={18} color={theme.error} />
                    <Text style={styles.inlineNoticeText}>{serviceOptionsError}</Text>
                    <Button
                      variant="ghost"
                      size="small"
                      disabled={serviceOptionsLoading || submitting}
                      onPress={retryServiceOptions}
                    >
                      Reintentar
                    </Button>
                  </View>
                ) : null}
                {catalogActivated && serviceOptions.length > 0 ? (
                  <ClinicSessionServicePicker
                    services={serviceOptions}
                    value={selectedServiceId}
                    disabled={submitting || serviceOptionsLoading}
                    error={errors.clinicServiceId}
                    onChange={(service) => {
                      selectService(service.id);
                      setErrors((current) => ({
                        ...current,
                        clinicServiceId: undefined,
                        form: undefined,
                      }));
                    }}
                  />
                ) : null}
                {catalogActivated && !serviceOptionsLoading && serviceOptions.length === 0 ? (
                  <View accessibilityRole="alert" style={styles.emptyCatalog}>
                    <Ionicons name="briefcase-outline" size={20} color={theme.warning} />
                    <View style={styles.emptyCatalogCopy}>
                      <Text style={styles.emptyCatalogTitle}>Sin servicios para este profesional</Text>
                      <Text style={styles.emptyCatalogText}>
                        Asigna al responsable a un servicio activo desde «Servicios» antes de crear la cita.
                      </Text>
                    </View>
                  </View>
                ) : null}
                {catalogActivated === false ? (
                  <View style={styles.legacyNotice}>
                    <Ionicons name="information-circle-outline" size={17} color={theme.textSecondary} />
                    <Text style={styles.legacyNoticeText}>
                      Esta clínica utiliza temporalmente la configuración anterior de duración manual.
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <SchedulerDateTimeSelector
              value={{ date: form.date, time: form.time }}
              dateLabel={selectedDateLabel}
              minDate={todayDateKey}
              timeZone={MADRID_TIME_ZONE}
              timeZoneLabel="Hora peninsular"
              slots={schedulerSlots}
              availabilityState={slotOptionsLoading
                ? 'loading'
                : slotOptionsError
                  ? 'error'
                  : slotOptions.length > 0
                    ? 'ready'
                    : 'idle'}
              availabilityError={slotOptionsError}
              openPanel={openSchedulePanel}
              dateError={errors.date}
              timeError={errors.time}
              disabled={
                submitting
                || serviceOptionsLoading
                || catalogActivated === null
                || Boolean(serviceOptionsError)
                || (catalogActivated && !selectedService)
              }
              allowManualTimeEntry={false}
              legendStates={['available', 'unavailable']}
              legendLabels={{
                available: 'Disponible',
                unavailable: 'No disponible',
                caution: 'Con aviso',
              }}
              testIDPrefix="clinic-session"
              onDateChange={(value) => updateField('date', value)}
              onTimeChange={(value) => updateField('time', value)}
              onOpenPanelChange={setOpenSchedulePanel}
              onRetryAvailability={() => {
                setSlotOptionsRefreshKey((current) => current + 1);
              }}
            />

            {catalogActivated && selectedService ? (
              <View style={styles.serviceSummary}>
                <View style={styles.serviceSummaryIcon}>
                  <Ionicons name="hourglass-outline" size={18} color={theme.primary} />
                </View>
                <View style={styles.serviceSummaryCopy}>
                  <Text style={styles.serviceSummaryLabel}>Condiciones del servicio</Text>
                  <Text style={styles.serviceSummaryValue}>
                    {selectedService.durationMinutes} minutos · {new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: selectedService.currency,
                    }).format(selectedService.price)}
                  </Text>
                </View>
                <Ionicons name="lock-closed-outline" size={17} color={theme.textMuted} />
              </View>
            ) : catalogActivated === false ? <View style={styles.durationField}>
              <Input
                label="Duración"
                accessibilityLabel="Duración de la cita en minutos"
                value={form.duration}
                onChangeText={(value) => updateField('duration', value)}
                error={errors.duration}
                helperText="Entre 15 y 180 minutos"
                keyboardType="numeric"
                editable={!submitting}
                leftIcon={<Ionicons name="hourglass-outline" size={17} color={theme.primary} />}
              />
            </View> : null}

            <View style={styles.modalitySection}>
              <Text style={styles.sectionTitle}>Modalidad</Text>
              <View
                accessibilityLabel="Modalidades disponibles"
                accessibilityRole="radiogroup"
                style={styles.typeGrid}
              >
                {TYPE_OPTIONS.filter((option) => (
                  !catalogActivated || selectedService?.modalities.includes(option.value)
                )).map((option) => {
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
                disabled={
                  submitting
                  || conflictRefreshPending
                  || selectedSlotHasKnownConflict
                  || !selectedPatient
                  || selectedSlotIsBlocked
                  || serviceOptionsLoading
                  || catalogActivated === null
                  || Boolean(serviceOptionsError)
                  || (catalogActivated && !selectedService)
                }
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
  serviceState: { gap: spacing.sm },
  inlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.bgMuted,
    padding: spacing.md,
  },
  inlineNoticeText: {
    flex: 1,
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
    fontSize: 12,
    lineHeight: 17,
  },
  emptyCatalog: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: theme.warning,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.bgMuted,
    padding: spacing.md,
  },
  emptyCatalogCopy: { flex: 1, gap: 2 },
  emptyCatalogTitle: {
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
    fontSize: 13,
  },
  emptyCatalogText: {
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
    fontSize: 12,
    lineHeight: 17,
  },
  legacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: theme.bgMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  legacyNoticeText: {
    flex: 1,
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    fontSize: 12,
    lineHeight: 17,
  },
  serviceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.bgMuted,
    padding: spacing.md,
  },
  serviceSummaryIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: theme.primaryAlpha12,
  },
  serviceSummaryCopy: { flex: 1, gap: 2 },
  serviceSummaryLabel: {
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  serviceSummaryValue: {
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
    fontSize: 14,
  },
  durationField: {
    maxWidth: compact ? '100%' : 260,
    width: '100%',
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
