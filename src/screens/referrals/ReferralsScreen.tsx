import { ReferralPreferencesForm } from './ReferralPreferencesForm';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { ReferralLoadError, ReferralPagination, controlStyles } from './ReferralControls';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkflowButton as Button, WorkflowHeader, WorkflowHeading, WorkflowColumns, WorkflowEmpty, WorkflowBadge, workflow } from './WorkflowUI';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import type { RootStackParamList } from '../../constants/types';
import * as service from '../../services/referralService';
import { rememberReferralIntent, clearPendingReferralIntent, getReferralGuestToken } from '../../services/pendingReferralIntent';
import { ReferralClinicalAccess } from './ReferralAccess';
import { ReferralComposer } from './ReferralComposer';
import { ReferralPatientSelector } from './ReferralPatientSelector';
import { ReferralDetailView } from './ReferralDetail';
import { ReferralCard, ReferralCheck, ReferralField, ReferralText, dateTime, referralStatusLabels, styles } from './ReferralElements';

export function ReferralsScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Referrals'>) {
  const { user, isAuthenticated } = useAuth(); const { theme } = useTheme();
  const professional = user?.type === 'professional';
  const token = getReferralGuestToken(route.params?.id); const [guestSession, setGuestSession] = useState(''); const [challenge, setChallenge] = useState(''); const [code, setCode] = useState('');
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<service.ReferralListItem[]>([]); const [page, setPage] = useState(0); const [more, setMore] = useState(false); const [direction, setDirection] = useState<'SENT' | 'RECEIVED'>('SENT'); const [status, setStatus] = useState<service.ReferralStatus | undefined>();
  const [choosingPatient, setChoosingPatient] = useState(false);
  const [preferences, setPreferences] = useState<service.ReferralPreferences | null>(null); const [showPreferences, setShowPreferences] = useState(false);
  const generation = useRef(0); const submitting = useRef(false);
  const id = route.params?.id; const clientId = route.params?.clientId;
  useEffect(() => { setGuestSession(''); setChallenge(''); setCode(''); setError(''); setMessage(''); }, [id, token, user?.id]);
  const back = () => { navigation.setParams({ id: undefined, clientId: undefined, token: undefined, agreementVersionId: undefined }); setGuestSession(''); setError(''); };
  const load = useCallback(async () => {
    if (!isAuthenticated || id || clientId) return;
    const current = ++generation.current; setLoading(true); setError('');
    try { const data = await service.listReferrals({ page, direction: professional ? direction : undefined, status }); if (current === generation.current) { setItems(data.items); setMore(data.hasMore); } }
    catch (err) { if (current === generation.current) setError(getErrorMessage(err, 'No se pudo cargar la bandeja.')); }
    finally { if (current === generation.current) setLoading(false); }
  }, [isAuthenticated, id, clientId, page, direction, status, professional]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  useEffect(() => { if (isAuthenticated && id) clearPendingReferralIntent(); }, [isAuthenticated, id]);
  const run = async (operation: () => Promise<void>) => {
    if (submitting.current) return; submitting.current = true; setBusy(true); setError('');
    try { await operation(); } catch (err) { setError(getErrorMessage(err, 'No se pudo completar la operación. Reintenta.')); } finally { setBusy(false); submitting.current = false; }
  };
  if (id && token && !isAuthenticated && !guestSession) return <ScrollView contentContainerStyle={workflow.page} keyboardShouldPersistTaps="handled"><ReferralCard style={{ maxWidth: 640, width: "100%", alignSelf: "center" }}><WorkflowHeading icon="mail-outline" title="Tu propuesta privada" /><ReferralText>Verifica tu correo para conocer los profesionales, el precio y la información que puedes autorizar. No necesitas crear una cuenta.</ReferralText>
    <Button loading={busy} onPress={() => void run(async () => { const result = await service.requestReferralOtp(id, token); setChallenge(result.challenge); setMessage('Código solicitado al correo del paciente. Puede tardar unos minutos. Usa el último código recibido.'); })}>{challenge ? 'Solicitar otro código' : 'Enviar código a mi correo'}</Button>
    {challenge ? <><ReferralField label="Código de seis cifras" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} /><Button loading={busy} disabled={!/^\d{6}$/.test(code)} onPress={() => void run(async () => { const result = await service.verifyReferralOtp(id, challenge, code); setGuestSession(result.session); setCode(''); setMessage(''); })}>Verificar y abrir propuesta</Button></> : null}
    {message ? <ReferralText>{message}</ReferralText> : null}{error ? <ReferralText error>{error}</ReferralText> : null}
  </ReferralCard></ScrollView>;
  if (!isAuthenticated && !guestSession) return <ScrollView contentContainerStyle={workflow.page}><ReferralCard style={{ maxWidth: 640, width: "100%", alignSelf: "center" }}><WorkflowHeading icon="lock-closed-outline" title="Accede a tu propuesta" /><ReferralText>Inicia sesión con la cuenta del destinatario. Si recibiste un enlace sin cuenta, abre el enlace completo del correo para verificarlo.</ReferralText><Button onPress={async () => { if (id) await rememberReferralIntent(id); navigation.navigate('Login', { userType: 'CLIENT' }); }}>Entrar como paciente</Button><Button variant="outline" onPress={async () => { if (id) await rememberReferralIntent(id); navigation.navigate('Login', { userType: 'PROFESSIONAL' }); }}>Entrar como profesional</Button></ReferralCard></ScrollView>;
  if (id || clientId) return <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={[styles.page, { maxWidth: 1400, padding: 20 }]} keyboardShouldPersistTaps="handled">
    {guestSession && token ? <Button variant="ghost" onPress={() => { setGuestSession(''); setChallenge(''); setCode(''); }}>Verificar de nuevo mi correo</Button> : null}
    {professional ? <ReferralClinicalAccess>{clinicalToken => id ? <ReferralDetailView id={id} access={{ clinicalToken }} onBack={back} /> : <ReferralComposer clientId={clientId!} agreementVersionId={route.params?.agreementVersionId} access={{ clinicalToken }} onSaved={nextId => navigation.setParams({ id: nextId, clientId: undefined })} onCancel={back} />}</ReferralClinicalAccess>
      : id ? <ReferralDetailView id={id} access={{ guestSession: guestSession || undefined }} onBack={back} /> : <ReferralText error>Esta acción solo está disponible para profesionales.</ReferralText>}
  </ScrollView>;
  return <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={workflow.page} keyboardShouldPersistTaps="handled"><WorkflowHeader eyebrow="CONTINUIDAD DE LA ATENCIÓN" title="Derivaciones" subtitle={professional ? "Propón alternativas y sigue cada paso de la atención compartida." : "Revisa las propuestas de tus profesionales y decide con quién quieres continuar."} />
    <View style={listStyles.toolbar}><View style={listStyles.filters}>
      {professional ? <View style={controlStyles.filter}><Text style={[controlStyles.label, { color: theme.textSecondary, fontFamily: theme.fontSansMedium }]}>Bandeja</Text><SimpleDropdown<'SENT' | 'RECEIVED'> compact presentation="portal" accessibilityLabel="Filtrar por bandeja" highlightSelection={false} options={[{ value: 'SENT', label: 'Enviadas' }, { value: 'RECEIVED', label: 'Recibidas' }]} value={direction} onSelect={value => { setPage(0); setDirection(value); }} /></View> : null}
      <View style={controlStyles.filter}><Text style={[controlStyles.label, { color: theme.textSecondary, fontFamily: theme.fontSansMedium }]}>Estado</Text><SimpleDropdown<service.ReferralStatus | 'ALL'> compact presentation="portal" accessibilityLabel="Filtrar por estado" options={[{ value: 'ALL', label: 'Todos los estados' }, ...(Object.keys(referralStatusLabels) as service.ReferralStatus[]).filter(s => professional || s !== 'DRAFT').map(value => ({ value, label: value === 'PENDING_PATIENT' ? professional ? 'Pendiente del paciente' : 'Pendiente de mí' : referralStatusLabels[value] }))]} value={status ?? 'ALL'} highlightSelection={!!status} maxHeight={360} onSelect={value => { setStatus(value === 'ALL' ? undefined : value); setPage(0); }} /></View>
      {status || direction !== 'SENT' ? <Button size="small" variant="ghost" style={controlStyles.action} onPress={() => { setStatus(undefined); setDirection('SENT'); setPage(0); }}>Limpiar filtros</Button> : null}
    </View>{professional ? <View style={listStyles.actions}><Button size="small" style={controlStyles.action} icon={<Ionicons name="add-outline" size={18} color={theme.actionPrimaryText} />} onPress={() => setChoosingPatient(!choosingPatient)}>Proponer derivación</Button><Button size="small" style={{ ...controlStyles.action, borderColor: theme.border }} textStyle={{ color: theme.textSecondary }} variant="outline" icon={<Ionicons name="options-outline" size={17} color={theme.textSecondary} />} onPress={() => void run(async () => { setPreferences(await service.getReferralPreferences()); setShowPreferences(!showPreferences); })}>Recepción de casos</Button></View> : null}</View>
    {professional ? <>
      {showPreferences && preferences ? <ReferralPreferencesForm initial={preferences} busy={busy} onCancel={() => setShowPreferences(false)} onSave={value => void run(async () => { await service.saveReferralPreferences(value); setPreferences(value); setShowPreferences(false); setMessage('Preferencias guardadas.'); })} /> : null}
      {choosingPatient ? <ReferralCard style={{ zIndex: 1 }}><WorkflowHeading number="01" title="Elige a tu paciente" subtitle="Después podrás preparar la propuesta y buscar profesionales." /><ReferralPatientSelector onSelect={patientId => { setChoosingPatient(false); navigation.setParams({ clientId: patientId }); }} /></ReferralCard> : null}
    </> : null}
    {loading ? <ActivityIndicator accessibilityLabel="Cargando derivaciones" /> : !items.length && !error ? <WorkflowColumns><WorkflowEmpty icon="swap-horizontal-outline" title="No hay propuestas en esta vista" description={status ? "No hay propuestas con este estado. Puedes quitar el filtro para consultar el resto." : professional ? "Las propuestas aparecerán aquí para que puedas seguir su evolución, desde el borrador hasta la aceptación." : "Cuando un profesional te proponga una derivación, podrás revisarla y decidir aquí."} action={status ? <Button variant="outline" onPress={() => { setStatus(undefined); setPage(0); }}>Ver todos los estados</Button> : undefined} /><ReferralCard><WorkflowHeading icon="shield-checkmark-outline" title="Cada paso, con tu paciente" /><WorkflowHeading number="01" title="El profesional propone" subtitle="Prepara el motivo y las opciones de atención." /><WorkflowHeading number="02" title="El paciente elige" subtitle="Decide qué profesional recibe la información y autoriza el intercambio." /><WorkflowHeading number="03" title="El receptor valora" subtitle="Confirma su encaje y disponibilidad antes de aceptar el caso." /></ReferralCard></WorkflowColumns> : !error ? items.map(item => <ReferralCard key={item.id}><WorkflowHeading icon="swap-horizontal-outline" title={item.purpose === "TRANSFER" ? "Continuidad asistencial" : "Atención complementaria"} /><WorkflowBadge label={!professional && item.status === "PENDING_PATIENT" ? "Pendiente de tu decisión" : referralStatusLabels[item.status]} /><ReferralText>{item.origin.user.name}{item.recipient ? ` → ${item.recipient.user.name}` : ''}</ReferralText><ReferralText>{!professional && item.status === "PENDING_PATIENT" ? "Pendiente de tu decisión" : referralStatusLabels[item.status]}{item.expiresAt ? ` · Vence ${dateTime(item.expiresAt)}` : ''}</ReferralText><Button variant="outline" onPress={() => navigation.setParams({ id: item.id })}>Revisar propuesta</Button></ReferralCard>) : null}
    {error ? <ReferralLoadError message={error} loading={loading} onRetry={() => void load()} /> : null}{message ? <ReferralText>{message}</ReferralText> : null}
    {!error && (items.length > 0 || page > 0) ? <ReferralPagination page={page} hasMore={more} loading={loading} onChange={setPage} /> : null}
  </ScrollView>;
}

const listStyles = StyleSheet.create({
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12, flexGrow: 1, flexShrink: 1, flexBasis: 440, minWidth: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, maxWidth: '100%' },
});
