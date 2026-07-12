import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Button } from '../../../components/common/Button';
import { PublicSpecialistCard } from '../../../components/features/PublicSpecialistCard';
import {
  getFeaturedSpecialists,
  type PublicSpecialistCard as PublicSpecialistCardData,
} from '../../../services/specialistsService';

interface FeaturedSpecialistsSectionProps {
  onOpenSpecialist: (specialistId: string) => void;
  onViewAll: () => void;
}

export const FeaturedSpecialistsSection: React.FC<FeaturedSpecialistsSectionProps> = ({
  onOpenSpecialist,
  onViewAll,
}) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const [specialists, setSpecialists] = useState<PublicSpecialistCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadSpecialists = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      setSpecialists(await getFeaturedSpecialists());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSpecialists();
  }, [loadSpecialists]);

  const cardStyle = useMemo(() => {
    if (isDesktop) return styles.desktopCard;
    if (isTablet) return styles.tabletCard;
    return styles.mobileCard;
  }, [isDesktop, isTablet]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.bg : theme.surfaceWarm }]}>
      <View style={styles.content}>
        <MotionView entering="fadeInUp" style={styles.heading}>
          <View style={[styles.eyebrowPill, { backgroundColor: theme.primaryAlpha12, borderColor: theme.primaryAlpha20 }]}>
            <Ionicons name="heart-outline" size={13} color={theme.primary} />
            <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>PARA QUIENES BUSCAN TERAPIA</Text>
          </View>
          <Text style={[styles.title, isDesktop && styles.titleDesktop, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Encuentra un profesional con el que empezar</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Conoce perfiles profesionales verificados y da el siguiente paso a tu ritmo, sin crear una cuenta antes.</Text>
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
            <Button variant="outline" size="small" onPress={() => void loadSpecialists()}>Reintentar</Button>
          </View>
        ) : specialists.length === 0 ? (
          <View style={[styles.statusCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Ionicons name="people-outline" size={24} color={theme.textMuted} />
            <Text style={[styles.statusTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Estamos incorporando nuevos perfiles públicos</Text>
          </View>
        ) : (
          <ScrollView
            horizontal={!isDesktop}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.cards, isDesktop && styles.cardsDesktop]}
            style={styles.cardsScroller}
          >
            {specialists.map((specialist, index) => (
              <MotionView
                key={specialist.id}
                entering="fadeInUp"
                delay={90 + index * 70}
                style={cardStyle}
              >
                <PublicSpecialistCard
                  specialist={specialist}
                  variant="featured"
                  onPress={() => onOpenSpecialist(specialist.id)}
                />
              </MotionView>
            ))}
          </ScrollView>
        )}

        <MotionView entering="fadeInUp" delay={210} style={styles.ctaWrap}>
          <Button
            variant="primary"
            size="large"
            onPress={onViewAll}
            icon={<Ionicons name="arrow-forward" size={18} color={theme.actionPrimaryText} />}
            iconPosition="right"
          >
            Ver todos los especialistas
          </Button>
        </MotionView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 76,
  },
  content: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
  },
  heading: {
    alignItems: 'center',
    marginBottom: 38,
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
    fontSize: 48,
    lineHeight: 56,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 650,
    textAlign: 'center',
    marginTop: 14,
  },
  cardsScroller: {
    overflow: 'visible',
  },
  cards: {
    gap: 14,
    paddingHorizontal: 2,
  },
  cardsDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 16,
  },
  desktopCard: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: 220,
  },
  tabletCard: {
    width: 208,
  },
  mobileCard: {
    width: 208,
  },
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
    borderRadius: 18,
  },
  statusCard: {
    minHeight: 176,
    borderWidth: 1,
    borderRadius: 18,
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
  },
});

export default FeaturedSpecialistsSection;
