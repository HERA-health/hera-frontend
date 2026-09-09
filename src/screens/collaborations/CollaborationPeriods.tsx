import { ReferralPagination } from '../referrals/ReferralControls';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WorkflowButton as Button, WorkflowHeader, WorkflowHeading, WorkflowColumns, WorkflowEmpty, WorkflowBadge, WorkflowDate, WorkflowHint } from '../referrals/WorkflowUI';
import { getErrorMessage } from '../../constants/errors';
import * as service from '../../services/collaborationService';
import { openPrivateDocument } from '../../utils/openPrivateDocument';
import { getMadridDateKey, parseMadridDateTime } from '../../utils/madridTime';
import { ReferralCard as Card, ReferralText as Text, ReferralField as Field, dateTime, money, styles } from '../referrals/ReferralElements';
import { type CollaborationRun, toCents } from './CollaborationAgreement';
import { CollaborationInvoiceForm } from './CollaborationInvoiceForm';

const periodLabel = { OPEN: 'Preliminar', SUBMITTED: 'Presentada por B', DISPUTED: 'Con discrepancia', CLOSED: 'Cerrada por ambos' };
const invoiceLabel = { UPLOADING: 'Subida pendiente', READY: 'Pendiente de revisión de B', FAILED: 'Subida fallida', ACCEPTED: 'Aceptada por B', CORRECTION_REQUESTED: 'Corrección solicitada' };
const transferLabel = { DECLARED: 'Declarada por B · recepción pendiente', CONFIRMED: 'Recepción confirmada por A', DISPUTED: 'Recepción en discrepancia', WITHDRAWN: 'Declaración retirada' };
const transferBlockMessage = {
  PENDING_ADJUSTMENTS: 'Hay ajustes negativos pendientes que afectan a las facturas aceptadas. B debe presentar la liquidación y A cerrarla; después, revisad si hace falta una factura rectificada.',
  INVOICE_CORRECTION_REQUIRED: 'Los ajustes cerrados han reducido la base que respaldaba las facturas aceptadas. A debe adjuntar una factura rectificada en una liquidación con documento aceptado y B debe revisarla y aceptarla.',
  INVOICE_REVIEW_PENDING: 'Hay una nueva versión de una factura aceptada. A debe completar su subida o corrección y B debe aceptar el documento actualizado.',
};
function PeriodDetail({ collaboration, id, busy, run, onBack, onSelect }: { collaboration: service.Collaboration; id: string; busy: boolean; run: CollaborationRun; onBack: () => void; onSelect: (id: string) => void }) {
  const [detail, setDetail] = useState<service.CollaborationPeriodDetail | null>(null); const [page, setPage] = useState(0); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [reason, setReason] = useState(''); const [uploading, setUploading] = useState(false); const [issuing, setIssuing] = useState(false);
  const [amount, setAmount] = useState(''); const [reference, setReference] = useState(''); const [day, setDay] = useState(getMadridDateKey()); const [invoiceDetail, setInvoiceDetail] = useState<(service.CollaborationInvoice & { fiscal: service.CollaborationFiscalMetadata }) | null>(null);
  const generation = useRef(0); const isOrigin = collaboration.role === 'ORIGIN';
  const load = useCallback(async () => { const current = ++generation.current; setLoading(true); setError(''); try { const data = await service.getPeriod(collaboration.id, id, page); if (current === generation.current) setDetail(data); } catch (err) { if (current === generation.current) setError(getErrorMessage(err, 'No se pudo consultar la liquidación.')); } finally { if (current === generation.current) setLoading(false); } }, [collaboration.id, id, page]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  const mutate = async (action: service.FinanceAction) => {
    if (await run(action, key => service.decideFinance(collaboration.id, action, key))) { setReason(''); setInvoiceDetail(null); }
    await load();
  };
  const latestAccepted = detail?.invoices.find(invoice => invoice.status === 'ACCEPTED');
  const nextStep = detail?.status === 'SUBMITTED'
    ? (isOrigin ? 'Revisa los importes y acepta la liquidación o indica qué debe corregirse.' : 'Tu colaborador tiene la liquidación pendiente de revisión.')
    : detail?.status !== 'CLOSED'
      ? (isOrigin ? 'Puedes consultar el desglose mientras tu colaborador prepara la liquidación.' : 'Revisa los importes y presenta la liquidación a tu colaborador.')
      : !detail.invoices.length
        ? (isOrigin ? 'La liquidación está cerrada. Ya puedes emitir la factura para tu colaborador.' : 'La liquidación está cerrada. Tu colaborador puede preparar la factura.')
        : 'Consulta la factura y su estado de revisión. Los pagos y cobros registrados aparecen junto a ella.';
  const reservedCents = detail?.invoices.reduce((total, invoice) => total + invoice.transfers.reduce((reserved, transfer) => reserved + (transfer.status === 'WITHDRAWN' ? 0 : transfer.amountCents), 0), 0) ?? 0;
  const availableCents = Math.max(0, Math.min((latestAccepted?.payableCents ?? 0) - reservedCents, detail?.transferBalance?.availableToDeclareCents ?? 0));
  const declareTransfer = async (invoiceId: string) => {
    await run({ action: isOrigin ? 'RECORD_RECEIPT' : 'DECLARE_TRANSFER', invoiceId, amount, day, reference }, async key => {
      const date = parseMadridDateTime(day, '00:00');
      if (!date) throw new Error('Revisa la fecha.');
      await service.decideFinance(collaboration.id, { action: isOrigin ? 'RECORD_RECEIPT' : 'DECLARE_TRANSFER', invoiceId, amountCents: toCents(amount), transferredAt: date.iso, reference }, key);
      setAmount(''); setReference('');
    });
    // A concurrent adjustment can invalidate the displayed balance. Keep the
    // entered values on failure and refresh the explanation and available work.
    await load();
  };
  if ((uploading || issuing) && detail) return <CollaborationInvoiceForm generate={issuing} collaboration={collaboration} period={detail} busy={busy} run={run} onCancel={() => { setUploading(false); setIssuing(false); }} onDone={async () => { setUploading(false); setIssuing(false); await load(); }} />;
  return <><View style={styles.row}><Button variant="ghost" onPress={onBack}>Volver a liquidaciones</Button><Button variant="ghost" onPress={() => void load()} disabled={busy}>Actualizar</Button></View>{loading ? <ActivityIndicator accessibilityLabel="Cargando liquidación" /> : null}{error ? <Text error>{error}</Text> : null}
    {detail ? <><Card><WorkflowHeading icon="wallet-outline" title={`Liquidación · ${detail.month}`} /><WorkflowBadge label={periodLabel[detail.status]} /><Text>Importe de la colaboración para {collaboration.origin.name}: {money(detail.amountCents)}</Text><WorkflowHint>{nextStep}</WorkflowHint><Text>Periodo mensual de Madrid. Los ajustes de un periodo cerrado se registran en el siguiente periodo abierto.</Text><Button variant="outline" disabled={busy || loading || !!error} onPress={() => void run({ action: 'DOWNLOAD_SETTLEMENT', periodId: id }, async () => openPrivateDocument(await service.downloadSettlement(collaboration.id, id), `settlement-${id}`, `liquidacion-${detail.month}.pdf`, 'application/pdf'))}>Descargar liquidación PDF</Button><WorkflowHint>Resumen generado por HERA con todos los movimientos. No sustituye la factura de A a B.{detail.status !== 'CLOSED' ? ' Se descargará como documento provisional.' : ''}</WorkflowHint>{detail.discrepancy ? <Text>Discrepancia: {detail.discrepancy}</Text> : null}
      {detail.transferBalance ? <>
        <WorkflowColumns><Card><WorkflowHeading title={money(detail.transferBalance.balanceCents)} subtitle="Saldo pendiente en el acuerdo" /><WorkflowHint>Recepción confirmada por A: {money(detail.transferBalance.confirmedReceivedCents)}.</WorkflowHint></Card><Card><WorkflowHeading title={money(detail.transferBalance.pendingDeclaredCents)} subtitle="Pagos pendientes de confirmar" /><WorkflowHint>Son pagos registrados por el profesional que paga, pendientes de confirmación por quien los recibe.</WorkflowHint></Card></WorkflowColumns>
        <Text>Importe que puedes registrar como nuevo pago o cobro: {money(detail.transferBalance.availableToDeclareCents)}.</Text>
        {detail.transferBalance.blockedReason ? <Card>
          <Text title>Revisa los ajustes antes de registrar otro pago</Text>
          <Text>{transferBlockMessage[detail.transferBalance.blockedReason]}</Text>
          <Text>Los documentos y las transferencias anteriores se conservan. La base de colaboración y el total fiscal se revisan por separado.</Text>
          {detail.transferBalance.reviewPeriods.filter(period => period.id !== id).map(period => <Button key={period.id} variant="outline" disabled={busy} onPress={() => onSelect(period.id)}>Revisar periodo {period.month}</Button>)}
        </Card> : null}
        {detail.transferBalance.balanceCents < 0 ? <Text>El importe recibido de más se tendrá en cuenta en los próximos pagos.</Text> : null}
      </> : null}
      {detail.amountCents < 0 ? <Text>Este ajuste se descontará de las próximas liquidaciones.</Text> : null}
      {!isOrigin && ['OPEN', 'DISPUTED'].includes(detail.status) ? <Button loading={busy} onPress={() => void mutate({ action: 'SUBMIT_PERIOD', periodId: id, revision: detail.revision })}>Presentar a A estos {money(detail.amountCents)}</Button> : null}
      {isOrigin && detail.status === 'SUBMITTED' ? <><Button loading={busy} onPress={() => void mutate({ action: 'ACCEPT_PERIOD', periodId: id, revision: detail.revision, amountCents: detail.amountCents })}>Aceptar y cerrar {money(detail.amountCents)}</Button><Field label="Motivo de discrepancia con la liquidación" multiline value={reason} onChangeText={setReason} /><Button variant="outline" disabled={busy || !reason.trim()} onPress={() => void mutate({ action: 'DISPUTE_PERIOD', periodId: id, revision: detail.revision, reason })}>Señalar discrepancia</Button></> : null}
      {isOrigin && detail.status === 'CLOSED' && ((detail.documentable?.baseCents ?? 0) > 0 || detail.invoices.some(invoice => invoice.status === 'ACCEPTED')) ? <><Text>Importe a facturar antes de impuestos: {money(detail.documentable!.baseCents)} · Compensación aplicada: {money(detail.documentable!.offsetCents)}.</Text><>{!detail.invoices.length ? <Button onPress={() => setIssuing(true)}>Emitir factura en HERA</Button> : null}<Button variant="outline" onPress={() => setUploading(true)}>Adjuntar factura externa o nueva versión</Button></></> : null}
    </Card>{detail.entries.map(entry => <Card key={entry.id}><Text>{dateTime(entry.createdAt)} · {money(entry.originAmountCents)} para A</Text><Text>Referencia {entry.snapshot.attribution.referralId.slice(-8)} · Sesión {entry.snapshot.sessionId.slice(-8)}</Text><Text>{entry.movement ? `${entry.movement.kind === 'REFUND' ? 'Devolución' : entry.movement.kind === 'COLLECTION' ? 'Cobro' : 'Corrección'} · ${entry.movement.reference}` : 'Actualización de asistencia o condiciones de la sesión'} · {entry.snapshot.originShareBps / 100}%</Text></Card>)}
    {page > 0 || detail.hasMore ? <ReferralPagination page={page} hasMore={detail.hasMore} loading={loading || busy} onChange={setPage} /> : null}
    {detail.invoices.map((invoice, index) => <Card key={invoice.id}><WorkflowHeading icon="document-text-outline" title="Documento fiscal" /><WorkflowBadge label={invoiceLabel[invoice.status]} /><Text title>Factura {invoice.invoiceNumber} · versión {invoice.number}</Text>{invoice.id === latestAccepted?.id ? <WorkflowBadge label={detail.invoices.flatMap(item => item.transfers).filter(transfer => transfer.status === 'CONFIRMED').reduce((total, transfer) => total + transfer.amountCents, 0) >= invoice.payableCents ? 'Pagada' : detail.invoices.some(item => item.transfers.some(transfer => transfer.status === 'CONFIRMED')) ? 'Cobro parcial' : 'Pendiente de pago'} /> : null}<Text>{invoiceLabel[invoice.status]} · Base {money(invoice.baseCents)} + impuestos {money(invoice.taxCents)} − retención {money(invoice.withholdingCents)}. Total del documento: {money(invoice.payableCents)}.</Text>{invoice.responseReason ? <Text>{invoice.responseReason}</Text> : null}
      {isOrigin && invoice.generatedInHera && ['FAILED', 'UPLOADING'].includes(invoice.status) ? <Button disabled={busy} onPress={() => void run({ action: 'RETRY_ISSUED_INVOICE', invoiceId: invoice.id }, async () => { await service.retryIssuedInvoice(collaboration.id, invoice.id); await load(); })}>Reintentar generación del PDF</Button> : null}<View style={styles.row}><Button variant="outline" disabled={busy} onPress={() => void run({ action: 'VIEW_FISCAL', invoiceId: invoice.id }, async () => setInvoiceDetail(await service.getInvoice(collaboration.id, invoice.id)))}>Revisar datos fiscales</Button>{['READY', 'ACCEPTED', 'CORRECTION_REQUESTED'].includes(invoice.status) ? <Button variant="outline" disabled={busy} onPress={() => void run({ action: 'DOWNLOAD_INVOICE', invoiceId: invoice.id }, async () => openPrivateDocument(await service.downloadInvoice(collaboration.id, invoice.id), invoice.id, invoice.fileName, 'application/pdf'))}>Descargar PDF privado</Button> : null}</View>
      {invoiceDetail?.id === invoice.id ? <><Text>Emisor: {invoiceDetail.fiscal.issuerName} · {invoiceDetail.fiscal.issuerTaxId} · {invoiceDetail.fiscal.issuerAddress}</Text><Text>Destinatario: {invoiceDetail.fiscal.recipientName} · {invoiceDetail.fiscal.recipientTaxId} · {invoiceDetail.fiscal.recipientAddress}</Text><Text>{invoiceDetail.fiscal.concept}</Text><Text>{invoiceDetail.fiscal.taxDescription} · {invoiceDetail.fiscal.withholdingDescription}</Text></> : null}
      {!isOrigin && index === 0 && invoice.status === 'READY' ? <><Button loading={busy} onPress={() => void mutate({ action: 'ACCEPT_INVOICE', invoiceId: invoice.id })}>Aceptar este documento fiscal</Button><Field label="Motivo para pedir corrección" multiline value={reason} onChangeText={setReason} /><Button variant="outline" disabled={busy || !reason.trim()} onPress={() => void mutate({ action: 'CORRECT_INVOICE', invoiceId: invoice.id, reason })}>Pedir documento corregido</Button></> : null}
      {invoice.transfers.map(transfer => <Card key={transfer.id}><Text>{money(transfer.amountCents)} · {transferLabel[transfer.status]}</Text><Text>{dateTime(transfer.transferredAt)} · {transfer.reference}{transfer.responseReason ? ` · ${transfer.responseReason}` : ''}</Text>{['DECLARED', 'DISPUTED'].includes(transfer.status) ? <>{isOrigin ? <Button loading={busy} onPress={() => void mutate({ action: 'CONFIRM_TRANSFER', transferId: transfer.id })}>Confirmo la recepción de {money(transfer.amountCents)}</Button> : null}<Field label={isOrigin ? 'Motivo de discrepancia de recepción' : 'Motivo de retirada de la declaración'} multiline value={reason} onChangeText={setReason} /><Button variant="outline" disabled={busy || !reason.trim()} onPress={() => void mutate({ action: isOrigin ? 'DISPUTE_TRANSFER' : 'WITHDRAW_TRANSFER', transferId: transfer.id, reason })}>{isOrigin ? 'Señalar discrepancia' : 'Retirar declaración para corregirla'}</Button></> : null}</Card>)}
      {!loading && !error && !detail.transferBalance?.blockedReason && availableCents > 0 && invoice.id === latestAccepted?.id ? <>
        <Text>Pendiente de registrar en esta liquidación: {money(availableCents)}. Los pagos que ya se han registrado están descontados de este importe, aunque falte confirmar su recepción.</Text>
        <Field required placeholder="Ej. 80,00" hint={isOrigin ? "Registra solo dinero que ya has recibido. Si B ya declaró el pago, confirma esa declaración." : "Registra solo una transferencia ya realizada fuera de HERA."} label={isOrigin ? "Importe cobrado (€)" : "Importe de la transferencia externa (€)"} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <WorkflowDate label="Fecha de la transferencia (AAAA-MM-DD)" value={day} onChangeText={setDay} disabled={busy} />
        <Field required placeholder="Referencia del justificante bancario" label="Referencia de la transferencia" value={reference} onChangeText={setReference} />
        <Button loading={busy} disabled={!reference.trim() || !amount} onPress={() => void declareTransfer(invoice.id)}>{isOrigin ? 'Registrar cobro recibido' : 'Declarar transferencia realizada'}</Button>
      </> : null}
    </Card>)}</> : null}</>;
}

export function CollaborationPeriods({ collaboration, busy, run }: { collaboration: service.Collaboration; busy: boolean; run: CollaborationRun }) {
  const [selected, setSelected] = useState(''); const [page, setPage] = useState(0); const [data, setData] = useState<service.Page<service.CollaborationPeriod>>({ items: [], hasMore: false }); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const generation = useRef(0);
  const load = useCallback(async () => { if (selected) return; const current = ++generation.current; setLoading(true); setError(''); try { const rows = await service.listPeriods(collaboration.id, page); if (generation.current === current) setData(rows); } catch (err) { if (generation.current === current) setError(getErrorMessage(err, 'No se pudieron cargar las liquidaciones.')); } finally { if (generation.current === current) setLoading(false); } }, [collaboration.id, page, selected]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  if (selected) return <PeriodDetail key={selected} collaboration={collaboration} id={selected} busy={busy} run={run} onBack={() => setSelected('')} onSelect={setSelected} />;
  return <><WorkflowHeader title="Liquidaciones mensuales" subtitle="Consulta cuánto corresponde a cada período, revisa las facturas y registra los pagos y cobros." />{loading ? <ActivityIndicator accessibilityLabel="Cargando liquidaciones" /> : null}{error ? <><Text error>{error}</Text><Button onPress={() => void load()}>Reintentar</Button></> : null}{!loading && !error && !data.items.length ? <WorkflowEmpty icon="wallet-outline" title="Aún no hay liquidaciones" description="Aquí aparecerá el resumen de cada mes cuando haya sesiones realizadas y cobradas que generen un reparto." /> : null}{data.items.map(period => <Card key={period.id}><Text title>{period.month} · {money(period.amountCents)}</Text><WorkflowBadge label={periodLabel[period.status]} /><WorkflowHint>Versión {period.revision}</WorkflowHint><Button variant="outline" onPress={() => setSelected(period.id)}>Revisar liquidación y documentos</Button></Card>)}{!error && (data.items.length > 0 || page > 0) ? <ReferralPagination page={page} hasMore={data.hasMore} loading={loading || busy} onChange={setPage} /> : null}</>;
}
