import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { NavigationSectionComponent, Sidebar } from '../Sidebar';
import { StyleSheet } from 'react-native';
import { PROFESSIONAL_SECTIONS } from '../navConfig';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: jest.requireActual('../../../../constants/theme').lightTheme }),
}));

const section = PROFESSIONAL_SECTIONS.find((entry) => entry.id === 'management')!;
const props = { section, currentRoute: 'ProfessionalHome', onNavigate: jest.fn(), showDivider: true, isCollapsed: false, notices: {} };

describe('sidebar section disclosure', () => {
  it('uses a 48px mobile disclosure target and toggles without navigating', () => {
    const onNavigate = jest.fn();
    const view = render(<NavigationSectionComponent {...props} isMobile onNavigate={onNavigate} />);
    const trigger = view.getByRole('button', { name: 'Gestión' });
    expect(StyleSheet.flatten(trigger.props.style).minHeight).toBe(48);
    fireEvent.press(trigger);
    expect(view.queryByText('Facturación')).toBeNull();
    fireEvent.press(trigger);
    expect(view.getByText('Facturación')).toBeTruthy();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('offers a mobile close control instead of a desktop collapse control', () => {
    const close = jest.fn();
    const view = render(<Sidebar userRole="PROFESSIONAL" currentRoute="ProfessionalHome"
      onNavigate={jest.fn()} user={{ name: 'Profesional', role: 'PROFESSIONAL' }}
      onLogout={jest.fn()} isMobile onToggleCollapse={close} />);
    expect(view.queryByLabelText('Colapsar menú')).toBeNull();
    fireEvent.press(view.getByLabelText('Cerrar menú'));
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('starts management open and toggles it accessibly', () => {
    const view = render(<NavigationSectionComponent {...props} />);
    expect(view.getByText('Facturación')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Gestión' }).props.accessibilityState.expanded).toBe(true);
    fireEvent.press(view.getByRole('button', { name: 'Gestión' }));
    expect(view.queryByText('Facturación')).toBeNull();
    expect(view.getByRole('button', { name: 'Gestión' }).props.accessibilityState.expanded).toBe(false);
    fireEvent.press(view.getByRole('button', { name: 'Gestión' }));
    expect(view.getByText('Facturación')).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: 'Gestión' }));
    expect(view.queryByText('Facturación')).toBeNull();
  });

  it('opens on navigation and still lets the user close the active section', () => {
    const view = render(<NavigationSectionComponent {...props} />);
    fireEvent.press(view.getByRole('button', { name: 'Gestión' }));
    view.rerender(<NavigationSectionComponent {...props} currentRoute="ProfessionalBilling" />);
    expect(view.getByText('Facturación')).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: 'Gestión' }));
    expect(view.queryByText('Facturación')).toBeNull();
  });

  it('keeps all destinations available in the compact icon menu', () => {
    const view = render(<NavigationSectionComponent {...props} isCollapsed />);
    expect(view.queryByRole('button', { name: 'Gestión' })).toBeNull();
    expect(view.getByLabelText('Navegar a Facturación')).toBeTruthy();
  });

  it('keeps pending notices visible while closed', () => {
    const view = render(<NavigationSectionComponent {...props} notices={{ billing: {
      code: 'BILLING', label: 'Datos fiscales pendientes', tone: 'warning', count: 2,
      target: { route: 'ProfessionalBilling' },
    } }} />);
    fireEvent.press(view.getByRole('button', { name: 'Gestión' }));
    expect(view.getByLabelText('2 avisos pendientes')).toBeTruthy();
  });

  it('opens Professional, Management and Profile by default, keeping the remaining groups closed', () => {
    expect(PROFESSIONAL_SECTIONS.slice(0, 4).map((entry) => entry.id))
      .toEqual(['main-nav', 'management', 'professional-profile', 'professional-network']);
    for (const entry of PROFESSIONAL_SECTIONS) {
      const view = render(<NavigationSectionComponent {...props} section={entry} currentRoute="" />);
      expect(view.getByRole('button', { name: entry.label }).props.accessibilityState.expanded)
        .toBe(['main-nav', 'management', 'professional-profile'].includes(entry.id));
      view.unmount();
    }
  });
});
