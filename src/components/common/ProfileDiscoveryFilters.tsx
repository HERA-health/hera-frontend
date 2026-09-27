import { renderLanguageIcon } from './LanguageIcon';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useProfileOptions } from '../../hooks/useProfileOptions';
import { useTheme } from '../../contexts/ThemeContext';
import { SearchableProfileSelect } from './SearchableProfileSelect';

export function ProfileDiscoveryFilters({ language, religion, onChange }: { language?: string; religion?: string; onChange: (values: { language?: string; religion?: string }) => void }) {
  const { options, error, retry } = useProfileOptions();
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  return <View style={{ gap: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', paddingVertical: 12 }}>
    <SearchableProfileSelect renderIcon={renderLanguageIcon} label="Idioma de las sesiones" options={options?.languages ?? []} values={language ? [language] : []} disabled={!options} onChange={values => onChange({ language: values[0], religion })} emptyLabel="Cualquiera" />
    {options?.religionEnabled ? <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ padding: 12, minHeight: 44 }}><Text style={{ color: theme.primary }}>{religion ? 'Más filtros · 1' : 'Más filtros'}</Text></Pressable>
      {expanded ? <SearchableProfileSelect label="Religión o creencias" options={options.religions.map(option => ({ ...option, label: option.value === 'christian' ? 'Cristianismo (todas las ramas)' : option.value === 'islam' ? 'Islam (todas las ramas)' : option.label }))} values={religion ? [religion] : []} onChange={values => onChange({ language, religion: values[0] })} emptyLabel="Cualquiera" /> : null}
    </> : null}
    {language || religion ? <Pressable accessibilityRole="button" onPress={() => onChange({})} style={{ padding: 12, minHeight: 44 }}><Text style={{ color: theme.primary }}>Quitar estos filtros</Text></Pressable> : null}
    {error ? <Pressable accessibilityRole="button" onPress={retry}><Text style={{ color: theme.textPrimary }}>No se pudieron cargar las opciones. Reintentar</Text></Pressable> : null}
  </View>;
}
