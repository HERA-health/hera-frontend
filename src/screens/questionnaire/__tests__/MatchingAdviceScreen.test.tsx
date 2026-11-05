import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { MatchingAdviceScreen } from '../MatchingAdviceScreen';
import {
  deleteAdviceDraft,
  getQuestionnaireDefinition,
  listAdvice,
  readAdvice,
  sendAdvice,
  type AdviceRequest,
} from '../../../services/questionnaireService';

const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
let mockRoute: {
  name: string;
  params?: { id?: string; specialistId?: string };
};
let mockAdmin = false;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, setParams: mockSetParams }),
  useRoute: () => mockRoute,
}));
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }),
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { isAdmin: mockAdmin } }),
}));
jest.mock('../../../services/questionnaireService', () => ({
  listAdvice: jest.fn(),
  readAdvice: jest.fn(),
  sendAdvice: jest.fn(),
  respondAdvice: jest.fn(),
  deleteAdviceDraft: jest.fn(),
  getQuestionnaireDefinition: jest.fn(),
}));
jest.mock('../../../utils/secureRandom', () => ({
  createSecureRandomUuid: () => 'c125a2d7-6087-4aa1-8c35-8e5068e1407b',
}));

const draft: AdviceRequest = {
  id: 'draft-1',
  status: 'DRAFT',
  specialistId: 'professional-1',
  createdAt: '2026-11-05T10:00:00Z',
  expiresAt: '2026-11-12T10:00:00Z',
  submittedAt: null,
  respondedAt: null,
  teamNotifiedAt: null,
  patientNotifiedAt: null,
  notificationPending: false,
  questionnaire: null,
  request: null,
  response: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRoute = { name: 'MatchingAdvice', params: {} };
  mockAdmin = false;
  jest.mocked(listAdvice).mockResolvedValue([]);
  jest
    .mocked(getQuestionnaireDefinition)
    .mockResolvedValue({
      version: '2',
      notice: '',
      noticeVersion: 'v1',
      choices: {},
      groups: [],
      labels: {},
      steps: [],
    });
});

test('a direct link can recover a request outside the first page', async () => {
  mockRoute.params = { id: draft.id };
  jest.mocked(readAdvice).mockResolvedValue(draft);
  render(<MatchingAdviceScreen />);
  await waitFor(() =>
    expect(screen.getByText('Ver profesionales compatibles')).toBeTruthy(),
  );
  expect(readAdvice).toHaveBeenCalledWith(draft.id, false);
});

test('deleting a linked draft removes its route and does not reload the deleted record', async () => {
  mockRoute.params = { id: draft.id };
  jest.mocked(listAdvice).mockResolvedValueOnce([draft]).mockResolvedValue([]);
  jest.mocked(deleteAdviceDraft).mockResolvedValue();
  render(<MatchingAdviceScreen />);
  await waitFor(() =>
    expect(screen.getByRole('button', {name: 'Eliminar borrador'})).toBeEnabled(),
  );
  fireEvent.press(screen.getByText('Eliminar borrador'));
  await waitFor(() => expect(deleteAdviceDraft).toHaveBeenCalledWith(draft.id));
  await waitFor(() =>
    expect(screen.queryByText('Eliminar borrador')).toBeNull(),
  );
  expect(deleteAdviceDraft).toHaveBeenCalledWith(draft.id);
  expect(mockSetParams).toHaveBeenCalledWith({ id: undefined });
  expect(readAdvice).not.toHaveBeenCalled();
  expect(screen.getByText('Enviar solicitud al equipo')).toBeTruthy();
});

test('a failed send keeps the message and retry key; sharing is opt-in and a pending email is visible', async () => {
  const sent: AdviceRequest = {
    ...draft,
    status: 'SUBMITTED',
    expiresAt: null,
    notificationPending: true,
    request: { message: 'Necesito orientación', sharedQuestionnaire: 'false' },
  };
  jest
    .mocked(sendAdvice)
    .mockRejectedValueOnce(new Error('Sin conexión'))
    .mockResolvedValue(sent);
  render(<MatchingAdviceScreen />);
  await waitFor(() => expect(listAdvice).toHaveBeenCalledTimes(1));
  fireEvent.changeText(
    screen.getByLabelText('Cuéntanos qué necesitas'),
    'Necesito orientación',
  );
  fireEvent.press(screen.getByText('Enviar solicitud al equipo'));
  await waitFor(() => expect(screen.getByText('Sin conexión')).toBeTruthy());
  expect(screen.getByLabelText('Cuéntanos qué necesitas').props.value).toBe(
    'Necesito orientación',
  );
  jest.mocked(listAdvice).mockResolvedValue([sent]);
  fireEvent.press(screen.getByText('Enviar solicitud al equipo'));
  await waitFor(() =>
    expect(screen.getByText(/El aviso por correo está pendiente/)).toBeTruthy(),
  );
  const calls = jest.mocked(sendAdvice).mock.calls;
  expect(calls).toHaveLength(2);
  expect(calls[0][0]).toEqual(calls[1][0]);
  expect(calls[0][0].shareQuestionnaire).toBe(false);
});

test('the team can open the declared professional from the request', async () => {
  mockAdmin = true;
  mockRoute = { name: 'AdminMatchingAdvice', params: { id: draft.id } };
  jest
    .mocked(listAdvice)
    .mockResolvedValue([{ ...draft, status: 'SUBMITTED' }]);
  render(<MatchingAdviceScreen />);
  await waitFor(() =>
    expect(screen.getByText('Ver profesional de interés')).toBeTruthy(),
  );
  fireEvent.press(screen.getByText('Ver profesional de interés'));
  expect(mockNavigate).toHaveBeenCalledWith('SpecialistDetailAdmin', {
    specialistId: draft.specialistId,
  });
});
