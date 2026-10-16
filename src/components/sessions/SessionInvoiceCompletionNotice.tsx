import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { getProfessionalSessionDetail } from '../../services/professionalService';
import { Button } from '../common/Button';

export function SessionInvoiceCompletionNotice({ sessionId, onBlockedChange }: {
  sessionId: string; onBlockedChange: (blocked: boolean) => void;
}) {
  const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const [notice, setNotice] = useState<{ message: string; clientId: string; issuer: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    onBlockedChange(false);
    setLoading(true); setError(''); setNotice(null);
    void getProfessionalSessionDetail(sessionId).then(detail => {
      if (!detail) throw new Error('No se pudo comprobar la facturación de la sesión.');
      if (!active) return;
      setNotice(detail.invoiceCompletionIssue ? { message: detail.invoiceCompletionIssue, clientId: detail.clientId, issuer: detail.billingReadiness?.correctionTarget === 'BILLING_SETTINGS' } : null);
      onBlockedChange(false);
    }).catch(() => {
      if (active) setError('No se pudo comprobar la factura. Puedes completar la sesión y revisar la facturación después.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessionId, onBlockedChange, retry]));
  if (!loading && !error && !notice) return null;
  return <View style={{ gap: 10 }}>
    <Text style={{ color: theme.textSecondary }}>{loading ? 'Comprobando los datos para la factura…' : error || notice?.message}</Text>
    {notice ? <Text style={{ color: theme.textSecondary }}>La sesión se completará aunque la factura quede pendiente. Podrás corregir los datos y reintentar su emisión.</Text> : null}
    {error ? <Button variant="outline" onPress={() => setRetry(value => value + 1)}>Reintentar comprobación fiscal</Button> : null}
    {notice ? <Button variant="outline" onPress={() => notice.issuer ? navigation.navigate('ProfessionalBilling', { initialSection: 'fiscal' }) : navigation.navigate('ClientProfile', {
      clientId: notice.clientId, initialTab: 'summary', focusBillingEditor: true, returnAfterBillingSave: true,
    })}>Completar datos</Button> : null}
  </View>;
}
