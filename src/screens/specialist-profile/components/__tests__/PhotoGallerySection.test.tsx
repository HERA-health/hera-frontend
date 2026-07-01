import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { PhotoGallerySection } from '../PhotoGallerySection';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

describe('PhotoGallerySection', () => {
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

  it('starts collapsed and renders the carousel only after opening', () => {
    render(
      <PhotoGallerySection
        photoGallery={['https://example.com/one.jpg', 'https://example.com/two.jpg']}
        specialistName="Judith"
      />
    );

    expect(screen.getByText('Galería')).toBeTruthy();
    expect(screen.getByText('2 fotos')).toBeTruthy();
    expect(screen.queryByLabelText('Judith - 01 / 02')).toBeNull();

    fireEvent.press(screen.getByTestId('photo-gallery-disclosure-header'));

    expect(screen.getByLabelText('Judith - 01 / 02')).toBeTruthy();
  });

  it('keeps hook order stable when the gallery appears or disappears', () => {
    const { rerender } = render(
      <PhotoGallerySection
        photoGallery={[]}
        specialistName="Judith"
      />
    );

    expect(screen.queryByText('Galería')).toBeNull();

    rerender(
      <PhotoGallerySection
        photoGallery={['https://example.com/one.jpg']}
        specialistName="Judith"
      />
    );

    expect(screen.getByText('Galería')).toBeTruthy();
    expect(screen.getByText('1 foto')).toBeTruthy();

    rerender(
      <PhotoGallerySection
        photoGallery={[]}
        specialistName="Judith"
      />
    );

    expect(screen.queryByText('Galería')).toBeNull();
  });
});
