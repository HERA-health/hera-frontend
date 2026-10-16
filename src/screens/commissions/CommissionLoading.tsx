import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

/** Static placeholders keep loading calm and work with reduced-motion preferences. */
export function CommissionLoading({ accessibilityLabel, overview = false }: {
  accessibilityLabel: string;
  overview?: boolean;
}) {
  const { theme } = useTheme();
  const line = (width: number | `${number}%`, height = 12) => (
    <View style={{ width, height, maxWidth: '100%', borderRadius: 6, backgroundColor: theme.primaryAlpha12 }}/>
  );
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel}
    accessibilityState={{ busy: true }} style={{ gap: 16, width: '100%' }}>
    <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 13 }}>{accessibilityLabel}…</Text>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={{ gap: 16 }}>
      {overview ? <View style={{ flexDirection: 'row', gap: 10 }}>
        {[0, 1, 2].map(index => <View key={index} style={{ flex: 1, minWidth: 0, padding: 16, borderRadius: 14, backgroundColor: theme.bgMuted, gap: 14 }}>
          {line('70%', 10)}{line('45%', 24)}
        </View>)}
      </View> : null}
      {Array.from({ length: overview ? 3 : 1 }, (_, index) => <View key={index} style={{ padding: overview ? 22 : 16, borderRadius: 18, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.border, gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 20 }}>
          <View style={{ flex: 1, gap: 10 }}>{line('45%', 15)}{line('65%', 10)}</View>
          {line(64, 28)}
        </View>
        {line('80%', 10)}
        {overview ? <View style={{ alignItems: 'flex-end' }}>{line(96, 32)}</View> : null}
      </View>)}
    </View>
  </View>;
}
