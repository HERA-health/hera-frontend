import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { spacing } from '../../constants/colors';
import type { AppNavigationProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileCompletion } from '../../contexts/ProfileCompletionContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { ProfessionalHomeData } from '../../services/dashboardService';
import { useProfessionalWorkspace } from '../../contexts/ProfessionalWorkspaceContext';
import { trackProfessionalWorkspaceEvent } from '../../services/professionalWorkspaceAnalytics';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { useOptionalProfessionalTour } from '../onboarding/professionalTourContext';
import { TourTarget } from '../onboarding/TourTarget';
import { ProfessionalQuickSearch } from './ProfessionalQuickSearch';

const ROUTE_TITLES: Record<string, { title: string; eyebrow?: string }> = {
  ProfessionalHome: { title: 'Inicio' },
  ProfessionalClients: { title: 'Pacientes' },
  ClientProfile: { title: 'Ficha del paciente', eyebrow: 'Pacientes' },
  ProfessionalSessions: { title: 'Agenda' },
  ProfessionalClinicWorkspace: { title: 'Mi clínica' },
  ProfessionalBilling: { title: 'Facturación' },
  CreateInvoice: { title: 'Nueva factura', eyebrow: 'Facturación' },
  ProfessionalDashboard: { title: 'Estadísticas' },
  ProfessionalAvailability: { title: 'Disponibilidad' },
  ProfessionalProfile: { title: 'Perfil profesional' },
  ProfessionalHelp: { title: 'Ayuda y comentarios' },
};

interface ProfessionalTopBarProps {
  currentRoute: string;
  onOpenMobileSidebar: () => void;
}

type OpenMenu = 'create' | 'attention' | 'avatar' | null;

export function ProfessionalTopBar({
  currentRoute,
  onOpenMobileSidebar,
}: ProfessionalTopBarProps): React.ReactElement {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1040;
  const isCompact = !isDesktop;
  const isBilling = currentRoute === 'ProfessionalBilling';
  const navigation = useNavigation<AppNavigationProp>();
  const { theme, mode, setMode } = useTheme();
  const { user, logout } = useAuth();
  const { snapshot, status: profileStatus, refresh: refreshProfile } = useProfileCompletion();
  const {
    homeData,
    homeStatus,
    unreadSupport,
    supportStatus,
    refreshAttention,
  } = useProfessionalWorkspace();
  const tour = useOptionalProfessionalTour();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const actionsRef = useRef<View>(null);
  const routeTitle = ROUTE_TITLES[currentRoute] ?? { title: 'Espacio profesional' };
  const profileItems = snapshot?.role === 'PROFESSIONAL' ? snapshot.items : [];
  const actionableProfileItems = profileItems.filter((item) => item.state === 'ACTION_REQUIRED');

  useEffect(() => setAvatarFailed(false), [user?.avatar]);
  useEffect(() => setOpenMenu(null), [currentRoute]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !openMenu) return undefined;

    const handlePointerDown = (event: PointerEvent): void => {
      const actionsNode = actionsRef.current as unknown as { contains?: (node: Node) => boolean } | null;
      if (!actionsNode?.contains?.(event.target as Node)) setOpenMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpenMenu(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  const attentionCount = (homeData?.pendingRequests.total ?? 0)
    + (homeData?.draftInvoices ?? 0)
    + actionableProfileItems.length
    + unreadSupport;
  const attentionSourcesReady = homeStatus === 'ready'
    && supportStatus === 'ready'
    && profileStatus === 'ready'
    && snapshot !== null;
  const attentionHasRefreshError = homeStatus === 'stale'
    || homeStatus === 'error'
    || supportStatus === 'stale'
    || supportStatus === 'error'
    || profileStatus === 'stale'
    || profileStatus === 'error';
  const initials = useMemo(() => (user?.name ?? 'Hera')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('es-ES') ?? '')
    .join(''), [user?.name]);

  const toggleMenu = (menu: Exclude<OpenMenu, null>): void => {
    setOpenMenu((current) => {
      const nextMenu = current === menu ? null : menu;
      if (nextMenu === 'attention') {
        void Promise.all([refreshAttention(), refreshProfile()]);
        trackProfessionalWorkspaceEvent({
          event: 'professional_attention_opened',
          properties: {
            state: attentionCount > 0
              ? 'pending'
              : attentionSourcesReady
                ? 'all_clear'
                : 'unavailable',
          },
        });
      }
      return nextMenu;
    });
  };

  const closeAfterNavigation = useCallback(() => {
    setOpenMenu(null);
  }, []);

  const navigateSimple = useCallback((route: 'ProfessionalSessions' | 'ProfessionalBilling' | 'ProfessionalProfile' | 'CreateInvoice' | 'ProfessionalHelp') => {
    switch (route) {
      case 'ProfessionalSessions': navigation.navigate('ProfessionalSessions'); break;
      case 'ProfessionalBilling': navigation.navigate('ProfessionalBilling'); break;
      case 'ProfessionalProfile': navigation.navigate('ProfessionalProfile'); break;
      case 'CreateInvoice': navigation.navigate('CreateInvoice', {}); break;
      case 'ProfessionalHelp': navigation.navigate('ProfessionalHelp'); break;
    }
    closeAfterNavigation();
  }, [closeAfterNavigation, navigation]);

  const trackCreateAction = (category: 'session' | 'patient' | 'invoice'): void => {
    trackProfessionalWorkspaceEvent({
      event: 'professional_create_action_selected',
      properties: { category },
    });
  };

  const trackAttentionAction = (
    category: 'session_requests' | 'draft_invoices' | 'profile' | 'support',
  ): void => {
    trackProfessionalWorkspaceEvent({
      event: 'professional_attention_action_selected',
      properties: { category },
    });
  };

  const startGuide = (): void => {
    setOpenMenu(null);
    if (tour?.hasTourForCurrentRoute && tour.canStartCurrentRouteTour && !tour.isRunning) {
      void tour.startCurrentRouteTour('manual');
    }
  };

  return (
    <View
      style={[
        styles.bar,
        isCompact ? styles.barCompact : null,
        { backgroundColor: theme.bgElevated, borderBottomColor: theme.borderLight },
      ]}
    >
      <View style={[styles.left, isCompact ? styles.leftCompact : null]}>
        {isCompact ? (
          <TourTarget id="professional.nav.mobile-menu">
            <View><TopBarIconButton icon="menu-outline" label="Abrir menú" onPress={onOpenMobileSidebar} /></View>
          </TourTarget>
        ) : null}
        <View style={styles.titleBlock}>
          {routeTitle.eyebrow && !isCompact ? (
            <Text style={[styles.eyebrow, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>{routeTitle.eyebrow}</Text>
          ) : null}
          <Text
            style={[
              styles.title,
              isCompact ? styles.titleCompact : null,
              { color: theme.textPrimary, fontFamily: theme.fontDisplay },
            ]}
            numberOfLines={1}
          >
            {routeTitle.title}
          </Text>
        </View>
      </View>

      {isDesktop ? (
        <View style={styles.search}><ProfessionalQuickSearch key={currentRoute} /></View>
      ) : null}

      <View ref={actionsRef} style={styles.actions}>
        <View style={styles.menuAnchor}>
          <View style={styles.createActions}>
            {isBilling ? (
              <TourTarget id="professional.billing.new-invoice">
                <AnimatedPressable
                  onPress={() => { trackCreateAction('invoice'); navigateSimple('CreateInvoice'); }}
                  style={[
                    styles.createButton,
                    isCompact ? styles.createButtonCompact : null,
                    styles.createPrimary,
                    { backgroundColor: theme.actionPrimary },
                  ]}
                  hoverLift={false}
                  pressScale={0.96}
                  accessibilityLabel="Nueva factura"
                >
                  <Ionicons name={isCompact ? 'receipt-outline' : 'add'} size={20} color={theme.actionPrimaryText} />
                  {!isCompact ? <Text style={[styles.createText, { color: theme.actionPrimaryText, fontFamily: theme.fontSansSemiBold }]}>Nueva factura</Text> : null}
                </AnimatedPressable>
              </TourTarget>
            ) : null}
            <AnimatedPressable
              onPress={() => toggleMenu('create')}
              style={[
                styles.createButton,
                isCompact ? styles.createButtonCompact : null,
                isBilling ? styles.createDropdown : null,
                { backgroundColor: theme.actionPrimary },
              ]}
              hoverLift={false}
              pressScale={0.96}
              accessibilityLabel={isBilling ? 'Más opciones de creación' : 'Crear'}
              accessibilityState={{ expanded: openMenu === 'create' }}
            >
              <Ionicons name={isBilling ? 'chevron-down' : 'add'} size={isBilling ? 16 : 20} color={theme.actionPrimaryText} />
              {!isCompact && !isBilling ? <Text style={[styles.createText, { color: theme.actionPrimaryText, fontFamily: theme.fontSansSemiBold }]}>Crear</Text> : null}
            </AnimatedPressable>
          </View>
          {openMenu === 'create' ? (
            <Popover align="right" width={250}>
              <PopoverHeading title="Crear" subtitle="Empieza desde cualquier pantalla" />
              <MenuRow icon="calendar-outline" title="Nueva cita" onPress={() => { trackCreateAction('session'); navigation.navigate('ProfessionalSessions', { openCreateSession: true }); closeAfterNavigation(); }} />
              <MenuRow icon="person-add-outline" title="Nuevo paciente" onPress={() => { trackCreateAction('patient'); navigation.navigate('ProfessionalClients', { openCreatePatient: true }); closeAfterNavigation(); }} />
              <MenuRow icon="receipt-outline" title="Nueva factura" onPress={() => { trackCreateAction('invoice'); navigateSimple('CreateInvoice'); }} />
            </Popover>
          ) : null}
        </View>

        <View style={styles.menuAnchor}>
          <TopBarIconButton
            icon={attentionCount > 0 ? 'notifications' : 'notifications-outline'}
            label="Centro de atención"
            badge={attentionCount}
            onPress={() => toggleMenu('attention')}
            expanded={openMenu === 'attention'}
          />
          {openMenu === 'attention' ? (
            <Popover align="right" width={340}>
              <PopoverHeading
                title="Centro de atención"
                subtitle={attentionCount > 0
                  ? `${attentionCount} elementos pendientes`
                  : attentionSourcesReady
                    ? 'Todo al día'
                    : attentionHasRefreshError
                      ? 'No se pudo actualizar'
                      : 'Comprobando pendientes'}
              />
              {!attentionSourcesReady ? (
                <WorkspaceStatusNotice
                  failed={attentionHasRefreshError}
                  onRetry={() => { void Promise.all([refreshAttention(), refreshProfile()]); }}
                />
              ) : null}
              {attentionCount === 0 && attentionSourcesReady ? <AllClear automation={homeData?.automation ?? null} /> : null}
              {(homeData?.pendingRequests.total ?? 0) > 0 ? (
                <MenuRow icon="calendar-outline" title={`${homeData?.pendingRequests.total} solicitudes de cita`} subtitle="Revisar en Agenda" onPress={() => { trackAttentionAction('session_requests'); navigateSimple('ProfessionalSessions'); }} tone="warning" />
              ) : null}
              {(homeData?.draftInvoices ?? 0) > 0 ? (
                <MenuRow icon="document-text-outline" title={`${homeData?.draftInvoices} facturas en borrador`} subtitle="Continuar en Facturación" onPress={() => { trackAttentionAction('draft_invoices'); navigateSimple('ProfessionalBilling'); }} />
              ) : null}
              {actionableProfileItems.length > 0 ? (
                <MenuRow icon="shield-checkmark-outline" title={`${actionableProfileItems.length} pasos de activación`} subtitle="Completar perfil profesional" onPress={() => { trackAttentionAction('profile'); navigateSimple('ProfessionalProfile'); }} tone="warning" />
              ) : null}
              {unreadSupport > 0 ? (
                <MenuRow icon="chatbubble-ellipses-outline" title={unreadSupport === 1 ? '1 respuesta nueva de soporte' : `${unreadSupport} respuestas nuevas de soporte`} onPress={() => { trackAttentionAction('support'); navigation.navigate('ProfessionalHelp', { section: 'help' }); closeAfterNavigation(); }} />
              ) : null}
            </Popover>
          ) : null}
        </View>

        <View style={styles.menuAnchor}>
          <AnimatedPressable
            onPress={() => toggleMenu('avatar')}
            style={[styles.avatarButton, { borderColor: openMenu === 'avatar' ? theme.focus : theme.border }]}
            hoverLift={false}
            pressScale={0.94}
            accessibilityLabel="Abrir menú de usuario"
            accessibilityState={{ expanded: openMenu === 'avatar' }}
          >
            {user?.avatar && !avatarFailed ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} onError={() => setAvatarFailed(true)} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: theme.secondaryMuted }]}>
                <Text style={[styles.avatarInitials, { color: theme.selection, fontFamily: theme.fontSansBold }]}>{initials}</Text>
              </View>
            )}
          </AnimatedPressable>
          {openMenu === 'avatar' ? (
            <Popover align="right" width={286}>
              <View style={styles.accountHeader}>
                <Text style={[styles.accountName, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]} numberOfLines={1}>{user?.name}</Text>
                <Text style={[styles.accountRole, { color: theme.textMuted, fontFamily: theme.fontSans }]}>Espacio profesional</Text>
              </View>
              <MenuRow icon="person-circle-outline" title="Perfil profesional" onPress={() => navigateSimple('ProfessionalProfile')} />
              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
              <Text style={[styles.menuLabel, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>Apariencia</Text>
              <View style={styles.themeOptions}>
                <ThemeOption label="Claro" icon="sunny-outline" selected={mode === 'light'} onPress={() => setMode('light')} />
                <ThemeOption label="Oscuro" icon="moon-outline" selected={mode === 'dark'} onPress={() => setMode('dark')} />
                <ThemeOption label="Sistema" icon="desktop-outline" selected={mode === 'system'} onPress={() => setMode('system')} />
              </View>
              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
              <MenuRow icon="compass-outline" title="Guía de esta pantalla" disabled={!tour?.hasTourForCurrentRoute} onPress={startGuide} />
              <MenuRow icon="help-circle-outline" title="Ayuda y comentarios" onPress={() => navigateSimple('ProfessionalHelp')} />
              <MenuRow icon="log-out-outline" title="Cerrar sesión" onPress={() => { setOpenMenu(null); void logout(); }} danger />
            </Popover>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function TopBarIconButton({ icon, label, badge, onPress, expanded }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  badge?: number;
  onPress: () => void;
  expanded?: boolean;
}): React.ReactElement {
  const { theme } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.iconButton, { backgroundColor: theme.bgMuted, borderColor: theme.borderLight }]}
      hoverLift={false}
      pressScale={0.94}
      accessibilityLabel={label}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
    >
      <Ionicons name={icon} size={19} color={theme.textSecondary} />
      {badge && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.warning }]}><Text style={[styles.badgeText, { color: theme.textOnPrimary, fontFamily: theme.fontSansBold }]}>{badge > 9 ? '9+' : badge}</Text></View>
      ) : null}
    </AnimatedPressable>
  );
}

function WorkspaceStatusNotice({ failed, onRetry }: {
  failed: boolean;
  onRetry: () => void;
}): React.ReactElement {
  const { theme } = useTheme();
  return (
    <View style={[styles.workspaceStatus, { backgroundColor: theme.bgMuted, borderColor: theme.borderLight }]}>
      <Ionicons
        name={failed ? 'cloud-offline-outline' : 'sync-outline'}
        size={17}
        color={failed ? theme.warning : theme.textMuted}
      />
      <Text style={[styles.workspaceStatusText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
        {failed ? 'No pudimos comprobar todos los pendientes.' : 'Comprobando tus pendientes…'}
      </Text>
      {failed ? (
        <AnimatedPressable onPress={onRetry} hoverLift={false} pressScale={0.97}>
          <Text style={[styles.workspaceRetry, { color: theme.link, fontFamily: theme.fontSansSemiBold }]}>Reintentar</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

function Popover({ children, width }: { children: React.ReactNode; align: 'right'; width: number }): React.ReactElement {
  const { theme } = useTheme();
  return <View style={[styles.popover, { width, backgroundColor: theme.bgElevated, borderColor: theme.border, shadowColor: theme.shadowStrong }]}>{children}</View>;
}

function PopoverHeading({ title, subtitle }: { title: string; subtitle: string }): React.ReactElement {
  const { theme } = useTheme();
  return (
    <View style={styles.popoverHeading}>
      <Text style={[styles.popoverTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>{title}</Text>
      <Text style={[styles.popoverSubtitle, { color: theme.textMuted, fontFamily: theme.fontSans }]}>{subtitle}</Text>
    </View>
  );
}

function MenuRow({ icon, title, subtitle, onPress, tone, danger = false, disabled = false }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; title: string; subtitle?: string; onPress: () => void;
  tone?: 'warning'; danger?: boolean; disabled?: boolean;
}): React.ReactElement {
  const { theme } = useTheme();
  const color = danger ? theme.error : tone === 'warning' ? theme.warning : theme.textSecondary;
  return (
    <AnimatedPressable onPress={onPress} disabled={disabled} style={[styles.menuRow, { opacity: disabled ? 0.45 : 1 }]} hoverLift={false} pressScale={0.99}>
      <View style={[styles.menuIcon, { backgroundColor: tone === 'warning' ? theme.warningBg : danger ? theme.errorBg : theme.primaryAlpha12 }]}><Ionicons name={icon} size={18} color={color} /></View>
      <View style={styles.menuCopy}>
        <Text style={[styles.menuTitle, { color: danger ? theme.error : theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{title}</Text>
        {subtitle ? <Text style={[styles.menuSubtitle, { color: theme.textMuted, fontFamily: theme.fontSans }]}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
    </AnimatedPressable>
  );
}

function ThemeOption({ label, icon, selected, onPress }: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; selected: boolean; onPress: () => void }): React.ReactElement {
  const { theme } = useTheme();
  return (
    <AnimatedPressable onPress={onPress} style={[styles.themeOption, { borderColor: selected ? theme.focus : theme.borderLight, backgroundColor: selected ? theme.primaryAlpha12 : theme.bgMuted }]} hoverLift={false} pressScale={0.97}>
      <Ionicons name={icon} size={16} color={selected ? theme.primary : theme.textMuted} />
      <Text style={[styles.themeOptionText, { color: selected ? theme.textPrimary : theme.textSecondary, fontFamily: theme.fontSansSemiBold }]}>{label}</Text>
    </AnimatedPressable>
  );
}

function AllClear({ automation }: { automation: ProfessionalHomeData['automation'] | null }): React.ReactElement {
  const { theme } = useTheme();
  const enabled = automation ? Object.values(automation).filter(Boolean).length : 0;
  return (
    <View style={[styles.allClear, { backgroundColor: theme.successLight, borderColor: theme.status.confirmed.border }]}>
      <View style={[styles.allClearIcon, { backgroundColor: theme.successBg }]}><Ionicons name="checkmark" size={18} color={theme.success} /></View>
      <View style={styles.menuCopy}>
        <Text style={[styles.menuTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Todo al día</Text>
        <Text style={[styles.menuSubtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{enabled}/3 automatizaciones activas</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 76, borderBottomWidth: 1, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, zIndex: 100 },
  barCompact: { height: 64, paddingHorizontal: spacing.sm, gap: spacing.sm },
  left: { minWidth: 170, maxWidth: 230, flexDirection: 'row', alignItems: 'center', gap: 9 },
  leftCompact: { minWidth: 0, flex: 1 },
  titleBlock: { flexShrink: 1 },
  eyebrow: { fontSize: 9, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 1 },
  title: { fontSize: 21, letterSpacing: -0.35 },
  titleCompact: { fontSize: 17 },
  search: { flex: 1, alignItems: 'center', zIndex: 120 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 140 },
  menuAnchor: { position: 'relative' },
  createActions: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  createPrimary: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  createDropdown: { width: 40, paddingHorizontal: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  createButton: { height: 42, borderRadius: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  createButtonCompact: { width: 40, height: 40, paddingHorizontal: 0 },
  createText: { fontSize: 13 },
  iconButton: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, height: 18, minWidth: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 9 },
  avatarButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1.5, padding: 2 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 11 },
  avatarFallback: { flex: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 11 },
  popover: { position: 'absolute', top: 50, right: 0, borderWidth: 1, borderRadius: 18, padding: 8, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 24, zIndex: 300 },
  popoverHeading: { paddingHorizontal: 10, paddingTop: 7, paddingBottom: 10 },
  popoverTitle: { fontSize: 18, letterSpacing: -0.2 },
  popoverSubtitle: { fontSize: 11, marginTop: 3 },
  accountHeader: { paddingHorizontal: 10, paddingVertical: 8 },
  accountName: { fontSize: 14 },
  accountRole: { fontSize: 11, marginTop: 2 },
  divider: { height: 1, marginVertical: 6, marginHorizontal: 7 },
  menuLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.7, marginHorizontal: 9, marginTop: 3, marginBottom: 7 },
  menuRow: { minHeight: 52, borderRadius: 12, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 9 },
  menuIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  menuCopy: { flex: 1, minWidth: 0 },
  menuTitle: { fontSize: 12 },
  menuSubtitle: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  themeOptions: { flexDirection: 'row', gap: 5, paddingHorizontal: 7 },
  themeOption: { flex: 1, minHeight: 54, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  themeOptionText: { fontSize: 9 },
  allClear: { minHeight: 62, marginHorizontal: 3, marginBottom: 5, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  allClearIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  workspaceStatus: { minHeight: 48, marginHorizontal: 3, marginBottom: 5, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  workspaceStatusText: { flex: 1, fontSize: 10, lineHeight: 14 },
  workspaceRetry: { fontSize: 10 },
});

export default ProfessionalTopBar;
