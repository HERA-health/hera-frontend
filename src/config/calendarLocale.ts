import { LocaleConfig } from 'react-native-calendars';

export const CALENDAR_LOCALE = 'es';

export const SPANISH_CALENDAR_LOCALE = {
  monthNames: [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy',
};

export const configureCalendarLocale = (): void => {
  LocaleConfig.locales[CALENDAR_LOCALE] = SPANISH_CALENDAR_LOCALE;
  LocaleConfig.defaultLocale = CALENDAR_LOCALE;
};

configureCalendarLocale();
