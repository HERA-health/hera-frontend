import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as service from '../../services/heraCommissionService';
import { getErrorMessage } from '../../constants/errors';
import { Button, Card, Summary, Text, WorkflowHint } from './CommissionElements';

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
    <Text title>{account.acceptances[0]?.terms.operatorName ?? 'Resumen de tus comisiones'}</Text>
    {account.mode === 'SIMULATION' ? <WorkflowHint>Simulación: estos importes son de prueba y no generan deuda.</WorkflowHint> : null}
    {error ? <Card><Text error>{error}</Text><Button variant="outline" onPress={() => setRetry(value => value + 1)}>Reintentar saldos</Button></Card>
      : balance ? <><Summary value={balance} /><WorkflowHint>Para saber cuánto transferir, consulta «Pendiente documentado». Las estimaciones y los importes sin documentar todavía no son una cantidad a transferir.</WorkflowHint></>
        : <ActivityIndicator accessibilityLabel="Cargando tus saldos de comisiones" />}
    <Button onPress={() => onOpen(account.id)}>Ver mis comisiones</Button>
  </View>;
}

export function ProfessionalCommissionOverview({ config, refresh, onOpen }: {
  config: service.Configuration;
  refresh: number;
  onOpen: (id: string) => void;
}) {
  return <View style={{ gap: 16 }}>
    <Text title>Mis comisiones</Text>
    {config.mode === 'OFF' ? <WorkflowHint>Las nuevas comisiones están desactivadas. Si tienes historial o saldos anteriores, puedes consultarlos aquí.</WorkflowHint> : null}
    {config.accounts.length ? config.accounts.map(account => <AccountOverview key={account.id} account={account} refresh={refresh} onOpen={onOpen} />)
      : <Card><Text title>Todavía no tienes comisiones registradas</Text>
        <Text>{config.mode === 'OFF'
          ? 'Por ahora no necesitas hacer nada. Cuando activemos las comisiones, te pediremos que revises y aceptes las condiciones. Aquí podrás consultar las comisiones que se generen después, los importes pendientes y las transferencias recibidas por HERA.'
          : config.terms && config.canAccept
            ? 'Revisa y acepta las condiciones que encontrarás a continuación. Después podrás consultar aquí las comisiones que se generen, los importes pendientes y las transferencias recibidas por HERA.'
            : 'Por ahora no necesitas hacer nada. Te avisaremos cuando puedas revisar las condiciones. Aquí podrás consultar tus comisiones cuando se activen para tu perfil y las hayas aceptado.'}</Text>
      </Card>}
  </View>;
}
