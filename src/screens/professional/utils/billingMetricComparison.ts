export function billingMetricComparison(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? 'Sin variación' : 'Sin base de comparación';
  const change = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(change) < 0.05) return 'Sin variación';
  return `${change > 0 ? '+' : '−'}${Math.abs(change).toLocaleString('es-ES', { maximumFractionDigits: 1 })}%`;
}
