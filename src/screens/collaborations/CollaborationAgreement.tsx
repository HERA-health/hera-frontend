import { useCollaborationClock } from './useCollaborationClock';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WorkflowButton as Button, WorkflowHeading, WorkflowColumns, WorkflowNotice, WorkflowBadge, WorkflowDate, WorkflowHint, WorkflowDisclosure, workflow } from '../referrals/WorkflowUI';
import * as service from '../../services/collaborationService';
import { ReferralCard as Card, ReferralText as Text, ReferralField as Field, ReferralCheck as Check, dateTime, styles } from '../referrals/ReferralElements';
import { getMadridDateKey, parseMadridDateTime } from '../../utils/madridTime';

export type CollaborationRun = (values: unknown, operation: (commandKey: string) => Promise<unknown>) => Promise<boolean>;
export const toCents = (value: string) => {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error('Escribe un importe positivo con un máximo de dos decimales.');
  const [whole, fraction = ''] = value.trim().replace(',', '.').split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > 100_000_000) throw new Error('El importe supera el límite permitido.');
  return cents;
};
const dateValue = (value: string, end = false) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Usa una fecha AAAA-MM-DD.');
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Revisa la fecha.');
  if (end) date.setUTCDate(date.getUTCDate() + 1);
  const parsed = parseMadridDateTime(end ? date.toISOString().slice(0, 10) : value, '00:00');
  if (!parsed) throw new Error('Revisa la fecha en el calendario de Madrid.');
  return parsed.iso;
};
export function CollaborationTermsForm({ initial, busy, onSubmit, onCancel, introduction }: { introduction?: React.ReactNode; initial?: service.CollaborationVersion; busy: boolean; onSubmit: (terms: service.CollaborationTerms) => Promise<void>; onCancel: () => void }) {
  const [object, setObject] = useState(initial?.object ?? ''); const [scope, setScope] = useState(initial?.scope ?? ''); const [termination, setTermination] = useState(initial?.terminationClause ?? 'Cualquiera de las partes puede finalizar la colaboración con efectos desde una fecha futura comunicada en HERA. Se conservan las obligaciones anteriores y la continuidad asistencial del paciente.');
  const territory = 'ES'; const [share, setShare] = useState(String((initial?.originShareBps ?? 2000) / 100));
  const [from, setFrom] = useState(initial ? getMadridDateKey(new Date(initial.validFrom)) : getMadridDateKey()); const [until, setUntil] = useState(initial ? getMadridDateKey(new Date(new Date(initial.validUntil).getTime() - 1)) : '');
  const [online, setOnline] = useState(initial?.sessionTypes.includes('VIDEO_CALL') ?? true); const [inPerson, setInPerson] = useState(initial?.sessionTypes.includes('IN_PERSON') ?? true);
  const [phone, setPhone] = useState(initial?.sessionTypes.includes('PHONE_CALL') ?? false);
  const [attested, setAttested] = useState(false); const [error, setError] = useState('');
  const [showContract, setShowContract] = useState(false);
  const [configuration, setConfiguration] = useState<Awaited<ReturnType<typeof service.getConfiguration>>>([]);
  const [configAttempt, setConfigAttempt] = useState(0);
  const [configurationLoading, setConfigurationLoading] = useState(true);
  useEffect(() => { let active = true; setConfigurationLoading(true); void service.getConfiguration().then(data => { if (active) { setConfiguration(data); setError(''); } }).catch(() => { if (active) setError('No se pudo cargar el texto contractual vigente. Reintenta la consulta.'); }).finally(() => { if (active) setConfigurationLoading(false); }); return () => { active = false; }; }, [configAttempt]);
  const template = configuration.find(entry => entry.territory === territory.trim().toUpperCase());
  useEffect(() => { setAttested(false); }, [template?.templateId, template?.contractText, object, scope, termination, share, from, until, online, inPerson, phone]);
  const save = async () => {
    setError('');
    try {
      if (!template || !attested || !object.trim() || !scope.trim() || !termination.trim() || (!online && !inPerson && !phone)) throw new Error('Revisa el texto contractual, completa las condiciones y confirma tu condición profesional.');
      const originShareBps = toCents(share); if (originShareBps <= 0 || originShareBps >= 10000) throw new Error('El porcentaje debe ser mayor que 0 y menor que 100.');
      const validFrom = dateValue(from); const validUntil = dateValue(until, true); if (validUntil <= validFrom) throw new Error('El fin debe ser posterior al inicio.');
      await onSubmit({ templateId: template.templateId, contractText: template.contractText, territory: territory.trim().toUpperCase(), object: object.trim(), scope: scope.trim(), terminationClause: termination.trim(), originShareBps, validFrom, validUntil, sessionTypes: [...(online ? ['VIDEO_CALL' as const] : []), ...(inPerson ? ['IN_PERSON' as const] : []), ...(phone ? ['PHONE_CALL' as const] : [])], autonomousAndAuthorized: true });
    } catch (err) { setError(err instanceof Error ? err.message : 'Revisa los datos.'); }
  };
  return <>
    <WorkflowNotice icon="shield-checkmark-outline">Ámbito: España · Profesionales independientes · Pacientes adultos. Psiquiatría queda fuera del reparto económico.</WorkflowNotice>
    <WorkflowColumns>
      <Card>
        <WorkflowHeading number="01" title="Personas y servicios" subtitle="Define con quién colaboras y qué vais a ofrecer. Los campos con * son obligatorios." />
        {introduction}
        <Field required label="Objeto real de la colaboración" placeholder="Describe la finalidad y las tareas que realizaréis." multiline value={object} onChangeText={setObject} editable={!busy} maxLength={2000} />
        <Field required label="Alcance de los servicios" placeholder="Concreta las prestaciones, la población atendida y los límites del acuerdo." multiline value={scope} onChangeText={setScope} editable={!busy} maxLength={2000} />
        <WorkflowHeading title="Modalidades incluidas" subtitle="Selecciona al menos una modalidad para las sesiones del acuerdo." />
        <Check label="Consultas online" checked={online} onChange={setOnline} disabled={busy} /><Check label="Consultas presenciales" checked={inPerson} onChange={setInPerson} disabled={busy} /><Check label="Consultas telefónicas" checked={phone} onChange={setPhone} disabled={busy} />
      </Card>
      <Card>
        <WorkflowHeading number="02" title="Reparto y vigencia" subtitle="A es el profesional de origen. B atiende y factura al paciente." />
        <Field required label="Porcentaje para A (%)" placeholder="Ej. 20" hint="Mayor que 0 y menor que 100, con un máximo de dos decimales." keyboardType="decimal-pad" value={share} onChangeText={setShare} editable={!busy} />
        <WorkflowNotice>B atiende y factura al paciente. El porcentaje de A se aplica a la base tras descuentos, excluidos impuestos, según los cobros declarados y la asistencia realizada.</WorkflowNotice>
        <WorkflowDate label="Inicio (AAAA-MM-DD)" value={from} onChangeText={setFrom} disabled={busy} />
        <WorkflowDate label="Último día de vigencia (AAAA-MM-DD)" value={until} onChangeText={setUntil} disabled={busy} />
        <WorkflowHint>Ambas fechas son obligatorias. Calendario de Madrid: la vigencia termina a las 00:00 del día siguiente al último día indicado.</WorkflowHint>
        <Field required label="Cláusula de terminación prospectiva" multiline value={termination} onChangeText={setTermination} editable={!busy} maxLength={2000} />
      </Card>
    </WorkflowColumns>
    <Card>
      <WorkflowHeading number="03" title="Acuerdo entre profesionales" subtitle="Revisa el contrato y las condiciones antes de proponer la colaboración." />
      {configurationLoading ? <ActivityIndicator accessibilityLabel="Cargando contrato vigente" /> : template ? <><WorkflowHint>Incluye independencia asistencial, libertad del paciente, cálculo y liquidación del reparto, facturación, confidencialidad y terminación. Se conservará el texto exacto junto con las condiciones que aceptéis ambos.</WorkflowHint><Button size="small" variant="outline" style={{ alignSelf: 'flex-start' }} onPress={() => setShowContract(value => !value)}>{showContract ? 'Ocultar contrato completo' : 'Leer contrato completo'}</Button>{showContract ? <Text>{template.contractText}</Text> : null}</> : <><Text>No hay un acuerdo disponible para tu perfil en este momento.</Text><Button variant="outline" onPress={() => setConfigAttempt(value => value + 1)}>Reintentar consulta del texto</Button></>}
      <Check checked={attested} disabled={!template || busy} onChange={setAttested} label="Actúo como profesional autónomo habilitado en el territorio indicado y acepto el texto contractual y estas condiciones como origen" />
      {error ? <Text error>{error}</Text> : null}
      <View style={workflow.footer}><WorkflowHint>Si cambias las condiciones, deberás volver a aceptarlas.</WorkflowHint><View style={styles.row}><Button variant="ghost" disabled={busy} onPress={onCancel}>Volver</Button><Button loading={busy} disabled={!attested} onPress={() => void save()}>Proponer estas condiciones</Button></View></View>
    </Card>
  </>;
}

export function CollaborationAgreement({ collaboration, busy, run, onOpen }: { collaboration: service.Collaboration; busy: boolean; run: CollaborationRun; onOpen?: (id: string) => void }) {
  const [editing, setEditing] = useState<'version' | 'restart' | null>(null); const [attested, setAttested] = useState(false); const [reason, setReason] = useState(''); const [cutOff, setCutOff] = useState(''); const [showEnd, setShowEnd] = useState(false); const [changingEnd, setChangingEnd] = useState(false);
  useEffect(() => { setAttested(false); }, [collaboration.versions[0]?.id]);
  const mutate = async (action: service.AgreementAction) => run(action, key => service.decideCollaboration(collaboration.id, action, key));
  const isOrigin = collaboration.role === 'ORIGIN';
  const now = useCollaborationClock([collaboration.terminatedAt]);
  const scheduled = !!collaboration.terminatedAt && Date.parse(collaboration.terminatedAt) > now;
  const ended = !!collaboration.terminatedAt && !scheduled;
  const canChangeEnd = scheduled && collaboration.terminatedBy === (isOrigin ? collaboration.origin.id : collaboration.recipient.id);
  useEffect(() => { setShowEnd(false); setChangingEnd(false); setReason(''); }, [collaboration.terminatedAt]);
  if (editing) return <CollaborationTermsForm initial={editing === 'restart' && collaboration.versions[0] ? { ...collaboration.versions[0], validFrom: new Date().toISOString(), validUntil: new Date(Date.now() + 365 * 86400000).toISOString() } : collaboration.versions[0]} busy={busy} introduction={editing === 'restart' ? <WorkflowHint>Revisa las condiciones y la nueva vigencia. Tu colaborador deberá aceptarlas. El acuerdo anterior y sus liquidaciones se conservan; los pacientes no se trasladan automáticamente.</WorkflowHint> : undefined} onCancel={() => setEditing(null)} onSubmit={async version => {
    if (editing === 'restart' && collaboration.terminatedAt) {
      const action: service.AgreementAction = { action: 'RESTART', expectedCutOff: collaboration.terminatedAt, version };
      if (await run(action, async key => { const result = await service.decideCollaboration(collaboration.id, action, key); onOpen?.(result.id); })) setEditing(null);
    } else if (await mutate({ action: 'VERSION', version })) setEditing(null);
  }} />;
  return <><Card><WorkflowHeading icon="people-outline" title={`${collaboration.origin.name} → ${collaboration.recipient.name}`} /><WorkflowBadge label={scheduled ? "Finalización programada" : ended ? "Colaboración finalizada" : "Acuerdo entre profesionales"} /><Text>{collaboration.terminatedAt ? `No se admiten nuevas incorporaciones. ${scheduled ? "El reparto terminará el" : "El reparto terminó el"} ${dateTime(collaboration.terminatedAt)}. ${collaboration.terminationReason ?? ''}` : 'Cada paciente decide y cada caso requiere la aceptación del receptor.'}</Text><Text>Las sesiones anteriores al cierre conservan sus condiciones. Puedes seguir revisando facturas y registrando los cobros pendientes.</Text>
    {isOrigin && !collaboration.terminatedAt ? <Button variant="outline" onPress={() => setEditing('version')}>Proponer nueva versión</Button> : null}
    {!collaboration.terminatedAt ? <Button variant="ghost" onPress={() => setShowEnd(!showEnd)}>Finalizar colaboración económica</Button> : null}
    {canChangeEnd ? <><Button variant="outline" disabled={busy} onPress={() => { setChangingEnd(!changingEnd); setCutOff(getMadridDateKey(new Date(collaboration.terminatedAt!))); }}>Cambiar o cancelar finalización</Button>{changingEnd ? <><WorkflowDate label="Nueva fecha de finalización (AAAA-MM-DD)" value={cutOff} onChangeText={setCutOff} disabled={busy} /><Field required label="Motivo del cambio" value={reason} onChangeText={setReason} multiline editable={!busy} /><WorkflowHint>La fecha debe seguir siendo futura. Cancelar la finalización permite nuevas incorporaciones mientras el acuerdo esté vigente.</WorkflowHint><Button disabled={busy || !reason.trim()} onPress={() => void run({ action: 'RESCHEDULE_TERMINATION', expectedCutOff: collaboration.terminatedAt, cutOff, reason }, key => service.decideCollaboration(collaboration.id, { action: 'RESCHEDULE_TERMINATION', expectedCutOff: collaboration.terminatedAt!, cutOff: dateValue(cutOff), reason }, key))}>Guardar nueva fecha</Button><Button variant="outline" disabled={busy || !reason.trim()} onPress={() => void mutate({ action: 'CANCEL_TERMINATION', expectedCutOff: collaboration.terminatedAt!, reason })}>Cancelar finalización programada</Button></> : null}</> : null}
    {ended && collaboration.successorId && onOpen ? <Button onPress={() => onOpen(collaboration.successorId!)}>Abrir nuevo acuerdo</Button> : ended && isOrigin && onOpen ? <Button onPress={() => setEditing('restart')}>Volver a colaborar</Button> : null}
    {scheduled && !canChangeEnd ? <WorkflowHint>La fecha de cierre fue comunicada por tu colaborador. Si necesitáis cambiarla, pídele que la actualice antes de que llegue.</WorkflowHint> : null}
    {showEnd && !collaboration.terminatedAt ? <><WorkflowDate label="Fecha de corte futura (AAAA-MM-DD)" value={cutOff} onChangeText={setCutOff} disabled={busy} /><Field label="Motivo y cumplimiento de la cláusula aceptada" multiline value={reason} onChangeText={setReason} /><Text>Se conservan la atención del paciente y las obligaciones de sesiones elegibles anteriores al corte.</Text><Button loading={busy} disabled={!reason.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(cutOff)} onPress={() => void run({ action: 'TERMINATE', cutOff, reason }, key => service.decideCollaboration(collaboration.id, { action: 'TERMINATE', cutOff: dateValue(cutOff), reason }, key))}>Programar finalización</Button></> : null}
  </Card>{collaboration.versions.map(version => <Card key={version.id}><WorkflowColumns><View style={{ gap: 16 }}><Text title>Versión {version.number} · {({ PROPOSED: 'Pendiente del receptor', ACCEPTED: 'Aceptada por ambos', REJECTED: 'Rechazada', SUPERSEDED: 'Sustituida antes de aceptar' })[version.status]}</Text><Text>{version.originShareBps / 100}% para A · EUR · {version.territory}</Text><Text>{dateTime(version.validFrom)} → {dateTime(version.validUntil)}</Text><WorkflowHeading title="Objeto y servicios" /><Text>{version.object}</Text><Text>Alcance: {version.scope} · {version.sessionTypes.map(type => type === 'VIDEO_CALL' ? 'Online' : 'Presencial').join(', ')}</Text><Text>Terminación: {version.terminationClause}</Text></View><View style={{ gap: 16 }}><WorkflowHeading icon="document-text-outline" title="Texto contractual de esta versión" /><WorkflowDisclosure key={version.id} title="contrato completo" initiallyOpen={version.status === "PROPOSED"}><Text>{version.contractText}</Text></WorkflowDisclosure><Text>Origen: {version.originIdentity.name} · {version.originIdentity.taxId} · {version.originIdentity.address}. Aceptado el {dateTime(version.originAcceptedAt)}.</Text>{version.recipientIdentity ? <Text>Receptor: {version.recipientIdentity.name} · {version.recipientIdentity.taxId} · {version.recipientIdentity.address}. Aceptado el {dateTime(version.recipientAcceptedAt!)}.</Text> : null}{version.responseReason ? <Text>{version.responseReason}</Text> : null}
    {!isOrigin && version.status === 'PROPOSED' && !collaboration.terminatedAt ? <><Check checked={attested} onChange={setAttested} label="Soy autónomo habilitado en este territorio y acepto el texto y las condiciones de esta versión" /><Button loading={busy} disabled={!attested} onPress={() => void mutate({ action: 'ACCEPT_VERSION', versionId: version.id, autonomousAndAuthorized: true })}>Aceptar versión {version.number}</Button><Field label="Motivo si rechazas el acuerdo" value={reason} onChangeText={setReason} multiline /><Button variant="outline" disabled={busy || !reason.trim()} onPress={() => void mutate({ action: 'REJECT_VERSION', versionId: version.id, reason })}>Rechazar esta versión</Button></> : null}
  </View></WorkflowColumns></Card>)}</>;
}
