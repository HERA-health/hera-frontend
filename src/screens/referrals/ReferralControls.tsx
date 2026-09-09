import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, Button } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';

export function ReferralPagination({ page, hasMore, loading, onChange }: { page: number; hasMore: boolean; loading: boolean; onChange: (page: number) => void }) {
  const { theme } = useTheme();
  return <View style={[controlStyles.pagination, { borderTopColor: theme.border }]}>
    <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 13 }}>Página {page + 1}</Text>
    <View style={controlStyles.actions}>
      {([{ label: 'Página anterior', icon: 'chevron-back', target: page - 1, disabled: page === 0 || loading }, { label: 'Página siguiente', icon: 'chevron-forward', target: page + 1, disabled: !hasMore || loading }] as const).map(item => <AnimatedPressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ disabled: item.disabled }} disabled={item.disabled} onPress={() => onChange(item.target)} hoverLift={false} pressScale={0.98} style={[controlStyles.pageButton, { borderColor: theme.border, backgroundColor: item.disabled ? 'transparent' : theme.bgCard, opacity: item.disabled ? 0.45 : 1 }]}><Ionicons name={item.icon} size={18} color={theme.textSecondary} /></AnimatedPressable>)}
    </View>
  </View>;
}

export function ReferralLoadError({ message, onRetry, loading = false }: { message: string; onRetry?: () => void; loading?: boolean }) {
  const { theme } = useTheme();
  return <View style={[controlStyles.error, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
    <Ionicons name="alert-circle-outline" size={22} color={theme.error} />
    <Text accessibilityRole="alert" style={{ flex: 1, minWidth: 160, color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 22 }}>{message}</Text>
    {onRetry ? <Button size="small" variant="ghost" loading={loading} style={controlStyles.action} icon={<Ionicons name="refresh-outline" size={16} color={theme.link} />} onPress={onRetry}>Reintentar</Button> : null}
  </View>;
}

export const controlStyles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  action: { minHeight: 44, alignSelf: 'flex-start', borderRadius: 10 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16, padding: 18, borderWidth: 1, borderRadius: 16 },
  filter: { flexGrow: 1, flexBasis: 210, maxWidth: 300, gap: 8 },
  label: { fontSize: 12, lineHeight: 18 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 4, borderTopWidth: 1 },
  pageButton: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  error: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 18, borderWidth: 1, borderRadius: 16 },
});
