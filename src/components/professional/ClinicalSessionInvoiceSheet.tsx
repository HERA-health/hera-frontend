import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, spacing, typography } from '../../constants/colors';
import type { Session } from '../../services/professionalService';
import type { AttachableInvoiceSummary } from '../../services/billingService';

interface ClinicalSessionInvoiceSheetProps {
  visible: boolean;
  session: Session | null;
  invoices: AttachableInvoiceSummary[];
  loading: boolean;
  attaching: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onAttachInvoice: (invoiceId: string, sendToPatient: boolean) => void;
}

const formatSessionDate = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Sin fecha';

const formatAmount = (amount: number) =>
  amount.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

const getStatusCopy = (status: AttachableInvoiceSummary['status']) => {
  switch (status) {
    case 'PAID':
      return { label: 'Pagada', tone: 'success' as const };
    case 'SENT':
      return { label: 'Enviada', tone: 'secondary' as const };
    default:
      return { label: 'Borrador', tone: 'primary' as const };
  }
};

export function ClinicalSessionInvoiceSheet({
  visible,
  session,
  invoices,
  loading,
  attaching,
  onClose,
  onCreateNew,
  onAttachInvoice,
}: ClinicalSessionInvoiceSheetProps) {
  const { theme } = useTheme();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelectedInvoiceId(null);
      return;
    }

    setSelectedInvoiceId((current) => current ?? invoices[0]?.id ?? null);
  }, [invoices, visible]);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId]
  );

  const showSendAction = selectedInvoice?.status === 'DRAFT';

  if (!session) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetWrap}>
          <Card variant="default" padding="large" style={styles.sheetCard}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <View style={[styles.eyebrowPill, { backgroundColor: theme.primaryAlpha12 }]}>
                  <Ionicons name="receipt-outline" size={14} color={theme.primary} />
                  <Text style={[styles.eyebrowText, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>
                    Facturación de sesión
                  </Text>
                </View>
                <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplayBold }]}>
                  Elige cómo quieres facturar esta sesión
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {formatSessionDate(session.date)} · {session.duration} min
                </Text>
              </View>

              <Pressable onPress={onClose} style={[styles.closeButton, { borderColor: theme.border }]}>
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.pathGrid}>
              <View style={[styles.pathCard, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
                <View style={styles.pathHeader}>
                  <Ionicons name="sparkles-outline" size={18} color={theme.primary} />
                  <Text style={[styles.pathTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                    Crear una nueva
                  </Text>
                </View>
                <Text style={[styles.pathBody, { color: theme.textSecondary }]}>
                  Abre el editor de facturas con esta sesión ya preparada, para revisar importe, concepto y envío.
                </Text>
                <Button variant="primary" size="small" onPress={onCreateNew}>
                  Crear desde la sesión
                </Button>
              </View>

              <View style={[styles.pathCard, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
                <View style={styles.pathHeader}>
                  <Ionicons name="albums-outline" size={18} color={theme.secondary} />
                  <Text style={[styles.pathTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                    Usar una existente
                  </Text>
                </View>
                <Text style={[styles.pathBody, { color: theme.textSecondary }]}>
                  Si ya habías preparado una factura para este paciente, puedes vincularla aquí sin duplicar trabajo.
                </Text>
              </View>
            </View>

            <View style={styles.listSection}>
              <View style={styles.listHeader}>
                <Text style={[styles.listTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                  Facturas disponibles
                </Text>
                <Text style={[styles.listCaption, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>
                  {loading ? 'Cargando...' : `${invoices.length} disponibles`}
                </Text>
              </View>

              {loading ? (
                <View style={[styles.emptyWrap, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}>
                  <Ionicons name="hourglass-outline" size={20} color={theme.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    Estamos reuniendo las facturas de este paciente.
                  </Text>
                </View>
              ) : invoices.length === 0 ? (
                <View style={[styles.emptyWrap, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}>
                  <Ionicons name="receipt-outline" size={20} color={theme.textMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>
                    No hay facturas disponibles
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    Crea una nueva desde esta sesión y quedará vinculada desde el primer momento.
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.invoiceList} contentContainerStyle={styles.invoiceListContent}>
                  {invoices.map((invoice) => {
                    const selected = invoice.id === selectedInvoiceId;
                    const statusCopy = getStatusCopy(invoice.status);
                    const statusColor =
                      statusCopy.tone === 'success'
                        ? theme.success
                        : statusCopy.tone === 'secondary'
                          ? theme.secondary
                          : theme.primary;

                    return (
                      <Pressable
                        key={invoice.id}
                        onPress={() => setSelectedInvoiceId(invoice.id)}
                        style={[
                          styles.invoiceRow,
                          {
                            borderColor: selected ? theme.primary : theme.border,
                            backgroundColor: selected ? theme.primaryAlpha12 : theme.bgCard,
                          },
                        ]}
                      >
                        <View style={styles.invoiceMain}>
                          <View style={styles.invoiceHeading}>
                            <Text
                              style={[
                                styles.invoiceNumber,
                                { color: theme.textPrimary, fontFamily: theme.fontDisplayBold },
                              ]}
                            >
                              {invoice.invoiceNumber}
                            </Text>
                            <View
                              style={[
                                styles.statusBadge,
                                { backgroundColor: `${statusColor}16`, borderColor: `${statusColor}28` },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  { color: statusColor, fontFamily: theme.fontSansSemiBold },
                                ]}
                              >
                                {statusCopy.label}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.invoiceConcept, { color: theme.textSecondary }]}>
                            {invoice.concept}
                          </Text>
                          <View style={styles.invoiceMeta}>
                            <Text style={[styles.invoiceMetaText, { color: theme.textMuted }]}>
                              Emitida {formatSessionDate(invoice.createdAt)}
                            </Text>
                            <Text style={[styles.invoiceMetaText, { color: theme.textMuted }]}>
                              {formatAmount(invoice.total)}
                            </Text>
                          </View>
                        </View>

                        <Ionicons
                          name={selected ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={selected ? theme.primary : theme.textMuted}
                        />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {selectedInvoice ? (
              <View style={styles.footerActions}>
                <Button
                  variant="outline"
                  size="small"
                  onPress={() => onAttachInvoice(selectedInvoice.id, false)}
                  disabled={attaching}
                >
                  Enlazar factura
                </Button>
                {showSendAction ? (
                  <Button
                    variant="primary"
                    size="small"
                    onPress={() => onAttachInvoice(selectedInvoice.id, true)}
                    loading={attaching}
                  >
                    Enlazar y enviar
                  </Button>
                ) : null}
              </View>
            ) : null}
          </Card>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 16, 17, 0.48)',
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },
  sheetCard: {
    gap: spacing.lg,
    borderRadius: borderRadius.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
  eyebrowText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  title: {
    fontSize: typography.fontSizes.xxxl,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  pathCard: {
    flex: 1,
    minWidth: 260,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pathTitle: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
  },
  pathBody: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  listSection: {
    gap: spacing.sm,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  listTitle: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
  },
  listCaption: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptyWrap: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 420,
  },
  invoiceList: {
    maxHeight: 280,
  },
  invoiceListContent: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  invoiceMain: {
    flex: 1,
    gap: 6,
  },
  invoiceHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  invoiceNumber: {
    fontSize: typography.fontSizes.xl,
    lineHeight: 28,
  },
  invoiceConcept: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 21,
  },
  invoiceMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  invoiceMetaText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
