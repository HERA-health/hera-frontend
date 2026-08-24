import { useCallback, useEffect, useRef, useState } from 'react';
import type { UploadAsset } from '../utils/multipartUpload';
import * as clinicalService from '../services/clinicalService';
import { resolveClinicalGuestConsentEligibility } from '../services/clinicalGuestConsentEligibility';
import { createSecureRandomUuid } from '../utils/secureRandom';

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
  const guestMutationRef = useRef<{ clientId: string; action: string; key: string } | null>(null);
  if (activeContextRef.current.clientId !== clientId) {
    activeContextRef.current = {
      clientId,
      generation: activeContextRef.current.generation + 1,
    };
  }

  const captureContext = useCallback((): ClinicalWorkspaceContext => ({
    clientId,
    generation: activeContextRef.current.generation,
  }), [clientId]);

  const isCurrentContext = useCallback((context: ClinicalWorkspaceContext): boolean => (
    activeContextRef.current.clientId === context.clientId
    && activeContextRef.current.generation === context.generation
  ), []);

  useEffect(() => {
    setConsentSubmitting(false);
    setGuestConsentSyncPending(false);
    guestMutationRef.current = null;
  }, [clientId]);

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
      if (!isClinicalAccessLossError(error)) {
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
    if (!token) {
      if (isCurrentContext(context)) setRecord(null);
      return null;
    }

    try {
      setRecordLoading(true);
      const nextRecord = await clinicalService.getClinicalRecord(clientId, token);
      if (isCurrentContext(context)) setRecord(nextRecord);
      return nextRecord;
    } catch (error) {
      handleAccessError(error);
      return null;
    } finally {
      if (isCurrentContext(context)) setRecordLoading(false);
    }
  }, [captureContext, clientId, handleAccessError, isCurrentContext, token]);

  useEffect(() => {
    if (!token) {
      setRecord(null);
      return;
    }

    void loadRecord();
  }, [loadRecord, token]);

  const loadMoreNotes = useCallback(async () => {
    if (!token || !record?.pagination.notes.hasMore || !record.pagination.notes.nextCursor) {
      return;
    }

    try {
      setLoadingMoreNotes(true);
      const nextPage = await clinicalService.listClinicalNotes(clientId, token, {
        cursor: record.pagination.notes.nextCursor,
      });

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
      handleAccessError(error);
    } finally {
      setLoadingMoreNotes(false);
    }
  }, [clientId, handleAccessError, record, token]);

  const loadMoreDocuments = useCallback(async () => {
    if (!token || !record?.pagination.documents.hasMore || !record.pagination.documents.nextCursor) {
      return;
    }

    try {
      setLoadingMoreDocuments(true);
      const nextPage = await clinicalService.listClinicalDocuments(clientId, token, {
        cursor: record.pagination.documents.nextCursor,
        scope: 'general',
      });

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
      handleAccessError(error);
    } finally {
      setLoadingMoreDocuments(false);
    }
  }, [clientId, handleAccessError, record, token]);

  const loadMoreConsentEvents = useCallback(async () => {
    if (!token || !record?.pagination.consentEvents.hasMore || !record.pagination.consentEvents.nextCursor) {
      return;
    }

    try {
      setLoadingMoreConsentEvents(true);
      const nextPage = await clinicalService.listClinicalConsentEvents(clientId, token, {
        cursor: record.pagination.consentEvents.nextCursor,
      });

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
      handleAccessError(error);
    } finally {
      setLoadingMoreConsentEvents(false);
    }
  }, [clientId, handleAccessError, record, token]);

  const loadMoreSessionFolders = useCallback(async () => {
    if (!token || !record?.pagination.sessionFolders.hasMore || !record.pagination.sessionFolders.nextCursor) {
      return;
    }

    try {
      setLoadingMoreSessions(true);
      const nextPage = await clinicalService.listClinicalSessionFolders(clientId, token, {
        cursor: record.pagination.sessionFolders.nextCursor,
      });

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
      handleAccessError(error);
    } finally {
      setLoadingMoreSessions(false);
    }
  }, [clientId, handleAccessError, record, token]);

  const ensureSessionFolderLoaded = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!token || !record) {
      return false;
    }

    if (record.sessionFolders.some((folder) => folder.session.id === sessionId)) {
      return true;
    }

    try {
      setLoadingMoreSessions(true);
      const folder = await clinicalService.getClinicalSessionFolder(clientId, sessionId, token);
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
      handleAccessError(error);
      throw error;
    } finally {
      setLoadingMoreSessions(false);
    }
  }, [clientId, handleAccessError, record, token]);

  const saveClinicalNote = useCallback(
    async (content: string, sessionId?: string) => {
      if (!token) {
        throw new Error('El área clínica está bloqueada.');
      }

      try {
        setNoteSaving(true);
        await clinicalService.createClinicalNote(clientId, content, token, sessionId);
        await Promise.all([loadRecord(), onRequestRefreshClient?.()]);
      } catch (error) {
        handleAccessError(error);
        throw error;
      } finally {
        setNoteSaving(false);
      }
    },
    [clientId, handleAccessError, loadRecord, onRequestRefreshClient, token]
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

      try {
        setDocumentUploading(true);
        const uploaded = await clinicalService.uploadClinicalDocument(
          clientId,
          file,
          token,
          category,
          sessionId
        );
        await Promise.all([loadRecord(), onRequestRefreshClient?.()]);
        return uploaded;
      } catch (error) {
        handleAccessError(error);
        throw error;
      } finally {
        setDocumentUploading(false);
      }
    },
    [clientId, handleAccessError, loadRecord, onRequestRefreshClient, token]
  );

  const openClinicalDocument = useCallback(
    async (document: clinicalService.ClinicalDocument) => {
      if (!token) {
        throw new Error('El área clínica está bloqueada.');
      }

      try {
        setOpeningDocumentId(document.id);
        await clinicalService.openClinicalDocument(document.id, document.fileName, document.mimeType, token);
      } catch (error) {
        handleAccessError(error);
        throw error;
      } finally {
        setOpeningDocumentId(null);
      }
    },
    [handleAccessError, token]
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
          if (isGuest) finishGuestMutationAttempt(guestAction);
        } catch (error: unknown) {
          if (isGuest) finishGuestMutationAttempt(guestAction, error);
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
        finishGuestMutationAttempt(action);
        return await refreshAfterGuestMutation(result, context);
      } catch (error: unknown) {
        finishGuestMutationAttempt(action, error);
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
        finishGuestMutationAttempt(action);
        return await refreshAfterGuestMutation(result, context);
      } catch (error: unknown) {
        finishGuestMutationAttempt(action, error);
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

      try {
        setConsentSubmitting(true);
        await clinicalService.attestClinicalConsent(clientId, token, version, evidenceDocumentId);
        await Promise.all([loadRecord(), onRequestRefreshClient?.()]);
      } catch (error) {
        handleAccessError(error);
        throw error;
      } finally {
        setConsentSubmitting(false);
      }
    },
    [clientId, handleAccessError, loadRecord, onRequestRefreshClient, token]
  );

  const closeClinicalProcess = useCallback(async () => {
    if (!token) {
      throw new Error('El área clínica está bloqueada.');
    }

    try {
      setClosingProcess(true);
      await clinicalService.closeClinicalProcess(clientId, token);
      await Promise.all([loadRecord(), onRequestRefreshClient?.()]);
    } catch (error) {
      handleAccessError(error);
      throw error;
    } finally {
      setClosingProcess(false);
    }
  }, [clientId, handleAccessError, loadRecord, onRequestRefreshClient, token]);

  return {
    record,
    recordLoading,
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
