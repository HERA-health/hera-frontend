import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Button } from '../../../components/common/Button';
import type { AnimatedPressableHandle } from '../../../components/common/AnimatedPressable';
import type { PublicPriceOption } from '../../../services/specialistsService';
import type { SelectedProfileSlot, Specialist } from '../types';
import { formatProfileSlotLabel } from '../profilePresentation';
import { publicAvailabilityLabel, publicModalityLabel, publicProfilePrice } from './publicProfilePresentation';

export interface PublicBookingSummaryProps {
  specialist: Specialist;
  option?: PublicPriceOption;
  selectedSlot: SelectedProfileSlot | null;
  canBook: boolean;
  onOpen: (restoreFocus?: () => void) => void;
  onContinue: () => void;
  actionRef?: React.Ref<AnimatedPressableHandle>;
  onCtaLayout?: (y: number, height: number) => void;
  packageAction?: React.ReactNode;
}

export function PublicBookingSummary({ specialist, option, selectedSlot, canBook, onOpen, onContinue, actionRef, onCtaLayout, packageAction }: PublicBookingSummaryProps) {
  const { theme } = useTheme();
  const changeRef = useRef<React.ElementRef<typeof Pressable>>(null);
  const body = { color: theme.textSecondary, fontFamily: theme.fontSans };
  const strong = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };
  const price = option ? option.priceCents / 100 : specialist.pricePerSession;
  const duration = option?.durationMinutes ?? specialist.slotDuration;
  const serviceKey = (item: PublicPriceOption) => item.serviceId ?? item.serviceKey ?? 'base';
  const services = new Map((specialist.publicOptions ?? []).map(item => [serviceKey(item), item.serviceName ?? 'General']));
  const otherServices = [...services].filter(([key]) => !option || key !== serviceKey(option)).map(([, name]) => name);
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
      {otherServices.length ? <Text style={[styles.small, body]}>También: {otherServices.slice(0, 2).join(' · ')}{otherServices.length > 2 ? ` · y ${otherServices.length - 2} más` : ''}</Text> : null}
    </View> : null}
    <View style={[styles.availability, { borderColor: theme.borderLight }]}>
      <Ionicons name="calendar-outline" size={19} color={theme.primary} />
      <Text style={[styles.description, strong]}>{selectedSlot ? formatProfileSlotLabel(selectedSlot.date, selectedSlot.slot.startTime) : publicAvailabilityLabel(specialist.nextAvailable)}</Text>
    </View>
    {specialist.firstVisitFree ? <View style={[styles.free, { backgroundColor: theme.secondaryMuted }]}>
      <Ionicons name="gift-outline" size={18} color={theme.primary} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.small, strong]}>Primera sesión gratuita</Text>
        <Text style={[styles.small, body]}>Si aún no has tenido sesiones con este profesional.</Text>
      </View>
    </View> : null}
    <View onLayout={event => onCtaLayout?.(event.nativeEvent.layout.y, event.nativeEvent.layout.height)}>
      <Button focusRef={actionRef} fullWidth onPress={selectedSlot ? onContinue : () => onOpen()} disabled={!canBook}
        icon={canBook ? <Ionicons name="arrow-forward" size={17} color={theme.actionPrimaryText} /> : undefined} iconPosition="right">
        {canBook ? selectedSlot ? 'Continuar' : 'Ver disponibilidad' : 'No acepta reservas ahora'}
      </Button>
    </View>
    {canBook && (selectedSlot || (specialist.publicOptions?.length ?? 0) > 1) ? <Pressable ref={changeRef} accessibilityRole="button"
      onPress={() => onOpen(() => changeRef.current?.focus())} style={styles.change}>
      <Text style={[styles.small, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>{selectedSlot ? 'Cambiar horario' : 'Ver servicios y tarifas'}</Text>
    </Pressable> : null}
    {packageAction}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 12 },
  eyebrow: { fontSize: 10, lineHeight: 16, letterSpacing: 1.3 },
  title: { fontSize: 26, lineHeight: 34 },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' },
  price: { fontSize: 28, lineHeight: 34 },
  small: { fontSize: 12, lineHeight: 18 },
  description: { fontSize: 14, lineHeight: 21, flexShrink: 1 },
  availability: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 12 },
  free: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12 },
  change: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: -8 },
});
