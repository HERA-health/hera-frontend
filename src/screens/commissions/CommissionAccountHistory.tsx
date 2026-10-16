import React from 'react';
import { View } from 'react-native';
import type { AccountDetail } from '../../services/heraCommissionService';
import { Button, CommissionDisclosure, Text, WorkflowHint, money } from './CommissionElements';
import { PeriodLines } from './ProfessionalCommissionDocuments';
import { LedgerTitle } from './CommissionLedgerUI';
import { commissionMonth } from './commissionCopy';

export function CommissionAccountHistory({ data, busy, onMonth, admin }: {
  data: AccountDetail; busy: boolean; admin: boolean; onMonth: (month: string) => void;
}) {
  return <>
    <WorkflowHint>Meses y revisiones de esta cuenta.</WorkflowHint>
    <LedgerTitle>Liquidaciones</LedgerTitle>
    {data.periods.length ? data.periods.map(period => <View key={period.id} style={{ gap: 8, paddingVertical: 10 }}>
      <LedgerTitle>{commissionMonth(period.month)}</LedgerTitle>
      <Text>{money(period.baseCents)} · {period.status === 'CLOSED' ? 'Cerrado' : period.status === 'PREPARED' ? 'Preparado' : 'Abierto'}</Text>
      <Button variant="outline" size="small" disabled={busy} onPress={() => onMonth(period.month)}>Ver mes</Button>
      <CommissionDisclosure title={`Desglose de ${commissionMonth(period.month)}`}><PeriodLines accountId={data.summary.id} period={period} admin={admin}/></CommissionDisclosure>
    </View>) : <WorkflowHint>No hay liquidaciones en esta página.</WorkflowHint>}
  </>;
}
