import React, { useState } from 'react';
import { ManagedSessionPatientSelector } from '../../components/professional/ManagedSessionPatientSelector';
export function ReferralPatientSelector({ onSelect }: { onSelect: (clientId: string) => void }) {
  const [open, setOpen] = useState(false);
  return <ManagedSessionPatientSelector remote clients={[]} selectedClient={null} selectedClientId="" open={open}
    onOpenChange={setOpen} onSelect={onSelect} placeholderSubtitle="Selecciona a quién quieres proponer la derivación"
    emptySubtitle="Busca una ficha de tu consulta" />;
}
