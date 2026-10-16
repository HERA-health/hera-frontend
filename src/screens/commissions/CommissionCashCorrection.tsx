import React, { useState } from 'react';
import { View } from 'react-native';
import * as service from '../../services/heraCommissionService';
import { Button, Field, WorkflowHint, type Run } from './CommissionElements';

export function CommissionCashCorrection({ accountId, cashId, applicationId, run, busy }: {
  accountId: string; cashId?: string; applicationId?: string; run: Run; busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const label = applicationId ? 'Corregir asignación' : 'Anular registro erróneo';
  return open ? <View style={{ gap: 12 }}>
    <WorkflowHint>{applicationId ? 'El importe volverá a estar disponible para asignarlo correctamente.' : 'Anula este registro, no devuelve dinero al especialista.'}</WorkflowHint>
    <Field label="Motivo de la corrección" value={reason} onChangeText={setReason} multiline editable={!busy}/>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button disabled={busy || reason.trim().length < 3} onPress={()=>void (async()=>{
        const command: service.Action | undefined = applicationId ? { action:'REVERSE_APPLICATION', applicationId, reason } : cashId ? { action:'VOID_RECEIPT', cashId, reason } : undefined;
        if(command && await run(()=>service.decide(accountId,true,command))) { setReason('');setOpen(false); }
      })()}>Confirmar corrección</Button>
      <Button variant="ghost" disabled={busy} onPress={()=>{setOpen(false);setReason('');}}>Cancelar</Button>
    </View>
  </View> : <Button variant="ghost" disabled={busy} onPress={()=>setOpen(true)}>{label}</Button>;
}
