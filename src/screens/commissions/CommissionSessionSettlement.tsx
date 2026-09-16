import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as service from '../../services/heraCommissionService';
import { getErrorMessage } from '../../constants/errors';
import { openPrivateDocument } from '../../utils/openPrivateDocument';
import { ReferralPagination } from '../referrals/ReferralControls';
import { Button, Text, WorkflowHint, money, dateTime, styles, Run } from './CommissionElements';
import { useTheme } from '../../contexts/ThemeContext';
import { CommissionMetrics, LedgerTitle, ledger } from './CommissionLedgerUI';
import { ReceiptForm } from './CommissionOperations';

function useLedgerPage<T>(load: (page: number) => Promise<service.Page<T>>, refresh: number) {
 const [page, setPage] = useState(0); const [retry, setRetry] = useState(0);
 const [data, setData] = useState<service.Page<T>>(); const [error, setError] = useState('');
 useEffect(() => {
  let active = true; setData(undefined); setError('');
  void load(page).then(value => { if (active) setData(value); }).catch(e => { if (active) setError(getErrorMessage(e, 'No se pudo cargar el detalle contable.')); });
  return () => { active = false; };
 }, [load, page, refresh, retry]);
 return { data, error, page, setPage, retry: () => setRetry(v => v + 1) };
}

function Applications({ accountId, documentId, refresh }: { accountId: string; documentId: string; refresh: number }) {
 const load = useCallback((page: number) => service.documentApplications(accountId, documentId, page), [accountId, documentId]);
 const state = useLedgerPage(load, refresh);
 return <View style={{ gap: 10 }}>
  {state.error ? <><Text error>{state.error}</Text><Button style={{ maxWidth: '100%' }} variant="ghost" onPress={state.retry}>Reintentar abonos</Button></> : !state.data ? <ActivityIndicator accessibilityLabel="Cargando abonos aplicados" /> : <>
   {!state.data.items.length ? <WorkflowHint>No hay abonos aplicados a este documento.</WorkflowHint> : state.data.items.map(a => <View key={a.id} style={{ gap: 4 }}>
    <Text>{a.amountCents < 0 ? 'Reversión de aplicación' : 'Aplicación al documento'} · {money(a.amountCents)}</Text>
    <WorkflowHint>Abono: {dateTime(a.cash.occurredAt)} · {a.cash.reference}</WorkflowHint>
    <WorkflowHint>{a.reason} · {dateTime(a.createdAt)}</WorkflowHint>
   </View>)}
   {state.page > 0 || state.data.hasMore ? <ReferralPagination page={state.page} hasMore={state.data.hasMore} loading={false} onChange={state.setPage} /> : null}
  </>}
 </View>;
}

function SessionDocuments({ row, account, run, busy, refresh }: { row: service.CommissionSession; account: service.AccountDetail; run: Run; busy: boolean; refresh: number }) {
 const { theme } = useTheme();
 const load = useCallback((page: number) => service.sessionDocuments(row.accountId, row.id, page), [row.accountId, row.id]);
 const state = useLedgerPage(load, refresh); const [receipt, setReceipt] = useState<string>(); const [applications, setApplications] = useState<string>();
 return <View style={{ gap: 16 }}>
  {state.error ? <><Text error>{state.error}</Text><Button style={{ maxWidth: '100%' }} variant="ghost" onPress={state.retry}>Reintentar documentos</Button></> : !state.data ? <ActivityIndicator accessibilityLabel="Cargando documentos de la sesión" /> : <>
   {!state.data.items.length ? <WorkflowHint>No hay facturas vinculadas. Puedes registrar y aplicar el pago a las comisiones generadas desde «Abonos a HERA», aunque el mes siga abierto.</WorkflowHint> : null}
   {state.data.items.map(d => <View key={d.id} style={{ gap: 14, padding: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 14 }}>
    <LedgerTitle>Documento {d.invoiceNumber}</LedgerTitle>
    <WorkflowHint>{d.sessionCount > 1 ? `Este documento incluye ${d.sessionCount} sesiones. No hay reparto individual de los abonos entre sesiones.` : 'Este documento corresponde a una sesión.'}</WorkflowHint>
    <LedgerTitle>Saldo del documento completo</LedgerTitle><CommissionMetrics items={[{ label: 'Total', value: money(d.totalCents) }, { label: 'Aplicado', value: money(d.appliedCents) }, { label: 'Pendiente', value: money(d.remainingCents), emphasis: true }]} />
    {d.correctionPending ? <WorkflowHint>Corrección pendiente: revisa la documentación antes de aplicar dinero.</WorkflowHint> : null}
    {d.documents.map(doc => <View key={doc.id} style={{ gap: 6 }}>
     <Text>{doc.invoiceNumber} · {doc.kind === 'ORDINARY' ? 'Factura' : 'Rectificación'}{doc.issuedAt ? ` · ${dateTime(doc.issuedAt)}` : ''}</Text>
     <Button variant="outline" size="small" style={{ alignSelf: 'flex-start', maxWidth: '100%' }} disabled={busy || doc.storageStatus !== 'READY'} onPress={() => void run(async () => openPrivateDocument(await service.download(row.accountId, true, doc.id), doc.id, doc.fileName, 'application/pdf'))}>Abrir documento {doc.invoiceNumber}</Button>
     {doc.storageStatus !== 'READY' ? <WorkflowHint>El PDF aún no está disponible. Completa su almacenamiento en «Documentos».</WorkflowHint> : null}
    </View>)}
    <View style={styles.row}>
     {d.claimableCents > 0 ? <Button style={{ maxWidth: '100%' }} disabled={busy} onPress={() => setReceipt(d.id)}>Registrar abono de la comisión</Button> : null}
     <Button style={{ maxWidth: '100%' }} variant="ghost" disabled={busy} onPress={() => setApplications(v => v === d.id ? undefined : d.id)}>{applications === d.id ? 'Ocultar abonos aplicados' : 'Ver abonos aplicados'}</Button>
    </View>
    {applications === d.id ? <Applications key={`applications:${d.id}`} accountId={row.accountId} documentId={d.id} refresh={refresh} /> : null}
    {receipt === d.id ? <ReceiptForm key={`receipt:${d.id}`} data={{ ...account, documents: [d] }} selectedDocument={d.id} run={run} busy={busy} onClose={() => setReceipt(undefined)} /> : null}
   </View>)}
   {state.page > 0 || state.data.hasMore ? <ReferralPagination page={state.page} hasMore={state.data.hasMore} loading={busy} onChange={page => { setReceipt(undefined); setApplications(undefined); state.setPage(page); }} /> : null}
  </>}
 </View>;
}

export function CommissionSessionSettlement({ row, account, run, busy, refresh, onPeriods }: { row: service.CommissionSession; account: service.AccountDetail; run: Run; busy: boolean; refresh: number; onPeriods: () => void }) {
 const { theme } = useTheme();
 const [expanded, setExpanded] = useState(false);
 const settlement = row.settlement;
 return <View style={[ledger.details, { borderTopColor: theme.border }]}>
  {!settlement ? <WorkflowHint>Actualiza las comisiones para consultar el estado contable.</WorkflowHint> : null}
  {expanded && settlement?.state === 'PAID' ? <WorkflowHint>Consulta por separado el pago confirmado y la disponibilidad de la factura.</WorkflowHint> : null}
  {settlement?.state === 'PARTIAL_DOCUMENT' ? <WorkflowHint>Abono parcial del documento; no se reparte entre sus sesiones.</WorkflowHint> : null}
  {settlement && settlement.undocumentedCents !== 0 ? <Text>Comisión de esta sesión sin documentar: {money(settlement.undocumentedCents)}</Text> : null}
  {settlement?.attributedAppliedCents !== undefined ? <Text>Pago identificado de esta comisión: {money(settlement.attributedAppliedCents ?? 0)}{settlement.documentCount ? ' · Consulta también el saldo de las facturas vinculadas.' : ` · Pendiente: ${money(settlement.unbilledPendingCents ?? 0)}`}</Text> : null}
  <View style={styles.row}>
   <Button style={{ maxWidth: '100%' }} variant="outline" disabled={busy} accessibilityState={{ expanded }} onPress={() => setExpanded(v => !v)}>{expanded ? 'Cerrar detalle contable' : 'Ver documentos y abonos'}</Button>
   {settlement?.state === 'UNDOCUMENTED' || settlement?.state === 'DOCUMENT_NOT_READY' || settlement?.state === 'REVIEW_PENDING' ? <Button style={{ maxWidth: '100%' }} variant="ghost" disabled={busy} onPress={onPeriods}>Ir a Documentos</Button> : null}
  </View>
  {expanded ? <SessionDocuments row={row} account={account} run={run} busy={busy} refresh={refresh} /> : null}
 </View>;
}
