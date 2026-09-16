// Translate stored event codes without changing the original audit evidence.
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
