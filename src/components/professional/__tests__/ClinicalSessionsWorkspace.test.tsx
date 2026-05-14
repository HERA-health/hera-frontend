import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { billingService } from '../../../services/billingService';
import { ClinicalSessionsWorkspace } from '../ClinicalSessionsWorkspace';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../services/billingService', () => ({
  billingService: {
    getAttachableInvoicesForSession: jest.fn(),
    generateInvoiceFromSession: jest.fn(),
  },
}));

jest.mock('../ClinicalSessionFolderCard', () => ({
  ClinicalSessionFolderCard: ({ onManageInvoice }: { onManageInvoice: () => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable onPress={onManageInvoice}>
        <Text>manage invoice</Text>
      </Pressable>
    );
  },
}));

jest.mock('../ClinicalSessionInvoiceSheet', () => ({
  ClinicalSessionInvoiceSheet: ({
    visible,
    onCreateNew,
  }: {
    visible: boolean;
    onCreateNew: () => void;
  }) =>
    {
      const React = require('react');
      const { Pressable, Text } = require('react-native');
      return visible ? (
        <Pressable onPress={onCreateNew}>
          <Text>Crear desde la sesión</Text>
        </Pressable>
      ) : null;
    },
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedBillingService = jest.mocked(billingService);

const sessionFolders = [
  {
    session: {
      id: 'session-1',
      clientId: 'client-1',
      specialistId: 'specialist-1',
      date: '2026-05-20T10:00:00.000Z',
      duration: 60,
      bookedPrice: 0,
      bookedCurrency: 'EUR',
      bookedTariffName: 'Primera sesión gratuita',
      bookedDuration: 60,
      status: 'COMPLETED',
      type: 'VIDEO_CALL',
      invoice: null,
    },
    notes: [],
    documents: [],
  },
];

const client = {
  id: 'client-1',
  user: {
    id: 'user-1',
    name: 'Paciente Test',
    email: 'paciente@example.com',
  },
};

describe('ClinicalSessionsWorkspace', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    mockedBillingService.getAttachableInvoicesForSession.mockResolvedValue([]);
    mockedBillingService.generateInvoiceFromSession.mockResolvedValue({
      id: 'invoice-1',
      clientId: 'client-1',
      sessionId: 'session-1',
      invoiceNumber: 'FS-1',
      invoiceKind: 'SIMPLIFIED',
      status: 'DRAFT',
    });
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('navigates to the generated invoice even when workspace refresh fails', async () => {
    const onReloadWorkspace = jest.fn().mockRejectedValue(new Error('refresh failed'));

    render(
      <ClinicalSessionsWorkspace
        clientId="client-1"
        client={client as never}
        isTablet={false}
        sessionFolders={sessionFolders as never}
        hasMore={false}
        loadingMore={false}
        consentGranted
        noteSaving={false}
        documentUploading={false}
        openingDocumentId={null}
        onOpenDocument={jest.fn()}
        onSaveNote={jest.fn()}
        onUploadDocument={jest.fn()}
        onLoadMore={jest.fn()}
        onReloadWorkspace={onReloadWorkspace}
        onRequestRefreshClient={jest.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.press(screen.getByText('manage invoice'));
    fireEvent.press(await screen.findByText('Crear desde la sesión'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('CreateInvoice', {
        invoiceId: 'invoice-1',
        returnToClientId: 'client-1',
      });
    });
    expect(onReloadWorkspace).toHaveBeenCalled();
  });
});
