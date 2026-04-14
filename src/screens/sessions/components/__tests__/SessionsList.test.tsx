import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { darkTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { ApiSession } from '../../types';
import SessionsList from '../SessionsList';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../SessionCard', () => ({
  __esModule: true,
  default: ({ session }: { session: { id: string } }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, `session-${session.id}`);
  },
}));

const mockedUseTheme = jest.mocked(useTheme);

const buildSession = (id: string, date: string): ApiSession => ({
  id,
  date,
  duration: 60,
  status: 'COMPLETED',
  type: 'VIDEO_CALL',
  specialist: {
    id: `specialist-${id}`,
    specialization: 'General',
    pricePerSession: 50,
    user: {
      name: `Specialist ${id}`,
      email: `${id}@example.com`,
    },
  },
});

describe('SessionsList', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: darkTheme,
      mode: 'dark',
      isDark: true,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the empty state when there are no upcoming sessions', () => {
    render(<SessionsList sessions={[]} selectedDate="" embedded />);

    expect(screen.getByText('Estás al día')).toBeTruthy();
  });

  it('renders history from most recent to oldest', () => {
    const sessions = [
      buildSession('early', '2025-01-05T10:00:00.000Z'),
      buildSession('late', '2025-02-05T10:00:00.000Z'),
    ];

    const { toJSON } = render(<SessionsList sessions={sessions} selectedDate="" embedded />);
    const tree = JSON.stringify(toJSON());

    expect(tree.indexOf('session-late')).toBeGreaterThanOrEqual(0);
    expect(tree.indexOf('session-early')).toBeGreaterThanOrEqual(0);
    expect(tree.indexOf('session-late')).toBeLessThan(tree.indexOf('session-early'));
  });
});
