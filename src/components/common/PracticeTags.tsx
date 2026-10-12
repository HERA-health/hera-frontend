import React from 'react';
import { Text, View, type LayoutRectangle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { matchingChoiceLabel, PROFESSIONAL_SPECIALTY_OPTIONS, PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS } from '../../constants/professionalMatchingOptions';

export function PracticeTags({title, values, kind, compact = false, maxItems, onItemLayout}: {title?: string; values: readonly string[]; kind?: 'specialties' | 'approaches'; compact?: boolean; maxItems?: number; onItemLayout?: (index: number, layout: LayoutRectangle) => void}) {
  const {theme} = useTheme();
  if (!values.length) return null;
  const options = kind === 'specialties' ? PROFESSIONAL_SPECIALTY_OPTIONS : kind === 'approaches' ? PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS : [];
  const visible = maxItems ? values.slice(0, maxItems) : values;
  const remaining = values.length - visible.length;
  if (compact && kind !== 'specialties') return <Text style={{fontFamily: theme.fontSans, color: theme.textSecondary, fontSize: 12, lineHeight: 19}}>
    {title ? <Text style={{fontFamily: theme.fontSansSemiBold}}>{title}: </Text> : null}
    {visible.map(value => matchingChoiceLabel(value, options)).join(' · ')}{remaining ? ` · +${remaining} en el perfil` : ''}
  </Text>;
  return <View style={{gap: compact ? 5 : 8, minWidth: 0}}>
    {title ? <Text style={{fontFamily: theme.fontSansSemiBold, color: theme.textSecondary, fontSize: 12}}>{title}</Text> : null}
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
      {visible.map((value, index) => <View key={value} onLayout={onItemLayout ? event => onItemLayout(index, event.nativeEvent.layout) : undefined} style={{maxWidth: '100%', backgroundColor: theme.primaryAlpha12, borderRadius: compact ? 7 : 10, paddingHorizontal: compact ? 8 : 10, paddingVertical: compact ? 3 : 6}}>
        <Text style={{fontFamily: theme.fontSans, color: theme.textPrimary, fontSize: compact ? 12 : 13, lineHeight: 19, flexShrink: 1}}>{matchingChoiceLabel(value, options)}</Text>
      </View>)}
      {remaining ? <Text style={{fontFamily: theme.fontSans, color: theme.textSecondary, fontSize: 12, lineHeight: 25}}>+{remaining} en el perfil</Text> : null}
    </View>
  </View>;
}
