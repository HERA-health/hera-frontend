import type { ProfessionalSession } from '../../../../../constants/types';
import { darkTheme, lightTheme } from '../../../../../constants/theme';
import {
  CALENDAR_FIT_MIN_HEIGHT,
  TIME_SLOTS,
  getAgendaCalendarRange,
  getAgendaDayScrollOffset,
  getAgendaStatusPalette,
  getMonthLayoutMetrics,
  getMonthVisibleEventLimit,
  getSessionDisplayStatus,
  getWeekLayoutMetrics,
  getWeekSessionBlockMetrics,
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

  it('fits all week hours and six month rows at the fit threshold', () => {
    const week = getWeekLayoutMetrics(CALENDAR_FIT_MIN_HEIGHT);
    const month = getMonthLayoutMetrics(CALENDAR_FIT_MIN_HEIGHT);

    expect(week.scrollEnabled).toBe(false);
    expect(week.contentHeight).toBeCloseTo(CALENDAR_FIT_MIN_HEIGHT);
    expect(month.scrollEnabled).toBe(false);
    expect(month.contentHeight).toBeCloseTo(CALENDAR_FIT_MIN_HEIGHT);
    expect(TIME_SLOTS).toEqual(Array.from({ length: 17 }, (_, index) => index + 7));
  });

  it('uses legible fixed fallback metrics below the fit threshold', () => {
    expect(getWeekLayoutMetrics(420)).toMatchObject({ scrollEnabled: true, itemHeight: 48 });
    expect(getMonthLayoutMetrics(420)).toMatchObject({ scrollEnabled: true, itemHeight: 80 });
  });

  it('reduces visible month events as cells become shorter', () => {
    expect(getMonthVisibleEventLimit(116, false)).toBe(3);
    expect(getMonthVisibleEventLimit(96, false)).toBe(2);
    expect(getMonthVisibleEventLimit(76, false)).toBe(1);
    expect(getMonthVisibleEventLimit(116, true)).toBe(2);
  });

  it('derives live display status without mutating the stored session status', () => {
    expect(getSessionDisplayStatus(session(), new Date(2026, 7, 6, 9, 0))).toBe('confirmed');
    expect(getSessionDisplayStatus(session(), new Date(2026, 7, 6, 10, 30))).toBe('in_progress');
    expect(getSessionDisplayStatus(session(), new Date(2026, 7, 6, 11, 30))).toBe('completed');
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
      expect(new Set(serializedPalettes).size).toBe(5);
    }
  });

  it('keeps late sessions inside the weekly grid and caps them at midnight', () => {
    const itemHeight = 48;
    const bodyHeight = itemHeight * TIME_SLOTS.length;
    const lateBlock = getWeekSessionBlockMetrics(
      new Date(2026, 7, 6, 23, 30),
      90,
      itemHeight,
      bodyHeight,
    );

    expect(lateBlock).not.toBeNull();
    expect((lateBlock?.top ?? 0) + (lateBlock?.height ?? 0)).toBeLessThanOrEqual(bodyHeight);
    expect(getWeekSessionBlockMetrics(
      new Date(2026, 7, 7, 0, 0),
      60,
      itemHeight,
      bodyHeight,
    )).toBeNull();
  });

  it('scrolls the day view through 23:00 and clamps later minutes to the final slot', () => {
    const atTwentyTwo = getAgendaDayScrollOffset(new Date(2026, 7, 6, 22, 0));
    const atTwentyThree = getAgendaDayScrollOffset(new Date(2026, 7, 6, 23, 0));
    const afterTwentyThree = getAgendaDayScrollOffset(new Date(2026, 7, 6, 23, 45));

    expect(atTwentyThree - atTwentyTwo).toBe(72);
    expect(afterTwentyThree).toBe(atTwentyThree);
  });
});
