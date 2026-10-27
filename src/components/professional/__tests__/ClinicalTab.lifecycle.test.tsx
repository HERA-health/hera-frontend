import React, { useCallback, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ClinicalTab } from '../ClinicalTab';
import type { ClinicalPatientAction } from '../clinicalPatientTypes';
import { useClinicalAccessController } from '../../../hooks/useClinicalAccessController';
import * as clinical from '../../../services/clinicalService';
import type { Client } from '../../../services/professionalService';
import { lightTheme as mockTheme } from '../../../constants/theme';
import { LEGAL_DOCUMENT_VERSION as mockLegalVersion } from '../../../constants/legal';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: mockTheme }) }));
jest.mock('../../../hooks/useClinicalAccessController', () => ({ useClinicalAccessController: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('../../../services/legalService', () => ({
  getLegalStatus: jest.fn(async () => ({ acceptedDocuments: [{ documentKey: 'CLINICAL_MODULE_TERMS', version: mockLegalVersion }] })),
}));
jest.mock('../../../services/clinicalService', () => ({
  getClinicalRecord: jest.fn(), getClinicalTimeline: jest.fn(),
  hasAcceptedCurrentDataProcessingAgreement: (status: clinical.ClinicalAccessStatus) => Boolean(status.acceptedDataProcessingAgreementAt && !status.requiresDataProcessingAgreementAcceptance),
}));
jest.mock('../../../services/clinicalEntriesService',()=>({searchNotes:jest.fn(async()=>({items:[],pageInfo:{limit:10,total:0,hasMore:false,nextCursor:null},filters:{authors:[],tags:[]}})),searchHistory:jest.fn()}));
jest.mock('../../../services/api',()=>({api:{}}));
jest.mock('../../../services/clinicalFileCache', () => ({ releaseClinicalAssets: jest.fn() }));
jest.mock('../../common/alert', () => ({ useAppAlertState: () => ({ isVisible: false }) }));
jest.mock('../../onboarding/TourTarget', () => ({ TourTarget: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../../onboarding/professionalTourContext', () => ({
  useProfessionalTourAutoStart: jest.fn(), useProfessionalTourRoutePreference: jest.fn(), useProfessionalTourStepPreparation: jest.fn(),
}));
jest.mock('../TreatmentConsentPanel', () => ({ TreatmentConsentPanel: () => null }));
jest.mock('../ClinicalQuestionnairePanel', () => ({ ClinicalQuestionnairePanel: () => null }));
jest.mock('../ClinicalPinManager', () => ({ ClinicalPinManager: () => null }));

const client: Client = { id: 'patient', source: 'MANAGED', userId: null, user: { id: null, name: 'Paciente', userType: 'CLIENT', email: 'patient@example.test' } };
const page = { limit: 6, total: 0, hasMore: false, nextCursor: null };
const record: clinical.ClinicalRecord = {
  access: { canReadClinicalContent: true, canWriteClinicalContent: true },
  id: 'record', consentStatus: 'GRANTED', consentGivenAt: null, consentRequestedAt: null, consentVersion: null, consentMethod: null,
  closedAt: null, retentionUntil: null, eligibleForManualReview: false, activeConsentRequest: null, guestConsentActionsEnabled: false,
  client: { ...client, questionnaireAnswers: null }, notes: [], documents: [], consentEvents: [], sessionFolders: [],
  pagination: { notes: page, documents: page, consentEvents: page, sessionFolders: page },
};
let access: ReturnType<typeof useClinicalAccessController>;
let nextActionId = 0;

function PatientView({ workspaceKey = 'original' }: { workspaceKey?: string }) {
  const [action, setAction] = useState<ClinicalPatientAction>();
  const consume = useCallback((id: number) => {
    setAction(current => current && current.id <= id ? undefined : current);
  }, []);
  return <>
    <Pressable onPress={() => setAction({ id: ++nextActionId, kind: 'NOTE' })}><Text>Nueva nota desde cabecera</Text></Pressable>
    <ClinicalTab key={workspaceKey} clientId={client.id} client={client} section="notes" action={action} onActionConsumed={consume} />
  </>;
}

beforeEach(() => {
  jest.clearAllMocks();
  const status: clinical.ClinicalAccessStatus = {
    hasPin: true, pinLockedUntil: null, pinUpdatedAt: null, acceptedDataProcessingAgreementAt: '2026-10-19T12:00:00Z', dataProcessingAgreementVersion: 'v1',
    session: { active: true, sessionId: 'session', createdAt: '2026-10-19T12:00:00Z', absoluteExpiresAt: '2026-10-19T14:00:00Z', idleExpiresAt: '2026-10-19T13:00:00Z' },
  };
  access = {
    accessStatus: status, token: 'active', statusLoading: false, accessSubmitting: false,
    loadStatus: jest.fn(async () => status), refreshStatus: jest.fn(async () => status),
    acceptDataProcessingAgreement: jest.fn(async () => undefined), setupClinicalPin: jest.fn(async () => undefined),
    rotateClinicalPin: jest.fn(async () => undefined), lockClinicalArea: jest.fn(async () => undefined), clearAccessState: jest.fn(async () => undefined),
    unlockClinicalArea: jest.fn(async () => ({ token: 'active', sessionId: 'session', absoluteExpiresAt: '2026-10-19T14:00:00Z', idleExpiresAt: '2026-10-19T13:00:00Z' })),
  };
  jest.mocked(useClinicalAccessController).mockImplementation(() => access);
  jest.mocked(clinical.getClinicalRecord).mockResolvedValue(record);
  jest.mocked(clinical.getClinicalTimeline).mockResolvedValue({ items: [], pageInfo: page, nextSession: null, counters: { completed: 0, withoutNotes: 0, activeFiles: 0, withNotes: 0, withFiles: 0, generalNotes: 0 } });
});

test('a closed header action is consumed and never reopens after access checks or a remount', async () => {
  const view = render(<PatientView />);
  await screen.findAllByText('Notas clínicas');
  fireEvent.press(screen.getByText('Nueva nota desde cabecera'));
  expect(screen.getByLabelText('Contenido de la nota')).toBeTruthy();
  fireEvent.press(screen.getAllByRole('button', { name: 'Cerrar' })[0]);
  expect(screen.queryByLabelText('Contenido de la nota')).toBeNull();

  access = { ...access, statusLoading: true };
  view.rerender(<PatientView />);
  expect(screen.queryByLabelText('Contenido de la nota')).toBeNull();
  access = { ...access, statusLoading: false };
  view.rerender(<PatientView workspaceKey="remounted" />);
  await screen.findAllByText('Notas clínicas');
  expect(screen.queryByLabelText('Contenido de la nota')).toBeNull();

  fireEvent.press(screen.getByText('Nueva nota desde cabecera'));
  expect(screen.getByLabelText('Contenido de la nota')).toBeTruthy();
});

test('rechecking a valid session preserves an open note and its unsaved draft', async () => {
  const view = render(<PatientView />);
  await screen.findAllByText('Notas clínicas');
  fireEvent.press(screen.getByText('Nueva nota desde cabecera'));
  fireEvent.changeText(screen.getByLabelText('Contenido de la nota'), 'Borrador sin guardar');
  access = { ...access, statusLoading: true };
  view.rerender(<PatientView />);
  expect(screen.getByDisplayValue('Borrador sin guardar')).toBeTruthy();
  expect(screen.queryByText('Preparando el acceso clínico...')).toBeNull();
  access = { ...access, statusLoading: false };
  view.rerender(<PatientView />);
  expect(screen.getByDisplayValue('Borrador sin guardar')).toBeTruthy();
});

test('consent entry explains the PIN and keeps protected content inaccessible until unlock', async () => {
  access = { ...access, token: null };
  render(<ClinicalTab clientId={client.id} client={client} action={{ id: 1, kind: 'CONSENT' }} />);
  await screen.findByText('Accede al consentimiento informado');
  expect(screen.getByText('El consentimiento forma parte del expediente protegido. Introduce tu PIN para abrir su gestión.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Continuar al consentimiento' })).toBeTruthy();
  expect(clinical.getClinicalRecord).not.toHaveBeenCalled();
});

test('losing access while rechecking removes the draft immediately and never restores it on unlock', async () => {
  const view = render(<PatientView />);
  await screen.findAllByText('Notas clínicas');
  fireEvent.press(screen.getByText('Nueva nota desde cabecera'));
  fireEvent.changeText(screen.getByLabelText('Contenido de la nota'), 'Contenido privado');
  access = { ...access, statusLoading: true };
  view.rerender(<PatientView />);
  const unlocked = access;
  access = { ...access, token: null };
  view.rerender(<PatientView />);
  expect(screen.queryByDisplayValue('Contenido privado')).toBeNull();
  expect(screen.queryByLabelText('Contenido de la nota')).toBeNull();
  access = { ...unlocked, statusLoading: false };
  view.rerender(<PatientView />);
  await screen.findAllByText('Notas clínicas');
  expect(screen.queryByLabelText('Contenido de la nota')).toBeNull();
});

test('administrative tabs render no clinical workspace even while the access session remains valid',async()=>{
  const view=render(<ClinicalTab clientId={client.id} client={client} section="notes" visible={false}/>);
  expect(screen.queryAllByText('Notas clínicas')).toHaveLength(0);
  expect(screen.queryByLabelText('Contenido de la nota')).toBeNull();
  view.rerender(<ClinicalTab clientId={client.id} client={client} section="notes" visible/>);
  await screen.findAllByText('Notas clínicas');
  view.rerender(<ClinicalTab clientId={client.id} client={client} section="notes" visible={false}/>);
  expect(screen.queryAllByText('Notas clínicas')).toHaveLength(0);
  expect(screen.queryByLabelText('Contenido de la nota')).toBeNull();
});
