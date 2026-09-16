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
 return <>   {simulation ? <WorkflowHint>Simulación: estos importes son de prueba. No hagas transferencias reales por esta cuenta.</WorkflowHint> : <>
    <WorkflowHint>El saldo pendiente incluye comisiones generadas sin factura; su base no es un total fiscal definitivo ni una solicitud automática de pago. Para abonar facturas, consulta su importe y vencimiento. Las estimaciones no se dan por pagadas.</WorkflowHint>
    {terms?.paymentInstructions ? <NativeText selectable style={{ color: theme.textPrimary, fontFamily: theme.fontSans, fontSize: 16, lineHeight: 24 }}>{terms.paymentInstructions}</NativeText> : terms?.beneficiary && terms.iban ? <>
     <Text>Beneficiario: {terms.beneficiary}</Text>
     <NativeText selectable style={{ color: theme.textPrimary, fontFamily: theme.fontSans, fontSize: 16 }}>IBAN: {terms.iban}</NativeText>
     <Text>Concepto de la transferencia: {data.specialistFiscal.fiscalName || data.summary.specialistName} y el número de factura.</Text>
    </> : <WorkflowHint>Los datos para realizar el abono están pendientes. HERA debe indicar el destinatario y el número de Bizum o la cuenta antes de que envíes dinero.</WorkflowHint>}
    <WorkflowHint>Si ya has enviado el pago, no lo repitas solo porque siga apareciendo pendiente. El saldo cambia cuando HERA comprueba y registra la recepción del Bizum o la transferencia.</WorkflowHint>
   </>}
   {data.summary.creditCents > 0 ? <WorkflowHint>Tienes saldo a tu favor pendiente de aplicar. Pide a HERA que lo aplique a las comisiones o facturas pendientes antes de enviar otro pago; el saldo se actualizará cuando se registre esa aplicación.</WorkflowHint> : null}
</>;
}

export function CommissionPayments({ data }: { data: AccountDetail }) {
 return <>  <LedgerTitle>Historial de pagos</LedgerTitle>
  {!data.cash.length ? <WorkflowHint>No hay movimientos confirmados en esta página. El Bizum o la transferencia que hayas enviado aparecerá cuando HERA registre su recepción.</WorkflowHint> : data.cash.map(c => <Card key={c.id} style={{ padding: 18, gap: 12 }}>
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
