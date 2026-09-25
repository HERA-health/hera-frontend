import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
import { AnimatedPressable } from '../common/AnimatedPressable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { loadPatientPackages, type PatientPackage } from '../../services/packageService';
import { getErrorMessage } from '../../constants/errors';
import type { PrivateServiceOption } from '../../services/privateCatalogService';

export function frozenPackageOptions(row: PatientPackage): PrivateServiceOption[] {
  return row.snapshot.options.map(o => ({ ...o, serviceId: row.snapshot.serviceId, serviceName: row.snapshot.serviceName, name: row.snapshot.serviceName,
    serviceKey: 'package', priceCents: Math.round(row.snapshot.totalCents / row.snapshot.sessions), currency: 'EUR',
    isActive: true, isPublic: true, isPreferred: false, version: 1, legacyDuration: false, legacyTariffId: null }));
}
export function PackageCoverage({ clientId, specialistId, optionId, value, onChange, disabled, initialPackageId }: {
  clientId?: string; specialistId?: string; optionId?: string; value?: string; initialPackageId?: string; disabled?: boolean;
  onChange: (id: string | undefined, row?: PatientPackage) => void;
}) {
  const { theme } = useTheme(); const [rows, setRows] = useState<PatientPackage[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [retry, setRetry] = useState(0); const [chosen, setChosen] = useState(false);
  useEffect(() => {
    let current = true; setLoading(true); setError(''); setChosen(false);
    loadPatientPackages(clientId).then(data => { if (current) setRows(data.filter(p => !specialistId || p.specialistId === specialistId)); }).catch(e => { if (current) setError(getErrorMessage(e, 'No se pudieron consultar los bonos.')); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [clientId, specialistId, retry]);
  useEffect(() => {
    if (loading || chosen || (!optionId && !initialPackageId)) return;
    const proposed = rows.find(p => p.id === initialPackageId) ?? rows.find(p => p.balance.available > 0 && p.snapshot.options.some(o => o.id === optionId));
    if (proposed) { setChosen(true); onChange(proposed.id, proposed); }
  }, [rows, optionId, loading, chosen, initialPackageId, onChange]);
  if (!loading && !error && !rows.length) return null;
  return <View style={{ gap: 10, paddingVertical: 12 }}>
    <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 18 }}>¿Cómo quieres reservar?</Text>
    <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, lineHeight: 22 }}>Reserva una sesión individual o utiliza una sesión de un bono disponible.</Text>
    {loading && <ActivityIndicator color={theme.primary} />}
    {!!error && <><Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text><Button variant="ghost" onPress={() => setRetry(n => n + 1)}>Reintentar bonos</Button></>}
    <Button variant={!value ? 'secondary' : 'ghost'} style={{ alignSelf: 'flex-start', minHeight: 44, paddingVertical: 8, shadowOpacity: 0, elevation: 0 }} accessibilityState={{ selected: !value }} icon={<Ionicons name={!value ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={theme.primary} />} disabled={disabled} onPress={() => { setChosen(true); onChange(undefined); }}>Sesión individual</Button>
    {rows.length > 0 && <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSansSemiBold, fontSize: 13 }}>{clientId ? 'Bonos del paciente' : 'Tus bonos'}</Text>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {rows.map(row => {
        const selected = value === row.id;
        const unavailable = Boolean(disabled || (row.balance.available === 0 && !selected));
        return <AnimatedPressable key={row.id} hoverLift={false} pressScale={0.99} accessibilityState={{ selected, disabled: unavailable }} disabled={unavailable} onPress={() => { setChosen(true); onChange(row.id, row); }} style={{ width: '100%', maxWidth: 420, flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.secondaryMuted : theme.bgCard, opacity: unavailable ? 0.55 : 1 }}>
          <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? theme.primary : theme.textMuted} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 15 }}>{row.snapshot.name}</Text>
            <Text style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold }}>{row.balance.available} {row.balance.available === 1 ? 'sesión disponible' : 'sesiones disponibles'}</Text>
            <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 13 }}>Adquirido el {new Date(row.createdAt).toLocaleDateString('es-ES')}</Text>
            {!row.invoice?.paidAt && row.snapshot.totalCents > 0 && <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 13 }}>Pendiente de pago</Text>}
          </View>
        </AnimatedPressable>;
      })}
    </View>
    {!!value && <Text style={{ color: theme.textSecondary }}>Incluida en tu bono · reservarás una sesión. No se genera otra factura.</Text>}
  </View>;
}
