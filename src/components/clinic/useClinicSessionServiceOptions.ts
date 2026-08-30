import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ClinicSessionServiceOption,
  ClinicSessionServiceOptionsResult,
  GetClinicSessionServiceOptionsInput,
} from '../../services/clinicService';

interface UseClinicSessionServiceOptionsInput {
  visible: boolean;
  contextKey: string;
  clinicSpecialistId: string | null;
  onLoad: (
    input: GetClinicSessionServiceOptionsInput,
  ) => Promise<ClinicSessionServiceOptionsResult>;
}

interface ClinicSessionServiceOptionsController {
  catalogActivated: boolean | null;
  services: ClinicSessionServiceOption[];
  selectedService: ClinicSessionServiceOption | null;
  selectedServiceId: string | null;
  loading: boolean;
  error: string | null;
  selectService: (serviceId: string) => void;
  retry: () => void;
  refreshAfterConflict: (requireManualSelection: boolean) => void;
}

export const useClinicSessionServiceOptions = ({
  visible,
  contextKey,
  clinicSpecialistId,
  onLoad,
}: UseClinicSessionServiceOptionsInput): ClinicSessionServiceOptionsController => {
  const [services, setServices] = useState<ClinicSessionServiceOption[]>([]);
  const [catalogActivated, setCatalogActivated] = useState<boolean | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestSequenceRef = useRef(0);
  const ownerRef = useRef('');
  const requireManualSelectionRef = useRef(false);

  useEffect(() => {
    if (!visible || !clinicSpecialistId) {
      requestSequenceRef.current += 1;
      ownerRef.current = '';
      requireManualSelectionRef.current = false;
      setServices([]);
      setCatalogActivated(null);
      setSelectedServiceId(null);
      setLoading(false);
      setError(null);
      setRefreshKey(0);
      return undefined;
    }

    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    const ownerKey = `${contextKey}:${clinicSpecialistId}`;
    const ownerChanged = ownerRef.current !== ownerKey;
    ownerRef.current = ownerKey;
    let cancelled = false;

    setLoading(true);
    setError(null);
    if (ownerChanged) {
      requireManualSelectionRef.current = false;
      setCatalogActivated(null);
      setServices([]);
      setSelectedServiceId(null);
    }

    onLoad({ clinicSpecialistId })
      .then((result) => {
        if (cancelled || requestSequenceRef.current !== requestId) return;

        setCatalogActivated(result.catalogActivated);
        setServices(result.services);
        setSelectedServiceId((current) => {
          if (!result.catalogActivated) return null;
          if (requireManualSelectionRef.current) {
            requireManualSelectionRef.current = false;
            return null;
          }

          return result.services.find((service) => service.id === current)?.id
            ?? result.services.find((service) => service.isDefault)?.id
            ?? result.services[0]?.id
            ?? null;
        });
      })
      .catch((loadError: unknown) => {
        if (cancelled || requestSequenceRef.current !== requestId) return;

        setCatalogActivated(null);
        setServices([]);
        setSelectedServiceId(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar los servicios. Reintenta para continuar.',
        );
      })
      .finally(() => {
        if (!cancelled && requestSequenceRef.current === requestId) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clinicSpecialistId, contextKey, onLoad, refreshKey, visible]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [selectedServiceId, services],
  );

  const selectService = useCallback((serviceId: string): void => {
    setSelectedServiceId(serviceId);
  }, []);

  const retry = useCallback((): void => {
    setRefreshKey((current) => current + 1);
  }, []);

  const refreshAfterConflict = useCallback((requireManualSelection: boolean): void => {
    requireManualSelectionRef.current = requireManualSelection;
    if (requireManualSelection) setSelectedServiceId(null);
    setRefreshKey((current) => current + 1);
  }, []);

  return {
    catalogActivated,
    services,
    selectedService,
    selectedServiceId,
    loading,
    error,
    selectService,
    retry,
    refreshAfterConflict,
  };
};
