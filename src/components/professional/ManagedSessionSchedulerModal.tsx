import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing } from '../../constants/colors';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { AnimatedPressable } from '../common/AnimatedPressable';
import type {
  Client,
  CreateManagedClientSessionInput,
  ManagedSessionSlotOption,
  ManagedSessionSlotStatus,
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
  isManagedSessionTimeInPast,
  isManagedSessionTimeOption,
  MANAGED_SESSION_DURATION_OPTIONS,
  MANAGED_SESSION_TIME_END,
  MANAGED_SESSION_TIME_OPTIONS,
  MANAGED_SESSION_TIME_START,
  MANAGED_SESSION_TIME_STEP_MINUTES,
  parseManagedSessionTimeToMinutes,
} from '../../utils/managedSessionSchedulerOptions';
import { formatMadridDateKey, getMadridDateKey } from '../../utils/madridTime';

LocaleConfig.locales.es = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

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

const pad = (value: number) => String(value).padStart(2, '0');

const getDefaultStartDate = (date: Date): Date => {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);

  const startMinutes = parseManagedSessionTimeToMinutes(MANAGED_SESSION_TIME_START) ?? 0;
  const endMinutes = parseManagedSessionTimeToMinutes(MANAGED_SESSION_TIME_END) ?? 23 * 60;
  const currentMinutes = rounded.getHours() * 60 + rounded.getMinutes();
  const nextStepMinutes =
    Math.ceil(currentMinutes / MANAGED_SESSION_TIME_STEP_MINUTES) * MANAGED_SESSION_TIME_STEP_MINUTES;

  if (nextStepMinutes > endMinutes) {
    rounded.setDate(rounded.getDate() + 1);
    rounded.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    return rounded;
  }

  const selectedMinutes = Math.max(nextStepMinutes, startMinutes);
  rounded.setHours(Math.floor(selectedMinutes / 60), selectedMinutes % 60, 0, 0);
  return rounded;
};

const formatDateInput = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatTimeInput = (date: Date): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const formatDateLabel = (dateKey: string): string => {
  const label = formatMadridDateKey(dateKey, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return label.charAt(0).toUpperCase() + label.slice(1);
};

const getClientName = (client?: Client | null): string => {
  if (!client) return 'Paciente';

  const managedName = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
  return client.displayName || managedName || client.user?.name || 'Paciente';
};

const getFirstNonBlank = (...values: Array<string | null | undefined>): string | null => {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
};

const getClientEmail = (client?: Client | null): string | null => {
  return getFirstNonBlank(client?.primaryEmail, client?.user?.email, client?.email);
};

const getClientAvatar = (client?: Client | null): string | null => {
  return getFirstNonBlank(client?.user?.avatar);
};

const getEmailNoticeText = (email: string | null, isEditing: boolean): string => {
  if (email) {
    return isEditing
      ? `Se enviará un aviso con los cambios a ${email}.`
      : `Se enviará un aviso de la cita a ${email}.`;
  }

  return isEditing
    ? 'Este paciente no tiene email. La cita se modificará sin aviso por correo.'
    : 'Este paciente no tiene email. La cita se creará sin aviso por correo.';
};

const getSlotStatusMessage = (status?: ManagedSessionSlotStatus): string | null => {
  if (status === 'OCCUPIED') {
    return 'Ese hueco ya está ocupado. Elige otra hora.';
  }

  if (status === 'PAST') {
    return 'Esa hora ya ha pasado. Elige otra franja.';
  }

  if (status === 'BUFFER_CONFLICT') {
    return 'Este hueco pisa el descanso configurado entre sesiones.';
  }

  return null;
};

const getSlotAccessibilityStatus = (status: ManagedSessionSlotStatus): string => {
  if (status === 'OCCUPIED') return 'ocupada';
  if (status === 'PAST') return 'pasada';
  if (status === 'BUFFER_CONFLICT') return 'en descanso';
  return 'disponible';
};

const getInitialClientId = (clients: Client[], initialClientId?: string | null): string => {
  if (initialClientId && clients.some((client) => client.id === initialClientId)) {
    return initialClientId;
  }

  return clients[0]?.id || '';
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
  const [search, setSearch] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [bufferConflict, setBufferConflict] = useState<BufferConflictState | null>(null);
  const [slotOptions, setSlotOptions] = useState<ManagedSessionSlotOption[]>([]);
  const [slotOptionsLoading, setSlotOptionsLoading] = useState(false);
  const [slotOptionsError, setSlotOptionsError] = useState<string | null>(null);
  const slotOptionsRequestKeyRef = useRef('');
  const isEditing = mode === 'edit';

  useEffect(() => {
    if (!visible) return;

    const initialStart = initialValues?.date
      ? new Date(initialValues.date)
      : getDefaultStartDate(new Date(Date.now() + 60 * 60 * 1000));
    const requestedClientId = initialValues?.clientId ?? initialClientId;

    setClientId(getInitialClientId(clients, requestedClientId));
    setDateValue(formatDateInput(initialStart));
    setTimeValue(formatTimeInput(initialStart));
    setDurationValue(String(initialValues?.duration ?? 60));
    setType(initialValues?.type ?? 'VIDEO_CALL');
    setSearch('');
    setDatePickerOpen(false);
    setTimePickerOpen(false);
    setErrors({});
    setBufferConflict(null);
    setSlotOptions([]);
    setSlotOptionsLoading(false);
    setSlotOptionsError(null);
  }, [clients, initialClientId, initialValues, visible]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) || null,
    [clientId, clients]
  );

  const filteredClients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return clients;

    return clients.filter((client) => {
      const name = getClientName(client).toLocaleLowerCase();
      const email = getClientEmail(client)?.toLocaleLowerCase() || '';
      return name.includes(query) || email.includes(query);
    });
  }, [clients, search]);

  const selectedEmail = getClientEmail(selectedClient);
  const showClientSelector = !initialClientId && !isEditing;
  const isCompact = width < 720;
  const emailNoticeText = getEmailNoticeText(selectedEmail, isEditing);
  const todayDateKey = getMadridDateKey(new Date(Date.now()));
  const selectedDateLabel = dateValue ? formatDateLabel(dateValue) : 'Selecciona fecha';
  const selectedDurationNumber = Number(durationValue);
  const selectedDurationIsAllowed = isManagedSessionDurationOption(selectedDurationNumber);
  const selectedTimeIsAllowed = isManagedSessionTimeOption(timeValue);
  const slotOptionsByStart = useMemo(() => {
    return new Map(slotOptions.map((slot) => [slot.startTime, slot]));
  }, [slotOptions]);
  const selectedSlotOption = slotOptionsByStart.get(timeValue);
  const selectedSlotMessage = getSlotStatusMessage(selectedSlotOption?.status);
  const selectedSlotIsBlocked = selectedSlotOption ? !selectedSlotOption.selectable : false;
  const calendarMarkedDates = useMemo(
    () => ({
      [dateValue]: {
        selected: true,
        selectedColor: theme.primary,
        selectedTextColor: theme.textOnPrimary,
      },
    }),
    [dateValue, theme.primary, theme.textOnPrimary]
  );
  const calendarTheme = useMemo(
    () => ({
      backgroundColor: 'transparent',
      calendarBackground: 'transparent',
      monthTextColor: theme.textPrimary,
      textMonthFontWeight: '700' as const,
      textMonthFontSize: 16,
      textSectionTitleColor: theme.textMuted,
      textDayHeaderFontWeight: '600' as const,
      textDayHeaderFontSize: 11,
      dayTextColor: theme.textPrimary,
      textDayFontWeight: '500' as const,
      textDayFontSize: 14,
      todayTextColor: theme.primary,
      todayBackgroundColor: 'transparent',
      selectedDayBackgroundColor: theme.primary,
      selectedDayTextColor: theme.textOnPrimary,
      textDisabledColor: theme.textMuted,
      arrowColor: theme.primary,
      dotColor: theme.secondary,
      selectedDotColor: theme.textOnPrimary,
    }),
    [
      theme.primary,
      theme.secondary,
      theme.textMuted,
      theme.textOnPrimary,
      theme.textPrimary,
    ]
  );

  useEffect(() => {
    if (!visible || !dateValue || !selectedDurationIsAllowed) {
      slotOptionsRequestKeyRef.current = '';
      setSlotOptions([]);
      setSlotOptionsLoading(false);
      setSlotOptionsError(null);
      return;
    }

    const requestKey = `${dateValue}|${selectedDurationNumber}|${editingSessionId ?? ''}`;
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
    visible,
  ]);

  useEffect(() => {
    if (!visible || isEditing || !selectedTimeIsAllowed || slotOptions.length === 0) {
      return;
    }

    const currentSlot = slotOptionsByStart.get(timeValue);
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
      setBufferConflict(null);
    }
  }, [
    isEditing,
    selectedTimeIsAllowed,
    slotOptions,
    slotOptionsByStart,
    timeValue,
    visible,
  ]);

  const renderClientAvatar = (client: Client | null, testID: string) => {
    const avatar = getClientAvatar(client);

    return (
      <View style={[styles.avatar, { backgroundColor: theme.primaryAlpha12 }]}>
        {avatar ? (
          <Image
            testID={testID}
            source={{ uri: avatar }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={[styles.avatarText, { color: theme.primary, fontFamily: theme.fontSansBold }]}>
            {getClientName(client).charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
    );
  };

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
        time: selectedSlotMessage ?? 'Ese hueco no está disponible. Elige otra hora.',
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
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
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
              <View style={styles.section}>
                <Text style={[styles.label, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                  Paciente
                </Text>
                <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}>
                  <Ionicons name="search-outline" size={17} color={theme.textMuted} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar por nombre o email"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.searchInput, { color: theme.textPrimary, fontFamily: theme.fontSans }]}
                  />
                </View>
                <View style={styles.clientList}>
                  {filteredClients.length > 0 ? (
                    filteredClients.slice(0, 8).map((client) => {
                      const active = client.id === clientId;
                      const email = getClientEmail(client);
                      return (
                        <AnimatedPressable
                          key={client.id}
                          onPress={() => {
                            setClientId(client.id);
                            clearBufferConflict();
                            clearFieldErrors('clientId', 'form');
                          }}
                          hoverLift={false}
                          style={[
                            styles.clientRow,
                            {
                              borderColor: active ? theme.primary : theme.border,
                              backgroundColor: active ? theme.primaryAlpha12 : theme.bgAlt,
                            },
                          ]}
                        >
                          {renderClientAvatar(client, `managed-session-client-avatar-${client.id}`)}
                          <View style={styles.clientInfo}>
                            <Text
                              style={[styles.clientName, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}
                              numberOfLines={1}
                            >
                              {getClientName(client)}
                            </Text>
                            <Text
                              style={[styles.clientEmail, { color: theme.textSecondary, fontFamily: theme.fontSans }]}
                              numberOfLines={1}
                            >
                              {email || 'Sin email'}
                            </Text>
                          </View>
                          {active && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
                        </AnimatedPressable>
                      );
                    })
                  ) : (
                    <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                      No hay pacientes activos de tu consulta con esa búsqueda.
                    </Text>
                  )}
                </View>
                {errors.clientId && (
                  <Text style={[styles.errorText, { color: theme.error, fontFamily: theme.fontSans }]}>
                    {errors.clientId}
                  </Text>
                )}
              </View>
            ) : (
              <View style={[styles.selectedPatient, { borderColor: theme.border, backgroundColor: theme.bgAlt }]}>
                {renderClientAvatar(selectedClient, 'managed-session-selected-client-avatar')}
                <View style={styles.clientInfo}>
                  <Text style={[styles.clientName, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                    {getClientName(selectedClient)}
                  </Text>
                  <Text style={[styles.clientEmail, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                    {selectedEmail || 'Sin email'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.scheduleRow}>
              <View
                style={[
                  styles.scheduleField,
                  styles.scheduleDateField,
                  isCompact && styles.scheduleFieldFull,
                  datePickerOpen && styles.scheduleFieldOpen,
                ]}
              >
                <Text style={[styles.label, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                  Fecha
                </Text>
                <AnimatedPressable
                  onPress={() => {
                    setDatePickerOpen((current) => !current);
                    setTimePickerOpen(false);
                  }}
                  hoverLift={false}
                  pressScale={0.98}
                  accessibilityLabel="Seleccionar fecha"
                  style={[
                    styles.selectorTrigger,
                    {
                      borderColor: errors.date ? theme.error : theme.border,
                      backgroundColor: theme.bgMuted,
                    },
                  ]}
                >
                  <View style={styles.selectorTextWrap}>
                    <Text
                      style={[styles.selectorPrimaryText, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}
                      numberOfLines={1}
                    >
                      {selectedDateLabel}
                    </Text>
                    <Text style={[styles.selectorSecondaryText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                      {dateValue}
                    </Text>
                  </View>
                  <Ionicons
                    name={datePickerOpen ? 'chevron-up-outline' : 'calendar-outline'}
                    size={19}
                    color={errors.date ? theme.error : theme.primary}
                  />
                </AnimatedPressable>
                {datePickerOpen && (
                  <View
                    style={[
                      styles.dropdownPanel,
                      styles.dateDropdownPanel,
                      isCompact && styles.compactDropdownPanel,
                      { borderColor: theme.border, backgroundColor: theme.bgElevated },
                    ]}
                  >
                    <Calendar
                      current={dateValue}
                      minDate={todayDateKey}
                      markedDates={calendarMarkedDates}
                      onDayPress={(day: DateData) => {
                        setDateValue(day.dateString);
                        setDatePickerOpen(false);
                        clearBufferConflict();
                        clearFieldErrors('date', 'time', 'form');
                      }}
                      enableSwipeMonths
                      theme={calendarTheme}
                      style={styles.dropdownCalendar}
                    />
                  </View>
                )}
                {errors.date && (
                  <Text style={[styles.errorText, { color: theme.error, fontFamily: theme.fontSans }]}>
                    {errors.date}
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.scheduleField,
                  styles.scheduleTimeField,
                  isCompact && styles.scheduleFieldFull,
                  timePickerOpen && styles.scheduleFieldOpen,
                ]}
              >
                <Text style={[styles.label, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                  Hora
                </Text>
                <AnimatedPressable
                  onPress={() => {
                    setTimePickerOpen((current) => !current);
                    setDatePickerOpen(false);
                  }}
                  hoverLift={false}
                  pressScale={0.98}
                  accessibilityLabel="Seleccionar hora"
                  style={[
                    styles.selectorTrigger,
                    {
                      borderColor:
                        errors.time || !selectedTimeIsAllowed || selectedSlotIsBlocked
                          ? theme.error
                          : selectedSlotOption?.status === 'BUFFER_CONFLICT'
                          ? theme.warning
                          : theme.border,
                      backgroundColor: theme.bgMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.timeTriggerText,
                      {
                        color:
                          !selectedTimeIsAllowed || selectedSlotIsBlocked
                            ? theme.error
                            : selectedSlotOption?.status === 'BUFFER_CONFLICT'
                            ? theme.warning
                            : theme.textPrimary,
                        fontFamily: theme.fontSansSemiBold,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {timeValue}
                  </Text>
                  {slotOptionsLoading ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Ionicons
                      name={timePickerOpen ? 'chevron-up-outline' : 'time-outline'}
                      size={19}
                      color={
                        errors.time || !selectedTimeIsAllowed || selectedSlotIsBlocked
                          ? theme.error
                          : selectedSlotOption?.status === 'BUFFER_CONFLICT'
                          ? theme.warning
                          : theme.primary
                      }
                    />
                  )}
                </AnimatedPressable>
                {timePickerOpen && (
                  <View
                    style={[
                      styles.dropdownPanel,
                      styles.timeDropdownPanel,
                      isCompact && styles.compactDropdownPanel,
                      { borderColor: theme.border, backgroundColor: theme.bgElevated },
                    ]}
                  >
                    <View style={[styles.timeLegend, { borderBottomColor: theme.border }]}>
                      <View style={styles.timeLegendItem}>
                        <View
                          style={[
                            styles.timeLegendDot,
                            { borderColor: theme.border, backgroundColor: theme.bgElevated },
                          ]}
                        />
                        <Text style={[styles.timeLegendText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                          Libre
                        </Text>
                      </View>
                      <View style={styles.timeLegendItem}>
                        <View
                          style={[
                            styles.timeLegendDot,
                            styles.timeLegendDotMuted,
                            { borderColor: theme.border, backgroundColor: theme.bgMuted },
                          ]}
                        />
                        <Text style={[styles.timeLegendText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                          Ocupada
                        </Text>
                      </View>
                      <View style={styles.timeLegendItem}>
                        <View
                          style={[
                            styles.timeLegendDot,
                            { borderColor: theme.warning, backgroundColor: theme.warningBg },
                          ]}
                        />
                        <Text style={[styles.timeLegendText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                          Descanso
                        </Text>
                      </View>
                    </View>
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={Platform.OS === 'web'}
                      style={styles.timeOptionsScroll}
                      contentContainerStyle={styles.timeOptionsGrid}
                    >
                      {MANAGED_SESSION_TIME_OPTIONS.map((option) => {
                        const active = timeValue === option;
                        const slotOption = slotOptionsByStart.get(option);
                        const fallbackPast = !slotOption && isManagedSessionTimeInPast(
                          dateValue,
                          option,
                          new Date(Date.now())
                        );
                        const status: ManagedSessionSlotStatus = slotOption?.status ?? (
                          fallbackPast ? 'PAST' : 'AVAILABLE'
                        );
                        const disabled = slotOption ? !slotOption.selectable : fallbackPast;
                        const bufferSlot = status === 'BUFFER_CONFLICT';
                        const unavailableSlot = status === 'OCCUPIED' || status === 'PAST';
                        return (
                          <AnimatedPressable
                            key={option}
                            testID={`managed-session-time-option-${option}`}
                            accessibilityLabel={`Hora ${option}, ${getSlotAccessibilityStatus(status)}`}
                            accessibilityState={{ selected: active, disabled }}
                            onPress={() => {
                              setTimeValue(option);
                              setTimePickerOpen(false);
                              clearBufferConflict();
                              clearFieldErrors('time', 'form');
                            }}
                            disabled={disabled}
                            hoverLift={false}
                            style={[
                              styles.timeOption,
                              {
                                borderColor: active
                                  ? theme.primary
                                  : bufferSlot
                                  ? theme.warning
                                  : theme.border,
                                backgroundColor: active
                                  ? theme.primaryAlpha12
                                  : bufferSlot
                                  ? theme.warningBg
                                  : disabled
                                  ? theme.bgMuted
                                  : theme.bgElevated,
                                opacity: unavailableSlot ? 0.46 : 1,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.timeOptionText,
                                {
                                  color: active
                                    ? theme.primary
                                    : bufferSlot
                                    ? theme.warning
                                    : unavailableSlot
                                    ? theme.textMuted
                                    : theme.textSecondary,
                                  fontFamily: active ? theme.fontSansSemiBold : theme.fontSans,
                                  textDecorationLine: unavailableSlot ? 'line-through' : 'none',
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {option}
                            </Text>
                            {bufferSlot && (
                              <Ionicons name="warning-outline" size={11} color={theme.warning} />
                            )}
                          </AnimatedPressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                {slotOptionsError && (
                  <Text style={[styles.warningText, { color: theme.warning, fontFamily: theme.fontSans }]}>
                    {slotOptionsError}
                  </Text>
                )}
                {selectedSlotOption?.status === 'BUFFER_CONFLICT' && selectedSlotMessage && !errors.time && (
                  <Text style={[styles.warningText, { color: theme.warning, fontFamily: theme.fontSans }]}>
                    {selectedSlotMessage}
                  </Text>
                )}
                {(selectedSlotIsBlocked || !selectedTimeIsAllowed || errors.time) && (
                  <Text style={[styles.errorText, { color: theme.error, fontFamily: theme.fontSans }]}>
                    {errors.time ?? selectedSlotMessage ?? 'Selecciona una franja horaria de la lista'}
                  </Text>
                )}
              </View>
            </View>

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
                  borderColor: selectedEmail ? theme.primaryAlpha20 : theme.warningBg,
                  backgroundColor: selectedEmail ? theme.primaryAlpha12 : theme.warningBg,
                },
              ]}
            >
              <Ionicons
                name={selectedEmail ? 'mail-outline' : 'mail-open-outline'}
                size={18}
                color={selectedEmail ? theme.primary : theme.warning}
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
              disabled={saving || clients.length === 0 || selectedSlotIsBlocked}
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
  inputWrap: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 44,
    outlineStyle: 'none' as never,
  },
  clientList: {
    gap: spacing.sm,
  },
  clientRow: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 60,
    padding: spacing.sm,
  },
  selectedPatient: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 36,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarText: {
    fontSize: 15,
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
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    zIndex: 20,
  },
  scheduleField: {
    gap: spacing.sm,
    position: 'relative',
  },
  scheduleDateField: {
    flex: 1.5,
    minWidth: 260,
  },
  scheduleTimeField: {
    flex: 0.8,
    minWidth: 160,
  },
  scheduleFieldFull: {
    flexBasis: '100%',
    minWidth: '100%',
  },
  scheduleFieldOpen: {
    zIndex: 1000,
  },
  selectorTrigger: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectorTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  selectorPrimaryText: {
    fontSize: 14,
  },
  selectorSecondaryText: {
    fontSize: 12,
    marginTop: 2,
  },
  timeTriggerText: {
    flex: 1,
    fontSize: 15,
  },
  dropdownPanel: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    elevation: 12,
    marginTop: spacing.xs,
    overflow: 'hidden',
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    top: '100%',
    zIndex: 1000,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 12px 28px rgba(62, 92, 79, 0.18)' } as Record<string, string>
      : {}),
  },
  dateDropdownPanel: {
    left: 0,
    padding: spacing.xs,
    width: 334,
  },
  timeDropdownPanel: {
    maxHeight: 226,
    right: 0,
    width: 292,
  },
  compactDropdownPanel: {
    left: 0,
    width: '100%',
  },
  dropdownCalendar: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
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
  timeOptionsScroll: {
    flexGrow: 0,
    maxHeight: 190,
  },
  timeLegend: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  timeLegendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  timeLegendDot: {
    borderRadius: 4,
    borderWidth: 1,
    height: 8,
    width: 8,
  },
  timeLegendDotMuted: {
    opacity: 0.5,
  },
  timeLegendText: {
    fontSize: 10,
  },
  timeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  timeOption: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    minHeight: 36,
    width: 72,
  },
  timeOptionText: {
    fontSize: 13,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 17,
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
