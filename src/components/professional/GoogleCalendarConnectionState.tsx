import React, { type ReactNode } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { StyledLogo } from '../common/StyledLogo';

export function GoogleCalendarConnectionState({ title, description, loading = false, error, children }: {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  children?: ReactNode;
}) {
  const { theme } = useTheme();
  return <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.page}>
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={styles.products} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
        <View style={[styles.logoTile, { backgroundColor: theme.bgMuted }]}>
          <Image source={require('../../../assets/google-calendar.png')} style={styles.googleLogo} resizeMode="contain" />
        </View>
        <Ionicons name={error ? 'alert-circle-outline' : 'link-outline'} size={24} color={error ? theme.warning : theme.textMuted} />
        <View style={[styles.logoTile, { backgroundColor: theme.bgMuted }]}><StyledLogo variant="mark" size={40} /></View>
      </View>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{title}</Text>
        <Text accessibilityRole={error ? 'alert' : undefined} style={[styles.description, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{error || description}</Text>
      </View>
      {loading && <View accessible accessibilityRole="progressbar" accessibilityLabel="Completando la conexión con Google" accessibilityState={{ busy: true }} accessibilityLiveRegion="polite"
        style={[styles.progress, { backgroundColor: theme.bgMuted }]}>
        <ActivityIndicator color={theme.primary} size="small" />
        <Text style={[styles.progressText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Volverás a tus ajustes al terminar.</Text>
      </View>}
      {children}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 480, padding: 24, borderRadius: 24, borderWidth: 1, gap: 24 },
  products: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingTop: 8 },
  logoTile: { width: 76, height: 76, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  googleLogo: { width: 40, height: 40 },
  copy: { gap: 10 },
  title: { fontSize: 23, lineHeight: 30, textAlign: 'center' },
  description: { fontSize: 15, lineHeight: 23, textAlign: 'center' },
  progress: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14 },
  progressText: { flexShrink: 1, fontSize: 13, lineHeight: 20 },
});
