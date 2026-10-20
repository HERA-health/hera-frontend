import React from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';

export function PublicProfileSkeleton() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const desktop = width >= 1200;
  return <View accessibilityLabel="Cargando perfil" accessibilityState={{ busy: true }}
    style={{ paddingTop: 162, paddingHorizontal: mobile ? 20 : 32 }}>
    <View style={{ width: '100%', maxWidth: 1440, alignSelf: 'center', flexDirection: desktop ? 'row' : 'column', gap: 32 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 24 }}>
        <View style={{ flexDirection: 'row', gap: mobile ? 16 : 28 }}>
          <View style={{ width: mobile ? 120 : desktop ? 240 : 200, height: mobile ? 150 : desktop ? 300 : 250, borderRadius: 20, backgroundColor: theme.secondaryMuted }} />
          <View style={{ flex: 1, gap: 18, paddingTop: 10 }}>
            <View style={{ height: 32, borderRadius: 6, backgroundColor: theme.secondaryMuted }} />
            <View style={{ height: 18, width: '70%', borderRadius: 6, backgroundColor: theme.secondaryMuted }} />
            <ActivityIndicator color={theme.primary} style={{ alignSelf: 'flex-start' }} />
          </View>
        </View>
        <View style={{ height: 16, borderRadius: 6, backgroundColor: theme.secondaryMuted }} />
        <View style={{ height: 16, width: '80%', borderRadius: 6, backgroundColor: theme.secondaryMuted }} />
      </View>
      <View style={{ width: desktop ? 360 : '100%', height: 280, backgroundColor: theme.bgCard, borderRadius: 20 }} />
    </View>
  </View>;
}
