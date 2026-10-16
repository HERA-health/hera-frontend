import React from 'react';
import { Text as NativeText, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { AccountDetail } from '../../services/heraCommissionService';
import { Card, Text, CommissionDisclosure, WorkflowHint, money, dateTime } from './CommissionElements';
import { LedgerTitle } from './CommissionLedgerUI';

export function CommissionPaymentInstructions({ data }: { data: AccountDetail }) {
 const { theme } = useTheme();
 const terms = data.acceptances[0]?.terms;
 const simulation = data.summary.mode === 'SIMULATION';
 const steps = [
  ['Confirma el importe', 'Consulta el total y el vencimiento de la factura. Si aún no está disponible, confirma con HERA cuánto pagar.'],
  ['Envía el pago', 'Confirma con HERA el destinatario antes de enviar dinero. Indica tu nombre y la factura como referencia.'],
  ['Espera la confirmación', 'HERA actualizará el saldo al comprobar el ingreso. Si ya has pagado, no repitas el envío.'],
 ];
 return <>
  {simulation ? <WorkflowHint>Cuenta de prueba. No envíes dinero real.</WorkflowHint> : <>
   {steps.map(([title, description], index) => <View key={title} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
    <View style={{ backgroundColor: theme.bgMuted, borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}><NativeText style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }}>{index + 1}</NativeText></View>
    <View style={{ flex: 1, gap: 4 }}><LedgerTitle>{title}</LedgerTitle><WorkflowHint>{description}</WorkflowHint></View>
   </View>)}
   {terms?.paymentInstructions ? <CommissionDisclosure title="Datos e instrucciones de HERA"><NativeText selectable style={{ color: theme.textPrimary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 22 }}>{terms.paymentInstructions}</NativeText></CommissionDisclosure> : terms?.beneficiary && terms.iban ? <Card style={{ padding: 12, gap: 6 }}><WorkflowHint>Transferencia bancaria</WorkflowHint><Text>{terms.beneficiary}</Text><NativeText selectable style={{ color: theme.textPrimary, fontFamily: theme.fontSans, fontSize: 14 }}>{terms.iban}</NativeText><WorkflowHint>Referencia: {data.specialistFiscal.fiscalName || data.summary.specialistName} y número de factura.</WorkflowHint></Card> : <WorkflowHint>Contacta con HERA para obtener los datos de pago.</WorkflowHint>}
  </>}
  {data.summary.creditCents > 0 ? <Card style={{ padding: 12, gap: 4 }}><LedgerTitle>Saldo a favor: {money(data.summary.creditCents)}</LedgerTitle><WorkflowHint>Pide a HERA que lo aplique antes de enviar otro pago.</WorkflowHint></Card> : null}
 </>;
}

export function CommissionPayments({ data }: { data: AccountDetail }) {
 return <>  <LedgerTitle>Historial de pagos</LedgerTitle>
  {!data.cash.length ? <Card style={{ padding: 18, gap: 6 }}><LedgerTitle>Sin pagos registrados</LedgerTitle><WorkflowHint>Si ya has pagado, aparecerá aquí cuando HERA lo confirme.</WorkflowHint></Card> : data.cash.map(c => <Card key={c.id} style={{ padding: 18, gap: 12 }}>
   <LedgerTitle>{c.kind === 'RECEIPT' ? c.isVoided ? 'Registro de recepción anulado' : 'Abono recibido por HERA' : c.kind === 'REFUND' ? 'Devolución al especialista' : 'Anulación de registro'}</LedgerTitle>
   <Text>{money(c.amountCents)} · Fecha del movimiento: {dateTime(c.occurredAt)}</Text>
   <Text>{c.method === 'BIZUM' ? 'Bizum' : c.method === 'BANK_TRANSFER' ? 'Transferencia bancaria' : 'Método no registrado'}</Text>
   <CommissionDisclosure title="Aplicaciones y detalle del pago"><Text>Referencia: {c.reference}</Text>
   <WorkflowHint>Registrado por HERA el {dateTime(c.recordedAt)}.{c.isVoided || c.kind === 'REVERSAL' ? ' La anulación corrige el registro; no acredita una devolución bancaria.' : ''}</WorkflowHint>
   {c.applications.map(a => <View key={a.id} style={{ gap: 4 }}><Text>{a.amountCents < 0 ? 'Aplicación anulada' : 'Aplicado'}: {money(a.amountCents)} · {a.entryId ? `Comisión${a.sessionDate ? ` de la sesión del ${dateTime(a.sessionDate)}` : ''}` : `Factura ${a.invoiceNumber ?? 'sin número disponible'}`}</Text><WorkflowHint>{a.reason}</WorkflowHint></View>)}
   </CommissionDisclosure>
  </Card>)}

  {(data.pagination?.payments ?? data.hasMore) ? <WorkflowHint>Los movimientos están paginados; usa «Página siguiente» para consultar el resto.</WorkflowHint> : null}
 </>;
}
