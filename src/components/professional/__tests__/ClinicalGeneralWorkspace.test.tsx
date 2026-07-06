import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
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

const consentDocument = {
  id: 'consent-document-1',
  sessionId: null,
  category: 'CONSENT_EVIDENCE',
  fileName: 'consentimiento-firmado.pdf',
  mimeType: 'application/pdf',
  uploadedAt: '2026-04-19T10:00:00.000Z',
  sizeBytes: 218000,
};

const pendingManagedRecord = {
  ...record,
  documents: [consentDocument],
  consentStatus: 'PENDING',
  consentMethod: null,
  consentGivenAt: null,
  consentEvents: [],
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

  it('anchors clinical tour targets to the unified clinical bands', () => {
    const rendered = render(
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

    const consentTarget = screen.getByTestId('tour-target-professional.clinical.consent');
    const consentDocumentsTarget = screen.getByTestId('tour-target-professional.clinical.consent-documents');
    expect(within(consentTarget).getByText('Consentimiento clínico')).toBeTruthy();
    expect(within(consentTarget).queryByText('Firma digital de consentimiento clínico')).toBeNull();
    expect(within(consentDocumentsTarget).getByText('Documento de consentimiento clínico')).toBeTruthy();
    expect(screen.getByTestId('tour-target-professional.clinical.notes')).toBeTruthy();
    expect(screen.getByTestId('tour-target-professional.clinical.questionnaire')).toBeTruthy();
    expect(screen.getByTestId('tour-target-professional.clinical.reports')).toBeTruthy();
    expect(screen.getByTestId('tour-target-professional.clinical.documents')).toBeTruthy();

    const renderedTree = JSON.stringify(rendered.toJSON());
    const targetIndex = (targetId: string) =>
      renderedTree.indexOf(`tour-target-${targetId}`);

    expect(targetIndex('professional.clinical.consent')).toBeLessThan(
      targetIndex('professional.clinical.notes'),
    );
    expect(targetIndex('professional.clinical.consent')).toBeLessThan(
      targetIndex('professional.clinical.questionnaire'),
    );
    expect(targetIndex('professional.clinical.consent')).toBeLessThan(
      targetIndex('professional.clinical.consent-documents'),
    );
    expect(targetIndex('professional.clinical.consent-documents')).toBeLessThan(
      targetIndex('professional.clinical.questionnaire'),
    );
  });

  it('orders mobile clinical blocks by consent-first priority', () => {
    const rendered = render(
      <ClinicalGeneralWorkspace
        client={client as never}
        record={record as never}
        isTablet={false}
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

    const renderedTree = JSON.stringify(rendered.toJSON());
    const orderedTargets = [
      'professional.clinical.consent',
      'professional.clinical.consent-documents',
      'professional.clinical.questionnaire',
      'professional.clinical.notes',
      'professional.clinical.timeline',
      'professional.clinical.reports',
      'professional.clinical.documents',
    ];
    const targetIndexes = orderedTargets.map((targetId) =>
      renderedTree.indexOf(`tour-target-${targetId}`),
    );

    expect(targetIndexes.every((index) => index >= 0)).toBe(true);
    expect(targetIndexes).toEqual([...targetIndexes].sort((left, right) => left - right));
  });

  it('renders the two consent routes inside the same clinical consent module', () => {
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
    expect(screen.getAllByText('Firma digital de consentimiento clínico').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Documento de consentimiento clínico').length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        'Dos vías según el tipo de paciente. Ambas dejan el consentimiento vigente cuando se completa la vía que corresponde.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Vía para pacientes con cuenta HERA. Al firmar desde su cuenta, el consentimiento queda vigente y se habilita el tratamiento de sus datos clínicos.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Vía con documento firmado para pacientes sin cuenta HERA. Al registrar el documento, el consentimiento queda vigente y se habilita el tratamiento de sus datos clínicos.',
      ),
    ).toBeTruthy();

    rerender(
      <ClinicalGeneralWorkspace
        client={managedClient as never}
        record={pendingManagedRecord as never}
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

    expect(screen.getAllByText('Documento de consentimiento clínico').length).toBeGreaterThan(0);
    expect(screen.getByText('consentimiento-firmado.pdf')).toBeTruthy();
    expect(screen.getByText('Adjuntar documento')).toBeTruthy();
    expect(screen.getByText('Registrar consentimiento firmado')).toBeTruthy();
  });

  it('keeps signed consent evidence usable while clinical content actions wait for consent', () => {
    const onAttestClinicalConsent = jest.fn();
    const onUploadDocument = jest.fn();
    const onSaveNote = jest.fn();

    render(
      <ClinicalGeneralWorkspace
        client={managedClient as never}
        record={pendingManagedRecord as never}
        isTablet
        noteSaving={false}
        documentUploading={false}
        consentSubmitting={false}
        closingProcess={false}
        openingDocumentId={null}
        loadingMoreNotes={false}
        loadingMoreDocuments={false}
        loadingMoreConsentEvents={false}
        onSaveNote={onSaveNote}
        onOpenDocument={jest.fn()}
        onUploadDocument={onUploadDocument}
        onRequestDigitalConsent={jest.fn()}
        onAttestClinicalConsent={onAttestClinicalConsent}
        onCloseClinicalProcess={jest.fn()}
        onLoadMoreNotes={jest.fn()}
        onLoadMoreDocuments={jest.fn()}
        onLoadMoreConsentEvents={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText('Registrar consentimiento firmado'));

    expect(onAttestClinicalConsent).toHaveBeenCalledWith('consent-document-1');
    expect(screen.getByText('Adjuntar documento')).toBeTruthy();
    expect(screen.queryByText('Añadir informe')).toBeNull();
    expect(screen.queryByText('Añadir documento')).toBeNull();
    expect(screen.getByPlaceholderText('Escribe aquí una nota general del expediente...').props.editable).toBe(false);
    expect(onUploadDocument).not.toHaveBeenCalled();
    expect(onSaveNote).not.toHaveBeenCalled();
  });
});
