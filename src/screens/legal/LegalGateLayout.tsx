import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyledLogo } from '../../components/common/StyledLogo';
import { Sidebar } from '../../components/navigation/sidebar/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LegalDocumentScreen } from './LegalDocumentScreen';

/** Navigation chrome only: private workspaces must not mount before acceptance. */
export function LegalGateLayout({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const role = user?.type === 'professional' ? 'PROFESSIONAL' : user?.type === 'clinic' ? 'CLINIC' : 'CLIENT';

  return (
    <View style={[styles.layout, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      {width >= 1024 ? (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 260 }}>
          <Sidebar locked userRole={role} currentRoute="RequiredLegalAcceptance"
            user={{ name: user?.name ?? 'HERA', role }} onLogout={logout}
            onNavigate={route => navigation.dispatch(CommonActions.navigate(route))} />
        </View>
      ) : null}
      <View style={styles.main}>
        <View style={[styles.header, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
          {width < 1024 ? <Ionicons name="menu-outline" size={24} color={theme.textMuted} /> : null}
          <StyledLogo size={32} variant="wordmark" tone="brand" tintColor={theme.logoTint} />
          <Text style={{ color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 13 }}>Tu espacio de bienestar</Text>
        </View>
        {children ?? <View style={styles.placeholder}>
          <Text style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay, fontSize: 30 }}>Tu espacio en HERA</Text>
          <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 15 }}>Revisa la actualización para continuar.</Text>
        </View>}
      </View>
    </View>
  );
}

export function GatedLegalDocumentScreen() {
  return <LegalGateLayout><LegalDocumentScreen /></LegalGateLayout>;
}

const styles = StyleSheet.create({
  layout: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, minWidth: 0 },
  header: { minHeight: 76, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, flexWrap: 'wrap' },
  placeholder: { padding: 32, gap: 10 },
});
