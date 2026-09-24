import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/common/Button';
import { useTheme } from '../../../contexts/ThemeContext';
import { spacing } from '../../../constants/colors';
import type { BookingQuote } from '../../../services/sessionsService';
import { BOOKING_SESSION_OPTIONS, formatBookingDate, getQuotePresentation, type BookingSelection } from './bookingPresentation';

interface Props {
  booking: BookingSelection;
  duration: number;
  bookingQuote: BookingQuote | null;
  quoteLoading: boolean;
  quoteError: string | null;
  actionLabel: string;
  actionHint: string;
  disabled: boolean;
  loading: boolean;
  onConfirm: () => void;
  children: React.ReactNode;
}

/** The public booking's only action stays in the reading order after contact details. */
export function BookingConfirmationPanel({
  booking, duration, bookingQuote, quoteLoading, quoteError,
  actionLabel, actionHint, disabled, loading, onConfirm, children,
}: Props) {
  const { theme } = useTheme();
  const quote = getQuotePresentation({ bookingQuote, quoteLoading, quoteError, quoteIsEstimated: true });
  const modality = BOOKING_SESSION_OPTIONS.find(option => option.type === booking.sessionType)?.label;
  const fields = [
    ...(bookingQuote?.serviceName ? [{ label: 'Servicio', value: bookingQuote.serviceName }] : []),
    { label: 'Fecha', value: booking.selectedDate ? formatBookingDate(booking.selectedDate) : 'Por elegir' },
    { label: 'Hora', value: booking.selectedTime || 'Por elegir' },
    { label: 'Duración', value: `${duration} min` },
    { label: 'Total', value: quote.priceText },
  ];

  return (
    <View testID="booking-contact-confirmation" style={[styles.container, { borderColor: theme.border }]}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Revisa tu cita</Text>
        <Text style={[styles.copy, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{modality}</Text>
      </View>
      <View style={styles.summary}>
        {fields.map(field => (
          <View key={field.label} style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{field.label}</Text>
            <Text style={[styles.value, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{field.value}</Text>
          </View>
        ))}
      </View>
      <Text accessibilityRole={quoteError ? 'alert' : undefined} style={[styles.copy, { color: quoteError ? theme.error : theme.textSecondary, fontFamily: theme.fontSans }]}>
        {quote.caption}{'\n'}Horario de Europe/Madrid
      </Text>
      {children}
      <Button variant="primary" size="medium" onPress={onConfirm} disabled={disabled} loading={loading} fullWidth>
        {actionLabel}
      </Button>
      <Text style={[styles.hint, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{actionHint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderTopWidth: 1, paddingTop: spacing.lg, gap: spacing.md },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { fontSize: 18, lineHeight: 24 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  field: { flexGrow: 1, flexBasis: 110, gap: 4 },
  label: { fontSize: 12, lineHeight: 18 },
  value: { fontSize: 16, lineHeight: 22 },
  copy: { fontSize: 12, lineHeight: 18 },
  hint: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
