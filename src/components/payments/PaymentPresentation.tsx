import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import flags from '../../assets/language-flags/flags.json';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Button as SharedButton } from '../common/Button';
import { SearchableProfileSelect } from '../common/SearchableProfileSelect';

export function PaymentButton(props: React.ComponentProps<typeof SharedButton>) {
  return <SharedButton {...props} size={props.size ?? 'small'} style={{ alignSelf: 'flex-start', minHeight: 44, maxWidth: '100%', borderRadius: 12, shadowOpacity: 0, elevation: 0, ...props.style }} />;
}

export const paymentScreenStyles = (theme: Theme, width: number) => StyleSheet.create({
  page: { padding: width < 600 ? 20 : 32, paddingBottom: 48 },
  container: { width: '100%', maxWidth: 1080, alignSelf: 'center', gap: 24 },
  heading: { color: theme.textPrimary, fontSize: width < 600 ? 28 : 34, fontFamily: theme.fontHeading },
  body: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 15, lineHeight: 24 },
  columns: { flexDirection: width >= 1000 ? 'row' : 'column', alignItems: 'flex-start', gap: 28 },
  card: { flex: width >= 1000 ? 1 : undefined, width: width >= 1000 ? undefined : '100%', minWidth: 0, gap: 20, padding: width < 600 ? 20 : 28, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.borderLight, borderRadius: 18 },
  summary: { gap: 8, paddingBottom: 20, borderBottomWidth: 1, borderColor: theme.border },
  amount: { color: theme.textPrimary, fontSize: 32, fontFamily: theme.fontSansBold },
  aside: { width: width >= 1000 ? 280 : '100%', gap: 20, paddingVertical: 8 },
});

const countries = [['ES', 'España'], ['DE', 'Alemania'], ['AT', 'Austria'], ['BE', 'Bélgica'], ['BG', 'Bulgaria'], ['CY', 'Chipre'],
  ['HR', 'Croacia'], ['SK', 'Eslovaquia'], ['SI', 'Eslovenia'], ['EE', 'Estonia'], ['FI', 'Finlandia'], ['FR', 'Francia'], ['GR', 'Grecia'],
  ['IE', 'Irlanda'], ['IT', 'Italia'], ['LV', 'Letonia'], ['LT', 'Lituania'], ['LU', 'Luxemburgo'], ['MT', 'Malta'], ['NL', 'Países Bajos'], ['PT', 'Portugal']];
const countryFlags: Record<string, string> = flags;
export function PaymentCountrySelect({ country, onChange, disabled = false }: { country: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { theme } = useTheme();
  const body = paymentScreenStyles(theme, 600).body;
  return <View style={{ width: '100%', maxWidth: 440, gap: 8 }}>
    {disabled ? <Text style={body}>País de residencia: {countries.find(([code]) => code === country)?.[1] ?? 'Sin seleccionar'}</Text>
      : <SearchableProfileSelect label="País de residencia" emptyLabel="Seleccionar país" options={countries.map(([value, label]) => ({ value, label, aliases: [] })).sort((a, b) => a.value === 'ES' ? -1 : b.value === 'ES' ? 1 : a.label.localeCompare(b.label, 'es'))}
        renderIcon={code => <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 24, height: 18, borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}><SvgXml xml={countryFlags[code.toLowerCase()]} width={24} height={18} /></View>}
        values={country ? [country] : []} onChange={values => onChange(values[0] ?? '')} />}
    <Text style={[body, { fontSize: 13, lineHeight: 20 }]}>Disponible en los países de la zona euro indicados.</Text>
  </View>;
}

export function PaymentCheckboxMark({ checked }: { checked: boolean }) {
  const { theme } = useTheme();
  return <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: checked ? theme.primary : theme.border, backgroundColor: checked ? theme.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
    {checked && <Feather name="check" size={15} color={theme.bg} />}
  </View>;
}
