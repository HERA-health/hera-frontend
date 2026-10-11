import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import { loadPackageCatalog, packagePrice, type PackageOffer, type PatientPackage } from '../../services/packageService';
import { Button } from '../common/Button';
import { PackageAcquisition } from './PackageAcquisition';

export function PackageAssignment({ clientId, disabled, onAcquired }: {
  clientId: string; disabled?: boolean; onAcquired: (row: PatientPackage) => void;
}) {
  const { theme } = useTheme();
  const [offers, setOffers] = useState<PackageOffer[]>();
  const [selected, setSelected] = useState<PackageOffer>();
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const request = useRef(0);
  useEffect(() => { setOffers(undefined); setSelected(undefined); setError(''); setLoading(false); request.current++; return () => { request.current++; }; }, [clientId]);
  const load = async () => {
    if (loading) return;
    const revision = ++request.current; setLoading(true); setError('');
    try {
      const catalog = await loadPackageCatalog();
      if (request.current !== revision) return;
      if (!catalog.acquisitionsEnabled) throw new Error('Por ahora no se pueden asignar nuevos bonos. Puedes utilizar los ya adquiridos.');
      setOffers(catalog.data.filter(offer => !offer.archivedAt));
    } catch (e) { if (request.current === revision) setError(getErrorMessage(e, 'No se pudieron cargar los bonos.')); }
    finally { if (request.current === revision) setLoading(false); }
  };
  const revision = request.current;
  return <View style={{ gap: 10 }}>
    <Button variant="secondary" disabled={disabled || loading} onPress={() => void load()}>Asignar bono</Button>
    {loading && <ActivityIndicator color={theme.primary} />}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text>}
    {offers && <View style={{ gap: 8 }}>
      <Text style={{ color: theme.textSecondary }}>La asignación crea el bono y su factura. La cita se guardará por separado.</Text>
      {!offers.length && <Text style={{ color: theme.textSecondary }}>Crea un bono en Servicios y bonos antes de asignarlo.</Text>}
      {offers.map(offer => <Button key={offer.id} disabled={disabled} variant="ghost" onPress={() => setSelected(offer)}>{offer.name} · {packagePrice(offer.totalCents)} · {offer.isPublic ? 'Público' : 'Privado'}</Button>)}
      <Button variant="ghost" onPress={() => setOffers(undefined)}>Cerrar selección de bonos</Button>
    </View>}
    {selected && <PackageAcquisition key={`${clientId}:${selected.id}`} offer={selected} clientId={clientId} onClose={() => setSelected(undefined)} onAcquired={row => {
      if (revision !== request.current) return;
      setSelected(undefined); setOffers(undefined); onAcquired(row);
    }} />}
  </View>;
}
