import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { randomUUID } from 'expo-crypto';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { getErrorMessage } from '../../constants/errors';
import { Button } from '../../components/common/Button';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { SubscriptionOverview } from '../../components/subscriptions/SubscriptionOverview';
import { useSubscription } from '../../hooks/useSubscription';
import { getSubscriptionCatalog, requestSubscription, subscriptionDate, trialLabel, type PaidSubscriptionPlan, type SubscriptionCatalog, type SubscriptionRequestKind } from '../../services/subscriptionService';

export function ProfessionalSubscriptionScreen() {
  const { theme } = useTheme(); const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'ProfessionalSubscription'>>();
  const compact = useWindowDimensions().width < 768;
  const { data, loading, error, refresh } = useSubscription();
  const scroll = useRef<ScrollView>(null); const requestsY = useRef(0);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [catalog, setCatalog] = useState<SubscriptionCatalog | null>(null);
  const [plan, setPlan] = useState<PaidSubscriptionPlan>('CALMA');
  const [sending, setSending] = useState(false); const sendingRef = useRef(false);
  const [feedback, setFeedback] = useState(''); const [actionError, setActionError] = useState('');
  const commandKey = useRef<{ kind: SubscriptionRequestKind; plan: PaidSubscriptionPlan; key: string } | null>(null);
  useEffect(() => { const controller = new AbortController(); void getSubscriptionCatalog(controller.signal).then(setCatalog).catch(e => { if (!controller.signal.aborted) setActionError(getErrorMessage(e)); }); return () => controller.abort(); }, [catalogRevision]);
  useEffect(() => {
    if (route.params?.plan && ['CALMA', 'CRECIMIENTO', 'HORIZONTE'].includes(route.params.plan)) setPlan(route.params.plan);
    else if (data?.plan && data.plan !== 'DIRECTORIO') setPlan(data.plan);
  }, [data?.plan, route.params?.plan]);
  const text = { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 23 };
  const strong = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };
  const pending = data?.requests.find(request => request.status === 'PENDING');
  const kind: SubscriptionRequestKind = data?.trialEligible && data.plan === 'DIRECTORIO' ? 'TRIAL' : data?.period && data.plan !== plan ? 'CHANGE' : 'RENEW';
  const label = kind === 'TRIAL' ? 'Solicitar prueba gratuita' : kind === 'CHANGE' ? 'Solicitar cambio de plan' : 'Solicitar continuidad';
  async function submit(action: SubscriptionRequestKind) {
    if (sendingRef.current || pending || !data) return;
    sendingRef.current = true; setSending(true); setActionError(''); setFeedback('');
    if (commandKey.current?.kind !== action || commandKey.current.plan !== plan) commandKey.current = { kind: action, plan, key: randomUUID() };
    try {
      await requestSubscription({ kind: action, plan: action === 'CANCEL' ? undefined : plan, operationKey: commandKey.current.key });
      setFeedback('Solicitud registrada. HERA contactará contigo por email para confirmar los siguientes pasos.'); commandKey.current = null; refresh();
    } catch (failure) { setActionError(getErrorMessage(failure)); }
    finally { sendingRef.current = false; setSending(false); }
  }
  return <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: compact ? 18 : 28 }} keyboardShouldPersistTaps="handled">
    <View style={{ width: '100%', maxWidth: 1440, alignSelf: 'center', gap: 26, paddingBottom: 32 }}>
      {loading && <ActivityIndicator accessibilityLabel="Actualizando suscripción" color={theme.primary} />}
      {!!error && <View style={{ gap: 12 }}><Text accessibilityRole="alert" style={text}>{error}</Text><Button onPress={refresh} variant="outline">Volver a intentar</Button></View>}
      {!!feedback && <Text accessibilityRole="alert" style={[text, { color: theme.primary }]}>{feedback}</Text>}
      {data && <>
        <SubscriptionOverview data={data} action={<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button variant="outline" onPress={() => navigation.navigate('Pricing')}>Cambiar plan</Button>
          {data.plan === 'DIRECTORIO' && <Button variant="ghost" onPress={() => navigation.navigate('HeraCommissions')}>Ver comisiones</Button>}
        </View>} management={<View style={{ gap: 14 }}>
          <Text accessibilityRole="header" style={[strong, { fontSize: 18 }]}>{pending ? 'Solicitud en curso' : kind === 'TRIAL' ? 'Prueba tu primera suscripción' : 'Gestiona tu suscripción'}</Text>
          {pending ? <>
            <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}><Ionicons name="time-outline" size={18} color={theme.warning} accessible={false} /><Text style={[strong, { color: theme.warning }]}>Pendiente de revisión</Text></View>
            <Text style={text}>Recibida el {subscriptionDate(pending.createdAt)}{pending.plan ? ` · ${catalog?.plans.find(p => p.id === pending.plan)?.name ?? pending.plan}` : ''}. HERA la revisará contigo. Tu modalidad no cambia hasta que confirmemos la activación.</Text>
            <View style={{ alignSelf: 'flex-start' }}><Button variant="ghost" onPress={() => scroll.current?.scrollTo({ y: requestsY.current, animated: false })}>Ver mi solicitud</Button></View>
          </> : <>
            <Text style={text}>{kind === 'TRIAL' ? `Puedes solicitar ${trialLabel(data.trialPolicy)} de prueba gratuita de la suscripción. HERA confirmará su activación por email. Solo se concede una vez.` : 'Los cambios y pagos se acuerdan con HERA por email. Enviar la solicitud no realiza ningún cobro ni cambia el acceso.'}</Text>
            <SimpleDropdown<PaidSubscriptionPlan> value={plan} accessibilityLabel="Plan solicitado" options={(catalog?.plans ?? []).flatMap(p => p.id === 'DIRECTORIO' ? [] : [{ value: p.id, label: `${p.name} · ${(p.monthlyCents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/mes + IVA` }])} onSelect={setPlan} presentation="portal" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Button onPress={() => { void submit(kind); }} disabled={!catalog || loading} loading={sending}>{label}</Button>
              {data.period && !data.cancelAtEnd && <Button variant="ghost" disabled={loading || sending} onPress={() => { void submit('CANCEL'); }}>Solicitar finalización al vencimiento</Button>}
            </View>
          </>}
          {!catalog && !loading && <Button variant="ghost" onPress={() => setCatalogRevision(v => v + 1)}>Volver a cargar los planes</Button>}
          {!!actionError && <Text accessibilityRole="alert" style={[text, { color: theme.error }]}>{actionError}</Text>}
        </View>} />
        {!!data.requests.length && <View onLayout={event => { requestsY.current = event.nativeEvent.layout.y; }} style={{ gap: 12 }}><Text accessibilityRole="header" style={[strong, { fontSize: 18 }]}>Tus solicitudes</Text>
          {data.requests.map(request => <View key={request.id} style={{ gap: 4, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 12 }}>
            <Text style={strong}>{request.kind === 'CANCEL' ? 'Finalización' : request.kind === 'TRIAL' ? 'Prueba gratuita' : request.kind === 'CHANGE' ? 'Cambio de plan' : 'Continuidad'}{request.plan ? ` · ${catalog?.plans.find(p => p.id === request.plan)?.name ?? request.plan}` : ''}</Text>
            <Text style={text}>{subscriptionDate(request.createdAt)} · <Text style={{ color: request.status === 'PENDING' ? theme.warning : request.status === 'RESOLVED' ? theme.success : theme.error }}>{request.status === 'PENDING' ? 'Pendiente' : request.status === 'RESOLVED' ? 'Resuelta' : 'No aprobada'}</Text></Text>
            {!!request.resolution && <Text style={text}>{request.resolution}</Text>}
          </View>)}
        </View>}
      </>}
    </View>
  </ScrollView>;
}
