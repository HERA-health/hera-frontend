import { commissionIssueReason } from '../commissionCopy';
import type { Issue } from '../../../services/heraCommissionService';

const issue: Issue = {
 id: 'review', relationId: 'relation', snapshotId: null, status: 'OPEN', resolution: null,
 openedAutomatically: true,
 reason: 'HERA debe confirmar cómo llegó este paciente al especialista. La revisión se ha abierto automáticamente y no genera comisión mientras falte este dato.',
 context: { origin: 'UNKNOWN', patientOrigin: 'HERA_DIRECTORY', status: 'PENDING', initialCount: null, history: null },
};

it('does not ask for an already identified source when economics remain pending', () => {
 expect(commissionIssueReason(issue)).toContain('procedencia del paciente ya está identificada');
 expect(commissionIssueReason(issue)).toContain('no se han recalculado automáticamente');
});

it('preserves unresolved, manually written and closed audit reasons', () => {
 expect(commissionIssueReason({ ...issue, context: { ...issue.context!, patientOrigin: 'UNKNOWN' } })).toBe(issue.reason);
 expect(commissionIssueReason({ ...issue, openedAutomatically: false })).toBe(issue.reason);
 expect(commissionIssueReason({ ...issue, status: 'RESOLVED' })).toBe(issue.reason);
});
