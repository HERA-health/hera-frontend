import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { Button } from '../../components/common/Button';
import { loadServiceAssignmentPatients, type ServiceAssignmentPatient } from '../../services/privateCatalogService';

export function ServicePatientAssignments({ value, onChange, disabled }: {
  value: string[]; onChange: (ids: string[]) => void; disabled: boolean;
}) {
  const { theme: t } = useTheme();
  const [patients, setPatients] = useState<ServiceAssignmentPatient[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true); setFailed(false);
    loadServiceAssignmentPatients().then(rows => { if (current) setPatients(rows); })
      .catch(() => { if (current) setFailed(true); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [retry]);
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const matches = patients.filter(p => !value.includes(p.id) && normalize(p.name).includes(normalize(query.trim())));
  const text = { color: t.textSecondary, fontFamily: t.fontSans, fontSize: 13, lineHeight: 20 };
  return <View style={{ gap: 10 }}>
    <Text style={{ color: t.textPrimary, fontFamily: t.fontSansSemiBold, fontSize: 14 }}>Asignar a pacientes · opcional</Text>
    <Text style={text}>Al crear una cita para estos pacientes, esta tarifa se aplicará automáticamente. También puedes elegirla manualmente en cualquier cita.</Text>
    {loading ? <Text style={text}>Cargando pacientes…</Text> : failed ? <View accessibilityRole="alert" style={{ gap: 8 }}>
      <Text style={text}>No se pudieron cargar los pacientes. Las asignaciones guardadas se conservan.</Text>
      <Button size="small" variant="outline" disabled={disabled} onPress={() => setRetry(v => v + 1)}>Reintentar</Button>
    </View> : <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{value.map(id => {
        const name = patients.find(p => p.id === id)?.name ?? 'Paciente no disponible';
        return <AnimatedPressable key={id} accessibilityRole="button" accessibilityLabel={`Quitar asignación a ${name}`} disabled={disabled}
          onPress={() => onChange(value.filter(v => v !== id))} hoverLift={false}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 20, padding: 10, minHeight: 44, backgroundColor: t.primaryAlpha12 }}>
          <Text style={{ ...text, color: t.textPrimary }}>{name}</Text><Ionicons name="close" size={16} color={t.primary} />
        </AnimatedPressable>;
      })}</View>
      <TextInput accessibilityLabel="Buscar pacientes para asignar tarifa" value={query} onChangeText={setQuery} editable={!disabled}
        placeholder="Buscar pacientes por nombre" placeholderTextColor={t.textSecondary}
        style={{ ...text, color: t.textPrimary, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 12, minHeight: 44 }} />
      {!!query.trim() && <View style={{ gap: 4 }}>{matches.slice(0, 8).map(p => <AnimatedPressable key={p.id}
        accessibilityRole="button" accessibilityLabel={`Asignar a ${p.name}`} disabled={disabled} hoverLift={false}
        onPress={() => { onChange([...value, p.id]); setQuery(''); }} style={{ padding: 12, minHeight: 44 }}>
        <Text style={{ ...text, color: t.textPrimary }}>{p.name}</Text>
      </AnimatedPressable>)}{!matches.length && <Text style={text}>No hay pacientes que coincidan.</Text>}
      {matches.length > 8 && <Text style={text}>Escribe más letras para acotar la búsqueda.</Text>}</View>}
      {!patients.length && <Text style={text}>Todavía no tienes pacientes disponibles para asignar.</Text>}
    </>}
  </View>;
}
