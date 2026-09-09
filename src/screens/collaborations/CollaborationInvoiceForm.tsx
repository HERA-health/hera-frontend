import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { WorkflowButton as Button, WorkflowHeader, WorkflowHeading, WorkflowColumns, WorkflowNotice, WorkflowDate, WorkflowHint } from '../referrals/WorkflowUI';
import * as service from '../../services/collaborationService';
import { getMadridDateKey, parseMadridDateTime } from '../../utils/madridTime';
import type { UploadAsset } from '../../utils/multipartUpload';
import { ReferralCard as Card, ReferralField as Field, ReferralText as Text, money, styles } from '../referrals/ReferralElements';
import { type CollaborationRun, toCents } from './CollaborationAgreement';

export function CollaborationInvoiceForm({ collaboration, period, busy, run, onDone, onCancel, generate = false }: { collaboration: service.Collaboration; period: service.CollaborationPeriodDetail; busy: boolean; run: CollaborationRun; onDone: () => Promise<void>; onCancel: () => void; generate?: boolean }) {
  const version = collaboration.versions.find(v => v.status === 'ACCEPTED');
  const [fields, setFields] = useState<service.CollaborationFiscalMetadata>({ issuerName: version?.originIdentity.name ?? '', issuerTaxId: version?.originIdentity.taxId ?? '', issuerAddress: version?.originIdentity.address ?? '', recipientName: version?.recipientIdentity?.name ?? '', recipientTaxId: version?.recipientIdentity?.taxId ?? '', recipientAddress: version?.recipientIdentity?.address ?? '', concept: '', taxDescription: '', withholdingDescription: '' });
  const [number, setNumber] = useState(''); const [day, setDay] = useState(getMadridDateKey()); const [tax, setTax] = useState('0'); const [withholding, setWithholding] = useState('0'); const [file, setFile] = useState<UploadAsset | null>(null);
  const baseCents = period.documentable?.baseCents ?? 0;
  const [confirmed, setConfirmed] = useState(false);
  const [defaultsReady, setDefaultsReady] = useState(!generate);
  const [defaultsError, setDefaultsError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { setConfirmed(false); }, [fields, tax, withholding]);
  const previewTotal = Math.round(baseCents + Number(tax.replace(',', '.')) * 100 - Number(withholding.replace(',', '.')) * 100);
  useEffect(() => {
    if (!generate) return;
    let active = true;
    setDefaultsError(false);
    void service.getInvoiceDefaults(collaboration.id).then(data => {
      if (!active) return;
      const { vatRate, ...identity } = data;
      setFields(current => ({ ...current, ...identity, concept: `Colaboración profesional · Liquidación ${period.month}`, taxDescription: vatRate ? `IVA ${vatRate}%` : '', withholdingDescription: '' }));
      setTax((Math.round(baseCents * vatRate / 100) / 100).toFixed(2));
      setDefaultsReady(true);
    }).catch(() => { if (active) setDefaultsError(true); });
    return () => { active = false; };
  }, [generate, collaboration.id, period.month, baseCents, attempt]);
  const save = async () => {
    if (await run({ action: generate ? 'ISSUE_INVOICE' : 'ATTACH_INVOICE', periodId: period.id, fields, number, day, tax, withholding, file: file?.uri }, async key => {
      const issued = parseMadridDateTime(day, '00:00'); if (!issued) throw new Error('Revisa la fecha de emisión.');
      const taxCents = toCents(tax); const withholdingCents = toCents(withholding); const payableCents = baseCents + taxCents - withholdingCents;
      if (payableCents < 0) throw new Error('La retención no puede superar el total antes de retener.');
      if (generate) return service.issueInvoice(collaboration.id, { ...fields, periodId: period.id, baseCents, taxCents, withholdingCents, payableCents }, key);
      if (!file) throw new Error('Selecciona el PDF de la factura externa.');
      return service.uploadInvoice(collaboration.id, { ...fields, periodId: period.id, originalId: period.invoices.find(i => i.status === 'ACCEPTED')?.id, invoiceNumber: number, issuedAt: issued.iso, baseCents, taxCents, withholdingCents, payableCents }, file, key);
    })) await onDone();
  };
  return <>
    <WorkflowHeader title={generate ? `Emitir factura para ${collaboration.recipient.name}` : `Adjuntar factura para ${collaboration.recipient.name}`} subtitle={generate ? 'Revisa los datos fiscales. HERA asignará el número de tu serie de facturas completas y generará el PDF al emitir.' : 'Transcribe los datos del documento emitido fuera de HERA. Todos los campos y el PDF son obligatorios.'} />
    {generate && !defaultsReady ? <Text>{defaultsError ? 'No se pudieron cargar los datos de facturación.' : 'Cargando datos de facturación…'}</Text> : null}
    {defaultsError ? <Button onPress={() => setAttempt(value => value + 1)}>Reintentar datos fiscales</Button> : null}
    <WorkflowNotice>Importe de la colaboración que vas a facturar, antes de impuestos: {money(baseCents)} · Compensación aplicada: {money(period.documentable?.offsetCents ?? 0)}.</WorkflowNotice>
    <WorkflowColumns>
      <Card><WorkflowHeading number="01" title="Documento y emisor" subtitle="Tus datos fiscales como emisor de la factura." />
        {generate ? <WorkflowHint>Número automático · Fecha de emisión: hoy.</WorkflowHint> : <><Field required label="Número de factura" placeholder="Ej. 2026-001" value={number} onChangeText={setNumber} editable={!busy && defaultsReady} /><WorkflowDate label="Fecha de emisión (AAAA-MM-DD)" value={day} onChangeText={setDay} disabled={busy} /></>}
        {([['issuerName', 'Nombre fiscal de A'], ['issuerTaxId', 'Identificación fiscal de A'], ['issuerAddress', 'Dirección fiscal de A']] as const).map(([key, label]) => <Field required key={key} label={label} value={fields[key]} onChangeText={value => setFields(current => ({ ...current, [key]: value }))} editable={!busy && defaultsReady} maxLength={2000} />)}
      </Card>
      <Card><WorkflowHeading number="02" title="Destinatario y concepto" subtitle="Datos del profesional al que facturas y descripción de la colaboración." />
        {([['recipientName', 'Nombre fiscal de B'], ['recipientTaxId', 'Identificación fiscal de B'], ['recipientAddress', 'Dirección fiscal de B'], ['concept', 'Concepto de la factura']] as const).map(([key, label]) => <Field required key={key} label={label} value={fields[key]} onChangeText={value => setFields(current => ({ ...current, [key]: value }))} multiline={key === 'concept'} editable={!busy && defaultsReady} maxLength={2000} />)}
      </Card>
    </WorkflowColumns>
    <Card><WorkflowHeading number="03" title="Impuestos y documento" subtitle={generate ? "Revisa los impuestos y la retención antes de emitir." : "Indica los mismos importes que aparecen en el PDF que adjuntas."} /><WorkflowColumns>
      <View style={{ gap: 16 }}><Field required label="Tratamiento de los impuestos según la factura" value={fields.taxDescription} onChangeText={value => setFields(current => ({ ...current, taxDescription: value }))} multiline maxLength={2000} editable={!busy && defaultsReady} /><Field required label="Importe de impuestos (€)" value={tax} onChangeText={setTax} keyboardType="decimal-pad" editable={!busy && defaultsReady} /></View>
      <View style={{ gap: 16 }}><Field required label="Retención según la factura, o motivo por el que no procede" value={fields.withholdingDescription} onChangeText={value => setFields(current => ({ ...current, withholdingDescription: value }))} multiline maxLength={2000} editable={!busy && defaultsReady} /><Field required label="Importe de retención (€)" value={withholding} onChangeText={setWithholding} keyboardType="decimal-pad" editable={!busy && defaultsReady} /></View>
    </WorkflowColumns>
    {!generate ? <Button variant="outline" disabled={busy} onPress={() => void run({ action: 'SELECT_INVOICE_PDF' }, async () => { const selected = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true }); if (!selected.canceled) setFile(selected.assets[0]); })}>{file ? file.name || 'PDF seleccionado' : 'Seleccionar PDF privado'}</Button> : <><WorkflowHint>Los impuestos se han precargado desde tu configuración. Revisa su aplicación a esta colaboración y especifica la retención o su ausencia.</WorkflowHint><Button variant="outline" disabled={busy || !defaultsReady} accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} onPress={() => setConfirmed(value => !value)}>He revisado los datos, impuestos y retenciones y quiero emitir esta factura</Button></>}
    <WorkflowHint>{generate ? `La factura quedará disponible para ${collaboration.recipient.name}. Cuando recibas el dinero, podrás registrar el cobro en esta liquidación.` : 'El documento quedará pendiente de revisión del receptor. Puedes sustituir el archivo antes de guardar.'}</WorkflowHint>
    <Text>{Number.isFinite(previewTotal) && previewTotal >= 0 ? `Total a pagar: ${money(previewTotal)}` : 'Revisa los importes de impuestos y retención.'}</Text>
    <View style={styles.row}><Button loading={busy} disabled={(generate ? !confirmed || !defaultsReady : !file || !number.trim()) || Object.values(fields).some(value => !value.trim())} onPress={() => void save()}>{generate ? 'Emitir factura y generar PDF' : 'Guardar factura para revisión de B'}</Button><Button variant="ghost" disabled={busy} onPress={onCancel}>Volver</Button></View>
    </Card>
  </>;
}
