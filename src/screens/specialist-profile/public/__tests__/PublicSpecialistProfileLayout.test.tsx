import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useProfileOptions } from '../../../../hooks/useProfileOptions';
import * as sessions from '../../../../services/sessionsService';
import type { Specialist } from '../../types';
import { PublicSpecialistProfileLayout } from '../PublicSpecialistProfileLayout';
import { PublicProfileHero } from '../PublicProfileHero';
import { publicProfileExcerpt, publicProfilePrice, publicAvailabilityLabel } from '../publicProfilePresentation';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: require('../../../../constants/theme').lightTheme, isDark: false }),
}));
jest.mock('../../../../hooks/useProfileOptions', () => ({ useProfileOptions: jest.fn() }));
jest.mock('../../../../hooks/useDiscoveryRevalidation', () => ({ useDiscoveryRevalidation: jest.fn() }));
jest.mock('../../../../services/sessionsService', () => ({ getAvailableSlots: jest.fn() }));
jest.mock('../../useSpecialistProfileActions', () => ({ useSpecialistProfileActions: () => ({
  shareProfile: jest.fn(), toggleFavorite: jest.fn(), isFavorite: false, favoriteLoading: false,
}) }));
jest.mock('../../components/ReviewsSection', () => { const { Text } = require('react-native'); return { ReviewsSection: () => <Text>Published reviews section</Text> }; });
jest.mock('../../components/VideoSection', () => ({ VideoSection: () => null }));
jest.mock('../../components/PhotoGallerySection', () => ({ PhotoGallerySection: () => null }));
jest.mock('../../components/ExperienceSection', () => { const { Text } = require('react-native'); return { ExperienceSection: () => <Text>Education section</Text> }; });
jest.mock('../../../../components/location', () => ({ LocationMapPreview: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
// Native host measurements are unavailable in the renderer; exercise option changes here,
// with the actual portal/focus interactions covered by the browser checks.
jest.mock('../../../../components/common/SimpleDropdown', () => {
  const { Pressable, Text, View } = require('react-native');
  return { SimpleDropdown: ({ options, onSelect }: { options: { value: string; label: string }[]; onSelect: (value: string) => void }) =>
    <View>{options.map(option => <Pressable key={option.value} onPress={() => onSelect(option.value)}><Text>{option.label}</Text></Pressable>)}</View> };
});

const slot = { startTime: '11:05', endTime: '11:55', available: true };
const specialist: Specialist = {
  id: 'one', name: 'Ana Roca Martín', title: 'Psicóloga', bio: 'Hola, soy Ana. 😊\n\nPodemos avanzar a tu ritmo.',
  rating: 0, reviewCount: 0, pricePerSession: 50, specializations: [], sessionTypes: ['VIDEO_CALL'],
  offersOnline: true, offersPhone: true, nextAvailable: '2099-07-29',
  publicOptions: [
    { specialistId: 'one', optionId: 'video', serviceId: 'general', serviceName: 'General', modality: 'VIDEO_CALL', durationMinutes: 50, priceCents: 5000 },
    { specialistId: 'one', optionId: 'phone', serviceId: 'general', serviceName: 'General', modality: 'PHONE_CALL', durationMinutes: 30, priceCents: 2550 },
  ],
};
const props = {
  specialist, reviews: [], reviewsVisible: false, canBook: true, isAuthenticated: false, isClient: false,
  onBrowseSpecialists: jest.fn(), onBookSession: jest.fn(), onOpenCertificate: jest.fn(),
  onReviewSubmitted: jest.fn(), onScrollChange: jest.fn(),
};
const summary = () => within(screen.getByTestId('public-booking-summary'));
const open = () => fireEvent.press(summary().getByText('Ver disponibilidad'));

beforeEach(() => { jest.clearAllMocks(); jest.mocked(useProfileOptions).mockReturnValue({ options: null, error: false, retry: jest.fn() }); jest.mocked(sessions.getAvailableSlots).mockResolvedValue([slot]); });

it('places package access inside the booking summary and hides the mobile booking bar while it is open', () => {
  render(<PublicSpecialistProfileLayout {...props} renderPackageAction={onVisibility =>
    <Pressable onPress={() => onVisibility(true)}><Text>Comprar bono de sesiones</Text></Pressable>} />);
  expect(summary().getByText('Comprar bono de sesiones')).toBeTruthy();
  expect(screen.getAllByText('Comprar bono de sesiones')).toHaveLength(1);
  expect(screen.getByTestId('public-profile-booking-bar')).toBeTruthy();
  fireEvent.press(summary().getByText('Comprar bono de sesiones'));
  expect(screen.queryByTestId('public-profile-booking-bar')).toBeNull();
});

it('keeps the directory option and selection on close; rechecks and rejects a withdrawn time on reopening', async () => {
  render(<PublicSpecialistProfileLayout {...props} initialOptionId="phone" />);
  expect(summary().getByText('General · Teléfono')).toBeTruthy();
  open();
  fireEvent.press(await screen.findByText('11:05'));
  fireEvent.press(screen.getByLabelText('Cerrar disponibilidad'));
  expect(summary().getByText('Continuar')).toBeTruthy();
  expect(sessions.getAvailableSlots).toHaveBeenLastCalledWith('one', '2099-07-29', 'phone');
  jest.mocked(sessions.getAvailableSlots).mockResolvedValue([]);
  fireEvent.press(summary().getByText('Cambiar horario'));
  expect(await screen.findByText('Ese horario ya no está disponible. Elige otra hora para continuar.')).toBeTruthy();
  expect(screen.getByText('Abrir calendario completo')).toBeTruthy();
  expect(props.onBookSession).not.toHaveBeenCalled();
});

it('continues with the same option, date and time after closing the panel', async () => {
  render(<PublicSpecialistProfileLayout {...props} initialOptionId="phone" />);
  open();
  fireEvent.press(await screen.findByText('11:05'));
  fireEvent.press(screen.getByLabelText('Cerrar disponibilidad'));
  fireEvent.press(summary().getByText('Continuar'));
  expect(props.onBookSession).toHaveBeenCalledWith({ date: '2099-07-29', slot }, 'phone');
});

it('clears the time when changing option and falls back to the first public option', async () => {
  render(<PublicSpecialistProfileLayout {...props} initialOptionId="withdrawn" />);
  expect(summary().getByText('General · Videollamada')).toBeTruthy();
  open();
  fireEvent.press(await screen.findByText('11:05'));
  fireEvent.press(screen.getByText(/Teléfono · 30 min/));
  await waitFor(() => expect(sessions.getAvailableSlots).toHaveBeenLastCalledWith('one', '2099-07-29', 'phone'));
  expect(screen.getByText('Abrir calendario completo')).toBeTruthy();
  fireEvent.press(screen.getByText('Abrir calendario completo'));
  expect(props.onBookSession).toHaveBeenCalledWith(undefined, 'phone');
});

it('resets selection on another professional and does not offer availability when booking is disabled', async () => {
  const view = render(<PublicSpecialistProfileLayout {...props} />);
  open();
  fireEvent.press(await screen.findByText('11:05'));
  fireEvent.press(screen.getByLabelText('Cerrar disponibilidad'));
  view.rerender(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, id: 'two' }} canBook={false} />);
  expect(screen.queryByText('Continuar')).toBeNull();
  expect(screen.getByText('No acepta reservas ahora')).toBeTruthy();
  expect(screen.queryByText('Ver disponibilidad')).toBeNull();
});

it('distinguishes a slot request failure and permits a retry', async () => {
  jest.mocked(sessions.getAvailableSlots).mockRejectedValueOnce(new Error('Network'));
  render(<PublicSpecialistProfileLayout {...props} />);
  open();
  fireEvent.press(await screen.findByText('Reintentar'));
  expect(await screen.findByText('11:05')).toBeTruthy();
});

it('renders initials after a photo fails, with the full name and original public introduction', () => {
  render(<PublicProfileHero specialist={{ ...specialist, avatar: 'https://example.com/photo.jpg' }}
    onPractice={jest.fn()} onReviews={jest.fn()} onShare={jest.fn()} onFavorite={jest.fn()}
    showFavorite={false} isFavorite={false} favoriteLoading={false} />);
  fireEvent(screen.getByLabelText('Fotografía de Ana Roca Martín'), 'error');
  expect(screen.getByText('AR')).toBeTruthy();
  expect(screen.getByText('Ana Roca Martín')).toBeTruthy();
  expect(screen.getByText(specialist.bio)).toBeTruthy();
});

it('formats real prices and public excerpts without manufacturing availability', () => {
  expect(publicProfilePrice(0)).toBe('Sin coste');
  expect(publicProfilePrice(50)).toBe('50\u00a0€');
  expect(publicProfilePrice(25.5)).toBe('25,5\u00a0€');
  expect(publicProfileExcerpt('  Hola\n\n 😊  ')).toBe('Hola 😊');
  expect(publicProfileExcerpt('Una presentación con palabras completas', 20)).toBe('Una presentación…');
  expect(publicProfileExcerpt('')).toBe('');
  expect(publicAvailabilityLabel('2099-07-29')).toMatch(/^Próxima disponibilidad:/);
  expect(publicAvailabilityLabel('Disponible esta semana')).toBe('Consulta la disponibilidad');
});

it('shows a short biography once and expands a long one in place, preserving paragraphs', () => {
  const view = render(<PublicSpecialistProfileLayout {...props} />);
  expect(screen.getAllByText(specialist.bio)).toHaveLength(1);
  expect(screen.queryByText('Sobre mí')).toBeNull();
  expect(screen.queryByText('Leer presentación completa')).toBeNull();
  const bio = `${specialist.bio}\n\n${'Un espacio para conocerte y avanzar con calma. '.repeat(8)}`;
  view.rerender(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, bio }} />);
  expect(screen.queryByText(bio.trim())).toBeNull();
  fireEvent.press(screen.getByText('Leer presentación completa'));
  expect(screen.getAllByText(bio.trim())).toHaveLength(1);
  expect(screen.getByText('Leer menos')).toBeTruthy();
  fireEvent.press(screen.getByText('Leer menos'));
  expect(screen.queryByText(bio.trim())).toBeNull();
});

it('shows the consultation only when in-person attention and a public address are available', () => {
  const address = { street: 'Calle de la Consulta, 2', city: 'Madrid', postalCode: '28001' };
  const view = render(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, address, offersInPerson: true }} />);
  expect(screen.getAllByTestId('public-profile-location')).toHaveLength(1);
  expect(screen.getByText('Calle de la Consulta, 2 · Madrid')).toBeTruthy();
  view.rerender(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, address, offersInPerson: false }} />);
  expect(screen.queryByTestId('public-profile-location')).toBeNull();
});

const discoveryOptions = {
  languages: [{ value: 'spanish', label: 'Español', aliases: ['es'] }, { value: 'english', label: 'Inglés', aliases: ['en'] }],
  religions: [{ value: 'christian', label: 'Cristiana', aliases: [] }], religionEnabled: true,
  religionNotice: null, religionNoticeVersion: null,
};

it('keeps language names and flags together, including unknown languages and legacy codes', () => {
  jest.mocked(useProfileOptions).mockReturnValue({ options: discoveryOptions, error: false, retry: jest.fn() });
  render(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, languages: ['es', 'english', 'Idioma propio'] }} />);
  const languages = within(screen.getByTestId('public-profile-languages'));
  expect(languages.getByText('Español')).toBeTruthy();
  expect(languages.getByText('Inglés')).toBeTruthy();
  expect(languages.getByText('Idioma propio')).toBeTruthy();
  // Known languages render the actual SVG flags; the unknown label retains its neutral icon.
  expect(screen.getByTestId('public-profile-languages').findAllByType(require('react-native-svg').SvgXml)).toHaveLength(2);
});

it('keeps published spiritual information conditional and supports custom descriptions', () => {
  jest.mocked(useProfileOptions).mockReturnValue({ options: discoveryOptions, error: false, retry: jest.fn() });
  const view = render(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, religionCode: 'christian' }} />);
  expect(screen.getByText('Perspectiva espiritual o religiosa')).toBeTruthy();
  expect(screen.getByText('Cristiana')).toBeTruthy();
  view.rerender(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, religionCode: 'other', religionOtherText: 'Perspectiva publicada' }} />);
  expect(screen.getByText('Perspectiva publicada')).toBeTruthy();
  jest.mocked(useProfileOptions).mockReturnValue({ options: { ...discoveryOptions, religionEnabled: false }, error: false, retry: jest.fn() });
  view.rerender(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, religionCode: 'other', religionOtherText: 'Perspectiva publicada' }} />);
  expect(screen.queryByText('Perspectiva publicada')).toBeNull();
  expect(screen.queryByText('Perspectiva espiritual o religiosa')).toBeNull();
});

it('exposes alternate services without repeating modalities and opens the existing selector', async () => {
  const alternatives = [...specialist.publicOptions!, { ...specialist.publicOptions![0], optionId: 'couples', serviceId: 'couples', serviceName: 'Pareja y familia' }];
  render(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, publicOptions: alternatives }} />);
  expect(summary().getByText('También: Pareja y familia')).toBeTruthy();
  fireEvent.press(summary().getByText('Ver servicios y tarifas'));
  fireEvent.press(screen.getByText('Pareja y familia'));
  await waitFor(() => expect(sessions.getAvailableSlots).toHaveBeenLastCalledWith('one', '2099-07-29', 'couples'));
  fireEvent.press(screen.getByLabelText('Cerrar disponibilidad'));
  expect(summary().getByText('Pareja y familia · Videollamada')).toBeTruthy();
});

it('prioritizes published reviews, keeps empty reviews lower, and omits hidden reviews', () => {
  const education = [{ id: 'education', degree: 'Psicología', institution: 'Universidad', startYear: '2020', endYear: '2024' }];
  const reviews = [{ id: 'review', rating: 5, text: 'Comentario público', authorName: 'Paciente', date: '2026-01-01' }];
  const view = render(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, education, reviewCount: 1 }} reviews={reviews} reviewsVisible />);
  const sectionOrder = () => screen.getAllByText(/Published reviews section|Education section/).map(node => node.props.children);
  expect(sectionOrder()).toEqual(['Published reviews section', 'Education section']);
  view.rerender(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, education }} reviewsVisible />);
  expect(sectionOrder()).toEqual(['Education section', 'Published reviews section']);
  view.rerender(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, education }} />);
  expect(screen.queryByText('Published reviews section')).toBeNull();
});

it('groups the verified collegiate number in a disclosure and keeps review navigation available without reviews', () => {
  render(<PublicSpecialistProfileLayout {...props} reviewsVisible specialist={{ ...specialist, verificationStatus: 'VERIFIED', collegiateNumber: 'M-45198' }} />);
  const badge = screen.getByLabelText('Ver información de verificación');
  expect(within(badge).getByText('Col. M-45198')).toBeTruthy();
  expect(screen.getByLabelText('Ver sección de opiniones')).toBeTruthy();
  expect(screen.getByText('Aún sin reseñas')).toBeTruthy();
  expect(screen.queryByTestId('public-verification-details')).toBeNull();
  fireEvent.press(badge);
  expect(screen.getByText('Colegiación revisada por HERA')).toBeTruthy();
  expect(screen.getByText('N.º de colegiado: M-45198')).toBeTruthy();
  fireEvent.press(badge);
  expect(screen.queryByTestId('public-verification-details')).toBeNull();
});

it('shows public rating counts but hides all review summaries when opinions are private', () => {
  const view = render(<PublicSpecialistProfileLayout {...props} reviewsVisible specialist={{ ...specialist, rating: 4.8, reviewCount: 2 }} />);
  expect(screen.getByText('4,8 · 2 opiniones')).toBeTruthy();
  expect(screen.getByLabelText('Ver opiniones')).toBeTruthy();
  view.rerender(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, rating: 4.8, reviewCount: 2 }} />);
  expect(screen.queryByText('4,8 · 2 opiniones')).toBeNull();
  expect(screen.queryByText('Aún sin reseñas')).toBeNull();
});

it('does not label an unverified collegiate number as verified', () => {
  render(<PublicSpecialistProfileLayout {...props} specialist={{ ...specialist, collegiateNumber: 'M-45198' }} />);
  expect(screen.getByText('Col. M-45198')).toBeTruthy();
  expect(screen.queryByLabelText('Ver información de verificación')).toBeNull();
});

it('preserves an open package flow when resizing across the desktop breakpoint', () => {
  const native = require('react-native');
  const dimensions = jest.spyOn(native, 'useWindowDimensions').mockReturnValue({ width: 1366, height: 768, scale: 1, fontScale: 1 });
  function PackageFlow({ onVisibility }: { onVisibility: (visible: boolean) => void }) {
    const [open, setOpen] = React.useState(false);
    return <Pressable onPress={() => { setOpen(!open); onVisibility(!open); }}><Text>{open ? 'Borrador del bono abierto' : 'Abrir bono'}</Text></Pressable>;
  }
  try {
    const renderPackageAction = (onVisibility: (visible: boolean) => void) => <PackageFlow onVisibility={onVisibility} />;
    const view = render(<PublicSpecialistProfileLayout {...props} renderPackageAction={renderPackageAction} />);
    fireEvent.press(screen.getByText('Abrir bono'));
    dimensions.mockReturnValue({ width: 390, height: 844, scale: 1, fontScale: 1 });
    view.rerender(<PublicSpecialistProfileLayout {...props} renderPackageAction={renderPackageAction} />);
    expect(screen.getByText('Borrador del bono abierto')).toBeTruthy();
    expect(screen.queryByTestId('public-profile-booking-bar')).toBeNull();
    fireEvent.press(screen.getByText('Borrador del bono abierto'));
    expect(screen.getByText('Abrir bono')).toBeTruthy();
    expect(screen.getByTestId('public-profile-booking-bar')).toBeTruthy();
    view.unmount();
  } finally { dimensions.mockRestore(); }
});
