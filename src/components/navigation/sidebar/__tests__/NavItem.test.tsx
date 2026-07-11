import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { NavItem } from '../NavItem';
import type { NavigationItem, SidebarNotice } from '../types';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

const item: NavigationItem = {
  id: 'profile',
  label: 'Editar perfil',
  icon: 'create-outline',
  iconActive: 'create',
  route: 'ProfessionalProfile',
  roles: ['PROFESSIONAL'],
};

const notice: SidebarNotice = {
  code: 'PROFESSIONAL_INSURANCE',
  label: 'Falta seguro RC · +1',
  tone: 'critical',
  count: 2,
  target: {
    route: 'ProfessionalProfile',
    params: { initialTab: 'credentials', initialSection: 'insurance' },
  },
};

describe('NavItem completion notice', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
  });

  it('shows an expanded completion label and opens its exact target', () => {
    const onPress = jest.fn();
    const onNoticePress = jest.fn();
    const { getByLabelText, getByText } = render(
      <NavItem
        item={item}
        isActive={false}
        onPress={onPress}
        notice={notice}
        onNoticePress={onNoticePress}
      />,
    );

    expect(getByText('Falta seguro RC · +1')).toBeTruthy();
    fireEvent.press(getByLabelText('Editar perfil. Falta seguro RC · +1. Abrir sección pendiente'));
    expect(onNoticePress).toHaveBeenCalledWith(notice);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps the accessible completion target when the sidebar is collapsed', () => {
    const onNoticePress = jest.fn();
    const { getByLabelText, queryByText } = render(
      <NavItem
        item={item}
        isActive={false}
        isCollapsed
        onPress={jest.fn()}
        notice={notice}
        onNoticePress={onNoticePress}
      />,
    );

    expect(queryByText('Falta seguro RC · +1')).toBeNull();
    fireEvent.press(getByLabelText('Editar perfil. Falta seguro RC · +1. Abrir sección pendiente'));
    expect(onNoticePress).toHaveBeenCalledWith(notice);
  });
});
