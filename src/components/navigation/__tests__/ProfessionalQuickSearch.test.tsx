import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ProfessionalQuickSearch } from '../ProfessionalQuickSearch';
import { professionalSearchService } from '../../../services/professionalSearchService';
import * as analyticsService from '../../../services/analyticsService';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../contexts/ThemeContext', () => {
  const { lightTheme } = jest.requireActual('../../../constants/theme');
  return { useTheme: () => ({ theme: lightTheme }) };
});

jest.mock('../../../services/professionalSearchService', () => ({
  professionalSearchService: { searchPatients: jest.fn() },
}));

jest.mock('../../../services/analyticsService', () => ({ track: jest.fn() }));

const mockedSearch = jest.mocked(professionalSearchService.searchPatients);
const mockedAnalytics = jest.mocked(analyticsService);

describe('ProfessionalQuickSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces patient requests and exposes scrollable results', async () => {
    mockedSearch.mockResolvedValue([{ id: 'patient-1', displayName: 'Ana Ruiz', initials: 'AR' }]);
    const view = render(<ProfessionalQuickSearch />);
    const input = view.getByLabelText('Buscar pacientes o navegar');

    fireEvent(input, 'focus');
    fireEvent.changeText(input, 'ana');
    expect(mockedSearch).not.toHaveBeenCalled();

    jest.advanceTimersByTime(250);
    await waitFor(() => expect(view.getByText('Ana Ruiz')).toBeTruthy());
    expect(mockedSearch).toHaveBeenCalledWith('ana');
    expect(view.getByTestId('professional-quick-search-results')).toBeTruthy();
    expect(mockedAnalytics.track).toHaveBeenCalledWith('professional_quick_search_opened', {});
  });

  it('ignores an obsolete response after the query changes', async () => {
    let resolveFirst!: (value: Array<{ id: string; displayName: string; initials: string }>) => void;
    mockedSearch
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce([{ id: 'patient-2', displayName: 'Ana Belén', initials: 'AB' }]);

    const view = render(<ProfessionalQuickSearch />);
    const input = view.getByLabelText('Buscar pacientes o navegar');
    fireEvent(input, 'focus');
    fireEvent.changeText(input, 'ana');
    jest.advanceTimersByTime(250);
    fireEvent.changeText(input, 'ana bel');
    jest.advanceTimersByTime(250);

    await waitFor(() => expect(view.getByText('Ana Belén')).toBeTruthy());
    resolveFirst([{ id: 'patient-1', displayName: 'Ana Antigua', initials: 'AA' }]);
    await Promise.resolve();
    expect(view.queryByText('Ana Antigua')).toBeNull();
  });

  it('tracks only a result category when opening a patient', async () => {
    mockedSearch.mockResolvedValue([{ id: 'patient-1', displayName: 'Ana Ruiz', initials: 'AR' }]);
    const view = render(<ProfessionalQuickSearch />);
    const input = view.getByLabelText('Buscar pacientes o navegar');
    fireEvent(input, 'focus');
    fireEvent.changeText(input, 'ana');
    jest.advanceTimersByTime(250);
    await waitFor(() => expect(view.getByText('Ana Ruiz')).toBeTruthy());

    fireEvent.press(view.getByText('Ana Ruiz'));
    expect(mockedAnalytics.track).toHaveBeenCalledWith(
      'professional_quick_search_result_selected',
      { category: 'patient' },
    );
    expect(mockNavigate).toHaveBeenCalledWith('ClientProfile', { clientId: 'patient-1' });
  });
});
