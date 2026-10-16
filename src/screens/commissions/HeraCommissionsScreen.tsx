import { CommissionMonthWorkspace } from './CommissionMonthWorkspace';
import { AdminCommissionMonth } from './AdminCommissionMonth';
import { ProfessionalCommissionWorkspace } from './ProfessionalCommissionWorkspace';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import { workflow } from '../referrals/WorkflowUI';
import * as service from '../../services/heraCommissionService';
import { Card, Text, Button, WorkflowHeader, styles } from './CommissionElements';
import { WorkflowHeading } from '../referrals/WorkflowUI';

export function HeraCommissionsScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'HeraCommissions'>) {
 const legacyAdmin = route.params?.admin === true;
 useEffect(() => {
  if (legacyAdmin) navigation.replace('AdminPanel', { initialTab: 'commissions', commissionAccountId: route.params?.accountId, commissionSpecialistId: route.params?.specialistId });
 }, [legacyAdmin, navigation, route.params?.accountId, route.params?.specialistId]);
 if (legacyAdmin) return null;
 return <CommissionWorkspace accountId={route.params?.accountId} clientId={route.params?.clientId} onOpen={accountId => navigation.setParams({ accountId })} onBack={() => {
  if (navigation.canGoBack()) navigation.goBack();
  else navigation.replace('ProfessionalHome');
 }} />;
}

export function CommissionWorkspace({ admin = false, accountId, specialistId, clientId, onOpen, onBack }: {
 admin?: boolean; accountId?: string; specialistId?: string; clientId?: string;
 onOpen: (accountId: string) => void; onBack: () => void;
}) {
 if (!admin) return <ProfessionalCommissionWorkspace accountId={accountId} clientId={clientId} onOpen={onOpen} onBack={onBack} />;
 return <AdminCommissionWorkspace accountId={accountId} specialistId={specialistId} onOpen={onOpen} onBack={onBack} />;
}

function AdminCommissionWorkspace({ accountId, specialistId, onOpen, onBack }: { accountId?: string; specialistId?: string; onOpen: (id: string) => void; onBack: () => void }) {
 const admin = true;
 const { theme } = useTheme();
 const [initialMonth,setInitialMonth]=useState<string>();
 const [data, setData] = useState<service.AccountDetail>(); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [page, setPage] = useState(0); const [refresh, setRefresh] = useState(0);
 const generation = useRef(0); const scroll = useRef<ScrollView>(null);
 const load = useCallback(async () => { const g = ++generation.current; setLoading(true); setError(''); try { if (accountId) { const result = await service.detail(accountId, admin, page); if (g === generation.current) setData(result); } } catch(e) { if (g === generation.current) setError(getErrorMessage(e, 'No se pudieron cargar las comisiones.')); } finally { if (g === generation.current) setLoading(false); } }, [accountId, admin, page]);
 useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
 useEffect(() => { setData(undefined); setPage(0); setError(''); scroll.current?.scrollTo({ y: 0, animated: false }); }, [accountId, admin]);
 const open = (id: string, month: string) => { setInitialMonth(month); setPage(0); onOpen(id); };
 return <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={[workflow.page, { maxWidth: 1120, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled"><WorkflowHeader title="Gestión de comisiones" subtitle="Seguimiento de las comisiones del Directorio y los abonos recibidos por HERA." action={<View style={styles.row}>{(accountId || specialistId) && <Button size="small" variant="ghost" onPress={onBack}>{accountId ? 'Volver a especialistas' : 'Ver todos los especialistas'}</Button>}<Button size="small" variant="outline" disabled={loading} onPress={() => { void load(); setRefresh(v => v + 1); }}>Actualizar saldos</Button></View>} />
 {error ? <Card><Text error>{error}</Text><Button variant="outline" disabled={loading} onPress={() => void load()}>Recargar datos</Button></Card> : null}{loading ? <ActivityIndicator accessibilityLabel="Cargando comisiones" /> : null}
 {!accountId ? <AdminCommissionMonth specialistId={specialistId} onOpen={open} refresh={refresh} /> : data && data.summary.id === accountId ? <><WorkflowHeading title={data.summary.specialistName} subtitle={data.summary.mode === 'SIMULATION' ? 'Simulación sin deuda' : 'Cuenta del especialista'} /><CommissionMonthWorkspace key={accountId} data={data} initialMonth={initialMonth} admin refresh={refresh} onChanged={() => { void load(); setRefresh(v => v + 1); }} /></> : null}</ScrollView>;
}
