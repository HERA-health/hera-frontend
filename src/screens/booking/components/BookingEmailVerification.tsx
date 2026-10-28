import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Button } from '../../../components/common/Button';

interface Props {
  email: string;
  code: string;
  codeLength: number;
  busy: boolean;
  onChange: (code: string) => void;
  onRestart: () => void;
}

export function BookingEmailVerification({ email, code, codeLength, busy, onChange, onRestart }: Props) {
  const { theme } = useTheme();
  const shortCode = codeLength === 6;
  return <View testID="booking-email-verification" style={[styles.container, { backgroundColor: theme.secondaryAlpha12, borderColor: theme.borderLight }]}>
    <View style={styles.heading}>
      <Ionicons name="mail-outline" size={21} color={theme.secondaryDark} />
      <Text accessibilityRole="header" aria-level={2} style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Un último paso</Text>
    </View>
    <Text style={[styles.copy, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Para comprobar que el correo es tuyo y enviarte los detalles de la cita, introduce el código enviado a <Text style={{ fontFamily: theme.fontSansSemiBold, color: theme.textPrimary }}>{email}</Text>.</Text>
    <Text style={[styles.label, { color: theme.textPrimary }]}>Código de {codeLength} {shortCode ? 'dígitos' : 'caracteres'}</Text>
    <TextInput
      accessibilityLabel="Código de verificación del correo"
      accessibilityHint={shortCode ? 'Introduce los seis dígitos del correo para activar Confirmar cita.' : 'Copia el código del correo para activar Confirmar cita.'}
      value={code} onChangeText={text => onChange(shortCode ? text.replace(/\D/g, '').slice(0, 6) : text.trim().slice(0, codeLength))}
      maxLength={codeLength} keyboardType={shortCode ? 'number-pad' : 'default'}
      autoComplete="one-time-code" textContentType="oneTimeCode" autoCapitalize="none" autoCorrect={false}
      editable={!busy} autoFocus placeholder={shortCode ? '000000' : 'Código del correo'}
      placeholderTextColor={theme.textMuted}
      style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.bgCard, fontFamily: theme.fontSansSemiBold }, !shortCode ? { fontSize: 16, letterSpacing: 1 } : null]}
    />
    <Text style={[styles.hint, { color: theme.textSecondary }]}>Caduca en 5 minutos. Tu cita aún no está confirmada.</Text>
    <Button variant="ghost" size="small" disabled={busy} onPress={onRestart}>Cambiar correo o pedir otro código</Button>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 10, width: '100%', marginBottom: 12, padding: 16, borderWidth: 1, borderRadius: 14 },
  heading: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  title: { fontSize: 24, lineHeight: 30 },
  copy: { fontSize: 13, lineHeight: 20 },
  label: { fontSize: 13, marginTop: 4 },
  input: { width: '100%', minHeight: 54, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 26, letterSpacing: 7, textAlign: 'center' },
  hint: { fontSize: 12, lineHeight: 18 },
});
