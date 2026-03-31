import { api } from './api';
import { getErrorMessage } from '../constants/errors';

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

export interface DashboardCharts {
  monthlyIncome: MonthlyIncomeItem[];
  sessionStatusBreakdown: SessionStatusBreakdown;
  sessionsByDayOfWeek: SessionsByDayItem[];
}

export interface DashboardData {
  kpis: DashboardKpis;
  charts: DashboardCharts;
}

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
};
