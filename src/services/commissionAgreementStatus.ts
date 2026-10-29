export interface AgreementState { acceptanceStatus?: 'ACCEPTED' | 'ACCEPTANCE_REQUIRED' | 'LINKAGE_REQUIRED' | 'TERMINATED'; eligibilityStatus?: 'ELIGIBLE' | 'PENDING_ELIGIBILITY' }
export function agreementLabel(state: AgreementState): string {
 if (state.acceptanceStatus === 'TERMINATED') return 'Acuerdo finalizado';
 if (state.acceptanceStatus === 'LINKAGE_REQUIRED') return 'Condiciones aceptadas. Vinculación económica pendiente de revisión';
 if (state.acceptanceStatus === 'ACCEPTANCE_REQUIRED') return 'Aceptación pendiente de las condiciones requeridas';
 if (state.acceptanceStatus === 'ACCEPTED') return state.eligibilityStatus === 'PENDING_ELIGIBILITY' ? 'Condiciones aceptadas, pendiente de habilitación' : 'Condiciones aceptadas';
 return 'Consulta las condiciones y el historial de tu cuenta';
}
