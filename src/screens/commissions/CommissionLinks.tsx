import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text as NativeText, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppNavigationProp } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import * as service from '../../services/heraCommissionService';
import { Card, Text, Button, WorkflowHint, money } from './CommissionElements';

export function CommissionInfoLink({ compact = false }: { compact?: boolean }) {
 const navigation = useNavigation<AppNavigationProp>(); const { theme } = useTheme();
 return <Button variant="outline" size="small" accessibilityLabel="Cómo funcionan las comisiones" style={compact ? { width: 44, height: 52, paddingHorizontal: 0, flexShrink: 0 } : { alignSelf: 'flex-start' }} icon={compact ? undefined : <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} />} onPress={() => navigation.navigate('HeraCommissions')}>
  {compact ? <Ionicons name="information-circle-outline" size={21} color={theme.textSecondary} /> : 'Cómo funcionan las comisiones'}
 </Button>;
}
export function PatientCommission({ clientId }: { clientId: string }) {
 const navigation = useNavigation<AppNavigationProp>(); const { theme } = useTheme();
 const [relation, setRelation] = useState<Awaited<ReturnType<typeof service.patient>>>(); const [error, setError] = useState('');
 const [expanded, setExpanded] = useState(false);
 const generation = useRef(0);
 useFocusEffect(useCallback(() => {
  const current = ++generation.current;
  setRelation(undefined); setError(''); setExpanded(false);
  void service.patient(clientId).then(r => { if (current === generation.current) setRelation(r); }).catch(e => { if (current === generation.current) setError(getErrorMessage(e, 'No se pudo consultar la comisión.')); });
  return () => { generation.current++; };
 }, [clientId]));
 const directory = relation?.origin === 'HERA_DIRECTORY' && relation.status === 'CONFIRMED';
 const own = relation?.origin === 'SPECIALIST_OWN' || relation?.origin === 'SPECIALIST_INVITED';
 const status = relation === undefined ? 'Consultando…' : directory ? 'Paciente del Directorio' : relation?.status === 'PENDING' ? 'Procedencia en revisión' : own ? 'Paciente propio · Sin comisión HERA' : 'Sin comisión HERA confirmada';
 const snapshot = relation?.sessions[0]; const count = snapshot?.position ?? relation?.initialCount;
 return <Card style={linkStyles.card}>
  <View style={linkStyles.header}>
   <View style={linkStyles.identity}><Ionicons name="receipt-outline" size={21} color={theme.textSecondary} /><View style={{ flex: 1, gap: 3 }}>
    <NativeText accessibilityRole="header" style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 16 }}>Comisión HERA</NativeText>
    <WorkflowHint>{error && relation === undefined ? 'Información no disponible' : status}</WorkflowHint>
   </View></View>
   <Button variant="outline" size="small" accessibilityState={{ expanded }} icon={<Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={theme.textSecondary} />} iconPosition="right" onPress={() => setExpanded(v => !v)}>{expanded ? 'Cerrar opciones' : 'Ver opciones'}</Button>
  </View>
  {error ? <Text error>{error}</Text> : null}
  {expanded ? <View style={[linkStyles.details, { borderTopColor: theme.border }]}>
   {directory && snapshot ? <WorkflowHint>{count == null ? 'La posición de la siguiente sesión está pendiente de acreditar.' : `${count} sesiones computadas · Siguiente estimada: ${count + 1}.ª, al ${count === 0 ? 20 : count < 3 ? 10 : 5}%. Las asistencias pendientes pueden cambiar esta posición.`}</WorkflowHint> : null}
   <View style={linkStyles.actions}>
    {snapshot ? <Button variant="outline" size="small" onPress={() => navigation.navigate('HeraCommissions', { accountId: snapshot.accountId, clientId })}>Ver cálculo y revisiones</Button> : <CommissionInfoLink />}
   </View>
  </View> : null}
 </Card>;
}
const linkStyles = StyleSheet.create({
 card: { padding: 16, gap: 12 },
 header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
 identity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 190 },
 details: { borderTopWidth: 1, paddingTop: 16, gap: 12 },
 actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
export function AdminCommissionSummary({ specialistId, refresh = 0 }: { specialistId: string; refresh?: number }) {
 const navigation = useNavigation<AppNavigationProp>(); const { theme } = useTheme();
 const [data, setData] = useState<service.AdminSpecialistSummary>(); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
 useFocusEffect(useCallback(() => {
  let active = true; setData(undefined); setError('');
  void service.adminSpecialistSummary(specialistId).then(result => { if (active) { setData(result); setError(''); } }).catch(e => { if (active) setError(getErrorMessage(e, 'No se pudo consultar el historial de comisiones.')); });
  return () => { active = false; };
 }, [specialistId, refresh, retry]));
 const history = data?.accounts.filter(a => a.hasHistory) ?? [];
 return <Card style={linkStyles.card}>
  <View style={linkStyles.header}>
   <View style={linkStyles.identity}><Ionicons name="receipt-outline" size={21} color={theme.textSecondary} /><NativeText accessibilityRole="header" style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 16, flexShrink: 1 }}>Comisiones del Directorio</NativeText></View>
   <Button variant="outline" size="small" onPress={() => navigation.navigate('AdminPanel', { initialTab: 'commissions', commissionSpecialistId: specialistId, commissionAccountId: history.length === 1 ? history[0].id : undefined })}>Ver comisiones del Directorio</Button>
  </View>
  {error ? <View style={linkStyles.actions}><Text error>{error}</Text><Button variant="ghost" size="small" onPress={() => setRetry(v => v + 1)}>Reintentar comisiones</Button></View> : !data ? <WorkflowHint>Consultando comisiones…</WorkflowHint> : <>
   {!history.length ? <WorkflowHint>Aún no hay comisiones registradas.</WorkflowHint> : history.map(a => <View key={a.id} style={{ gap: 4 }}>
    <Text>{a.operatorName} · {a.mode === 'LIVE' ? 'Real' : 'Simulación'}</Text>
    <WorkflowHint>{(a.paymentPendingCents ?? a.pendingCents) || a.creditCents || (a.unbilledCents ?? a.undocumentedCents) ? [(a.paymentPendingCents ?? a.pendingCents) ? 'Pendiente de cubrir ' + money(a.paymentPendingCents ?? a.pendingCents) : '', a.creditCents ? 'Crédito ' + money(a.creditCents) : '', (a.unbilledCents ?? a.undocumentedCents) ? 'Sin factura ' + money(a.unbilledCents ?? a.undocumentedCents) : ''].filter(Boolean).join(' · ') : 'Historial disponible · Sin saldo pendiente'}</WorkflowHint>
   </View>)}
   <WorkflowHint>{data.mode === 'OFF' ? 'Las nuevas comisiones están desactivadas.' + (history.length ? ' Puedes consultar y gestionar las obligaciones anteriores.' : '') : data.mode === 'SIMULATION' ? 'Las nuevas comisiones se calculan en simulación; no generan deuda real.' : 'Las nuevas comisiones requieren condiciones vigentes y aceptación del especialista; no se generan retroactivamente.'}</WorkflowHint>
  </>}
 </Card>;
}
