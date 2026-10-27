import { PatientActionsMenu } from "../../components/professional/patient-detail/PatientActionsMenu";
import {
  DetailDialog,
  Input,
  Copy,
} from "../../components/professional/patient-detail/PatientDetailPrimitives";
import { patientCountry } from "../../components/professional/patient-detail/patientPresentation";
import { PatientMetrics } from "../../components/professional/patient-detail/PatientMetrics";
import { PatientGeneralPanel } from "../../components/professional/patient-detail/PatientGeneralPanel";
import { PatientSessionsPanel } from "../../components/professional/patient-detail/PatientSessionsPanel";
import { PatientFinancialPanel } from "../../components/professional/patient-detail/PatientFinancialPanel";
import {
  getPatientSummary,
  type PatientSummary,
} from "../../services/patientDetailService";
import type {
  ClinicalPatientAction,
  ClinicalPatientSection,
} from "../../components/professional/clinicalPatientTypes";
import type { PatientPackage } from "../../services/packageService";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { AnimatedPressable, Button, Card } from "../../components/common";
import { TourTarget } from "../../components/onboarding/TourTarget";
import { useOptionalProfessionalTour } from "../../components/onboarding/professionalTourContext";
import type { ProfessionalTourTargetId } from "../../components/onboarding/professionalTourTypes";
import {
  ClinicalTab,
  type ClinicalPatientAccessState,
} from "../../components/professional/ClinicalTab";
import { ManagedSessionSchedulerModal } from "../../components/professional/ManagedSessionSchedulerModal";
import {
  borderRadius,
  layout,
  spacing,
  typography,
} from "../../constants/colors";
import { getErrorMessage } from "../../constants/errors";
import { lightTheme } from "../../constants/theme";
import type { AppNavigationProp, AppRouteProp } from "../../constants/types";
import { useTheme } from "../../contexts/ThemeContext";
import * as professionalService from "../../services/professionalService";
import { showAppAlert, useAppAlert } from "../../components/common/alert";

type TabKey = ClinicalPatientSection | "clinical";

const TABS: Array<{
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "summary", label: "Información general", icon: "grid-outline" },
  { key: "history", label: "Sesiones", icon: "calendar-outline" },
  {
    key: "clinical",
    label: "Área clínica protegida",
    icon: "lock-closed-outline",
  },
  { key: "packages", label: "Datos y bonos", icon: "person-outline" },
];
const resolveInitialTab = (
  tab?: AppRouteProp<"ClientProfile">["params"]["initialTab"],
  workspace?: "general" | "sessions",
  sessionId?: string,
): TabKey => {
  if (
    tab === "notes" ||
    tab === "exercises" ||
    tab === "documents" ||
    tab === "packages" ||
    tab === "clinical"
  )
    return tab;
  if (workspace === "sessions" && sessionId) return "notes";
  if (tab === "history" || sessionId) return "history";
  return "summary";
};

const textStyles = {
  eyebrow: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
    fontWeight: "700" as const,
    fontFamily: lightTheme.fontSansBold,
    letterSpacing: 1.1,
    textTransform: "uppercase" as const,
  },
  title: {
    fontSize: typography.fontSizes.xxxl,
    lineHeight: 36,
    fontWeight: "700" as const,
    fontFamily: lightTheme.fontHeading,
  },
  section: {
    fontSize: typography.fontSizes.xxl,
    lineHeight: 30,
    fontWeight: "700" as const,
    fontFamily: lightTheme.fontHeading,
  },
  body: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
    fontFamily: lightTheme.fontSans,
  },
  strong: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
    fontWeight: "700" as const,
    fontFamily: lightTheme.fontSansBold,
  },
  metric: {
    fontSize: typography.fontSizes.xxl,
    lineHeight: 30,
    fontWeight: "700" as const,
    fontFamily: lightTheme.fontHeading,
  },
  caption: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
    fontWeight: "700" as const,
    fontFamily: lightTheme.fontSansBold,
  },
};

type MeasurableNativeRef = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

const MEASURE_SCROLL_VIEWPORT_TIMEOUT_MS = 80;

const formatDate = (value?: string | Date | null, withTime = false) =>
  value
    ? new Date(value).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "Sin fecha";

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

export function ClientProfileScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<"ClientProfile">>();
  const appAlert = useAppAlert();
  const {
    clientId,
    initialTab,
    clinicalWorkspace,
    focusSessionId,
    focusBillingEditor,
  } = route.params;
  const { height, width } = useWindowDimensions();
  const { theme } = useTheme();
  const tour = useOptionalProfessionalTour();

  const [activeTab, setActiveTab] = useState<TabKey>(
    resolveInitialTab(initialTab, clinicalWorkspace, focusSessionId),
  );
  const [personalEditRequest, setPersonalEditRequest] = useState(0);
  const [clinicalAction, setClinicalAction] = useState<ClinicalPatientAction>();
  const [clinicalState, setClinicalState] = useState<
    ClinicalPatientAccessState & { clientId: string }
  >({
    clientId: "",
    unlocked: false,
    granted: false,
    closed: false,
    consentStatus: null,
  });
  const updateClinicalState = useCallback(
    (state: ClinicalPatientAccessState) =>
      setClinicalState({ clientId, ...state }),
    [clientId],
  );
  const consumeClinicalAction = useCallback((id: number) => {
    setClinicalAction((current) =>
      current && current.id <= id ? undefined : current,
    );
  }, []);
  const requestClinicalAction = (kind: ClinicalPatientAction["kind"]) => {
    setActiveTab("clinical");
    setClinicalAction({ id: Date.now(), kind });
  };
  const [summaryState, setSummaryState] = useState<{
    clientId: string;
    data: PatientSummary;
  } | null>(null);
  const summary =
    summaryState?.clientId === clientId ? summaryState.data : null;
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [clinicalSessionTarget, setClinicalSessionTarget] = useState(
    route.params.clinicalSessionId ||
      (clinicalWorkspace === "sessions" ? focusSessionId : undefined),
  );
  const [clinicalDocumentTarget, setClinicalDocumentTarget] = useState(
    route.params.clinicalDocumentId,
  );
  const [operationalSessionTarget, setOperationalSessionTarget] =
    useState(focusSessionId);
  const [client, setClient] = useState<professionalService.Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingClient, setRefreshingClient] = useState(false);
  const [billingModalVisible, setBillingModalVisible] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);
  const [billingContactError, setBillingContactError] = useState("");
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [scheduledPackage, setScheduledPackage] = useState<PatientPackage>();
  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionsRefreshVersion, setSessionsRefreshVersion] = useState(0);
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [billingForm, setBillingForm] = useState({
    billingFullName: "",
    billingTaxId: "",
    billingAddress: "",
    billingPostalCode: "",
    billingCity: "",
    billingCountry: "Spain",
  });
  const hasLoadedClientRef = useRef(false);
  const loadClientPromiseRef = useRef<Promise<void> | null>(null);
  const summaryRequestRef = useRef(0);
  const activeClientIdRef = useRef(clientId);
  if (activeClientIdRef.current !== clientId) {
    activeClientIdRef.current = clientId;
    hasLoadedClientRef.current = false;
    loadClientPromiseRef.current = null;
    summaryRequestRef.current += 1;
  }
  const autoOpenedBillingRef = useRef(false);
  useEffect(() => {
    autoOpenedBillingRef.current = false;
  }, [clientId]);
  const tourScrollRef = useRef<ScrollView>(null);

  const isDesktop = width >= 1180;
  const isMobile = width < 720;
  const labelStyle = useMemo(
    () => ({ fontFamily: theme.fontSansSemiBold }),
    [theme],
  );

  const loadClient = useCallback(async () => {
    if (loadClientPromiseRef.current) {
      await loadClientPromiseRef.current;
      if (activeClientIdRef.current !== clientId) return;
      // A mutation may have completed while that read was in flight. Fetch a
      // fresh value, or join another refresh already queued behind the old read.
      if (loadClientPromiseRef.current) {
        await loadClientPromiseRef.current;
        return;
      }
    }

    const isInitialLoad = !hasLoadedClientRef.current;
    const request = (async () => {
      try {
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setRefreshingClient(true);
        }

        const result = await professionalService.getProfessionalClientDetail(
          clientId,
          6,
        );
        if (activeClientIdRef.current !== clientId) return;

        if (!result) {
          setError("Paciente no encontrado");
          return;
        }

        setClient(result);
        setError(null);
        hasLoadedClientRef.current = true;
      } catch (loadError: unknown) {
        if (activeClientIdRef.current !== clientId) return;
        setError(
          getErrorMessage(loadError, "No se pudo cargar la ficha del paciente"),
        );
      } finally {
        if (activeClientIdRef.current !== clientId) return;
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

  const loadSummary = useCallback(async () => {
    const request = ++summaryRequestRef.current;
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const data = await getPatientSummary(clientId);
      if (activeClientIdRef.current === clientId && summaryRequestRef.current === request)
        setSummaryState({ clientId, data });
    } catch (cause) {
      if (activeClientIdRef.current === clientId && summaryRequestRef.current === request) {
        setSummaryState(null);
        setSummaryError(
          getErrorMessage(cause, "No se pudo cargar el resumen del paciente."),
        );
      }
    } finally {
      if (activeClientIdRef.current === clientId && summaryRequestRef.current === request) setSummaryLoading(false);
    }
  }, [clientId]);
  const refreshAll = useCallback(async () => {
    setSessionsRefreshVersion((value) => value + 1);
    await Promise.all([loadClient(), loadSummary()]);
  }, [loadClient, loadSummary]);
  useFocusEffect(
    useCallback(() => {
      void refreshAll();
    }, [refreshAll]),
  );

  useEffect(() => {
    setActiveTab(
      resolveInitialTab(initialTab, clinicalWorkspace, focusSessionId),
    );
  }, [clientId, initialTab, clinicalWorkspace, focusSessionId]);

  useEffect(() => {
    setRefreshingClient(false);
    setClinicalAction(undefined);
    setPersonalEditRequest(0);
    autoOpenedBillingRef.current = false;
  }, [clientId]);

  useEffect(() => {
    setClinicalSessionTarget(
      route.params.clinicalSessionId ||
        (clinicalWorkspace === "sessions" ? focusSessionId : undefined),
    );
    setClinicalDocumentTarget(route.params.clinicalDocumentId);
    setOperationalSessionTarget(focusSessionId);
    if (route.params.clinicalDocumentId) setActiveTab("documents");
    else if (route.params.clinicalSessionId) setActiveTab("notes");
  }, [
    clientId,
    clinicalWorkspace,
    focusSessionId,
    route.params.clinicalSessionId,
    route.params.clinicalDocumentId,
  ]);

  useEffect(() => {
    if (!client) {
      return;
    }

    setBillingForm({
      billingFullName: client.billingFullName || "",
      billingTaxId: client.billingTaxId || "",
      billingAddress: client.billingAddress || "",
      billingPostalCode: client.billingPostalCode || "",
      billingCity: client.billingCity || "",
      billingCountry: client.billingCountry || "Spain",
    });
    setBillingContactError("");
  }, [client]);

  useEffect(() => {
    if (
      (focusBillingEditor || route.params.focusPersonalEditor) &&
      client &&
      !autoOpenedBillingRef.current
    ) {
      autoOpenedBillingRef.current = true;
      const personal =
        route.params.focusPersonalEditor ||
        !client.primaryEmail ||
        client.billingReadiness?.missingFields.some(
          (field) => field.purpose === "BOOKING",
        );
      if (personal) {
        setActiveTab("summary");
        setPersonalEditRequest((value) => value + 1);
      } else setBillingModalVisible(true);
    }
  }, [client, focusBillingEditor, route.params.focusPersonalEditor]);

  const initials =
    client?.initials ||
    (client?.displayName || client?.user.name || "P").slice(0, 2).toUpperCase();
  const age = getClientAge(summary?.profile.birthDate);
  const isManagedClient = client?.source === "MANAGED";
  const isClientArchived = Boolean(client?.archivedAt);
  const showScrollCue =
    isMobile && contentHeight > viewportHeight + 48 && scrollOffset < 20;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setScrollOffset(event.nativeEvent.contentOffset.y);
    },
    [],
  );

  const measureScrollViewport = useCallback(async () => {
    const scrollRef =
      tourScrollRef.current as unknown as MeasurableNativeRef | null;

    if (!scrollRef || typeof scrollRef.measureInWindow !== "function") {
      return null;
    }

    return new Promise<{ height: number; y: number } | null>((resolve) => {
      let hasResolved = false;
      const timeout = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          resolve(null);
        }
      }, MEASURE_SCROLL_VIEWPORT_TIMEOUT_MS);

      scrollRef.measureInWindow((_x, y, _width, measuredHeight) => {
        if (hasResolved) {
          return;
        }

        hasResolved = true;
        clearTimeout(timeout);
        resolve({ height: measuredHeight, y });
      });
    });
  }, []);

  const prepareClinicalTourStep = useCallback(
    async (targetId: ProfessionalTourTargetId) => {
      const targetLayout = await tour?.measureTarget(targetId);

      if (!targetLayout) {
        return;
      }

      const scrollViewport = await measureScrollViewport();
      const viewportTop = scrollViewport?.y ?? 0;
      const visibleHeight = scrollViewport?.height || viewportHeight || height;

      if (visibleHeight <= 0) {
        return;
      }

      const targetCenter = targetLayout.y + targetLayout.height / 2;
      const viewportCenter = viewportTop + visibleHeight / 2;
      const nextScrollOffset = Math.max(
        0,
        Math.min(
          Math.max(0, contentHeight - visibleHeight),
          scrollOffset + targetCenter - viewportCenter,
        ),
      );

      if (Math.abs(nextScrollOffset - scrollOffset) < 1) {
        return;
      }

      setScrollOffset(nextScrollOffset);
      tourScrollRef.current?.scrollTo({
        animated: false,
        y: nextScrollOffset,
      });
    },
    [
      contentHeight,
      height,
      measureScrollViewport,
      scrollOffset,
      tour,
      viewportHeight,
    ],
  );

  const updateBillingField = useCallback(
    (field: keyof typeof billingForm, value: string) => {
      setBillingForm((current) => ({ ...current, [field]: value }));
      setBillingContactError("");
    },
    [],
  );

  const handleSaveBilling = useCallback(async () => {
    if (!client || client.archivedAt) {
      return;
    }

    try {
      setSavingBilling(true);
      setBillingContactError("");

      const trimmedBilling = {
        billingFullName: billingForm.billingFullName.trim(),
        billingTaxId: billingForm.billingTaxId.trim().toUpperCase(),
        billingAddress: billingForm.billingAddress.trim(),
        billingPostalCode: billingForm.billingPostalCode.trim(),
        billingCity: billingForm.billingCity.trim(),
        billingCountry: billingForm.billingCountry.trim(),
      };

      const billingFieldsChanged =
        trimmedBilling.billingFullName !== (client.billingFullName || "") ||
        trimmedBilling.billingTaxId !== (client.billingTaxId || "") ||
        trimmedBilling.billingAddress !== (client.billingAddress || "") ||
        trimmedBilling.billingPostalCode !== (client.billingPostalCode || "") ||
        trimmedBilling.billingCity !== (client.billingCity || "") ||
        trimmedBilling.billingCountry !== (client.billingCountry || "Spain");

      const billingPayload = {
        ...trimmedBilling,
      };

      const updatedClient = billingFieldsChanged
        ? await professionalService.updateClientBilling(
            client.id,
            billingPayload,
          )
        : client;
      setClient(updatedClient);
      setBillingModalVisible(false);
      if (route.params.returnAfterBillingSave) {
        navigation.goBack();
        return;
      }
      showAppAlert(
        appAlert,
        "Éxito",
        "Los datos fiscales del paciente se han actualizado.",
      );
    } catch (saveError: unknown) {
      setBillingContactError(
        getErrorMessage(
          saveError,
          "No se pudieron guardar los datos fiscales.",
        ),
      );
    } finally {
      setSavingBilling(false);
    }
  }, [
    appAlert,
    billingForm,
    client,
    navigation,
    route.params.returnAfterBillingSave,
  ]);

  const canScheduleProfessionalSession = Boolean(client && !isClientArchived);

  const openSessionScheduler = useCallback(() => {
    if (!canScheduleProfessionalSession) return;
    setScheduledPackage(undefined);
    setSessionModalVisible(true);
  }, [canScheduleProfessionalSession]);

  const closeSessionScheduler = useCallback(() => {
    if (sessionSaving) return;
    setSessionModalVisible(false);
  }, [sessionSaving]);

  const handleToggleArchive = useCallback(() => {
    if (!client || client.source !== "MANAGED" || archiveSubmitting) {
      return;
    }

    const shouldArchive = !client.archivedAt;

    const applyArchiveChange = async () => {
      try {
        setArchiveSubmitting(true);
        const updatedClient = await professionalService.updateManagedClient(
          client.id,
          {
            archived: shouldArchive,
          },
        );
        setClient(updatedClient);

        showAppAlert(
          appAlert,
          "Éxito",
          shouldArchive
            ? "Tu relación asistencial está archivada. Conservas tu historia; la atención con otros profesionales y las citas existentes continúan."
            : "Tu relación vuelve a estar activa. Si el expediente estaba cerrado, solicita de nuevo el consentimiento asistencial antes de incorporar información clínica.",
        );
      } catch (archiveError: unknown) {
        showAppAlert(
          appAlert,
          shouldArchive ? "No se pudo archivar" : "No se pudo desarchivar",
          getErrorMessage(
            archiveError,
            shouldArchive
              ? "No se pudo archivar el paciente."
              : "No se pudo desarchivar el paciente.",
          ),
        );
      } finally {
        setArchiveSubmitting(false);
      }
    };

    if (shouldArchive) {
      showAppAlert(
        appAlert,
        "Archivar paciente",
        "El paciente pasará a archivados y no se podrán crear nuevas citas mientras esté archivado. Podrás desarchivarlo desde esta misma ficha.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Archivar",
            style: "destructive",
            onPress: () => {
              void applyArchiveChange();
            },
          },
        ],
        { cancelable: true },
      );
      return;
    }

    void applyArchiveChange();
  }, [appAlert, archiveSubmitting, client]);

  const handleCreateManagedSession = useCallback(
    async (input: professionalService.CreateManagedClientSessionInput) => {
      if (!client) return;

      try {
        setSessionSaving(true);
        await professionalService.createManagedClientSession(input);
        setSessionModalVisible(false);
        showAppAlert(
          appAlert,
          "Cita creada",
          "La cita se ha programado correctamente.",
        );
        await refreshAll();
      } catch (createError: unknown) {
        if (
          professionalService.isManagedSessionBufferConflictError(createError)
        ) {
          throw createError;
        }

        showAppAlert(
          appAlert,
          "No se pudo crear la cita",
          getErrorMessage(createError, "No se pudo crear la cita"),
        );
      } finally {
        setSessionSaving(false);
      }
    },
    [appAlert, client, refreshAll],
  );

  if ((loading && !client) || (!error && client?.id !== clientId)) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!client || error) {
    return (
      <View
        style={[
          styles.centered,
          styles.errorWrap,
          { backgroundColor: theme.bg },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={42} color={theme.warning} />
        <Text style={[textStyles.section, { color: theme.textPrimary }]}>
          No se pudo abrir la ficha
        </Text>
        <Text
          style={[
            textStyles.body,
            { color: theme.textSecondary, textAlign: "center" },
          ]}
        >
          {error || "Paciente no encontrado"}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        ref={tourScrollRef}
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
        <TourTarget id="professional.client-profile.hero" fill>
          <Card padding="small" style={styles.patientHero}>
            <View
              style={[
                styles.patientHeader,
                isMobile && {
                  flexDirection: "column",
                  alignItems: "stretch",
                },
              ]}
            >
              <View style={styles.patientIdentity}>
                <AnimatedPressable
                  accessibilityLabel="Volver"
                  hoverLift={false}
                  onPress={() => navigation.goBack()}
                  style={styles.patientBack}
                >
                  <Ionicons
                    name="arrow-back"
                    size={20}
                    color={theme.textSecondary}
                  />
                </AnimatedPressable>
                <View
                  style={[
                    styles.patientAvatar,
                    { backgroundColor: theme.bgMuted },
                  ]}
                >
                  {client.user?.avatar ? (
                    <Image
                      source={{ uri: client.user.avatar }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <Text
                      style={{
                        color: theme.textPrimary,
                        fontFamily: theme.fontHeading,
                        fontSize: 21,
                      }}
                    >
                      {initials}
                    </Text>
                  )}
                </View>
                <View style={styles.patientName}>
                  <View style={styles.patientNameRow}>
                    <Text
                      style={[
                        styles.patientTitle,
                        {
                          color: theme.textPrimary,
                          fontFamily: theme.fontSansBold,
                        },
                      ]}
                    >
                      {client.displayName || client.user?.name}
                    </Text>
                    <Text
                      style={[
                        styles.patientStatus,
                        {
                          color: isClientArchived
                            ? theme.warning
                            : theme.success,
                          backgroundColor: isClientArchived
                            ? theme.warningBg
                            : theme.successBg,
                          fontFamily: theme.fontSansSemiBold,
                        },
                      ]}
                    >
                      {isClientArchived
                        ? "ARCHIVADO"
                        : summary?.closedAt ||
                            (clinicalState.clientId === client.id &&
                              clinicalState.closed)
                          ? "PROCESO CERRADO"
                          : "EN SEGUIMIENTO"}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontFamily: theme.fontSans,
                      fontSize: 12,
                      lineHeight: 20,
                    }}
                  >
                    {age !== null ? `${age} años · ` : ""}
                    {summary?.relationshipSince
                      ? `Paciente desde ${formatDate(summary.relationshipSince)}`
                      : "Fecha de incorporación no registrada"}
                  </Text>
                  <AnimatedPressable
                    hoverLift={false}
                    accessibilityLabel="Gestionar consentimiento y acceso clínico"
                    onPress={() => requestClinicalAction("CONSENT")}
                  >
                    <Text
                      style={{
                        color: theme.primary,
                        fontFamily: theme.fontSansSemiBold,
                        fontSize: 11,
                        lineHeight: 20,
                      }}
                    >
                      {clinicalState.clientId === client.id &&
                      clinicalState.unlocked
                        ? `Área clínica desbloqueada · Consentimiento ${clinicalState.consentStatus === "SIGNED" ? "firmado" : clinicalState.consentStatus === "WITHDRAWN" ? "retirado" : clinicalState.consentStatus === "SENT" ? "enviado" : "pendiente"}`
                        : "Área clínica protegida · Gestionar consentimiento"}
                    </Text>
                  </AnimatedPressable>
                </View>
              </View>
              <TourTarget
                id="professional.client-profile.actions"
                fill
                style={{
                  minWidth: 0,
                  maxWidth: "100%",
                  ...(isMobile ? { width: "100%" } : {}),
                }}
              >
                <View style={styles.patientActions}>
                  {canScheduleProfessionalSession ? (
                    <Button
                      variant="outline"
                      size="small"
                      onPress={openSessionScheduler}
                    >
                      Programar sesión
                    </Button>
                  ) : null}

                  <PatientActionsMenu
                    items={[
                      {
                        label: "Editar datos personales",
                        icon: "create-outline",
                        disabled: isClientArchived,
                        hint: "Paciente archivado",
                        onPress: () => {
                          setActiveTab("summary");
                          setPersonalEditRequest((value) => value + 1);
                        },
                      },
                      {
                        label: "Email",
                        icon: "mail-outline",
                        disabled: !client.primaryEmail,
                        hint: "Sin email de contacto",
                        onPress: () => {
                          if (client.primaryEmail)
                            void Linking.openURL(
                              `mailto:${client.primaryEmail}`,
                            );
                        },
                      },
                      {
                        label: "Proponer derivación",
                        icon: "people-outline",
                        disabled: isClientArchived,
                        hint: "Paciente archivado",
                        onPress: () =>
                          navigation.navigate("Referrals", {
                            clientId: client.id,
                          }),
                      },
                      ...(isManagedClient
                        ? [
                            {
                              label: isClientArchived
                                ? "Desarchivar paciente"
                                : "Archivar paciente",
                              icon: "archive-outline" as const,
                              disabled: archiveSubmitting,
                              destructive: !isClientArchived,
                              onPress: handleToggleArchive,
                            },
                          ]
                        : []),
                    ]}
                  />
                </View>
              </TourTarget>
            </View>
            <PatientMetrics
              summary={summary}
              loading={summaryLoading}
              error={summaryError}
              onRetry={() => void loadSummary()}
            />
            {refreshingClient ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : null}
          </Card>
        </TourTarget>
        <TourTarget id="professional.client-profile.tabs" fill>
          <TourTarget id="professional.clinical.workspace-tabs" fill>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.patientTabs,
                { borderBottomColor: theme.borderLight },
              ]}
            >
              {TABS.map((tab) => {
                const selected =
                  tab.key === "clinical"
                    ? ["clinical", "notes", "exercises", "documents"].includes(
                        activeTab,
                      )
                    : activeTab === tab.key;
                return (
                  <AnimatedPressable
                    key={tab.key}
                    hoverLift={false}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setActiveTab(tab.key)}
                    style={[
                      styles.patientTab,
                      {
                        borderBottomColor: selected
                          ? theme.actionPrimary
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected
                          ? theme.textPrimary
                          : theme.textSecondary,
                        fontFamily: selected
                          ? theme.fontSansSemiBold
                          : theme.fontSans,
                        fontSize: 13,
                        lineHeight: 20,
                      }}
                    >
                      {tab.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </TourTarget>
        </TourTarget>

        {activeTab === "summary" ? (
          <PatientGeneralPanel
            editRequest={personalEditRequest}
            onEditRequestConsumed={(id) =>
              setPersonalEditRequest((current) =>
                current === id ? 0 : current,
              )
            }
            onPersonalSaved={async () => {
              await refreshAll();
              if (route.params.returnAfterBillingSave) navigation.goBack();
            }}
            onActivity={(item) => {
              if (item.target === "INVOICE" && item.targetId)
                navigation.navigate("CreateInvoice", {
                  invoiceId: item.targetId,
                  returnToClientId: client.id,
                });
              else if (item.target === "SESSION" && item.targetId) {
                setOperationalSessionTarget(item.targetId);
                setActiveTab("history");
              } else setActiveTab("packages");
            }}
            onPayments={() => setActiveTab("packages")}
            key={`general:${client.id}`}
            client={client}
            summary={summary}
            loading={summaryLoading}
            error={summaryError}
            onRetry={() => void loadSummary()}
            onRefresh={refreshAll}
            onEditBilling={() => setBillingModalVisible(true)}
            onConsent={() => requestClinicalAction("CONSENT")}
            onSession={(id) => {
              setOperationalSessionTarget(id);
              setActiveTab("history");
            }}
          />
        ) : null}
        {activeTab === "history" ? (
          <PatientSessionsPanel
            refreshVersion={sessionsRefreshVersion}
            key={`sessions:${client.id}`}
            client={client}
            focusSessionId={operationalSessionTarget}
            onClinical={(id) => {
              setClinicalSessionTarget(id);
              setActiveTab("notes");
            }}
            onSchedule={openSessionScheduler}
            onRefresh={refreshAll}
          />
        ) : null}
        {activeTab === "packages" ? (
          <PatientFinancialPanel
            key={`financial:${client.id}`}
            client={client}
            summary={summary}
            onEditBilling={() => setBillingModalVisible(true)}
            onReserve={(row) => {
              setScheduledPackage(row);
              setSessionModalVisible(true);
            }}
            onRefresh={refreshAll}
          />
        ) : null}
        <ClinicalTab
          key={`clinical:${client.id}`}
          visible={["clinical", "notes", "exercises", "documents"].includes(
            activeTab,
          )}
          section={activeTab === "clinical" ? "notes" : activeTab}
          action={clinicalAction}
          onActionConsumed={consumeClinicalAction}
          onSection={setActiveTab}
          onAccessState={updateClinicalState}
          clientId={client.id}
          client={client}
          initialWorkspace={clinicalWorkspace}
          focusSessionId={clinicalSessionTarget}
          focusDocumentId={clinicalDocumentTarget}
          onPrepareClinicalTourStep={prepareClinicalTourStep}
          onRequestRefreshClient={refreshAll}
          tourTargetsActive={[
            "clinical",
            "notes",
            "exercises",
            "documents",
          ].includes(activeTab)}
        />
      </ScrollView>

      <DetailDialog
        title="Editar facturación"
        visible={billingModalVisible}
        busy={savingBilling}
        onClose={() => setBillingModalVisible(false)}
        footer={
          <>
            <Button
              variant="outline"
              disabled={savingBilling}
              onPress={() => setBillingModalVisible(false)}
            >
              Cancelar
            </Button>
            <Button onPress={handleSaveBilling} loading={savingBilling}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <Copy muted>
          Datos del pagador para emitir facturas. Se guardan separados de los
          datos personales del paciente.
        </Copy>
        <View style={styles.modalGrid}>
          {(
            [
              ["billingFullName", "Nombre / Razón social"],
              ["billingTaxId", "NIF / NIE"],
              ["billingAddress", "Dirección fiscal"],
              ["billingPostalCode", "Código postal"],
              ["billingCity", "Ciudad"],
              ["billingCountry", "País"],
            ] as const
          ).map(([field, label]) => (
            <View
              key={field}
              style={[
                styles.modalField,
                { minWidth: width < 720 ? "100%" : "45%" },
              ]}
            >
              <Copy>{label}</Copy>
              <Input
                accessibilityLabel={label}
                value={
                  field === "billingCountry"
                    ? patientCountry(billingForm[field])
                    : billingForm[field]
                }
                editable={!savingBilling}
                onChangeText={(value) => updateBillingField(field, value)}
              />
            </View>
          ))}
        </View>
        {billingContactError ? (
          <Text
            accessibilityRole="alert"
            style={{ color: theme.error, fontFamily: theme.fontSans }}
          >
            {billingContactError}
          </Text>
        ) : null}
        <Button
          variant="outline"
          size="small"
          disabled={!summary || savingBilling}
          onPress={() => {
            if (summary)
              setBillingForm((current) => ({
                ...current,
                billingFullName: client.displayName || client.user.name,
                billingAddress: summary.profile.address || "",
                billingPostalCode: summary.profile.postalCode || "",
                billingCity: summary.profile.city || "",
                billingCountry: summary.profile.country || "Spain",
              }));
          }}
        >
          Usar nombre y domicilio del paciente
        </Button>
      </DetailDialog>

      <ManagedSessionSchedulerModal
        visible={sessionModalVisible}
        clients={client ? [client] : []}
        initialClientId={client?.id}
        initialValues={
          scheduledPackage && scheduledPackage.snapshot.options[0]
            ? {
                clientId,
                patientPackageId: scheduledPackage.id,
                optionId: scheduledPackage.snapshot.options[0].id,
                type: scheduledPackage.snapshot.options[0].modality,
                duration: scheduledPackage.snapshot.options[0].durationMinutes,
                date: new Date(Date.now() + 86400000).toISOString(),
              }
            : undefined
        }
        saving={sessionSaving}
        onClose={closeSessionScheduler}
        onSubmit={handleCreateManagedSession}
      />

      {showScrollCue ? (
        <View pointerEvents="none" style={styles.scrollCueWrap}>
          <View
            style={[styles.scrollCueSurface, { backgroundColor: theme.bg }]}
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
              <Text
                style={[
                  styles.scrollCueText,
                  { color: theme.textSecondary },
                  labelStyle,
                ]}
              >
                Desliza para ver más
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={theme.textSecondary}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  patientHero: { gap: 8 },
  patientHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  patientIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 240,
  },
  patientBack: {
    width: 28,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  patientName: { flex: 1, minWidth: 0, gap: 2 },
  patientNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  patientTitle: { fontSize: 22, lineHeight: 28 },
  patientStatus: {
    fontSize: 9,
    letterSpacing: 0.5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  patientActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    flexShrink: 1,
  },
  patientMenu: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 4,
  },
  patientMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  patientMetric: {
    flex: 1,
    minWidth: 135,
    borderRadius: 10,
    padding: 11,
    gap: 2,
  },
  patientTabs: {
    flexDirection: "row",
    gap: 26,
    borderBottomWidth: 1,
    minWidth: "100%",
  },
  patientTab: { paddingVertical: 13, borderBottomWidth: 2 },
  patientAdmin: { gap: 18 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorWrap: {
    gap: spacing.md,
    padding: spacing.xl,
  },
  container: {
    width: "100%",
    maxWidth: 1360,
    alignSelf: "center",
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: 14,
  },
  adminSections: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  adminSection: {
    gap: spacing.sm,
  },
  adminSectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  adminGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  adminGridStack: {
    flexDirection: "column",
    flexWrap: "nowrap",
  },
  adminCell: {
    minWidth: 190,
    flexBasis: 190,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  adminCellWide: {
    minWidth: 260,
    flexBasis: 300,
  },
  adminCellHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  adminCellLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  adminCellValue: {
    ...textStyles.strong,
    minWidth: 0,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    flexWrap: "wrap",
    marginBottom: spacing.md,
  },
  timeline: {
    gap: spacing.md,
  },
  historyLoadMore: {
    marginTop: spacing.sm,
    alignItems: "flex-start",
  },
  timelineItem: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
  },
  timelineMarkerColumn: {
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  scrollCueWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollCueSurface: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  scrollCuePill: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 780,
    maxHeight: "88%",
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    alignItems: "flex-start",
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
    alignItems: "center",
    justifyContent: "center",
  },
  modalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  modalField: {
    minWidth: 220,
    flex: 1,
    gap: spacing.xs,
  },
  modalFieldFull: {
    flexBasis: "100%",
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
    fontFamily: lightTheme.fontSans,
    backgroundColor: "transparent",
  },
  modalError: {
    ...textStyles.caption,
  },
  modalSection: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalActions: {
    marginTop: spacing.xl,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  mobileSurfaceCard: {
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    borderWidth: 1,
  },
  hiddenTabContent: {
    display: "none",
  },
});
