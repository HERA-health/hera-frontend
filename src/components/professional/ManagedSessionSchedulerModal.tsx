import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing } from '../../constants/colors';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { SchedulerDateTimeSelector } from '../scheduling/SchedulerDateTimeSelector';
import type { SchedulerOpenPanel } from '../scheduling/schedulerTypes';
import type {
  Client,
  CreateManagedClientSessionInput,
  ManagedSessionSlotOption,
  SessionType,
} from '../../services/professionalService';
import {
  getManagedSessionSlotOptions,
  isManagedSessionBufferConflictError,
} from '../../services/professionalService';
import { validateManagedSessionSchedulerInput } from '../../utils/managedSessionSchedulerValidation';
import type { ManagedSessionSchedulerField } from '../../utils/managedSessionSchedulerValidation';
import {
  isManagedSessionDurationOption,
  isManagedSessionTimeOption,
  MANAGED_SESSION_DURATION_OPTIONS,
  parseManagedSessionTimeToMinutes,
} from '../../utils/managedSessionSchedulerOptions';
import {
  formatMadridDateKey,
  getMadridDateKey,
  MADRID_TIME_ZONE,
} from '../../utils/madridTime';
import {
  formatSchedulerMinutesAsTime,
  getMadridMinutesOfDay,
  getNextMadridSchedulerValue,
} from '../../utils/schedulerDateTime';
import { createProfessionalSchedulerSlots } from './managedSessionSchedulerAdapter';
import {
  getManagedSessionClientEmail,
  getManagedSessionClientName,
  ManagedSessionPatientAvatar,
  ManagedSessionPatientSelector,
} from './ManagedSessionPatientSelector';

type IconName = keyof typeof Ionicons.glyphMap;
type FormField = ManagedSessionSchedulerField | 'form';
type BufferConflictState = {
  input: CreateManagedClientSessionInput;
  bufferMinutes: number;
};
type SchedulerMode = 'create' | 'edit';

export interface ManagedSessionSchedulerInitialValues {
  clientId: string;
  date: string;
  duration: number;
  type: SessionType;
}

interface ManagedSessionSchedulerModalProps {
  visible: boolean;
  clients: Client[];
  initialClientId?: string | null;
  editingSessionId?: string | null;
  initialValues?: ManagedSessionSchedulerInitialValues | null;
  mode?: SchedulerMode;
  title?: string;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (input: CreateManagedClientSessionInput) => Promise<void>;
}

const sessionTypes: Array<{ value: SessionType; label: string; icon: IconName }> = [
  { value: 'VIDEO_CALL', label: 'Videollamada', icon: 'videocam-outline' },
  { value: 'PHONE_CALL', label: 'Teléfono', icon: 'call-outline' },
  { value: 'IN_PERSON', label: 'Presencial', icon: 'location-outline' },
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

const getEmailNoticeText = (
  email: string | null,
  isEditing: boolean,
  hasSelectedClient: boolean,
): string => {
  if (!hasSelectedClient) {
    return 'Selecciona un paciente para indicar dónde se enviará el aviso de la cita.';
  }

  if (email) {
    return isEditing
      ? `Se enviará un aviso con los cambios a ${email}.`
      : `Se enviará un aviso de la cita a ${email}.`;
  }

  return isEditing
    ? 'Este paciente no tiene email. La cita se modificará sin aviso por correo.'
    : 'Este paciente no tiene email. La cita se creará sin aviso por correo.';
};

const getInitialClientId = (clients: Client[], initialClientId?: string | null): string => {
  if (initialClientId && clients.some((client) => client.id === initialClientId)) {
    return initialClientId;
  }

  return '';
};

export function ManagedSessionSchedulerModal({
  visible,
  clients,
  initialClientId,
  editingSessionId,
  initialValues,
  mode = 'create',
  title,
  saving = false,
  onClose,
  onSubmit,
}: ManagedSessionSchedulerModalProps) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const [clientId, setClientId] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [durationValue, setDurationValue] = useState('60');
  const [type, setType] = useState<SessionType>('VIDEO_CALL');
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [openSchedulePanel, setOpenSchedulePanel] = useState<SchedulerOpenPanel>(null);
  const [timeEditedManually, setTimeEditedManually] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [bufferConflict, setBufferConflict] = useState<BufferConflictState | null>(null);
  const [slotOptions, setSlotOptions] = useState<ManagedSessionSlotOption[]>([]);
  const [slotOptionsLoading, setSlotOptionsLoading] = useState(false);
  const [slotOptionsError, setSlotOptionsError] = useState<string | null>(null);
  const [slotOptionsRefreshKey, setSlotOptionsRefreshKey] = useState(0);
  const slotOptionsRequestKeyRef = useRef('');
  const formInitializationKeyRef = useRef<string | null>(null);
  const isEditing = mode === 'edit';
  const requestedClientId = initialValues?.clientId ?? initialClientId;
  const initialDate = initialValues?.date;
  const initialDuration = initialValues?.duration;
  const initialType = initialValues?.type;
  const formInitializationKey = JSON.stringify([
    mode,
    editingSessionId ?? null,
    requestedClientId ?? null,
    initialDate ?? null,
    initialDuration ?? null,
    initialType ?? null,
  ]);

  useEffect(() => {
    if (!visible) {
      formInitializationKeyRef.current = null;
      return;
    }
    if (formInitializationKeyRef.current === formInitializationKey) return;
    formInitializationKeyRef.current = formInitializationKey;

    const initialStart = initialDate ? new Date(initialDate) : null;
    const initialScheduleValue = initialStart
      ? {
          date: getMadridDateKey(initialStart),
          time: formatSchedulerMinutesAsTime(getMadridMinutesOfDay(initialStart)),
        }
      : getNextMadridSchedulerValue(new Date(Date.now()));

    setClientId(getInitialClientId(clients, requestedClientId));
    setDateValue(initialScheduleValue.date);
    setTimeValue(initialScheduleValue.time);
    setDurationValue(String(initialDuration ?? 60));
    setType(initialType ?? 'VIDEO_CALL');
    setClientSelectorOpen(false);
    setOpenSchedulePanel(null);
    setTimeEditedManually(false);
    setErrors({});
    setBufferConflict(null);
    setSlotOptions([]);
    setSlotOptionsLoading(false);
    setSlotOptionsError(null);
    setSlotOptionsRefreshKey(0);
  }, [
    clients,
    formInitializationKey,
    initialDate,
    initialDuration,
    initialType,
    requestedClientId,
    visible,
  ]);

  useEffect(() => {
    if (!visible) return;

    setClientId((currentClientId) => {
      if (currentClientId && clients.some((client) => client.id === currentClientId)) {
        return currentClientId;
      }
      return getInitialClientId(clients, requestedClientId);
    });
  }, [clients, requestedClientId, visible]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) || null,
    [clientId, clients]
  );

  const selectedEmail = getManagedSessionClientEmail(selectedClient);
  const hasValidInitialClient = Boolean(
    initialClientId && clients.some((client) => client.id === initialClientId),
  );
  const showClientSelector = !isEditing && !hasValidInitialClient;
  const isCompact = width < 720;
  const emailNoticeText = getEmailNoticeText(selectedEmail, isEditing, Boolean(selectedClient));
  const emailNoticeColor = !selectedClient
    ? theme.textMuted
    : selectedEmail
      ? theme.primary
      : theme.warning;
  const emailNoticeBackground = !selectedClient
    ? theme.bgMuted
    : selectedEmail
      ? theme.primaryAlpha12
      : theme.warningBg;
  const emailNoticeBorder = !selectedClient
    ? theme.border
    : selectedEmail
      ? theme.primaryAlpha20
      : theme.warning;
  const todayDateKey = getMadridDateKey(new Date(Date.now()));
  const selectedDateLabel = dateValue ? formatDateLabel(dateValue) : 'Selecciona fecha';
  const selectedDurationNumber = Number(durationValue);
  const selectedDurationIsAllowed = isManagedSessionDurationOption(selectedDurationNumber);
  const selectedTimeIsAllowed = isManagedSessionTimeOption(timeValue);
  const schedulerSlots = useMemo(
    () => createProfessionalSchedulerSlots(dateValue, slotOptions, new Date(Date.now())),
    [dateValue, slotOptions],
  );
  const selectedSchedulerSlot = schedulerSlots.find((slot) => slot.startTime === timeValue);
  const selectedSlotIsBlocked = selectedSchedulerSlot ? !selectedSchedulerSlot.selectable : false;

  useEffect(() => {
    if (!visible || !dateValue || !selectedDurationIsAllowed) {
      slotOptionsRequestKeyRef.current = '';
      setSlotOptions([]);
      setSlotOptionsLoading(false);
      setSlotOptionsError(null);
      return;
    }

    const requestKey = `${dateValue}|${selectedDurationNumber}|${editingSessionId ?? ''}|${slotOptionsRefreshKey}`;
    slotOptionsRequestKeyRef.current = requestKey;
    let cancelled = false;
    setSlotOptions([]);
    setSlotOptionsLoading(true);
    setSlotOptionsError(null);

    getManagedSessionSlotOptions({
      date: dateValue,
      duration: selectedDurationNumber,
      sessionId: editingSessionId ?? undefined,
    })
      .then((result) => {
        if (cancelled || slotOptionsRequestKeyRef.current !== requestKey) return;
        setSlotOptions(result.slots);
      })
      .catch(() => {
        if (cancelled || slotOptionsRequestKeyRef.current !== requestKey) return;
        setSlotOptions([]);
        setSlotOptionsError('No se pudieron comprobar huecos. Se validará al guardar.');
      })
      .finally(() => {
        if (!cancelled && slotOptionsRequestKeyRef.current === requestKey) {
          setSlotOptionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    dateValue,
    editingSessionId,
    selectedDurationIsAllowed,
    selectedDurationNumber,
    slotOptionsRefreshKey,
    visible,
  ]);

  useEffect(() => {
    if (!visible || isEditing || timeEditedManually || !selectedTimeIsAllowed || slotOptions.length === 0) {
      return;
    }

    const currentSlot = slotOptions.find((slot) => slot.startTime === timeValue);
    if (currentSlot?.selectable) {
      return;
    }

    const selectedMinutes = parseManagedSessionTimeToMinutes(timeValue);
    const firstAvailableSlot = slotOptions.find((slot) => {
      if (slot.status !== 'AVAILABLE') {
        return false;
      }

      const slotMinutes = parseManagedSessionTimeToMinutes(slot.startTime);
      return selectedMinutes === null || slotMinutes === null || slotMinutes >= selectedMinutes;
    }) ?? slotOptions.find((slot) => slot.status === 'AVAILABLE');
    if (firstAvailableSlot) {
      setTimeValue(firstAvailableSlot.startTime);
      setTimeEditedManually(false);
      setBufferConflict(null);
    }
  }, [
    isEditing,
    selectedTimeIsAllowed,
    slotOptions,
    timeEditedManually,
    timeValue,
    visible,
  ]);

  const clearBufferConflict = () => {
    if (bufferConflict) {
      setBufferConflict(null);
    }
  };

  const clearFieldErrors = (...fields: FormField[]) => {
    setErrors((current) => {
      if (!fields.some((field) => current[field])) {
        return current;
      }

      const next = { ...current };
      fields.forEach((field) => {
        delete next[field];
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    const validation = validateManagedSessionSchedulerInput({
      clientId,
      date: dateValue,
      time: timeValue,
      duration: Number(durationValue),
      type,
    });

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

    setErrors({});
    try {
      await onSubmit(validation.input);
      setBufferConflict(null);
    } catch (error: unknown) {
      if (isManagedSessionBufferConflictError(error)) {
        setBufferConflict({
          input: validation.input,
          bufferMinutes: error.bufferMinutes,
        });
        return;
      }

      setErrors({
        form: error instanceof Error
          ? error.message
          : isEditing
          ? 'No se pudo modificar la cita'
          : 'No se pudo crear la cita',
      });
    }
  };

  const handleOverrideBuffer = async () => {
    if (!bufferConflict) return;

    setErrors({});
    try {
      await onSubmit({
        ...bufferConflict.input,
        overrideBuffer: true,
      });
      setBufferConflict(null);
    } catch (error: unknown) {
      setErrors({
        form: error instanceof Error
          ? error.message
          : isEditing
          ? 'No se pudo modificar la cita'
          : 'No se pudo crear la cita',
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={saving ? undefined : onClose}
    >
      <View
        testID="managed-session-modal-overlay"
        style={[styles.overlay, { backgroundColor: theme.overlay }]}
        onTouchStart={() => {
          if (clientSelectorOpen) setClientSelectorOpen(false);
        }}
      >
        <Card
          variant="default"
          padding="none"
          style={[
            styles.modalCard,
            {
              maxHeight: Math.min(height - spacing.xl * 2, 760),
              width: isCompact ? '94%' : 680,
              backgroundColor: theme.bgCard,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>
                {title ?? (isEditing ? 'Modificar cita' : 'Nueva cita')}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                {isEditing
                  ? 'Actualiza la fecha, hora, duración o modalidad de esta cita.'
                  : 'Programa una sesión confirmada para un paciente de tu consulta.'}
              </Text>
            </View>
            <AnimatedPressable
              onPress={onClose}
              disabled={saving}
              style={[styles.iconButton, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}
              accessibilityLabel="Cerrar"
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
            {showClientSelector ? (
              <ManagedSessionPatientSelector
                clients={clients}
                selectedClient={selectedClient}
                selectedClientId={clientId}
                open={visible && clientSelectorOpen}
                error={errors.clientId}
                onOpenChange={(open) => {
                  setClientSelectorOpen(open);
                  if (open) {
                    setOpenSchedulePanel(null);
                  }
                }}
                onSelect={(nextClientId) => {
                  setClientId(nextClientId);
                  clearBufferConflict();
                  clearFieldErrors('clientId', 'form');
                }}
              />
            ) : (
              <View style={[styles.selectedPatient, { borderColor: theme.border, backgroundColor: theme.bgAlt }]}>
                <ManagedSessionPatientAvatar
                  client={selectedClient}
                  testID="managed-session-selected-client-avatar"
                />
                <View style={styles.clientInfo}>
                  <Text style={[styles.clientName, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                    {getManagedSessionClientName(selectedClient)}
                  </Text>
                  <Text style={[styles.clientEmail, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                    {selectedEmail || 'Sin email'}
                  </Text>
                </View>
              </View>
            )}

            <SchedulerDateTimeSelector
              value={{ date: dateValue, time: timeValue }}
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
              timeError={errors.time ?? (!selectedTimeIsAllowed
                ? 'Selecciona una franja horaria de la lista'
                : undefined)}
              disabled={saving}
              legendLabels={{
                available: 'Disponible',
                unavailable: 'No disponible',
                caution: 'Descanso',
              }}
              testIDPrefix="managed-session"
              onDateChange={(nextDate) => {
                setClientSelectorOpen(false);
                setDateValue(nextDate);
                clearBufferConflict();
                clearFieldErrors('date', 'time', 'form');
              }}
              onTimeChange={(nextTime, source) => {
                setClientSelectorOpen(false);
                setTimeValue(nextTime);
                setTimeEditedManually(source === 'manual');
                clearBufferConflict();
                clearFieldErrors('time', 'form');
              }}
              onOpenPanelChange={(panel) => {
                setClientSelectorOpen(false);
                setOpenSchedulePanel(panel);
              }}
              onRetryAvailability={() => {
                setSlotOptionsRefreshKey((current) => current + 1);
              }}
            />

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.label, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                  Duración
                </Text>
                {!selectedDurationIsAllowed && (
                  <Text style={[styles.currentValueText, { color: theme.warning, fontFamily: theme.fontSansSemiBold }]}>
                    {durationValue} min
                  </Text>
                )}
              </View>
              <View style={styles.optionRow}>
                {MANAGED_SESSION_DURATION_OPTIONS.map((option) => {
                  const active = selectedDurationNumber === option;
                  return (
                    <AnimatedPressable
                      key={option}
                      testID={`managed-session-duration-option-${option}`}
                      onPress={() => {
                        setClientSelectorOpen(false);
                        setDurationValue(String(option));
                        clearBufferConflict();
                        clearFieldErrors('duration', 'time', 'form');
                      }}
                      hoverLift={false}
                      style={[
                        styles.pill,
                        {
                          borderColor: active ? theme.primary : theme.border,
                          backgroundColor: active ? theme.primaryAlpha12 : theme.bgMuted,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          {
                            color: active ? theme.primary : theme.textSecondary,
                            fontFamily: theme.fontSansSemiBold,
                          },
                        ]}
                      >
                        {option} min
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
              {(!selectedDurationIsAllowed || errors.duration) && (
                <Text style={[styles.errorText, { color: theme.error, fontFamily: theme.fontSans }]}>
                  {errors.duration ?? 'Selecciona una duración de la lista'}
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                Modalidad
              </Text>
              <View style={styles.typeGrid}>
                {sessionTypes.map((option) => {
                  const active = type === option.value;
                  return (
                    <AnimatedPressable
                      key={option.value}
                      onPress={() => {
                        setClientSelectorOpen(false);
                        setType(option.value);
                        clearBufferConflict();
                        clearFieldErrors('type', 'form');
                      }}
                      hoverLift={false}
                      style={[
                        styles.typeOption,
                        {
                          borderColor: active ? theme.primary : theme.border,
                          backgroundColor: active ? theme.primaryAlpha12 : theme.bgMuted,
                        },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={active ? theme.primary : theme.textSecondary}
                      />
                      <Text
                        style={[
                          styles.typeText,
                          {
                            color: active ? theme.primary : theme.textSecondary,
                            fontFamily: theme.fontSansSemiBold,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            <View
              style={[
                styles.notice,
                {
                  borderColor: emailNoticeBorder,
                  backgroundColor: emailNoticeBackground,
                },
              ]}
            >
              <Ionicons
                name={!selectedClient ? 'person-add-outline' : selectedEmail ? 'mail-outline' : 'mail-open-outline'}
                size={18}
                color={emailNoticeColor}
              />
              <Text style={[styles.noticeText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                {emailNoticeText}
              </Text>
            </View>

            {bufferConflict && (
              <View
                style={[
                  styles.bufferWarning,
                  {
                    borderColor: theme.warning,
                    backgroundColor: theme.warningBg,
                  },
                ]}
              >
                <View style={styles.bufferWarningHeader}>
                  <Ionicons name="time-outline" size={19} color={theme.warning} />
                  <View style={styles.bufferWarningCopy}>
                    <Text style={[styles.bufferWarningTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                      Descanso entre sesiones
                    </Text>
                    <Text style={[styles.bufferWarningText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                      Esta cita no respeta el descanso de {bufferConflict.bufferMinutes} min configurado entre sesiones.
                    </Text>
                  </View>
                </View>
                <View style={styles.bufferWarningActions}>
                  <Button
                    variant="ghost"
                    onPress={() => setBufferConflict(null)}
                    disabled={saving}
                    style={styles.bufferWarningButton}
                  >
                    Revisar hora
                  </Button>
                  <Button
                    variant="primary"
                    onPress={handleOverrideBuffer}
                    disabled={saving}
                    loading={saving}
                    style={styles.bufferWarningButton}
                  >
                    {isEditing ? 'Guardar igualmente' : 'Crear igualmente'}
                  </Button>
                </View>
              </View>
            )}

            {errors.form && (
              <Text style={[styles.errorText, { color: theme.error, fontFamily: theme.fontSans }]}>
                {errors.form}
              </Text>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Button
              variant="ghost"
              onPress={onClose}
              disabled={saving}
              style={styles.footerButton}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onPress={handleSubmit}
              disabled={saving || !clientId || selectedSlotIsBlocked}
              loading={saving}
              icon={<Ionicons name="calendar-outline" size={18} color={theme.textOnPrimary} />}
              style={styles.footerButton}
            >
              {isEditing ? 'Guardar cambios' : 'Crear cita'}
            </Button>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
  },
  selectedPatient: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  clientInfo: {
    flex: 1,
    minWidth: 0,
  },
  clientName: {
    fontSize: 14,
  },
  clientEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  currentValueText: {
    fontSize: 12,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  pillText: {
    fontSize: 13,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeOption: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  typeText: {
    fontSize: 13,
  },
  notice: {
    alignItems: 'flex-start',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  bufferWarning: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  bufferWarningHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bufferWarningCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  bufferWarningTitle: {
    fontSize: 14,
  },
  bufferWarningText: {
    fontSize: 13,
    lineHeight: 19,
  },
  bufferWarningActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  bufferWarningButton: {
    minWidth: 132,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  footerButton: {
    minWidth: 128,
  },
});
