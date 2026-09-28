jest.mock('../api', () => ({ __esModule: true, default: { get: jest.fn() } }));
import api from '../api';
import { getClinicMeetingLink } from '../clinic/professionalWorkspaceService';

const pending = { provider: 'GOOGLE_MEET', preparationStatus: 'PENDING', canJoin: false,
  meetingLink: null, reasonCode: 'PENDING', retryAfterSeconds: 30, availableUntil: '2026-09-27T20:00:00Z' };

test('strict clinical contract accepts pending/null access and the final canonical link', async () => {
  jest.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: pending } });
  expect(await getClinicMeetingLink('clinic', 'session')).toEqual(pending);
  const ready = { ...pending, preparationStatus: 'READY', canJoin: true, reasonCode: null, meetingLink: 'https://meet.google.com/abc-defg-hij' };
  jest.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: ready } });
  expect(await getClinicMeetingLink('clinic', 'session')).toEqual(ready);
  expect(api.get).toHaveBeenCalledWith('/clinics/clinic/specialist/sessions/session/meeting-link', { params: { meetingDetails: '1' } });
});

test('clinical responses with unexpected sensitive identity are rejected', async () => {
  jest.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: { ...pending, organizerEmail: 'private@example.invalid' } } });
  await expect(getClinicMeetingLink('clinic', 'session')).rejects.toThrow();
});
