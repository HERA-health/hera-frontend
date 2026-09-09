import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { WorkflowButton as Button, WorkflowHeading, WorkflowColumns, WorkflowNotice, WorkflowBadge, WorkflowSelect, WorkflowHint } from './WorkflowUI';
import { getErrorMessage } from '../../constants/errors';
import type { AppNavigationProp } from '../../constants/types';
import * as service from '../../services/referralService';
import { ReferralCard, ReferralCheck, ReferralText, dateTime, money, referralStatusLabels, styles } from './ReferralElements';
import { ReferralComposer } from './ReferralComposer';
import { BookingScreen } from '../booking/BookingScreen';
import { openPrivateDocument } from '../../utils/openPrivateDocument';

export function ReferralDetailView({ id, access, onBack }: { id: string; access: service.ReferralAccess; onBack: () => void }) {
  const navigation = useNavigation<AppNavigationProp>();
  const [detail, setDetail] = useState<service.ReferralDetail | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [selected, setSelected] = useState('');
  const [adult, setAdult] = useState(false); const [coordination, setCoordination] = useState(false); const [competent, setCompetent] = useState(false); const [sharing, setSharing] = useState(false);
  const [reasonCode, setReasonCode] = useState<service.ReferralDecision['reasonCode']>('OTHER'); const [editing, setEditing] = useState(false); const [reproposing, setReproposing] = useState(false);
  const [booking, setBooking] = useState(false);
  const referralBooking = useMemo(() => ({ id, access: { guestSession: access.guestSession } }), [id, access.guestSession]);
  const generation = useRef(0); const mutating = useRef(false);
  const pending = useRef<{ fingerprint: string; input: service.ReferralDecision } | null>(null);
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setError('');
    try { const data = await service.getReferral(id, access); if (generation.current === current) { setDetail(data); setSelected(data.recipientId || (data.candidates.length === 1 ? data.candidates[0].id : '')); setAdult(false); setSharing(false); setCompetent(false); setCoordination(false); } }
    catch (err) { if (generation.current === current) { setDetail(null); setError(getErrorMessage(err, 'No se pudo cargar la propuesta.')); } }
    finally { if (generation.current === current) setLoading(false); }
  }, [id, access.clinicalToken, access.guestSession]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  const run = async (operation: () => Promise<unknown>, success: string) => {
    if (mutating.current) return; mutating.current = true; setBusy(true); setError(''); setMessage('');
    try { await operation(); await load(); setMessage(success); }
    catch (err) { setError(getErrorMessage(err, 'No se pudo completar. Puedes reintentar o actualizar la propuesta.')); }
    finally { setBusy(false); mutating.current = false; }
  };
  const decide = (action: service.ReferralDecision['action']) => {
    if (!detail) return;
    const values = { revision: detail.revision, action, ...(action === 'CONFIRM_ATTENDANCE' ? { sessionId: detail.milestones.confirmableSession?.id } : {}), ...(action === 'AUTHORIZE' ? { recipientId: selected, adultAndSelfDeciding: true as const, coordinationAuthorized: coordination } : {}), ...(action === 'ACCEPT' ? { competentAndAvailable: true as const } : {}), ...(action === 'REJECT' ? { reasonCode: detail.role === 'PATIENT' ? 'PATIENT_CHOICE' as const : reasonCode } : {}) };
    const fingerprint = JSON.stringify(values);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, input: { ...values, commandKey: Crypto.randomUUID() } };
    const input = pending.current.input;
    void run(() => service.decideReferral(id, input, access), action === 'POSTPONE' ? 'Puedes volver a decidir antes del vencimiento.' : 'Tu decisión se ha guardado.');
  };
  const upload = async () => {
    if (!detail) return;
    try {
      const chosen = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true });
      if (chosen.canceled) return;
      await run(() => service.uploadReferralDocument(id, detail.revision, chosen.assets[0], access), 'Documento incorporado al borrador.');
    } catch (err) { setError(getErrorMessage(err, 'No se pudo abrir el documento. Vuelve a seleccionarlo.')); }
  };
  const download = async (doc: service.ReferralDetail['documents'][number]) => {
    await run(async () => {
      const bytes = await service.downloadReferralDocument(id, doc.id, access);
      await openPrivateDocument(bytes, doc.id, doc.fileName, doc.mimeType);
    }, 'Documento descargado.');
  };
  if (loading && !detail) return <ActivityIndicator accessibilityLabel="Cargando propuesta" />;
  if (!detail) return <ReferralCard><ReferralText error>{error}</ReferralText><Button onPress={() => void load()}>Reintentar</Button><Button variant="ghost" onPress={onBack}>Volver</Button></ReferralCard>;
  if (booking && detail.recipientId) return <BookingScreen route={{ params: { specialistId: detail.recipientId } }} referralBooking={referralBooking} navigation={{ goBack: () => { setBooking(false); void load(); }, navigate: screen => { setBooking(false); if (screen === 'PublicSpecialists') navigation.navigate('PublicSpecialists'); else void load(); } }} />;
  if ((editing || reproposing) && detail.client) return <ReferralComposer clientId={detail.client.id} initial={editing ? detail : undefined} previousId={reproposing ? id : undefined} access={access} onCancel={() => { setEditing(false); setReproposing(false); }} onSaved={nextId => { setEditing(false); setReproposing(false); if (nextId === id) void load(); else navigation.navigate('Referrals', { id: nextId }); }} />;
  const canDecide = detail.role === 'PATIENT' && detail.status === 'PENDING_PATIENT';
  const candidate = detail.candidates.find(c => c.id === detail.recipientId);
  return <><View style={styles.row}><Button variant="ghost" onPress={onBack}>Volver a derivaciones</Button><Button variant="ghost" disabled={busy} onPress={() => void load()}>Actualizar</Button></View>
    <WorkflowColumns><View style={{ gap: 20 }}><ReferralCard><WorkflowHeading icon="document-text-outline" title="Información de la propuesta" /><WorkflowBadge label={detail.role === "PATIENT" && detail.status === "PENDING_PATIENT" ? "Pendiente de tu decisión" : referralStatusLabels[detail.status]} /><ReferralText title>{detail.purpose === 'TRANSFER' ? 'Continuidad con otro profesional' : 'Atención complementaria'}</ReferralText><ReferralText>{detail.role === 'PATIENT' && detail.status === 'PENDING_PATIENT' ? 'Pendiente de tu decisión' : referralStatusLabels[detail.status]}{detail.expiresAt ? ` · Vence el ${dateTime(detail.expiresAt)}` : ''}</ReferralText><ReferralText>Propuesta de {detail.origin.name}{detail.client ? ` · ${detail.client.name}` : ''}</ReferralText>
      {detail.economicInterest ? <ReferralText>Existe un interés económico: {detail.origin.name} recibe el {detail.economicInterest.originShareBps / 100}% de la base elegible cobrada por el receptor, según el acuerdo entre ambos. El receptor presta la atención y te factura. Este reparto no añade un cargo al precio que aceptas. Puedes rechazar esta propuesta y pedir alternativas. El acuerdo no da acceso general a tu historia clínica.</ReferralText> : null}
      {detail.content ? <><ReferralText>{detail.content.explanation}</ReferralText>{detail.content.needs ? <><ReferralText title>Necesidades y preferencias</ReferralText><ReferralText>{detail.content.needs}</ReferralText></> : null}{detail.content.summary ? <><ReferralText title>Resumen que se comparte</ReferralText><ReferralText>{detail.content.summary}</ReferralText></> : <ReferralText>No se incluye un resumen clínico.</ReferralText>}{detail.content.transition ? <><ReferralText title>Continuidad y citas pendientes</ReferralText><ReferralText>{detail.content.transition}</ReferralText></> : null}</> : <ReferralText>El acceso temporal a la información compartida ha terminado.</ReferralText>}
      {detail.documents.map(doc => <View key={doc.id} style={styles.row}><Button disabled={busy} variant="outline" onPress={() => void download(doc)}>{doc.fileName} · {Math.ceil(doc.sizeBytes / 1024)} KB</Button>{detail.role === 'ORIGIN' && detail.status === 'DRAFT' ? <Button variant="ghost" disabled={busy} onPress={() => void run(() => service.removeReferralDocument(id, doc.id, detail.revision, access), 'Documento retirado del borrador.')}>Quitar</Button> : null}</View>)}
      {detail.role === 'ORIGIN' && detail.status === 'DRAFT' ? <View style={styles.row}><Button variant="outline" disabled={busy} onPress={() => setEditing(true)}>Editar borrador</Button><Button variant="outline" disabled={busy} onPress={() => void upload()}>Adjuntar documento</Button><Button loading={busy} onPress={() => decide('SEND')}>Enviar al paciente</Button></View> : null}
    </ReferralCard></View><View style={{ gap: 20 }}>
    {detail.role === 'ORIGIN' ? <ReferralCard><WorkflowHeading icon="people-outline" title="Profesionales propuestos" subtitle="El paciente decide quién recibe la propuesta." />{detail.candidates.map(profile => <View key={profile.id} style={{ gap: 6 }}><WorkflowHeading title={profile.user.name} /><WorkflowHint>{profile.specialization} · {money(profile.priceCents ?? Math.round(profile.pricePerSession * 100))} por sesión</WorkflowHint></View>)}<WorkflowNotice icon="shield-checkmark-outline">La información solo se comparte tras la autorización del paciente. Esta bandeja no es un canal de urgencias.</WorkflowNotice></ReferralCard> : null}
    {detail.role === 'PATIENT' ? <ReferralCard><ReferralText title>{canDecide ? 'Elige quién recibe tu propuesta' : 'Profesionales propuestos'}</ReferralText><ReferralText>Puedes rechazar o posponer. También puedes contactar por tu cuenta con cualquier profesional dentro o fuera de HERA. Ningún candidato recibe tus datos hasta que lo elijas y autorices el intercambio.</ReferralText>
      {detail.candidates.map(c => <ReferralCard key={c.id}><ReferralText title>{c.user.name}</ReferralText><ReferralText>{c.specialization} · {money(c.priceCents ?? Math.round(c.pricePerSession * 100))} por sesión</ReferralText><Button variant="ghost" onPress={() => navigation.navigate('PublicSpecialistProfile', { profileRef: c.publicSlug || c.id })}>Ver perfil</Button>{canDecide ? <ReferralCheck checked={selected === c.id} onChange={() => setSelected(c.id)} label={`Elegir a ${c.user.name}`} disabled={busy} /> : null}</ReferralCard>)}
      {canDecide ? <><WorkflowHint>Para enviar, confirma tu mayoría de edad y autoriza el intercambio. Compartir el seguimiento de citas es opcional.</WorkflowHint><ReferralCheck label="Soy mayor de edad y decido por mí mismo, sin representación" checked={adult} onChange={setAdult} disabled={busy} /><ReferralCheck label="Autorizo enviar al profesional elegido la explicación, el resumen y los documentos que acabo de revisar" checked={sharing} onChange={setSharing} disabled={busy} /><ReferralCheck label="Autorizo comunicar al origen si he reservado y si ha ocurrido la primera atención" checked={coordination} onChange={setCoordination} disabled={busy} /><View style={styles.row}><Button disabled={!adult || !sharing || !selected} loading={busy} onPress={() => decide('AUTHORIZE')}>Autorizar y enviar al elegido</Button><Button variant="outline" disabled={busy} onPress={() => decide('POSTPONE')}>Decidir más tarde</Button><Button variant="ghost" disabled={busy} onPress={() => decide('REJECT')}>Rechazar la propuesta</Button></View></> : null}
      {['PENDING_RECIPIENT', 'ACCEPTED'].includes(detail.status) && !detail.withdrawnAt ? <><ReferralText>Puedes retirar futuros intercambios. Una descarga previa no puede deshacerse y la documentación incorporada legítimamente a la atención puede tener que conservarse. Retirar el intercambio no cancela atención ni saldos económicos válidos.</ReferralText><Button variant="outline" disabled={busy} onPress={() => decide('WITHDRAW')}>Retirar futuros intercambios</Button></> : null}
    </ReferralCard> : null}
    {detail.role === 'RECIPIENT' && detail.status === 'PENDING_RECIPIENT' ? <ReferralCard><ReferralText title>Valora el caso</ReferralText><ReferralCheck label="Confirmo mi competencia, encaje y disponibilidad para atender este caso" checked={competent} onChange={setCompetent} disabled={busy} /><Button disabled={!competent} loading={busy} onPress={() => decide('ACCEPT')}>Aceptar el caso</Button><ReferralText>Si necesitas más información, el origen preparará una revisión y el paciente deberá autorizarla de nuevo.</ReferralText><Button variant="outline" disabled={busy} onPress={() => decide('REQUEST_INFORMATION')}>Pedir una nueva revisión con más información</Button><WorkflowSelect label="Motivo si rechazas el caso" value={reasonCode ?? "OTHER"} options={[{ value: "CAPACITY", label: "Sin disponibilidad" }, { value: "COMPETENCE", label: "Fuera de mi competencia" }, { value: "OTHER", label: "Otro motivo" }]} onSelect={value => { if (!busy) setReasonCode(value); }} /><Button variant="ghost" disabled={busy} onPress={() => decide('REJECT')}>Rechazar el caso</Button></ReferralCard> : null}
    {detail.status === 'ACCEPTED' ? <ReferralCard><ReferralText title>Relación asistencial aceptada</ReferralText><ReferralText>{detail.milestones.visible ? ((detail.milestones.booked ? 'Cita reservada' : 'Sin cita registrada') + ' · ' + (detail.milestones.attended ? 'Primera atención realizada' : 'Primera atención pendiente')) : 'El paciente no ha autorizado el seguimiento de citas y atención.'}</ReferralText><ReferralText>La aceptación del caso, la autorización para compartir y el consentimiento asistencial son decisiones separadas.</ReferralText>
      {detail.role === 'RECIPIENT' && detail.milestones.confirmableSession ? <><ReferralText>La cita del {dateTime(detail.milestones.confirmableSession.date)} ha terminado por horario. Confirma únicamente si la atención ocurrió realmente.</ReferralText><Button disabled={busy} onPress={() => decide('CONFIRM_ATTENDANCE')}>Confirmar primera atención realizada</Button></> : null}
      {detail.role === 'PATIENT' && detail.recipientId ? <Button onPress={() => access.guestSession ? setBooking(true) : navigation.navigate('Booking', { specialistId: detail.recipientId! })}>Reservar con {candidate?.user.name || 'el profesional'}</Button> : null}
      {detail.role === 'RECIPIENT' && detail.client ? <Button onPress={() => navigation.navigate('ClientProfile', { clientId: detail.client!.id, initialTab: 'clinical' })}>Abrir mi ficha y gestionar el consentimiento</Button> : null}
      {detail.role === 'ORIGIN' && detail.purpose === 'TRANSFER' && detail.client ? <><ReferralText>Cierra tu relación solo cuando hayas acordado la transición. Las citas existentes se gestionan por separado.</ReferralText><Button variant="outline" disabled={busy} onPress={() => void run(() => service.closePrivateCare(detail.client!.id), 'Tu relación asistencial se ha cerrado. La identidad del paciente y su atención con el receptor se conservan.')}>Cerrar mi relación asistencial</Button></> : null}
    </ReferralCard> : null}
    {detail.role === 'ORIGIN' && ['DRAFT', 'PENDING_PATIENT', 'PENDING_RECIPIENT'].includes(detail.status) ? <Button variant="ghost" disabled={busy} onPress={() => decide('CANCEL')}>Cancelar propuesta</Button> : null}
    {['REJECTED', 'CANCELLED', 'EXPIRED'].includes(detail.status) ? <ReferralCard><ReferralText>Esta propuesta no ha activado una nueva atención. El origen puede preparar otras opciones; el paciente puede contactar por su cuenta con otro profesional.</ReferralText>{detail.role === 'ORIGIN' && detail.client ? <Button onPress={() => setReproposing(true)}>Preparar nueva propuesta</Button> : null}</ReferralCard> : null}
    {detail.deliveries.length ? <ReferralCard><ReferralText>Avisos por correo: {detail.deliveries.some(d => d.status === 'FAILED') ? 'Hay un envío fallido' : detail.deliveries.some(d => d.status !== 'SENT') ? 'Envío pendiente' : 'Enviados'}. La propuesta está guardada.</ReferralText>{detail.deliveries.some(d => d.status === 'FAILED') ? <Button variant="outline" disabled={busy} onPress={() => void run(() => service.retryReferralNotifications(id), 'Reintento de correo programado.')}>Reintentar avisos</Button> : null}</ReferralCard> : null}
    </View></WorkflowColumns>
    {message ? <ReferralText>{message}</ReferralText> : null}{error ? <ReferralText error>{error}</ReferralText> : null}
  </>;
}
