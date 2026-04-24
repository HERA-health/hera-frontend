import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NavigationProp, RouteProp, useFocusEffect } from '@react-navigation/native';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { RootStackParamList } from '../../constants/types';
import {
  spacing,
  borderRadius,
  typography,
  shadows,
} from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { AnimatedPressable, Button } from '../../components/common';
import { SimpleDropdown, DropdownOption } from '../../components/common/SimpleDropdown';
import { useTheme } from '../../contexts/ThemeContext';
import {
  billingService,
  FullBillingConfig,
  TariffItem,
  CreateInvoiceData,
  UpdateInvoiceData,
  Invoice,
  InvoiceKind,
} from '../../services/billingService';
import { getProfessionalClients, Client } from '../../services/professionalService';

// ============================================================================
// TYPES
// ============================================================================

interface CreateInvoiceScreenProps {
  route: RouteProp<RootStackParamList, 'CreateInvoice'>;
  navigation: NavigationProp<RootStackParamList>;
}

interface LineItem {
  id: string;
  concept: string;
  date: string;
  durationMinutes: number;
  unitPrice: string;
}

type InvoiceClientOption = Client & {
  name: string;
  email: string;
};

// ============================================================================
// STRINGS
// ============================================================================

const STRINGS = {
  titleNew: 'Nueva factura',
  titleEdit: 'Editar borrador',
  backLabel: 'Facturación',
  backToPatientLabel: 'Volver a la ficha',
  statusDraft: 'Borrador',
  statusSent: 'Enviada',
  preview: 'Vista previa',
  saveDraft: 'Guardar borrador',
  confirmSend: 'Confirmar y enviar',
  clientSection: 'Paciente',
  invoiceTypeSection: 'Tipo de factura',
  simplifiedLabel: 'Simplificada',
  simplifiedHint: 'Más ágil para importes de hasta 400 € IVA incluido',
  fullLabel: 'Completa',
  fullHint: 'Incluye los datos fiscales completos del paciente',
  clientPlaceholder: 'Seleccionar cliente...',
  clientBillingReady: 'Datos fiscales listos para factura completa',
  clientBillingMissing: 'Faltan datos fiscales del paciente para emitir una factura completa',
  completePatientBilling: 'Completar datos fiscales',
  clientBillingSummary: 'Datos fiscales del destinatario',
  specialistBillingMissing:
    'Te faltan el nombre fiscal, el NIF o la dirección fiscal para emitir facturas completas.',
  clientLockedHint: 'Paciente fijado por la sesión seleccionada',
  conceptSection: 'Concepto',
  conceptHeader: 'Concepto',
  dateHeader: 'Fecha',
  durationHeader: 'Duración',
  unitPriceHeader: 'Precio unitario',
  totalHeader: 'Total',
  addLine: ' Añadir línea',
  defaultConcept: 'Sesión individual de psicología',
  additionalSection: 'Información adicional',
  internalNotes: 'Notas internas',
  internalNotesHint: 'Solo visible para ti',
  paymentConditions: 'Condiciones de pago',
  summaryTitle: 'Resumen',
  invoiceNumber: 'N.º de factura',
  issueDate: 'Fecha de emisión',
  subtotalLines: 'Subtotal de líneas',
  ivaIncluded: 'IVA incluido en el precio',
  exemption: 'Exención',
  exemptionArticle: 'Art. 20 Ley 37/1992',
  taxBase: 'BASE IMPONIBLE',
  ivaLabel: 'IVA',
  totalInvoice: 'TOTAL FACTURA',
  ivaConfigNote: 'IVA configurado en Datos fiscales',
  changeConfig: 'Cambiar configuración →',
  tariffSection: 'Aplicar tarifa',
  simplifiedLimitNote: 'Las facturas simplificadas solo pueden emitirse hasta 400 € IVA incluido.',
  validationNoClient: 'Selecciona un cliente',
  validationNoAmount: 'Al menos una línea debe tener un importe superior a 0',
  validationFullInvoiceClientData: 'Completa antes los datos fiscales del paciente para emitir una factura completa',
  validationFullInvoiceSpecialistData: 'Completa tus datos fiscales antes de emitir una factura completa',
  validationSimplifiedLimit: 'Con este importe debes emitir una factura completa o ajustar el total',
  successDraft: 'Factura guardada como borrador',
  successSent: 'Factura creada y enviada',
  successSentPartial: 'Factura creada pero no se pudo enviar. Puedes enviarla desde el historial.',
  errorGeneric: 'No se pudo crear la factura',
};

const DURATION_OPTIONS: DropdownOption<number>[] = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
  { label: '120 min', value: 120 },
];

// ============================================================================
// HELPERS
// ============================================================================

const generateId = () => `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const formatCurrency = (amount: number): string =>
  amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDateForDisplay = (date: Date): string => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getClientDisplayName = (client?: InvoiceClientOption | Client | null): string => {
  const namedClient = client as InvoiceClientOption | null | undefined;
  return (
    client?.displayName ||
    namedClient?.name ||
    client?.user?.name ||
    [client?.firstName, client?.lastName].filter(Boolean).join(' ') ||
    'Paciente'
  );
};

const getClientEmail = (client?: InvoiceClientOption | Client | null): string =>
  client?.primaryEmail || client?.user?.email || client?.email || '';

const formatRecipientAddress = (client?: InvoiceClientOption | Client | null): string => {
  const location = [client?.billingPostalCode, client?.billingCity, client?.billingCountry]
    .filter(Boolean)
    .join(' ');

  return [client?.billingAddress, location].filter(Boolean).join(', ');
};

const hasCompleteBillingData = (client?: InvoiceClientOption | Client | null): boolean =>
  client?.billingDataComplete ??
  Boolean(
    client?.billingFullName &&
      client?.billingTaxId &&
      client?.billingAddress &&
      client?.billingPostalCode &&
      client?.billingCity &&
      client?.billingCountry
  );

const createDefaultLineItem = (): LineItem => ({
  id: generateId(),
  concept: STRINGS.defaultConcept,
  date: formatDateForDisplay(new Date()),
  durationMinutes: 60,
  unitPrice: '',
});

// ============================================================================
// COMPONENT
// ============================================================================

export const CreateInvoiceScreen: React.FC<CreateInvoiceScreenProps> = ({
  route,
  navigation,
}) => {
  const appAlert = useAppAlert();
  const {
    invoiceId,
    clientId: presetClientId,
    sessionId: presetSessionId,
    sessionDate: presetSessionDate,
    sessionDuration: presetSessionDuration,
    returnToClientId,
  } = route?.params || {};
  const isEditing = !!invoiceId;
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const isDesktop = width >= 768;
  const sessionContext = useMemo(
    () =>
      !isEditing && presetSessionId
        ? {
            sessionId: presetSessionId,
            clientId: presetClientId ?? null,
            sessionDate: presetSessionDate ?? null,
            sessionDuration: presetSessionDuration ?? null,
          }
        : null,
    [isEditing, presetClientId, presetSessionDate, presetSessionDuration, presetSessionId],
  );

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingConfig, setBillingConfig] = useState<FullBillingConfig | null>(null);
  const [clients, setClients] = useState<InvoiceClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [invoiceKind, setInvoiceKind] = useState<InvoiceKind>('SIMPLIFIED');
  const [lineItems, setLineItems] = useState<LineItem[]>([createDefaultLineItem()]);
  const [internalNotes, setInternalNotes] = useState('');
  const [paymentConditions, setPaymentConditions] = useState('');
  const [issueDate, setIssueDate] = useState(formatDateForDisplay(new Date()));
  const [ivaIncluded, setIvaIncluded] = useState(true);
  const [invoiceNumberPreview, setInvoiceNumberPreview] = useState('');

  // ── Derived ──
  const vatRate = useMemo(() => {
    if (!billingConfig) return 0;
    return billingConfig.applyVat ? (billingConfig.vatRate ?? 21) : 0;
  }, [billingConfig]);

  const activeTariffs = useMemo(() => {
    if (!billingConfig?.tariffs) return [];
    return billingConfig.tariffs.filter((t) => t.isActive);
  }, [billingConfig]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const specialistBillingReady = useMemo(
    () =>
      Boolean(
        billingConfig?.fiscalName?.trim() &&
          billingConfig?.fiscalNif?.trim() &&
          billingConfig?.fiscalAddress?.trim()
      ),
    [billingConfig],
  );

  const clientBillingReady = useMemo(
    () => hasCompleteBillingData(selectedClient),
    [selectedClient],
  );

  const subtotalLines = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const price = parseFloat(item.unitPrice) || 0;
      return sum + price;
    }, 0);
  }, [lineItems]);

  const ivaCalculation = useMemo(() => {
    if (vatRate === 0) {
      return {
        baseImponible: subtotalLines,
        ivaAmount: 0,
        total: subtotalLines,
        isExempt: true,
      };
    }

    if (ivaIncluded) {
      // Price entered includes IVA — extract it
      const baseImponible = Math.round((subtotalLines / (1 + vatRate / 100)) * 100) / 100;
      const ivaAmount = Math.round((subtotalLines - baseImponible) * 100) / 100;
      return {
        baseImponible,
        ivaAmount,
        total: subtotalLines,
        isExempt: false,
      };
    } else {
      // Price entered is base — add IVA on top
      const ivaAmount = Math.round((subtotalLines * (vatRate / 100)) * 100) / 100;
      const total = Math.round((subtotalLines + ivaAmount) * 100) / 100;
      return {
        baseImponible: subtotalLines,
        ivaAmount,
        total,
        isExempt: false,
      };
    }
  }, [subtotalLines, vatRate, ivaIncluded]);

  const navigateAfterSave = useCallback(() => {
    if (sessionContext && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    if (returnToClientId) {
      navigation.navigate('ClientProfile', {
        clientId: returnToClientId,
        initialTab: 'clinical',
      });
      return;
    }

    navigation.navigate('ProfessionalBilling');
  }, [navigation, returnToClientId, sessionContext]);

  const invoiceNumberForKind = useCallback(
    (kind: InvoiceKind, config: FullBillingConfig) => {
      const year = new Date().getFullYear();
      const prefix =
        kind === 'FULL'
          ? config.fullInvoicePrefix || config.invoicePrefix || 'F'
          : config.simplifiedInvoicePrefix || 'FS';
      const nextNumber =
        kind === 'FULL'
          ? config.fullInvoiceNextNumber || config.invoiceNextNumber || 1
          : config.simplifiedInvoiceNextNumber || 1;

      return `${prefix}-${year}-${String(nextNumber).padStart(3, '0')}`;
    },
    [],
  );

  const loadClientsOnly = useCallback(async () => {
    const clientsData = await getProfessionalClients();
    const mappedClients = clientsData.map((client) => ({
      ...client,
      name: getClientDisplayName(client),
      email: getClientEmail(client),
    }));
    setClients(mappedClients);
    return mappedClients;
  }, []);

  // ── Data loading ──
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [config] = await Promise.all([
        billingService.getConfig(),
        loadClientsOnly(),
      ]);

      setBillingConfig(config);

      if (!invoiceId && sessionContext?.clientId) {
        setSelectedClientId(sessionContext.clientId);
      }

      // Pre-fill from config
      if (config.paymentConditions) {
        setPaymentConditions(config.paymentConditions);
      }

      // If editing, load existing invoice data
      if (invoiceId) {
        try {
          const existing = await billingService.getInvoice(invoiceId);
          setSelectedClientId(existing.clientId);
          setIvaIncluded(existing.ivaIncluded);
          setInvoiceKind(existing.invoiceKind);
          setInvoiceNumberPreview(existing.invoiceNumber);

          // Build line item from existing data
          const dateStr = existing.sessionDate
            ? formatDateForDisplay(new Date(existing.sessionDate))
            : formatDateForDisplay(new Date());
          setLineItems([{
            id: generateId(),
            concept: existing.concept,
            date: dateStr,
            durationMinutes: existing.durationMinutes || 60,
            unitPrice: String(existing.total),
          }]);

          if (existing.internalNotes) {
            setInternalNotes(existing.internalNotes);
          }
          if (existing.createdAt) {
            setIssueDate(formatDateForDisplay(new Date(existing.createdAt)));
          }
        } catch {
          showAppAlert(appAlert, 'Error', 'No se pudo cargar la factura');
        }
      } else {
        // New invoice — build preview number
        setInvoiceKind('SIMPLIFIED');
        setInvoiceNumberPreview(invoiceNumberForKind('SIMPLIFIED', config));

        // Auto-fill first line item with default tariff
        if (config.tariffs && Array.isArray(config.tariffs)) {
          const defaultTariff = (config.tariffs as TariffItem[]).find((t) => t.isDefault && t.isActive);
          if (defaultTariff) {
            setLineItems([{
              id: generateId(),
              concept: defaultTariff.name,
              date: sessionContext?.sessionDate
                ? formatDateForDisplay(new Date(sessionContext.sessionDate))
                : formatDateForDisplay(new Date()),
              durationMinutes: sessionContext?.sessionDuration || defaultTariff.durationMinutes,
              unitPrice: defaultTariff.price > 0 ? String(defaultTariff.price) : '',
            }]);
          } else if (sessionContext) {
            setLineItems([{
              id: generateId(),
              concept: STRINGS.defaultConcept,
              date: sessionContext.sessionDate
                ? formatDateForDisplay(new Date(sessionContext.sessionDate))
                : formatDateForDisplay(new Date()),
              durationMinutes: sessionContext.sessionDuration || 60,
              unitPrice: '',
            }]);
          }
        } else if (sessionContext) {
          setLineItems([{
            id: generateId(),
            concept: STRINGS.defaultConcept,
            date: sessionContext.sessionDate
              ? formatDateForDisplay(new Date(sessionContext.sessionDate))
              : formatDateForDisplay(new Date()),
            durationMinutes: sessionContext.sessionDuration || 60,
            unitPrice: '',
          }]);
        }
      }
    } catch (error) {
      showAppAlert(appAlert, 'Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [invoiceId, invoiceNumberForKind, loadClientsOnly, sessionContext]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!billingConfig || isEditing) {
      return;
    }

    setInvoiceNumberPreview(invoiceNumberForKind(invoiceKind, billingConfig));
  }, [billingConfig, invoiceKind, invoiceNumberForKind, isEditing]);

  useFocusEffect(
    useCallback(() => {
      if (loading) {
        return undefined;
      }

      void loadClientsOnly();
      return undefined;
    }, [loadClientsOnly, loading]),
  );

  // ── Line item handlers ──
  const updateLineItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [...prev, createDefaultLineItem()]);
  }, []);

  const applyTariff = useCallback((tariff: TariffItem) => {
    setLineItems((prev) => {
      const updated = [...prev];
      // Apply to first empty line or the last line
      const targetIdx = updated.findIndex((item) => !item.unitPrice) ?? updated.length - 1;
      const idx = targetIdx >= 0 ? targetIdx : updated.length - 1;
      updated[idx] = {
        ...updated[idx],
        concept: tariff.name,
        durationMinutes: tariff.durationMinutes,
        unitPrice: tariff.price > 0 ? String(tariff.price) : '0',
      };
      return updated;
    });
  }, []);

  // ── Save / Send ──
  const handleSave = useCallback(
    async (andSend: boolean) => {
      if (!selectedClientId) {
        showAppAlert(appAlert, 'Error', STRINGS.validationNoClient);
        return;
      }

      const validLines = lineItems.filter((l) => (parseFloat(l.unitPrice) || 0) > 0);
      if (validLines.length === 0) {
        showAppAlert(appAlert, 'Error', STRINGS.validationNoAmount);
        return;
      }

      if (invoiceKind === 'FULL' && !specialistBillingReady) {
        showAppAlert(appAlert, 'Error', STRINGS.validationFullInvoiceSpecialistData);
        return;
      }

      if (invoiceKind === 'FULL' && !clientBillingReady) {
        showAppAlert(appAlert, 'Error', STRINGS.validationFullInvoiceClientData);
        return;
      }

      if (invoiceKind === 'SIMPLIFIED' && ivaCalculation.total > 400) {
        showAppAlert(appAlert, 'Error', STRINGS.validationSimplifiedLimit);
        return;
      }

      try {
        setSaving(true);

        // For now, create one invoice per line item (first line as primary)
        // or aggregate into single invoice with total
        const primaryLine = validLines[0];
        const totalAmount = validLines.reduce((sum, l) => sum + (parseFloat(l.unitPrice) || 0), 0);
        const concept = validLines.length === 1
          ? primaryLine.concept
          : validLines.map((l) => l.concept).join(' + ');

        // Parse date from DD/MM/YYYY to ISO
        let sessionDateISO: string | undefined;
        if (primaryLine.date) {
          const parts = primaryLine.date.split('/');
          if (parts.length === 3) {
            sessionDateISO = new Date(
              parseInt(parts[2], 10),
              parseInt(parts[1], 10) - 1,
              parseInt(parts[0], 10),
            ).toISOString();
          }
        }

        let invoice: Invoice;

        if (isEditing && invoiceId) {
          // Update existing draft
          const updateData: UpdateInvoiceData = {
            clientId: selectedClientId,
            invoiceKind,
            concept,
            subtotal: ivaIncluded ? ivaCalculation.baseImponible : totalAmount,
            vatRate,
            vatAmount: ivaCalculation.ivaAmount,
            sessionDate: sessionDateISO,
            durationMinutes: primaryLine.durationMinutes || undefined,
            ivaIncluded,
            baseImponible: ivaCalculation.baseImponible,
            internalNotes: internalNotes || undefined,
          };
          invoice = await billingService.updateInvoice(invoiceId, updateData);
        } else {
          // Create new invoice
          const createData: CreateInvoiceData = {
            clientId: selectedClientId,
            sessionId: sessionContext?.sessionId || undefined,
            invoiceKind,
            concept,
            subtotal: ivaIncluded ? ivaCalculation.baseImponible : totalAmount,
            vatRate,
            vatAmount: ivaCalculation.ivaAmount,
            sessionDate: sessionDateISO,
            durationMinutes: primaryLine.durationMinutes || undefined,
            ivaIncluded,
            baseImponible: ivaCalculation.baseImponible,
            internalNotes: internalNotes || undefined,
          };
          invoice = await billingService.createInvoice(createData);
        }

        if (andSend) {
          try {
            await billingService.sendInvoice(invoice.id);
          } catch {
            showAppAlert(appAlert, 'Aviso', STRINGS.successSentPartial);
            navigateAfterSave();
            return;
          }
        }

        showAppAlert(appAlert, 'Éxito', andSend ? STRINGS.successSent : STRINGS.successDraft);
        navigateAfterSave();
      } catch (error) {
        const msg = error instanceof Error ? error.message : STRINGS.errorGeneric;
        showAppAlert(appAlert, 'Error', msg);
      } finally {
        setSaving(false);
      }
    },
    [
      selectedClientId,
      lineItems,
      ivaIncluded,
      ivaCalculation,
      vatRate,
      isEditing,
      invoiceId,
      navigateAfterSave,
      sessionContext,
      internalNotes,
      invoiceKind,
      specialistBillingReady,
      clientBillingReady,
    ],
  );

  // ── Loading state ──
  const openClientBillingEditor = useCallback(() => {
    if (!selectedClientId) {
      return;
    }

    navigation.navigate('ClientProfile', {
      clientId: selectedClientId,
      initialTab: 'summary',
      focusBillingEditor: true,
    });
  }, [navigation, selectedClientId]);

  const renderInvoiceKindSection = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{STRINGS.invoiceTypeSection}</Text>
      <View style={styles.kindGrid}>
        {[
          {
            value: 'SIMPLIFIED' as InvoiceKind,
            label: STRINGS.simplifiedLabel,
            hint: STRINGS.simplifiedHint,
            icon: 'receipt-outline' as const,
          },
          {
            value: 'FULL' as InvoiceKind,
            label: STRINGS.fullLabel,
            hint: STRINGS.fullHint,
            icon: 'document-text-outline' as const,
          },
        ].map((option) => {
          const active = invoiceKind === option.value;
          return (
            <AnimatedPressable
              key={option.value}
              style={[styles.kindCard, active && styles.kindCardActive]}
              onPress={() => setInvoiceKind(option.value)}
              hoverLift={false}
              pressScale={0.98}
            >
              <View style={styles.kindHeader}>
                <Ionicons
                  name={option.icon}
                  size={18}
                  color={active ? theme.primary : theme.textMuted}
                />
                <Text style={[styles.kindTitle, active && styles.kindTitleActive]}>{option.label}</Text>
              </View>
              <Text style={styles.kindHint}>{option.hint}</Text>
            </AnimatedPressable>
          );
        })}
      </View>
      {invoiceKind === 'SIMPLIFIED' ? (
        <Text style={styles.kindNote}>{STRINGS.simplifiedLimitNote}</Text>
      ) : null}
      {invoiceKind === 'FULL' && !specialistBillingReady ? (
        <View style={styles.warningBox}>
          <Ionicons name="alert-circle-outline" size={16} color={theme.warning} />
          <Text style={styles.warningText}>{STRINGS.specialistBillingMissing}</Text>
        </View>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // ── Render helpers ──
  const renderHeader = () => (
    <View style={styles.header}>
      {/* Centered title — absolute so it spans full width */}
      <View style={styles.headerTitleWrapper} pointerEvents="none">
        <Text style={styles.headerTitle}>
          {isEditing ? STRINGS.titleEdit : STRINGS.titleNew}
        </Text>
      </View>
      <View style={styles.headerLeft}>
        <AnimatedPressable
          style={styles.backButton}
          onPress={() => {
            if (sessionContext && navigation.canGoBack()) {
              navigation.goBack();
              return;
            }
            if (returnToClientId) {
              navigation.navigate('ClientProfile', {
                clientId: returnToClientId,
                initialTab: 'clinical',
              });
              return;
            }
            navigation.navigate('ProfessionalBilling');
          }}
          hoverLift={false}
          pressScale={0.98}
        >
          <Ionicons name="arrow-back" size={20} color={theme.primary} />
          <Text style={styles.backLabel}>
            {sessionContext || returnToClientId ? STRINGS.backToPatientLabel : STRINGS.backLabel}
          </Text>
        </AnimatedPressable>
      </View>
      <View style={styles.headerRight}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{STRINGS.statusDraft}</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.headerSecondaryAction}>
            <Button
              variant="outline"
              size="small"
              onPress={() => handleSave(false)}
              disabled={saving}
              fullWidth
            >
              {STRINGS.saveDraft}
            </Button>
          </View>
          <View style={styles.headerPrimaryAction}>
            <Button
              variant="primary"
              size="small"
              onPress={() => handleSave(true)}
              disabled={saving}
              loading={saving}
              icon={<Ionicons name="send" size={14} color={theme.textOnPrimary} />}
              fullWidth
            >
              {STRINGS.confirmSend}
            </Button>
          </View>
        </View>
      </View>
    </View>
  );

  const renderClientSection = () => {
    const clientOptions: DropdownOption<string>[] = clients.map((c) => ({
      label: getClientDisplayName(c),
      value: c.id,
      subtitle: getClientEmail(c),
    }));
    const billingStatusLabel = clientBillingReady ? 'Datos completos' : 'Pendientes';
    const billingHeadline = clientBillingReady
      ? 'Paciente listo para factura completa'
      : 'Faltan datos fiscales del paciente';
    const billingHint = clientBillingReady
      ? 'Los datos fiscales ya están completos y esta factura puede emitirse como factura completa.'
      : 'Completa los datos fiscales del destinatario para poder emitir esta factura como factura completa.';
    const billingActionLabel = clientBillingReady
      ? 'Editar datos fiscales'
      : STRINGS.completePatientBilling;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{STRINGS.clientSection}</Text>
        {sessionContext ? (
          <View style={styles.selectedClientInfo}>
            <Text style={styles.selectedClientName}>
              {selectedClient?.name || 'Paciente de la sesión'}
            </Text>
            <Text style={styles.selectedClientEmail}>
              {selectedClient?.email || STRINGS.clientLockedHint}
            </Text>
            <Text style={styles.clientLockedHint}>{STRINGS.clientLockedHint}</Text>
          </View>
        ) : (
          <>
            <View style={{ zIndex: 1000 }}>
              <SimpleDropdown
                options={clientOptions}
                value={selectedClientId}
                onSelect={setSelectedClientId}
                placeholder={STRINGS.clientPlaceholder}
                maxHeight={250}
              />
            </View>
            {selectedClient ? (
              <View style={styles.selectedClientInfo}>
                <Text style={styles.selectedClientName}>{selectedClient.name}</Text>
                <Text style={styles.selectedClientEmail}>{selectedClient.email}</Text>
              </View>
            ) : null}
          </>
        )}
        {invoiceKind === 'FULL' && selectedClient ? (
          <View
            style={[
              styles.billingInfoPanel,
              clientBillingReady ? styles.billingInfoPanelReady : styles.billingInfoPanelMissing,
            ]}
          >
            <View style={styles.billingStatusRow}>
              <View
                style={[
                  styles.billingStatusBadge,
                  clientBillingReady
                    ? styles.billingStatusBadgeReady
                    : styles.billingStatusBadgeMissing,
                ]}
              >
                <Ionicons
                  name={clientBillingReady ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={clientBillingReady ? theme.success : theme.warning}
                />
                <Text
                  style={[
                    styles.billingStatusBadgeText,
                    { color: clientBillingReady ? theme.success : theme.warning },
                  ]}
                >
                  {billingStatusLabel}
                </Text>
              </View>
            </View>
            <View style={styles.billingInfoHeader}>
              <View style={styles.billingInfoCopy}>
                <Text style={styles.billingInfoTitle}>{billingHeadline}</Text>
                <Text style={styles.billingInfoSubtitle}>{billingHint}</Text>
              </View>
              <Button
                variant={clientBillingReady ? 'secondary' : 'outline'}
                size="small"
                onPress={openClientBillingEditor}
                icon={
                  <Ionicons
                    name={clientBillingReady ? 'create-outline' : 'add-circle-outline'}
                    size={14}
                    color={clientBillingReady ? theme.secondaryDark : theme.primary}
                  />
                }
              >
                {billingActionLabel}
              </Button>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const renderLineItems = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{STRINGS.conceptSection}</Text>

      {/* Table header */}
      <View style={styles.lineTableHeader}>
        <Text style={[styles.lineHeaderCell, styles.lineConceptCol]}>{STRINGS.conceptHeader}</Text>
        <Text style={[styles.lineHeaderCell, styles.lineDateCol]}>{STRINGS.dateHeader}</Text>
        <Text style={[styles.lineHeaderCell, styles.lineDurationCol]}>{STRINGS.durationHeader}</Text>
        <Text style={[styles.lineHeaderCell, styles.linePriceCol]}>{STRINGS.unitPriceHeader}</Text>
        <Text style={[styles.lineHeaderCell, styles.lineTotalCol]}>{STRINGS.totalHeader}</Text>
        <View style={styles.lineDeleteCol} />
      </View>

      {/* Line items */}
      {lineItems.map((item, index) => (
        <View
          key={item.id}
          style={[
            styles.lineRow,
            index < lineItems.length - 1 && styles.lineRowBorder,
          ]}
        >
          {/* Concept */}
          <View style={styles.lineConceptCol}>
            <TextInput
              style={styles.lineInput}
              value={item.concept}
              onChangeText={(v) => updateLineItem(item.id, 'concept', v)}
              placeholder={STRINGS.defaultConcept}
              placeholderTextColor={theme.textMuted}
            />
          </View>

          {/* Date */}
          <View style={styles.lineDateCol}>
            <TextInput
              style={styles.lineInput}
              value={item.date}
              onChangeText={(v) => updateLineItem(item.id, 'date', v)}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          {/* Duration */}
          <View style={[styles.lineDurationCol, { zIndex: 999, overflow: 'visible' as const }]}>
            <SimpleDropdown
              options={DURATION_OPTIONS}
              value={item.durationMinutes}
              onSelect={(v) => updateLineItem(item.id, 'durationMinutes', v)}
              placeholder="Min"
            />
          </View>

          {/* Unit Price */}
          <View style={styles.linePriceCol}>
            <TextInput
              style={styles.lineInput}
              value={item.unitPrice}
              onChangeText={(v) => updateLineItem(item.id, 'unitPrice', v)}
              placeholder="0,00"
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Total (read-only) */}
          <View style={styles.lineTotalCol}>
            <Text style={styles.lineTotalText}>
              €{formatCurrency(parseFloat(item.unitPrice) || 0)}
            </Text>
          </View>

          {/* Delete */}
          <View style={styles.lineDeleteCol}>
            {lineItems.length > 1 && (
              <AnimatedPressable onPress={() => removeLineItem(item.id)} hoverLift={false} pressScale={0.96}>
                <Ionicons name="trash-outline" size={18} color={theme.status.cancelled.text} />
              </AnimatedPressable>
            )}
          </View>
        </View>
      ))}

      <AnimatedPressable style={styles.addLineBtn} onPress={addLineItem} hoverLift={false} pressScale={0.98}>
        <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
        <Text style={styles.addLineBtnText}>{STRINGS.addLine}</Text>
      </AnimatedPressable>
    </View>
  );

  const renderNotesSection = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{STRINGS.additionalSection}</Text>

      <Text style={styles.fieldLabel}>{STRINGS.internalNotes}</Text>
      <Text style={styles.fieldHint}>{STRINGS.internalNotesHint}</Text>
      <TextInput
        style={[styles.textArea, styles.textAreaSmall]}
        value={internalNotes}
        onChangeText={setInternalNotes}
        multiline
        textAlignVertical="top"
        placeholderTextColor={theme.textMuted}
      />

      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>{STRINGS.paymentConditions}</Text>
      <TextInput
        style={[styles.textArea, styles.textAreaSmall]}
        value={paymentConditions}
        onChangeText={setPaymentConditions}
        multiline
        textAlignVertical="top"
        placeholderTextColor={theme.textMuted}
      />
    </View>
  );

  const renderSummaryCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{STRINGS.summaryTitle}</Text>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{STRINGS.invoiceTypeSection}</Text>
        <Text style={styles.summaryValue}>
          {invoiceKind === 'FULL' ? STRINGS.fullLabel : STRINGS.simplifiedLabel}
        </Text>
      </View>

      {/* Invoice number */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{STRINGS.invoiceNumber}</Text>
        <Text style={styles.summaryValue}>{invoiceNumberPreview}</Text>
      </View>

      {/* Issue date */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{STRINGS.issueDate}</Text>
        <TextInput
          style={styles.summaryDateInput}
          value={issueDate}
          onChangeText={setIssueDate}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={theme.textMuted}
        />
      </View>

      <View style={styles.summaryDivider} />

      {/* Subtotal */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{STRINGS.subtotalLines}</Text>
        <Text style={styles.summaryValue}>€{formatCurrency(subtotalLines)}</Text>
      </View>

      {/* IVA section */}
      {ivaCalculation.isExempt ? (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{STRINGS.exemption}</Text>
            <Text style={styles.summaryValueMuted}>
              {billingConfig?.vatExemptReason || STRINGS.exemptionArticle}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>{STRINGS.taxBase}</Text>
            <Text style={styles.summaryValueBold}>€{formatCurrency(ivaCalculation.baseImponible)}</Text>
          </View>
        </>
      ) : (
        <>
          {/* IVA included toggle */}
          <View style={styles.ivaToggleRow}>
            <Text style={styles.summaryLabel}>{STRINGS.ivaIncluded}</Text>
            <AnimatedPressable
              style={ivaIncluded ? [styles.toggleTrack, styles.toggleTrackActive] : styles.toggleTrack}
              onPress={() => setIvaIncluded(!ivaIncluded)}
              hoverLift={false}
              pressScale={0.97}
            >
              <View
                style={ivaIncluded ? [styles.toggleThumb, styles.toggleThumbActive] : styles.toggleThumb}
              />
            </AnimatedPressable>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>{STRINGS.taxBase}</Text>
            <Text style={styles.summaryValueBold}>
              €{formatCurrency(ivaCalculation.baseImponible)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {STRINGS.ivaLabel} ({vatRate}%)
            </Text>
            <Text style={styles.summaryValue}>
              €{formatCurrency(ivaCalculation.ivaAmount)}
            </Text>
          </View>
        </>
      )}

      <View style={styles.summaryDivider} />

      {/* Total */}
      <View style={styles.summaryTotalRow}>
        <Text style={styles.summaryTotalLabel}>{STRINGS.totalInvoice}</Text>
        <Text style={styles.summaryTotalValue}>
          €{formatCurrency(ivaCalculation.total)}
        </Text>
      </View>

      {/* Config note */}
      <Text style={styles.ivaNote}>
        {STRINGS.ivaConfigNote} ({vatRate}%)
      </Text>
      {invoiceKind === 'SIMPLIFIED' ? (
        <Text style={styles.ivaNote}>{STRINGS.simplifiedLimitNote}</Text>
      ) : null}
      <AnimatedPressable
        onPress={() => navigation.navigate('ProfessionalBilling')}
        hoverLift={false}
        pressScale={0.98}
      >
        <Text style={styles.changeConfigLink}>{STRINGS.changeConfig}</Text>
      </AnimatedPressable>
    </View>
  );

  const renderTariffCard = () => {
    if (activeTariffs.length === 0) return null;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{STRINGS.tariffSection}</Text>
        {activeTariffs.map((tariff) => (
          <AnimatedPressable
            key={tariff.id}
            style={styles.tariffRow}
            onPress={() => applyTariff(tariff)}
            hoverLift={false}
            pressScale={0.98}
          >
            <View style={styles.tariffInfo}>
              <Text style={styles.tariffName}>{tariff.name}</Text>
              <Text style={styles.tariffDetails}>
                {tariff.price > 0 ? `€${formatCurrency(tariff.price)}` : 'Gratis'} — {tariff.durationMinutes} min
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={theme.textMuted} />
          </AnimatedPressable>
        ))}
      </View>
    );
  };

  // ── Main render ──
  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {isDesktop ? (
          <View style={styles.twoColumnLayout}>
            {/* Left column — main content */}
            <View style={styles.leftColumn}>
              <View style={{ zIndex: 1000, overflow: 'visible' as const }}>
                {renderInvoiceKindSection()}
              </View>
              <View style={{ zIndex: 999, overflow: 'visible' as const }}>
                {renderClientSection()}
              </View>
              <View style={{ zIndex: 998, overflow: 'visible' as const }}>
                {renderLineItems()}
              </View>
              {renderNotesSection()}
            </View>

            {/* Right column — summary */}
            <View style={styles.rightColumn}>
              {renderSummaryCard()}
              {renderTariffCard()}
            </View>
          </View>
        ) : (
          <View style={styles.singleColumnLayout}>
            <View style={{ zIndex: 1000, overflow: 'visible' as const }}>
              {renderInvoiceKindSection()}
            </View>
            <View style={{ zIndex: 999, overflow: 'visible' as const }}>
              {renderClientSection()}
            </View>
            {renderSummaryCard()}
            {renderTariffCard()}
            <View style={{ zIndex: 998, overflow: 'visible' as const }}>
              {renderLineItems()}
            </View>
            {renderNotesSection()}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: theme.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backLabel: {
    fontSize: typography.fontSizes.sm,
    color: theme.primary,
    fontFamily: theme.fontSansMedium,
  },
  headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    color: theme.textPrimary,
    fontFamily: theme.fontSansBold,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    backgroundColor: theme.primaryAlpha12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: typography.fontSizes.xs,
    color: theme.primary,
    fontFamily: theme.fontSansMedium,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerSecondaryAction: {
    minWidth: 154,
  },
  headerPrimaryAction: {
    minWidth: 188,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  // Layout
  twoColumnLayout: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  leftColumn: {
    flex: 65,
    gap: spacing.md,
  },
  rightColumn: {
    flex: 35,
    gap: spacing.md,
  },
  singleColumnLayout: {
    gap: spacing.md,
  },

  // Card
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.border,
    ...shadows.sm,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } as Record<string, string>)
      : {}),
  },
  cardTitle: {
    fontSize: typography.fontSizes.md,
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
    marginBottom: spacing.md,
  },

  // Invoice kind
  kindGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  kindCard: {
    flex: 1,
    minWidth: 220,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  kindCardActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryAlpha12,
  },
  kindHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  kindTitle: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
  },
  kindTitleActive: {
    color: theme.primary,
  },
  kindHint: {
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    fontFamily: theme.fontSans,
  },
  kindNote: {
    marginTop: spacing.sm,
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    fontFamily: theme.fontSans,
  },
  warningBox: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.warning + '55',
    backgroundColor: theme.warning + '10',
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: theme.textSecondary,
    fontFamily: theme.fontSansMedium,
  },

  // Client section
  selectedClientInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  selectedClientName: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
  },
  selectedClientEmail: {
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    marginTop: 2,
  },
  clientLockedHint: {
    marginTop: spacing.xs,
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    fontFamily: theme.fontSansSemiBold,
  },
  billingInfoPanel: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: theme.bgMuted,
  },
  billingInfoPanelReady: {
    backgroundColor: theme.successBg,
    borderColor: theme.success + '35',
  },
  billingInfoPanelMissing: {
    backgroundColor: theme.warningBg,
    borderColor: theme.warning + '35',
  },
  billingStatusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  billingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
  },
  billingStatusBadgeReady: {
    backgroundColor: theme.successLight,
    borderColor: theme.success + '33',
  },
  billingStatusBadgeMissing: {
    backgroundColor: theme.bgCard,
    borderColor: theme.warning + '33',
  },
  billingStatusBadgeText: {
    fontSize: typography.fontSizes.xs,
    fontFamily: theme.fontSansSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  billingInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  billingInfoCopy: {
    flex: 1,
    minWidth: 220,
    gap: 4,
  },
  billingInfoTitle: {
    fontSize: typography.fontSizes.md,
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
  },
  billingInfoSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
    lineHeight: 22,
  },
  billingSummaryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  billingSummaryItem: {
    minWidth: 190,
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: theme.bgCard,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 4,
  },
  billingSummaryItemFull: {
    minWidth: '100%',
    flexBasis: '100%',
  },
  billingSummaryLabel: {
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    fontFamily: theme.fontSansSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  billingSummaryValue: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
  },
  billingSummaryMuted: {
    fontSize: typography.fontSizes.sm,
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
    lineHeight: 21,
  },

  // Line items table
  lineTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginBottom: spacing.sm,
  },
  lineHeaderCell: {
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    fontFamily: theme.fontSansSemiBold,
    textTransform: 'uppercase',
  },
  lineConceptCol: {
    flex: 3,
    paddingRight: spacing.sm,
  },
  lineDateCol: {
    flex: 2,
    paddingRight: spacing.sm,
  },
  lineDurationCol: {
    flex: 1.5,
    paddingRight: spacing.sm,
  },
  linePriceCol: {
    flex: 1.5,
    paddingRight: spacing.sm,
  },
  lineTotalCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  lineDeleteCol: {
    width: 30,
    alignItems: 'center',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  lineRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  lineInput: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lineTotalText: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
  },
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  addLineBtnText: {
    fontSize: typography.fontSizes.sm,
    color: theme.primary,
    fontFamily: theme.fontSansMedium,
  },

  // Notes section
  fieldLabel: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    fontFamily: theme.fontSansMedium,
    marginBottom: spacing.xs,
  },
  fieldHint: {
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    marginBottom: spacing.xs,
  },
  textArea: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  textAreaSmall: {
    minHeight: 60,
  },

  // Summary card
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.fontSizes.sm,
    color: theme.textMuted,
    fontFamily: theme.fontSans,
  },
  summaryValue: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    fontFamily: theme.fontSansMedium,
  },
  summaryValueMuted: {
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    fontStyle: 'italic',
  },
  summaryLabelBold: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    fontFamily: theme.fontSansSemiBold,
  },
  summaryValueBold: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    fontFamily: theme.fontSansBold,
  },
  summaryDateInput: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: 'right',
    minWidth: 110,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: spacing.md,
  },
  ivaToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: theme.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.bgCard,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryTotalLabel: {
    fontSize: typography.fontSizes.lg,
    color: theme.textPrimary,
    fontFamily: theme.fontSansBold,
  },
  summaryTotalValue: {
    fontSize: typography.fontSizes.xl,
    color: theme.primary,
    fontFamily: theme.fontSansBold,
  },
  ivaNote: {
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    marginTop: spacing.sm,
  },
  changeConfigLink: {
    fontSize: typography.fontSizes.xs,
    color: theme.primary,
    fontFamily: theme.fontSansMedium,
    marginTop: spacing.xs,
  },

  // Tariff card
  tariffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tariffInfo: {
    flex: 1,
  },
  tariffName: {
    fontSize: typography.fontSizes.sm,
    color: theme.textPrimary,
    fontFamily: theme.fontSansMedium,
  },
  tariffDetails: {
    fontSize: typography.fontSizes.xs,
    color: theme.textMuted,
    fontFamily: theme.fontSans,
    marginTop: 2,
  },
  });
}

export default CreateInvoiceScreen;
