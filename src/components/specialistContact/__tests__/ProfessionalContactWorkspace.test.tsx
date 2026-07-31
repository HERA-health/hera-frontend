import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import * as contactService from '../../../services/specialistContactService';
import { ProfessionalContactWorkspace } from '../ProfessionalContactWorkspace';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../services/analyticsService', () => ({ track: jest.fn() }));
jest.mock('../../../services/specialistContactService', () => ({
  listHelpRequests: jest.fn(),
  listFeedback: jest.fn(),
  getHelpRequest: jest.fn(),
  markHelpRequestRead: jest.fn(),
  createHelpRequest: jest.fn(),
  replyToHelpRequest: jest.fn(),
  resolveHelpRequest: jest.fn(),
  createFeedback: jest.fn(),
  getTechnicalContext: jest.fn(() => ({ platform: 'web', screenName: 'ProfessionalHelp' })),
}));
jest.mock('../../common', () => ({
  AnimatedPressable: ({ children, onPress, accessibilityRole, accessibilityState }: {
    children: React.ReactNode;
    onPress?: () => void;
    accessibilityRole?: 'button' | 'tab';
    accessibilityState?: { selected?: boolean };
  }) => {
    const { Pressable } = require('react-native');
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
      >
        {children}
      </Pressable>
    );
  },
  Button: ({ children, onPress, disabled }: {
    children: React.ReactNode;
    onPress: () => void;
    disabled?: boolean;
  }) => {
    const { Pressable, Text } = require('react-native');
    return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}><Text>{children}</Text></Pressable>;
  },
  Input: ({ label, value, onChangeText }: {
    label?: string;
    value: string;
    onChangeText: (value: string) => void;
  }) => {
    const { TextInput } = require('react-native');
    return <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} />;
  },
  SimpleDropdown: () => {
    const { View } = require('react-native');
    return <View />;
  },
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedContactService = jest.mocked(contactService);

const listItems: contactService.HelpRequestListItem[] = [
  {
    id: 'help-a',
    reference: 'AYU-000001',
    category: 'TECHNICAL',
    impact: 'NON_BLOCKING',
    subject: 'Solicitud A',
    status: 'NEW',
    lastActivityAt: '2026-07-31T10:00:00.000Z',
    resolvedAt: null,
    createdAt: '2026-07-31T10:00:00.000Z',
    unreadAdminMessages: 0,
  },
  {
    id: 'help-b',
    reference: 'AYU-000002',
    category: 'PROFILE',
    impact: 'DEGRADED',
    subject: 'Solicitud B',
    status: 'IN_PROGRESS',
    lastActivityAt: '2026-07-31T11:00:00.000Z',
    resolvedAt: null,
    createdAt: '2026-07-31T11:00:00.000Z',
    unreadAdminMessages: 0,
  },
];

const detailFor = (item: contactService.HelpRequestListItem): contactService.HelpRequestDetail => ({
  ...item,
  platform: 'web',
  appVersion: '1.0.0',
  screenName: 'ProfessionalHelp',
  messages: [{
    id: `${item.id}-message`,
    author: 'SPECIALIST',
    body: `Mensaje de ${item.reference}`,
    readAt: null,
    createdAt: item.createdAt,
  }],
});

describe('ProfessionalContactWorkspace thread safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      isDark: false,
    } as ReturnType<typeof useTheme>);
    mockedContactService.listHelpRequests.mockResolvedValue({ items: listItems, nextCursor: null });
    mockedContactService.listFeedback.mockResolvedValue({ items: [], nextCursor: null });
    mockedContactService.getHelpRequest.mockImplementation(async (id) => {
      const item = listItems.find((candidate) => candidate.id === id);
      if (!item) throw new Error('missing');
      return detailFor(item);
    });
  });

  it('loads only the active section and keeps reply drafts isolated by thread', async () => {
    const onRouteChange = jest.fn();
    render(
      <ProfessionalContactWorkspace initialSection="help" onRouteChange={onRouteChange} />
    );

    await waitFor(() => expect(screen.getByText('Solicitud A')).toBeTruthy());
    expect(mockedContactService.listFeedback).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Solicitud A'));
    await waitFor(() => expect(screen.getByLabelText('Tu respuesta')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Tu respuesta'), 'Borrador del hilo A');

    fireEvent.press(screen.getByText('Todas'));
    expect(onRouteChange).toHaveBeenLastCalledWith({ section: 'help', requestId: undefined });

    fireEvent.press(screen.getByText('Solicitud B'));
    await waitFor(() => expect(screen.getByLabelText('Tu respuesta').props.value).toBe(''));
    fireEvent.changeText(screen.getByLabelText('Tu respuesta'), 'Borrador del hilo B');
    fireEvent.press(screen.getByText('Todas'));
    fireEvent.press(screen.getByText('Solicitud A'));

    await waitFor(() => {
      expect(screen.getByLabelText('Tu respuesta').props.value).toBe('Borrador del hilo A');
    });
  });

  it('keeps a successful reply successful when the later list refresh fails', async () => {
    render(<ProfessionalContactWorkspace initialSection="help" />);

    await waitFor(() => expect(screen.getByText('Solicitud A')).toBeTruthy());
    fireEvent.press(screen.getByText('Solicitud A'));
    await waitFor(() => expect(screen.getByLabelText('Tu respuesta')).toBeTruthy());

    mockedContactService.replyToHelpRequest.mockResolvedValue({
      id: 'reply-1',
      author: 'SPECIALIST',
      body: 'Respuesta guardada',
      readAt: null,
      createdAt: '2026-07-31T12:00:00.000Z',
    });
    mockedContactService.listHelpRequests.mockRejectedValueOnce(new Error('refresh failed'));
    fireEvent.changeText(screen.getByLabelText('Tu respuesta'), 'Respuesta guardada');
    fireEvent.press(screen.getByText('Responder'));

    await waitFor(() => {
      expect(screen.getByText('La respuesta se ha enviado, pero el historial no se ha podido actualizar.')).toBeTruthy();
    });
    expect(mockedContactService.replyToHelpRequest).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('No se pudo enviar la respuesta. Tu borrador se conserva.')).toBeNull();
    expect(screen.getByLabelText('Tu respuesta').props.value).toBe('');
  });

  it('does not reopen a dismissed deep-linked thread before the route update arrives', async () => {
    const onRouteChange = jest.fn();
    render(
      <ProfessionalContactWorkspace
        initialSection="help"
        initialRequestId="help-a"
        onRouteChange={onRouteChange}
      />
    );

    await waitFor(() => expect(screen.getByText('Todas')).toBeTruthy());
    fireEvent.press(screen.getByText('Todas'));

    await waitFor(() => expect(screen.getByText('Solicitud A')).toBeTruthy());
    expect(mockedContactService.getHelpRequest).toHaveBeenCalledTimes(1);
    expect(onRouteChange).toHaveBeenLastCalledWith({
      section: 'help',
      requestId: undefined,
    });
  });
});
