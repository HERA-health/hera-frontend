import { api } from './api';
import { getErrorMessage } from '../constants/errors';
import { Platform, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

// ============================================================================
// TYPES
// ============================================================================

export interface BillingSummary {
  totalThisMonth: number;
  totalThisYear: number;
  invoiceCountThisMonth: number;
  pendingCount: number;
}

export interface Invoice {
  id: string;
  specialistId: string;
  clientId: string;
  sessionId: string | null;
  invoiceNumber: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  ivaIncluded: boolean;
  baseImponible: number | null;
  concept: string;
  sessionDate: string | null;
  durationMinutes: number | null;
  status: InvoiceStatus;
  sentAt: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    user: { name: string; email: string };
  };
  session?: {
    id: string;
    date: string;
    type: string;
  } | null;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'CANCELLED';

export interface InvoiceFilters {
  status?: InvoiceStatus;
  month?: number;
  year?: number;
  clientId?: string;
}

export interface CreateInvoiceData {
  clientId: string;
  sessionId?: string;
  concept: string;
  subtotal: number;
  vatRate?: number;
  vatAmount?: number;
  sessionDate?: string;
  durationMinutes?: number;
  ivaIncluded?: boolean;
  baseImponible?: number;
  internalNotes?: string;
}

export interface UpdateInvoiceData {
  clientId?: string;
  concept?: string;
  subtotal?: number;
  vatRate?: number;
  vatAmount?: number;
  sessionDate?: string | null;
  durationMinutes?: number | null;
  ivaIncluded?: boolean;
  baseImponible?: number;
  internalNotes?: string;
}

export interface BillingConfig {
  invoicePrefix?: string;
  invoiceNextNumber?: number;
  vatRate?: number;
  vatExemptReason?: string | null;
  invoiceLogoUrl?: string | null;
  bankIban?: string;
  paymentConditions?: string;
  fiscalName?: string;
  fiscalAddress?: string;
  fiscalNif?: string;
  autoGenerateInvoice?: boolean;
  autoSendToClient?: boolean;
  sendInvoiceCopyTo?: string | null;
  applyVat?: boolean;
}

export interface TariffItem {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  isDefault: boolean;
  isActive: boolean;
  description?: string;
}

export interface TariffsConfig {
  tariffs: TariffItem[];
  firstVisitFree: boolean;
}

export interface UnbilledSession {
  id: string;
  date: string;
  duration: number;
  type: string;
}

export interface SpecialistBillingData {
  id: string;
  invoicePrefix: string | null;
  invoiceNextNumber: number;
  vatRate: number | null;
  applyVat: boolean;
  vatExemptReason: string | null;
  invoiceLogoUrl: string | null;
  bankIban: string | null;
  paymentConditions: string | null;
  fiscalName: string | null;
  fiscalAddress: string | null;
  fiscalNif: string | null;
  autoGenerateInvoice: boolean;
  autoSendToClient: boolean;
  sendInvoiceCopyTo: string | null;
}

// ============================================================================
// API CALLS
// ============================================================================

export interface FullBillingConfig {
  id: string;
  pricePerSession: number;
  firstVisitFree: boolean;
  slotDuration: number | null;
  tariffs: TariffItem[] | null;
  invoicePrefix: string | null;
  invoiceNextNumber: number;
  vatRate: number | null;
  applyVat: boolean;
  vatExemptReason: string | null;
  invoiceLogoUrl: string | null;
  bankIban: string | null;
  paymentConditions: string | null;
  fiscalName: string | null;
  fiscalAddress: string | null;
  fiscalNif: string | null;
  autoGenerateInvoice: boolean;
  autoSendToClient: boolean;
  sendInvoiceCopyTo: string | null;
}

export const billingService = {
  async getConfig(): Promise<FullBillingConfig> {
    try {
      const response = await api.get('/billing/config');
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudo cargar la configuraci\u00F3n'));
    }
  },

  async getSummary(): Promise<BillingSummary> {
    try {
      const response = await api.get('/billing/summary');
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudo cargar el resumen de facturación'));
    }
  },

  async getInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.month) params.append('month', String(filters.month));
      if (filters?.year) params.append('year', String(filters.year));
      if (filters?.clientId) params.append('clientId', filters.clientId);

      const query = params.toString();
      const url = `/billing/invoices${query ? `?${query}` : ''}`;
      const response = await api.get(url);
      return response.data.data || [];
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudieron cargar las facturas'));
    }
  },

  async createInvoice(data: CreateInvoiceData): Promise<Invoice> {
    try {
      const response = await api.post('/billing/invoices', data);
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudo crear la factura'));
    }
  },

  async getInvoice(invoiceId: string): Promise<Invoice> {
    try {
      const response = await api.get(`/billing/invoices/${invoiceId}`);
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudo cargar la factura'));
    }
  },

  async updateInvoice(invoiceId: string, data: UpdateInvoiceData): Promise<Invoice> {
    try {
      const response = await api.put(`/billing/invoices/${invoiceId}`, data);
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudo actualizar la factura'));
    }
  },

  async sendInvoice(invoiceId: string): Promise<Invoice> {
    try {
      const response = await api.post(`/billing/invoices/${invoiceId}/send`);
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudo enviar la factura'));
    }
  },

  async cancelInvoice(invoiceId: string): Promise<Invoice> {
    try {
      const response = await api.delete(`/billing/invoices/${invoiceId}`);
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudo cancelar la factura'));
    }
  },

  async downloadInvoice(invoiceId: string, invoiceNumber?: string): Promise<void> {
    try {
      const response = await api.get(`/billing/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      });

      const fileName = invoiceNumber
        ? `factura-${invoiceNumber.replace(/\//g, '-')}.pdf`
        : `factura-${invoiceId}.pdf`;

      if (Platform.OS === 'web') {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // On native, open the PDF endpoint URL in the system browser
        // The auth token is included in the blob request above;
        // for native viewing, use expo-web-browser with the API URL
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          await WebBrowser.openBrowserAsync(dataUrl);
        };
        reader.readAsDataURL(blob);
      }
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudo descargar la factura'));
    }
  },

  async updateBillingConfig(config: BillingConfig): Promise<SpecialistBillingData> {
    try {
      const response = await api.put('/billing/config', config);
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudo actualizar la configuración'));
    }
  },

  async updateTariffs(data: TariffsConfig): Promise<{ id: string; tariffs: TariffItem[]; pricePerSession: number; firstVisitFree: boolean; slotDuration: number }> {
    try {
      const response = await api.put('/billing/tariffs', data);
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudieron actualizar las tarifas'));
    }
  },

  async getSessionsWithoutInvoice(clientId: string): Promise<UnbilledSession[]> {
    try {
      const response = await api.get(`/billing/sessions-without-invoice?clientId=${clientId}`);
      return response.data.data || [];
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudieron cargar las sesiones'));
    }
  },

  async uploadInvoiceLogo(imageUri: string): Promise<string> {
    try {
      // Convert URI to base64 for upload through the config endpoint
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const updateResponse = await api.put('/billing/config', {
        invoiceLogoUrl: base64,
      });
      return updateResponse.data.data.invoiceLogoUrl;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudo subir el logo'));
    }
  },
};
