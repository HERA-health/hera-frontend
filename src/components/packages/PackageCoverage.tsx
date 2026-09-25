import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
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
    <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }}>Sesión individual o con bono</Text>
    {loading && <ActivityIndicator color={theme.primary} />}
    {!!error && <><Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text><Button variant="ghost" onPress={() => setRetry(n => n + 1)}>Reintentar bonos</Button></>}
    <Button size="small" variant={!value ? 'primary' : 'secondary'} disabled={disabled} onPress={() => { setChosen(true); onChange(undefined); }}>Sesión individual</Button>
    {rows.map(row => <Button key={row.id} size="small" variant={value === row.id ? 'primary' : 'secondary'} disabled={disabled || (row.balance.available === 0 && value !== row.id)} onPress={() => { setChosen(true); onChange(row.id, row); }}>
      {row.snapshot.name} · {new Date(row.createdAt).toLocaleDateString('es-ES')} · {row.balance.available} disponibles{!row.invoice?.paidAt && row.snapshot.totalCents > 0 ? ' · Pendiente de pago' : ''}
    </Button>)}
    {!!value && <Text style={{ color: theme.textSecondary }}>Incluida en tu bono · reservarás una sesión. No se genera otra factura.</Text>}
  </View>;
}
