import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { ClinicalGeneralWorkspace } from '../ClinicalGeneralWorkspace';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../onboarding/TourTarget', () => ({
  TourTarget: ({
    children,
    id,
  }: {
    children: React.ReactElement;
    id: string;
  }) => {
    const React = require('react');
    const { View } = require('react-native');

    return (
      <View testID={`tour-target-${id}`}>
        {children}
      </View>
    );
  },
}));

const mockedUseTheme = jest.mocked(useTheme);

const client = {
  id: 'client-1',
  source: 'REGISTERED',
  user: {
    id: 'user-1',
    name: 'Paciente Test',
    email: 'paciente@example.com',
  },
};

const managedClient = {
  ...client,
  source: 'MANAGED',
  user: null,
};

const record = {
  notes: [
    {
      id: 'note-1',
      content: 'Hola desde una nota clínica',
      updatedAt: '2026-04-20T16:11:00.000Z',
    },
  ],
  documents: [],
  client: {
    completedQuestionnaire: false,
    questionnaireAvailability: 'NOT_STARTED',
    questionnaireSummary: null,
    questionnaireAnswers: null,
  },
  consentStatus: 'GRANTED',
  consentMethod: 'DIGITAL_SIGNATURE',
  consentGivenAt: '2026-04-19T10:00:00.000Z',
  retentionUntil: null,
  closedAt: null,
  activeConsentRequest: null,
  eligibleForManualReview: false,
  consentEvents: [
    {
      id: 'consent-1',
      status: 'GRANTED',
      method: 'DIGITAL_SIGNATURE',
      createdAt: '2026-04-19T10:00:00.000Z',
    },
  ],
  pagination: {
    notes: { hasMore: false },
    documents: { hasMore: false },
    consentEvents: { hasMore: false },
  },
};

describe('ClinicalGeneralWorkspace', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('anchors clinical tour targets to compact section headers', () => {
    render(
      <ClinicalGeneralWorkspace
        client={client as never}
        record={record as never}
        isTablet
        noteSaving={false}
        documentUploading={false}
        consentSubmitting={false}
        closingProcess={false}
        openingDocumentId={null}
        loadingMoreNotes={false}
        loadingMoreDocuments={false}
        loadingMoreConsentEvents={false}
        onSaveNote={jest.fn()}
        onOpenDocument={jest.fn()}
        onUploadDocument={jest.fn()}
        onRequestDigitalConsent={jest.fn()}
        onAttestClinicalConsent={jest.fn()}
        onCloseClinicalProcess={jest.fn()}
        onLoadMoreNotes={jest.fn()}
        onLoadMoreDocuments={jest.fn()}
        onLoadMoreConsentEvents={jest.fn()}
      />,
    );

    const timelineTarget = screen.getByTestId('tour-target-professional.clinical.timeline');
    expect(within(timelineTarget).getByText('Timeline general')).toBeTruthy();
    expect(within(timelineTarget).queryByText('Hola desde una nota clínica')).toBeNull();

    expect(screen.getByTestId('tour-target-professional.clinical.notes')).toBeTruthy();
    expect(screen.getByTestId('tour-target-professional.clinical.questionnaire')).toBeTruthy();
    expect(screen.getByTestId('tour-target-professional.clinical.consent')).toBeTruthy();
    expect(screen.getByTestId('tour-target-professional.clinical.consent-documents')).toBeTruthy();
    expect(screen.getByTestId('tour-target-professional.clinical.reports')).toBeTruthy();
    expect(screen.getByTestId('tour-target-professional.clinical.documents')).toBeTruthy();
  });

  it('clarifies consent evidence copy for registered and managed patients', () => {
    const { rerender } = render(
      <ClinicalGeneralWorkspace
        client={client as never}
        record={record as never}
        isTablet
        noteSaving={false}
        documentUploading={false}
        consentSubmitting={false}
        closingProcess={false}
        openingDocumentId={null}
        loadingMoreNotes={false}
        loadingMoreDocuments={false}
        loadingMoreConsentEvents={false}
        onSaveNote={jest.fn()}
        onOpenDocument={jest.fn()}
        onUploadDocument={jest.fn()}
        onRequestDigitalConsent={jest.fn()}
        onAttestClinicalConsent={jest.fn()}
        onCloseClinicalProcess={jest.fn()}
        onLoadMoreNotes={jest.fn()}
        onLoadMoreDocuments={jest.fn()}
        onLoadMoreConsentEvents={jest.fn()}
      />,
    );

    expect(screen.getByText('Consentimiento clínico')).toBeTruthy();
    expect(screen.getByText('Firma digital de consentimiento clínico')).toBeTruthy();
    expect(screen.getByText('Documento de consentimiento clínico')).toBeTruthy();
    expect(
      screen.getByText(
        'Si el paciente te entrega un consentimiento clínico firmado fuera de HERA, adjúntalo aquí para conservarlo en su expediente.',
      ),
    ).toBeTruthy();

    rerender(
      <ClinicalGeneralWorkspace
        client={managedClient as never}
        record={record as never}
        isTablet
        noteSaving={false}
        documentUploading={false}
        consentSubmitting={false}
        closingProcess={false}
        openingDocumentId={null}
        loadingMoreNotes={false}
        loadingMoreDocuments={false}
        loadingMoreConsentEvents={false}
        onSaveNote={jest.fn()}
        onOpenDocument={jest.fn()}
        onUploadDocument={jest.fn()}
        onRequestDigitalConsent={jest.fn()}
        onAttestClinicalConsent={jest.fn()}
        onCloseClinicalProcess={jest.fn()}
        onLoadMoreNotes={jest.fn()}
        onLoadMoreDocuments={jest.fn()}
        onLoadMoreConsentEvents={jest.fn()}
      />,
    );

    expect(screen.getByText('Documento de consentimiento clínico')).toBeTruthy();
    expect(
      screen.getByText(
        'Sube aquí el PDF o imagen del consentimiento clínico firmado. Después pulsa "Registrar consentimiento firmado" para dejarlo vigente y habilitar el tratamiento de sus datos clínicos.',
      ),
    ).toBeTruthy();
  });
});
