import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing } from '../../constants/colors';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { AnimatedPressable } from '../common/AnimatedPressable';
import type {
  Client,
  CreateManagedClientSessionInput,
  SessionType,
} from '../../services/professionalService';
import { isManagedSessionBufferConflictError } from '../../services/professionalService';
import { validateManagedSessionSchedulerInput } from '../../utils/managedSessionSchedulerValidation';
import type { ManagedSessionSchedulerField } from '../../utils/managedSessionSchedulerValidation';

type IconName = keyof typeof Ionicons.glyphMap;
type FormField = ManagedSessionSchedulerField | 'form';
type BufferConflictState = {
  input: CreateManagedClientSessionInput;
  bufferMinutes: number;
};

interface ManagedSessionSchedulerModalProps {
  visible: boolean;
  clients: Client[];
  initialClientId?: string | null;
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

const durationOptions = [45, 50, 60, 75, 90];

const pad = (value: number) => String(value).padStart(2, '0');

const roundToNextHalfHour = (date: Date): Date => {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  const minutes = rounded.getMinutes();
  const delta = minutes === 0 ? 0 : minutes <= 30 ? 30 - minutes : 60 - minutes;
  rounded.setMinutes(minutes + delta);
  return rounded;
};

const formatDateInput = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatTimeInput = (date: Date): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const getClientName = (client?: Client | null): string => {
  if (!client) return 'Paciente';

  const managedName = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
  return client.displayName || managedName || client.user?.name || 'Paciente';
};

const getClientEmail = (client?: Client | null): string | null => {
  const email = client?.primaryEmail || client?.email || client?.user?.email || null;
  return email && email.trim().length > 0 ? email : null;
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
  title = 'Nueva cita',
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
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [bufferConflict, setBufferConflict] = useState<BufferConflictState | null>(null);

  useEffect(() => {
    if (!visible) return;

    const defaultStart = roundToNextHalfHour(new Date(Date.now() + 60 * 60 * 1000));
    setClientId(getInitialClientId(clients, initialClientId));
    setDateValue(formatDateInput(defaultStart));
    setTimeValue(formatTimeInput(defaultStart));
    setDurationValue('60');
    setType('VIDEO_CALL');
    setSearch('');
    setErrors({});
    setBufferConflict(null);
  }, [clients, initialClientId, visible]);

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
  const showClientSelector = !initialClientId;
  const isCompact = width < 720;

  const clearBufferConflict = () => {
    if (bufferConflict) {
      setBufferConflict(null);
    }
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
        form: error instanceof Error ? error.message : 'No se pudo crear la cita',
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
        form: error instanceof Error ? error.message : 'No se pudo crear la cita',
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
                {title}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                Programa una sesión confirmada para un paciente de tu consulta.
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
                          <View style={[styles.avatar, { backgroundColor: theme.primaryAlpha12 }]}>
                            <Text style={[styles.avatarText, { color: theme.primary, fontFamily: theme.fontSansBold }]}>
                              {getClientName(client).charAt(0).toUpperCase()}
                            </Text>
                          </View>
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
                <View style={[styles.avatar, { backgroundColor: theme.primaryAlpha12 }]}>
                  <Text style={[styles.avatarText, { color: theme.primary, fontFamily: theme.fontSansBold }]}>
                    {getClientName(selectedClient).charAt(0).toUpperCase()}
                  </Text>
                </View>
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

            <View style={styles.grid}>
              <View style={[styles.field, isCompact && styles.fieldFull]}>
                <Text style={[styles.label, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                  Fecha
                </Text>
                <TextInput
                  value={dateValue}
                  onChangeText={(value) => {
                    setDateValue(value);
                    clearBufferConflict();
                  }}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  keyboardType="numbers-and-punctuation"
                  style={[
                    styles.input,
                    {
                      borderColor: errors.date ? theme.error : theme.border,
                      backgroundColor: theme.bgMuted,
                      color: theme.textPrimary,
                      fontFamily: theme.fontSans,
                    },
                  ]}
                />
                {errors.date && (
                  <Text style={[styles.errorText, { color: theme.error, fontFamily: theme.fontSans }]}>
                    {errors.date}
                  </Text>
                )}
              </View>

              <View style={[styles.field, isCompact && styles.fieldFull]}>
                <Text style={[styles.label, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                  Hora
                </Text>
                <TextInput
                  value={timeValue}
                  onChangeText={(value) => {
                    setTimeValue(value);
                    clearBufferConflict();
                  }}
                  placeholder="HH:MM"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  keyboardType="numbers-and-punctuation"
                  style={[
                    styles.input,
                    {
                      borderColor: errors.time ? theme.error : theme.border,
                      backgroundColor: theme.bgMuted,
                      color: theme.textPrimary,
                      fontFamily: theme.fontSans,
                    },
                  ]}
                />
                {errors.time && (
                  <Text style={[styles.errorText, { color: theme.error, fontFamily: theme.fontSans }]}>
                    {errors.time}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                Duración
              </Text>
              <View style={styles.optionRow}>
                {durationOptions.map((option) => {
                  const active = Number(durationValue) === option;
                  return (
                    <AnimatedPressable
                      key={option}
                      onPress={() => {
                        setDurationValue(String(option));
                        clearBufferConflict();
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
                <TextInput
                  value={durationValue}
                  onChangeText={(value) => {
                    setDurationValue(value);
                    clearBufferConflict();
                  }}
                  keyboardType="number-pad"
                  placeholder="Min"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.durationInput,
                    {
                      borderColor: errors.duration ? theme.error : theme.border,
                      backgroundColor: theme.bgMuted,
                      color: theme.textPrimary,
                      fontFamily: theme.fontSans,
                    },
                  ]}
                />
              </View>
              {errors.duration && (
                <Text style={[styles.errorText, { color: theme.error, fontFamily: theme.fontSans }]}>
                  {errors.duration}
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
                {selectedEmail
                  ? `Se enviará un aviso de la cita a ${selectedEmail}.`
                  : 'Este paciente no tiene email. La cita se creará sin aviso por correo.'}
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
                    Crear igualmente
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
              disabled={saving || clients.length === 0}
              loading={saving}
              icon={<Ionicons name="calendar-outline" size={18} color={theme.textOnPrimary} />}
              style={styles.footerButton}
            >
              Crear cita
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
    width: 36,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  field: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 180,
  },
  fieldFull: {
    flexBasis: '100%',
  },
  input: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 46,
    outlineStyle: 'none' as never,
    paddingHorizontal: spacing.md,
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
  durationInput: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 40,
    outlineStyle: 'none' as never,
    paddingHorizontal: spacing.md,
    width: 92,
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
