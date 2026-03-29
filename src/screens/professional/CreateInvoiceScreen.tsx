import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../constants/types';
import {
  heraLanding,
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from '../../constants/colors';
import { SimpleDropdown, DropdownOption } from '../../components/common/SimpleDropdown';
import {
  billingService,
  FullBillingConfig,
  TariffItem,
  CreateInvoiceData,
  UpdateInvoiceData,
  Invoice,
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

// ============================================================================
// STRINGS
// ============================================================================

const STRINGS = {
  titleNew: 'Nueva factura',
  titleEdit: 'Editar borrador',
  backLabel: 'Facturación',
  statusDraft: 'Borrador',
  statusSent: 'Enviada',
  preview: 'Vista previa',
  saveDraft: 'Guardar borrador',
  confirmSend: 'Confirmar y enviar',
  clientSection: 'Cliente',
  clientPlaceholder: 'Seleccionar cliente...',
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
  invoiceNumber: 'N.º Factura',
  issueDate: 'Fecha emisión',
  subtotalLines: 'Subtotal líneas',
  ivaIncluded: 'IVA incluido en el precio',
  exemption: 'Exención',
  exemptionArticle: 'Art. 20 Ley 37/1992',
  taxBase: 'BASE IMPONIBLE',
  ivaLabel: 'IVA',
  totalInvoice: 'TOTAL FACTURA',
  ivaConfigNote: 'IVA configurado en Datos fiscales',
  changeConfig: 'Cambiar configuración →',
  tariffSection: 'Aplicar tarifa',
  validationNoClient: 'Selecciona un cliente',
  validationNoAmount: 'Al menos una línea debe tener un importe mayor que 0',
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
  const { invoiceId } = route?.params || {};
  const isEditing = !!invoiceId;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingConfig, setBillingConfig] = useState<FullBillingConfig | null>(null);
  const [clients, setClients] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
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

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId],
  );

  // ── Data loading ──
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [config, clientsData] = await Promise.all([
        billingService.getConfig(),
        getProfessionalClients(),
      ]);

      setBillingConfig(config);
      const mappedClients = clientsData.map((c: Client) => ({
        id: c.id,
        name: c.user.name,
        email: c.user.email,
      }));
      setClients(mappedClients);

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
          Alert.alert('Error', 'No se pudo cargar la factura');
        }
      } else {
        // New invoice — build preview number
        const prefix = config.invoicePrefix || 'F';
        const year = new Date().getFullYear();
        const nextNum = String(config.invoiceNextNumber || 1).padStart(3, '0');
        setInvoiceNumberPreview(`${prefix}-${year}-${nextNum}`);

        // Auto-fill first line item with default tariff
        if (config.tariffs && Array.isArray(config.tariffs)) {
          const defaultTariff = (config.tariffs as TariffItem[]).find((t) => t.isDefault && t.isActive);
          if (defaultTariff) {
            setLineItems([{
              id: generateId(),
              concept: defaultTariff.name,
              date: formatDateForDisplay(new Date()),
              durationMinutes: defaultTariff.durationMinutes,
              unitPrice: defaultTariff.price > 0 ? String(defaultTariff.price) : '',
            }]);
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

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
        Alert.alert('Error', STRINGS.validationNoClient);
        return;
      }

      const validLines = lineItems.filter((l) => (parseFloat(l.unitPrice) || 0) > 0);
      if (validLines.length === 0) {
        Alert.alert('Error', STRINGS.validationNoAmount);
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
            Alert.alert('Aviso', STRINGS.successSentPartial);
            navigation.navigate('ProfessionalBilling');
            return;
          }
        }

        Alert.alert('Éxito', andSend ? STRINGS.successSent : STRINGS.successDraft);
        navigation.navigate('ProfessionalBilling');
      } catch (error) {
        const msg = error instanceof Error ? error.message : STRINGS.errorGeneric;
        Alert.alert('Error', msg);
      } finally {
        setSaving(false);
      }
    },
    [selectedClientId, lineItems, ivaIncluded, ivaCalculation, vatRate, navigation, isEditing, invoiceId],
  );

  // ── Loading state ──
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={heraLanding.primary} />
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('ProfessionalBilling')}
        >
          <Ionicons name="arrow-back" size={20} color={heraLanding.primary} />
          <Text style={styles.backLabel}>{STRINGS.backLabel}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.headerRight}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{STRINGS.statusDraft}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.draftBtn}
            onPress={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={heraLanding.primary} />
            ) : (
              <Text style={styles.draftBtnText}>{STRINGS.saveDraft}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={() => handleSave(true)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.neutral.white} />
            ) : (
              <View style={styles.sendBtnContent}>
                <Ionicons name="send" size={14} color={colors.neutral.white} />
                <Text style={styles.sendBtnText}>{STRINGS.confirmSend}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderClientSection = () => {
    const clientOptions: DropdownOption<string>[] = clients.map((c) => ({
      label: c.name,
      value: c.id,
      subtitle: c.email,
    }));

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{STRINGS.clientSection}</Text>
        <View style={{ zIndex: 1000 }}>
          <SimpleDropdown
            options={clientOptions}
            value={selectedClientId}
            onSelect={setSelectedClientId}
            placeholder={STRINGS.clientPlaceholder}
            maxHeight={250}
          />
        </View>
        {selectedClient && (
          <View style={styles.selectedClientInfo}>
            <Text style={styles.selectedClientName}>{selectedClient.name}</Text>
            <Text style={styles.selectedClientEmail}>{selectedClient.email}</Text>
          </View>
        )}
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
              placeholderTextColor={heraLanding.textMuted}
            />
          </View>

          {/* Date */}
          <View style={styles.lineDateCol}>
            <TextInput
              style={styles.lineInput}
              value={item.date}
              onChangeText={(v) => updateLineItem(item.id, 'date', v)}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={heraLanding.textMuted}
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
              placeholderTextColor={heraLanding.textMuted}
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
              <TouchableOpacity onPress={() => removeLineItem(item.id)}>
                <Ionicons name="trash-outline" size={18} color={heraLanding.status.cancelled.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addLineBtn} onPress={addLineItem}>
        <Ionicons name="add-circle-outline" size={18} color={heraLanding.primary} />
        <Text style={styles.addLineBtnText}>{STRINGS.addLine}</Text>
      </TouchableOpacity>
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
        placeholderTextColor={heraLanding.textMuted}
      />

      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>{STRINGS.paymentConditions}</Text>
      <TextInput
        style={[styles.textArea, styles.textAreaSmall]}
        value={paymentConditions}
        onChangeText={setPaymentConditions}
        multiline
        textAlignVertical="top"
        placeholderTextColor={heraLanding.textMuted}
      />
    </View>
  );

  const renderSummaryCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{STRINGS.summaryTitle}</Text>

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
          placeholderTextColor={heraLanding.textMuted}
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
            <TouchableOpacity
              style={[
                styles.toggleTrack,
                ivaIncluded && styles.toggleTrackActive,
              ]}
              onPress={() => setIvaIncluded(!ivaIncluded)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.toggleThumb,
                  ivaIncluded && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
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
      <TouchableOpacity
        onPress={() => navigation.navigate('ProfessionalBilling')}
      >
        <Text style={styles.changeConfigLink}>{STRINGS.changeConfig}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTariffCard = () => {
    if (activeTariffs.length === 0) return null;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{STRINGS.tariffSection}</Text>
        {activeTariffs.map((tariff) => (
          <TouchableOpacity
            key={tariff.id}
            style={styles.tariffRow}
            onPress={() => applyTariff(tariff)}
            activeOpacity={0.7}
          >
            <View style={styles.tariffInfo}>
              <Text style={styles.tariffName}>{tariff.name}</Text>
              <Text style={styles.tariffDetails}>
                {tariff.price > 0 ? `€${formatCurrency(tariff.price)}` : 'Gratis'} — {tariff.durationMinutes} min
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={heraLanding.textMuted} />
          </TouchableOpacity>
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
                {renderClientSection()}
              </View>
              <View style={{ zIndex: 999, overflow: 'visible' as const }}>
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
              {renderClientSection()}
            </View>
            {renderSummaryCard()}
            {renderTariffCard()}
            <View style={{ zIndex: 999, overflow: 'visible' as const }}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.backgroundMuted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: heraLanding.backgroundMuted,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
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
    color: heraLanding.primary,
    fontWeight: typography.fontWeights.medium,
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
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textPrimary,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    backgroundColor: heraLanding.backgroundMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusBadgeText: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  draftBtn: {
    borderWidth: 1,
    borderColor: heraLanding.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  draftBtnText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  sendBtn: {
    backgroundColor: heraLanding.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sendBtnText: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.white,
    fontWeight: typography.fontWeights.semibold,
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
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } as Record<string, string>)
      : {}),
  },
  cardTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
    marginBottom: spacing.md,
  },

  // Client section
  selectedClientInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: heraLanding.border,
  },
  selectedClientName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
  },
  selectedClientEmail: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    marginTop: 2,
  },

  // Line items table
  lineTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
    marginBottom: spacing.sm,
  },
  lineHeaderCell: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textMuted,
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
    borderBottomColor: heraLanding.border,
  },
  lineInput: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textPrimary,
    backgroundColor: heraLanding.backgroundMuted,
    borderWidth: 1,
    borderColor: heraLanding.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lineTotalText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: heraLanding.textPrimary,
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
    color: heraLanding.primary,
    fontWeight: typography.fontWeights.medium,
  },

  // Notes section
  fieldLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: heraLanding.textPrimary,
    marginBottom: spacing.xs,
  },
  fieldHint: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    marginBottom: spacing.xs,
  },
  textArea: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textPrimary,
    backgroundColor: heraLanding.backgroundMuted,
    borderWidth: 1,
    borderColor: heraLanding.border,
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
    color: heraLanding.textMuted,
  },
  summaryValue: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textPrimary,
    fontWeight: typography.fontWeights.medium,
  },
  summaryValueMuted: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    fontStyle: 'italic',
  },
  summaryLabelBold: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textPrimary,
    fontWeight: typography.fontWeights.semibold,
  },
  summaryValueBold: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textPrimary,
    fontWeight: typography.fontWeights.bold,
  },
  summaryDateInput: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textPrimary,
    backgroundColor: heraLanding.backgroundMuted,
    borderWidth: 1,
    borderColor: heraLanding.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: 'right',
    minWidth: 110,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: heraLanding.border,
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
    backgroundColor: heraLanding.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: heraLanding.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.neutral.white,
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
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.textPrimary,
  },
  summaryTotalValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: heraLanding.primary,
  },
  ivaNote: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    marginTop: spacing.sm,
  },
  changeConfigLink: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.primary,
    fontWeight: typography.fontWeights.medium,
    marginTop: spacing.xs,
  },

  // Tariff card
  tariffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  tariffInfo: {
    flex: 1,
  },
  tariffName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: heraLanding.textPrimary,
  },
  tariffDetails: {
    fontSize: typography.fontSizes.xs,
    color: heraLanding.textMuted,
    marginTop: 2,
  },
});

export default CreateInvoiceScreen;
