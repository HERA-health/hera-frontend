import { renderLanguageIcon } from './LanguageIcon';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useProfileOptions } from '../../hooks/useProfileOptions';
import { useTheme } from '../../contexts/ThemeContext';
import { SearchableProfileSelect } from './SearchableProfileSelect';

export function ProfileDiscoveryFilters({ language, religion, onChange, stacked = false }: { language?: string; religion?: string; onChange: (values: { language?: string; religion?: string }) => void; stacked?: boolean }) {
  const { options, error, retry } = useProfileOptions();
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  return <View style={{ gap: stacked ? 20 : 12, flexDirection: stacked ? 'column' : 'row', flexWrap: stacked ? 'nowrap' : 'wrap', alignItems: stacked ? 'stretch' : 'flex-end', paddingVertical: stacked ? 0 : 12 }}>
    <SearchableProfileSelect renderIcon={renderLanguageIcon} label="Idioma de las sesiones" options={options?.languages ?? []} values={language ? [language] : []} disabled={!options} onChange={values => onChange({ language: values[0], religion })} emptyLabel="Cualquiera" />
    {options?.religionEnabled ? <>
      {!stacked ? <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ padding: 12, minHeight: 44 }}><Text style={{ color: theme.primary }}>{religion ? 'Más filtros · 1' : 'Más filtros'}</Text></Pressable> : null}
      {stacked || expanded ? <SearchableProfileSelect label="Perspectiva espiritual o religiosa" options={options.religions.map(option => ({ ...option, label: option.value === 'christian' ? 'Cristiana, incluidas católica y evangélica' : option.label }))} values={religion ? [religion] : []} onChange={values => onChange({ language, religion: values[0] })} emptyLabel="Cualquiera" /> : null}
    </> : null}
    {language || religion ? <Pressable accessibilityRole="button" onPress={() => onChange({})} style={{ padding: 12, minHeight: 44 }}><Text style={{ color: theme.primary }}>Quitar estos filtros</Text></Pressable> : null}
    {error ? <Pressable accessibilityRole="button" onPress={retry}><Text style={{ color: theme.textPrimary }}>No se pudieron cargar las opciones. Reintentar</Text></Pressable> : null}
  </View>;
}
