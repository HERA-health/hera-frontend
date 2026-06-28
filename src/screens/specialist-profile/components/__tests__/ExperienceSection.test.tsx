import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Image } from 'react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ExperienceSection } from '../ExperienceSection';
import type { CertificateItem } from '../../types';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

describe('ExperienceSection', () => {
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

  it('renders education certificates under their linked education item', () => {
    render(
      <ExperienceSection
        education={[{
          id: 'edu-1',
          degree: 'Licenciatura en Psicología',
          institution: 'Universidad de Barcelona',
          startYear: '1998',
          endYear: '2003',
        }]}
        certifications={[{
          id: 'cert-1',
          name: 'Título universitario',
          issuer: 'Universidad de Barcelona',
          educationId: 'edu-1',
          mimeType: 'image/png',
          documentUrl: 'http://localhost:3000/api/specialists/spec-1/certificates/cert-1/document',
          previewUrl: 'http://localhost:3000/api/specialists/spec-1/certificates/cert-1/document',
        }]}
      />
    );

    expect(screen.getByText('Formación académica')).toBeTruthy();
    expect(screen.getByText('Licenciatura en Psicología')).toBeTruthy();
    expect(screen.getByText('Título universitario')).toBeTruthy();
    expect(screen.getByText('Documento aportado')).toBeTruthy();
    expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
      uri: 'http://localhost:3000/api/specialists/spec-1/certificates/cert-1/document',
    });
  });

  it('renders visible unlinked certificates in their own section and opens them', () => {
    const onOpenCertificate = jest.fn();
    const certificate: CertificateItem = {
      id: 'cert-2',
      name: 'Certificación EMDR',
      issuer: 'Instituto EMDR',
      educationId: null,
      mimeType: 'application/pdf',
      documentUrl: 'http://localhost:3000/api/specialists/spec-1/certificates/cert-2/document',
    };

    render(
      <ExperienceSection
        certifications={[certificate]}
        onOpenCertificate={onOpenCertificate}
      />
    );

    expect(screen.getByText('Certificaciones y acreditaciones')).toBeTruthy();
    fireEvent.press(screen.getByText('Ver certificado'));
    expect(onOpenCertificate).toHaveBeenCalledWith(certificate);
  });

  it('does not render documentUrl as an image preview when previewUrl is missing', () => {
    const certificate: CertificateItem = {
      id: 'cert-3',
      name: 'Título en terapia familiar',
      issuer: 'Universidad',
      educationId: null,
      mimeType: 'image/png',
      documentUrl: 'http://localhost:3000/api/specialists/spec-1/certificates/cert-3/document',
    };

    render(
      <ExperienceSection
        certifications={[certificate]}
        onOpenCertificate={jest.fn()}
      />
    );

    expect(screen.getByText('Título en terapia familiar')).toBeTruthy();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });

  it('does not render an empty certificates block', () => {
    render(
      <ExperienceSection
        education={[{
          id: 'edu-1',
          degree: 'Máster en Psicología Clínica',
          institution: 'Universidad',
          startYear: '2018',
          endYear: '2020',
        }]}
      />
    );

    expect(screen.queryByText('Certificaciones y acreditaciones')).toBeNull();
  });
});
