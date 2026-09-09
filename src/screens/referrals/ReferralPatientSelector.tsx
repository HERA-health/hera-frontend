import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ManagedSessionPatientSelector } from '../../components/professional/ManagedSessionPatientSelector';
import { getErrorMessage } from '../../constants/errors';
import { getProfessionalClients, type Client } from '../../services/professionalService';
import { ReferralLoadError } from './ReferralControls';

export function ReferralPatientSelector({ onSelect }: { onSelect: (clientId: string) => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void getProfessionalClients({ source: 'ALL', lifecycle: 'ACTIVE' })
      .then(data => { if (active) setClients(data); })
      .catch(err => { if (active) setError(getErrorMessage(err, 'No se pudieron cargar tus pacientes.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  if (loading) return <ActivityIndicator accessibilityLabel="Cargando pacientes" />;
  if (error) return <ReferralLoadError message={error} onRetry={() => setAttempt(value => value + 1)} />;

  return (
    <ManagedSessionPatientSelector
      clients={clients}
      selectedClient={null}
      selectedClientId=""
      open={open}
      onOpenChange={setOpen}
      onSelect={onSelect}
      placeholderSubtitle="Selecciona a quién quieres proponer la derivación"
      emptySubtitle="Tus pacientes activos aparecerán aquí"
    />
  );
}
