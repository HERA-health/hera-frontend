import { useCallback, useEffect, useState } from 'react';
import type { UploadAsset } from '../utils/multipartUpload';
import * as clinicalService from '../services/clinicalService';

interface UseClinicalWorkspaceDataOptions {
  clientId: string;
  token: string | null;
  onRequestRefreshClient?: () => Promise<void>;
  onAccessLost?: (message: string) => void;
}

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
    if (!token) {
      setRecord(null);
      return null;
    }

    try {
      setRecordLoading(true);
      const nextRecord = await clinicalService.getClinicalRecord(clientId, token);
      setRecord(nextRecord);
      return nextRecord;
    } catch (error) {
      handleAccessError(error);
      return null;
    } finally {
      setRecordLoading(false);
    }
  }, [clientId, handleAccessError, token]);

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

  const requestDigitalConsent = useCallback(
    async (version = 'v1') => {
      try {
        setConsentSubmitting(true);
        const result = await clinicalService.requestDigitalConsent(clientId, version);
        await Promise.all([loadRecord(), onRequestRefreshClient?.()]);
        return result;
      } finally {
        setConsentSubmitting(false);
      }
    },
    [clientId, loadRecord, onRequestRefreshClient]
  );

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
    loadRecord,
    loadMoreNotes,
    loadMoreDocuments,
    loadMoreSessionFolders,
    loadMoreConsentEvents,
    saveClinicalNote,
    uploadClinicalDocument,
    openClinicalDocument,
    requestDigitalConsent,
    attestClinicalConsent,
    closeClinicalProcess,
  };
}
