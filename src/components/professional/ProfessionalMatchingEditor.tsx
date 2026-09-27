import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { PROFESSIONAL_SPECIALTY_OPTIONS, PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS } from '../../constants/professionalMatchingOptions';
import { ProfileDiscoveryEditor } from './ProfileDiscoveryEditor';

interface Props {
  specialties: string[];
  approaches: string[];
  languages: string[];
  profileVisible: boolean;
  onToggle: (field: 'specialties' | 'therapeuticApproaches', value: string) => void;
  onLanguagesChange: (values: string[]) => void;
}

function ChoiceGroup({ title, description, options, selected, onToggle, max }: {
  title: string; description: string; options: readonly { value: string; label: string }[];
  selected: string[]; onToggle: (value: string) => void; max?: number;
}) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 18, flexShrink: 1 }}>{title}</Text>
      <Text style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 13 }}>{max ? `${selected.length} / ${max}` : `${selected.length} seleccionados`}</Text>
    </View>
    <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21 }}>{description}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 }}>
      {options.map(option => {
        const checked = selected.includes(option.value);
        const disabled = !checked && max !== undefined && selected.length >= max;
        return <Pressable key={option.value} accessibilityRole="checkbox" accessibilityLabel={option.label} accessibilityState={{ checked, disabled }} disabled={disabled} onPress={() => onToggle(option.value)}
          style={{ width: width >= 480 ? '48%' : '100%', flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, backgroundColor: checked ? theme.primaryAlpha12 : 'transparent', opacity: disabled ? 0.5 : 1 }}>
          <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: checked ? theme.primary : theme.border, backgroundColor: checked ? theme.primary : theme.bgCard, alignItems: 'center', justifyContent: 'center' }}>
            {checked ? <Ionicons name="checkmark" size={14} color={theme.actionPrimaryText} /> : null}
          </View>
          <Text style={{ color: theme.textPrimary, fontFamily: checked ? theme.fontSansSemiBold : theme.fontSans, fontSize: 14, lineHeight: 20, flex: 1 }}>{option.label}</Text>
        </Pressable>;
      })}
    </View>
    {max && selected.length >= max ? <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 18 }}>Has elegido {max} especialidades. Desmarca una para cambiarla.</Text> : null}
  </View>;
}

export function ProfessionalMatchingEditor(props: Props) {
  const { theme } = useTheme();
  const [wide, setWide] = useState(false);
  return <View onLayout={event => setWide(event.nativeEvent.layout.width >= 900)} style={{ flexDirection: wide ? 'row' : 'column', gap: 24, alignItems: 'flex-start' }}>
    <View style={{ flex: wide ? 1.4 : undefined, width: wide ? undefined : '100%', minWidth: 0, backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1, borderRadius: 18, padding: 24, gap: 24 }}>
      <ChoiceGroup title="Especialidades" description="Elige hasta cinco áreas que mejor representan tu práctica." options={PROFESSIONAL_SPECIALTY_OPTIONS} selected={props.specialties} max={5} onToggle={value => props.onToggle('specialties', value)} />
      <View style={{ height: 1, backgroundColor: theme.border }} />
      <ChoiceGroup title="Enfoques terapéuticos" description="Indica los enfoques que utilizas en tus sesiones." options={PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS} selected={props.approaches} onToggle={value => props.onToggle('therapeuticApproaches', value)} />
    </View>
    <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', minWidth: 0 }}>
      <ProfileDiscoveryEditor languages={props.languages} onLanguagesChange={props.onLanguagesChange} profileVisible={props.profileVisible} />
    </View>
  </View>;
}
