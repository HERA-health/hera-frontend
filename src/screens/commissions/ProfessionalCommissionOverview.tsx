import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as service from '../../services/heraCommissionService';
import { getErrorMessage } from '../../constants/errors';
import { Button, Card, Summary, Text, WorkflowHint } from './CommissionElements';
import { WorkflowBadge, WorkflowEmpty, WorkflowNotice } from '../referrals/WorkflowUI';

function AccountOverview({ account, refresh, onOpen }: {
  account: service.Configuration['accounts'][number];
  refresh: number;
  onOpen: (id: string) => void;
}) {
  const [balance, setBalance] = useState<service.Balance>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setBalance(undefined);
    setError('');
    void service.detail(account.id, false).then(result => {
      if (active) setBalance(result.summary);
    }).catch(reason => {
      if (active) setError(getErrorMessage(reason, 'No hemos podido cargar tus saldos. Inténtalo de nuevo.'));
    });
    return () => { active = false; };
  }, [account, refresh, retry]);

  return <View style={{ gap: 12 }}>
    <WorkflowHint>Comisiones del Directorio HERA</WorkflowHint>
    {account.mode === 'SIMULATION' ? <WorkflowHint>Simulación: estos importes son de prueba y no generan deuda.</WorkflowHint> : null}
    {error ? <Card><Text error>{error}</Text><Button variant="outline" onPress={() => setRetry(value => value + 1)}>Reintentar saldos</Button></Card>
      : balance ? <Summary value={balance} />
        : <ActivityIndicator accessibilityLabel="Cargando tus saldos de comisiones" />}
    <Button style={{ alignSelf: 'flex-start' }} onPress={() => onOpen(account.id)}>Ver mis comisiones</Button>
  </View>;
}

export function ProfessionalCommissionOverview({ config, refresh, onOpen }: {
  config: service.Configuration;
  refresh: number;
  onOpen: (id: string) => void;
}) {
  return <View style={{ gap: 16 }}>
    {config.mode === 'OFF' && config.accounts.length > 0 ? <WorkflowNotice>Las nuevas comisiones del Directorio están desactivadas. Los importes anteriores siguen disponibles.</WorkflowNotice> : null}
    {config.accounts.length ? config.accounts.map(account => <AccountOverview key={account.id} account={account} refresh={refresh} onOpen={onOpen} />)
      : <WorkflowEmpty icon="receipt-outline" title="Todavía no tienes comisiones registradas"
        description={config.mode === 'OFF'
          ? 'Las comisiones por pacientes del Directorio están desactivadas. Podrás revisar aquí las condiciones cuando estén habilitadas.'
          : config.terms && config.canAccept
            ? 'Revisa las condiciones que encontrarás a continuación. Tras aceptarlas, podrás consultar las comisiones por pacientes del Directorio.'
            : 'Las condiciones todavía no están habilitadas para tu perfil. Podrás revisarlas aquí cuando estén disponibles.'}
        action={config.mode === 'OFF' || !config.canAccept ? <WorkflowBadge label="No necesitas hacer nada" /> : undefined}
      />}
  </View>;
}
