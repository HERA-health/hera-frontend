import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as service from '../../services/heraCommissionService';
import { openPrivateDocument } from '../../utils/openPrivateDocument';
import { Button, Card, CommissionDisclosure, Text, WorkflowHint, dateTime, money, type Run } from './CommissionElements';
import { LedgerTitle, CommissionMetrics } from './CommissionLedgerUI';
import { commissionMonth, commissionReason } from './commissionCopy';
import { WorkflowEmpty } from '../referrals/WorkflowUI';
import { ReferralPagination } from '../referrals/ReferralControls';

function PeriodLines({ accountId, period }: { accountId: string; period: service.Period }) {
 const [page, setPage] = useState(0);
 const [retry, setRetry] = useState(0);
 const [data, setData] = useState<service.Page<service.Entry>>();
 const [error, setError] = useState(false);
 useEffect(() => {
  let active = true; setData(undefined); setError(false);
  void service.period(accountId, false, period.id, page).then(value => { if (active) setData(value); }).catch(() => { if (active) setError(true); });
  return () => { active = false; };
 }, [accountId, period.id, period.revision, page, retry]);
 return <>
  <WorkflowHint>{period.status === 'CLOSED' ? 'Periodo cerrado' : period.status === 'PREPARED' ? 'Periodo preparado' : 'Periodo abierto'} · Base de comisión: {money(period.baseCents)}</WorkflowHint>
  {error ? <><Text error>No se pudieron cargar las líneas.</Text><Button variant="outline" onPress={() => setRetry(value => value + 1)}>Reintentar líneas</Button></> : !data ? <ActivityIndicator accessibilityLabel="Cargando líneas" /> : data.items.length ? data.items.map(entry => <View key={entry.id} style={{ gap: 4 }}><Text>{money(entry.baseCents)} · {commissionReason(entry.reason)}</Text><WorkflowHint>{entry.snapshot.sessionDate ? `Sesión del ${dateTime(entry.snapshot.sessionDate)}` : 'Sesión vinculada'} · {entry.snapshot.position === null ? 'Orden pendiente' : `${entry.snapshot.position}.ª sesión`} · {entry.snapshot.rateBps === null ? 'Cálculo histórico no disponible' : `${entry.snapshot.rateBps / 100}%`} · {entry.documentLine ? 'Documentada' : 'Sin documentar'}</WorkflowHint><WorkflowHint>Fecha económica: {dateTime(entry.economicAt)} · Registro: {dateTime(entry.recognizedAt)}</WorkflowHint></View>) : <WorkflowHint>Este periodo no tiene líneas en esta página.</WorkflowHint>}
  <ReferralPagination page={page} hasMore={data?.hasMore ?? false} loading={!data && !error} onChange={setPage} />
 </>;
}

function DocumentRow({ document, accountId, busy, run }: { document: service.DocumentBalance; accountId: string; busy: boolean; run: Run }) {
 const [fiscal, setFiscal] = useState<{ id: string; value: service.Fiscal }>();
 const ready = document.documents.length > 0 && document.documents.every(item => item.storageStatus === 'READY');
 return <Card style={{ padding: 16, gap: 10 }}>
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}><LedgerTitle>{document.invoiceNumber}</LedgerTitle><LedgerTitle>{money(document.totalCents)}</LedgerTitle></View>
  <Text>{document.remainingCents <= 0 ? 'Pagado' : document.appliedCents > 0 ? 'Pago parcial' : 'Pago pendiente'} · {ready ? 'Factura disponible' : 'Factura pendiente'}</Text>
  <WorkflowHint>Vencimiento: {dateTime(document.dueAt)}</WorkflowHint>
  {document.correctionPending ? <Text>Corrección pendiente. Espera la documentación corregida antes de enviar el pago.</Text> : null}
  <CommissionDisclosure title={`Detalle de ${document.invoiceNumber}`} icon="document-text-outline">
   <CommissionMetrics items={[{ label: 'Abonado', value: money(document.appliedCents) }, { label: 'Pendiente de abono', value: money(document.claimableCents), emphasis: true }]} />
   <WorkflowHint>Diferencia fiscal respecto a la base de comisión: {money(document.fiscalDifferenceCents ?? 0)}. El pago previo se conserva.</WorkflowHint>
   {document.documents.map(item => <View key={item.id} style={{ gap: 8 }}>
    <Text>{item.invoiceNumber} · {item.kind === 'ORDINARY' ? 'Factura' : item.kind === 'DIFFERENCE' ? 'Rectificación por diferencias' : 'Rectificación sustitutiva'}</Text>
    {item.issuedAt ? <WorkflowHint>Emisión: {dateTime(item.issuedAt)}</WorkflowHint> : null}
    <Text>Base {money(item.baseCents)} + impuestos {money(item.taxCents)} − retenciones {money(item.withholdingCents)} = {money(item.totalCents)}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button size="small" variant="outline" disabled={busy || item.storageStatus !== 'READY'} onPress={() => void run(async () => openPrivateDocument(await service.download(accountId, false, item.id), item.id, item.fileName, 'application/pdf'))}>Descargar factura PDF</Button><Button size="small" variant="outline" disabled={busy} onPress={() => void run(async () => setFiscal({ id: item.id, value: await service.fiscal(accountId, false, item.id) }))}>Datos fiscales</Button></View>
    {item.storageStatus !== 'READY' ? <WorkflowHint>El PDF todavía no está disponible. Los datos de la factura están guardados.</WorkflowHint> : null}
    {fiscal?.id === item.id ? <View style={{ gap: 4 }}>{([
     ['issuerName', 'Emisor'], ['issuerTaxId', 'NIF del emisor'], ['issuerAddress', 'Dirección del emisor'], ['recipientName', 'Destinatario'], ['recipientTaxId', 'NIF del destinatario'], ['recipientAddress', 'Dirección del destinatario'], ['concept', 'Concepto'], ['taxDescription', 'Impuestos'], ['withholdingDescription', 'Retenciones'], ['externalReference', 'Referencia'],
    ] as const).map(([key, label]) => <Text key={key}>{label}: {fiscal.value[key]}</Text>)}<Button size="small" variant="outline" onPress={() => setFiscal(undefined)}>Cerrar datos fiscales</Button></View> : null}
   </View>)}
  </CommissionDisclosure>
 </Card>;
}

export function ProfessionalCommissionDocuments({ data, busy, run }: { data: service.AccountDetail; busy: boolean; run: Run }) {
 return <>
  <LedgerTitle>Facturas de HERA</LedgerTitle>
  {data.documents.length ? data.documents.map(document => <DocumentRow key={document.id} document={document} accountId={data.summary.id} busy={busy} run={run} />) : <WorkflowEmpty icon="document-text-outline" title="Sin facturas en esta página" description="Las facturas de tus comisiones aparecerán aquí cuando HERA las incorpore." />}
  <CommissionDisclosure title="Periodos y líneas de comisión" icon="calendar-outline">
   <WorkflowHint>Periodos mensuales con horario de Madrid. Al cerrar un mes se conserva su desglose; las correcciones posteriores aparecen en un mes abierto.</WorkflowHint>
   {data.periods.length ? data.periods.map(period => <CommissionDisclosure key={period.id} title={commissionMonth(period.month)}><PeriodLines accountId={data.summary.id} period={period} /></CommissionDisclosure>) : <WorkflowHint>No hay periodos en esta página.</WorkflowHint>}
  </CommissionDisclosure>
 </>;
}
