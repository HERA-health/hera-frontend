import { useCallback, useEffect, useRef, useState } from 'react';
import { billingService, type Invoice, type InvoiceStatus } from '../../services/billingService';

export type BillingFilter = 'all' | 'pending' | InvoiceStatus;

export function useBillingInvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceListError, setInvoiceListError] = useState<string | null>(null);
  const [invoiceRefreshError, setInvoiceRefreshError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const requestSequence = useRef(0);
  const loadedKey = useRef<string | null>(null);
  const running = useRef(false);

  useEffect(() => () => { requestSequence.current += 1; }, []);

  const loadInvoices = useCallback(async (page: number, filter: BillingFilter, clientName: string, background = false) => {
    const key = JSON.stringify([page, filter, clientName.trim()]);
    if (background && (running.current || loadedKey.current !== key)) return;
    const request = ++requestSequence.current;
    running.current = true;
    if (!background) {
      setInvoicesLoading(true);
      setInvoiceListError(null);
    }
    setInvoiceRefreshError(null);
    try {
      const result = await billingService.getInvoices({
        page, limit: 10,
        ...(filter === 'pending' ? { collectionStatus: 'pending' as const } : filter === 'all' ? {} : { status: filter }),
        ...(clientName.trim() ? { clientName: clientName.trim() } : {}),
      });
      if (request !== requestSequence.current) return;
      loadedKey.current = key;
      setInvoiceListError(null);
      setInvoices(result.invoices);
      setTotalPages(Math.max(1, result.totalPages));
      setTotalInvoices(result.total);
      setCurrentPage(result.page);
    } catch (error: unknown) {
      if (request !== requestSequence.current) return;
      const message = error instanceof Error ? error.message : 'No se pudieron cargar las facturas.';
      if (background) setInvoiceRefreshError(message);
      else setInvoiceListError(message);
    } finally {
      if (request === requestSequence.current) {
        running.current = false;
        setInvoicesLoading(false);
      }
    }
  }, []);

  return { invoices, invoicesLoading, invoiceListError, invoiceRefreshError, currentPage, setCurrentPage,
    totalPages, totalInvoices, loadInvoices };
}
