import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import type { PublicPriceOption } from '../../../services/specialistsService';
import { publicModalityLabel, publicProfilePrice } from './publicProfilePresentation';

interface Props {
  options: PublicPriceOption[];
  selectedOptionId?: string;
  onSelect: (optionId: string) => void;
}

export function PublicProfileServices({ options, selectedOptionId, onSelect }: Props) {
  const { theme } = useTheme();
  if (!options.length) return null;
  return <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}>
    <Text accessibilityRole="header" aria-level={2} style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 15 }}>Servicios</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel="Servicio de la sesión" style={{ gap: 8 }}>
      {options.map(option => {
        const selected = option.optionId === selectedOptionId;
        return <View key={option.optionId} style={{ gap: 8 }}>
          <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected}
          accessibilityLabel={`${option.serviceName ?? 'General'} · ${publicModalityLabel(option.modality)} · ${option.durationMinutes} min · ${publicProfilePrice(option.priceCents / 100)}`}
          onPress={() => { if (!selected) onSelect(option.optionId); }}
          style={[styles.option, { borderColor: selected ? theme.primaryAlpha20 : theme.borderLight, backgroundColor: selected ? theme.primaryMuted : theme.bgCard }]}>
          <Ionicons name={option.modality === 'IN_PERSON' ? 'location-outline' : option.modality === 'PHONE_CALL' ? 'call-outline' : 'videocam-outline'} size={18} color={theme.primary} />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 13, lineHeight: 18 }}>{option.serviceName ?? 'General'}</Text>
            <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 18 }}>{option.durationMinutes} min · {publicModalityLabel(option.modality)}</Text>
          </View>
          <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 13 }}>{publicProfilePrice(option.priceCents / 100)}</Text>
          <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={19} color={selected ? theme.primary : theme.textMuted} />
          </Pressable>
          {selected && option.serviceDescription ?
            <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 19 }}>
              {option.serviceDescription}
            </Text> : null}
        </View>;
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderRadius: 20, gap: 12 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10, borderWidth: 1, borderRadius: 12, minHeight: 60 },
});
