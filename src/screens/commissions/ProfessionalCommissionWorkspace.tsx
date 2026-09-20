import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../constants/types';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FocusedActionSheet } from '../../components/finance/FocusedActionSheet';
import { useTheme } from '../../contexts/ThemeContext';
import { addMadridDaysInputValue } from '../../utils/clinicAgendaDateRange';
import { getErrorMessage } from '../../constants/errors';
import * as service from '../../services/heraCommissionService';
import { Button, Card, Check, CommissionDisclosure, Field, Text, WorkflowDate, WorkflowHeader, WorkflowHint, dateTime, day, getMadridDateKey, money, type Run } from './CommissionElements';
import { CommissionSelect } from './CommissionFields';
import { CommissionMetrics, LedgerTitle } from './CommissionLedgerUI';
import { CommissionExplanation } from './CommissionExplanation';
import { CommissionSessions } from './CommissionSessions';
import { CommissionPayments, CommissionPaymentInstructions } from './CommissionPayments';
import { ProfessionalCommissionDocuments } from './ProfessionalCommissionDocuments';
import { CommissionIssues } from './CommissionOperations';
import { ReferralPagination } from '../referrals/ReferralControls';
import { WorkflowEmpty, WorkflowNotice } from '../referrals/WorkflowUI';

// A link is authoritative. Without one, only select an unambiguous real account.
export function initialCommissionAccount(config: service.Configuration): string | undefined {
 const real = config.accounts.filter(account => account.mode === 'LIVE');
 const current = real.filter(account => account.operatorKey === config.terms?.operatorKey);
 if (current.length === 1) return current[0].id;
 if (real.length === 1) return real[0].id;
 if (config.accounts.length === 1) return config.accounts[0].id;
 return undefined;
}

function AcceptedAgreement({ acceptance, accountId, run, busy }: { acceptance: service.Acceptance; accountId: string; run: Run; busy: boolean }) {
 const [reason, setReason] = useState('');
 const [date, setDate] = useState(() => addMadridDaysInputValue(1));
 return <CommissionDisclosure title={`Aceptadas el ${dateTime(acceptance.acceptedAt)}`} icon="document-text-outline">
  <Text>{acceptance.terms.contractText}</Text><Text>Fiscalidad: {acceptance.terms.fiscalTreatment}</Text>
  <WorkflowHint>Vigencia: {dateTime(acceptance.terms.effectiveAt)} · {acceptance.terms.operatorName}</WorkflowHint>
  {acceptance.terminatedAt ? <WorkflowHint>Acuerdo finalizado el {dateTime(acceptance.terminatedAt)}. Se conservan obligaciones e historial.</WorkflowHint> : <CommissionDisclosure title="Finalizar nuevas comisiones">
   <WorkflowHint>Selecciona una fecha posterior a hoy. Esta acción conserva las obligaciones anteriores y su historial.</WorkflowHint>
   <WorkflowDate label="Dejar de generar nuevas comisiones desde" value={date} onChangeText={setDate} disabled={busy} />
   <Field label="Motivo de terminación" value={reason} onChangeText={setReason} />
   <Button variant="outline" disabled={busy || reason.trim().length < 3 || date <= getMadridDateKey()} onPress={() => void run(() => service.decide(accountId, false, { action: 'TERMINATE', termsId: acceptance.termsId, cutOff: day(date), reason }))}>Terminar nuevas comisiones desde esta fecha</Button>
  </CommissionDisclosure>}
 </CommissionDisclosure>;
}

type Panel = 'information' | 'balance' | 'calculation' | 'terms' | 'instructions';
export function ProfessionalCommissionWorkspace({ accountId: requestedAccount, clientId, onOpen, onBack }: {
 accountId?: string; clientId?: string; onOpen: (id: string) => void; onBack: () => void;
}) {
 const { theme } = useTheme();
 const navigation = useNavigation<AppNavigationProp>();
 const [width, setWidth] = useState(0);
 const [config, setConfig] = useState<service.Configuration>();
 const [configError, setConfigError] = useState('');
 const [selected, setSelected] = useState<string>();
 useEffect(() => { setSelected(undefined); }, [requestedAccount]);
 const accountId = requestedAccount ?? selected ?? (config ? initialCommissionAccount(config) : undefined);
 const [data, setData] = useState<service.AccountDetail>();
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);
 const [busy, setBusy] = useState(false);
 const [draft, setDraft] = useState(false);
 const [refresh, setRefresh] = useState(0);
 const [page, setPage] = useState(0);
 const [tab, setTab] = useState<'sessions' | 'payments' | 'issues'>('sessions');
 const [paymentTab, setPaymentTab] = useState<'payments' | 'documents'>('payments');
 const [panel, setPanel] = useState<Panel>();
 const [accepted, setAccepted] = useState(false);
 const submitting = useRef(false);
 const generation = useRef(0);
 const scroll = useRef<ScrollView>(null);
 useEffect(() => { setAccepted(false); }, [config?.terms?.id]);
 useFocusEffect(useCallback(() => {
  let active = true;
  setConfigError('');
  void service.configuration().then(value => { if (active) setConfig(value); }).catch(reason => { if (active) setConfigError(getErrorMessage(reason, 'No se pudieron cargar las cuentas y condiciones.')); });
  return () => { active = false; };
 }, [refresh]));
 useEffect(() => { setPage(0); setTab('sessions'); setPanel(undefined); setDraft(false); }, [accountId]);
 const load = useCallback(async () => {
  const g = ++generation.current;
  setError('');
  if (!accountId) { setData(undefined); return; }
  setLoading(true);
  try {
   const result = await service.detail(accountId, false, page);
   if (g === generation.current) setData(result);
  } catch (reason) {
   if (g === generation.current) { setData(undefined); setError(getErrorMessage(reason, 'No se pudo abrir esta cuenta. Reintenta o selecciona otra cuenta.')); }
  } finally { if (g === generation.current) setLoading(false); }
 }, [accountId, page]);
 useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load, refresh]));
 const run: Run = async operation => {
  if (submitting.current) return false;
  submitting.current = true; setBusy(true); setError('');
  try { await operation(); return true; }
  catch (reason) { setError(getErrorMessage(reason, 'No se pudo guardar. Puedes reintentar.')); return false; }
  finally { submitting.current = false; setBusy(false); }
 };
 const mutate: Run = async operation => { const ok = await run(operation); if (ok) setRefresh(value => value + 1); return ok; };
 const open = (id: string) => { if (busy || draft) return; setSelected(id); onOpen(id); };
 const current = data?.summary.id === accountId ? data : undefined;
 const acceptance = config?.accounts.flatMap(account => account.acceptances).find(item => item.termsId === config.terms?.id);
 const pendingAcceptance = !!config?.terms && !acceptance && config.canAccept;
 const wide = width >= 920;
 const panelTitles: Record<Panel, string> = { information: 'Información de comisiones', balance: 'Detalle del saldo', calculation: 'Cómo se calculan las comisiones', terms: 'Condiciones y aceptación', instructions: 'Instrucciones de pago' };
 const conditions = <>
  <Button variant="outline" onPress={() => navigation.navigate('LegalDocument', { documentKey: 'TERMS_OF_SERVICE' })}>Consultar términos generales</Button>
  {config?.terms ? <>
   <LedgerTitle>Condiciones vigentes · {config.terms.operatorName}</LedgerTitle>
   <Text>{config.terms.contractText}</Text><Text>Fiscalidad: {config.terms.fiscalTreatment}</Text><WorkflowHint>Vigencia: {dateTime(config.terms.effectiveAt)}</WorkflowHint>
   {acceptance ? <WorkflowHint>{acceptance.terminatedAt ? 'Este acuerdo ha finalizado. Se conserva lo que aceptaste y tu historial.' : `Ya aceptaste estas condiciones el ${dateTime(acceptance.acceptedAt)}.`}</WorkflowHint> : pendingAcceptance && config.mode === 'SIMULATION' ? <>
    <Check label="He leído y acepto esta versión de las condiciones y su tratamiento fiscal" checked={accepted} onChange={setAccepted} disabled={busy} />
    <Button style={{ alignSelf: 'flex-start' }} disabled={busy || !accepted || draft} onPress={() => void (async () => { const terms = config.terms; if (!terms) return; if (await run(async () => { const result = await service.accept(terms.id); open(result.accountId); })) { setPanel(undefined); setRefresh(value => value + 1); } })()}>Aceptar condiciones</Button>
   </> : pendingAcceptance && config.mode === 'LIVE' && config.accounts.some(a => a.acceptances.some(item => item.terminatedAt)) ? <><WorkflowHint>Tu participación anterior terminó. Puedes reincorporarte con los términos generales vigentes; no cambia tu historial.</WorkflowHint><Button disabled={busy} onPress={() => void mutate(async () => { const terms = config.terms; if (terms) await service.accept(terms.id); })}>Reincorporarme al Directorio</Button></> : <WorkflowHint>La habilitación del Directorio depende de los términos generales y de la verificación profesional.</WorkflowHint>}
  </> : <WorkflowHint>El acuerdo no está disponible. Puedes consultar el historial de tus cuentas anteriores.</WorkflowHint>}
  {current?.acceptances.length ? <><LedgerTitle>Historial de aceptación</LedgerTitle>{current.acceptances.map(item => <AcceptedAgreement key={item.id} acceptance={item} accountId={current.summary.id} run={mutate} busy={busy} />)}</> : null}
 </>;
 return <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: theme.bg }} onLayout={event => setWidth(event.nativeEvent.layout.width)} contentContainerStyle={{ width: '100%', maxWidth: 1360, alignSelf: 'center', padding: width && width < 600 ? 16 : 28, paddingBottom: 48, gap: 20 }} keyboardShouldPersistTaps="handled">
  <WorkflowHeader title="Mis comisiones" subtitle="Solo comisiones por pacientes del Directorio HERA" action={<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button size="small" variant="outline" disabled={busy || draft} onPress={onBack}>Volver</Button>{current ? <Button size="small" variant="outline" onPress={() => setPanel('information')}>Información</Button> : null}<Button size="small" variant="outline" disabled={busy || loading || draft} onPress={() => setRefresh(value => value + 1)}>Actualizar</Button></View>} />
  {configError ? <Card><Text error>{configError}</Text><Button variant="outline" onPress={() => setRefresh(value => value + 1)}>Reintentar cuentas y condiciones</Button></Card> : null}
  {config && (config.accounts.length > 1 || (requestedAccount && !config.accounts.some(account => account.id === requestedAccount))) ? <View style={{ maxWidth: 460, gap: 6 }}>
   {draft || busy ? <WorkflowHint>Guarda o cierra la actividad antes de cambiar de cuenta.</WorkflowHint> : <CommissionSelect accessibilityLabel="Cuenta de comisiones" value={accountId ?? null} placeholder="Selecciona una cuenta" onSelect={open} options={config.accounts.map((account, index) => ({ value: account.id, label: `${account.acceptances[0]?.terms.operatorName ?? `Titular ${index + 1}`} · ${account.mode === 'LIVE' ? 'Real' : 'Simulación'}${account.acceptances.some(item => item.termsId === config.terms?.id) ? ' · Actual' : ''}` }))} />}
  </View> : null}
  {error && !panel ? <Card><Text error>{error}</Text><Button variant="outline" disabled={busy || draft} onPress={() => void load()}>Reintentar cuenta</Button></Card> : null}
  {loading || (!config && !configError && !accountId) ? <ActivityIndicator accessibilityLabel="Cargando comisiones" /> : null}
  {config?.mode === 'OFF' ? <WorkflowNotice>Las nuevas comisiones están desactivadas. Tu historial sigue disponible.</WorkflowNotice> : null}
  {current?.summary.mode === 'SIMULATION' ? <WorkflowNotice>Simulación · Importes de prueba sin deuda. No hagas pagos reales por esta cuenta.</WorkflowNotice> : null}
  {current ? <>
   <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}><LedgerTitle>Resumen de la cuenta</LedgerTitle><Button size="small" variant="outline" onPress={() => setPanel('balance')}>Detalle del saldo</Button></View>
    <CommissionMetrics items={[
    { label: 'Pendiente de cubrir', value: money(current.summary.paymentPendingCents ?? current.summary.pendingCents), emphasis: true },
    { label: 'Recibido por HERA', value: money(current.summary.receivedCents) },
    { label: 'Saldo a favor', value: money(current.summary.creditCents) },
   ]}/><WorkflowHint>Toda la cuenta · Los filtros solo afectan al listado</WorkflowHint></View>
   {pendingAcceptance ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}><WorkflowHint>Hay nuevas condiciones disponibles. Tu historial sigue accesible.</WorkflowHint><Button size="small" variant="outline" onPress={() => setPanel('terms')}>Revisar condiciones</Button></View> : null}
   <View style={{ minWidth: 0, gap: 16 }}>
     <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderBottomWidth: 1, borderColor: theme.border, paddingBottom: 14 }}>
      {([['sessions', 'Sesiones y comisiones'], ['payments', 'Pagos y facturas'], ['issues', 'Revisiones']] as const).map(([value, label]) => <Button key={value} size="small" accessibilityRole="tab" accessibilityLabel={value === 'issues' ? 'Revisiones y respuestas' : label} accessibilityState={{ selected: tab === value }} variant={tab === value ? 'secondary' : 'outline'} disabled={busy} onPress={() => { setTab(value); setPage(0); }}>{label}{value === 'issues' && current.summary.issueCount > 0 ? ` · ${current.summary.issueCount} ${current.summary.issueCount === 1 ? 'abierta' : 'abiertas'}` : ''}</Button>)}
     </View>
     <View style={{ display: tab === 'sessions' ? 'flex' : 'none', gap: 10 }}><CommissionSessions key={accountId} accountId={current.summary.id} clientId={clientId} admin={false} run={mutate} busy={busy} refresh={refresh} onDraftChange={setDraft} onOpenReview={() => { setTab('issues'); setPage(0); }} /></View>
     {tab === 'payments' ? <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{([['payments', 'Pagos confirmados'], ['documents', 'Facturas y periodos']] as const).map(([value, label]) => <Button key={value} size="small" variant={paymentTab === value ? 'secondary' : 'outline'} accessibilityRole="tab" accessibilityState={{ selected: paymentTab === value }} onPress={() => { setPaymentTab(value); setPage(0); }}>{label}</Button>)}<Button size="small" variant="outline" onPress={() => setPanel('instructions')}>Instrucciones de pago</Button></View>
      {loading ? <ActivityIndicator accessibilityLabel="Cargando pagos y facturas" /> : paymentTab === 'payments' ? <CommissionPayments data={current} /> : <ProfessionalCommissionDocuments key={accountId} data={current} run={run} busy={busy} />}
     </> : tab === 'issues' ? <><LedgerTitle>Revisiones y respuestas</LedgerTitle>{loading ? <ActivityIndicator accessibilityLabel="Cargando revisiones" /> : <CommissionIssues data={current} admin={false} run={mutate} busy={busy} />}</> : null}
     {tab !== 'sessions' ? <ReferralPagination page={page} hasMore={current.pagination?.[tab === 'issues' ? 'issues' : paymentTab] ?? current.hasMore} loading={loading || busy || draft} onChange={setPage} /> : null}
    </View>
  </> : !accountId && config ? config.accounts.length ? <WorkflowEmpty icon="wallet-outline" title="Elige la cuenta que quieres consultar" description="Cada titular y cada simulación tienen su propio saldo e historial." /> : <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'flex-start', gap: 24 }}><View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', gap: 16 }}><WorkflowEmpty icon="receipt-outline" title={pendingAcceptance ? 'Activa tus comisiones del Directorio' : 'Todavía no tienes comisiones registradas'} description={pendingAcceptance ? 'Conoce el cálculo y revisa el acuerdo antes de aceptarlo. Tus pacientes propios quedan fuera.' : config.mode === 'OFF' ? 'Podrás consultar las condiciones cuando estén habilitadas.' : 'Las condiciones todavía no están habilitadas para tu perfil.'} /><CommissionExplanation terms={config.terms} simulation={config.mode === 'SIMULATION'} initiallyOpen /></View><Card style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', minWidth: 0 }}>{conditions}</Card></View> : null}
  <FocusedActionSheet visible={!!panel} title={panel ? panelTitles[panel] : ''} onClose={() => { if (!busy) setPanel(undefined); }}>
   {error ? <Text error>{error}</Text> : null}
   {panel === 'information' ? <>
    <WorkflowHint>Consulta el cálculo, el acuerdo y tu historial de aceptación cuando lo necesites.</WorkflowHint>
    <Button variant="outline" onPress={() => setPanel('calculation')}>Cómo se calculan las comisiones</Button>
    <Button variant="outline" onPress={() => setPanel('terms')}>Condiciones e historial</Button>
    <WorkflowHint>El cobro al paciente y el pago de la comisión a HERA se registran por separado.</WorkflowHint>
   </> : panel === 'terms' ? conditions : panel === 'calculation' ? <CommissionExplanation terms={current?.acceptances[0]?.terms} simulation={current?.summary.mode === 'SIMULATION'} initiallyOpen /> : panel === 'instructions' && current ? <CommissionPaymentInstructions data={current} /> : panel === 'balance' && current ? <>
    <WorkflowHint>Importes de toda la cuenta, sin aplicar los filtros del listado.</WorkflowHint>
    {[
     ['Aplicado a comisiones y facturas', current.summary.appliedCents], ['Generado en meses abiertos', current.summary.accruedCents], ['Base sin factura', current.summary.unbilledCents ?? current.summary.undocumentedCents], ['Vencido', current.summary.overdueCents], ['Estimaciones', current.summary.estimatedCents], ['Saldo de documentos antes de ajustes', current.summary.documentedCents],
    ].map(([label, amount]) => typeof amount === 'number' ? <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}><View style={{ flex: 1 }}><Text>{label}</Text></View><Text>{money(amount)}</Text></View> : null)}
    <WorkflowHint>La base sin factura no es un total fiscal definitivo ni una solicitud automática de pago. Las estimaciones no son deuda exigible. Las correcciones pendientes se excluyen del importe válido para transferir.</WorkflowHint><WorkflowHint>Lo recibido por HERA puede incluir crédito todavía sin aplicar.</WorkflowHint>
   </> : null}
  </FocusedActionSheet>
 </ScrollView>;
}
