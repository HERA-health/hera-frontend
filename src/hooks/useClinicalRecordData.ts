import { useCallback, useEffect, useRef, useState } from 'react';
import { getClinicalRecord, type ClinicalRecord } from '../services/clinicalService';
import { cancelClinicalDownloads } from '../services/clinicalDownloads';
import { getErrorCode, getErrorMessage } from '../constants/errors';

interface Options {
  clientId: string;
  token: string | null;
  onAccessLost?: (message: string) => void;
}

// Reject responses from an old patient, session or refresh. Clinical mutations
// belong to the workspaces, not this protected record loader.
export function useClinicalRecordData({ clientId, token, onAccessLost }: Options) {
  const [record, setRecord] = useState<ClinicalRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const context = useRef({ clientId, token, generation: 0 });
  const mounted = useRef(true);
  const requestSequence = useRef(0);
  const recordGeneration = useRef(-1);
  const onLost = useRef(onAccessLost);
  onLost.current = onAccessLost;
  if (context.current.clientId !== clientId || context.current.token !== token) {
    context.current = { clientId, token, generation: context.current.generation + 1 };
  }
  const generation = context.current.generation;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const loadRecord = useCallback(async () => {
    if (!token || generation !== context.current.generation) return null;
    const request = ++requestSequence.current;
    const isCurrent = () => mounted.current && generation === context.current.generation
      && request === requestSequence.current;
    setRecordLoading(true);
    setRecordError(null);
    try {
      const next = await getClinicalRecord(clientId, token, { view: 'summary' });
      if (!isCurrent()) return null;
      recordGeneration.current = generation;
      setRecord(next);
      return next;
    } catch (error) {
      if (isCurrent()) {
        cancelClinicalDownloads(token);
        setRecord(null);
        const message = getErrorMessage(error, 'No se pudo cargar el expediente.');
        setRecordError(message);
        if (['CLINICAL_UNLOCK_REQUIRED', 'CLINICAL_RECORD_NOT_FOUND', 'CLINICAL_DPA_REQUIRED'].includes(getErrorCode(error) ?? '')) {
          onLost.current?.(message);
        }
      }
      return null;
    } finally {
      if (isCurrent()) setRecordLoading(false);
    }
  }, [clientId, token, generation]);

  useEffect(() => {
    setRecord(null);
    setRecordError(null);
    setRecordLoading(false);
    if (token) void loadRecord();
    return () => { if (token) cancelClinicalDownloads(token); };
  }, [loadRecord, token]);
  return { record: recordGeneration.current === generation ? record : null, recordLoading, recordError, loadRecord };
}
