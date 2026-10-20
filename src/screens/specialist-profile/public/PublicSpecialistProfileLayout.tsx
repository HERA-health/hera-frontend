import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Button } from '../../../components/common/Button';
import type { AnimatedPressableHandle } from '../../../components/common/AnimatedPressable';
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
import { PublicAvailabilityDialog } from './PublicAvailabilityDialog';
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
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
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
  const summaryAction = useRef<AnimatedPressableHandle>(null);
  const barAction = useRef<AnimatedPressableHandle>(null);
  const opener = useRef<'summary' | 'bar'>('summary');
  const restoreOpenerFocus = useRef<(() => void) | undefined>(undefined);
  const actions = useSpecialistProfileActions({ specialist, favoriteEnabled: isAuthenticated && isClient });
  const handleSlotChange = useCallback((slot: SelectedProfileSlot | null) => {
    setSlotState(slot ? { optionId: resolvedOptionId, slot } : null);
  }, [resolvedOptionId]);
  const handleOptionChange = useCallback((id: string) => { setOptionId(id); setSlotState(null); }, []);
  useEffect(() => { if (!canBook) { setAvailabilityOpen(false); setSlotState(null); } }, [canBook]);
  useEffect(() => { setSlotState(current => current?.optionId === resolvedOptionId ? current : null); }, [resolvedOptionId]);
  const openAvailability = (source: 'summary' | 'bar', restoreFocus?: () => void) => {
    if (!canBook) return;
    opener.current = source;
    restoreOpenerFocus.current = restoreFocus;
    setAvailabilityOpen(true);
  };
  const closeAvailability = () => {
    setAvailabilityOpen(false);
    if (Platform.OS === 'web') setTimeout(() => {
      if (restoreOpenerFocus.current) restoreOpenerFocus.current();
      else (opener.current === 'bar' ? barAction : summaryAction).current?.focus();
    }, 100);
  };
  const continueBooking = (slot?: SelectedProfileSlot) => {
    setAvailabilityOpen(false);
    onBookSession(slot, resolvedOptionId);
  };
  const ctaTop = 94 + columnsY + summaryY + cta.y - scrollY;
  const ctaVisible = cta.height > 0 && ctaTop >= 78 && ctaTop + cta.height <= viewportHeight;
  const showBar = !desktop && canBook && !availabilityOpen && !packagesOpen && !obstructed && !ctaVisible;
  const jumpTo = (y: number) => scrollRef.current?.scrollTo({ y: Math.max(0, 94 + columnsY + y - 96), animated: false });
  const section = styles.section;
  const hasPublishedReviews = reviewsVisible && specialist.reviewCount > 0 && reviews.length > 0;
  const reviewSection = reviewsVisible ? <View key="reviews" style={section} onLayout={event => { reviewsY.current = event.nativeEvent.layout.y; }}>
    <ReviewsSection editorial specialistId={specialist.id} specialistName={specialist.name} specialistAvatar={specialist.avatar}
      reviews={reviews} rating={specialist.rating} reviewCount={specialist.reviewCount} isAuthenticated={isAuthenticated} isClient={isClient} onReviewSubmitted={onReviewSubmitted} />
  </View> : null;
  const summary = <PublicBookingSummary specialist={specialist} option={option} selectedSlot={selectedSlot} canBook={canBook}
    packageAction={renderPackageAction?.(setPackagesOpen)}
    actionRef={summaryAction} onOpen={restoreFocus => openAvailability('summary', restoreFocus)}
    onContinue={() => continueBooking(selectedSlot ?? undefined)}
    onCtaLayout={(y, height) => setCta(current => current.y === y && current.height === height ? current : { y, height })} />;
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
            {!desktop ? <View style={styles.inlineSummary} onLayout={event => setSummaryY(event.nativeEvent.layout.y)}>{summary}</View> : null}
            <PublicProfilePractice specialist={specialist} onLayout={y => { practiceY.current = y; }} />
            {!desktop && specialist.offersInPerson && specialist.address ? <View style={section}><PublicProfileLocation specialist={specialist} /></View> : null}
            {specialist.presentationVideoUrl ? <View style={section}><VideoSection presentationVideoUrl={specialist.presentationVideoUrl} specialistName={specialist.name} gradientColors={getGradientColors(specialist.gradientId)} /></View> : null}
            {hasPublishedReviews ? reviewSection : null}
            {(specialist.education?.length || specialist.experience?.length || specialist.certifications?.length) ? <View style={section}>
              <ExperienceSection editorial education={specialist.education} experience={specialist.experience} certifications={specialist.certifications}
                onOpenCertificate={onOpenCertificate} />
            </View> : null}
            {!hasPublishedReviews ? reviewSection : null}
            {specialist.photoGallery?.length ? <View style={section}><PhotoGallerySection editorial photoGallery={specialist.photoGallery} specialistName={specialist.name} /></View> : null}
          </View>
          {desktop ? <ProfileBookingAside>
            {summary}
            {specialist.offersInPerson && specialist.address ? <View style={{ marginTop: 28 }}><PublicProfileLocation specialist={specialist} /></View> : null}
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
        <Button focusRef={barAction} onPress={() => selectedSlot ? continueBooking(selectedSlot) : openAvailability('bar')} style={{ flex: 1, minWidth: 170, maxWidth: 260, paddingHorizontal: 12 }}
          textStyle={{ fontSize: 13 }}>{selectedSlot ? 'Continuar' : 'Ver disponibilidad'}</Button>
      </View>
    </SafeAreaView> : null}
    {availabilityOpen && canBook ? <PublicAvailabilityDialog specialist={specialist} option={option} selectedSlot={selectedSlot}
      onOptionChange={handleOptionChange} onSlotChange={handleSlotChange} onClose={closeAvailability} onContinue={continueBooking} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingTop: 94 },
  container: { width: '100%', maxWidth: 1440, alignSelf: 'center' },
  back: { minHeight: 44, flexDirection: 'row', gap: 8, alignItems: 'center', alignSelf: 'flex-start', marginBottom: 24 },
  columns: { gap: 32 },
  columnsDesktop: { flexDirection: 'row', alignItems: 'stretch' },
  main: { flex: 1, minWidth: 0 },
  inlineSummary: { marginTop: 28 },
  section: { marginTop: 32 },
  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1 },
  barContent: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 16 },
  barPrice: { flex: 1, minWidth: 0, gap: 4 },
});
