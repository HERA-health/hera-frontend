import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Button } from '../../../components/common/Button';
import type { PublicPriceOption } from '../../../services/specialistsService';
import type { SelectedProfileSlot, Specialist } from '../types';
import { formatProfileSlotLabel } from '../profilePresentation';
import { publicAvailabilityLabel, publicModalityLabel, publicProfilePrice } from './publicProfilePresentation';

export interface PublicBookingSummaryProps {
  specialist: Specialist;
  option?: PublicPriceOption;
  selectedSlot: SelectedProfileSlot | null;
  canBook: boolean;
  selectionValidated: boolean;
  onContinue: () => void;
  onCtaLayout?: (y: number, height: number) => void;
  packageAction?: React.ReactNode;
}

export function PublicBookingSummary({ specialist, option, selectedSlot, canBook, selectionValidated, onContinue, onCtaLayout, packageAction }: PublicBookingSummaryProps) {
  const { theme } = useTheme();
  const body = { color: theme.textSecondary, fontFamily: theme.fontSans };
  const strong = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };
  const price = option ? option.priceCents / 100 : specialist.pricePerSession;
  const duration = option?.durationMinutes ?? specialist.slotDuration;
  return <View testID="public-booking-summary" style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}>
    <View style={{ gap: 3 }}>
    <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansBold }]}>UN ESPACIO PARA TI</Text>
    <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Tu próxima sesión</Text>
    </View>
    <View style={styles.priceRow}>
      <Text style={[styles.price, strong]}>{publicProfilePrice(price)}</Text>
      <Text style={[styles.small, body]}>{duration ? `· sesión de ${duration} min` : 'por sesión'}</Text>
    </View>
    {option ? <View style={{ gap: 4 }}>
      <Text style={[styles.description, body]}>{option.serviceName ?? 'General'} · {publicModalityLabel(option.modality)}</Text>
    </View> : null}
    <View style={[styles.availability, { borderColor: theme.borderLight }]}>
      <Ionicons name="calendar-outline" size={19} color={theme.primary} />
      <Text style={[styles.description, strong]}>{selectedSlot ? formatProfileSlotLabel(selectedSlot.date, selectedSlot.slot.startTime) : publicAvailabilityLabel(specialist.nextAvailable)}</Text>
    </View>
    {specialist.firstVisitFree ? <View style={[styles.free, { backgroundColor: theme.secondaryMuted }]}>
      <Ionicons name="gift-outline" size={18} color={theme.primary} />
      <Text style={[styles.small, strong]}>Primera sesión gratuita</Text>
    </View> : null}
    <View style={styles.actions} onLayout={event => onCtaLayout?.(event.nativeEvent.layout.y, event.nativeEvent.layout.height)}>
      <View style={{ flex: 1, minWidth: 0 }}>
      <Button fullWidth onPress={onContinue} disabled={!canBook || Boolean(selectedSlot && !selectionValidated)}
        style={{ minHeight: 44, paddingVertical: 10, paddingHorizontal: 12 }}
        textStyle={{ fontSize: 13 }}
        icon={canBook ? <Ionicons name="arrow-forward" size={17} color={theme.actionPrimaryText} /> : undefined} iconPosition="right">
        {canBook ? 'Reservar' : 'No acepta reservas ahora'}
      </Button>
      </View>
      {packageAction}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 10 },
  eyebrow: { fontSize: 10, lineHeight: 16, letterSpacing: 1.3 },
  title: { fontSize: 26, lineHeight: 34 },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' },
  price: { fontSize: 28, lineHeight: 34 },
  small: { fontSize: 12, lineHeight: 18 },
  description: { fontSize: 14, lineHeight: 21, flexShrink: 1 },
  availability: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 12 },
  free: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  actions: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
});
