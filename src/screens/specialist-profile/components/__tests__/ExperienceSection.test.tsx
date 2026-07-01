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

  it('renders education as bullets and shows linked certificate thumbnails', () => {
    const onOpenCertificate = jest.fn();
    const certificate: CertificateItem = {
      id: 'cert-1',
      name: 'Título universitario',
      issuer: 'Universidad de Barcelona',
      educationId: 'edu-1',
      mimeType: 'image/png',
      documentUrl: 'http://localhost:3000/api/specialists/spec-1/certificates/cert-1/document',
      previewUrl: 'http://localhost:3000/api/specialists/spec-1/certificates/cert-1/document',
    };

    render(
      <ExperienceSection
        education={[{
          id: 'edu-1',
          degree: 'Licenciatura en Psicología',
          institution: 'Universidad de Barcelona',
          startYear: '1998',
          endYear: '2003',
        }]}
        certifications={[certificate]}
        onOpenCertificate={onOpenCertificate}
      />
    );

    expect(screen.getByText('Formación superior y profesional')).toBeTruthy();
    expect(screen.getByText('1998 - 2003: Licenciatura en Psicología - Universidad de Barcelona')).toBeTruthy();
    expect(screen.getByText('Documento aportado')).toBeTruthy();
    expect(screen.UNSAFE_getByType(Image).props.source).toEqual({
      uri: 'http://localhost:3000/api/specialists/spec-1/certificates/cert-1/document',
    });

    fireEvent.press(screen.getByLabelText('Ver certificado Título universitario'));
    expect(onOpenCertificate).toHaveBeenCalledWith(certificate);
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
    fireEvent.press(screen.getByLabelText('Ver certificado Certificación EMDR'));
    expect(onOpenCertificate).toHaveBeenCalledWith(certificate);
  });

  it('does not show an open action for certificates without a document URL', () => {
    const onOpenCertificate = jest.fn();
    const certificate: CertificateItem = {
      id: 'cert-without-url',
      name: 'Certificado sin archivo público',
      issuer: 'Colegio profesional',
      mimeType: 'application/pdf',
    };

    render(
      <ExperienceSection
        certifications={[certificate]}
        onOpenCertificate={onOpenCertificate}
      />
    );

    expect(screen.getByText('Certificado sin archivo público')).toBeTruthy();
    expect(screen.getByText('Documento aportado')).toBeTruthy();
    expect(screen.queryByText('Ver certificado')).toBeNull();
    expect(screen.queryByLabelText('Ver certificado Certificado sin archivo público')).toBeNull();

    fireEvent.press(screen.getByLabelText('Certificado sin archivo público'));
    expect(onOpenCertificate).not.toHaveBeenCalled();
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

  it('opens the first useful block and keeps later blocks collapsed until requested', () => {
    render(
      <ExperienceSection
        education={[{
          id: 'edu-1',
          degree: 'Máster en Psicología General Sanitaria',
          institution: 'Universidad',
          startYear: '2018',
          endYear: '2020',
        }]}
        experience={[{
          id: 'exp-1',
          position: 'Psicóloga clínica',
          organization: 'Centro de salud mental',
          startYear: '2020',
          current: true,
        }]}
      />
    );

    expect(screen.getByText(/Máster en Psicología General Sanitaria/)).toBeTruthy();
    expect(screen.queryByText(/Psicóloga clínica/)).toBeNull();

    fireEvent.press(screen.getByTestId('experience-work-disclosure-header'));

    expect(screen.getByText(/Psicóloga clínica/)).toBeTruthy();
  });

  it('shows a compact credentials row instead of an empty education card', () => {
    render(
      <ExperienceSection
        collegiateNumber="H-90909"
        experienceYears={9}
      />
    );

    expect(screen.getByText('Credenciales profesionales')).toBeTruthy();
    expect(screen.getByText(/Col\. H-90909/)).toBeTruthy();
    expect(screen.queryByTestId('experience-education-disclosure')).toBeNull();
  });
});
