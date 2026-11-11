import type { ResourceCategory, ResourceMetadata } from '../../services/resourceService';

export const resourceCategories: Array<{ value: ResourceCategory; label: string; description: string; icon: 'document-text-outline' | 'clipboard-outline' | 'book-outline' | 'folder-open-outline' }> = [
  { value: 'LEGAL', label: 'Documentos legales y consentimientos', description: 'Modelos y documentos para tu consulta.', icon: 'document-text-outline' },
  { value: 'CLINICAL', label: 'Documentos clínicos', description: 'Evaluación, informes y seguimiento.', icon: 'clipboard-outline' },
  { value: 'THERAPEUTIC', label: 'Recursos terapéuticos', description: 'Ejercicios y material de apoyo.', icon: 'book-outline' },
  { value: 'OTHER', label: 'Otros', description: 'Más recursos para tu práctica profesional.', icon: 'folder-open-outline' },
];
export const resourcePlans: Array<{ value: ResourceMetadata['minimumPlan']; label: string }> = [
  { value: 'CALMA', label: 'Calma' }, { value: 'CRECIMIENTO', label: 'Crecimiento' }, { value: 'HORIZONTE', label: 'Horizonte' },
];
export const planLabel = (plan: ResourceMetadata['minimumPlan']) => resourcePlans.find(item => item.value === plan)?.label ?? plan;
export const fileSizeLabel = (bytes: number) => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
