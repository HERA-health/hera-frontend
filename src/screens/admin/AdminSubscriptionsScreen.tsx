import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { randomUUID } from 'expo-crypto';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { SubscriptionOverview } from '../../components/subscriptions/SubscriptionOverview';
import { SubscriptionConfirmation } from '../../components/subscriptions/SubscriptionConfirmation';
import { MadridDateField } from '../../components/finance/MadridDateField';
import { useSubscription } from '../../hooks/useSubscription';
import { getMadridDateKey, parseMadridDateTime, formatMadridInstant } from '../../utils/madridTime';
import { parsePrivatePrice } from '../../utils/privateTariff';
import { normalizeSchedulerTimeInput } from '../../utils/schedulerDateTime';
import * as service from '../../services/subscriptionService';

const plans: { value: service.PaidSubscriptionPlan; label: string }[] = [{ value: 'CALMA', label: 'Calma' }, { value: 'CRECIMIENTO', label: 'Crecimiento' }, { value: 'HORIZONTE', label: 'Horizonte' }];
const actions: { value: service.SubscriptionCommand['kind']; label: string }[] = [
  { value: 'TRIAL', label: 'Activar prueba gratuita' }, { value: 'PAY', label: 'Confirmar período pagado / renovar' },
  { value: 'UPGRADE', label: 'Subir de plan ahora' }, { value: 'DOWNGRADE', label: 'Programar bajada al vencimiento' },
  { value: 'CANCEL', label: 'Finalizar al vencimiento' }, { value: 'CORRECT', label: 'Corregir o anular un período' }, { value: 'REFUND', label: 'Registrar devolución' },
];
type OperationErrors = Partial<Record<'amount' | 'paidDate' | 'method' | 'reference' | 'reason' | 'period' | 'start' | 'end', string>>;

function correctionBoundary(dateKey: string, time: string, original?: string) {
  const normalized = normalizeSchedulerTimeInput(time);
  const parsed = parseMadridDateTime(dateKey, normalized);
  // Keep the exact stored boundary when its displayed date and minute were not edited.
  // Rounding it to a minute can otherwise overlap an adjacent paid period.
  if (parsed && original && dateKey === getMadridDateKey(new Date(original))
    && normalized === formatMadridInstant(original, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })) return { ...parsed, iso: original };
  return parsed;
}

export function AdminSubscriptionsScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'AdminSubscriptions'>>();
  const { theme } = useTheme();
  useEffect(() => {
    navigation.dispatch(StackActions.replace('AdminPanel', { initialTab: 'subscriptions', subscriptionSpecialistId: route.params?.specialistId }));
  }, [navigation, route.params?.specialistId]);
  return <ActivityIndicator color={theme.primary} accessibilityLabel="Abriendo administración de suscripciones" />;
}

export function AdminSubscriptionWorkspace({ specialistId, onOpen, onBack }: { specialistId?: string; onOpen: (id: string) => void; onBack: () => void }) {
  const { user } = useAuth(); const { theme } = useTheme();
  if (!user?.isAdmin) return <Text style={{ color: theme.textPrimary, padding: 24 }}>Acceso reservado a administración.</Text>;
  return specialistId ? <AdminSubscriptionDetail key={specialistId} specialistId={specialistId} onBack={onBack} /> : <AdminSubscriptionList onOpen={onOpen} />;
}

function AdminSubscriptionDetail({ specialistId, onBack }: { specialistId: string; onBack: () => void }) {
  const { theme } = useTheme(); const compact = useWindowDimensions().width < 768;
  const { data, loading, error, refresh } = useSubscription(specialistId);
  const scroll = useRef<ScrollView>(null); const operationY = useRef(0);
  const [kind, setKind] = useState<service.SubscriptionCommand['kind']>('PAY'); const [plan, setPlan] = useState<service.PaidSubscriptionPlan>('CALMA');
  const [reason, setReason] = useState(''); const [amount, setAmount] = useState(''); const [method, setMethod] = useState('Transferencia');
  const [reference, setReference] = useState(''); const [paidDate, setPaidDate] = useState(getMadridDateKey());
  const [periodId, setPeriodId] = useState(''); const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('12:00'); const [endTime, setEndTime] = useState('12:00'); const [voidPeriod, setVoidPeriod] = useState(false);
  const [busy, setBusy] = useState(false); const busyRef = useRef(false); const [actionError, setActionError] = useState(''); const [feedback, setFeedback] = useState('');
  const [proposal, setProposal] = useState<{ command: service.SubscriptionCommand; preview: service.SubscriptionPreview } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<OperationErrors>({});
  const text = { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 23 };
  const strong = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };
  const fieldStyle = { flexGrow: 1, flexBasis: compact ? '100%' as const : '48%' as const, minWidth: 0, marginBottom: 0 };
  useEffect(() => { setProposal(null); setFeedback(''); }, [specialistId]);
  useEffect(() => { if (data?.nextPlan && data.nextPlan !== 'DIRECTORIO') setPlan(data.nextPlan); else if (data?.plan && data.plan !== 'DIRECTORIO') setPlan(data.plan); }, [data?.plan, data?.nextPlan, specialistId]);
  function selectPeriod(id: string) {
    setPeriodId(id); const period = data?.periods.find(p => p.id === id); if (!period || period.plan === 'DIRECTORIO') return;
    setPlan(period.plan); setStartDate(getMadridDateKey(new Date(period.startsAt))); setEndDate(getMadridDateKey(new Date(period.endsAt)));
    setStartTime(formatMadridInstant(period.startsAt, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }));
    setEndTime(formatMadridInstant(period.endsAt, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }));
  }
  async function preview() {
    if (!data || busyRef.current) return;
    setActionError(''); setFeedback('');
    const errors: OperationErrors = {};
    const selectedPeriod = data.periods.find(period => period.id === periodId);
    const start = correctionBoundary(startDate, startTime, selectedPeriod?.startsAt);
    const end = correctionBoundary(endDate, endTime, selectedPeriod?.endsAt);
    if (reason.trim().length < 5 || reason.trim().length > 500) errors.reason = 'Indica un motivo de entre 5 y 500 caracteres.';
    if (kind === 'PAY' || kind === 'REFUND' || kind === 'UPGRADE' && amount.trim()) {
      const cents = parsePrivatePrice(amount);
      if (cents === null || cents <= 0 || cents > 100_000_000) errors.amount = 'Introduce un importe mayor que 0 y hasta 1.000.000 €, con un máximo de dos decimales.';
      if (!parseMadridDateTime(paidDate, '12:00')) errors.paidDate = 'Selecciona una fecha válida.';
      if (!method.trim() || method.trim().length > 50) errors.method = 'Indica el medio de pago (máximo 50 caracteres).';
      if (!reference.trim() || reference.trim().length > 120) errors.reference = 'Indica la referencia externa (máximo 120 caracteres).';
    }
    if (kind === 'CORRECT') {
      if (!periodId) errors.period = 'Selecciona el período que quieres corregir.';
      if (!start) errors.start = 'Selecciona una fecha y una hora válidas de Madrid.';
      if (!end) errors.end = 'Selecciona una fecha y una hora válidas de Madrid.';
      else if (start && end.iso <= start.iso) errors.end = 'El vencimiento debe ser posterior al inicio.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setBusy(true); busyRef.current = true;
    try {
      const base = { operationKey: randomUUID(), expectedRevision: data.revision, expectedCurrentPeriodId: data.period?.id ?? null, reason: reason.trim() };
      const makePayment = (): service.SubscriptionPayment => {
        const amountCents = parsePrivatePrice(amount); const date = parseMadridDateTime(paidDate, '12:00');
        if (amountCents === null || !date) throw new Error('Revisa el importe y la fecha del pago externo.');
        return { amountCents, currency: 'EUR', paidAt: date.iso, method: method.trim(), reference: reference.trim() };
      };
      let command: service.SubscriptionCommand;
      if (kind === 'PAY' || kind === 'REFUND') command = kind === 'PAY' ? { ...base, kind, plan, payment: makePayment() } : { ...base, kind, payment: makePayment() };
      else if (kind === 'CANCEL') command = { ...base, kind };
      else if (kind === 'CORRECT') {
        if (!start || !end || !periodId) throw new Error('Selecciona un período e indica fechas y horas válidas de Madrid.');
        command = { ...base, kind, periodId, plan, startsAt: start.iso, endsAt: end.iso, void: voidPeriod };
      } else if (kind === 'UPGRADE') command = { ...base, kind, plan, ...(amount.trim() ? { payment: makePayment() } : {}) };
      else command = { ...base, kind, plan };
      setProposal({ command, preview: await service.previewSubscriptionCommand(specialistId, command) });
    } catch (failure) { setActionError(getErrorMessage(failure)); if (getErrorCode(failure) === 'SUBSCRIPTION_CHANGED') refresh(); }
    finally { setBusy(false); busyRef.current = false; }
  }
  async function confirm() {
    if (!proposal || busyRef.current) return;
    setBusy(true); busyRef.current = true; setActionError('');
    try {
      await service.executeSubscriptionCommand(specialistId, proposal.command); setProposal(null); setFeedback('Operación registrada. La suscripción se ha actualizado.'); setReason(''); setReference(''); setAmount(''); setKind('PAY'); refresh();
    } catch (failure) {
      setActionError(getErrorMessage(failure));
      // A rejected revision is safe to re-preview. Uncertain network failures retain the key for retries.
      if (getErrorCode(failure) === 'SUBSCRIPTION_CHANGED') { setProposal(null); refresh(); }
    }
    finally { setBusy(false); busyRef.current = false; }
  }
  return <><ScrollView ref={scroll} style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: compact ? 18 : 28 }} keyboardShouldPersistTaps="handled">
    <View style={{ width: '100%', maxWidth: 1440, alignSelf: 'center', gap: 24, paddingBottom: 36 }}>
      <View style={{ alignSelf: 'flex-start' }}><Button variant="ghost" onPress={onBack}>← Todas las suscripciones</Button></View>
      {loading && <ActivityIndicator color={theme.primary} accessibilityLabel="Cargando suscripción" />}
      {!!error && <><Text accessibilityRole="alert" style={text}>{error}</Text><Button onPress={refresh}>Reintentar</Button></>}
      {!!feedback && <Text accessibilityRole="alert" style={[text, { color: theme.primary }]}>{feedback}</Text>}
      {data && <>
        {data.specialist && <View style={{ gap: 4 }}><Text style={[strong, { fontSize: 20 }]}>{data.specialist.name}</Text><Text style={text}>{data.specialist.email}</Text></View>}
        <SubscriptionOverview data={data} action={<Button variant="outline" onPress={() => scroll.current?.scrollTo({ y: operationY.current, animated: false })}>Registrar una operación</Button>} />
        <View onLayout={event => { operationY.current = event.nativeEvent.layout.y; }} style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 24, gap: 16 }}>
          <Text accessibilityRole="header" style={[strong, { fontSize: 20 }]}>Operación administrativa</Text>
            <View style={{ flexDirection: compact ? 'column' : 'row', gap: 16 }}><View style={{ flex: compact ? undefined : 1 }}><SimpleDropdown disabled={busy} value={kind} options={actions.filter(a => a.value !== 'TRIAL' || data.trialEligible)} onSelect={value => { setKind(value); setFieldErrors({}); setActionError(''); }} accessibilityLabel="Operación" presentation="portal" /></View>
            {!['CANCEL', 'REFUND'].includes(kind) && <View style={{ flex: compact ? undefined : 1 }}><SimpleDropdown disabled={busy} value={plan} options={plans} onSelect={setPlan} accessibilityLabel="Plan" presentation="portal" /></View>}</View>
            {kind === 'CORRECT' && <>
              <SimpleDropdown disabled={busy} value={periodId} onSelect={selectPeriod} accessibilityLabel="Período que corregir" options={data.periods.filter(p => !p.voidedAt).map(p => ({ value: p.id, label: `${p.plan} · ${service.subscriptionDate(p.startsAt)} – ${service.subscriptionDate(p.endsAt)}` }))} presentation="portal" />
              {!!fieldErrors.period && <Text accessibilityRole="alert" style={[text, { color: theme.error }]}>{fieldErrors.period}</Text>}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              <View style={fieldStyle}><MadridDateField disabled={busy} label="Fecha de inicio" value={startDate} onChange={setStartDate} /></View>
              <Input editable={!busy} containerStyle={fieldStyle} label="Hora de inicio (Madrid)" accessibilityLabel="Hora de inicio (Madrid)" value={startTime} onChangeText={setStartTime} onBlur={() => setStartTime(normalizeSchedulerTimeInput(startTime))} maxLength={5} placeholder="HH:MM" error={fieldErrors.start} />
              <View style={fieldStyle}><MadridDateField disabled={busy} label="Fecha de vencimiento" value={endDate} onChange={setEndDate} /></View>
              <Input editable={!busy} containerStyle={fieldStyle} label="Hora de vencimiento (Madrid)" accessibilityLabel="Hora de vencimiento (Madrid)" value={endTime} onChangeText={setEndTime} onBlur={() => setEndTime(normalizeSchedulerTimeInput(endTime))} maxLength={5} placeholder="HH:MM" error={fieldErrors.end} /></View>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Switch disabled={busy} value={voidPeriod} onValueChange={setVoidPeriod} accessibilityLabel="Anular el período" /><Text style={[text, { flex: 1 }]}>Anular el período y retirar su acceso concedido</Text></View>
            </>}
            {['PAY','UPGRADE','REFUND'].includes(kind) && <>
              <Text style={text}>{kind === 'UPGRADE' ? 'Si se ha acordado una diferencia económica, registra el pago recibido. No se calcula ningún prorrateo.' : 'Registra únicamente un pago o una devolución ya realizados fuera de HERA.'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}><Input editable={!busy} containerStyle={fieldStyle} accessibilityLabel="Importe en euros" label={kind === 'UPGRADE' ? 'Importe recibido en euros (opcional)' : 'Importe en euros'} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" maxLength={12} placeholder="29,99" helperText="Máximo dos decimales. Admite coma o punto." error={fieldErrors.amount} rightIcon={<Text style={text}>€</Text>} />
              <View style={fieldStyle}><MadridDateField disabled={busy} label={kind === 'REFUND' ? 'Fecha de devolución' : 'Fecha del pago'} value={paidDate} onChange={setPaidDate} error={fieldErrors.paidDate} /></View>
              <Input editable={!busy} containerStyle={fieldStyle} label="Medio" accessibilityLabel="Medio" value={method} onChangeText={setMethod} maxLength={50} error={fieldErrors.method} />
              <Input editable={!busy} containerStyle={fieldStyle} label="Referencia del pago externo" accessibilityLabel="Referencia del pago externo" value={reference} onChangeText={setReference} maxLength={120} error={fieldErrors.reference} /></View>
            </>}
            <Input editable={!busy} label="Motivo de la operación" accessibilityLabel="Motivo de la operación" value={reason} onChangeText={setReason} maxLength={500} multiline error={fieldErrors.reason} />
            <Button onPress={() => { void preview(); }} loading={busy} disabled={loading}>Revisar consecuencias</Button>
          {!!actionError && !proposal && <Text accessibilityRole="alert" style={[text, { color: theme.error }]}>{actionError}</Text>}
        </View>
        <Text accessibilityRole="header" style={[strong, { fontSize: 20 }]}>Historial</Text>
        {!data.history?.length && <Text style={text}>Todavía no hay operaciones administrativas.</Text>}
        {data.history?.map(event => <View key={event.id} style={{ gap: 6, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <Text style={strong}>{actions.find(a => a.value === event.kind)?.label ?? event.kind} · {service.subscriptionDate(event.createdAt)}</Text>
          <Text style={text}>{event.reason}</Text><Text style={[text, { fontSize: 12 }]}>Responsable: {event.actorId}</Text>
          {event.details.additions.map(p => <Text key={p.startsAt} style={text}>Período concedido {p.plan}: {service.subscriptionDate(p.startsAt)} – {service.subscriptionDate(p.endsAt)}.</Text>)}
          {event.details.after.filter(p => {
            const previous = event.details.before.find(before => before.id === p.id);
            return !previous || previous.plan !== p.plan || previous.startsAt !== p.startsAt || previous.endsAt !== p.endsAt || previous.voidedAt !== p.voidedAt;
          }).map(p => <Text key={p.id} style={text}>Período modificado {p.plan}: {service.subscriptionDate(p.startsAt)} – {service.subscriptionDate(p.endsAt)}{p.voidedAt ? ' · Anulado' : ''}.</Text>)}
          {event.kind === 'DOWNGRADE' && event.details.nextPlan && <Text style={text}>Bajada prevista a {event.details.nextPlan}, pendiente de pago.</Text>}
          {event.details.payment && <Text style={text}>{(event.details.payment.amountCents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} · {service.subscriptionDate(event.details.payment.paidAt)} · {event.details.payment.method} · Ref. {event.details.payment.reference}</Text>}
          <Text style={text}>{event.details.notice}</Text>
        </View>)}
      </>}
    </View>
  </ScrollView>
  {proposal && <SubscriptionConfirmation command={proposal.command} preview={proposal.preview} operationLabel={actions.find(action => action.value === proposal.command.kind)?.label ?? proposal.command.kind}
    specialistName={data?.specialist?.name} busy={busy} error={actionError} onConfirm={() => { void confirm(); }} onClose={() => { if (!busyRef.current) { setProposal(null); setActionError(''); } }} />}
  </>;
}

function AdminSubscriptionList({ onOpen }: { onOpen: (id: string) => void }) {
  const { theme } = useTheme(); const compact = useWindowDimensions().width < 768;
  const [section, setSection] = useState<'requests'|'accounts'>('requests');
  const [plan, setPlan] = useState<service.SubscriptionPlan | ''>(''); const [status, setStatus] = useState('PENDING');
  const [trial, setTrial] = useState(false); const [expiring, setExpiring] = useState(false); const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0); const [requests, setRequests] = useState<service.AdminSubscriptionRequests | null>(null);
  const [accounts, setAccounts] = useState<service.SubscriptionAccounts | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const text = { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 23 };
  const strong = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    void Promise.all([service.listSubscriptionRequests({ plan: plan && plan !== 'DIRECTORIO' ? plan : undefined, status: status || undefined, page: section === 'requests' ? page : 1 }, controller.signal),
      service.listSubscriptionAccounts({ plan: plan || undefined, trial, expiring, page: section === 'accounts' ? page : 1 }, controller.signal)])
      .then(([r, a]) => { setRequests(r); setAccounts(a); }).catch(e => { if (!controller.signal.aborted) setError(getErrorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort();
  }, [section, plan, status, trial, expiring, page, revision]);
  const total = section === 'requests' ? requests?.total ?? 0 : accounts?.total ?? 0;
  return <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: compact ? 18 : 28 }} keyboardShouldPersistTaps="handled">
    <View style={{ maxWidth: 1440, width: '100%', alignSelf: 'center', gap: 22, paddingBottom: 24 }}>
      <Text style={text}>Solicitudes, pruebas y pagos confirmados por HERA.</Text>
      {accounts && <View style={{ flexDirection: 'row', gap: compact ? 12 : 24, padding: compact ? 16 : 20, borderRadius: 12, backgroundColor: theme.successLight }}>{[
        [accounts.metrics.pending, 'Solicitudes pendientes'], [accounts.metrics.firstPayments, 'Primeros pagos'], [accounts.metrics.renewals, 'Renovaciones confirmadas'],
      ].map(([value, label], index) => <View key={String(label)} style={{ gap: 6, flex: 1, minWidth: 0 }}><Text style={[strong, { fontSize: 28, color: index === 0 ? theme.warning : theme.success }]}>{value}</Text><Text style={[text, compact && { fontSize: 12, lineHeight: 19 }]}>{label}</Text></View>)}</View>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><Button variant={section === 'requests' ? 'primary' : 'outline'} onPress={() => { setSection('requests'); setPage(1); if (plan === 'DIRECTORIO') setPlan(''); }}>Solicitudes</Button><Button variant={section === 'accounts' ? 'primary' : 'outline'} onPress={() => { setSection('accounts'); setPage(1); }}>Especialistas</Button><View style={{ marginLeft: compact ? 0 : 'auto' }}><Button variant="ghost" onPress={() => setRevision(v => v + 1)}>Actualizar</Button></View></View>
      <View style={{ flexDirection: compact ? 'column' : 'row', alignItems: compact ? 'stretch' : 'center', gap: 12 }}>
      <View style={{ flex: compact ? undefined : 1 }}><SimpleDropdown<service.SubscriptionPlan | ''> value={plan} options={[{ value: '', label: 'Todos los planes' }, ...(section === 'accounts' ? [{ value: 'DIRECTORIO' as const, label: 'Directorio' }] : []), ...plans]} onSelect={v => { setPlan(v); setPage(1); }} accessibilityLabel="Filtrar plan" presentation="portal" /></View>
      {section === 'requests' ? <View style={{ flex: compact ? undefined : 1 }}><SimpleDropdown value={status} options={[{ value: 'PENDING', label: 'Pendientes' }, { value: 'RESOLVED', label: 'Resueltas' }, { value: 'REJECTED', label: 'No aprobadas' }, { value: '', label: 'Todas' }]} onSelect={v => { setStatus(v); setPage(1); }} accessibilityLabel="Estado de solicitud" presentation="portal" /></View>
        : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Switch value={trial} onValueChange={v => { setTrial(v); setPage(1); }} accessibilityLabel="Solo pruebas" /><Text style={text}>Solo pruebas</Text></View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Switch value={expiring} onValueChange={v => { setExpiring(v); setPage(1); }} accessibilityLabel="Vencen en siete días" /><Text style={text}>Vencen en siete días</Text></View></View>}
      </View>
      {loading ? <ActivityIndicator accessibilityLabel="Cargando suscripciones" color={theme.primary} /> : error ? <Text accessibilityRole="alert" style={text}>{error}</Text> : <>
        {!total && <Text style={text}>No hay resultados con estos filtros.</Text>}
        {section === 'requests' ? requests?.items.map(row => <RequestRow key={row.id} row={row} onOpen={onOpen} onChange={() => setRevision(v => v + 1)} />)
          : accounts?.items.map(row => <View key={row.id} style={{ gap: 16, flexDirection: compact ? 'column' : 'row', alignItems: compact ? 'stretch' : 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: theme.border }}><View style={{ gap: 6, flex: compact ? undefined : 1, minWidth: 0 }}>
            <Text style={[strong, { fontSize: 17 }]}>{row.name}</Text><Text style={text}>{row.email}</Text>
            <Text style={[text, { color: row.kind ? theme.success : theme.textSecondary }]}>{plans.find(p => p.value === row.plan)?.label ?? 'Directorio'}{row.kind === 'TRIAL' ? ' · Prueba gratuita' : row.kind ? ' · Suscripción activa' : ''}{row.endsAt ? ` · Hasta ${service.subscriptionDate(row.endsAt)}` : ''}</Text></View>
            <View style={{ alignSelf: compact ? 'flex-start' : undefined }}><Button variant="outline" onPress={() => onOpen(row.id)}>Gestionar suscripción</Button></View>
          </View>)}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Button variant="ghost" disabled={page <= 1} onPress={() => setPage(v => v - 1)}>Anterior</Button><Text style={text}>Página {page} · {total} resultados</Text><Button variant="ghost" disabled={page * 30 >= total} onPress={() => setPage(v => v + 1)}>Siguiente</Button></View>
      </>}
    </View>
  </ScrollView>;
}

function RequestRow({ row, onChange, onOpen }: { row: service.AdminSubscriptionRequests['items'][number]; onChange: () => void; onOpen: (id: string) => void }) {
  const { theme } = useTheme(); const compact = useWindowDimensions().width < 1024;
  const [expanded, setExpanded] = useState(false);
  const [sid, setSid] = useState(row.specialistId ?? ''); const [verified, setVerified] = useState(false); const [reason, setReason] = useState('');
  const [search, setSearch] = useState(''); const [matches, setMatches] = useState<service.SubscriptionAccounts['items']>([]);
  const [searching, setSearching] = useState(false); const [showConditions, setShowConditions] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const text = { color: theme.textSecondary, fontFamily: theme.fontSans, lineHeight: 22 };
  async function resolve(status: 'PENDING' | 'RESOLVED' | 'REJECTED') {
    setBusy(true); setError('');
    try { await service.resolveSubscriptionRequest(row.id, { status, reason, ...(sid && !row.specialistId ? { specialistId: sid.trim(), ...(verified ? { identityVerified: true as const } : {}) } : {}) }); onChange(); }
    catch (e) { setError(getErrorMessage(e)); } finally { setBusy(false); }
  }
  return <View style={{ gap: 12, padding: 20, borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: theme.bgCard }}>
    <View style={{ flexDirection: compact ? 'column' : 'row', gap: 16, alignItems: compact ? 'stretch' : 'center' }}>
    <View style={{ gap: 8, flex: compact ? undefined : 1, minWidth: 0 }}>
    <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 17 }}>{row.specialist?.name ?? `${row.contact?.firstName ?? ''} ${row.contact?.lastName ?? ''}`.trim()}</Text>
    <Text style={text}>{row.specialist?.email ?? row.contact?.email} · {row.plan ?? 'Finalización'} · {service.subscriptionDate(row.createdAt)}</Text>
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <Ionicons name={row.status === 'PENDING' ? 'time-outline' : row.status === 'RESOLVED' ? 'checkmark-circle' : 'close-circle-outline'} size={18} color={row.status === 'PENDING' ? theme.warning : row.status === 'RESOLVED' ? theme.success : theme.error} accessible={false} />
      <Text style={[text, { flex: 1 }]}>{{ TRIAL: 'Prueba gratuita', CHANGE: 'Cambio de plan', RENEW: 'Continuidad', CANCEL: 'Finalización' }[row.kind]} · <Text style={{ color: row.status === 'PENDING' ? theme.warning : row.status === 'RESOLVED' ? theme.success : theme.error }}>{row.status === 'PENDING' ? 'Pendiente' : row.status === 'RESOLVED' ? 'Resuelta' : 'No aprobada'}</Text></Text>
    </View>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button variant={row.specialistId ? 'ghost' : 'outline'} onPress={() => setExpanded(value => !value)}>{expanded ? 'Cerrar revisión' : row.status === 'PENDING' ? 'Revisar solicitud' : 'Ver detalle'}</Button>
      {row.specialistId && <Button variant="outline" onPress={() => { if (row.specialistId) onOpen(row.specialistId); }}>Gestionar suscripción</Button>}
    </View>
    </View>
    {expanded && <>
    <Text style={[text, { color: row.deliveryStatus === 'FAILED' ? theme.error : theme.textSecondary }]}>Aviso a HERA: {row.deliveryStatus === 'SENT' ? 'enviado' : row.deliveryStatus === 'FAILED' ? 'falló el envío' : 'pendiente de entrega'}</Text>
    {!!row.contact?.phone && <Text style={text}>Teléfono: {row.contact.phone}</Text>}
    {!!row.contact?.licenseNumber && <Text style={text}>Colegiación indicada: {row.contact.licenseNumber}</Text>}
    {row.acceptance && <><Button variant="ghost" onPress={() => setShowConditions(v => !v)}>{showConditions ? 'Ocultar condiciones aceptadas' : 'Ver condiciones aceptadas'}</Button>{showConditions && <View style={{ gap: 8 }}><Text style={text}>Solicitud {row.acceptance.conditionsVersion} · Privacidad {row.acceptance.privacyVersion}</Text>{row.acceptance.paragraphs.map(p => <Text key={p} style={text}>{p}</Text>)}</View>}</>}
    {row.status === 'PENDING' && <>
      {!row.specialistId && <><Input label="Buscar especialista por nombre o email" accessibilityLabel="Buscar especialista por nombre o email" value={search} onChangeText={setSearch} />
        <Button variant="outline" disabled={search.trim().length < 2 || searching} loading={searching} onPress={() => { setSearching(true); setError(''); void service.listSubscriptionAccounts({ search: search.trim(), page: 1 }).then(result => { setMatches(result.items); if (!result.items.length) setError('No se han encontrado especialistas.'); }).catch(e => setError(getErrorMessage(e))).finally(() => setSearching(false)); }}>Buscar cuenta</Button>
        {!!matches.length && <SimpleDropdown value={sid} options={matches.map(m => ({ value: m.id, label: `${m.name} · ${m.email}` }))} onSelect={value => { setSid(value); setVerified(false); }} accessibilityLabel="Cuenta del solicitante" presentation="portal" />}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Switch accessibilityLabel="He comprobado la identidad del solicitante" value={verified} onValueChange={setVerified} /><Text style={[text, { flex: 1 }]}>He comprobado que la cuenta corresponde al solicitante. El email por sí solo no concede acceso.</Text></View></>}
      <Input label="Resolución / motivo" accessibilityLabel="Resolución / motivo" value={reason} onChangeText={setReason} maxLength={500} multiline />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {!row.specialistId && <Button variant="outline" disabled={busy || !verified || !sid || reason.trim().length < 5} onPress={() => { void resolve('PENDING'); }}>Vincular solicitud</Button>}
        <Button disabled={busy || reason.trim().length < 5} onPress={() => { void resolve('RESOLVED'); }}>Marcar resuelta</Button>
        <Button variant="ghost" disabled={busy || reason.trim().length < 5} onPress={() => { void resolve('REJECTED'); }}>No aprobar</Button>
      </View>
      <Text style={[text, { fontSize: 12 }]}>Resolver la solicitud no activa ni modifica un plan. Confirma la operación en la ficha de suscripción.</Text>
    </>}
    {row.deliveryStatus !== 'SENT' && <Button variant="ghost" disabled={busy} onPress={() => { setBusy(true); void service.retrySubscriptionNotification(row.id).then(onChange).catch(e => setError(getErrorMessage(e))).finally(() => setBusy(false)); }}>Reintentar aviso a HERA</Button>}
    </>}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text>}
  </View>;
}
