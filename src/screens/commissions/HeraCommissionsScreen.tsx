import { AdminCommissionBalanceCard } from './AdminCommissionBalanceCard';
import { ProfessionalCommissionWorkspace } from './ProfessionalCommissionWorkspace';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CommissionMetrics } from './CommissionLedgerUI';
import { ActivityIndicator, ScrollView, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import { CommissionSelect } from './CommissionFields';
import { ReferralPagination } from '../referrals/ReferralControls';
import { workflow } from '../referrals/WorkflowUI';
import * as service from '../../services/heraCommissionService';
import { Card, Text, Field, Button, WorkflowHeader, WorkflowHint, WorkflowDate, day, getMadridDateKey, money, dateTime, styles, Run } from './CommissionElements';
import { CommissionSessions } from './CommissionSessions';
import { CashOperations, CommissionIssues, CommissionPeriods, ReceiptForm } from './CommissionOperations';
import { CommissionExplanation } from './CommissionExplanation';
import { CommissionDisclosure } from './CommissionElements';
import { WorkflowEmpty, WorkflowHeading } from '../referrals/WorkflowUI';

function Agreements({ data, admin, run, busy }: { data: service.AccountDetail; admin: boolean; run: Run; busy: boolean }) {
 const [reason, setReason] = useState(''); const [date, setDate] = useState(getMadridDateKey());
 return <>{data.acceptances.map(a => <Card key={a.id}><Text title>Condiciones aceptadas</Text><Text>Aceptadas el {dateTime(a.acceptedAt)} · Efectivas desde {dateTime(a.terms.effectiveAt)}</Text><Text>{a.terms.contractText}</Text><Text>Fiscalidad: {a.terms.fiscalTreatment}</Text>{a.terminatedAt ? <Text>Terminación: {dateTime(a.terminatedAt)}. Se conservan obligaciones e historial.</Text> : <><WorkflowDate label="Dejar de generar nuevas comisiones desde" value={date} onChangeText={setDate} /><Field label="Motivo de terminación" value={reason} onChangeText={setReason} /><Button variant="outline" disabled={busy} onPress={() => void run(() => service.decide(data.summary.id, admin, { action: 'TERMINATE', termsId: a.termsId, cutOff: day(date), reason }))}>Terminar nuevas comisiones desde esta fecha</Button></>}</Card>)}</>;
}

function AdminBalances({ specialistId, onOpen, refresh }: { specialistId?: string; onOpen: (id: string) => void; refresh: number }) {
 const { width } = useWindowDimensions(); const [filtersOpen, setFiltersOpen] = useState(false);
 const [operatorsLoading, setOperatorsLoading] = useState(!specialistId);
 const [operators, setOperators] = useState<Awaited<ReturnType<typeof service.operators>>>([]); const [operator, setOperator] = useState(''); const [mode, setMode] = useState<service.Mode>('LIVE'); const [search, setSearch] = useState(''); const [status, setStatus] = useState('ALL'); const [page, setPage] = useState(0);
 const [configuration, setConfiguration] = useState<service.Configuration>(); const [configurationError, setConfigurationError] = useState('');
 useEffect(() => { let active = true; setConfigurationError(''); void service.configuration().then(value => { if (active) setConfiguration(value); }).catch(() => { if (active) { setConfiguration(undefined); setConfigurationError('No se pudo comprobar la configuración de nuevas comisiones. Pulsa Actualizar saldos para reintentar.'); } }); return () => { active = false; }; }, [refresh]);
 const [operatorError, setOperatorError] = useState('');
 const [loadError, setLoadError] = useState('');
 const [rows, setRows] = useState<service.Balance[]>([]); const [totals, setTotals] = useState<Awaited<ReturnType<typeof service.balances>>['totals']>(); const [more, setMore] = useState(false); const [loading, setLoading] = useState(false);
 useEffect(() => { let active = true; if (specialistId) { setOperatorsLoading(false); return; } setOperatorsLoading(true); setOperatorError(''); void service.operators().then(list => { if (active) { setOperators(list); setOperator(current => current || list[0]?.operatorKey || ''); } }).catch(e => { if (active) setOperatorError(getErrorMessage(e, 'No se pudieron cargar los titulares.')); }).finally(() => { if (active) setOperatorsLoading(false); }); return () => { active = false; }; }, [refresh, specialistId]);
 useEffect(() => { let active = true; if (!operator && !specialistId) return; setLoading(true); setLoadError(''); setRows([]); setTotals(undefined); setMore(false); void (async () => { if (specialistId) { const result = await service.specialistAccounts(specialistId); if (active) setRows(result); } else { const result = await service.balances({ operatorKey: operator, mode, search, status: status === 'ALL' ? undefined : status, page }); if (active) { setRows(result.items); setTotals(result.totals); setMore(result.hasMore); } } })().catch(e => { if (active) setLoadError(getErrorMessage(e, 'No se pudieron cargar los saldos.')); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [operator, mode, search, status, page, specialistId, refresh]);
 return <>{operatorError ? <Text error>{operatorError}</Text> : null}{configurationError ? <Text error>{configurationError}</Text> : null}{configuration && configuration.mode !== 'OFF' && !configuration.terms ? <Card><WorkflowHeading title="Falta configurar el acuerdo de comisiones" subtitle={configuration.mode === 'LIVE' ? 'LIVE está seleccionado, pero no hay un acuerdo activo para aceptar.' : 'SIMULATION está seleccionado, pero no hay un acuerdo de prueba activo para aceptar.'} /><WorkflowHint>Administración debe publicar y activar el acuerdo. Después podrá aceptarlo el especialista y aparecerá su cuenta. Cambiar el modo no crea el acuerdo ni incorpora sesiones anteriores.</WorkflowHint></Card> : null}{loadError ? <Text error>{loadError}</Text> : null}{!specialistId ? <View style={{ gap: 16 }}>{width < 768 ? <Button size="small" variant="outline" accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen(value => !value)}>{filtersOpen ? 'Ocultar filtros' : 'Filtrar especialistas'}</Button> : null}{width >= 768 || filtersOpen ? <><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}><View style={{ flexGrow: 2, flexBasis: 240 }}><Field label="Buscar especialista" value={search} onChangeText={v => { setSearch(v); setPage(0); }} /></View><View style={{ flexGrow: 1, flexBasis: 180 }}><CommissionSelect accessibilityLabel="Estado del saldo" options={[{ value: 'ALL', label: 'Todos' }, { value: 'PENDING', label: 'Pendiente' }, { value: 'PARTIAL', label: 'Parcial' }, { value: 'CURRENT', label: 'Al día' }, { value: 'OVERDUE', label: 'Vencido' }, { value: 'ISSUES', label: 'Con incidencias' }]} value={status} onSelect={v => { setStatus(v); setPage(0); }} /></View><View style={{ flexGrow: 1, flexBasis: 180 }}><CommissionSelect accessibilityLabel="Tipo de cuenta" options={[{ value: 'LIVE', label: 'Real' }, { value: 'SIMULATION', label: 'Simulación sin deuda' }]} value={mode} onSelect={v => { if (v === 'LIVE' || v === 'SIMULATION') { setMode(v); setPage(0); } }} /></View></View>{new Set(operators.map(o => o.operatorKey)).size > 1 ? <CommissionSelect accessibilityLabel="Titular fiscal" options={[...new Map(operators.map(o => [o.operatorKey, { value: o.operatorKey, label: o.operatorName }])).values()]} value={operator} onSelect={v => { setOperator(v); setPage(0); }} />: null}</> : <WorkflowHint>{mode === 'LIVE' ? 'Cuentas reales' : 'Simulación sin deuda'}{status !== 'ALL' || search ? ' · Filtros aplicados' : ' · Todos los especialistas'}</WorkflowHint>}</View> : null}
 {totals && !loading && !loadError ? <><Text>{totals.count} {totals.count === 1 ? 'especialista' : 'especialistas'} en este filtro</Text><CommissionMetrics items={[
 { label: 'Pendiente de cubrir', value: money(totals.paymentPendingCents ?? totals.pendingCents), emphasis: true },
 { label: 'Recibido por HERA', value: money(totals.receivedCents) },
 { label: 'Por documentar', value: money(totals.undocumentedCents) },
]} /></> : null}{loading || operatorsLoading ? <ActivityIndicator accessibilityLabel="Cargando saldos" /> : null}
 {!loading && !loadError ? rows.map(row => <AdminCommissionBalanceCard key={row.id} balance={row} onOpen={onOpen} />) : null}
 {!loading && !operatorsLoading && !loadError && !operatorError && !rows.length ? <WorkflowEmpty icon="receipt-outline" title="Todavía no hay cuentas de comisiones" description={specialistId ? 'Este especialista aún no tiene una cuenta de comisiones. Se creará cuando acepte un acuerdo habilitado para su perfil.' : 'No hay cuentas que coincidan con esta selección. Las cuentas se crean cuando los especialistas aceptan el acuerdo habilitado.'} /> : null}{!specialistId ? <ReferralPagination page={page} hasMore={more} loading={loading} onChange={setPage} /> : null}</>;
}

export function HeraCommissionsScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'HeraCommissions'>) {
 const legacyAdmin = route.params?.admin === true;
 useEffect(() => {
  if (legacyAdmin) navigation.replace('AdminPanel', { initialTab: 'commissions', commissionAccountId: route.params?.accountId, commissionSpecialistId: route.params?.specialistId });
 }, [legacyAdmin, navigation, route.params?.accountId, route.params?.specialistId]);
 if (legacyAdmin) return null;
 return <CommissionWorkspace accountId={route.params?.accountId} clientId={route.params?.clientId} onOpen={accountId => navigation.setParams({ accountId })} onBack={() => {
  if (navigation.canGoBack()) navigation.goBack();
  else navigation.replace('ProfessionalHome');
 }} />;
}

export function CommissionWorkspace({ admin = false, accountId, specialistId, clientId, onOpen, onBack }: {
 admin?: boolean; accountId?: string; specialistId?: string; clientId?: string;
 onOpen: (accountId: string) => void; onBack: () => void;
}) {
 if (!admin) return <ProfessionalCommissionWorkspace accountId={accountId} clientId={clientId} onOpen={onOpen} onBack={onBack} />;
 return <AdminCommissionWorkspace accountId={accountId} specialistId={specialistId} onOpen={onOpen} onBack={onBack} />;
}

function AdminCommissionWorkspace({ accountId, specialistId, onOpen, onBack }: { accountId?: string; specialistId?: string; onOpen: (id: string) => void; onBack: () => void }) {
 const admin = true;
 const { theme } = useTheme();
 const [data, setData] = useState<service.AccountDetail>(); const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [tab, setTab] = useState('sessions'); const [page, setPage] = useState(0); const [refresh, setRefresh] = useState(0); const [receipt, setReceipt] = useState<{ documentId?: string }>();
 const generation = useRef(0); const submitting = useRef(false); const scroll = useRef<ScrollView>(null);
 const load = useCallback(async () => { const g = ++generation.current; setLoading(true); setError(''); try { if (accountId) { const result = await service.detail(accountId, admin, page); if (g === generation.current) setData(result); } } catch(e) { if (g === generation.current) setError(getErrorMessage(e, 'No se pudieron cargar las comisiones.')); } finally { if (g === generation.current) setLoading(false); } }, [accountId, admin, page]);
 useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
 useEffect(() => { setData(undefined); setReceipt(undefined); setPage(0); setTab('sessions'); setError(''); scroll.current?.scrollTo({ y: 0, animated: false }); }, [accountId, admin]);
 const run: Run = async operation => { if (submitting.current) return false; submitting.current = true; setBusy(true); setError(''); try { await operation(); return true; } catch(e) { setError(getErrorMessage(e, 'No se pudo guardar. Tus datos se conservan; puedes reintentar.')); scroll.current?.scrollTo({ y: 0, animated: false }); return false; } finally { submitting.current = false; setBusy(false); } };
 const mutate: Run = async operation => { const ok = await run(operation); if (ok) { await load(); setRefresh(v => v + 1); } return ok; };
 const open = (id: string) => { setPage(0); setTab('sessions'); onOpen(id); };
 return <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={[workflow.page, { maxWidth: 1120, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled"><WorkflowHeader title="Gestión de comisiones" subtitle="Seguimiento de las comisiones del Directorio y los abonos recibidos por HERA." action={<View style={styles.row}>{(accountId || specialistId) && <Button size="small" variant="ghost" onPress={onBack}>{accountId ? 'Volver a especialistas' : 'Ver todos los especialistas'}</Button>}<Button size="small" variant="outline" disabled={busy || loading} onPress={() => { void load(); setRefresh(v => v + 1); }}>Actualizar saldos</Button></View>} />
 {error ? <Card><Text error>{error}</Text><Button variant="outline" disabled={busy} onPress={() => void load()}>Recargar datos</Button></Card> : null}{loading ? <ActivityIndicator accessibilityLabel="Cargando comisiones" /> : null}
 {!accountId ? <AdminBalances specialistId={specialistId} onOpen={open} refresh={refresh} /> : data && data.summary.id === accountId ? <>
 <Card style={{ padding: 18, gap: 14 }}><WorkflowHeading title={data.summary.specialistName} subtitle={data.summary.mode === 'SIMULATION' ? 'Administración · Simulación sin deuda' : 'Administración · Cuenta del especialista'} /><CommissionMetrics items={[
  { label: 'Pendiente de cubrir', value: money(data.summary.paymentPendingCents ?? data.summary.pendingCents), emphasis: true },
  ...(data.summary.appliedCents !== undefined ? [{ label: 'Aplicado a comisiones y facturas', value: money(data.summary.appliedCents) }] : []),
 { label: 'Recibido por HERA', value: money(data.summary.receivedCents) },
  { label: 'Crédito sin aplicar', value: money(data.summary.creditCents) },
 ]} /><CommissionDisclosure title="Desglose y ajustes del saldo"><CommissionMetrics items={[
  { label: 'Generado en meses abiertos', value: money(data.summary.accruedCents) },
  { label: 'Sin documentar', value: money(data.summary.unbilledCents ?? data.summary.undocumentedCents) },
  { label: 'Vencido', value: money(data.summary.overdueCents) },
 ]} /><WorkflowHint>Comisión prevista, aún no generada: {money(data.summary.estimatedCents)}. Todavía no es un importe para pagar. Saldo fiscal histórico: {money(data.summary.documentedCents)}. Las correcciones pendientes se excluyen del importe válido para transferir.</WorkflowHint></CommissionDisclosure></Card>
 <ScrollView horizontal style={{ flexGrow: 0, borderBottomWidth: 1, borderColor: theme.border }} contentContainerStyle={{ alignItems: 'center', paddingBottom: 12, gap: 6 }}>{[['sessions','Sesiones'],['periods','Documentos'],['cash','Abonos a HERA'],['issues','Revisiones'],['terms','Condiciones']].map(([value,label]) => <Button key={value} size="small" accessibilityRole="tab" accessibilityState={{ selected: tab === value }} variant={tab === value ? 'secondary' : 'ghost'} disabled={busy} onPress={() => { setPage(0); setTab(value); }}>{label}</Button>)}</ScrollView>
 {receipt ? <ReceiptForm key={receipt.documentId ?? 'unapplied'} data={data} selectedDocument={receipt.documentId} run={mutate} busy={busy} onClose={() => setReceipt(undefined)} /> : null}
 {tab === 'sessions' ? <CommissionSessions key={accountId} accountId={accountId} admin={admin} account={data} onPeriods={() => { setPage(0); setTab('periods'); }} run={mutate} busy={busy} refresh={refresh} /> : tab === 'periods' ? <CommissionPeriods data={data} admin={admin} run={mutate} busy={busy} onReceipt={id => setReceipt({ documentId: id })} /> : tab === 'issues' ? <CommissionIssues data={data} admin={admin} run={mutate} busy={busy} /> : tab === 'terms' ? <><CommissionExplanation terms={data.acceptances[0]?.terms} simulation={data.summary.mode === 'SIMULATION'} /><Agreements data={data} admin={admin} run={mutate} busy={busy} /></> : <>
 <Button disabled={busy} onPress={() => setReceipt({})}>Registrar pago recibido</Button><CashOperations data={data} run={mutate} busy={busy} />
 </>}{tab !== 'sessions' ? <ReferralPagination page={page} hasMore={data.hasMore} loading={loading || busy} onChange={setPage} /> : null}</> : null}</ScrollView>;
}
