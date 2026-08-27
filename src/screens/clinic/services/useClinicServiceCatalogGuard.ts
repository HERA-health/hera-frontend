import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface ClinicServiceRequestToken {
  clinicId: string;
  sequence: number;
}

export interface ClinicServiceCatalogGuard {
  beginRequest: (clinicId: string) => ClinicServiceRequestToken;
  accepts: (token: ClinicServiceRequestToken) => boolean;
  invalidateRequests: () => void;
  beginMutation: () => boolean;
  endMutation: () => void;
  isCurrentClinic: (clinicId: string) => boolean;
}

export const useClinicServiceCatalogGuard = (
  selectedClinicId: string | null,
): ClinicServiceCatalogGuard => {
  const mountedRef = useRef(true);
  const selectedClinicIdRef = useRef<string | null>(selectedClinicId);
  const requestSequenceRef = useRef(0);
  const mutationLockedRef = useRef(false);

  selectedClinicIdRef.current = selectedClinicId;

  useEffect(() => () => {
    mountedRef.current = false;
    requestSequenceRef.current += 1;
  }, []);

  const beginRequest = useCallback((clinicId: string): ClinicServiceRequestToken => {
    requestSequenceRef.current += 1;
    return { clinicId, sequence: requestSequenceRef.current };
  }, []);

  const isCurrentClinic = useCallback((clinicId: string): boolean => (
    mountedRef.current && selectedClinicIdRef.current === clinicId
  ), []);

  const accepts = useCallback((token: ClinicServiceRequestToken): boolean => (
    isCurrentClinic(token.clinicId) && requestSequenceRef.current === token.sequence
  ), [isCurrentClinic]);

  const invalidateRequests = useCallback((): void => {
    requestSequenceRef.current += 1;
  }, []);

  const beginMutation = useCallback((): boolean => {
    if (!mountedRef.current || mutationLockedRef.current) return false;
    mutationLockedRef.current = true;
    return true;
  }, []);

  const endMutation = useCallback((): void => {
    mutationLockedRef.current = false;
  }, []);

  return useMemo(() => ({
    beginRequest,
    accepts,
    invalidateRequests,
    beginMutation,
    endMutation,
    isCurrentClinic,
  }), [accepts, beginMutation, beginRequest, endMutation, invalidateRequests, isCurrentClinic]);
};
