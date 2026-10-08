import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from './api';

export interface PackagePaymentAcceptance { termsVersion: string; country: string }
export interface PackagePaymentPolicy { mode: 'ONLINE' | 'EXTERNAL' | 'FREE'; available: boolean; termsVersion: string }
export interface PackagePaymentState extends PackagePaymentPolicy {
  status: string; issueCode: string | null; required: boolean; canReserve: boolean; canPay: boolean;
  checkoutUrl: string | null; paidAt: string | null; totalCents: number;
}
export interface PackagePayment extends PackagePaymentState { id: string; name: string; sessions: number; specialistId: string }
const key = (id: string) => `hera_package_payment_${id}`;
export async function storePackagePaymentAccess(id: string, token: string) {
  if (Platform.OS === 'web') sessionStorage.setItem(key(id), token);
  else await SecureStore.setItemAsync(key(id), token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
async function access(id: string, guest: boolean) {
  const token = guest ? Platform.OS === 'web' ? sessionStorage.getItem(key(id)) : await SecureStore.getItemAsync(key(id)) : null;
  return { path: `${guest ? '/public' : ''}/patient-packages/${encodeURIComponent(id)}/payment`, headers: token ? { 'X-Hera-Package-Payment-Access': token } : undefined };
}
export async function getPackagePayment(id: string, guest: boolean, reconcile = false): Promise<PackagePayment> {
  const { path, headers } = await access(id, guest);
  return (reconcile ? await api.post<PackagePayment>(`${path}/reconcile`, {}, { headers }) : await api.get<PackagePayment>(path, { headers })).data;
}
export async function startPackagePayment(id: string, guest: boolean, acceptance: PackagePaymentAcceptance) {
  const { path, headers } = await access(id, guest);
  return (await api.post<PackagePayment>(`${path}/start`, { acceptance }, { headers })).data;
}
export const requestPackagePaymentAccess = async (id: string) => api.post(`/public/patient-packages/${encodeURIComponent(id)}/payment/otp`);
export async function verifyPackagePaymentAccess(id: string, code: string) {
  const { data } = await api.post<{ accessToken: string }>(`/public/patient-packages/${encodeURIComponent(id)}/payment/verify`, { code });
  await storePackagePaymentAccess(id, data.accessToken);
}
export async function downloadPackagePaymentInvoice(id: string, guest: boolean) {
  const { path, headers } = await access(id, guest);
  const { data } = await api.get<ArrayBuffer>(`${path}/pdf`, { headers, responseType: 'arraybuffer' });
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    const link = document.createElement('a'); link.href = url; link.download = 'factura-bono.pdf'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const file = new File(Paths.cache, `bono-${id}.pdf`); file.write(new Uint8Array(data));
    try { await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf' }); } finally { file.delete(); }
  }
}
export function packagePaymentStatus(state: Pick<PackagePaymentState, 'status'>) {
  const labels: Record<string, string> = { FREE: 'Sin importe a cobrar', PAID: 'Bono pagado', UNPAID: 'Pendiente de pago',
    PREPARING: 'Preparando el pago', CHECKOUT: 'Pendiente de pago', PROCESSING: 'Comprobando el pago', EXPIRED: 'Intento de pago caducado', REVIEW: 'Pago en revisión' };
  return labels[state.status] ?? 'Consulta el estado del pago';
}
