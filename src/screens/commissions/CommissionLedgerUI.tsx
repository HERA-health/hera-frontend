import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import type { SettlementState, Settlement } from '../../services/heraCommissionService';

export const settlementLabels: Record<SettlementState, string> = {
 PENDING_ACTIVITY: 'Pendiente de asistencia o cobro del paciente', NO_COMMISSION: 'Excluida o sin comisión',
 UNDOCUMENTED: 'Comisión generada sin documentar', PENDING_PAYMENT: 'Pendiente de abono a HERA', PAID: 'Abonada a HERA',
 PARTIAL_DOCUMENT: 'Documento parcialmente abonado', REVIEW_PENDING: 'Revisión o corrección pendiente', DOCUMENT_NOT_READY: 'Documento pendiente de completar',
};

export function SettlementBadge({ state, settlement }: { state?: SettlementState; settlement?: Settlement }) {
 const { theme } = useTheme();
 const paymentLabel = settlement?.paymentState ? ({ PENDING: 'Pago pendiente', PARTIAL: 'Pago parcial', PAID: 'Pagado' })[settlement.paymentState] : null;
 const label = state === 'REVIEW_PENDING' ? 'Pendiente de revisión por HERA' : paymentLabel && !['PENDING_ACTIVITY', 'NO_COMMISSION'].includes(state ?? '') ? `${paymentLabel} · ${settlement?.documentState === 'AVAILABLE' ? 'Factura disponible' : 'Factura pendiente'}` : state ? settlementLabels[state] : 'Estado contable no disponible';
 const pending = state && ['PARTIAL_DOCUMENT', 'PENDING_PAYMENT', 'REVIEW_PENDING', 'DOCUMENT_NOT_READY'].includes(state);
 const tone = state === 'PAID' ? theme.status.confirmed : pending ? theme.status.pending : { bg: theme.bgMuted, text: theme.textSecondary, border: theme.border };
 return <View style={[ledger.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
  <Ionicons name={state === 'PAID' ? 'checkmark-circle-outline' : pending ? 'time-outline' : 'information-circle-outline'} size={16} color={tone.text} />
  <Text style={{ color: tone.text, fontFamily: theme.fontSansSemiBold, fontSize: 12, lineHeight: 18, flexShrink: 1 }}>{label}</Text>
 </View>;
}

export function LedgerTitle({ children }: { children: React.ReactNode }) {
 const { theme } = useTheme();
 return <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 16, lineHeight: 23 }}>{children}</Text>;
}

export function CommissionMetrics({ items }: { items: Array<{ label: string; value: string; emphasis?: boolean }> }) {
 const { theme } = useTheme();
 return <View style={ledger.metrics}>{items.map(item => <View key={item.label} style={[ledger.metric, { backgroundColor: item.emphasis ? theme.primaryAlpha12 : theme.bgMuted }]}>
  <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 18 }}>{item.label}</Text>
  <Text style={{ color: item.emphasis ? theme.primary : theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 20, lineHeight: 28 }}>{item.value}</Text>
 </View>)}</View>;
}

export const ledger = StyleSheet.create({
 header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
 identity: { flexGrow: 1, flexShrink: 1, flexBasis: 220, gap: 4 },
 badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, maxWidth: '100%', alignSelf: 'flex-start' },
 metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
 metric: { flex: 1, minWidth: 110, padding: 12, borderRadius: 12, gap: 3 },
 details: { borderTopWidth: 1, paddingTop: 16, gap: 14 },
});
