import type React from 'react';
import type { Client } from '../../services/professionalService';
import type * as clinical from '../../services/clinicalService';
import type { ClinicalComposerDraft } from './ClinicalWorkspaceComposer';

export type ClinicalPatientSection = 'summary' | 'history' | 'notes' | 'exercises' | 'documents' | 'packages';
export type ClinicalPatientAction = { id: number; kind: 'NOTE' | 'UPLOAD' | 'CONSENT'; classification?: clinical.DocumentMetadata['classification'] };
export interface ClinicalPatientWorkspaceProps {
  client: Client; record: clinical.ClinicalRecord; token: string; section: ClinicalPatientSection;
  action?: ClinicalPatientAction; focusSessionId?: string;
  onActionConsumed?: (id: number) => void;
  consentPanel: React.ReactNode; onError: (error: unknown) => void;
  onRefresh: () => Promise<unknown>; onRequestRefreshClient?: () => Promise<void>;
  onLock: () => void;
  onCounters?: (counters: clinical.ClinicalTimelinePage['counters']) => void;
  onSection: (section: ClinicalPatientSection) => void;
  tourTargetsActive?: boolean;
  sessionPanel?: (compose: (draft: ClinicalComposerDraft) => void) => React.ReactNode;
}
