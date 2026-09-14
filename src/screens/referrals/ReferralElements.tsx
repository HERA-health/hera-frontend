import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { AnimatedPressable } from '../../components/common';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import type { ReferralStatus } from '../../services/referralService';

export const referralStatusLabels: Record<ReferralStatus, string> = { DRAFT: 'Borrador', PENDING_PATIENT: 'Pendiente de tu paciente', PENDING_RECIPIENT: 'Pendiente del receptor', ACCEPTED: 'Aceptada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada', EXPIRED: 'Caducada' };
export const money = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
export const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'medium', timeStyle: 'short' }) : '';
export function ReferralField({ label, required, hint, ...props }: TextInputProps & { label: string; required?: boolean; hint?: string }) {
  const { theme } = useTheme();
  return <View style={{ gap: 6 }}><Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 14 }}>{label}{required ? ' *' : ''}</Text><TextInput {...props} accessibilityLabel={label} placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.textPrimary, fontFamily: theme.fontSans, backgroundColor: theme.bgCard, borderColor: theme.border }, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.style]} />{hint ? <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 18 }}>{hint}</Text> : null}</View>;
}
export function ReferralText({ children, title = false, error = false }: { children: React.ReactNode; title?: boolean; error?: boolean }) {
  const { theme } = useTheme();
  return <Text accessibilityRole={error ? 'alert' : title ? 'header' : undefined} style={{ color: error ? theme.error : title ? theme.textPrimary : theme.textSecondary, fontFamily: title ? theme.fontHeading : theme.fontSans, fontSize: title ? 24 : 15, lineHeight: title ? 32 : 23 }}>{children}</Text>;
}
export function ReferralCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }, style]}>{children}</View>;
}
export function ReferralCheck({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  const { theme } = useTheme();
  return <AnimatedPressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked, disabled: !!disabled }} disabled={disabled} hoverLift={false} pressScale={0.99} onPress={() => onChange(!checked)} tabIndex={disabled ? -1 : 0} onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (!disabled && !event.repeat) onChange(!checked); } }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 50, borderWidth: 1, borderRadius: 12, borderColor: checked ? theme.textSecondary : theme.border, backgroundColor: checked ? theme.bg : theme.bgCard, opacity: disabled ? 0.55 : 1 }}><Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={theme.textPrimary} /><Text style={{ flex: 1, color: theme.textPrimary, fontFamily: theme.fontSansMedium, fontSize: 14, lineHeight: 22 }}>{label}</Text></AnimatedPressable>;
}
export const styles = StyleSheet.create({ page: { padding: 24, gap: 20, width: '100%', maxWidth: 1040, alignSelf: 'center' }, card: { padding: 22, borderWidth: 1, borderRadius: 18, gap: 16 }, input: { borderWidth: 1, borderRadius: 10, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 } });
