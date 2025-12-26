/**
 * TestimonialsSection Component
 *
 * Build trust through user stories with 3 testimonial cards.
 * Horizontal scroll on mobile, grid on desktop.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, shadows } from '../../../constants/colors';

interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  location: string;
  rating: number;
  avatarColor: string;
  avatarInitials: string;
  isProfessional?: boolean;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    quote: 'Encontrar ayuda profesional nunca fue tan fácil. El proceso fue sencillo y mi psicóloga es excelente. Después de 3 meses, mi ansiedad ha mejorado mucho.',
    name: 'María G.',
    role: 'Cliente',
    location: 'Madrid',
    rating: 5,
    avatarColor: heraLanding.primary,
    avatarInitials: 'MG',
  },
  {
    id: '2',
    quote: 'Como profesional, HERA me permite gestionar mi consulta de forma flexible y llegar a más pacientes. La plataforma es intuitiva y el soporte excepcional.',
    name: 'Dr. Carlos M.',
    role: 'Especialista en Salud Mental',
    location: 'Barcelona',
    rating: 5,
    avatarColor: heraLanding.secondary,
    avatarInitials: 'CM',
    isProfessional: true,
  },
  {
    id: '3',
    quote: 'La videollamada funciona perfecta. Me siento cómoda haciendo terapia desde casa. Poder elegir entre online y presencial es un plus enorme.',
    name: 'Ana R.',
    role: 'Cliente',
    location: 'Valencia',
    rating: 5,
    avatarColor: heraLanding.success,
    avatarInitials: 'AR',
  },
];

export const TestimonialsSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const scrollRef = useRef<ScrollView>(null);

  const renderStars = (rating: number) => {
    return (
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={star <= rating ? '#FFB800' : heraLanding.textMuted}
          />
        ))}
      </View>
    );
  };

  const renderCard = (testimonial: Testimonial, index: number) => (
    <View
      key={testimonial.id}
      style={[
        styles.card,
        isDesktop && styles.cardDesktop,
        isTablet && styles.cardTablet,
        !isDesktop && !isTablet && styles.cardMobile,
      ]}
    >
      {/* Quote Icon */}
      <View style={styles.quoteIconContainer}>
        <Ionicons name="chatbubble-ellipses" size={24} color={heraLanding.primaryMuted} />
      </View>

      {/* Quote Text */}
      <Text style={styles.quote}>"{testimonial.quote}"</Text>

      {/* Rating */}
      {renderStars(testimonial.rating)}

      {/* Author */}
      <View style={styles.author}>
        <View style={[styles.avatar, { backgroundColor: testimonial.avatarColor }]}>
          <Text style={styles.avatarText}>{testimonial.avatarInitials}</Text>
        </View>
        <View style={styles.authorInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{testimonial.name}</Text>
            {testimonial.isProfessional && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={heraLanding.secondary} />
              </View>
            )}
          </View>
          <Text style={styles.role}>
            {testimonial.role} · {testimonial.location}
          </Text>
        </View>
      </View>

      {/* Left accent border */}
      <View style={[styles.accentBorder, { backgroundColor: testimonial.avatarColor }]} />
    </View>
  );

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={styles.content}>
        {/* Section Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, isDesktop && styles.headerTitleDesktop]}>
            La confianza de quienes ya dieron el paso
          </Text>
          <Text style={styles.headerSubtitle}>
            Miles de personas cuidan su bienestar con HERA
          </Text>
        </View>

        {/* Testimonials */}
        {isDesktop || isTablet ? (
          <View style={[
            styles.grid,
            isDesktop && styles.gridDesktop,
            isTablet && styles.gridTablet,
          ]}>
            {testimonials.map((t, i) => renderCard(t, i))}
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            snapToInterval={300}
            decelerationRate="fast"
          >
            {testimonials.map((t, i) => renderCard(t, i))}
          </ScrollView>
        )}

        {/* Scroll indicator (mobile) */}
        {!isDesktop && !isTablet && (
          <View style={styles.scrollIndicator}>
            {testimonials.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === 0 && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.background,
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

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: heraLanding.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  headerTitleDesktop: {
    fontSize: 40,
  },
  headerSubtitle: {
    fontSize: 17,
    color: heraLanding.textSecondary,
    textAlign: 'center',
  },

  // Grid
  grid: {
    gap: 24,
  },
  gridDesktop: {
    flexDirection: 'row',
  },
  gridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  // Scroll
  scrollContent: {
    paddingRight: 20,
    gap: 16,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.md,
  },
  cardDesktop: {
    flex: 1,
  },
  cardTablet: {
    width: '48%',
    marginBottom: 16,
  },
  cardMobile: {
    width: 280,
  },

  // Quote icon
  quoteIconContainer: {
    marginBottom: 16,
  },

  // Quote
  quote: {
    fontSize: 15,
    color: heraLanding.textPrimary,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 16,
  },

  // Stars
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 20,
  },

  // Author
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  authorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: heraLanding.textPrimary,
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  role: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    marginTop: 2,
  },

  // Accent border
  accentBorder: {
    position: 'absolute',
    left: 0,
    top: 20,
    bottom: 20,
    width: 4,
    borderRadius: 2,
  },

  // Scroll indicator
  scrollIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: heraLanding.border,
  },
  dotActive: {
    backgroundColor: heraLanding.primary,
    width: 24,
  },
});
