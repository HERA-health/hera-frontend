import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Button } from '../../../components/common/Button';
import { useSpecialistProfileActions } from '../useSpecialistProfileActions';
import type { CertificateItem, Review, SelectedProfileSlot, Specialist } from '../types';
import { ExperienceSection } from '../components/ExperienceSection';
import { ReviewsSection } from '../components/ReviewsSection';
import { PhotoGallerySection } from '../components/PhotoGallerySection';
import { VideoSection } from '../components/VideoSection';
import { getGradientColors } from '../../../constants/gradients';
import { PublicProfileHero } from './PublicProfileHero';
import { PublicProfileLocation, PublicProfilePractice } from './PublicProfileSections';
import { PublicBookingSummary } from './PublicBookingSummary';
import { SelectableAvailabilityPreview } from '../components/SelectableAvailabilityPreview';
import { PublicProfileServices } from './PublicProfileServices';
import { ProfileBookingAside } from './ProfileBookingAside';
import { publicProfilePrice } from './publicProfilePresentation';
import { useProfileObstruction } from './useProfileObstruction';

interface Props {
  specialist: Specialist;
  reviews: Review[];
  reviewsVisible: boolean;
  canBook: boolean;
  isAuthenticated: boolean;
  isClient: boolean;
  initialOptionId?: string;
  renderPackageAction?: (onVisibilityChange: (visible: boolean) => void) => React.ReactNode;
  notice?: React.ReactNode;
  onBrowseSpecialists: () => void;
  onBookSession: (slot?: SelectedProfileSlot, optionId?: string) => void;
  onOpenCertificate: (certificate: CertificateItem) => void;
  onReviewSubmitted: () => void;
  onScrollChange: (scrolled: boolean) => void;
}

export function PublicSpecialistProfileLayout(props: Props) {
  // A different public profile gets independent state; revalidation of the same one keeps its selection.
  return <ProfileContent key={props.specialist.id} {...props} />;
}

function ProfileContent({ specialist, reviews, reviewsVisible, canBook, isAuthenticated, isClient, initialOptionId, renderPackageAction, notice,
  onBrowseSpecialists, onBookSession, onOpenCertificate, onReviewSubmitted, onScrollChange }: Props) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [desktop, setDesktop] = useState(width >= 1200);
  const mobile = width < 768;
  const [optionId, setOptionId] = useState(initialOptionId);
  const option = specialist.publicOptions?.find(item => item.optionId === optionId) ?? specialist.publicOptions?.[0];
  const resolvedOptionId = option?.optionId;
  const [slotState, setSlotState] = useState<{ optionId?: string; slot: SelectedProfileSlot } | null>(null);
  const selectedSlot = slotState?.optionId === resolvedOptionId ? slotState?.slot ?? null : null;
  const [validatedOptionId, setValidatedOptionId] = useState<string | null>(null);
  const selectionValidated = validatedOptionId === (resolvedOptionId ?? 'default');
  const [availabilityNotice, setAvailabilityNotice] = useState('');
  const [packagesOpen, setPackagesOpen] = useState(false);
  // Moving the summary between columns remounts its package flow. Keep its host
  // stable while a catalog or acquisition dialog is open so no draft is lost.
  useEffect(() => { if (!packagesOpen) setDesktop(width >= 1200); }, [width, packagesOpen]);
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [columnsY, setColumnsY] = useState(0);
  const [summaryY, setSummaryY] = useState(0);
  const [cta, setCta] = useState({ y: 0, height: 0 });
  const [barHeight, setBarHeight] = useState(88);
  const obstructed = useProfileObstruction();
  const scrollRef = useRef<ScrollView>(null);
  const practiceY = useRef(0);
  const reviewsY = useRef(0);
  const actions = useSpecialistProfileActions({ specialist, favoriteEnabled: isAuthenticated && isClient });
  const handleSlotChange = useCallback((slot: SelectedProfileSlot | null) => {
    if (slot) setAvailabilityNotice('');
    setSlotState(slot ? { optionId: resolvedOptionId, slot } : null);
  }, [resolvedOptionId]);
  const handleOptionChange = useCallback((id: string) => {
    setOptionId(id);
    setSlotState(null);
    setValidatedOptionId(null);
    setAvailabilityNotice('');
  }, []);
  const handleValidationChange = useCallback((validated: boolean) => {
    setValidatedOptionId(validated ? resolvedOptionId ?? 'default' : null);
  }, [resolvedOptionId]);
  const handleInvalidated = useCallback(() => {
    setAvailabilityNotice('Ese horario ya no está disponible. Elige otra hora para continuar.');
  }, []);
  useEffect(() => { if (!canBook) { setSlotState(null); setValidatedOptionId(null); } }, [canBook]);
  useEffect(() => { setSlotState(current => current?.optionId === resolvedOptionId ? current : null); }, [resolvedOptionId]);
  const continueBooking = (slot?: SelectedProfileSlot) => {
    if (!canBook || (slot && !selectionValidated)) return;
    onBookSession(slot, resolvedOptionId);
  };
  const ctaTop = 78 + columnsY + summaryY + cta.y - scrollY;
  const ctaVisible = cta.height > 0 && ctaTop >= 78 && ctaTop + cta.height <= viewportHeight;
  const showBar = !desktop && canBook && !packagesOpen && !obstructed && !ctaVisible;
  const jumpTo = (y: number) => scrollRef.current?.scrollTo({ y: Math.max(0, 78 + columnsY + y - 96), animated: false });
  const section = styles.section;
  const hasPublishedReviews = reviewsVisible && specialist.reviewCount > 0 && reviews.length > 0;
  const reviewSection = reviewsVisible ? <View key="reviews" style={section} onLayout={event => { reviewsY.current = event.nativeEvent.layout.y; }}>
    <ReviewsSection editorial specialistId={specialist.id} specialistName={specialist.name} specialistAvatar={specialist.avatar}
      reviews={reviews} rating={specialist.rating} reviewCount={specialist.reviewCount} isAuthenticated={isAuthenticated} isClient={isClient} onReviewSubmitted={onReviewSubmitted} />
  </View> : null;
  const summary = <PublicBookingSummary specialist={specialist} option={option} selectedSlot={selectedSlot} canBook={canBook}
    packageAction={renderPackageAction?.(setPackagesOpen)}
    selectionValidated={selectionValidated}
    onContinue={() => continueBooking(selectedSlot ?? undefined)}
    onCtaLayout={(y, height) => setCta(current => current.y === y && current.height === height ? current : { y, height })} />;
  const bookingDetails = <>
    {canBook ? <View style={[styles.panel, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}>
      {availabilityNotice ? <Text accessibilityRole="alert" style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 13, lineHeight: 20 }}>{availabilityNotice}</Text> : null}
      <SelectableAvailabilityPreview key={resolvedOptionId ?? 'default'} compact revalidateOnFocus specialistId={specialist.id}
        optionId={resolvedOptionId} nextAvailable={specialist.nextAvailable} selectedSlot={selectedSlot}
        onSlotChange={handleSlotChange} onSelectionInvalidated={handleInvalidated} onValidationChange={handleValidationChange}
        timeZoneLabel="Hora peninsular española" onOpenFullCalendar={() => continueBooking()} />
    </View> : null}
    <PublicProfileServices options={specialist.publicOptions ?? []} selectedOptionId={resolvedOptionId} onSelect={handleOptionChange} />
  </>;
  const gallery = specialist.photoGallery?.length ? <PhotoGallerySection compact photoGallery={specialist.photoGallery} specialistName={specialist.name} /> : null;
  const location = specialist.offersInPerson && specialist.address ? <PublicProfileLocation specialist={specialist} /> : null;
  return <View style={styles.root}>
    <ScrollView ref={scrollRef} onLayout={event => setViewportHeight(event.nativeEvent.layout.height)}
      scrollEventThrottle={32} onScroll={event => { const y = event.nativeEvent.contentOffset.y; setScrollY(y); onScrollChange(y > 24); }}
      contentContainerStyle={[styles.scrollContent, { paddingHorizontal: mobile ? 20 : 32, paddingBottom: desktop ? 64 : barHeight + 32 }]}>
      <View style={styles.container}>
        {notice}
        <Pressable accessibilityRole="link" accessibilityLabel="Ver todos los especialistas" onPress={onBrowseSpecialists} style={styles.back}>
          <Ionicons name="arrow-back" size={17} color={theme.primary} /><Text style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 13 }}>Todos los especialistas</Text>
        </Pressable>
        <View onLayout={event => setColumnsY(event.nativeEvent.layout.y)} style={[styles.columns, desktop && styles.columnsDesktop]}>
          <View style={styles.main}>
            <PublicProfileHero specialist={specialist} reviewsVisible={reviewsVisible} onPractice={() => jumpTo(practiceY.current)}
              onReviews={() => jumpTo(reviewsY.current)} onShare={() => void actions.shareProfile()}
              onFavorite={() => void actions.toggleFavorite()} showFavorite={isAuthenticated && isClient}
              isFavorite={actions.isFavorite} favoriteLoading={actions.favoriteLoading} />
            {!desktop ? <View style={styles.inlineSummary} onLayout={event => setSummaryY(event.nativeEvent.layout.y)}>{summary}{bookingDetails}</View> : null}
            <PublicProfilePractice specialist={specialist} onLayout={y => { practiceY.current = y; }} />
            {specialist.presentationVideoUrl ? <View style={section}><VideoSection presentationVideoUrl={specialist.presentationVideoUrl} specialistName={specialist.name} gradientColors={getGradientColors(specialist.gradientId)} /></View> : null}
            {hasPublishedReviews ? reviewSection : null}
            {(specialist.education?.length || specialist.experience?.length || specialist.certifications?.length) ? <View style={section}>
              <ExperienceSection editorial education={specialist.education} experience={specialist.experience} certifications={specialist.certifications}
                onOpenCertificate={onOpenCertificate} />
            </View> : null}
            {!hasPublishedReviews ? reviewSection : null}
            {!desktop && gallery ? <View style={[section, styles.inlinePanel]}>{gallery}</View> : null}
            {!desktop && location ? <View style={[section, styles.inlinePanel]}>{location}</View> : null}
          </View>
          {desktop ? <ProfileBookingAside>
            {summary}
            {bookingDetails}
            {gallery}
            {location}
          </ProfileBookingAside> : null}
        </View>
      </View>
    </ScrollView>
    {showBar ? <SafeAreaView testID="public-profile-booking-bar" edges={['bottom']} onLayout={event => setBarHeight(event.nativeEvent.layout.height)}
      style={[styles.bar, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}>
      <View style={styles.barContent}>
        <View style={styles.barPrice}>
          <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: 20 }}>{publicProfilePrice(option ? option.priceCents / 100 : specialist.pricePerSession)}</Text>
          <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 18 }}>{option?.durationMinutes ? `${option.durationMinutes} min · por sesión` : 'por sesión'}</Text>
        </View>
        <Button disabled={Boolean(selectedSlot && !selectionValidated)} onPress={() => continueBooking(selectedSlot ?? undefined)} style={{ flex: 1, minWidth: 170, maxWidth: 260, paddingHorizontal: 12 }}
          textStyle={{ fontSize: 13 }}>Reservar</Button>
      </View>
    </SafeAreaView> : null}

  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingTop: 78 },
  container: { width: '100%', maxWidth: 1440, alignSelf: 'center' },
  back: { minHeight: 44, flexDirection: 'row', gap: 8, alignItems: 'center', alignSelf: 'flex-start', marginBottom: 8 },
  columns: { gap: 32 },
  columnsDesktop: { flexDirection: 'row', alignItems: 'stretch' },
  main: { flex: 1, minWidth: 0 },
  inlineSummary: { marginTop: 28, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  inlinePanel: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  section: { marginTop: 32 },
  panel: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1 },
  barContent: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 16 },
  barPrice: { flex: 1, minWidth: 0, gap: 4 },
});
