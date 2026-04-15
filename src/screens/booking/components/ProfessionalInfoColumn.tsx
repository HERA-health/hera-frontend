import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { Button } from '../../../components/common/Button';
import { SessionType } from '../../../services/sessionsService';

interface SpecialistInfo {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
  pricePerSession: number;
  specializations?: string[];
  sessionDuration?: number;
}

interface BookingState {
  selectedDate: string | null;
  selectedTime: string | null;
  sessionType: SessionType;
}

interface ProfessionalInfoColumnProps {
  specialist: SpecialistInfo;
  booking: BookingState;
  onConfirm: () => void;
  onSessionTypeChange: (type: SessionType) => void;
  loading?: boolean;
  showConfirmButton?: boolean;
  showSummary?: boolean;
}

const SESSION_OPTIONS: Array<{
  type: SessionType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    type: 'VIDEO_CALL',
    label: 'Videollamada',
    description: 'Sesion segura desde cualquier lugar',
    icon: 'videocam-outline',
  },
  {
    type: 'IN_PERSON',
    label: 'Presencial',
    description: 'Encuentro en la consulta del especialista',
    icon: 'business-outline',
  },
];

const SPECIALIZATION_LABELS: Record<string, string> = {
  anxiety: 'Ansiedad',
  depression: 'Depresión',
  couples: 'Pareja',
  trauma: 'Trauma',
  stress: 'Estrés',
  self_esteem: 'Autoestima',
  selfesteem: 'Autoestima',
  autoestima: 'Autoestima',
  pareja: 'Pareja',
  ansiedad: 'Ansiedad',
  depresion: 'Depresión',
  trauma_y_duelo: 'Trauma y duelo',
  grief: 'Duelo',
  duelo: 'Duelo',
};

const formatSpecialization = (specialization: string): string => {
  const normalized = specialization.trim().toLowerCase().replace(/\s+/g, '_');
  return (
    SPECIALIZATION_LABELS[normalized] ??
    specialization
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

export const ProfessionalInfoColumn: React.FC<ProfessionalInfoColumnProps> = ({
  specialist,
  booking,
  onConfirm,
  onSessionTypeChange,
  loading = false,
  showConfirmButton = true,
  showSummary = true,
}) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 1024;
  const styles = useMemo(() => createStyles(theme, isDark, isCompact), [theme, isDark, isCompact]);
  const isComplete = Boolean(booking.selectedDate && booking.selectedTime);
  const activeType =
    SESSION_OPTIONS.find((option) => option.type === booking.sessionType) ?? SESSION_OPTIONS[0];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <View style={styles.card}>
          <View style={styles.profileRow}>
            {specialist.avatar ? (
              <Image source={{ uri: specialist.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>
                  {specialist.name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}

            <View style={styles.profileText}>
              <Text style={styles.name}>{specialist.name}</Text>
              <Text style={styles.title}>{specialist.title || 'Especialista'}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>PRECIO</Text>
              <Text style={styles.metricValue}>{specialist.pricePerSession}€ / sesión</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>DURACIÓN</Text>
              <Text style={styles.metricValue}>{specialist.sessionDuration ?? 60} min</Text>
            </View>
          </View>

          {specialist.specializations && specialist.specializations.length > 0 && (
            <View style={styles.tagsRow}>
              {specialist.specializations.slice(0, 4).map((specialization) => (
                <View key={specialization} style={styles.tag}>
                  <Text style={styles.tagText}>{formatSpecialization(specialization)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tipo de sesion</Text>
          <Text style={styles.cardSubtitle}>Elige como prefieres tener este encuentro.</Text>

          <View style={styles.sessionList}>
            {SESSION_OPTIONS.map((option) => {
              const selected = booking.sessionType === option.type;

              return (
                <AnimatedPressable
                  key={option.type}
                  onPress={() => onSessionTypeChange(option.type)}
                  style={[styles.sessionItem, selected ? styles.sessionItemSelected : null]}
                >
                  <View
                    style={[
                      styles.sessionIconShell,
                      selected ? styles.sessionIconShellSelected : null,
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={16}
                      color={selected ? theme.textOnPrimary : theme.primary}
                    />
                  </View>

                  <View style={styles.sessionTextBlock}>
                    <Text
                      style={[
                        styles.sessionLabel,
                        selected ? styles.sessionLabelSelected : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.sessionDescription,
                        selected ? styles.sessionDescriptionSelected : null,
                      ]}
                    >
                      {option.description}
                    </Text>
                  </View>

                  {selected && (
                    <Ionicons name="checkmark-circle" size={18} color={theme.textOnPrimary} />
                  )}
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Antes de confirmar</Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Ionicons name="globe-outline" size={14} color={theme.textSecondary} />
              <Text style={styles.infoText}>Horario local adaptado a Europe/Madrid.</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="refresh-outline" size={14} color={theme.textSecondary} />
              <Text style={styles.infoText}>Cancelacion gratis 24 h antes.</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name={activeType.icon} size={14} color={theme.textSecondary} />
              <Text style={styles.infoText}>{activeType.description}</Text>
            </View>
          </View>
        </View>

        {showSummary && (
          <View style={styles.card}>
            <View style={styles.summaryHeader}>
              <Text style={styles.cardTitle}>Resumen de tu reserva</Text>
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeText}>{activeType.label}</Text>
              </View>
            </View>

            <View style={styles.summaryItem}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={booking.selectedDate ? theme.primary : theme.textMuted}
              />
              <Text
                style={[
                  styles.summaryValue,
                  !booking.selectedDate ? styles.summaryValueMuted : null,
                ]}
              >
                {booking.selectedDate ? formatDate(booking.selectedDate) : 'Elige una fecha'}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Ionicons
                name="time-outline"
                size={14}
                color={booking.selectedTime ? theme.primary : theme.textMuted}
              />
              <Text
                style={[
                  styles.summaryValue,
                  !booking.selectedTime ? styles.summaryValueMuted : null,
                ]}
              >
                {booking.selectedTime || 'Elige una hora'}
              </Text>
            </View>

            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>TOTAL ESTIMADO</Text>
                <Text style={styles.totalCaption}>Pago seguro al confirmar la reserva</Text>
              </View>
              <Text style={styles.totalValue}>{specialist.pricePerSession}€</Text>
            </View>

            {showConfirmButton && (
              <Button
                variant="primary"
                size="medium"
                onPress={onConfirm}
                disabled={!isComplete || loading}
                loading={loading}
                fullWidth
                icon={
                  !loading ? (
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                  ) : undefined
                }
              >
                Confirmar reserva
              </Button>
            )}

            {loading && !showConfirmButton && (
              <ActivityIndicator size="small" color={theme.primary} />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean,
  isCompact: boolean,
) =>
  StyleSheet.create({
    container: {
      width: '100%',
      maxWidth: isCompact ? 9999 : 340,
      alignSelf: 'stretch',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      gap: spacing.md,
      paddingBottom: spacing.xs,
    },
    card: {
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: spacing.md,
      gap: spacing.md,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 14,
      elevation: 3,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    avatarPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.primaryAlpha20,
    },
    avatarLetter: {
      fontSize: 24,
      fontFamily: theme.fontDisplayBold,
      color: theme.primary,
    },
    profileText: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 24,
      lineHeight: 28,
      fontFamily: theme.fontDisplayBold,
      color: theme.textPrimary,
    },
    title: {
      fontSize: 14,
      fontFamily: theme.fontSansMedium,
      color: theme.textSecondary,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    metricCard: {
      flex: 1,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      gap: 2,
    },
    metricLabel: {
      fontSize: 10,
      letterSpacing: 0.5,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textMuted,
      textTransform: 'uppercase',
    },
    metricValue: {
      fontSize: 13,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textPrimary,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    tag: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: theme.secondaryAlpha12,
      borderWidth: 1,
      borderColor: theme.glassBorder,
    },
    tagText: {
      fontSize: 11,
      fontFamily: theme.fontSansMedium,
      color: theme.secondaryDark,
    },
    cardTitle: {
      fontSize: 16,
      fontFamily: theme.fontDisplayBold,
      color: theme.textPrimary,
    },
    cardSubtitle: {
      marginTop: -6,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    sessionList: {
      gap: spacing.sm,
    },
    sessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
    },
    sessionItemSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    sessionIconShell: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.primaryMuted : theme.primaryAlpha12,
    },
    sessionIconShellSelected: {
      backgroundColor: 'rgba(255,255,255,0.16)',
    },
    sessionTextBlock: {
      flex: 1,
      gap: 2,
    },
    sessionLabel: {
      fontSize: 14,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textPrimary,
    },
    sessionLabelSelected: {
      color: theme.textOnPrimary,
    },
    sessionDescription: {
      fontSize: 11,
      lineHeight: 15,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    sessionDescriptionSelected: {
      color: 'rgba(255,255,255,0.82)',
    },
    infoList: {
      gap: spacing.sm,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    summaryBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      backgroundColor: theme.secondaryAlpha12,
      borderWidth: 1,
      borderColor: theme.glassBorder,
    },
    summaryBadgeText: {
      fontSize: 10,
      fontFamily: theme.fontSansSemiBold,
      color: theme.secondaryDark,
    },
    summaryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: isDark ? theme.bgElevated : theme.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    summaryValue: {
      flex: 1,
      fontSize: 12,
      fontFamily: theme.fontSansMedium,
      color: theme.textPrimary,
      textTransform: 'capitalize',
    },
    summaryValueMuted: {
      color: theme.textMuted,
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    totalLabel: {
      fontSize: 10,
      letterSpacing: 0.5,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textMuted,
      textTransform: 'uppercase',
    },
    totalCaption: {
      marginTop: 2,
      fontSize: 11,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    totalValue: {
      fontSize: 28,
      fontFamily: theme.fontDisplayBold,
      color: theme.textPrimary,
    },
  });

export default ProfessionalInfoColumn;
