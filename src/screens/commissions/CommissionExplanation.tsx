import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import type { Terms } from '../../services/heraCommissionService';
import { Button, Card, WorkflowHint } from './CommissionElements';

const tiers = [
  { session: '1.ª sesión', rate: '20%', example: '16 €' },
  { session: '2.ª y 3.ª', rate: '10%', example: '8 €' },
  { session: '4.ª y siguientes', rate: '5%', example: '4 €' },
];

export function CommissionExplanation({ terms, simulation }: { terms?: Terms | null; simulation?: boolean }) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState(false);
  const body = { color: theme.textPrimary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21 };
  const label = { ...body, color: theme.textSecondary, fontFamily: theme.fontSansSemiBold, fontSize: 12, lineHeight: 18 };

  return <Card style={styles.card}>
    <Button variant="ghost" accessibilityLabel="Cómo se calculan las comisiones" accessibilityState={{ expanded }} icon={<Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />} iconPosition="right" onPress={() => setExpanded(value => !value)}>Cómo se calculan las comisiones</Button>
    {expanded ? <>
    <View style={styles.heading}>
      <View style={styles.headingCopy}>
        <Text accessibilityRole="header" style={{ ...body, fontFamily: theme.fontHeading, fontSize: 24, lineHeight: 31 }}>Menos comisión a medida que avanzáis</Text>
        <WorkflowHint>Solo por pacientes nuevos que llegan desde el Directorio HERA.</WorkflowHint>
      </View>
      <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
        <Ionicons name="people-outline" size={17} color={theme.textSecondary} />
        <Text style={{ ...label, color: theme.textPrimary }}>Pacientes propios: sin comisión HERA</Text>
      </View>
    </View>

    {simulation ? <Text style={label}>SIMULACIÓN · Estos importes no generan deuda.</Text> : null}

    <WorkflowHint>Ejemplo orientativo con una sesión de 80 € de base. No es tu tarifa ni un importe que tengas que pagar. Tu comisión se calcula con el precio y los cobros reales de cada sesión.</WorkflowHint>
    <View style={[styles.table, { borderColor: theme.border }]}>
      <View style={[styles.row, { backgroundColor: theme.bg }]}>
        <Text style={[label, styles.session]}>Sesión con el mismo paciente</Text>
        <Text style={[label, styles.rate]}>Comisión</Text>
        <Text style={[label, styles.example]}>Ejemplo: base de 80 €</Text>
      </View>
      {tiers.map(tier => <View key={tier.session} accessible accessibilityLabel={`${tier.session}: comisión del ${tier.rate}. Ejemplo con 80 euros de base: ${tier.example} de comisión antes de impuestos; no es tu saldo.`} style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.border }]}>
        <Text style={[body, styles.session]}>{tier.session}</Text>
        <View style={styles.rate}><Text style={{ color: theme.textPrimary, fontFamily: theme.fontHeading, fontSize: 25, lineHeight: 32 }}>{tier.rate}</Text></View>
        <Text style={[body, styles.example, { fontFamily: theme.fontSansSemiBold, fontSize: 17 }]}>{tier.example}</Text>
      </View>)}
    </View>

    <View style={[styles.rule, { backgroundColor: theme.bg }]}>
      <Ionicons name="checkmark-circle-outline" size={21} color={theme.textSecondary} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ ...body, fontFamily: theme.fontSansSemiBold }}>Sesión atendida + cobro registrado</Text>
        <WorkflowHint>Si cobras la mitad, se genera la mitad de la comisión. El contador no se reinicia cada mes.</WorkflowHint>
      </View>
    </View>

    <WorkflowHint>La base es el precio después de descuentos y sin impuestos. Los importes de la tabla no incluyen los impuestos ni las retenciones de HERA.</WorkflowHint>
    {terms ? <WorkflowHint>Fiscalidad de HERA: {terms.fiscalTreatment}</WorkflowHint> : null}

    <Button variant="outline" size="small" style={{ alignSelf: 'flex-start' }} accessibilityState={{ expanded: details }} icon={<Ionicons name={details ? 'chevron-up' : 'chevron-down'} size={15} color={theme.textSecondary} />} iconPosition="right" onPress={() => setDetails(v => !v)}>{details ? 'Ocultar detalles del cálculo' : 'Qué cuenta y qué queda fuera'}</Button>
    {details ? <View style={[styles.details, { borderTopColor: theme.border }]}>
      <WorkflowHint>• Cuentan las sesiones privadas de pago realmente atendidas. Las gratuitas, canceladas y ausencias no consumen un tramo.</WorkflowHint>
      <WorkflowHint>• Una sesión atendida ocupa su posición aunque todavía no la hayas cobrado. La comisión se genera sobre lo que cobres y registres.</WorkflowHint>
      <WorkflowHint>• Una devolución reduce la comisión sin reiniciar el contador. La escala es independiente para cada paciente y especialista.</WorkflowHint>
      {!terms ? <WorkflowHint>Antes de aceptar verás las condiciones y el tratamiento fiscal aplicables.</WorkflowHint> : null}
    </View> : null}
    </> : null}
  </Card>;
}

const styles = StyleSheet.create({
  card: { gap: 18, padding: 20 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center' },
  headingCopy: { flex: 1, minWidth: 230, gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, borderRadius: 10, flexShrink: 1 },
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 8 },
  session: { flex: 1.5, minWidth: 0 },
  rate: { flex: 1, minWidth: 0, textAlign: 'center', alignItems: 'center' },
  example: { flex: 1, minWidth: 0, textAlign: 'right' },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, borderRadius: 10 },
  details: { borderTopWidth: 1, paddingTop: 14, gap: 10 },
});
