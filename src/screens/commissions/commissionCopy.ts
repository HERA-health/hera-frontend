// Translate stored event codes without changing the original audit evidence.
import type { Issue } from '../../services/heraCommissionService';

export function commissionIssueReason(issue: Issue): string {
 if (issue.openedAutomatically && issue.reason === 'Procedencia o equivalencia de identidad pendiente de acreditar. No generar deuda automática.') {
  if (issue.status === 'RESOLVED') return 'Se abrió automáticamente para comprobar la procedencia o las sesiones anteriores del paciente.';
  return issue.context?.origin === 'HERA_DIRECTORY' && issue.context.status === 'CONFIRMED'
   ? 'Falta confirmar cuántas sesiones anteriores del Directorio cuentan para el porcentaje.'
   : 'Falta confirmar cómo llegó este paciente al especialista. HERA debe comprobar su procedencia antes de calcular la comisión.';
 }
 return issue.reason;
}

export function commissionReason(reason: string): string {
 const labels: Record<string, string> = {
  COLLECT: 'Cobro del paciente registrado',
  REFUND: 'Devolución al paciente registrada',
 };
 return labels[reason] ?? reason;
}

export function commissionMonth(value: string): string {
 if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
 const [year, month] = value.split('-').map(Number);
 return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
