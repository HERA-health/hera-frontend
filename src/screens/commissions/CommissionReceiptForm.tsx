import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { CommissionSelect } from './CommissionFields';
import * as service from '../../services/heraCommissionService';
import { workflow } from '../referrals/WorkflowUI';
import { LedgerTitle } from './CommissionLedgerUI';
import { Card, Text, Field, Check, Button, WorkflowDate, WorkflowHint, money, dateTime, styles, cents, day, getMadridDateKey, Run } from './CommissionElements';

export function ReceiptForm({ data, selectedDocument, run, busy, onClose }: { data: service.AccountDetail; selectedDocument?: string; run: Run; busy: boolean; onClose: () => void }) {
 const [amount, setAmount] = useState(selectedDocument ? String((data.documents.find(d => d.id === selectedDocument)?.claimableCents ?? 0) / 100) : '');
 const [date, setDate] = useState(getMadridDateKey()); const [reference, setReference] = useState('');
 const [method, setMethod] = useState<'BIZUM' | 'BANK_TRANSFER'>('BIZUM');
 const [confirmed, setConfirmed] = useState(false); const [reviewed, setReviewed] = useState(false); const [unapplied, setUnapplied] = useState(false);
 const [allocations, setAllocations] = useState<Record<string, string>>(selectedDocument ? { [`doc:${selectedDocument}`]: amount } : {});
 const documents = [...data.documents].filter(d => d.claimableCents > 0).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
 const entries = data.payableEntries ?? [];
 const targets: Array<{ key: string; label: string; available: number; target: service.AllocationTarget; group?: string; groupAvailable?: number }> = [
  ...documents.map(d => ({ key: `doc:${d.id}`, label: `Factura ${d.invoiceNumber}`, available: d.claimableCents, target: { documentId: d.id } })),
  ...entries.filter(e => e.remainingCents > 0).map(e => ({ key: `entry:${e.id}`, label: `Comisión de la sesión del ${dateTime(e.sessionDate)}`, available: e.remainingCents, target: { entryId: e.id }, group: e.snapshotId, groupAvailable: e.groupRemainingCents })),
 ];
 useEffect(() => { setReviewed(false); setConfirmed(false); setUnapplied(false); }, [data.summary.revision]);
 const edit = (fn: () => void) => { setReviewed(false); setUnapplied(false); fn(); };
 const propose = () => void run(async () => {
  let remaining = cents(amount); if (remaining <= 0) throw new Error('Indica un importe recibido mayor que cero.');
  const next: Record<string, string> = {}; const groups = new Map<string, number>();
  for (const t of targets) {
   const groupAvailable = t.group ? groups.get(t.group) ?? t.groupAvailable ?? 0 : t.available;
   const available = Math.min(t.available, groupAvailable);
   const n = Math.min(remaining, available);
   if (n > 0) { next[t.key] = (n / 100).toFixed(2); remaining -= n; if (t.group) groups.set(t.group, groupAvailable - n); }
  }
  edit(() => setAllocations(next));
 });
 const parsed = (v: string) => { try { return v.trim() ? cents(v) : 0; } catch { return NaN; } };
 const totalApplied = Object.values(allocations).reduce((n, v) => n + parsed(v), 0);
 const excess = parsed(amount) - totalApplied;
 const valid = Number.isFinite(excess) && excess >= 0 && parsed(amount) > 0 && Object.entries(allocations).every(([key, v]) => !parsed(v) || (parsed(v) > 0 && parsed(v) <= (targets.find(t => t.key === key)?.available ?? 0)))
  && targets.every(t => !t.group || targets.filter(other => other.group === t.group).reduce((n, other) => n + parsed(allocations[other.key] ?? ''), 0) <= (t.groupAvailable ?? 0));
 return <Card style={{ padding: 16, gap: 14 }}>
  <LedgerTitle>Registrar pago recibido</LedgerTitle>
  <WorkflowHint>Registra solo dinero cuya recepción hayas comprobado. Puedes cubrir comisiones ya generadas aunque el mes siga abierto y la factura esté pendiente.</WorkflowHint>
  <Text>{data.summary.specialistName} · {data.acceptances[0]?.terms.operatorName ?? 'Titular de esta cuenta'} · EUR</Text>
  <LedgerTitle>1. Pago recibido</LedgerTitle>
  <View style={workflow.fieldRow}>
   <View style={workflow.field}><Field label="Importe realmente recibido (€)" value={amount} onChangeText={v => edit(() => setAmount(v))} keyboardType="decimal-pad" /></View>
   <View style={workflow.field}><WorkflowDate label="Fecha de recepción" value={date} onChangeText={v => edit(() => setDate(v))} /></View>
   <View style={workflow.field}><CommissionSelect accessibilityLabel="Método del pago recibido" value={method} options={[{ value: 'BIZUM', label: 'Bizum' }, { value: 'BANK_TRANSFER', label: 'Transferencia bancaria' }]} onSelect={v => { if (v === 'BIZUM' || v === 'BANK_TRANSFER') edit(() => setMethod(v)); }} /></View>
  </View>
  <Field label="Referencia y nota del abono" value={reference} onChangeText={v => edit(() => setReference(v))} multiline />
  <LedgerTitle>2. Comisiones que cubre</LedgerTitle>
  <WorkflowHint>La base de comisión puede diferir del total fiscal de la factura posterior. El dinero que no apliques quedará a favor del especialista.</WorkflowHint>
  <Button variant="outline" disabled={busy || !amount.trim()} onPress={propose}>Proponer aplicación del pago</Button>
  {targets.map(t => <View key={t.key} style={{ gap: 6 }}>
   <Text>{t.label} · Pendiente {money(t.available)}{t.target.entryId ? ' · Factura pendiente' : ''}</Text>
   <Field label={`Aplicar a ${t.label} (€)`} editable={!busy} value={allocations[t.key] ?? ''} onChangeText={v => edit(() => setAllocations(p => ({ ...p, [t.key]: v })))} keyboardType="decimal-pad" />
  </View>)}
  {!targets.length ? <WorkflowHint>No hay comisiones aplicables en esta página. El importe recibido quedará como saldo a favor; las estimaciones no se dan por pagadas.</WorkflowHint> : null}
  {data.hasMore ? <WorkflowHint>La propuesta usa las comisiones y facturas de esta página. Puedes consultar más con la paginación de la cuenta.</WorkflowHint> : null}
  <Text>Aplicado: {Number.isFinite(totalApplied) ? money(totalApplied) : 'Revisa los importes'} · Saldo a favor: {Number.isFinite(excess) ? money(excess) : 'Revisa el importe'}</Text>
  <LedgerTitle>3. Revisar y confirmar</LedgerTitle>
  {excess > 0 ? <Check label="Confirmo que el exceso quedará como saldo sin aplicar del mismo especialista" checked={unapplied} onChange={setUnapplied} disabled={busy} /> : null}
  <Check label="He revisado las comisiones y los importes que cubre este pago" checked={reviewed} onChange={setReviewed} disabled={busy} />
  <Check label="He comprobado la recepción de este abono fuera de HERA" checked={confirmed} onChange={setConfirmed} disabled={busy} />
  <View style={styles.row}>
   <Button style={{ maxWidth: '100%' }} disabled={busy || !confirmed || !reviewed || !valid || reference.trim().length < 3 || (excess > 0 && !unapplied)} onPress={() => void (async () => {
    if (await run(() => service.decide(data.summary.id, true, { action: 'RECEIVE', method, amountCents: cents(amount), occurredAt: day(date), reference, confirmed: true, allowUnapplied: unapplied, revision: data.summary.revision,
     applications: Object.entries(allocations).filter(([, v]) => v.trim() && cents(v) !== 0).map(([key, v]) => {
      const t = targets.find(t => t.key === key); if (!t) throw new Error('La selección ha cambiado. Revisa la propuesta.');
      return { ...t.target, amountCents: cents(v) };
     }) }))) onClose();
   })()}>Guardar recepción manual</Button>
   <Button variant="ghost" disabled={busy} onPress={onClose}>Cerrar</Button>
  </View>
 </Card>;
}
