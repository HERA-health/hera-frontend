import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { PaymentCountrySelect, PaymentCheckboxMark } from '../payments/PaymentPresentation';
import type { PackagePaymentAcceptance, PackagePaymentPolicy } from '../../services/packagePaymentService';

export function PackagePaymentConditions({ policy, value, onChange, disabled = false }: {
  policy: PackagePaymentPolicy; value?: PackagePaymentAcceptance; onChange: (value?: PackagePaymentAcceptance) => void; disabled?: boolean;
}) {
  const { theme } = useTheme();
  const [country, setCountry] = useState(value?.country ?? '');
  const [showDetails, setShowDetails] = useState(false);
  const text = { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 15, lineHeight: 23 };
  return <View style={{ gap: 14, paddingVertical: 20, borderTopWidth: 1, borderColor: theme.border }}>
    <Text style={{ ...text, color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: 20 }}>Pago del bono</Text>
    <Text style={text}>Pagas el importe completo a tu especialista mediante Stripe, sin recargo por tarjeta. Podrás reservar las sesiones incluidas cuando confirmemos el cobro. La compra no reserva ningún horario.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Condiciones de pago del bono" accessibilityState={{ expanded: showDetails }} onPress={() => setShowDetails(!showDetails)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, alignSelf: 'flex-start' }}>
      <Text style={{ ...text, color: theme.primary, fontFamily: theme.fontSansSemiBold, flexShrink: 1 }}>Condiciones de pago del bono</Text>
      <Feather name={showDetails ? 'chevron-up' : 'chevron-down'} size={18} color={theme.primary} />
    </Pressable>
    {showDetails && <View style={{ gap: 12, padding: 16, borderRadius: 12, backgroundColor: theme.bg }}>
      <Text style={text}>No se cobrará otra vez cada sesión incluida. El bono no caduca.</Text>
      <Text style={text}>HERA no gestiona anulaciones ni devoluciones del bono desde esta pantalla; contacta con tu especialista. Cancelar una cita libera su sesión según las condiciones del bono y no inicia una devolución bancaria.</Text>
    </View>}
    <PaymentCountrySelect country={country} disabled={disabled} onChange={value => { setCountry(value); onChange(undefined); }} />
    {!policy.available && <Text accessibilityRole="alert" style={{ ...text, color: theme.error }}>El pago online no está disponible ahora. Contacta con tu especialista.</Text>}
    <Pressable accessibilityRole="checkbox" accessibilityLabel="Acepto las condiciones de pago del bono" accessibilityState={{ checked: Boolean(value), disabled: disabled || !country || !policy.available }}
      disabled={disabled || !country || !policy.available} onPress={() => onChange(value ? undefined : { termsVersion: policy.termsVersion, country })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, opacity: disabled || !country || !policy.available ? 0.5 : 1 }}>
      <PaymentCheckboxMark checked={Boolean(value)} />
      <Text style={{ ...text, flex: 1, color: theme.textPrimary }}>Acepto las condiciones de pago del bono</Text>
    </Pressable>
  </View>;
}
