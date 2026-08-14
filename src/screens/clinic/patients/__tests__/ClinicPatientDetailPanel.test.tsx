import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import type {
  ClinicPatientConsentDetail,
  ClinicPatientDetail,
  ClinicPatientSummary,
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
  status: 'PENDING',
  method: null,
  requestedAt: null,
  grantedAt: null,
  version: null,
  documents: [],
  events: [],
  activeRequest: null,
};

interface HarnessProps {
  initialTab?: ClinicPatientDetailTab;
  currentPatient?: ClinicPatientDetail | ClinicPatientSummary;
  editSection?: 'summary' | 'billing' | null;
  detailError?: string;
  consent?: ClinicPatientConsentDetail | null;
  consentError?: string;
  onOpenSessionDetail?: (sessionId: string) => void;
  onRetryDetail?: () => void;
  onRetryConsent?: () => void;
}

function DetailHarness({
  initialTab = 'summary',
  currentPatient = patient,
  editSection = null,
  detailError = '',
  consent = pendingConsent,
  consentError = '',
  onOpenSessionDetail = jest.fn(),
  onRetryDetail = jest.fn(),
  onRetryConsent = jest.fn(),
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
      patientSessions={[]}
      patientSessionsPageInfo={{ page: 1, limit: 20, hasMore: false, nextPage: null }}
      patientSessionsLoading={false}
      patientSessionsLoadingMore={false}
      patientSessionsError=""
      activeTab={activeTab}
      editSection={editSection}
      form={form}
      errors={{}}
      sameBillingData={false}
      canManage
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
      onRequestConsent={jest.fn()}
      onUploadConsentEvidence={jest.fn()}
      onOpenConsentDocument={jest.fn()}
      onRetryConsent={onRetryConsent}
      onLoadMoreAssignmentHistory={jest.fn()}
      onRetryAssignmentHistory={jest.fn()}
      onOpenSessionDetail={onOpenSessionDetail}
      onLoadMorePatientSessions={jest.fn()}
      onRetryPatientSessions={jest.fn()}
      onSelectTab={setActiveTab}
      onEdit={jest.fn()}
      onRetryDetail={onRetryDetail}
      onChange={jest.fn()}
      onToggleSameBillingData={jest.fn()}
      onSubmitEdit={jest.fn()}
      onCancelEdit={jest.fn()}
      onStatusChange={jest.fn()}
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
    fireEvent.press(screen.getByRole('button', { name: 'Abrir próxima cita' }));
    expect(onOpenSessionDetail).toHaveBeenCalledWith('session-1');
    expect(screen.getByText(patient.displayName)).toBeTruthy();
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
});
