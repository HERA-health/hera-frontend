export function pendingVerificationLabel(submittedAt: string | null | undefined): string {
  if (submittedAt === undefined) return 'Pendiente';
  return submittedAt === null ? 'Carné sin enviar' : 'Pendiente de revisión';
}
