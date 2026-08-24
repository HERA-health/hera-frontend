const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export const getClinicGuestConsentRequestId = (pathname: string): string | null => {
  const match = pathname.match(/^\/clinic-consent\/([^/]+)\/?$/);
  const requestId = match?.[1];
  return requestId && REQUEST_ID_PATTERN.test(requestId) ? requestId : null;
};

export const parseClinicGuestConsentFragment = (fragment: string): string | null => {
  const token = new URLSearchParams(fragment.replace(/^#/, '')).get('token');
  return token && TOKEN_PATTERN.test(token) ? token : null;
};
