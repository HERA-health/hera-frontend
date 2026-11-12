import { landingEditorial } from '../../../seo/publicContent';
import { directoryEntryHref } from '../../../services/directoryBookingService';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { MotionView } from '../../../components/common/MotionView';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { Button } from '../../../components/common/Button';
import { getErrorMessage } from '../../../constants/errors';
import { PublicSpecialistCard } from '../../../components/features/PublicSpecialistCard';
import {
  getFeaturedSpecialists,
  type PublicSpecialistCard as PublicSpecialistCardData,
} from '../../../services/specialistsService';

interface FeaturedSpecialistsSectionProps {
  onOpenSpecialist: (profileRef: string) => void;
  onViewAll: () => void;
  onQuestionnaire: () => void;
}

export const FeaturedSpecialistsSection: React.FC<FeaturedSpecialistsSectionProps> = ({
  onOpenSpecialist,
  onViewAll,
  onQuestionnaire,
}) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const carousel = useRef<ScrollView>(null);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const [specialists, setSpecialists] = useState<PublicSpecialistCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSpecialists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSpecialists(await getFeaturedSpecialists());
    } catch (cause: unknown) {
      setError(getErrorMessage(cause, 'Inténtalo de nuevo en unos segundos.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSpecialists();
  }, [loadSpecialists]);

  const cardWidth = isDesktop ? 232 : 220;
  const cardStyle = { width: cardWidth };
  const maxScroll = Math.max(0, specialists.length * (cardWidth + 16) - 16 + 4 - carouselWidth);
  const scrollCards = (direction: -1 | 1) => {
    carousel.current?.scrollTo({ x: Math.max(0, Math.min(maxScroll, scrollX + direction * (cardWidth + 16))), animated: true });
  };

  const specialistCards = specialists.map((specialist, index) => (
    <MotionView
      key={specialist.id}
      entering="fadeIn"
      delay={90 + index * 70}
      style={cardStyle}
    >
      <PublicSpecialistCard
        specialist={specialist}
        variant="featured"
        style={styles.profileCard}
        href={directoryEntryHref(specialist.publicSlug ?? specialist.id)}
        onPress={() => onOpenSpecialist(specialist.publicSlug ?? specialist.id)}
      />
    </MotionView>
  ));

  return (
    <View style={[styles.container, { backgroundColor: theme.landingCanvas }]}>
      <View style={styles.content}>
        <MotionView entering="fadeIn" style={styles.heading}>
          <View style={[styles.eyebrowPill, { backgroundColor: theme.primaryAlpha12, borderColor: theme.primaryAlpha20 }]}>
            <Ionicons name="heart-outline" size={13} color={theme.primary} />
            <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>PARA QUIENES BUSCAN TERAPIA</Text>
          </View>
          <Text accessibilityRole="header" aria-level={2} style={[styles.title, isDesktop && styles.titleDesktop, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>{landingEditorial.profilesHeading}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{landingEditorial.profilesIntroduction}</Text>
        </MotionView>

        {loading ? (
          <View style={[styles.skeletonRow, isDesktop && styles.skeletonRowDesktop]}>
            {Array.from({ length: 5 }, (_, index) => (
              <View
                key={index}
                style={[styles.skeletonCard, cardStyle, { backgroundColor: isDark ? theme.bgMuted : theme.bgCard, borderColor: theme.border }]}
              />
            ))}
          </View>
        ) : error ? (
          <View style={[styles.statusCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Ionicons name="cloud-offline-outline" size={24} color={theme.textMuted} />
            <Text style={[styles.statusTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>No hemos podido cargar los perfiles ahora</Text>
            <Text accessibilityRole="alert" style={{ color: theme.textSecondary, fontFamily: theme.fontSans, textAlign: 'center' }}>{error}</Text>
            <Button variant="outline" size="small" onPress={() => void loadSpecialists()}>Reintentar</Button>
          </View>
        ) : specialists.length === 0 ? (
          <View style={[styles.statusCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Ionicons name="people-outline" size={24} color={theme.textMuted} />
            <Text style={[styles.statusTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Estamos incorporando nuevos perfiles públicos</Text>
          </View>
        ) : (
          <ScrollView
            ref={carousel}
            horizontal
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            onLayout={event => setCarouselWidth(event.nativeEvent.layout.width)}
            onScroll={event => setScrollX(event.nativeEvent.contentOffset.x)}
            scrollEventThrottle={100}
            snapToInterval={cardWidth + 16}
            decelerationRate="fast"
            contentContainerStyle={styles.cards}
          >
            {specialistCards}
          </ScrollView>
        )}

        {!loading && !error && maxScroll > 1 && carouselWidth > 0 && (
          <View style={styles.carouselControls}>
            <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12 }}>Más perfiles</Text>
            {([-1, 1] as const).map(direction => (
              <AnimatedPressable
                key={direction}
                accessibilityLabel={direction === -1 ? 'Ver perfiles anteriores' : 'Ver perfiles siguientes'}
                disabled={direction === -1 ? scrollX <= 1 : scrollX >= maxScroll - 1}
                onPress={() => scrollCards(direction)}
                style={[styles.carouselButton, { borderColor: theme.border, backgroundColor: theme.bgCard }]}
              >
                <Ionicons name={direction === -1 ? 'arrow-back' : 'arrow-forward'} size={18} color={theme.primary} />
              </AnimatedPressable>
            ))}
          </View>
        )}

        <MotionView entering="fadeIn" delay={210} style={{ ...styles.ctaWrap, ...(width < 600 ? styles.ctaMobile : {}) }}>
          <Button
            variant="primary"
            size="large"
            style={styles.primaryAction}
            onPress={onViewAll}
            fullWidth={width < 600}
            icon={<Ionicons name="arrow-forward" size={18} color={theme.actionPrimaryText} />}
            iconPosition="right"
          >
            Explorar el directorio
          </Button>
          <AnimatedPressable
            onPress={onQuestionnaire}
            href="/cuestionario"
            accessibilityRole="link"
            accessibilityLabel="Hacer el cuestionario"
            hoverLift={false}
            style={[styles.questionnaireAction, { backgroundColor: theme.primaryMuted, borderColor: theme.primaryMuted }, width < 600 && styles.ctaMobile]}
          >
            <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: 16 }}>Hacer el cuestionario</Text>
            <Ionicons name="arrow-forward" size={18} color={theme.primary} />
          </AnimatedPressable>
        </MotionView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    borderRadius: 16,
  },
  primaryAction: {
    minHeight: 52,
    borderRadius: 8,
    shadowOpacity: 0,
    elevation: 0,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 76,
  },
  content: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
  },
  heading: {
    alignItems: 'center',
    marginBottom: 40,
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 34,
    lineHeight: 41,
    maxWidth: 780,
    textAlign: 'center',
  },
  titleDesktop: {
    fontSize: 44,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 650,
    textAlign: 'center',
    marginTop: 14,
  },
  cards: {
    gap: 16,
    paddingHorizontal: 2,
    paddingVertical: 4,
    flexGrow: 1,
    justifyContent: 'center',
  },
  carouselControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  carouselButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  skeletonRow: {
    flexDirection: 'row',
    gap: 14,
    overflow: 'hidden',
  },
  skeletonRowDesktop: {
    gap: 16,
  },
  skeletonCard: {
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 12,
  },
  statusCard: {
    minHeight: 176,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  statusTitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  ctaWrap: {
    alignSelf: 'center',
    marginTop: 36,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  ctaMobile: { width: '100%' },
  questionnaireAction: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

export default FeaturedSpecialistsSection;
