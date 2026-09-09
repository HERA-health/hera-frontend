import React, { useState } from 'react';
import { View } from 'react-native';
import type { ReferralPreferences } from '../../services/referralService';
import { ReferralCard, ReferralCheck, ReferralField, styles } from './ReferralElements';
import { WorkflowButton as Button, WorkflowColumns, WorkflowHeading, WorkflowHint } from './WorkflowUI';

export function ReferralPreferencesForm({ initial, busy, onSave, onCancel }: { initial: ReferralPreferences; busy: boolean; onSave: (value: ReferralPreferences) => void; onCancel: () => void }) {
  const [accepts, setAccepts] = useState(initial.acceptsReferrals);
  const [capabilities, setCapabilities] = useState(initial.referralCapabilities);
  const [exclusions, setExclusions] = useState(initial.referralExclusions);
  const [capability, setCapability] = useState('');
  const [exclusion, setExclusion] = useState('');
  const collect = (values: string[], pending: string) => [...new Set([...values, pending.trim()].filter(Boolean))];
  return <ReferralCard><WorkflowHeading icon="options-outline" title="Tu disponibilidad declarada" subtitle="Define qué casos puedes recibir. Las capacidades y exclusiones son opcionales." />
    <ReferralCheck label="Estoy disponible para recibir derivaciones" checked={accepts} onChange={setAccepts} disabled={busy} />
    <WorkflowColumns>
      <View style={{ gap: 12 }}><ReferralField label="Capacidades y poblaciones atendidas" placeholder="Ej. terapia de pareja o población adulta" hint="Añade una por una, hasta 20. El texto pendiente también se guarda." value={capability} onChangeText={setCapability} editable={!busy && capabilities.length < 20} maxLength={100} /><Button size="small" variant="outline" disabled={busy || !capability.trim() || capabilities.length >= 20} onPress={() => { setCapabilities(collect(capabilities, capability)); setCapability(''); }}>Añadir capacidad</Button><View style={styles.row}>{capabilities.map(value => <Button key={value} size="small" variant="secondary" accessibilityLabel={`Quitar capacidad: ${value}`} disabled={busy} onPress={() => setCapabilities(current => current.filter(item => item !== value))}>{value} ×</Button>)}</View></View>
      <View style={{ gap: 12 }}><ReferralField label="Criterios de exclusión" placeholder="Describe un caso que no puedas asumir" hint="Añade uno por uno, hasta 20. No incluyas información de pacientes." value={exclusion} onChangeText={setExclusion} editable={!busy && exclusions.length < 20} maxLength={100} /><Button size="small" variant="outline" disabled={busy || !exclusion.trim() || exclusions.length >= 20} onPress={() => { setExclusions(collect(exclusions, exclusion)); setExclusion(''); }}>Añadir exclusión</Button><View style={styles.row}>{exclusions.map(value => <Button key={value} size="small" variant="secondary" accessibilityLabel={`Quitar exclusión: ${value}`} disabled={busy} onPress={() => setExclusions(current => current.filter(item => item !== value))}>{value} ×</Button>)}</View></View>
    </WorkflowColumns>
    <WorkflowHint>Son declaraciones tuyas. La verificación de credenciales se muestra por separado. Cada solicitud requiere tu aceptación.</WorkflowHint>
    <View style={styles.row}><Button loading={busy} onPress={() => onSave({ acceptsReferrals: accepts, referralCapabilities: collect(capabilities, capability), referralExclusions: collect(exclusions, exclusion) })}>Guardar disponibilidad</Button><Button variant="ghost" disabled={busy} onPress={onCancel}>Cerrar</Button></View>
  </ReferralCard>;
}
