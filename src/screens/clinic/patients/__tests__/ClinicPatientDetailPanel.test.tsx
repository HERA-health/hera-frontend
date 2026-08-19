import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import type {
  ClinicPatientConsentDetail,
  ClinicPatientDetail,
  ClinicPatientSummary,
  ClinicSessionSummary,
} from '../../../../services/clinicService';
import { ClinicPatientDetailPanel } from '../ClinicPatientDetailPanel';
import type { ClinicPatientDetailTab, ClinicPatientForm } from '../clinicPatientDomain';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

const patient: ClinicPatientDetail = {
  id: 'patient-1',
  status: 'ACTIVE',
  displayName: 'Lucía Martín García con un nombre administrativo largo',
  firstName: 'Lucía',
  lastName: 'Martín García',
  email: 'lucia@example.com',
  phone: '+34 600 000 000',
  billingDataComplete: false,
  billingFullName: 'Lucía Martín García',
  billingTaxId: null,
  billingAddress: null,
  billingPostalCode: null,
  billingCity: null,
  billingCountry: 'España',
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-13T08:00:00.000Z',
  archivedAt: null,
  activeAssignment: null,
  nextSession: {
    id: 'session-1',
    date: '2099-08-20T10:00:00.000Z',
    duration: 50,
    type: 'VIDEO_CALL',
    status: 'CONFIRMED',
    clinicSpecialist: {
      id: 'specialist-1',
      displayName: 'Dra. Ana Ruiz',
      professionalTitle: 'Psicóloga sanitaria',
    },
  },
};

const form: ClinicPatientForm = {
  firstName: 'Lucía',
  lastName: 'Martín García',
  email: 'lucia@example.com',
  phone: '+34 600 000 000',
  billingFullName: 'Lucía Martín García',
  billingTaxId: '',
  billingAddress: '',
  billingPostalCode: '',
  billingCity: '',
  billingCountry: 'España',
};

const pendingConsent: ClinicPatientConsentDetail = {
  clinicPatientId: patient.id,
  patientDisplayName: patient.displayName,
  patientEmail: patient.email,
  patientStatus: patient.status,
  hasLinkedHeraAccount: true,
  digitalConsentChannel: 'HERA_ACCOUNT_EMAIL',
  status: 'PENDING',
  method: null,
  requestedAt: null,
  grantedAt: null,
  version: null,
  documents: [],
  events: [],
  activeRequest: null,
};

const createSession = (
  id: string,
  date: string,
  status: ClinicSessionSummary['status'],
): ClinicSessionSummary => ({
  id,
  date,
  duration: 50,
  type: 'VIDEO_CALL',
  status,
  bookedPrice: null,
  bookedCurrency: null,
  cancelledAt: status === 'CANCELLED' ? date : null,
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
  patient: {
    id: patient.id,
    displayName: patient.displayName,
    email: patient.email,
    phone: patient.phone,
    status: patient.status,
  },
  specialist: {
    id: 'specialist-1',
    displayName: 'Dra. Ana Ruiz',
    professionalTitle: 'Psicóloga sanitaria',
    status: 'ACTIVE',
    linkedProfessionalName: 'Ana Ruiz',
  },
});

interface HarnessProps {
  initialTab?: ClinicPatientDetailTab;
  currentPatient?: ClinicPatientDetail | ClinicPatientSummary;
  editSection?: 'summary' | 'billing' | null;
  detailError?: string;
  consent?: ClinicPatientConsentDetail | null;
  consentError?: string;
  patientSessions?: ClinicSessionSummary[];
  patientSessionsError?: string;
  patientSessionsHasMore?: boolean;
  onOpenSessionDetail?: (sessionId: string) => void;
  onLoadMorePatientSessions?: () => void;
  onRetryPatientSessions?: () => void;
  onRetryDetail?: () => void;
  onRetryConsent?: () => void;
  onRequestConsent?: () => void;
  onCreateSession?: () => void;
  canManage?: boolean;
}

function DetailHarness({
  initialTab = 'summary',
  currentPatient = patient,
  editSection = null,
  detailError = '',
  consent = pendingConsent,
  consentError = '',
  patientSessions = [],
  patientSessionsError = '',
  patientSessionsHasMore = false,
  onOpenSessionDetail = jest.fn(),
  onLoadMorePatientSessions = jest.fn(),
  onRetryPatientSessions = jest.fn(),
  onRetryDetail = jest.fn(),
  onRetryConsent = jest.fn(),
  onRequestConsent = jest.fn(),
  onCreateSession = jest.fn(),
  canManage = true,
}: HarnessProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<ClinicPatientDetailTab>(initialTab);

  return (
    <ClinicPatientDetailPanel
      patient={currentPatient}
      detailLoading={false}
      detailError={detailError}
      saving={false}
      feedback={null}
      consent={consent}
      consentLoading={false}
      consentError={consentError}
      consentSaving={false}
      openingConsentDocumentId={null}
      assignmentHistory={[]}
      assignmentHistoryPageInfo={{ page: 1, limit: 20, hasMore: false, nextPage: null }}
      assignmentHistoryLoading={false}
      assignmentHistoryLoadingMore={false}
      assignmentHistoryError=""
      patientSessions={patientSessions}
      patientSessionsPageInfo={{
        page: 1,
        limit: 5,
        hasMore: patientSessionsHasMore,
        nextPage: patientSessionsHasMore ? 2 : null,
      }}
      patientSessionsLoading={false}
      patientSessionsLoadingMore={false}
      patientSessionsError={patientSessionsError}
      activeTab={activeTab}
      editSection={editSection}
      form={form}
      errors={{}}
      sameBillingData={false}
      canManage={canManage}
      assignmentMode={null}
      assignmentForm={{ clinicSpecialistId: '', reason: '' }}
      specialistOptions={[]}
      specialistsLoading={false}
      specialistsError=""
      onStartAssignment={jest.fn()}
      onCancelAssignment={jest.fn()}
      onChangeAssignmentSpecialist={jest.fn()}
      onChangeAssignmentReason={jest.fn()}
      onSubmitAssignment={jest.fn()}
      onCloseAssignment={jest.fn()}
      onRequestConsent={onRequestConsent}
      onUploadConsentEvidence={jest.fn()}
      onOpenConsentDocument={jest.fn()}
      onRetryConsent={onRetryConsent}
      onLoadMoreAssignmentHistory={jest.fn()}
      onRetryAssignmentHistory={jest.fn()}
      onOpenSessionDetail={onOpenSessionDetail}
      onLoadMorePatientSessions={onLoadMorePatientSessions}
      onRetryPatientSessions={onRetryPatientSessions}
      onSelectTab={setActiveTab}
      onEdit={jest.fn()}
      onRetryDetail={onRetryDetail}
      onChange={jest.fn()}
      onToggleSameBillingData={jest.fn()}
      onSubmitEdit={jest.fn()}
      onCancelEdit={jest.fn()}
      onStatusChange={jest.fn()}
      onCreateSession={onCreateSession}
    />
  );
}

describe('ClinicPatientDetailPanel', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('offers Nueva cita only when the patient has an active responsible specialist', () => {
    const onCreateSession = jest.fn();
    const assignedPatient: ClinicPatientDetail = {
      ...patient,
      activeAssignment: {
        id: 'assignment-1',
        clinicSpecialistId: 'specialist-1',
        clinicSpecialistDisplayName: 'Dra. Ana Ruiz',
        clinicSpecialistProfessionalTitle: 'Psicóloga sanitaria',
        clinicSpecialistStatus: 'ACTIVE',
        startedAt: '2026-08-01T08:00:00.000Z',
        reason: null,
      },
    };

    render(<DetailHarness currentPatient={assignedPatient} onCreateSession={onCreateSession} />);

    fireEvent.press(screen.getByRole('button', {
      name: `Nueva cita para ${assignedPatient.displayName}`,
    }));
    expect(onCreateSession).toHaveBeenCalledTimes(1);
  });

  it('explains accessibly why Nueva cita is disabled for an archived patient', () => {
    render(<DetailHarness currentPatient={{
      ...patient,
      status: 'ARCHIVED',
      archivedAt: '2026-08-13T09:00:00.000Z',
      nextSession: null,
    }} />);

    const button = screen.getByRole('button', {
      name: 'Nueva cita no disponible: el paciente está archivado',
    });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('explains missing, inactive and unauthorized scheduling contexts', () => {
    const inactivePatient: ClinicPatientDetail = {
      ...patient,
      activeAssignment: {
        id: 'assignment-1',
        clinicSpecialistId: 'specialist-1',
        clinicSpecialistDisplayName: 'Dra. Ana Ruiz',
        clinicSpecialistProfessionalTitle: 'Psicóloga sanitaria',
        clinicSpecialistStatus: 'INACTIVE',
        startedAt: '2026-08-01T08:00:00.000Z',
        reason: null,
      },
    };
    const view = render(<DetailHarness />);

    expect(screen.getByRole('button', {
      name: 'Nueva cita no disponible: asigna primero un responsable',
    }).props.accessibilityState.disabled).toBe(true);

    view.rerender(<DetailHarness currentPatient={inactivePatient} />);
    expect(screen.getByRole('button', {
      name: 'Nueva cita no disponible: el responsable está inactivo',
    }).props.accessibilityState.disabled).toBe(true);

    view.rerender(<DetailHarness currentPatient={inactivePatient} canManage={false} />);
    expect(screen.getByRole('button', {
      name: 'Nueva cita no disponible: acción reservada a propietarios y administradores',
    }).props.accessibilityState.disabled).toBe(true);
  });

  it('keeps the five tabs ordered and announces the active tab', () => {
    render(<DetailHarness />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.props.accessibilityState.selected)).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(tabs.map((tab) => tab.props.accessibilityLabel))
      .toEqual(['Resumen', 'Citas', 'Consentimientos', 'Facturación', 'Actividad']);
  });

  it('scrolls a preserved active tab into view after its layout is measured', () => {
    const scrollSpy = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => undefined);
    render(<DetailHarness initialTab="activity" />);

    const activeTab = screen.getByRole('tab', { name: 'Actividad' });
    if (!activeTab.parent) {
      throw new Error('La pestaña activa debe conservar su contenedor de layout.');
    }
    fireEvent(activeTab.parent, 'layout', {
      nativeEvent: { layout: { x: 420, y: 0, width: 80, height: 38 } },
    });

    expect(scrollSpy).toHaveBeenCalledWith({ x: 404, animated: false });
    scrollSpy.mockRestore();
  });

  it('routes alerts to their section and opens the next appointment without losing the record', () => {
    const onOpenSessionDetail = jest.fn();
    render(<DetailHarness onOpenSessionDetail={onOpenSessionDetail} />);

    fireEvent.press(screen.getByRole('button', { name: 'Revisar datos fiscales incompletos' }));
    expect(screen.getByText('Datos de facturación')).toBeTruthy();

    fireEvent.press(screen.getByRole('tab', { name: 'Citas' }));
    fireEvent.press(screen.getByRole('button', { name: /Abrir próxima cita/ }));
    expect(onOpenSessionDetail).toHaveBeenCalledWith('session-1');
    expect(screen.getByText(patient.displayName)).toBeTruthy();
  });

  it('highlights the next appointment and separates other upcoming and recent sessions', () => {
    const onOpenSessionDetail = jest.fn();
    const nextSession = createSession('session-1', '2099-08-20T10:00:00.000Z', 'CONFIRMED');
    const upcomingPending = createSession('session-2', '2099-08-21T10:00:00.000Z', 'PENDING');
    const recentCompleted = createSession('session-3', '2025-08-12T10:00:00.000Z', 'COMPLETED');
    const recentCancelled = createSession('session-4', '2025-08-11T10:00:00.000Z', 'CANCELLED');

    render(
      <DetailHarness
        initialTab="sessions"
        patientSessions={[nextSession, upcomingPending, recentCancelled, recentCompleted]}
        onOpenSessionDetail={onOpenSessionDetail}
      />,
    );

    expect(screen.getByText('Próximas')).toBeTruthy();
    expect(screen.getByText('Recientes')).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();
    expect(screen.getByText('Completada')).toBeTruthy();
    expect(screen.getByText('Cancelada')).toBeTruthy();
    expect(screen.getAllByText('Confirmada')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Abrir cita del 20 ago/ })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: /Abrir cita del 21 ago/ }));
    expect(onOpenSessionDetail).toHaveBeenCalledWith('session-2');
  });

  it('shows honest empty and recoverable session states without a create appointment CTA', () => {
    const onRetryPatientSessions = jest.fn();
    const { rerender } = render(
      <DetailHarness
        initialTab="sessions"
        currentPatient={{ ...patient, nextSession: null }}
      />,
    );

    expect(screen.getAllByText('Sin cita programada')).toHaveLength(2);
    expect(screen.getByText('No hay citas registradas para este paciente en el periodo consultado.'))
      .toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Crear cita' })).toBeNull();

    rerender(
      <DetailHarness
        initialTab="sessions"
        currentPatient={{ ...patient, nextSession: null }}
        patientSessionsError="No se pudieron cargar las citas"
        onRetryPatientSessions={onRetryPatientSessions}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetryPatientSessions).toHaveBeenCalledTimes(1);
  });

  it('keeps paginated session history behind an explicit load more action', () => {
    const onLoadMorePatientSessions = jest.fn();
    render(
      <DetailHarness
        initialTab="sessions"
        patientSessions={[createSession('session-2', '2099-08-21T10:00:00.000Z', 'PENDING')]}
        patientSessionsHasMore
        onLoadMorePatientSessions={onLoadMorePatientSessions}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Cargar más' }));
    expect(onLoadMorePatientSessions).toHaveBeenCalledTimes(1);
  });

  it('shows only the reactivation warning for archived patients', () => {
    render(<DetailHarness currentPatient={{
      ...patient,
      status: 'ARCHIVED',
      archivedAt: '2026-08-13T09:00:00.000Z',
      nextSession: null,
    }} />);

    expect(screen.getByText('Paciente archivado')).toBeTruthy();
    expect(screen.queryByText('Responsable pendiente')).toBeNull();
    expect(screen.queryByText('Consentimiento pendiente')).toBeNull();
    expect(screen.queryByText('Datos fiscales incompletos')).toBeNull();
    expect(screen.queryByText('Sin próxima cita')).toBeNull();
  });

  it('reuses the billing field group and checkbox in contextual editing', () => {
    render(<DetailHarness initialTab="billing" editSection="billing" />);

    expect(screen.getByRole('checkbox', {
      name: 'Usar los mismos datos para facturación',
    })).toBeTruthy();
    expect(screen.getByPlaceholderText('00000000T')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Lucía')).toBeNull();
  });

  it('shows a recoverable error instead of an indefinite detail loading state', () => {
    const onRetryDetail = jest.fn();
    const summary: ClinicPatientSummary = {
      id: patient.id,
      status: patient.status,
      displayName: patient.displayName,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone,
      billingDataComplete: patient.billingDataComplete,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
      archivedAt: patient.archivedAt,
      activeAssignment: patient.activeAssignment,
    };

    render(
      <DetailHarness
        currentPatient={summary}
        detailError="No se pudo cargar la ficha del paciente"
        onRetryDetail={onRetryDetail}
      />,
    );

    expect(screen.UNSAFE_getByProps({ accessibilityRole: 'alert' })).toBeTruthy();
    expect(screen.getByText('No disponible')).toBeTruthy();
    expect(screen.queryByText('Cargando…')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetryDetail).toHaveBeenCalledTimes(1);
  });

  it('does not treat an unavailable consent as pending and offers a safe retry', () => {
    const onRetryConsent = jest.fn();

    render(
      <DetailHarness
        initialTab="consent"
        consent={null}
        consentError="No se pudo consultar el consentimiento"
        onRetryConsent={onRetryConsent}
      />,
    );

    expect(screen.getByText('No disponible')).toBeTruthy();
    expect(screen.getByText('No se pudo verificar el consentimiento')).toBeTruthy();
    expect(screen.queryByText('Consentimiento pendiente')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Solicitar digital' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Subir PDF' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetryConsent).toHaveBeenCalledTimes(1);
  });

  it('shows the registered-patient channel before enabling digital consent', () => {
    const onRequestConsent = jest.fn();

    render(
      <DetailHarness
        initialTab="consent"
        onRequestConsent={onRequestConsent}
      />,
    );

    expect(screen.getByText('Firma digital disponible')).toBeTruthy();
    expect(screen.getByText('Email administrativo')).toBeTruthy();
    expect(screen.getByText('lucia@example.com')).toBeTruthy();
    expect(screen.getByText('Cuenta HERA')).toBeTruthy();
    expect(screen.getByText('Vinculada')).toBeTruthy();
    expect(screen.getByText(
      'El envío utiliza el email asociado a la cuenta HERA vinculada, aunque pueda coincidir con el email administrativo de esta ficha.',
    )).toBeTruthy();

    const digitalButton = screen.getByRole('button', {
      name: 'Solicitar consentimiento digital por email a la cuenta HERA vinculada',
    });
    expect(digitalButton.props.accessibilityState).toEqual(expect.objectContaining({ disabled: false }));
    fireEvent.press(digitalButton);
    expect(onRequestConsent).toHaveBeenCalledTimes(1);
  });

  it('disables digital consent and guides an unlinked patient with administrative email to PDF', () => {
    const onRequestConsent = jest.fn();
    const unlinkedConsent: ClinicPatientConsentDetail = {
      ...pendingConsent,
      hasLinkedHeraAccount: false,
      digitalConsentChannel: null,
    };

    render(
      <DetailHarness
        initialTab="consent"
        consent={unlinkedConsent}
        onRequestConsent={onRequestConsent}
      />,
    );

    expect(screen.getByText('Firma digital no disponible')).toBeTruthy();
    expect(screen.getByText('No vinculada')).toBeTruthy();
    expect(screen.getByText(
      'La ficha tiene email administrativo, pero el flujo actual no permite enviar allí el consentimiento sin una cuenta HERA vinculada. Registra el consentimiento mediante un PDF firmado.',
    )).toBeTruthy();

    const digitalButton = screen.getByRole('button', {
      name: 'Solicitar consentimiento digital, no disponible: el paciente no tiene una cuenta HERA vinculada',
    });
    expect(digitalButton.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    fireEvent.press(digitalButton);
    expect(onRequestConsent).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Subir PDF' }).props.accessibilityState)
      .toEqual(expect.objectContaining({ disabled: false }));
  });

  it('explains when neither administrative email nor a linked account is available', () => {
    render(
      <DetailHarness
        initialTab="consent"
        consent={{
          ...pendingConsent,
          patientEmail: null,
          hasLinkedHeraAccount: false,
          digitalConsentChannel: null,
        }}
      />,
    );

    expect(screen.getByText('No informado')).toBeTruthy();
    expect(screen.getByText(
      'No hay email administrativo ni una cuenta HERA vinculada. Registra el consentimiento mediante un PDF firmado.',
    )).toBeTruthy();
  });

  it('keeps digital consent available through HERA when administrative email is absent', () => {
    render(
      <DetailHarness
        initialTab="consent"
        consent={{
          ...pendingConsent,
          patientEmail: null,
        }}
      />,
    );

    expect(screen.getByText('No informado')).toBeTruthy();
    expect(screen.getByText('Firma digital disponible')).toBeTruthy();
    expect(screen.getByRole('button', {
      name: 'Solicitar consentimiento digital por email a la cuenta HERA vinculada',
    }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: false }));
  });

  it('represents a linked HERA account without usable email as a degraded state', () => {
    render(
      <DetailHarness
        initialTab="consent"
        consent={{
          ...pendingConsent,
          digitalConsentChannel: null,
        }}
      />,
    );

    expect(screen.getByText('Vinculada')).toBeTruthy();
    expect(screen.getByText(
      'La cuenta HERA está vinculada, pero no dispone de un email utilizable para este envío. Registra el consentimiento mediante un PDF firmado.',
    )).toBeTruthy();
    expect(screen.getByRole('button', {
      name: 'Solicitar consentimiento digital, no disponible: la cuenta HERA vinculada no tiene un email utilizable',
    }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });
});
