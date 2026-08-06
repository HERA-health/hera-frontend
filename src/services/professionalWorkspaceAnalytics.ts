import { z } from 'zod';
import * as analyticsService from './analyticsService';

const emptyPropertiesSchema = z.object({}).strict();

const professionalWorkspaceEventSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('professional_quick_search_opened'),
    properties: emptyPropertiesSchema,
  }).strict(),
  z.object({
    event: z.literal('professional_quick_search_result_selected'),
    properties: z.object({ category: z.enum(['navigation', 'patient']) }).strict(),
  }).strict(),
  z.object({
    event: z.literal('professional_create_action_selected'),
    properties: z.object({ category: z.enum(['session', 'patient', 'invoice']) }).strict(),
  }).strict(),
  z.object({
    event: z.literal('professional_attention_opened'),
    properties: z.object({ state: z.enum(['pending', 'all_clear', 'unavailable']) }).strict(),
  }).strict(),
  z.object({
    event: z.literal('professional_attention_action_selected'),
    properties: z.object({
      category: z.enum(['session_requests', 'draft_invoices', 'profile', 'support']),
    }).strict(),
  }).strict(),
  z.object({
    event: z.literal('professional_home_module_action_selected'),
    properties: z.object({
      module: z.enum(['activation', 'next_session', 'attention', 'today', 'weekly_summary']),
      action: z.enum([
        'profile',
        'availability',
        'detail',
        'join',
        'create',
        'agenda',
        'billing',
        'support',
        'statistics',
      ]),
    }).strict(),
  }).strict(),
  z.object({
    event: z.literal('professional_agenda_opened'),
    properties: emptyPropertiesSchema,
  }).strict(),
  z.object({
    event: z.literal('professional_agenda_view_changed'),
    properties: z.object({ view: z.enum(['day', 'week', 'month', 'list']) }).strict(),
  }).strict(),
]);

export type ProfessionalWorkspaceEvent = z.infer<typeof professionalWorkspaceEventSchema>;

/**
 * Runtime validation is intentional: it protects analytics even if an unsafe
 * value reaches this boundary from JavaScript or a future loosely typed caller.
 */
export const trackProfessionalWorkspaceEvent = (input: ProfessionalWorkspaceEvent): boolean => {
  const parsed = professionalWorkspaceEventSchema.safeParse(input);
  if (!parsed.success) return false;
  analyticsService.track(parsed.data.event, parsed.data.properties);
  return true;
};
