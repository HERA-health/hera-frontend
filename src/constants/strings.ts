/**
 * App-wide string constants
 * Centralized location for app name, branding, and common text
 */

export const APP_NAME = 'HERA';
export const APP_TAGLINE = 'Health Era';
export const APP_DESCRIPTION = 'Tu nueva era de bienestar mental';
export const APP_FULL_NAME = `${APP_NAME} - ${APP_TAGLINE}`;

// Authentication screen strings
export const AUTH_STRINGS = {
  welcome: {
    title: APP_NAME,
    tagline: APP_TAGLINE,
    description: APP_DESCRIPTION,
  },
  login: {
    title: 'Iniciar Sesión',
    subtitle: 'Accede a tu cuenta',
  },
  register: {
    client: `Únete a ${APP_FULL_NAME}`,
    professional: 'Regístrate como profesional de la salud mental',
  },
};

// Common UI strings
export const COMMON_STRINGS = {
  loading: 'Cargando...',
  error: 'Error',
  success: 'Éxito',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
  save: 'Guardar',
  delete: 'Eliminar',
};
