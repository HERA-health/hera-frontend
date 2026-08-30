import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { ClinicSessionServiceOption } from '../../services/clinicService';
import {
  AnimatedPressable,
  type AnimatedPressableHandle,
} from '../common/AnimatedPressable';

interface ClinicSessionServicePickerProps {
  services: ClinicSessionServiceOption[];
  value: string | null;
  disabled?: boolean;
  error?: string;
  onChange: (service: ClinicSessionServiceOption) => void;
}

const formatPrice = (price: number): string => new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
}).format(price);

const modalityLabel = (service: ClinicSessionServiceOption): string => service.modalities
  .map((item) => (item === 'IN_PERSON' ? 'Presencial' : 'Teléfono'))
  .join(' · ');

export function ClinicSessionServicePicker({
  services,
  value,
  disabled = false,
  error,
  onChange,
}: ClinicSessionServicePickerProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const optionRefs = useRef<Array<AnimatedPressableHandle | null>>([]);

  const moveSelection = (index: number, event: React.KeyboardEvent): void => {
    if (disabled || services.length === 0) return;

    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      nextIndex = (index + 1) % services.length;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + services.length) % services.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = services.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    onChange(services[nextIndex]);
    optionRefs.current[nextIndex]?.focus?.();
  };

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View style={styles.headingIcon}>
          <Ionicons name="sparkles-outline" size={17} color={theme.primary} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Servicio</Text>
          <Text style={styles.hint}>Define el precio, la duración y las modalidades de esta cita.</Text>
        </View>
      </View>

      <View
        accessibilityLabel="Servicios disponibles"
        accessibilityRole="radiogroup"
        style={styles.list}
      >
        {services.map((service, index) => {
          const selected = service.id === value;
          return (
            <AnimatedPressable
              key={service.id}
              accessibilityLabel={`${service.name}, ${formatPrice(service.price)}, ${service.durationMinutes} minutos${service.isDefault ? ', predeterminado' : ''}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              focusRef={(node) => {
                optionRefs.current[index] = node;
              }}
              hoverLift={false}
              onKeyDown={(event) => moveSelection(index, event)}
              onPress={() => onChange(service)}
              style={[styles.card, selected ? styles.cardSelected : null]}
              tabIndex={disabled
                ? -1
                : selected || (!value && index === 0)
                  ? 0
                  : -1}
            >
              <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={styles.cardCopy}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{service.name}</Text>
                  {service.isDefault ? <Text style={styles.badge}>Predeterminado</Text> : null}
                </View>
                {service.description ? (
                  <Text numberOfLines={2} style={styles.description}>{service.description}</Text>
                ) : null}
                <Text style={styles.meta}>
                  {formatPrice(service.price)} · {service.durationMinutes} min · {modalityLabel(service)}
                </Text>
              </View>
              {selected ? <Ionicons name="checkmark-circle" size={20} color={theme.primary} /> : null}
            </AnimatedPressable>
          );
        })}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headingIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: theme.primaryAlpha12,
  },
  headingCopy: { flex: 1, gap: 2 },
  title: {
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
    fontSize: 15,
  },
  hint: {
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    fontSize: 12,
    lineHeight: 17,
  },
  list: { gap: spacing.sm },
  card: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.bgCard,
  },
  cardSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryAlpha12,
  },
  radio: {
    width: 19,
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
  },
  radioSelected: { borderColor: theme.primary },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: borderRadius.full,
    backgroundColor: theme.primary,
  },
  cardCopy: { flex: 1, minWidth: 0, gap: 3 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  name: {
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
    fontSize: 14,
  },
  badge: {
    color: theme.primary,
    fontFamily: theme.fontSansSemiBold,
    fontSize: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: theme.bgElevated,
  },
  description: {
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
    fontSize: 12,
    lineHeight: 17,
  },
  meta: {
    color: theme.textMuted,
    fontFamily: theme.fontSansMedium,
    fontSize: 12,
  },
  error: {
    color: theme.error,
    fontFamily: theme.fontSans,
    fontSize: 12,
  },
});
