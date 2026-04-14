/**
 * TestimonialsSection - HERA Design System v5.0
 *
 * GlassCard testimonials with staggered MotionView entry.
 * Dark mode via useTheme().
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { GlassCard } from '../../../components/common/GlassCard';
import { MotionView } from '../../../components/common/MotionView';
import type { Theme } from '../../../constants/theme';

interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  location: string;
  rating: number;
  accentColor: (theme: Theme) => string;
  initials: string;
  isProfessional?: boolean;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    quote:
      'Encontrar ayuda profesional nunca fue tan fácil. El proceso fue sencillo y mi psicóloga es excelente. Después de 3 meses, mi ansiedad ha mejorado mucho.',
    name: 'María G.',
    role: 'Cliente',
    location: 'Madrid',
    rating: 5,
    accentColor: (theme) => theme.primary,
    initials: 'MG',
  },
  {
    id: '2',
    quote:
      'Como profesional, HERA me permite gestionar mi consulta de forma flexible y llegar a más pacientes. La plataforma es intuitiva y el soporte excepcional.',
    name: 'Dr. Carlos M.',
    role: 'Especialista en Salud Mental',
    location: 'Barcelona',
    rating: 5,
    accentColor: (theme) => theme.secondary,
    initials: 'CM',
    isProfessional: true,
  },
  {
    id: '3',
    quote:
      'La videollamada funciona perfecta. Me siento cómoda haciendo terapia desde casa. Poder elegir entre online y presencial es un plus enorme.',
    name: 'Ana R.',
    role: 'Cliente',
    location: 'Valencia',
    rating: 5,
    accentColor: (theme) => theme.success,
    initials: 'AR',
  },
];

export const TestimonialsSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const { theme } = useTheme();

  const renderCard = (testimonial: Testimonial, index: number) => {
    const accent = testimonial.accentColor(theme);

    return (
      <MotionView
        key={testimonial.id}
        entering="fadeInUp"
        delay={100 + index * 80}
        style={isDesktop || isTablet ? { flex: 1 } : undefined}
      >
        <GlassCard
          intensity={45}
          borderRadius={20}
          style={[
            styles.card,
            ...(isDesktop ? [styles.cardDesktop] : []),
            ...(!isDesktop && !isTablet ? [styles.cardMobile] : []),
          ]}
        >
          <View style={[styles.accentBar, { backgroundColor: accent }]} />

          <View style={[styles.quoteIconBg, { backgroundColor: accent + '18' }]}>
            <Ionicons name="chatbubble-ellipses" size={22} color={accent} />
          </View>

          <Text style={[styles.quote, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>
            "{testimonial.quote}"
          </Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= testimonial.rating ? 'star' : 'star-outline'}
                size={15}
                color={star <= testimonial.rating ? theme.starRating : theme.textMuted}
              />
            ))}
          </View>

          <View style={styles.author}>
            <View style={[styles.avatar, { backgroundColor: accent }]}>
              <Text style={[styles.avatarText, { fontFamily: theme.fontSansBold }]}>
                {testimonial.initials}
              </Text>
            </View>
            <View style={styles.authorInfo}>
              <View style={styles.nameRow}>
                <Text
                  style={[
                    styles.name,
                    { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
                  ]}
                >
                  {testimonial.name}
                </Text>
                {testimonial.isProfessional && (
                  <Ionicons name="checkmark-circle" size={15} color={theme.secondary} />
                )}
              </View>
              <Text style={[styles.role, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                {testimonial.role} · {testimonial.location}
              </Text>
            </View>
          </View>
        </GlassCard>
      </MotionView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }, isDesktop && styles.containerDesktop]}>
      <View style={styles.content}>
        <MotionView entering="fadeInUp" delay={0} style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>
            TESTIMONIOS
          </Text>
          <Text
            style={[
              styles.headerTitle,
              isDesktop && styles.headerTitleDesktop,
              { color: theme.textPrimary, fontFamily: theme.fontDisplay },
            ]}
          >
            La confianza de quienes ya dieron el paso
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
            Miles de personas cuidan su bienestar con HERA
          </Text>
        </MotionView>

        {isDesktop || isTablet ? (
          <View style={styles.grid}>{TESTIMONIALS.map((testimonial, index) => renderCard(testimonial, index))}</View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            snapToInterval={308}
            decelerationRate="fast"
          >
            {TESTIMONIALS.map((testimonial, index) => renderCard(testimonial, index))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingVertical: 100,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  headerTitleDesktop: {
    fontSize: 40,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'stretch',
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 16,
  },
  card: {
    padding: 28,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 250,
  },
  cardDesktop: {
    padding: 32,
  },
  cardMobile: {
    width: 290,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 20,
    bottom: 20,
    width: 3,
    borderRadius: 3,
  },
  quoteIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginLeft: 12,
  },
  quote: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
    fontStyle: 'italic',
    paddingLeft: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 20,
    paddingLeft: 12,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  authorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
  },
  role: {
    fontSize: 13,
  },
});
