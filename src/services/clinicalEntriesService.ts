import { z } from "zod";
import { api } from "./api";
import {
  clinicalDocumentSchema,
  clinicalNoteSchema,
  ClinicalRequestError,
  type ClinicalNote,
  type ClinicalDocument,
} from "./clinicalService";
import { createSecureRandomUuid } from "../utils/secureRandom";

export const historyContentSchema = z.object({
  title: z.string(),
  type: z.enum([
    "ASSESSMENT",
    "BACKGROUND",
    "EVOLUTION",
    "OBJECTIVES",
    "TREATMENT_PLAN",
  ]),
  status: z.enum(["DRAFT", "COMPLETE"]),
  content: z.string(),
});
const historySchema = historyContentSchema.extend({
  id: z.string(),
  occurredAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  authorId: z.string(),
  authorName: z.string(),
  sessionIds: z.array(z.string()),
  sessions: z.array(
    z.object({
      id: z.string(),
      date: z.string().datetime(),
      duration: z.number(),
      type: z.string(),
      status: z.string(),
    }),
  ),
  documents: z.array(clinicalDocumentSchema),
});
export type HistoryEntry = z.infer<typeof historySchema>;
export type HistoryInput = z.infer<typeof historyContentSchema> & {
  occurredAt: string;
  sessionIds: string[];
  expectedUpdatedAt?: string;
};
export interface EntryQuery {
  resourceId?: string;
  search?: string;
  type?: string;
  tag?: string;
  authorId?: string;
  sessionId?: string;
  status?: "" | "DRAFT" | "COMPLETE";
  cursor?: string;
}
const pageInfo = z.object({
  total: z.number().int(),
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});
const filters = z.object({
  authors: z.array(z.object({ id: z.string(), name: z.string() })),
  tags: z.array(z.string()),
});
export interface EntryPage<T> {
  items: T[];
  pageInfo: z.infer<typeof pageInfo>;
  filters: z.infer<typeof filters>;
}
const headers = (token: string) => ({ "x-clinical-access-token": token });
export const getNoteTags = async (
  clientId: string,
  token: string,
): Promise<string[]> => {
  try {
    const response = await api.get<{ data: unknown }>(
      `/clinical/records/${clientId}/note-tags`,
      { headers: headers(token) },
    );
    return z.object({ tags: z.array(z.string()) }).parse(response.data.data)
      .tags;
  } catch (error) {
    throw new ClinicalRequestError(
      error,
      "No se pudieron consultar las etiquetas clínicas.",
    );
  }
};
const search = async <T>(
  clientId: string,
  token: string,
  kind: string,
  query: EntryQuery,
  item: z.ZodType<T>,
): Promise<EntryPage<T>> => {
  try {
    return z
      .object({ items: z.array(item), pageInfo, filters })
      .parse(
        (
          await api.post<{ data: unknown }>(
            `/clinical/records/${clientId}/entries/${kind}/search`,
            query,
            { headers: headers(token) },
          )
        ).data.data,
      );
  } catch (error) {
    throw new ClinicalRequestError(
      error,
      "No se pudo consultar el contenido clínico.",
    );
  }
};
export const searchNotes = (
  clientId: string,
  token: string,
  query: EntryQuery,
): Promise<EntryPage<ClinicalNote>> =>
  search(clientId, token, "NOTE", query, clinicalNoteSchema);
export const searchHistory = (
  clientId: string,
  token: string,
  query: EntryQuery,
): Promise<EntryPage<HistoryEntry>> =>
  search(clientId, token, "HISTORY", query, historySchema);
export interface DocumentQuery {
  search?: string;
  classification?: string;
  format?: "" | "PDF" | "IMAGE" | "DOCX";
  authorId?: string;
  documentId?: string;
  archived?: boolean;
  cursor?: string;
}
export const searchDocuments = async (
  clientId: string,
  token: string,
  query: DocumentQuery,
): Promise<EntryPage<ClinicalDocument>> => {
  try {
    return z
      .object({ items: z.array(clinicalDocumentSchema), pageInfo, filters })
      .parse(
        (
          await api.post<{ data: unknown }>(
            `/clinical/records/${clientId}/document-search`,
            query,
            { headers: headers(token) },
          )
        ).data.data,
      );
  } catch (error) {
    throw new ClinicalRequestError(
      error,
      "No se pudieron consultar los documentos.",
    );
  }
};
export const saveHistory = async (
  clientId: string,
  token: string,
  input: HistoryInput,
  id?: string,
  operationKey = createSecureRandomUuid(),
): Promise<HistoryEntry> => {
  try {
    const config = {
      headers: { ...headers(token), "Idempotency-Key": operationKey },
    };
    const url = `/clinical/records/${clientId}/history-entries${id ? `/${id}` : ""}`;
    const response = id
      ? await api.put<{ data: unknown }>(url, input, config)
      : await api.post<{ data: unknown }>(url, input, config);
    return historySchema.parse(response.data.data);
  } catch (error) {
    throw new ClinicalRequestError(
      error,
      "No se pudo guardar la entrada clínica.",
    );
  }
};
const revisionSchema = z.object({
  current: historySchema,
  items: z.array(
    historyContentSchema.extend({
      id: z.string(),
      versionAt: z.string(),
      replacedAt: z.string(),
      revisedByName: z.string().nullable().optional(),
      links: z
        .object({ occurredAt: z.string(), sessionIds: z.array(z.string()) })
        .nullable(),
    }),
  ),
  nextCursor: z.string().nullable(),
});
export type HistoryRevisions = z.infer<typeof revisionSchema>;
export const getHistoryRevisions = async (
  clientId: string,
  token: string,
  id: string,
  cursor?: string,
): Promise<HistoryRevisions> => {
  try {
    return revisionSchema.parse(
      (
        await api.get<{ data: unknown }>(
          `/clinical/records/${clientId}/history-entries/${id}/revisions`,
          { headers: headers(token), params: { cursor } },
        )
      ).data.data,
    );
  } catch (error) {
    throw new ClinicalRequestError(error, "No se pudo cargar el historial.");
  }
};
