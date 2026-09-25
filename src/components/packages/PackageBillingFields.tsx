import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { PackageBilling } from '../../services/packageService';

export const emptyPackageBilling: PackageBilling = { billingFullName: '', billingTaxId: '', billingAddress: '', billingPostalCode: '', billingCity: '', billingCountry: 'España' };
const fields: Array<[keyof PackageBilling, string]> = [['billingFullName', 'Nombre fiscal'], ['billingTaxId', 'NIF / documento fiscal'], ['billingAddress', 'Dirección fiscal'], ['billingPostalCode', 'Código postal'], ['billingCity', 'Localidad'], ['billingCountry', 'País']];
export function PackageBillingFields({ value, onChange, disabled }: { value: PackageBilling; onChange: (value: PackageBilling) => void; disabled?: boolean }) {
  const { theme } = useTheme();
  return <View style={{ gap: 10 }}><Text style={{ color: theme.textPrimary }}>Datos para la factura completa</Text><Text style={{ color: theme.textSecondary }}>Se utilizarán solo en esta factura.</Text>{fields.map(([key, label]) => <TextInput key={key} accessibilityLabel={label} placeholder={label} placeholderTextColor={theme.textMuted} value={value[key]} editable={!disabled} onChangeText={text => onChange({ ...value, [key]: text })} style={{ color: theme.textPrimary, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12 }} />)}</View>;
}
