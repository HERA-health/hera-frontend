import { z } from 'zod';
import { api } from './api';
import { buildMultipartFormData, type UploadAsset } from '../utils/multipartUpload';

export const resourceCategorySchema = z.enum(['LEGAL', 'CLINICAL', 'THERAPEUTIC', 'OTHER']);
export const resourceFormatSchema = z.enum(['PDF', 'DOCX']);
export const resourcePlanSchema = z.enum(['CALMA', 'CRECIMIENTO', 'HORIZONTE']);
export const resourceMetadataSchema = z.object({
  title: z.string().trim().min(1).max(160), description: z.string().trim().min(1).max(2000),
  category: resourceCategorySchema, minimumPlan: resourcePlanSchema,
});
export const resourceSchema = resourceMetadataSchema.extend({
  id: z.string(), status: z.enum(['DRAFT', 'PUBLISHED']), updatedAt: z.string(),
  files: z.array(z.object({ id: z.string(), format: resourceFormatSchema, fileName: z.string(), sizeBytes: z.number() })),
});
const resourceListSchema = z.object({
  items: z.array(resourceSchema), total: z.number(), page: z.number(), pageSize: z.number(), openAccess: z.boolean(),
  categoryCounts: z.array(z.object({ category: resourceCategorySchema, count: z.number() })),
});
export type HeraResource = z.infer<typeof resourceSchema>;
export type ResourceMetadata = z.infer<typeof resourceMetadataSchema>;
export type ResourceCategory = z.infer<typeof resourceCategorySchema>;
export type ResourceFormat = z.infer<typeof resourceFormatSchema>;
export type ResourceList = z.infer<typeof resourceListSchema>;
export type ResourceQuery = { search?: string; category?: ResourceCategory; format?: ResourceFormat; status?: HeraResource['status']; page?: number };
const base = (admin: boolean) => admin ? '/admin/resources' : '/resources';
export async function listResources(query: ResourceQuery, admin: boolean, signal?: AbortSignal) {
  return resourceListSchema.parse((await api.get(base(admin), { params: query, signal })).data);
}
export async function saveResource(id: string | undefined, data: ResourceMetadata) {
  const input = resourceMetadataSchema.parse(data);
  return resourceSchema.parse((id ? await api.put(`${base(true)}/${id}`, input) : await api.post(base(true), input)).data);
}
export async function publishResource(id: string, status: HeraResource['status']) {
  return resourceSchema.parse((await api.patch(`${base(true)}/${id}/publication`, { status })).data);
}
export async function uploadResourceFile(id: string, file: UploadAsset) {
  const form = await buildMultipartFormData('file', file, {}, 'recurso');
  return z.object({ resource: resourceSchema, cleanupPending: z.boolean() }).parse(
    (await api.post(`${base(true)}/${id}/files`, form, { timeout: 60000 })).data);
}
export async function requestResourceFile(id: string, format: ResourceFormat, mode: 'preview' | 'download', admin: boolean, signal?: AbortSignal) {
  return z.object({ url: z.url().refine(url => url.startsWith('https://')), expiresIn: z.number(), fileName: z.string(), mimeType: z.string() }).parse(
    (await api.post(`${base(admin)}/${id}/files/${format}/access`, { mode }, { signal })).data);
}
