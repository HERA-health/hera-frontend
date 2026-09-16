import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import type { Balance } from '../../services/heraCommissionService';
import { Button, Card, CommissionDisclosure, money, WorkflowHint } from './CommissionElements';
import { CommissionMetrics } from './CommissionLedgerUI';

export function AdminCommissionBalanceCard({ balance, onOpen }: { balance: Balance; onOpen: (id: string) => void }) {
 const { theme } = useTheme(); const compact = useWindowDimensions().width < 768;
 const status = balance.overdueCents > 0 ? 'Tiene pagos vencidos'
  : (balance.paymentPendingCents ?? balance.pendingCents) > 0 ? ((balance.appliedCents ?? 0) > 0 ? 'Pago parcial' : 'Pago pendiente')
  : (balance.unbilledCents ?? balance.undocumentedCents) > 0 ? 'Pagado · Factura pendiente'
  : balance.issueCount > 0 ? 'Revisiones pendientes'
  : balance.receivedCents > 0 || balance.accruedCents > 0 || balance.creditCents > 0 ? 'Sin pagos pendientes'
  : 'Sin importes registrados';
 return <Card style={styles.card}>
  <View style={styles.header}>
   <View style={styles.identity}>
    <View style={[styles.avatar, { backgroundColor: theme.primaryAlpha12 }]}><Ionicons name="person-outline" size={22} color={theme.primary} /></View>
    <View style={styles.name}>
     <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 20 }}>{balance.specialistName}</Text>
     <WorkflowHint>{balance.mode === 'SIMULATION' ? `Simulación sin deuda · ${status}` : status}</WorkflowHint>
    </View>
   </View>
   <Button size="small" accessibilityLabel={`Gestionar comisiones de ${balance.specialistName}`} onPress={() => onOpen(balance.id)} icon={<Ionicons name="arrow-forward" size={16} color={theme.textOnPrimary} />} iconPosition="right">Gestionar</Button>
  </View>
  <View style={[styles.amounts, compact && { flexDirection: 'column', flexWrap: 'nowrap', gap: 12 }, { borderColor: theme.border }]}>
   {[
    { label: 'Pendiente de cubrir', value: balance.paymentPendingCents ?? balance.pendingCents, prominent: true },
    { label: 'Recibido por HERA', value: balance.receivedCents },
    { label: 'Por documentar', value: balance.unbilledCents ?? balance.undocumentedCents },
   ].map(item => <View key={item.label} style={[styles.amount, compact && { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minHeight: 34, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }]}>
    <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 13 }}>{item.label}</Text>
    <Text style={{ color: item.prominent ? theme.primary : theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: compact ? 22 : 26, lineHeight: 34 }}>{money(item.value)}</Text>
   </View>)}
  </View>
  <CommissionDisclosure title="Ver desglose del saldo">
   <CommissionMetrics items={[
    { label: 'Vencido', value: money(balance.overdueCents) },
    { label: 'Crédito sin aplicar', value: money(balance.creditCents) },
    { label: 'Devengado sin liquidar', value: money(balance.accruedCents) },
   ]} />
   <WorkflowHint>{balance.issueCount} revisiones pendientes. El importe por documentar se muestra por separado del pendiente de recibir.</WorkflowHint>
  </CommissionDisclosure>
 </Card>;
}

const styles = StyleSheet.create({
 card: { padding: 22, gap: 18 },
 header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
 identity: { flexDirection: 'row', alignItems: 'center', gap: 12, flexGrow: 1, flexShrink: 1, flexBasis: 240 },
 avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
 name: { flex: 1, gap: 5 },
 amounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, borderTopWidth: 1, paddingTop: 18 },
 amount: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 145, gap: 5 },
});
