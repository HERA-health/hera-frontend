import { useCallback, useEffect, useRef, useState } from 'react';
import { billingService, type Invoice, type InvoiceStatus } from '../../services/billingService';

export type BillingFilter = 'all' | InvoiceStatus;

export function useBillingInvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceListError, setInvoiceListError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const requestSequence = useRef(0);

  useEffect(() => () => { requestSequence.current += 1; }, []);

  const loadInvoices = useCallback(async (page: number, filter: BillingFilter, clientName: string) => {
    const request = ++requestSequence.current;
    setInvoicesLoading(true);
    setInvoiceListError(null);
    try {
      const result = await billingService.getInvoices({
        page, limit: 10,
        ...(filter === 'all' ? {} : { status: filter }),
        ...(clientName.trim() ? { clientName: clientName.trim() } : {}),
      });
      if (request !== requestSequence.current) return;
      setInvoices(result.invoices);
      setTotalPages(Math.max(1, result.totalPages));
      setTotalInvoices(result.total);
      setCurrentPage(result.page);
    } catch (error: unknown) {
      if (request !== requestSequence.current) return;
      setInvoiceListError(error instanceof Error ? error.message : 'No se pudieron cargar las facturas.');
    } finally {
      if (request === requestSequence.current) setInvoicesLoading(false);
    }
  }, []);

  return { invoices, invoicesLoading, invoiceListError, currentPage, setCurrentPage,
    totalPages, totalInvoices, loadInvoices };
}
