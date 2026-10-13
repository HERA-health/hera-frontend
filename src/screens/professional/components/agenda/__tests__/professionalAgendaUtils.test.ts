import type { ProfessionalSession } from '../../../../../constants/types';
import { darkTheme, lightTheme } from '../../../../../constants/theme';
import {
  getAgendaCalendarRange,
  getAgendaStatusPalette,
  getMonthLayoutMetrics,
  getMonthVisibleEventLimit,
  getSessionDisplayStatus,
} from '../professionalAgendaUtils';

const session = (overrides: Partial<ProfessionalSession> = {}): ProfessionalSession => ({
  id: 'session-1',
  clientId: 'client-1',
  clientName: 'Paciente',
  clientInitial: 'P',
  date: new Date(2026, 7, 6, 10, 0),
  duration: 60,
  status: 'scheduled',
  type: 'video',
  ...overrides,
});

describe('professional agenda utilities', () => {
  it('builds complete Monday-to-Sunday week and 42-day month ranges', () => {
    expect(getAgendaCalendarRange('day', new Date(2026, 7, 6))).toEqual({
      from: '2026-08-06',
      to: '2026-08-06',
    });
    expect(getAgendaCalendarRange('week', new Date(2026, 7, 6))).toEqual({
      from: '2026-08-03',
      to: '2026-08-09',
    });
    expect(getAgendaCalendarRange('month', new Date(2026, 7, 6))).toEqual({
      from: '2026-07-27',
      to: '2026-09-06',
    });
  });

  it('fits six month rows when there is enough height', () => {
    const month = getMonthLayoutMetrics(700);

    expect(month.scrollEnabled).toBe(false);
    expect(month.contentHeight).toBeCloseTo(700);
  });

  it('uses legible fixed fallback metrics below the fit threshold', () => {
    expect(getMonthLayoutMetrics(420)).toMatchObject({ scrollEnabled: true, itemHeight: 104 });
  });

  it('reduces visible month events as cells become shorter', () => {
    expect(getMonthVisibleEventLimit(220, false)).toBe(3);
    expect(getMonthVisibleEventLimit(160, false)).toBe(2);
    expect(getMonthVisibleEventLimit(76, false)).toBe(1);
    expect(getMonthVisibleEventLimit(220, true)).toBe(2);
  });

  it('derives live display status without mutating the stored session status', () => {
    expect(getSessionDisplayStatus(session(), new Date(2026, 7, 6, 9, 0))).toBe('confirmed');
    expect(getSessionDisplayStatus(session(), new Date(2026, 7, 6, 10, 30))).toBe('in_progress');
    expect(getSessionDisplayStatus(session(), new Date(2026, 7, 6, 11, 30))).toBe('ended');
  });

  it('uses complete semantic surfaces for calendar sessions in both themes', () => {
    expect(getAgendaStatusPalette(lightTheme, 'completed')).toEqual({
      background: lightTheme.bgMuted,
      border: lightTheme.borderStrong,
      text: lightTheme.textSecondary,
    });
    expect(getAgendaStatusPalette(darkTheme, 'pending')).toEqual({
      background: darkTheme.status.pending.bg,
      border: darkTheme.status.pending.border,
      text: darkTheme.status.pending.text,
    });

    for (const theme of [lightTheme, darkTheme]) {
      const serializedPalettes = ['confirmed', 'pending', 'in_progress', 'completed', 'cancelled']
        .map((status) => JSON.stringify(getAgendaStatusPalette(
          theme,
          status as Parameters<typeof getAgendaStatusPalette>[1],
        )));
      expect(new Set(serializedPalettes).size).toBe(4);
    }
  });

});
