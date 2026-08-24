const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;
const TOKEN = /^[a-f0-9]{64}$/;

export const getClinicalGuestConsentRequestId = (pathname: string): string | null => {
  const requestId = pathname.match(/^\/clinical-consent\/guest\/([^/]+)\/?$/)?.[1];
  return requestId && REQUEST_ID.test(requestId) ? requestId : null;
};
export const parseClinicalGuestConsentFragment = (fragment: string): string | null => {
  const token = new URLSearchParams(fragment.replace(/^#/, '')).get('token');
  return token && TOKEN.test(token) ? token : null;
};
