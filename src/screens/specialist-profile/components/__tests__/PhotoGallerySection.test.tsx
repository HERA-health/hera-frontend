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

  it('keeps the gallery collapsed until the user opens it', () => {
    render(
      <PhotoGallerySection
        photoGallery={['https://example.com/one.jpg', 'https://example.com/two.jpg']}
        specialistName="Judith"
      />
    );

    expect(screen.getByText('Galería')).toBeTruthy();
    expect(screen.getByText('2 fotos')).toBeTruthy();
    expect(screen.queryByLabelText('Judith - 1 de 2')).toBeNull();

    fireEvent.press(screen.getByLabelText('Abrir Galería'));
    const mainImage = screen.getByLabelText('Judith - 1 de 2');
    expect(mainImage).toBeTruthy();
    expect(mainImage.props.resizeMode).toBe('contain');
    fireEvent.press(screen.getByLabelText('Cerrar Galería'));
    expect(screen.queryByLabelText('Judith - 1 de 2')).toBeNull();
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

  it('shows at most four compact thumbnails and opens the selected photo in the existing viewer', () => {
    const photos = ['one', 'two', 'three', 'four', 'five'].map(name => `https://example.com/${name}.jpg`);
    render(<PhotoGallerySection compact photoGallery={photos} specialistName="Judith" />);
    expect(screen.queryByLabelText('Abrir Galería')).toBeNull();
    expect(screen.getAllByRole('button', { name: /Abrir foto/ })).toHaveLength(4);
    expect(screen.getByText('Ver todas (5) →')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Abrir foto 3 de 5'));
    expect(screen.getByLabelText('Judith - 3 de 5').props.source.uri).toBe(photos[2]);
    expect(screen.getByLabelText('Judith - 3 de 5').props.resizeMode).toBe('contain');
    fireEvent.press(screen.getByLabelText('Cerrar galería'));
    fireEvent.press(screen.getByText('Ver todas (5) →'));
    expect(screen.getByLabelText('Judith - 1 de 5')).toBeTruthy();
  });

  it('does not repeat a single compact photo or show a more-photos action', () => {
    const view = render(<PhotoGallerySection compact photoGallery={['https://example.com/one.jpg']} />);
    expect(screen.getAllByRole('button', { name: /Abrir foto/ })).toHaveLength(1);
    expect(screen.queryByText(/Ver todas/)).toBeNull();
    view.rerender(<PhotoGallerySection compact photoGallery={[]} />);
    expect(screen.queryByText('Galería')).toBeNull();
  });
});
