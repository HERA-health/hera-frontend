import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export function CatalogStatusFilter({ archived, onChange }: { archived: boolean; onChange: (archived: boolean) => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: theme.bgMuted, padding: 4, borderRadius: 10, gap: 2 }}>
      {[{ label: 'Activos', value: false }, { label: 'Archivados', value: true }].map(tab => (
        <Pressable
          key={tab.label}
          accessibilityRole="tab"
          accessibilityState={{ selected: archived === tab.value }}
          onPress={() => onChange(tab.value)}
          style={({ pressed }) => [{ minHeight: 40, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, borderRadius: 7 }, archived === tab.value && { backgroundColor: theme.bgCard, boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }, pressed && { opacity: 0.75 }]}
        >
          <Text style={{ fontFamily: theme.fontSansSemiBold, fontSize: 14, color: archived === tab.value ? theme.textPrimary : theme.textSecondary }}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
