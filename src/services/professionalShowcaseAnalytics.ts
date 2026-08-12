import { z } from 'zod';
import { PROFESSIONAL_SHOWCASE_STEP_IDS } from '../constants/professionalShowcase';
import * as analyticsService from './analyticsService';

const stepIdSchema = z.enum(PROFESSIONAL_SHOWCASE_STEP_IDS);

const professionalShowcaseEventSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('landing_professional_showcase_opened'),
    properties: z.object({ placement: z.literal('professional_section') }).strict(),
  }).strict(),
  z.object({
    event: z.literal('professional_showcase_step_viewed'),
    properties: z.object({
      step: stepIdSchema,
      position: z.number().int().min(1).max(PROFESSIONAL_SHOWCASE_STEP_IDS.length),
    }).strict(),
  }).strict(),
  z.object({
    event: z.literal('professional_showcase_register_clicked'),
    properties: z.object({
      step: stepIdSchema,
      placement: z.enum(['header', 'stage', 'final']),
    }).strict(),
  }).strict(),
]);

export type ProfessionalShowcaseEvent = z.infer<typeof professionalShowcaseEventSchema>;

export const trackProfessionalShowcaseEvent = (
  input: ProfessionalShowcaseEvent,
): boolean => {
  const parsed = professionalShowcaseEventSchema.safeParse(input);
  if (!parsed.success) return false;

  analyticsService.track(parsed.data.event, parsed.data.properties);
  return true;
};
