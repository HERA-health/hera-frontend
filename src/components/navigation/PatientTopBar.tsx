import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { spacing } from '../../constants/colors';
import type { AppNavigationProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, type ThemeMode } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { NavigationControl } from './NavigationControl';
import { CLIENT_SECTIONS } from './sidebar/navConfig';
import { isLargeScreenForRole } from './mainLayoutBreakpoints';

const ROUTE_TITLES: Record<string, string> = {
  ...Object.fromEntries(CLIENT_SECTIONS.flatMap((section) => section.items.map((item) => [item.route, item.label]))),
  SpecialistDetail: 'Perfil del especialista',
  Booking: 'Reservar sesión',
  Questionnaire: 'Cuestionario',
  QuestionnaireResults: 'Tus resultados',
  ProfileCompletion: 'Completar perfil',
  AdminPanel: 'Panel de administrador',
};

const THEME_OPTIONS = [
  { mode: 'light', label: 'Claro', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Oscuro', icon: 'moon-outline' },
  { mode: 'system', label: 'Sistema', icon: 'desktop-outline' },
] satisfies { mode: ThemeMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[];

interface PatientTopBarProps {
  currentRoute: string;
  onOpenMobileSidebar: () => void;
}

export function PatientTopBar({ currentRoute, onOpenMobileSidebar }: PatientTopBarProps): React.ReactElement {
  const { width, height } = useWindowDimensions();
  const { theme, mode, setMode } = useTheme();
  const { user, logout } = useAuth();
  const navigation = useNavigation<AppNavigationProp>();
  const isDesktop = isLargeScreenForRole(width, false);
  const showSearch = isLargeScreenForRole(width, true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountTop, setAccountTop] = useState(64);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarAnchor = useRef<View>(null);
  const initials = (user?.name ?? 'Hera').trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('es-ES') ?? '').join('');

  useEffect(() => setAvatarFailed(false), [user?.avatar]);
  useEffect(() => setAccountOpen(false), [currentRoute, width, height]);

  const openAccount = (): void => {
    avatarAnchor.current?.measureInWindow((_x, y, _width, anchorHeight) => {
      setAccountTop(y + anchorHeight + spacing.sm);
      setAccountOpen(true);
    });
  };

  return (
    <View
      testID="patient-top-bar"
      style={[styles.bar, !isDesktop && styles.barCompact, { backgroundColor: theme.navigationBg }]}
    >
      <View style={[styles.left, !showSearch && styles.leftFlexible]}>
        {!isDesktop ? (
          <NavigationControl accessibilityLabel="Abrir menú" onPress={onOpenMobileSidebar}>
            <Ionicons name="menu-outline" size={22} color={theme.textSecondary} />
          </NavigationControl>
        ) : null}
        <Text numberOfLines={1} style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
          {ROUTE_TITLES[currentRoute] ?? 'Tu espacio de bienestar'}
        </Text>
      </View>

      {showSearch ? (
        <View style={styles.searchSlot}>
          <AnimatedPressable
            accessibilityLabel="Buscar especialistas"
            onPress={() => navigation.navigate('Specialists')}
            hoverLift={false}
            style={[styles.search, { backgroundColor: theme.bgCard, borderColor: theme.navigationBorder }]}
          >
            <Ionicons name="search-outline" size={20} color={theme.textMuted} />
            <Text style={[styles.searchText, { color: theme.textMuted, fontFamily: theme.fontSans }]}>Buscar especialistas…</Text>
          </AnimatedPressable>
        </View>
      ) : null}

      <View style={styles.actions}>
        <AnimatedPressable
          accessibilityLabel="Reservar sesión"
          onPress={() => navigation.navigate('Specialists')}
          hoverLift={false}
          style={[styles.reserve, !isDesktop && styles.reserveCompact, { backgroundColor: theme.actionPrimary }]}
        >
          <Ionicons name="add" size={20} color={theme.actionPrimaryText} />
          {isDesktop ? <Text style={[styles.reserveText, { color: theme.actionPrimaryText, fontFamily: theme.fontSansSemiBold }]}>Reservar sesión</Text> : null}
        </AnimatedPressable>
        <View ref={avatarAnchor} collapsable={false}>
          <NavigationControl accessibilityLabel="Abrir menú de usuario" expanded={accountOpen} onPress={openAccount} style={styles.avatarButton}>
            {user?.avatar && !avatarFailed ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} onError={() => setAvatarFailed(true)} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.secondaryMuted }]}>
                <Text style={{ color: theme.selection, fontFamily: theme.fontSansBold }}>{initials}</Text>
              </View>
            )}
          </NavigationControl>
        </View>
      </View>

      <Modal transparent visible={accountOpen} animationType="fade" onRequestClose={() => setAccountOpen(false)}>
        <View style={styles.modal}>
          <Pressable testID="patient-account-backdrop" accessible={false} onPress={() => setAccountOpen(false)} style={StyleSheet.absoluteFill} />
          <ScrollView
            accessibilityViewIsModal
            style={[styles.accountMenu, {
              top: accountTop,
              maxHeight: Math.max(0, height - accountTop - spacing.md),
              width: Math.min(286, width - spacing.md * 2),
              backgroundColor: theme.bgElevated,
              borderColor: theme.navigationBorder,
              shadowColor: theme.shadowStrong,
            }]}
            contentContainerStyle={styles.accountContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.accountHeading, { borderBottomColor: theme.borderLight }]}>
              <View style={styles.accountIdentity}>
                <Text numberOfLines={1} style={[styles.accountName, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{user?.name}</Text>
                <Text style={[styles.accountRole, { color: theme.textMuted, fontFamily: theme.fontSans }]}>Tu espacio de bienestar</Text>
              </View>
              <NavigationControl accessibilityLabel="Cerrar menú de usuario" onPress={() => setAccountOpen(false)}>
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </NavigationControl>
            </View>
            <AnimatedPressable onPress={() => { setAccountOpen(false); navigation.navigate('Profile'); }} hoverLift={false} style={styles.menuRow}>
              <Ionicons name="person-circle-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.menuText, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Mi perfil</Text>
            </AnimatedPressable>
            <Text style={[styles.menuLabel, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>Apariencia</Text>
            <View style={styles.themeOptions}>
              {THEME_OPTIONS.map((option) => (
                <AnimatedPressable
                  key={option.mode}
                  accessibilityLabel={`Tema ${option.label.toLocaleLowerCase('es-ES')}`}
                  accessibilityState={{ selected: mode === option.mode }}
                  onPress={() => setMode(option.mode)}
                  hoverLift={false}
                  style={[styles.themeOption, { backgroundColor: mode === option.mode ? theme.primaryAlpha12 : theme.bgMuted, borderColor: mode === option.mode ? theme.focus : theme.borderLight }]}
                >
                  <Ionicons name={option.icon} size={16} color={theme.textSecondary} />
                  <Text style={[styles.themeLabel, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{option.label}</Text>
                </AnimatedPressable>
              ))}
            </View>
            <AnimatedPressable onPress={() => { setAccountOpen(false); void logout(); }} hoverLift={false} style={styles.menuRow}>
              <Ionicons name="log-out-outline" size={20} color={theme.error} />
              <Text style={[styles.menuText, { color: theme.error, fontFamily: theme.fontSansSemiBold }]}>Cerrar sesión</Text>
            </AnimatedPressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 76, flexShrink: 0, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, zIndex: 100 },
  barCompact: { height: 64, paddingHorizontal: spacing.sm, gap: spacing.sm },
  left: { minWidth: 170, maxWidth: 230, flexDirection: 'row', alignItems: 'center', gap: 9 },
  leftFlexible: { flex: 1, minWidth: 0, maxWidth: '100%' },
  title: { flexShrink: 1, fontSize: 18, letterSpacing: -0.2 },
  searchSlot: { flex: 1, alignItems: 'center' },
  search: { width: '100%', maxWidth: 520, height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchText: { fontSize: 13 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reserve: { height: 44, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  reserveCompact: { width: 44, paddingHorizontal: 0 },
  reserveText: { fontSize: 13 },
  avatarButton: { borderRadius: 22 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  modal: { flex: 1 },
  accountMenu: { position: 'absolute', right: spacing.md, borderRadius: 18, borderWidth: 1, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
  accountContent: { padding: spacing.sm },
  accountHeading: { paddingLeft: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  accountIdentity: { flex: 1, minWidth: 0 },
  accountName: { fontSize: 14 },
  accountRole: { fontSize: 11, marginTop: 3 },
  menuRow: { minHeight: 44, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 10 },
  menuText: { fontSize: 13 },
  menuLabel: { fontSize: 10, padding: spacing.sm },
  themeOptions: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  themeOption: { flex: 1, minHeight: 52, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 4 },
  themeLabel: { fontSize: 10 },
});
