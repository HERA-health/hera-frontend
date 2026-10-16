import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { CommissionWorkspace, HeraCommissionsScreen } from '../HeraCommissionsScreen';
import * as service from '../../../services/heraCommissionService';

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }), useFocusEffect: effect => require('react').useEffect(effect, [effect]) }));
jest.mock('../../../services/heraCommissionService', () => ({
 operators: jest.fn(), specialistAccounts: jest.fn(), configuration: jest.fn(), detail: jest.fn(), sessions: jest.fn(), balances: jest.fn(), month: jest.fn(), adminMonth: jest.fn(),
}));
jest.mock('../../../services/professionalService', () => ({ getProfessionalSessionDetail: jest.fn() }));
const summary = { id: 'account', specialistName: 'Ana', specialistId: 'specialist', mode: 'LIVE', operatorKey: 'internal-key', pendingCents: 1400, receivedCents: 1000, undocumentedCents: 300, creditCents: 0, overdueCents: 0, accruedCents: 0, issueCount: 0 };
const account = { summary, acceptances: [], specialistFiscal: {}, periods: [], documents: [], cash: [], issues: [], hasMore: false };
const month={accountId:'account',month:'2026-09',revision:1,period:{id:'period',month:'2026-09',status:'OPEN',revision:1,baseCents:1400},originalCents:1400,cancellationCents:0,adjustmentCents:0,netCents:1400,payableCents:1400,appliedCents:0,pendingCents:1400,paymentState:'PENDING',creditCents:0,countedSessions:1,excludedSessions:0,unknownSessions:0,patientCount:1,tiers:[],issues:[],documents:[]};
const nav = () => ({ canGoBack: jest.fn(() => false), goBack: jest.fn(), replace: jest.fn(), setParams: jest.fn() });
beforeEach(() => {
 jest.clearAllMocks();
 service.operators.mockResolvedValue([{operatorKey:'internal-key',operatorName:'HERA',mode:'LIVE'}]);
 service.month.mockResolvedValue(month);
 service.adminMonth.mockResolvedValue({items:[{specialistId:'specialist',specialistName:'Ana',contact:'synthetic@example.invalid',accountId:'account',accepted:true,summary:month}],hasMore:false,totals:{specialistCount:1,countedSessions:1,netCents:1400}});
 service.specialistAccounts.mockResolvedValue([summary]);
 service.configuration.mockResolvedValue({ mode: 'OFF', terms: null, accounts: [], scale: [], canAccept: false });
 service.detail.mockResolvedValue(account);
 service.sessions.mockResolvedValue({ items: [], hasMore: false });
});
function PersonalScreen({ navigation, params }) { return <HeraCommissionsScreen route={{ key: 'commissions', name: 'HeraCommissions', params }} navigation={navigation} />; }

it.each([undefined, 'account'])('redirects old admin links into administration, preserving the selected account: %s', async accountId => {
 const navigation = nav();
 const view = render(<PersonalScreen navigation={navigation} params={{ admin: true, specialistId: 'specialist', accountId }} />);
 await act(async () => {});
 expect(navigation.replace).toHaveBeenCalledWith('AdminPanel', { initialTab: 'commissions', commissionSpecialistId: 'specialist', commissionAccountId: accountId });
 expect(service.detail).not.toHaveBeenCalled();
 expect(view.queryByText('Mis comisiones')).toBeNull();
});

it.each([false, true])('keeps personal commissions on professional endpoints without a back action into administration (canGoBack=%s)', async canGoBack => {
 const navigation = nav();
 navigation.canGoBack.mockReturnValue(canGoBack);
 navigation.getState = jest.fn(() => ({ index: 1, routes: [{ name: 'AdminPanel' }, { name: 'HeraCommissions' }] }));
 const view = render(<PersonalScreen navigation={navigation} params={{ accountId: 'account' }} />);
 await view.findByText('Sesiones del mes');
 expect(service.detail).toHaveBeenCalledWith('account', false, 0);
 expect(view.queryByText('Gestión de comisiones')).toBeNull();
 expect(view.queryByText('Registrar pago recibido')).toBeNull();
 expect(view.queryByRole('button', { name: 'Volver' })).toBeNull();
 expect(navigation.setParams).not.toHaveBeenCalled();
 expect(navigation.replace).not.toHaveBeenCalled();
 expect(navigation.goBack).not.toHaveBeenCalled();
 view.rerender(<PersonalScreen navigation={navigation} />);
 await act(async () => {});
 expect(view.queryByRole('button', { name: 'Volver' })).toBeNull();
 expect(navigation.replace).not.toHaveBeenCalled();
 expect(navigation.replace).not.toHaveBeenCalledWith('AdminPanel', expect.anything());
});

it('opens the selected account in the admin workspace with admin actions, without leaking technical keys', async () => {
 const onOpen = jest.fn(); const onBack = jest.fn();
 const view = render(<CommissionWorkspace admin specialistId="specialist" onOpen={onOpen} onBack={onBack} />);
 await view.findByText('Ana');
 expect(view.queryByText(/internal-key/)).toBeNull();
 expect(view.getByText('Pendiente')).toBeTruthy();
 fireEvent.press(view.getByRole('button', { name: 'Ver comisiones de Ana' }));
 expect(onOpen).toHaveBeenCalledWith('account');
 view.rerender(<CommissionWorkspace admin specialistId="specialist" accountId="account" onOpen={onOpen} onBack={onBack} />);
 await view.findByText('Cuenta del especialista');
 expect(service.detail).toHaveBeenCalledWith('account', true, 0);
 await view.findByText('Liquidación del mes');
 expect(view.getByText('Registrar pago recibido')).toBeTruthy();
 expect(view.queryByText('Aceptar condiciones')).toBeNull();
 fireEvent.press(view.getByRole('button', { name: 'Volver a especialistas' }));
 expect(onBack).toHaveBeenCalledTimes(1);
});

it('removes stale balances after a failed refresh and recovers on retry', async () => {
 const props = { admin: true, specialistId: 'specialist', onOpen: jest.fn(), onBack: jest.fn() };
 const view = render(<CommissionWorkspace {...props} />);
 await view.findByText('Ana');
 service.adminMonth.mockRejectedValueOnce(new Error('Saldos no disponibles'));
 fireEvent.press(view.getByText('Actualizar saldos'));
 await view.findByText('Saldos no disponibles');
 expect(view.queryByText('Ana')).toBeNull();
 fireEvent.press(view.getByText('Actualizar saldos'));
 await view.findByText('Ana');
});

it('explains an empty operator configuration without suggesting a payment', async () => {
 service.operators.mockResolvedValue([]);
 const view = render(<CommissionWorkspace admin onOpen={jest.fn()} onBack={jest.fn()} />);
 await view.findByText('No hay acuerdos de comisiones disponibles. Revisa la configuración antes de iniciar nuevas liquidaciones.');
 expect(service.adminMonth).not.toHaveBeenCalled();
 expect(view.queryByText('Registrar pago recibido')).toBeNull();
});

it.each([null, '2026-09-01T00:00:00Z'])('does not offer acceptance again for an accepted or terminated version: %s', async terminatedAt => {
 const terms = { id: 'accepted-version', operatorName: 'HERA', mode: 'LIVE', effectiveAt: '2026-01-01', contractText: 'Texto ya aceptado', fiscalTreatment: 'Tratamiento de prueba' };
 service.configuration.mockResolvedValue({ mode: 'LIVE', terms, canAccept: true, accounts: [{ id: 'account', mode: 'LIVE', acceptances: [{ termsId: terms.id, terms, acceptedAt: '2026-01-02', terminatedAt }] }] });
 const view = render(<PersonalScreen navigation={nav()} />);
 await view.findByText('Información');
 fireEvent.press(view.getByText('Información'));
 fireEvent.press(view.getByText('Condiciones e historial'));
 expect(view.queryByText('Aceptar condiciones')).toBeNull();
 expect(view.getByText(terminatedAt ? /Este acuerdo ha finalizado/ : /Ya aceptaste estas condiciones/)).toBeTruthy();
});
