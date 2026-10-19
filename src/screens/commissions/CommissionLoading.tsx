import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

/** Static placeholders keep loading calm and work with reduced-motion preferences. */
export function CommissionLoading({ accessibilityLabel, overview = false, variant = 'month' }: {
  accessibilityLabel: string;
  overview?: boolean;
  variant?: 'month' | 'admin';
}) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const wide = width >= (variant === 'admin' ? 960 : 920);
  const line = (width: number | `${number}%`, height = 12) => (
    <View style={{ width, height, maxWidth: '100%', borderRadius: 6, backgroundColor: theme.primaryAlpha12 }}/>
  );
  const card = (index: number) => <View key={index} style={{ padding: overview ? 20 : 16, borderRadius: 18, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.border, gap: 16 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 20 }}>
      <View style={{ flex: 1, gap: 10 }}>{line('55%', 15)}{line('75%', 10)}</View>{line(64, 38)}
    </View>
    <View style={{ borderTopWidth: 1, borderColor: theme.border, paddingTop: 14, gap: 10 }}>{line('75%', 10)}{line('55%', 10)}</View>
    {overview ? <View style={{ alignItems: 'flex-end' }}>{line(96, 34)}</View> : null}
  </View>;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel}
    accessibilityState={{ busy: true }} style={{ gap: 16, width: '100%' }}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={{ gap: 16 }}>
      {overview ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[0, 1, 2].map(index => <View key={index} style={{ flex: 1, minWidth: 110, padding: 16, borderRadius: 14, backgroundColor: theme.bgMuted, gap: 14 }}>
          {line('70%', 10)}{line('45%', 24)}
        </View>)}
      </View> : null}
      {!overview ? card(0) : variant === 'admin' ? <View style={{ gap: wide ? 0 : 16 }}>
        {wide ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: theme.bgMuted, padding: 18, borderRadius: 12 }}>
          <View style={{ flex: 2 }}>{line('65%', 12)}</View><View style={{ flex: 4, flexDirection: 'row', gap: 16 }}>{[0,1,2,3].map(index=><View key={index} style={{ flex: 1 }}>{line('80%', 10)}</View>)}</View><View style={{ width: 112 }}/>
        </View> : null}
        {[0, 1, 2].map(index => <View key={index} style={{ padding: wide ? 20 : 18, gap: 18, flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'stretch', backgroundColor: wide ? undefined : theme.bgCard, borderRadius: wide ? 0 : 16, borderWidth: wide ? 0 : 1, borderBottomWidth: 1, borderColor: theme.border }}>
          <View style={{ flex: wide ? 2 : undefined, gap: 10 }}>{line('70%', 15)}{line('90%', 10)}</View>
          <View style={{ flex: wide ? 4 : undefined, flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {[0,1,2,3].map(metric => <View key={metric} style={{ flexGrow: 1, flexBasis: wide ? 0 : '40%', gap: 10 }}>{line('80%', 10)}{line('60%', 18)}</View>)}
          </View>
          <View style={{ alignItems: 'flex-end' }}>{line(112, 36)}</View>
        </View>)}
      </View> : <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'flex-start', gap: 24 }}>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', gap: 16 }}>
          <View style={{ gap: 10 }}>{line(150, 16)}{line('65%', 10)}</View>{[0, 1, 2].map(card)}
        </View>
        <View style={{ width: wide ? 300 : '100%', padding: 20, borderRadius: 18, backgroundColor: theme.bgMuted, gap: 20 }}>
          {line('75%', 17)}{line('50%', 12)}{line('65%', 20)}{line('90%', 12)}{line('85%', 12)}
          <View style={{ gap: 10, marginTop: 4 }}>{line('100%', 40)}{line('100%', 40)}{line('100%', 40)}</View>
        </View>
      </View>}
    </View>
  </View>;
}
