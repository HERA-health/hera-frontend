import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { lightTheme } from '../../../constants/theme';
import { VisibleScrollView } from '../VisibleScrollView';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

describe('VisibleScrollView', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  it('keeps the vertical scrollbar visible for overflowing content', () => {
    render(
      <VisibleScrollView testID="vertical-scroll">
        <Text>Contenido</Text>
      </VisibleScrollView>,
    );

    const scroll = screen.getByTestId('vertical-scroll');
    expect(scroll.props.showsVerticalScrollIndicator).toBe(true);
    expect(scroll.props.showsHorizontalScrollIndicator).toBe(false);
    expect(scroll.props.persistentScrollbar).toBe(true);
    expect(scroll.props.indicatorStyle).toBe('black');
  });

  it('shows the horizontal indicator for horizontally scrollable controls', () => {
    render(
      <VisibleScrollView horizontal testID="horizontal-scroll">
        <Text>Contenido</Text>
      </VisibleScrollView>,
    );

    const scroll = screen.getByTestId('horizontal-scroll');
    expect(scroll.props.showsVerticalScrollIndicator).toBe(false);
    expect(scroll.props.showsHorizontalScrollIndicator).toBe(true);
    expect(scroll.props.persistentScrollbar).toBe(true);
  });
});

