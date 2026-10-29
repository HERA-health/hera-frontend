import React from 'react';
import { render } from '@testing-library/react-native';
import { AdminCommissionTable } from '../AdminCommissionTable';
import type { AdminMonthRow } from '../../../services/heraCommissionService';
jest.mock('../../../services/heraCommissionService', () => ({ agreementLabel: jest.requireActual('../../../services/commissionAgreementStatus').agreementLabel }));
test('empty activity does not present accepted or ended contracts as pending acceptance', () => {
 const base: AdminMonthRow = { specialistId: 'one', specialistName: 'Especialista', contact: '', accountId: null, accepted: false, summary: null, acceptanceStatus: 'LINKAGE_REQUIRED', eligibilityStatus: 'PENDING_ELIGIBILITY' };
 const view = render(<AdminCommissionTable rows={[base, { ...base, specialistId: 'two', acceptanceStatus: 'ACCEPTED' }, { ...base, specialistId: 'three', acceptanceStatus: 'TERMINATED' }]} width={1200} onOpen={jest.fn()} />);
 expect(view.getByText('Condiciones aceptadas. Vinculación económica pendiente de revisión')).toBeTruthy();
 expect(view.getByText('Condiciones aceptadas, pendiente de habilitación')).toBeTruthy();
 expect(view.getByText('Acuerdo finalizado')).toBeTruthy();
 expect(view.queryByText('Condiciones pendientes de aceptación')).toBeNull();
});
