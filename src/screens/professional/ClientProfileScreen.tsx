import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Alert,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { AnimatedPressable, Button, Card } from '../../components/common';
import { ClinicalTab } from '../../components/professional/ClinicalTab';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { getErrorMessage } from '../../constants/errors';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import * as professionalService from '../../services/professionalService';

type TabKey = 'summary' | 'history' | 'clinical';

const TABS: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'summary', label: 'Resumen', icon: 'person-outline' },
  { key: 'history', label: 'Historial', icon: 'time-outline' },
  { key: 'clinical', label: 'Área clínica', icon: 'shield-checkmark-outline' },
];

const resolveInitialTab = (tab?: AppRouteProp<'ClientProfile'>['params']['initialTab']): TabKey => {
  if (tab === 'history' || tab === 'clinical') {
    return tab;
  }

  return 'summary';
};

const textStyles = {
  eyebrow: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
    fontWeight: '700' as const,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  title: { fontSize: typography.fontSizes.xxxl, lineHeight: 36, fontWeight: '700' as const },
  section: { fontSize: typography.fontSizes.xxl, lineHeight: 30, fontWeight: '700' as const },
  body: { fontSize: typography.fontSizes.sm, lineHeight: 22 },
  strong: { fontSize: typography.fontSizes.sm, lineHeight: 22, fontWeight: '700' as const },
  metric: { fontSize: typography.fontSizes.xxl, lineHeight: 30, fontWeight: '700' as const },
  caption: { fontSize: typography.fontSizes.xs, lineHeight: 18, fontWeight: '700' as const },
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  VIDEO_CALL: 'Videollamada',
  IN_PERSON: 'Presencial',
  CHAT: 'Chat',
  PHONE_CALL: 'Llamada',
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  PENDING: 'Pendiente',
  CANCELLED: 'Cancelada',
};

const formatDate = (value?: string | Date | null, withTime = false) =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    : 'Sin fecha';

const formatShortDate = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      })
    : 'Sin cita';

const formatNumericDate = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Sin fecha';

const getClientAge = (birthDate?: string | null) => {
  if (!birthDate) {
    return null;
  }

  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
};

const getGenderLabel = (gender?: string | null) => {
  if (!gender) {
    return null;
  }

  const normalized = gender.toUpperCase();

  if (normalized === 'MALE' || normalized === 'HOMBRE') {
    return 'Hombre';
  }

  if (normalized === 'FEMALE' || normalized === 'MUJER') {
    return 'Mujer';
  }

  if (normalized === 'NON_BINARY' || normalized === 'NON-BINARY' || normalized === 'NO_BINARIO') {
    return 'No binario';
  }

  if (normalized === 'OTHER' || normalized === 'OTRO') {
    return 'Otro';
  }

  return gender;
};

const getSessionTypeLabel = (type: string) => SESSION_TYPE_LABELS[type.toUpperCase()] || type;
const getSessionStatusLabel = (status: string) =>
  SESSION_STATUS_LABELS[status.toUpperCase()] || status;

const getTimelineStatusColor = (
  status: string,
  theme: ReturnType<typeof useTheme>['theme']
) => {
  const normalized = status.toUpperCase();

  if (normalized === 'COMPLETED') {
    return theme.success;
  }

  if (normalized === 'CONFIRMED') {
    return theme.primary;
  }

  if (normalized === 'PENDING') {
    return theme.warning;
  }

  if (normalized === 'CANCELLED') {
    return theme.error;
  }

  return theme.textMuted;
};

export function ClientProfileScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'ClientProfile'>>();
  const { clientId, initialTab, focusBillingEditor } = route.params;
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabKey>(resolveInitialTab(initialTab));
  const [client, setClient] = useState<professionalService.Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingClient, setRefreshingClient] = useState(false);
  const [billingModalVisible, setBillingModalVisible] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleHistoryItems, setVisibleHistoryItems] = useState(5);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [keepClinicalMounted, setKeepClinicalMounted] = useState(false);
  const [billingForm, setBillingForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    billingFullName: '',
    billingTaxId: '',
    billingAddress: '',
    billingPostalCode: '',
    billingCity: '',
    billingCountry: 'Spain',
  });
  const hasLoadedClientRef = useRef(false);
  const loadClientPromiseRef = useRef<Promise<void> | null>(null);
  const autoOpenedBillingRef = useRef(false);

  const isDesktop = width >= 1180;
  const isTablet = width >= 860;
  const isMobile = width < 720;
  const displayTitleStyle = useMemo(() => ({ fontFamily: theme.fontDisplayBold }), [theme]);
  const sectionTitleStyle = useMemo(() => ({ fontFamily: theme.fontDisplayBold }), [theme]);
  const emphasisStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const labelStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);

  const loadClient = useCallback(async () => {
    if (loadClientPromiseRef.current) {
      await loadClientPromiseRef.current;
      return;
    }

    const isInitialLoad = !hasLoadedClientRef.current;
    const request = (async () => {
      try {
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setRefreshingClient(true);
        }

        const result = await professionalService.getProfessionalClientDetail(clientId);

        if (!result) {
          setError('Paciente no encontrado');
          return;
        }

        setClient(result);
        setError(null);
        hasLoadedClientRef.current = true;
      } catch (loadError: unknown) {
        setError(getErrorMessage(loadError, 'No se pudo cargar la ficha del paciente'));
      } finally {
        if (isInitialLoad) {
          setLoading(false);
        } else {
          setRefreshingClient(false);
        }

        loadClientPromiseRef.current = null;
      }
    })();

    loadClientPromiseRef.current = request;
    await request;
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      void loadClient();
    }, [loadClient])
  );

  useEffect(() => {
    setVisibleHistoryItems(5);
    setActiveTab(resolveInitialTab(initialTab));
  }, [clientId, initialTab]);

  useEffect(() => {
    hasLoadedClientRef.current = false;
    loadClientPromiseRef.current = null;
    setRefreshingClient(false);
    setKeepClinicalMounted(false);
    autoOpenedBillingRef.current = false;
  }, [clientId]);

  useEffect(() => {
    if (!client) {
      return;
    }

    setBillingForm({
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      email: client.email || client.primaryEmail || '',
      phone: client.phone || client.primaryPhone || '',
      billingFullName: client.billingFullName || '',
      billingTaxId: client.billingTaxId || '',
      billingAddress: client.billingAddress || '',
      billingPostalCode: client.billingPostalCode || '',
      billingCity: client.billingCity || '',
      billingCountry: client.billingCountry || 'Spain',
    });
  }, [client]);

  useEffect(() => {
    if (focusBillingEditor && client && !autoOpenedBillingRef.current) {
      autoOpenedBillingRef.current = true;
      setBillingModalVisible(true);
    }
  }, [client, focusBillingEditor]);

  useEffect(() => {
    if (activeTab === 'clinical') {
      setKeepClinicalMounted(true);
    }
  }, [activeTab]);

  const sessions = useMemo(
    () =>
      [...(client?.sessions || [])].sort(
        (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
      ),
    [client?.sessions]
  );

  const completedSessions = useMemo(
    () => sessions.filter((session) => session.status.toUpperCase() === 'COMPLETED').length,
    [sessions]
  );

  const nextSession = useMemo(
    () =>
      sessions
        .filter((session) => new Date(session.date).getTime() > Date.now())
        .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())[0] || null,
    [sessions]
  );

  const visibleSessions = useMemo(
    () => sessions.slice(0, visibleHistoryItems),
    [sessions, visibleHistoryItems]
  );

  const initials = client?.initials || (client?.displayName || client?.user.name || 'P').slice(0, 2).toUpperCase();
  const age = getClientAge(client?.user.birthDate);
  const genderLabel = getGenderLabel(client?.user.gender);
  const heroSummary = [
    age !== null ? `${age} años` : null,
    genderLabel,
    `Paciente desde ${formatNumericDate(client?.createdAt)}`,
    `${sessions.length} sesiones`,
    `${completedSessions} completadas`,
  ]
    .filter(Boolean)
    .join(' · ');
  const showScrollCue = isMobile && contentHeight > viewportHeight + 48 && scrollOffset < 20;

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  }, []);

  const updateBillingField = useCallback(
    (field: keyof typeof billingForm, value: string) => {
      setBillingForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const handleSaveBilling = useCallback(async () => {
    if (!client) {
      return;
    }

    try {
      setSavingBilling(true);

      const trimmedBilling = {
        billingFullName: billingForm.billingFullName.trim(),
        billingTaxId: billingForm.billingTaxId.trim().toUpperCase(),
        billingAddress: billingForm.billingAddress.trim(),
        billingPostalCode: billingForm.billingPostalCode.trim(),
        billingCity: billingForm.billingCity.trim(),
        billingCountry: billingForm.billingCountry.trim(),
      };

      const billingFieldsChanged =
        trimmedBilling.billingFullName !== (client.billingFullName || '') ||
        trimmedBilling.billingTaxId !== (client.billingTaxId || '') ||
        trimmedBilling.billingAddress !== (client.billingAddress || '') ||
        trimmedBilling.billingPostalCode !== (client.billingPostalCode || '') ||
        trimmedBilling.billingCity !== (client.billingCity || '') ||
        trimmedBilling.billingCountry !== (client.billingCountry || 'Spain');

      const hasVisibleBillingInput = Boolean(
        trimmedBilling.billingFullName ||
          trimmedBilling.billingTaxId ||
          trimmedBilling.billingAddress ||
          trimmedBilling.billingPostalCode ||
          trimmedBilling.billingCity
      );

      const hasCompleteBillingInput = Boolean(
        trimmedBilling.billingFullName &&
          trimmedBilling.billingTaxId &&
          trimmedBilling.billingAddress &&
          trimmedBilling.billingPostalCode &&
          trimmedBilling.billingCity &&
          trimmedBilling.billingCountry
      );

      if (billingFieldsChanged && hasVisibleBillingInput && !hasCompleteBillingInput) {
        Alert.alert('Error', 'Completa todos los datos fiscales para guardar la ficha de facturación.');
        return;
      }

      const billingPayload = {
        ...trimmedBilling,
      };

      const updatedClient =
        client.source === 'MANAGED'
          ? await professionalService.updateManagedClient(client.id, {
              firstName: billingForm.firstName.trim() || undefined,
              lastName: billingForm.lastName.trim() || undefined,
              email: billingForm.email.trim(),
              phone: billingForm.phone.trim(),
              ...(billingFieldsChanged ? billingPayload : {}),
            })
          : billingFieldsChanged
            ? await professionalService.updateClientBilling(client.id, billingPayload)
            : client;

      setClient(updatedClient);
      setBillingModalVisible(false);
      Alert.alert(
        'Éxito',
        client.source === 'MANAGED'
          ? 'La ficha del paciente se ha actualizado.'
          : 'Los datos fiscales del paciente se han actualizado.'
      );
    } catch (saveError: unknown) {
      Alert.alert('Error', getErrorMessage(saveError, 'No se pudieron guardar los datos del paciente.'));
    } finally {
      setSavingBilling(false);
    }
  }, [billingForm, client]);

  if (loading && !client) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!client || error) {
    return (
      <View style={[styles.centered, styles.errorWrap, { backgroundColor: theme.bg }]}>
        <Ionicons name="alert-circle-outline" size={42} color={theme.warning} />
        <Text style={[textStyles.section, { color: theme.textPrimary }]}>No se pudo abrir la ficha</Text>
        <Text style={[textStyles.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {error || 'Paciente no encontrado'}
        </Text>
      </View>
    );
  }

  const heroGradient: [string, string] = isDark
    ? ['rgba(183,166,216,0.18)', 'rgba(14,17,16,0.94)']
    : ['rgba(139,157,131,0.12)', 'rgba(255,255,255,0.98)'];
  const mobileSurfaceCard = isMobile
    ? [styles.mobileSurfaceCard, { borderColor: theme.border }]
    : [];

  const administrativeCard = (
    <Card variant="default" padding="large" style={mobileSurfaceCard}>
      <Text style={[textStyles.section, { color: theme.textPrimary }, sectionTitleStyle]}>
        Información administrativa
      </Text>

      <View style={[styles.infoGrid, isMobile && styles.infoGridStack]}>
        <View style={[styles.infoBlock, isMobile && styles.infoBlockStack]}>
          <Text style={[textStyles.caption, { color: theme.textMuted }, labelStyle]}>Email</Text>
          <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
            {client.primaryEmail || 'No registrado'}
          </Text>
        </View>
        <View style={[styles.infoBlock, isMobile && styles.infoBlockStack]}>
          <Text style={[textStyles.caption, { color: theme.textMuted }, labelStyle]}>Teléfono</Text>
          <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
            {client.primaryPhone || 'No registrado'}
          </Text>
        </View>
        <View style={[styles.infoBlock, isMobile && styles.infoBlockStack]}>
          <Text style={[textStyles.caption, { color: theme.textMuted }, labelStyle]}>Ocupación</Text>
          <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
            {client.user.occupation || 'Sin información'}
          </Text>
        </View>
        <View style={[styles.infoBlock, isMobile && styles.infoBlockStack]}>
          <Text style={[textStyles.caption, { color: theme.textMuted }, labelStyle]}>Ubicación</Text>
          <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
            {client.homeCity || client.homeCountry || 'Sin información'}
          </Text>
        </View>
        <View style={[styles.infoBlock, isMobile && styles.infoBlockStack]}>
          <Text style={[textStyles.caption, { color: theme.textMuted }, labelStyle]}>Facturación</Text>
          <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
            {client.billingFullName && client.billingTaxId ? 'Datos fiscales completos' : 'Pendiente de completar'}
          </Text>
        </View>
      </View>
    </Card>
  );

  const followUpCard = (
    <Card variant="default" padding="large" style={mobileSurfaceCard}>
      <Text style={[textStyles.section, { color: theme.textPrimary }, sectionTitleStyle]}>Seguimiento</Text>
      <View style={styles.sideStack}>
        <View style={styles.sideRow}>
          <Text style={[textStyles.caption, { color: theme.textMuted }, labelStyle]}>Paciente desde</Text>
          <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
            {formatNumericDate(client.createdAt)}
          </Text>
        </View>
        <View style={styles.sideRow}>
          <Text style={[textStyles.caption, { color: theme.textMuted }, labelStyle]}>
            Última actualización
          </Text>
          <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
            {formatDate(client.updatedAt, false)}
          </Text>
        </View>
        <View style={styles.sideRow}>
          <Text style={[textStyles.caption, { color: theme.textMuted }, labelStyle]}>Consentimiento</Text>
          <Text
            style={[
              textStyles.strong,
              { color: client.consentOnFile ? theme.success : theme.warning },
              emphasisStyle,
            ]}
          >
            {client.consentOnFile ? 'Vigente' : 'Pendiente'}
          </Text>
        </View>
      </View>
    </Card>
  );

  const nextSessionCard = (
    <Card variant="default" padding="large" style={mobileSurfaceCard}>
      <Text style={[textStyles.section, { color: theme.textPrimary }, sectionTitleStyle]}>
        Próxima sesión
      </Text>
      {nextSession ? (
        <View style={styles.sideStack}>
          <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
            {formatDate(nextSession.date, true)}
          </Text>
          <Text style={[textStyles.body, { color: theme.textSecondary }]}>
            {nextSession.duration} min · {getSessionTypeLabel(nextSession.type)} ·{' '}
            {getSessionStatusLabel(nextSession.status)}
          </Text>
        </View>
      ) : (
        <Text style={[textStyles.body, { color: theme.textSecondary }]}>
          No hay ninguna sesión futura programada.
        </Text>
      )}
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.bg }}
        contentContainerStyle={[
          styles.container,
          {
            paddingHorizontal: width < 720 ? spacing.md : spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onLayout={(event) => {
          setViewportHeight(event.nativeEvent.layout.height);
        }}
        onContentSizeChange={(_, height) => {
          setContentHeight(height);
        }}
      >
      <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
        <AnimatedPressable
          onPress={() => navigation.goBack()}
          hoverLift={false}
          pressScale={0.97}
          style={[styles.backButton, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
        >
          <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
        </AnimatedPressable>

        <View style={[styles.topBarBadges, isMobile && styles.topBarBadgesMobile]}>
          <View
            style={[
              styles.topBadge,
              isMobile && styles.topBadgeMobile,
              {
                backgroundColor:
                  client.source === 'MANAGED' ? theme.secondaryAlpha12 : theme.primaryAlpha12,
              },
            ]}
          >
            <Text
              style={[
                textStyles.caption,
                styles.topBadgeText,
                isMobile && styles.topBadgeTextMobile,
                { color: client.source === 'MANAGED' ? theme.secondary : theme.primary },
              ]}
            >
              {client.source === 'MANAGED' ? 'Paciente gestionado' : 'Paciente HERA'}
            </Text>
          </View>
        </View>
      </View>

       <Card variant="default" padding="none" style={styles.heroCard}>
         <LinearGradient colors={heroGradient} style={[styles.heroGradient, isMobile && styles.heroGradientMobile]}>
          <View style={[styles.heroContent, !isTablet && styles.heroContentStack]}>
            <View
              style={[
                styles.heroIdentity,
                !isTablet && styles.heroIdentityStack,
                isMobile && styles.heroIdentityMobile,
              ]}
            >
              <View
                style={[
                  styles.avatarShell,
                  { backgroundColor: theme.bgCard, borderColor: theme.border },
                ]}
              >
                {client.user.avatar ? (
                  <Image source={{ uri: client.user.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
                )}
              </View>

                <View style={[styles.heroCopy, isMobile && styles.heroCopyMobile]}>
                  <Text style={[textStyles.eyebrow, { color: theme.textMuted }]}>Ficha del paciente</Text>
                  <Text style={[textStyles.title, { color: theme.textPrimary }, displayTitleStyle]}>
                    {client.displayName || client.user.name}
                  </Text>
                  <Text style={[styles.heroSummary, { color: theme.textSecondary }, emphasisStyle]}>
                    {heroSummary}
                  </Text>
                </View>
              </View>

            <View
              style={[
                styles.heroActions,
                !isTablet && styles.heroActionsStack,
                isMobile && styles.heroActionsMobile,
              ]}
            >
              <Button
                variant="outline"
                size="medium"
                onPress={() => setBillingModalVisible(true)}
              >
                Editar paciente
              </Button>

              <Button
                variant="secondary"
                size="medium"
                onPress={() =>
                  client.primaryEmail ? void Linking.openURL(`mailto:${client.primaryEmail}`) : undefined
                }
                disabled={!client.primaryEmail}
              >
                Enviar email
              </Button>

              {client.source === 'MANAGED' ? (
                <Button
                  variant="ghost"
                  size="medium"
                  onPress={() => {
                    void professionalService
                      .updateManagedClient(client.id, { archived: true })
                      .then(() => navigation.goBack());
                  }}
                >
                  Archivar
                </Button>
              ) : null}
            </View>
          </View>

          {refreshingClient ? (
            <View style={styles.heroRefreshRow}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.heroRefreshText, { color: theme.textSecondary }, labelStyle]}>
                Actualizando ficha...
              </Text>
            </View>
          ) : null}
        </LinearGradient>
      </Card>

      <View style={[styles.tabs, isMobile && styles.tabsMobile]}>
        {TABS.map((tab) => (
          <AnimatedPressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            hoverLift={false}
            pressScale={0.98}
            style={[
              styles.tab,
              isMobile && styles.tabMobile,
              {
                backgroundColor: activeTab === tab.key ? theme.primary : theme.bgCard,
                borderColor: activeTab === tab.key ? theme.primary : theme.border,
              },
            ]}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? theme.textOnPrimary : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                labelStyle,
                { color: activeTab === tab.key ? theme.textOnPrimary : theme.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      {activeTab === 'summary' ? (
        isMobile ? (
          <View style={styles.mobileSummaryStack}>
            {administrativeCard}
            {followUpCard}
            {nextSessionCard}
          </View>
        ) : (
        <View style={[styles.summaryLayout, !isDesktop && styles.summaryLayoutStack]}>
          <View style={[styles.summaryMain, !isDesktop && styles.summaryMainStack]}>
            {administrativeCard}
          </View>

          <View style={[styles.summarySide, !isDesktop && styles.summarySideStack]}>
            {followUpCard}
            {nextSessionCard}
          </View>
        </View>
        )
      ) : null}

      {activeTab === 'history' ? (
        <Card variant="default" padding="large">
          <View style={styles.historyHeader}>
            <Text style={[textStyles.section, { color: theme.textPrimary }, sectionTitleStyle]}>Historial de sesiones</Text>
            <Text style={[textStyles.body, { color: theme.textSecondary }]}>{sessions.length} sesiones registradas</Text>
          </View>

          <View style={styles.timeline}>
            {sessions.length === 0 ? (
              <Text style={[textStyles.body, { color: theme.textSecondary }]}>Todavía no hay sesiones asociadas a este paciente.</Text>
            ) : (
              visibleSessions.map((session) => (
                <View key={session.id} style={[styles.timelineItem, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}>
                  <View style={styles.timelineMarkerColumn}>
                    <View style={[styles.timelineDot, { backgroundColor: getTimelineStatusColor(session.status, theme) }]} />
                    <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                  </View>

                  <View style={styles.timelineContent}>
                    <View style={styles.timelineTopRow}>
                      <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>{formatDate(session.date, true)}</Text>
                      <Text style={[textStyles.caption, { color: theme.textMuted }]}>{getSessionStatusLabel(session.status)}</Text>
                    </View>
                    <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                      {session.duration} min · {getSessionTypeLabel(session.type)}
                    </Text>
                  </View>
                </View>
              ))
            )}

            {visibleHistoryItems < sessions.length ? (
              <View style={styles.historyLoadMore}>
                <Button variant="secondary" size="medium" onPress={() => setVisibleHistoryItems((current) => current + 5)}>
                  Cargar más sesiones
                </Button>
              </View>
            ) : null}
          </View>
        </Card>
      ) : null}

      {keepClinicalMounted ? (
        <View style={activeTab === 'clinical' ? undefined : styles.hiddenTabContent}>
          <ClinicalTab clientId={client.id} client={client} onRequestRefreshClient={loadClient} />
        </View>
      ) : null}
      </ScrollView>

      <Modal
        visible={billingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBillingModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Card
            variant="default"
            padding="large"
            style={[styles.modalCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderCopy}>
                  <Text style={[textStyles.section, { color: theme.textPrimary }, sectionTitleStyle]}>
                    Editar paciente
                  </Text>
                  <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                    {client.source === 'MANAGED'
                      ? 'Puedes actualizar datos de contacto y datos fiscales para la factura completa.'
                      : 'Completa los datos fiscales necesarios para emitir facturas completas a este paciente.'}
                  </Text>
                </View>
                <AnimatedPressable
                  onPress={() => setBillingModalVisible(false)}
                  hoverLift={false}
                  pressScale={0.96}
                  style={[styles.closeButton, { backgroundColor: theme.bgMuted }]}
                >
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </AnimatedPressable>
              </View>

              {client.source === 'MANAGED' ? (
                <View style={styles.modalGrid}>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Nombre</Text>
                    <TextInput
                      value={billingForm.firstName}
                      onChangeText={(value) => updateBillingField('firstName', value)}
                      style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="Nombre"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Apellidos</Text>
                    <TextInput
                      value={billingForm.lastName}
                      onChangeText={(value) => updateBillingField('lastName', value)}
                      style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="Apellidos"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Email</Text>
                    <TextInput
                      value={billingForm.email}
                      onChangeText={(value) => updateBillingField('email', value)}
                      style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="email@paciente.com"
                      placeholderTextColor={theme.textMuted}
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Teléfono</Text>
                    <TextInput
                      value={billingForm.phone}
                      onChangeText={(value) => updateBillingField('phone', value)}
                      style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="600 000 000"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                </View>
              ) : null}

              <View style={styles.modalSection}>
                <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
                  Datos fiscales para factura completa
                </Text>
                <View style={styles.modalGrid}>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Nombre fiscal</Text>
                    <TextInput
                      value={billingForm.billingFullName}
                      onChangeText={(value) => updateBillingField('billingFullName', value)}
                      style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="Nombre y apellidos"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>NIF/NIE</Text>
                    <TextInput
                      value={billingForm.billingTaxId}
                      onChangeText={(value) => updateBillingField('billingTaxId', value)}
                      style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="12345678A"
                      placeholderTextColor={theme.textMuted}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={[styles.modalField, styles.modalFieldFull]}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Dirección fiscal</Text>
                    <TextInput
                      value={billingForm.billingAddress}
                      onChangeText={(value) => updateBillingField('billingAddress', value)}
                      style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="Calle, número, piso..."
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Código postal</Text>
                    <TextInput
                      value={billingForm.billingPostalCode}
                      onChangeText={(value) => updateBillingField('billingPostalCode', value)}
                      style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="28001"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Ciudad</Text>
                    <TextInput
                      value={billingForm.billingCity}
                      onChangeText={(value) => updateBillingField('billingCity', value)}
                      style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="Madrid"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>País</Text>
                    <TextInput
                      value={billingForm.billingCountry}
                      onChangeText={(value) => updateBillingField('billingCountry', value)}
                      style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="Spain"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.modalActions}>
                <Button variant="ghost" size="medium" onPress={() => setBillingModalVisible(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="medium" onPress={handleSaveBilling} loading={savingBilling}>
                  Guardar cambios
                </Button>
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {showScrollCue ? (
        <View pointerEvents="none" style={styles.scrollCueWrap}>
          <LinearGradient
            colors={[`${theme.bg}00`, theme.bg]}
            style={styles.scrollCueGradient}
          >
            <View
              style={[
                styles.scrollCuePill,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.scrollCueText, { color: theme.textSecondary }, labelStyle]}>
                Desliza para ver más
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
            </View>
          </LinearGradient>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    gap: spacing.md,
    padding: spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 1360,
    alignSelf: 'center',
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  topBarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  topBarBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topBarBadgesMobile: {
    width: '100%',
    flex: 0,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    minWidth: 0,
    gap: spacing.xs,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  topBadgeMobile: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  topBadgeText: {
    fontWeight: '700',
  },
  topBadgeTextMobile: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.2,
  },
  heroCard: {
    overflow: 'hidden',
  },
  heroGradient: {
    padding: spacing.lg,
  },
  heroGradientMobile: {
    padding: spacing.md,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    alignItems: 'center',
  },
  heroContentStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  heroIdentity: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    flex: 1,
    minWidth: 280,
  },
  heroIdentityStack: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  heroIdentityMobile: {
    minWidth: 0,
    width: '100%',
    gap: spacing.md,
  },
  avatarShell: {
    width: 108,
    height: 108,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: typography.fontSizes.xxxl,
    lineHeight: 34,
    fontWeight: '700',
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  heroCopyMobile: {
    width: '100%',
  },
  heroSummary: {
    ...textStyles.body,
    maxWidth: 560,
  },
  heroMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroMetaGridStack: {
    flexDirection: 'column',
  },
  heroMetaCard: {
    minWidth: 168,
    maxWidth: 260,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
    flexGrow: 1,
  },
  heroMetaCardFull: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  concernRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  concernChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  heroActions: {
    flexDirection: 'column',
    gap: spacing.sm,
    alignItems: 'stretch',
    justifyContent: 'center',
    width: 220,
  },
  heroActionsStack: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  heroActionsMobile: {
    width: '100%',
    marginTop: spacing.xs,
  },
  heroRefreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  heroRefreshText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryStatsRowMobile: {
    gap: spacing.sm,
  },
  summaryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  summaryStatLabel: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryStatValue: {
    fontSize: typography.fontSizes.md,
    lineHeight: 22,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tabsMobile: {
    gap: spacing.xs,
  },
  tab: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tabMobile: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  tabText: {
    ...textStyles.body,
    fontWeight: '700',
  },
  summaryLayout: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  mobileSummaryStack: {
    gap: spacing.md,
  },
  summaryLayoutStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  summaryMain: {
    flex: 1.3,
    gap: spacing.lg,
  },
  summaryMainStack: {
    width: '100%',
    flex: 0,
  },
  summarySide: {
    flex: 0.9,
    gap: spacing.lg,
  },
  summarySideStack: {
    width: '100%',
    flex: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  cardHeaderStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  sectionCopy: {
    flex: 1,
    minWidth: 240,
    gap: 6,
  },
  sectionCopyMobile: {
    minWidth: 0,
    width: '100%',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  infoGridStack: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    gap: spacing.sm,
  },
  infoBlock: {
    minWidth: 180,
    flex: 1,
    gap: 4,
  },
  infoBlockStack: {
    minWidth: 0,
    width: '100%',
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: '100%',
  },
  questionnairePanel: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  questionnairePreview: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  questionnaireEmpty: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  preferencePanel: {
    gap: spacing.sm,
  },
  sideStack: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  sideRow: {
    gap: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  timeline: {
    gap: spacing.md,
  },
  historyLoadMore: {
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
  timelineItem: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineMarkerColumn: {
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
    gap: 4,
  },
  timelineTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  scrollCueWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollCueGradient: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  scrollCuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  scrollCueText: {
    ...textStyles.caption,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 780,
    maxHeight: '88%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  modalHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  modalField: {
    minWidth: 220,
    flex: 1,
    gap: spacing.xs,
  },
  modalFieldFull: {
    flexBasis: '100%',
  },
  modalLabel: {
    ...textStyles.caption,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizes.sm,
    backgroundColor: 'transparent',
  },
  modalSection: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalActions: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  mobileSurfaceCard: {
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    borderWidth: 1,
  },
  hiddenTabContent: {
    display: 'none',
  },
});
