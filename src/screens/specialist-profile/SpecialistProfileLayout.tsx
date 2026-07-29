import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { AnimatedPressable } from '../../components/common';
import { spacing } from '../../constants/colors';
import { getGradientColors } from '../../constants/gradients';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useSpecialistProfileActions } from './useSpecialistProfileActions';
import type { CertificateItem, Review, SelectedProfileSlot, Specialist } from './types';
import { BookingSidebarEditorial } from './components/BookingSidebarEditorial';
import { ExperienceSection } from './components/ExperienceSection';
import { PhotoGallerySection } from './components/PhotoGallerySection';
import { ProfileHeroEditorial } from './components/ProfileHeroEditorial';
import { ReviewsSection } from './components/ReviewsSection';
import { SpecializationsGrid } from './components/SpecializationsGrid';
import { StickyBookingBarEditorial } from './components/StickyBookingBarEditorial';
import { VideoSection } from './components/VideoSection';

interface SpecialistProfileLayoutProps {
  specialist: Specialist;
  reviews: Review[];
  affinity?: number;
  reviewsVisible?: boolean;
  canBook: boolean;
  isAuthenticated: boolean;
  isClient: boolean;
  onBrowseSpecialists: () => void;
  onBookSession: (selectedSlot?: SelectedProfileSlot) => void;
  onOpenCertificate: (certificate: CertificateItem) => void;
  onReviewSubmitted: () => void;
}

interface CtaLayout {
  y: number;
  height: number;
}

interface SlotSelectionState {
  specialistId: string;
  value: SelectedProfileSlot | null;
}

export const SpecialistProfileLayout: React.FC<SpecialistProfileLayoutProps> = ({
  specialist,
  reviews,
  affinity,
  reviewsVisible = true,
  canBook,
  isAuthenticated,
  isClient,
  onBrowseSpecialists,
  onBookSession,
  onOpenCertificate,
  onReviewSubmitted,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const scrollRef = useRef<ScrollView>(null);
  const [slotSelection, setSlotSelection] = useState<SlotSelectionState>({
    specialistId: specialist.id,
    value: null,
  });
  const [mainTop, setMainTop] = useState(0);
  const [reviewsTop, setReviewsTop] = useState(0);
  const [bookingTop, setBookingTop] = useState(0);
  const [ctaLayout, setCtaLayout] = useState<CtaLayout>({ y: 0, height: 0 });
  const [showStickyBar, setShowStickyBar] = useState(false);
  const wide = width >= 1200;
  const mobile = width < 768;
  const gradientColors = getGradientColors(specialist.gradientId);
  const favoriteEnabled = isAuthenticated && isClient;
  const {
    isFavorite,
    favoriteLoading,
    shareProfile,
    toggleFavorite,
  } = useSpecialistProfileActions({ specialist, favoriteEnabled });

  const selectedSlot = slotSelection.specialistId === specialist.id
    ? slotSelection.value
    : null;
  const handleSlotChange = useCallback((value: SelectedProfileSlot | null) => {
    setSlotSelection({ specialistId: specialist.id, value });
  }, [specialist.id]);

  const handleScrollToReviews = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, mainTop + reviewsTop - 24), animated: true });
  }, [mainTop, reviewsTop]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!mobile) {
      if (showStickyBar) setShowStickyBar(false);
      return;
    }
    const ctaBottom = bookingTop + ctaLayout.y + ctaLayout.height;
    setShowStickyBar(ctaBottom > 0 && event.nativeEvent.contentOffset.y > ctaBottom);
  }, [bookingTop, ctaLayout.height, ctaLayout.y, mobile, showStickyBar]);

  const booking = (
    <BookingSidebarEditorial
      specialist={specialist}
      selectedSlot={selectedSlot}
      onSlotChange={handleSlotChange}
      onBookPress={() => onBookSession(selectedSlot ?? undefined)}
      canBook={canBook}
      onCtaLayout={(y, height) => setCtaLayout({ y, height })}
    />
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, mobile && styles.scrollContentMobile]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >
        <View style={[styles.navigation, mobile && styles.navigationMobile]}>
          <AnimatedPressable
            accessibilityRole="link"
            accessibilityLabel="Ver todos los especialistas"
            hoverLift={false}
            pressScale={0.98}
            onPress={onBrowseSpecialists}
            style={styles.browseLink}
          >
            <Ionicons name="arrow-back" size={17} color={theme.primary} />
            <Text style={styles.browseText}>Todos los especialistas</Text>
          </AnimatedPressable>
          {affinity != null && affinity > 0 ? (
            <View style={styles.affinityBadge}>
              <Ionicons name="sparkles-outline" size={14} color={theme.secondaryDark} />
              <Text style={styles.affinityText}>{affinity}% de afinidad</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.columns, !wide && styles.columnsStacked]}>
          <View
            onLayout={(event) => setMainTop(event.nativeEvent.layout.y)}
            style={[styles.mainColumn, !wide && styles.mainColumnStacked]}
          >
            <ProfileHeroEditorial
              specialist={specialist}
              affinity={affinity}
              onBookPress={() => onBookSession(selectedSlot ?? undefined)}
              onRatingPress={handleScrollToReviews}
              gradientColors={gradientColors}
              onSharePress={() => void shareProfile()}
              bio={specialist.bio}
              therapeuticApproach={specialist.therapeuticApproach}
              isFavorite={isFavorite}
              favoriteLoading={favoriteLoading}
              onFavoritePress={() => void toggleFavorite()}
              showFavoriteAction={favoriteEnabled}
            />

            {!wide ? (
              <View
                onLayout={(event) => setBookingTop(mainTop + event.nativeEvent.layout.y)}
                style={styles.section}
              >
                {booking}
              </View>
            ) : null}

            {specialist.presentationVideoUrl ? (
              <View style={styles.section}>
                <VideoSection
                  presentationVideoUrl={specialist.presentationVideoUrl}
                  specialistName={specialist.name}
                  gradientColors={gradientColors}
                />
              </View>
            ) : null}

            {specialist.specializations.length > 0 ? (
              <View style={styles.section}>
                <SpecializationsGrid
                  specializations={specialist.specializations}
                  specializationsDetail={specialist.specializationsDetail}
                />
              </View>
            ) : null}

            {reviewsVisible ? (
              <View
                onLayout={(event) => setReviewsTop(event.nativeEvent.layout.y)}
                style={styles.section}
              >
                <ReviewsSection
                  specialistId={specialist.id}
                  specialistName={specialist.name}
                  specialistAvatar={specialist.avatar}
                  reviews={reviews}
                  rating={specialist.rating}
                  reviewCount={specialist.reviewCount}
                  isAuthenticated={isAuthenticated}
                  isClient={isClient}
                  onReviewSubmitted={onReviewSubmitted}
                />
              </View>
            ) : null}

            <View style={styles.section}>
              <ExperienceSection
                education={specialist.education}
                experience={specialist.experience}
                certifications={specialist.certifications}
                collegiateNumber={specialist.collegiateNumber}
                experienceYears={specialist.experienceYears}
                onOpenCertificate={onOpenCertificate}
              />
            </View>

            {!wide && specialist.photoGallery && specialist.photoGallery.length > 0 ? (
              <View style={styles.section}>
                <PhotoGallerySection
                  photoGallery={specialist.photoGallery}
                  specialistName={specialist.name}
                />
              </View>
            ) : null}
          </View>

          {wide ? (
            <View
              onLayout={(event) => setBookingTop(event.nativeEvent.layout.y)}
              style={styles.bookingColumn}
            >
              {booking}
              {specialist.photoGallery && specialist.photoGallery.length > 0 ? (
                <View style={styles.sidebarGallery}>
                  <PhotoGallerySection
                    photoGallery={specialist.photoGallery}
                    specialistName={specialist.name}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {mobile ? (
        <StickyBookingBarEditorial
          specialistName={specialist.name}
          pricePerSession={specialist.pricePerSession}
          firstVisitFree={specialist.firstVisitFree}
          selectedSlot={selectedSlot}
          onBookPress={() => onBookSession(selectedSlot ?? undefined)}
          visible={showStickyBar}
          canBook={canBook}
        />
      ) : null}
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: isDark ? theme.bg : theme.bgMuted },
  scroll: { flex: 1 },
  scrollContent: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 80,
  },
  scrollContentMobile: { paddingHorizontal: spacing.md, paddingBottom: 112 },
  navigation: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  navigationMobile: { alignItems: 'flex-start' },
  browseLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  browseText: { fontSize: 13, fontFamily: theme.fontSansSemiBold, color: theme.primary },
  affinityBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    backgroundColor: theme.secondaryAlpha12,
  },
  affinityText: { fontSize: 11, fontFamily: theme.fontSansSemiBold, color: theme.secondaryDark },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  columnsStacked: { flexDirection: 'column', alignItems: 'center' },
  mainColumn: { flex: 1, minWidth: 0 },
  mainColumnStacked: { width: '100%', maxWidth: 900 },
  bookingColumn: { width: 380, alignSelf: 'flex-start' },
  sidebarGallery: { marginTop: spacing.md },
  section: { marginTop: spacing.xl },
});

export default SpecialistProfileLayout;
