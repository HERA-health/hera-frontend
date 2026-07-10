import fs from 'node:fs';
import path from 'node:path';
import { LocaleConfig } from 'react-native-calendars';

import {
  CALENDAR_LOCALE,
  configureCalendarLocale,
  SPANISH_CALENDAR_LOCALE,
} from '../calendarLocale';

describe('calendar locale configuration', () => {
  it('configures Spanish month and weekday names', () => {
    configureCalendarLocale();

    expect(LocaleConfig.defaultLocale).toBe(CALENDAR_LOCALE);
    expect(LocaleConfig.locales[CALENDAR_LOCALE]).toBe(SPANISH_CALENDAR_LOCALE);
    expect(SPANISH_CALENDAR_LOCALE.monthNames[6]).toBe('Julio');
    expect(SPANISH_CALENDAR_LOCALE.dayNamesShort).toEqual([
      'Dom',
      'Lun',
      'Mar',
      'Mié',
      'Jue',
      'Vie',
      'Sáb',
    ]);
  });

  it('loads the locale configuration from the app entry point', () => {
    const appSource = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'App.tsx'), 'utf8');

    expect(appSource).toContain("import './src/config/calendarLocale';");
  });
});
