import { api } from './api';
import { getErrorMessage } from '../constants/errors';
import { z } from 'zod';
import {
  cachedGet,
  getCachedValue,
  invalidateRequestCache,
} from './requestCache';

// ============================================================================
// TYPES
// ============================================================================

export interface SessionsThisMonth {
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
}

export interface DashboardKpis {
  incomeThisMonth: number;
  sessionsThisMonth: SessionsThisMonth;
  activePatients: number;
  upcomingThisWeek: number;
}

export interface MonthlyIncomeItem {
  month: string;
  total: number;
}

export interface SessionStatusBreakdown {
  completed: number;
  cancelled: number;
  pending: number;
}

export interface SessionsByDayItem {
  day: number;
  label: string;
  count: number;
}

export interface RatingBreakdownItem {
  stars: number;
  count: number;
}

export interface ReviewsMetrics {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: RatingBreakdownItem[];
}

export interface DashboardCharts {
  monthlyIncome: MonthlyIncomeItem[];
  sessionStatusBreakdown: SessionStatusBreakdown;
  sessionsByDayOfWeek: SessionsByDayItem[];
  reviewsMetrics: ReviewsMetrics;
}

export interface DashboardData {
  kpis: DashboardKpis;
  charts: DashboardCharts;
}

const homeSessionSchema = z.object({
  id: z.string(),
  patient: z.object({
    id: z.string(),
    displayName: z.string(),
  }).strict(),
  startsAt: z.iso.datetime(),
  durationMinutes: z.number().int().positive(),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
  type: z.enum(['IN_PERSON', 'VIDEO_CALL', 'PHONE_CALL']),
  origin: z.enum(['PRIVATE', 'CLINIC']),
  clinicName: z.string().nullable(),
  inProgress: z.boolean(),
  canJoinVideo: z.boolean(),
}).strict();

const professionalHomeSchema = z.object({
  generatedAt: z.iso.datetime(),
  timeZone: z.literal('Europe/Madrid'),
  nextSession: homeSessionSchema.nullable(),
  today: z.object({
    date: z.iso.date(),
    bookedMinutes: z.number().int().nonnegative(),
    sessions: z.array(homeSessionSchema),
  }).strict(),
  week: z.object({
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    totalSessions: z.number().int().nonnegative(),
    bookedMinutes: z.number().int().nonnegative(),
    completedSessions: z.number().int().nonnegative(),
    pendingSessions: z.number().int().nonnegative(),
    days: z.array(z.object({
      date: z.iso.date(),
      sessions: z.number().int().nonnegative(),
      bookedMinutes: z.number().int().nonnegative(),
    }).strict()).length(7),
  }).strict(),
  availabilityConfiguredDays: z.number().int().min(0).max(7),
  pendingRequests: z.object({
    total: z.number().int().nonnegative(),
    items: z.array(homeSessionSchema).max(3),
  }).strict(),
  draftInvoices: z.number().int().nonnegative(),
  automation: z.object({
    sessionConfirmation: z.boolean(),
    invoiceGeneration: z.boolean(),
    invoiceDelivery: z.boolean(),
  }).strict(),
}).strict();

export type ProfessionalHomeSession = z.infer<typeof homeSessionSchema>;
export type ProfessionalHomeData = z.infer<typeof professionalHomeSchema>;

const PROFESSIONAL_HOME_CACHE_MS = 30_000;
const PROFESSIONAL_HOME_CACHE_KEY = 'professional:home';
type ProfessionalHomeChangeListener = () => void;
const professionalHomeChangeListeners = new Set<ProfessionalHomeChangeListener>();

const loadProfessionalHome = async (): Promise<ProfessionalHomeData> => {
  const response = await api.get('/dashboard/home');
  return professionalHomeSchema.parse(response.data.data);
};

export const subscribeProfessionalHomeChanges = (
  listener: ProfessionalHomeChangeListener,
): (() => void) => {
  professionalHomeChangeListeners.add(listener);
  return () => professionalHomeChangeListeners.delete(listener);
};

export const notifyProfessionalHomeChanged = (): void => {
  invalidateRequestCache(PROFESSIONAL_HOME_CACHE_KEY);
  professionalHomeChangeListeners.forEach((listener) => listener());
};

// ============================================================================
// API CALLS
// ============================================================================

export const dashboardService = {
  async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await api.get('/dashboard');
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'No se pudo cargar el dashboard'));
    }
  },
  async getProfessionalHome(options?: { force?: boolean }): Promise<ProfessionalHomeData> {
    if (options?.force) {
      invalidateRequestCache(PROFESSIONAL_HOME_CACHE_KEY);
    }

    return cachedGet(
      PROFESSIONAL_HOME_CACHE_KEY,
      loadProfessionalHome,
      { ttlMs: PROFESSIONAL_HOME_CACHE_MS },
    ).catch((error: unknown) => {
        if (error instanceof z.ZodError) {
          throw new Error('No se pudo cargar el inicio profesional');
        }
        throw new Error(getErrorMessage(error, 'No se pudo cargar el inicio profesional'));
      });
  },
  getCachedProfessionalHome(): ProfessionalHomeData | null {
    return getCachedValue<ProfessionalHomeData>(
      PROFESSIONAL_HOME_CACHE_KEY,
      { includeExpired: true },
    );
  },
  clearProfessionalHomeCache(): void {
    invalidateRequestCache(PROFESSIONAL_HOME_CACHE_KEY);
  },
};
