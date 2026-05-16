import type { ReactNode } from 'react';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
import type { TourStep } from 'react-native-spotlight-tour';
import type { RootStackParamList } from '../../constants/types';

export const PROFESSIONAL_TOUR_IDS = [
  'professional_home_v1',
  'professional_clients_v1',
  'professional_sessions_v1',
  'professional_availability_v1',
  'professional_billing_v1',
  'professional_profile_v1',
  'professional_client_profile_v1',
  'professional_clinical_area_v1',
  'professional_dashboard_v1',
] as const;

export type ProfessionalTourId = typeof PROFESSIONAL_TOUR_IDS[number];

export const PROFESSIONAL_TOUR_TARGET_IDS = [
  'professional.nav.mobile-menu',
  'professional.nav.home',
  'professional.nav.clients',
  'professional.nav.sessions',
  'professional.nav.billing',
  'professional.nav.dashboard',
  'professional.nav.availability',
  'professional.nav.profile',
  'professional.home.calendar',
  'professional.home.pending-requests',
  'professional.home.upcoming-sessions',
  'professional.clients.new-patient',
  'professional.clients.filters',
  'professional.clients.grid',
  'professional.sessions.new-session',
  'professional.sessions.view-tabs',
  'professional.sessions.date-controls',
  'professional.sessions.list',
  'professional.availability.presets',
  'professional.availability.weekly-grid',
  'professional.availability.sidebar',
  'professional.availability.save',
  'professional.billing.new-invoice',
  'professional.billing.invoice-list',
  'professional.billing.tariffs',
  'professional.billing.fiscal',
  'professional.billing.automation',
  'professional.profile.tabs',
  'professional.profile.visibility',
  'professional.profile.preview',
  'professional.profile.save',
  'professional.client-profile.hero',
  'professional.client-profile.actions',
  'professional.client-profile.tabs',
  'professional.clinical.hero',
  'professional.clinical.workspace-tabs',
  'professional.clinical.notes',
  'professional.clinical.timeline',
  'professional.clinical.questionnaire',
  'professional.clinical.consent',
  'professional.clinical.consent-documents',
  'professional.clinical.reports',
  'professional.clinical.documents',
  'professional.dashboard.kpis',
  'professional.dashboard.income-chart',
  'professional.dashboard.detail-charts',
] as const;

export type ProfessionalTourTargetId = typeof PROFESSIONAL_TOUR_TARGET_IDS[number];
export type ProfessionalTourDisplayMode = 'all' | 'desktop' | 'mobile';
export type ProfessionalTourStartSource = 'auto' | 'manual';
export type ProfessionalTourSeenStatus = 'completed' | 'skipped';
export type ProfessionalTourAutoStartGuard = () => boolean;
export type ProfessionalTourStepPreparationHandler = () => Promise<void> | void;

export interface ProfessionalTourTargetLayout {
  height: number;
  width: number;
  x: number;
  y: number;
}

export type ProfessionalTourTargetMeasurer =
  () => Promise<ProfessionalTourTargetLayout | null>;

export interface ProfessionalTourStepDefinition {
  id: string;
  targetId: ProfessionalTourTargetId;
  title: string;
  body: string;
  desktopPlacement?: TourStep['placement'];
  display?: ProfessionalTourDisplayMode;
  mobilePlacement?: TourStep['placement'];
  placement?: TourStep['placement'];
  shape?: TourStep['shape'];
}

export interface ProfessionalTourDefinition {
  id: ProfessionalTourId;
  version: number;
  routeName: keyof RootStackParamList;
  autoStart: boolean;
  steps: ProfessionalTourStepDefinition[];
}

export interface TourTargetProps {
  id: ProfessionalTourTargetId;
  active?: boolean;
  children: React.ReactElement;
  fill?: boolean;
  pointerEvents?: ViewProps['pointerEvents'];
  spotlightStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

export interface ProfessionalTourContextValue {
  activeTourId: ProfessionalTourId | null;
  canStartCurrentRouteTour: boolean;
  currentRouteName: string;
  hasTourForCurrentRoute: boolean;
  isRunning: boolean;
  targetRegistryVersion: number;
  getTargetIndex: (targetId: ProfessionalTourTargetId) => number | null;
  registerStepPreparation: (
    targetId: ProfessionalTourTargetId,
    handler: ProfessionalTourStepPreparationHandler,
  ) => () => void;
  registerTarget: (
    targetId: ProfessionalTourTargetId,
    measureTarget?: ProfessionalTourTargetMeasurer,
  ) => () => void;
  registerCurrentRouteTourPreference: (tourId: ProfessionalTourId) => () => void;
  measureTarget: (
    targetId: ProfessionalTourTargetId,
  ) => Promise<ProfessionalTourTargetLayout | null>;
  requestAutoStart: (
    tourId: ProfessionalTourId,
    shouldStart?: ProfessionalTourAutoStartGuard,
  ) => Promise<boolean>;
  startTour: (
    tourId: ProfessionalTourId,
    source?: ProfessionalTourStartSource
  ) => Promise<boolean>;
  startCurrentRouteTour: (source?: ProfessionalTourStartSource) => Promise<boolean>;
}

export interface ProfessionalTourProviderProps {
  children: ReactNode;
  currentRouteName: string;
}
