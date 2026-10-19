import { useCallback, useEffect, useRef, useState } from 'react';
import type { UploadAsset } from '../utils/multipartUpload';
import * as clinicalService from '../services/clinicalService';
import { resolveClinicalGuestConsentEligibility } from '../services/clinicalGuestConsentEligibility';
import { createSecureRandomUuid } from '../utils/secureRandom';
import { cancelClinicalDownloads } from '../services/clinicalDownloads';
import { getErrorCode, getErrorMessage } from '../constants/errors';

interface UseClinicalWorkspaceDataOptions {
  clientId: string;
  token: string | null;
  onRequestRefreshClient?: () => Promise<void>;
  onAccessLost?: (message: string) => void;
}

interface ClinicalWorkspaceContext {
  clientId: string;
  generation: number;
}

const activeRequestFromGuestResult = (
  result: clinicalService.ClinicalGuestConsentAdminResult
): clinicalService.ClinicalRecord['activeConsentRequest'] => (
  result.status === 'PENDING'
    ? {
        id: result.requestId,
        status: result.status,
        channel: result.channel,
        requestKind: result.requestKind,
        linkDeliveryStatus: result.linkDeliveryStatus,
        expiresAt: result.expiresAt,
        createdAt: result.createdAt,
        version: result.requestKind === 'WITHDRAWAL'
          ? 'specialist-clinical-withdrawal-v1'
          : 'specialist-clinical-authorization-v1',
      }
    : null
);

const mergeUniqueById = <T extends { id: string }>(current: T[], incoming: T[]) => {
  const map = new Map<string, T>();

  [...current, ...incoming].forEach((item) => {
    map.set(item.id, item);
  });

  return Array.from(map.values());
};

const mergeSessionFoldersById = (
  current: clinicalService.ClinicalSessionFolder[],
  incoming: clinicalService.ClinicalSessionFolder[]
) => {
  const map = new Map<string, clinicalService.ClinicalSessionFolder>();

  [...current, ...incoming].forEach((folder) => {
    map.set(folder.session.id, folder);
  });

  return Array.from(map.values()).sort(
    (left, right) => new Date(right.session.date).getTime() - new Date(left.session.date).getTime()
  );
};

const ACCESS_LOSS_MESSAGE_MATCHERS = [
  'debes desbloquear el area clinica',
  'debes volver a desbloquear el area clinica',
  'el expediente clinico ya no esta disponible',
  'el area clinica se ha bloqueado',
  'sesion clinica no valida',
  'sesion clinica caducada',
];

const normalizeMessage = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const isClinicalAccessLossError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = normalizeMessage(error.message);
  return ACCESS_LOSS_MESSAGE_MATCHERS.some((matcher) => normalizedMessage.includes(matcher));
};

export function useClinicalWorkspaceData({
  clientId,
  token,
  onRequestRefreshClient,
  onAccessLost,
}: UseClinicalWorkspaceDataOptions) {
  const [record, setRecord] = useState<clinicalService.ClinicalRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const [closingProcess, setClosingProcess] = useState(false);
  const [loadingMoreNotes, setLoadingMoreNotes] = useState(false);
  const [loadingMoreDocuments, setLoadingMoreDocuments] = useState(false);
  const [loadingMoreSessions, setLoadingMoreSessions] = useState(false);
  const [loadingMoreConsentEvents, setLoadingMoreConsentEvents] = useState(false);
  const [guestConsentSyncPending, setGuestConsentSyncPending] = useState(false);
  const activeContextRef = useRef<ClinicalWorkspaceContext>({ clientId, generation: 0 });
  const contextTokenRef = useRef(token);
  const mountedRef = useRef(true);
  const recordRequestRef = useRef(0);
  const guestMutationRef = useRef<{ clientId: string; action: string; key: string } | null>(null);
  if (activeContextRef.current.clientId !== clientId || contextTokenRef.current !== token) {
    contextTokenRef.current = token;
    activeContextRef.current = {
      clientId,
      generation: activeContextRef.current.generation + 1,
    };
  }

  const renderContext = activeContextRef.current;
  const captureContext = useCallback((): ClinicalWorkspaceContext => ({ ...renderContext }), [renderContext]);

  const isCurrentContext = useCallback((context: ClinicalWorkspaceContext): boolean => (
    mountedRef.current
    && activeContextRef.current.clientId === context.clientId
    && activeContextRef.current.generation === context.generation
  ), []);

  useEffect(() => {
    setConsentSubmitting(false);
    setGuestConsentSyncPending(false);
    guestMutationRef.current = null;
    setNoteSaving(false);
    setDocumentUploading(false);
    setOpeningDocumentId(null);
    setClosingProcess(false);
    setLoadingMoreNotes(false);
    setLoadingMoreDocuments(false);
    setLoadingMoreSessions(false);
    setLoadingMoreConsentEvents(false);
  }, [clientId, token]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const guestIdempotencyKey = useCallback((action: string): string => {
    const current = guestMutationRef.current;
    if (current?.clientId === clientId && current.action === action) return current.key;
    const key = createSecureRandomUuid();
    guestMutationRef.current = { clientId, action, key };
    return key;
  }, [clientId]);

  const finishGuestMutationAttempt = useCallback((action: string, error?: unknown): void => {
    const ambiguous = error instanceof clinicalService.ClinicalGuestConsentAdminRequestError
      && (error.classification === 'timeout' || error.classification === 'network');
    if (!error || !ambiguous) {
      const current = guestMutationRef.current;
      if (current?.clientId === clientId && current.action === action) guestMutationRef.current = null;
    }
  }, [clientId]);

  const handleAccessError = useCallback(
    (error: unknown) => {
      if (!isClinicalAccessLossError(error) && !['CLINICAL_UNLOCK_REQUIRED', 'CLINICAL_CONSENT_REQUIRED', 'CLINICAL_RECORD_NOT_FOUND', 'CLINICAL_DPA_REQUIRED'].includes(getErrorCode(error) ?? '')) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'El expediente clínico ya no está disponible.';
      onAccessLost?.(message);
    },
    [onAccessLost]
  );

  const loadRecord = useCallback(async () => {
    const context = captureContext();
    if (!isCurrentContext(context)) return null;
    const request = ++recordRequestRef.current;
    if (!token) {
      if (isCurrentContext(context)) setRecord(null);
      return null;
    }

    try {
      setRecordLoading(true);
      setRecordError(null);
      const nextRecord = await clinicalService.getClinicalRecord(clientId, token);
      if (!isCurrentContext(context) || request !== recordRequestRef.current) return null;
      if (nextRecord.consentStatus !== 'GRANTED') cancelClinicalDownloads(token);
      setRecord(nextRecord);
      return nextRecord;
    } catch (error) {
      if (isCurrentContext(context) && request === recordRequestRef.current) {
        cancelClinicalDownloads(token);
        setRecord(current => current?.consentStatus === 'GRANTED' ? null : current);
        handleAccessError(error);
        setRecordError(getErrorMessage(error, 'No se pudo cargar el expediente.'));
      }
      return null;
    } finally {
      if (isCurrentContext(context) && request === recordRequestRef.current) setRecordLoading(false);
    }
  }, [captureContext, clientId, handleAccessError, isCurrentContext, token]);

  useEffect(() => {
    if (!token) {
      setRecord(null);
      setRecordLoading(false);
      setRecordError(null);
      return;
    }

    void loadRecord();
  }, [loadRecord, token]);

  const loadMoreNotes = useCallback(async () => {
    if (!token || !record?.pagination.notes.hasMore || !record.pagination.notes.nextCursor) {
      return;
    }

    const context = captureContext();
    try {
      setLoadingMoreNotes(true);
      const nextPage = await clinicalService.listClinicalNotes(clientId, token, {
        cursor: record.pagination.notes.nextCursor,
      });

      if (!isCurrentContext(context)) return;
      setRecord((current) =>
        current
          ? {
              ...current,
              notes: mergeUniqueById(current.notes, nextPage.items),
              pagination: {
                ...current.pagination,
                notes: nextPage.pageInfo,
              },
            }
          : current
      );
    } catch (error) {
      if (isCurrentContext(context)) handleAccessError(error);
    } finally {
      if (isCurrentContext(context)) setLoadingMoreNotes(false);
    }
  }, [captureContext, clientId, handleAccessError, isCurrentContext, record, token]);

  const loadMoreDocuments = useCallback(async () => {
    if (!token || !record?.pagination.documents.hasMore || !record.pagination.documents.nextCursor) {
      return;
    }

    const context = captureContext();
    try {
      setLoadingMoreDocuments(true);
      const nextPage = await clinicalService.listClinicalDocuments(clientId, token, {
        cursor: record.pagination.documents.nextCursor,
        scope: 'general',
      });

      if (!isCurrentContext(context)) return;
      setRecord((current) =>
        current
          ? {
              ...current,
              documents: mergeUniqueById(current.documents, nextPage.items),
              pagination: {
                ...current.pagination,
                documents: nextPage.pageInfo,
              },
            }
          : current
      );
    } catch (error) {
      if (isCurrentContext(context)) handleAccessError(error);
    } finally {
      if (isCurrentContext(context)) setLoadingMoreDocuments(false);
    }
  }, [captureContext, clientId, handleAccessError, isCurrentContext, record, token]);

  const loadMoreConsentEvents = useCallback(async () => {
    if (!token || !record?.pagination.consentEvents.hasMore || !record.pagination.consentEvents.nextCursor) {
      return;
    }

    const context = captureContext();
    try {
      setLoadingMoreConsentEvents(true);
      const nextPage = await clinicalService.listClinicalConsentEvents(clientId, token, {
        cursor: record.pagination.consentEvents.nextCursor,
      });

      if (!isCurrentContext(context)) return;
      setRecord((current) =>
        current
          ? {
              ...current,
              consentEvents: mergeUniqueById(current.consentEvents, nextPage.items),
              pagination: {
                ...current.pagination,
                consentEvents: nextPage.pageInfo,
              },
            }
          : current
      );
    } catch (error) {
      if (isCurrentContext(context)) handleAccessError(error);
    } finally {
      if (isCurrentContext(context)) setLoadingMoreConsentEvents(false);
    }
  }, [captureContext, clientId, handleAccessError, isCurrentContext, record, token]);

  const loadMoreSessionFolders = useCallback(async () => {
    if (!token || !record?.pagination.sessionFolders.hasMore || !record.pagination.sessionFolders.nextCursor) {
      return;
    }

    const context = captureContext();
    try {
      setLoadingMoreSessions(true);
      const nextPage = await clinicalService.listClinicalSessionFolders(clientId, token, {
        cursor: record.pagination.sessionFolders.nextCursor,
      });

      if (!isCurrentContext(context)) return;
      setRecord((current) =>
        current
          ? {
              ...current,
              sessionFolders: mergeSessionFoldersById(current.sessionFolders, nextPage.items),
              pagination: {
                ...current.pagination,
                sessionFolders: nextPage.pageInfo,
              },
            }
          : current
      );
    } catch (error) {
      if (isCurrentContext(context)) handleAccessError(error);
    } finally {
      if (isCurrentContext(context)) setLoadingMoreSessions(false);
    }
  }, [captureContext, clientId, handleAccessError, isCurrentContext, record, token]);

  const ensureSessionFolderLoaded = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!token || !record) {
      return false;
    }

    if (record.sessionFolders.some((folder) => folder.session.id === sessionId)) {
      return true;
    }

    const context = captureContext();
    try {
      setLoadingMoreSessions(true);
      const folder = await clinicalService.getClinicalSessionFolder(clientId, sessionId, token);
      if (!isCurrentContext(context)) return false;
      setRecord((current) =>
        current
          ? {
              ...current,
              sessionFolders: mergeSessionFoldersById(current.sessionFolders, [folder]),
            }
          : current
      );
      return true;
    } catch (error) {
      if (isCurrentContext(context)) handleAccessError(error);
      throw error;
    } finally {
      if (isCurrentContext(context)) setLoadingMoreSessions(false);
    }
  }, [captureContext, clientId, handleAccessError, isCurrentContext, record, token]);

  const saveClinicalNote = useCallback(
    async (content: string, sessionId?: string) => {
      if (!token) {
        throw new Error('El área clínica está bloqueada.');
      }

      const context = captureContext();
      if (!isCurrentContext(context)) throw new Error('El área clínica está bloqueada.');
      try {
        setNoteSaving(true);
        await clinicalService.createClinicalNote(clientId, content, token, sessionId);
        if (!isCurrentContext(context)) return;
        await Promise.allSettled([loadRecord(), onRequestRefreshClient?.()]);
      } catch (error) {
        if (isCurrentContext(context)) handleAccessError(error);
        throw error;
      } finally {
        if (isCurrentContext(context)) setNoteSaving(false);
      }
    },
    [captureContext, clientId, handleAccessError, isCurrentContext, loadRecord, onRequestRefreshClient, token]
  );

  const uploadClinicalDocument = useCallback(
    async (
      file: UploadAsset,
      category: clinicalService.ClinicalDocumentCategory,
      sessionId?: string
    ) => {
      if (!token) {
        throw new Error('El área clínica está bloqueada.');
      }

      const context = captureContext();
      if (!isCurrentContext(context)) throw new Error('El área clínica está bloqueada.');
      try {
        setDocumentUploading(true);
        const uploaded = await clinicalService.uploadClinicalDocument(
          clientId,
          file,
          token,
          category,
          sessionId
        );
        if (!isCurrentContext(context)) return;
        await Promise.allSettled([loadRecord(), onRequestRefreshClient?.()]);
        return uploaded;
      } catch (error) {
        if (isCurrentContext(context)) handleAccessError(error);
        throw error;
      } finally {
        if (isCurrentContext(context)) setDocumentUploading(false);
      }
    },
    [captureContext, clientId, handleAccessError, isCurrentContext, loadRecord, onRequestRefreshClient, token]
  );

  const openClinicalDocument = useCallback(
    async (document: clinicalService.ClinicalDocument) => {
      if (!token) {
        throw new Error('El área clínica está bloqueada.');
      }

      const context = captureContext();
      if (!isCurrentContext(context)) throw new Error('El área clínica está bloqueada.');
      try {
        setOpeningDocumentId(document.id);
        await clinicalService.openClinicalDocument(document.id, document.fileName, document.mimeType, token);
      } catch (error) {
        if (isCurrentContext(context)) handleAccessError(error);
        throw error;
      } finally {
        if (isCurrentContext(context)) setOpeningDocumentId(null);
      }
    },
    [captureContext, handleAccessError, isCurrentContext, token]
  );

  const applyGuestAdminResult = useCallback((
    result: clinicalService.ClinicalGuestConsentAdminResult,
    context: ClinicalWorkspaceContext
  ): boolean => {
    if (!isCurrentContext(context)) return false;
    setRecord((current) => current && isCurrentContext(context) ? {
      ...current,
      consentRequestedAt: result.createdAt,
      activeConsentRequest: activeRequestFromGuestResult(result),
    } : current);
    return true;
  }, [isCurrentContext]);

  const requestDigitalConsent = useCallback(
    async (version = 'v1') => {
      const context = captureContext();
      try {
        setConsentSubmitting(true);
        const isGuest = record?.client.source === 'MANAGED'
          && resolveClinicalGuestConsentEligibility(record) === 'ELIGIBLE';
        const guestAction = 'ISSUE';
        let result: Awaited<ReturnType<typeof clinicalService.requestDigitalConsent>> | clinicalService.ClinicalGuestConsentAdminResult;
        try {
          result = isGuest
            ? token
              ? await clinicalService.requestClinicalGuestConsent(
                  clientId,
                  token,
                  guestIdempotencyKey(guestAction)
                )
              : (() => { throw new Error('El área clínica está bloqueada.'); })()
            : await clinicalService.requestDigitalConsent(clientId, version);
          if (isGuest && isCurrentContext(context)) finishGuestMutationAttempt(guestAction);
        } catch (error: unknown) {
          if (isGuest && isCurrentContext(context)) finishGuestMutationAttempt(guestAction, error);
          throw error;
        }
        if (!isCurrentContext(context)) return null;
        if ('channel' in result) {
          applyGuestAdminResult(result, context);
        }
        if (isGuest) {
          const [nextRecord, clientRefresh] = await Promise.all([
            loadRecord(),
            Promise.allSettled([onRequestRefreshClient?.()]),
          ]);
          if (isCurrentContext(context)) {
            setGuestConsentSyncPending(!nextRecord || clientRefresh.some((item) => item.status === 'rejected'));
          }
        } else {
          await Promise.all([loadRecord(), onRequestRefreshClient?.()]);
        }
        return result;
      } finally {
        if (isCurrentContext(context)) setConsentSubmitting(false);
      }
    },
    [applyGuestAdminResult, captureContext, clientId, finishGuestMutationAttempt, guestIdempotencyKey, isCurrentContext, loadRecord, onRequestRefreshClient, record, token]
  );

  const refreshAfterGuestMutation = useCallback(async (
    result: clinicalService.ClinicalGuestConsentAdminResult,
    context: ClinicalWorkspaceContext
  ) => {
    if (!applyGuestAdminResult(result, context)) return null;
    const [nextRecord, clientRefresh] = await Promise.all([
      loadRecord(),
      Promise.allSettled([onRequestRefreshClient?.()]),
    ]);
    if (isCurrentContext(context)) {
      setGuestConsentSyncPending(!nextRecord || clientRefresh.some((item) => item.status === 'rejected'));
    }
    return result;
  }, [applyGuestAdminResult, isCurrentContext, loadRecord, onRequestRefreshClient]);

  const resendGuestConsent = useCallback(async () => {
    if (!token || !record?.activeConsentRequest || record.activeConsentRequest.channel !== 'GUEST_EMAIL') {
      throw new Error('No hay una solicitud por email que se pueda reenviar.');
    }
    const context = captureContext();
    try {
      setConsentSubmitting(true);
      const action = `RESEND:${record.activeConsentRequest.id}`;
      try {
        const result = await clinicalService.resendClinicalGuestConsent(
          clientId,
          record.activeConsentRequest.id,
          token,
          guestIdempotencyKey(action)
        );
        if (isCurrentContext(context)) finishGuestMutationAttempt(action);
        return await refreshAfterGuestMutation(result, context);
      } catch (error: unknown) {
        if (isCurrentContext(context)) finishGuestMutationAttempt(action, error);
        throw error;
      }
    } finally {
      if (isCurrentContext(context)) setConsentSubmitting(false);
    }
  }, [captureContext, clientId, finishGuestMutationAttempt, guestIdempotencyKey, isCurrentContext, record?.activeConsentRequest, refreshAfterGuestMutation, token]);

  const cancelGuestConsent = useCallback(async () => {
    if (!token || !record?.activeConsentRequest || record.activeConsentRequest.channel !== 'GUEST_EMAIL') {
      throw new Error('No hay una solicitud por email que se pueda cancelar.');
    }
    const context = captureContext();
    try {
      setConsentSubmitting(true);
      return await refreshAfterGuestMutation(await clinicalService.cancelClinicalGuestConsent(
        clientId,
        record.activeConsentRequest.id,
        token
      ), context);
    } finally {
      if (isCurrentContext(context)) setConsentSubmitting(false);
    }
  }, [captureContext, clientId, isCurrentContext, record?.activeConsentRequest, refreshAfterGuestMutation, token]);

  const requestGuestWithdrawal = useCallback(async () => {
    if (!token) throw new Error('El área clínica está bloqueada.');
    const context = captureContext();
    try {
      setConsentSubmitting(true);
      const action = 'WITHDRAWAL';
      try {
        const result = await clinicalService.requestClinicalGuestWithdrawal(
          clientId,
          token,
          guestIdempotencyKey(action)
        );
        if (isCurrentContext(context)) finishGuestMutationAttempt(action);
        return await refreshAfterGuestMutation(result, context);
      } catch (error: unknown) {
        if (isCurrentContext(context)) finishGuestMutationAttempt(action, error);
        throw error;
      }
    } finally {
      if (isCurrentContext(context)) setConsentSubmitting(false);
    }
  }, [captureContext, clientId, finishGuestMutationAttempt, guestIdempotencyKey, isCurrentContext, refreshAfterGuestMutation, token]);

  const retryGuestConsentSync = useCallback(async () => {
    const context = captureContext();
    const [nextRecord, clientRefresh] = await Promise.all([
      loadRecord(),
      Promise.allSettled([onRequestRefreshClient?.()]),
    ]);
    const pending = !nextRecord || clientRefresh.some((item) => item.status === 'rejected');
    if (!isCurrentContext(context)) return false;
    setGuestConsentSyncPending(pending);
    return !pending;
  }, [captureContext, isCurrentContext, loadRecord, onRequestRefreshClient]);

  const attestClinicalConsent = useCallback(
    async (version = 'v1', evidenceDocumentId?: string) => {
      if (!token) {
        throw new Error('El área clínica está bloqueada.');
      }

      const context = captureContext();
      if (!isCurrentContext(context)) throw new Error('El área clínica está bloqueada.');
      try {
        setConsentSubmitting(true);
        await clinicalService.attestClinicalConsent(clientId, token, version, evidenceDocumentId);
        if (!isCurrentContext(context)) return;
        await Promise.allSettled([loadRecord(), onRequestRefreshClient?.()]);
      } catch (error) {
        if (isCurrentContext(context)) handleAccessError(error);
        throw error;
      } finally {
        if (isCurrentContext(context)) setConsentSubmitting(false);
      }
    },
    [captureContext, clientId, handleAccessError, isCurrentContext, loadRecord, onRequestRefreshClient, token]
  );

  const closeClinicalProcess = useCallback(async () => {
    if (!token) {
      throw new Error('El área clínica está bloqueada.');
    }

    const context = captureContext();
    if (!isCurrentContext(context)) throw new Error('El área clínica está bloqueada.');
    try {
      setClosingProcess(true);
      await clinicalService.closeClinicalProcess(clientId, token);
      if (!isCurrentContext(context)) return;
      await Promise.allSettled([loadRecord(), onRequestRefreshClient?.()]);
    } catch (error) {
      if (isCurrentContext(context)) handleAccessError(error);
      throw error;
    } finally {
      if (isCurrentContext(context)) setClosingProcess(false);
    }
  }, [captureContext, clientId, handleAccessError, isCurrentContext, loadRecord, onRequestRefreshClient, token]);

  return {
    record: token && record?.client.id === clientId ? record : null,
    recordLoading,
    recordError,
    noteSaving,
    documentUploading,
    openingDocumentId,
    consentSubmitting,
    closingProcess,
    loadingMoreNotes,
    loadingMoreDocuments,
    loadingMoreSessions,
    loadingMoreConsentEvents,
    guestConsentSyncPending,
    loadRecord,
    loadMoreNotes,
    loadMoreDocuments,
    loadMoreSessionFolders,
    loadMoreConsentEvents,
    ensureSessionFolderLoaded,
    saveClinicalNote,
    uploadClinicalDocument,
    openClinicalDocument,
    requestDigitalConsent,
    resendGuestConsent,
    cancelGuestConsent,
    requestGuestWithdrawal,
    retryGuestConsentSync,
    attestClinicalConsent,
    closeClinicalProcess,
  };
}
