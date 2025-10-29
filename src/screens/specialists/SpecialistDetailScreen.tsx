/**
 * SpecialistDetailScreen - COMPLETELY REDESIGNED
 * Stunning modern design with floating cards, gradients, and visual depth
 * Better than Base44 in every way
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GradientButton } from '../../components/common/GradientButton';
import { BrandText } from '../../components/common/BrandText';
import { colors, spacing, typography } from '../../constants/colors';
import { api } from '../../services/api';

// Types
interface SpecialistDetailScreenProps {
  route: any;
  navigation: any;
}

interface SpecialistDetail {
  id: string;
  name: string;
  avatar?: string;
  specialization: string;
  rating: number;
  reviewCount: number;
  experienceYears: number;
  description: string;
  therapeuticApproach: string;
  pricePerSession: number;
  firstVisitFree: boolean;
  isAvailable: boolean;
  languages: string[];
  format: 'online' | 'in-person' | 'hybrid';
  specialties: string[];
  availability: string[];
  clientsHelped: string;
  sessionsCompleted: string;
  reviews?: Review[];
  education?: EducationItem[];
}

interface Review {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  date: string;
}

interface EducationItem {
  id: string;
  title: string;
  institution: string;
  year: string;
  type: 'degree' | 'certificate';
}

// Main Component
export const SpecialistDetailScreen: React.FC<SpecialistDetailScreenProps> = ({
  route,
  navigation,
}) => {
  console.log('🔍 SpecialistDetailScreen MOUNTED');
  console.log('📦 Route params:', route?.params);

  const { specialistId, affinity } = route?.params || {};
  console.log('🆔 Specialist ID:', specialistId);
  console.log('💯 Affinity:', affinity);

  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  const [specialist, setSpecialist] = useState<SpecialistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'availability' | 'education'>('about');

  useEffect(() => {
    loadSpecialistDetails();
  }, [specialistId]);

  const loadSpecialistDetails = async () => {
    try {
      console.log('🔄 Loading specialist details for ID:', specialistId);
      setLoading(true);

      console.log('✅ Loading mock specialist data...');

      // Mock data for development
      const mockSpecialist: SpecialistDetail = {
        id: specialistId || 'mock-id',
        name: 'Dra. María González',
        avatar: undefined,
        specialization: 'Psicología Clínica · Especialista en Ansiedad y Depresión',
        rating: 4.9,
        reviewCount: 127,
        experienceYears: 12,
        description: 'Psicóloga clínica con más de 12 años de experiencia especializada en terapia cognitivo-conductual. Mi enfoque es empático, personalizado y basado en la evidencia científica más reciente.',
        therapeuticApproach: 'Utilizo principalmente la Terapia Cognitivo-Conductual (TCC) combinada con técnicas de mindfulness y terapia de aceptación y compromiso (ACT). Mi objetivo es ayudarte a desarrollar herramientas prácticas para manejar tus dificultades y mejorar tu bienestar emocional.',
        pricePerSession: 65,
        firstVisitFree: true,
        isAvailable: true,
        languages: ['Español', 'Inglés', 'Catalán'],
        format: 'hybrid',
        specialties: ['Ansiedad', 'Depresión', 'Estrés', 'Autoestima', 'Trauma', 'Relaciones'],
        availability: ['Lunes a Viernes: 9:00-20:00', 'Sábados: 10:00-14:00'],
        clientsHelped: '250',
        sessionsCompleted: '580',
        reviews: [
          {
            id: '1',
            clientName: 'Ana M.',
            rating: 5,
            comment: 'Excelente profesional. Me ha ayudado muchísimo con mi ansiedad. Muy recomendable.',
            date: 'Hace 2 semanas',
          },
          {
            id: '2',
            clientName: 'Carlos R.',
            rating: 5,
            comment: 'Gran empatía y profesionalidad. Las sesiones son muy útiles y prácticas.',
            date: 'Hace 1 mes',
          },
        ],
        education: [
          {
            id: '1',
            title: 'Licenciatura en Psicología',
            institution: 'Universidad Complutense de Madrid',
            year: '2008 - 2013',
            type: 'degree',
          },
          {
            id: '2',
            title: 'Máster en Terapia Cognitivo-Conductual',
            institution: 'UNED',
            year: '2013 - 2015',
            type: 'degree',
          },
          {
            id: '3',
            title: 'Certificación en Mindfulness-Based Cognitive Therapy',
            institution: 'Instituto Europeo de Mindfulness',
            year: '2018',
            type: 'certificate',
          },
        ],
      };

      console.log('✅ Mock specialist loaded:', mockSpecialist.name);
      setSpecialist(mockSpecialist);
    } catch (error) {
      console.error('❌ Error loading specialist:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil del especialista');
    } finally {
      setLoading(false);
      console.log('⏹️ Loading complete');
    }
  };

  const handleBookSession = () => {
    console.log('📅 Book session with specialist:', specialistId);
    Alert.alert('Reservar Sesión', 'Esta funcionalidad estará disponible próximamente');
  };

  const handleSendMessage = () => {
    console.log('💬 Send message to specialist:', specialistId);
    Alert.alert('Enviar Mensaje', 'Esta funcionalidad estará disponible próximamente');
  };

  const getTabLabel = (tab: string) => {
    const labels: Record<string, string> = {
      about: 'Sobre mí',
      reviews: `Reseñas (${specialist?.reviewCount || 0})`,
      availability: 'Disponibilidad',
      education: 'Formación',
    };
    return labels[tab] || tab;
  };

  if (loading) {
    console.log('⏳ Still loading...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!specialist) {
    console.log('❌ No specialist data');
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.feedback.error} />
        <Text style={styles.errorText}>No se pudo cargar el perfil</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('✅ Rendering specialist:', specialist.name);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.innerContainer, { maxWidth: isWideScreen ? 900 : '100%' }]}>
        {/* Hero Card with Floating Effect */}
        <View style={styles.heroCard}>
          {/* Gradient Background Decoration */}
          <LinearGradient
            colors={['rgba(33, 150, 243, 0.08)', 'rgba(0, 137, 123, 0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradientBg}
          />

          <View style={styles.heroContent}>
            {/* Avatar Section with Glow Effect */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarGlow}>
                <LinearGradient
                  colors={['#2196F3', '#00897B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarBorder}
                >
                  <View style={styles.avatarInner}>
                    {specialist.avatar ? (
                      <Image source={{ uri: specialist.avatar }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{specialist.name[0]}</Text>
                    )}
                  </View>
                </LinearGradient>
              </View>

              {/* Online Badge with Pulse Animation */}
              {specialist.isAvailable && (
                <View style={styles.onlineBadge}>
                  <View style={styles.pulseOuter} />
                  <View style={styles.pulseInner} />
                  <LinearGradient
                    colors={['#4CAF50', '#66BB6A']}
                    style={styles.onlineDot}
                  />
                </View>
              )}
            </View>

            {/* Info Section */}
            <View style={styles.heroInfo}>
              <Text style={styles.specialistName}>{specialist.name}</Text>
              <Text style={styles.specialistTitle}>{specialist.specialization}</Text>

              {/* Rating Row with Stars */}
              <View style={styles.ratingRow}>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= Math.round(specialist.rating) ? 'star' : 'star-outline'}
                      size={16}
                      color="#FFB300"
                    />
                  ))}
                </View>
                <Text style={styles.ratingText}>
                  {specialist.rating} ({specialist.reviewCount} reseñas)
                </Text>
              </View>

              {/* Experience Badge */}
              <View style={styles.experienceBadge}>
                <Ionicons name="briefcase" size={14} color="#666" />
                <Text style={styles.experienceText}>
                  {specialist.experienceYears} años de experiencia
                </Text>
              </View>
            </View>
          </View>

          {/* Affinity Badge - Floating on Top Right */}
          {affinity && (
            <View style={styles.affinityFloating}>
              <LinearGradient
                colors={['#2196F3', '#00897B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.affinityBadge}
              >
                <Ionicons name="analytics" size={16} color="#fff" />
                <Text style={styles.affinityText}>
                  {Math.round(affinity * 100)}%
                </Text>
              </LinearGradient>
              <Text style={styles.affinityLabel}>Match</Text>
            </View>
          )}
        </View>

        {/* Floating Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleBookSession}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#2196F3', '#00897B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryActionGradient}
            >
              <Ionicons name="calendar" size={22} color="#fff" />
              <Text style={styles.primaryActionText}>Reservar Sesión</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={handleSendMessage}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#2196F3" />
            <Text style={styles.secondaryActionText}>Mensaje</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Info Cards Grid */}
        <View style={styles.quickInfoGrid}>
          <View style={styles.infoCardModern}>
            <LinearGradient
              colors={['rgba(33, 150, 243, 0.1)', 'rgba(33, 150, 243, 0.05)']}
              style={styles.infoCardBg}
            />
            <View style={styles.infoIconContainer}>
              <Ionicons name="cash-outline" size={28} color="#2196F3" />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardValue}>€{specialist.pricePerSession}</Text>
              <Text style={styles.infoCardLabel}>por sesión</Text>
            </View>
          </View>

          <View style={styles.infoCardModern}>
            <LinearGradient
              colors={['rgba(0, 137, 123, 0.1)', 'rgba(0, 137, 123, 0.05)']}
              style={styles.infoCardBg}
            />
            <View style={styles.infoIconContainer}>
              <Ionicons name="time-outline" size={28} color="#00897B" />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardValue}>50-60 min</Text>
              <Text style={styles.infoCardLabel}>duración</Text>
            </View>
          </View>

          <View style={styles.infoCardModern}>
            <LinearGradient
              colors={['rgba(76, 175, 80, 0.1)', 'rgba(76, 175, 80, 0.05)']}
              style={styles.infoCardBg}
            />
            <View style={styles.infoIconContainer}>
              <Ionicons name="flash-outline" size={28} color="#4CAF50" />
            </View>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardValue}>~2h</Text>
              <Text style={styles.infoCardLabel}>respuesta</Text>
            </View>
          </View>
        </View>

        {/* First Visit Free Banner */}
        {specialist.firstVisitFree && (
          <TouchableOpacity style={styles.promoCard} activeOpacity={0.9}>
            <LinearGradient
              colors={['#4CAF50', '#66BB6A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.promoBg}
            >
              <View style={styles.promoIcon}>
                <Ionicons name="gift" size={32} color="#fff" />
              </View>
              <View style={styles.promoContent}>
                <Text style={styles.promoTitle}>Primera Visita Gratis</Text>
                <Text style={styles.promoSubtitle}>
                  30 minutos sin costo para conocernos
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Specialties Pills */}
        <View style={styles.specialtiesContainer}>
          <Text style={styles.sectionTitle}>Especialidades</Text>
          <View style={styles.specialtiesPills}>
            {specialist.specialties?.map((specialty, index) => (
              <View key={index} style={styles.specialtyPill}>
                <LinearGradient
                  colors={['rgba(33, 150, 243, 0.15)', 'rgba(0, 137, 123, 0.15)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.specialtyPillBg}
                >
                  <Text style={styles.specialtyPillText}>{specialty}</Text>
                </LinearGradient>
              </View>
            ))}
          </View>
        </View>

        {/* Stats Cards - Modern Design */}
        <View style={styles.statsGrid}>
          <View style={styles.statCardModern}>
            <LinearGradient
              colors={['#2196F3', '#00897B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statIconBg}
            >
              <Ionicons name="people" size={28} color="#fff" />
            </LinearGradient>
            <View style={styles.statCardInfo}>
              <Text style={styles.statCardValue}>{specialist.clientsHelped}+</Text>
              <Text style={styles.statCardLabel}>Clientes</Text>
            </View>
          </View>

          <View style={styles.statCardModern}>
            <LinearGradient
              colors={['#4CAF50', '#66BB6A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statIconBg}
            >
              <Ionicons name="checkmark-circle" size={28} color="#fff" />
            </LinearGradient>
            <View style={styles.statCardInfo}>
              <Text style={styles.statCardValue}>{specialist.sessionsCompleted}+</Text>
              <Text style={styles.statCardLabel}>Sesiones</Text>
            </View>
          </View>

          <View style={styles.statCardModern}>
            <LinearGradient
              colors={['#FF9800', '#FFB74D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statIconBg}
            >
              <Ionicons name="trending-up" size={28} color="#fff" />
            </LinearGradient>
            <View style={styles.statCardInfo}>
              <Text style={styles.statCardValue}>98%</Text>
              <Text style={styles.statCardLabel}>Satisfacción</Text>
            </View>
          </View>
        </View>

        {/* Tabs - Modern Pill Style */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
            {(['about', 'reviews', 'availability', 'education'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={styles.tabButton}
              >
                {activeTab === tab ? (
                  <LinearGradient
                    colors={['#2196F3', '#00897B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tabActive}
                  >
                    <Text style={styles.tabActiveText}>
                      {getTabLabel(tab)}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabInactive}>
                    <Text style={styles.tabInactiveText}>
                      {getTabLabel(tab)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'about' && <AboutTab specialist={specialist} />}
          {activeTab === 'reviews' && <ReviewsTab specialist={specialist} />}
          {activeTab === 'availability' && <AvailabilityTab specialist={specialist} />}
          {activeTab === 'education' && <EducationTab specialist={specialist} />}
        </View>
      </View>
    </ScrollView>
  );
};

// Tab Components
const AboutTab: React.FC<{ specialist: SpecialistDetail }> = ({ specialist }) => (
  <View style={styles.aboutTab}>
    <View style={styles.contentCard}>
      <Text style={styles.aboutText}>{specialist.description}</Text>
    </View>

    <View style={styles.contentCard}>
      <Text style={styles.cardTitle}>Enfoque Terapéutico</Text>
      <Text style={styles.cardText}>{specialist.therapeuticApproach}</Text>
    </View>

    <View style={styles.contentCard}>
      <Text style={styles.cardTitle}>Idiomas</Text>
      <View style={styles.languagesList}>
        {specialist.languages.map((lang, i) => (
          <View key={i} style={styles.languageChip}>
            <Ionicons name="language" size={16} color="#2196F3" />
            <Text style={styles.languageText}>{lang}</Text>
          </View>
        ))}
      </View>
    </View>

    <View style={styles.contentCard}>
      <Text style={styles.cardTitle}>Formato de Sesión</Text>
      <View style={styles.formatsList}>
        {specialist.format === 'hybrid' && (
          <>
            <View style={styles.formatChip}>
              <Ionicons name="videocam" size={16} color="#2196F3" />
              <Text style={styles.formatText}>Online</Text>
            </View>
            <View style={styles.formatChip}>
              <Ionicons name="location" size={16} color="#2196F3" />
              <Text style={styles.formatText}>Presencial</Text>
            </View>
          </>
        )}
      </View>
    </View>
  </View>
);

const ReviewsTab: React.FC<{ specialist: SpecialistDetail }> = ({ specialist }) => (
  <View style={styles.reviewsTab}>
    {specialist.reviews && specialist.reviews.length > 0 ? (
      specialist.reviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewAvatar}>
              <Text style={styles.reviewAvatarText}>{review.clientName[0]}</Text>
            </View>
            <View style={styles.reviewInfo}>
              <Text style={styles.reviewName}>{review.clientName}</Text>
              <Text style={styles.reviewDate}>{review.date}</Text>
            </View>
            <View style={styles.reviewStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= review.rating ? 'star' : 'star-outline'}
                  size={14}
                  color="#FFB300"
                />
              ))}
            </View>
          </View>
          <Text style={styles.reviewText}>{review.comment}</Text>
        </View>
      ))
    ) : (
      <View style={styles.emptyState}>
        <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>Aún no hay reseñas</Text>
      </View>
    )}
  </View>
);

const AvailabilityTab: React.FC<{ specialist: SpecialistDetail }> = ({ specialist }) => (
  <View style={styles.availabilityTab}>
    <View style={styles.contentCard}>
      <Text style={styles.cardTitle}>Disponibilidad General</Text>
      {specialist.availability.map((slot, index) => (
        <View key={index} style={styles.availabilityItem}>
          <Ionicons name="time" size={20} color="#2196F3" />
          <Text style={styles.availabilityText}>{slot}</Text>
        </View>
      ))}
      <Text style={styles.availabilityNote}>
        Los horarios específicos se mostrarán al reservar una sesión
      </Text>
    </View>
  </View>
);

const EducationTab: React.FC<{ specialist: SpecialistDetail }> = ({ specialist }) => (
  <View style={styles.educationTab}>
    {specialist.education && specialist.education.length > 0 ? (
      specialist.education.map((item) => (
        <View key={item.id} style={styles.educationCard}>
          <LinearGradient
            colors={
              item.type === 'degree'
                ? ['#2196F3', '#00897B']
                : ['#FFB300', '#FF8F00']
            }
            style={styles.educationIcon}
          >
            <Ionicons
              name={item.type === 'degree' ? 'school' : 'ribbon'}
              size={24}
              color="#fff"
            />
          </LinearGradient>
          <View style={styles.educationInfo}>
            <Text style={styles.educationTitle}>{item.title}</Text>
            <Text style={styles.educationInstitution}>{item.institution}</Text>
            <Text style={styles.educationYear}>{item.year}</Text>
          </View>
        </View>
      ))
    ) : (
      <View style={styles.emptyState}>
        <Ionicons name="school-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>No hay información de formación disponible</Text>
      </View>
    )}
  </View>
);

// Styles - Complete Modern Redesign
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  innerContainer: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  backButtonContainer: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2196F3',
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },

  // Hero Card - Floating Effect
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginTop: 16,
    marginBottom: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
    overflow: 'hidden',
  },
  heroGradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Avatar with Glow
  avatarSection: {
    position: 'relative',
  },
  avatarGlow: {
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  avatarBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 4,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2196F3',
  },

  // Online Badge with Pulse
  onlineBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseOuter: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  pulseInner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Hero Info
  heroInfo: {
    flex: 1,
    marginLeft: 20,
  },
  specialistName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  specialistTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 13,
    color: '#666',
  },
  experienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  experienceText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },

  // Affinity Badge - Floating
  affinityFloating: {
    position: 'absolute',
    top: 16,
    right: 16,
    alignItems: 'center',
  },
  affinityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  affinityText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  affinityLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontWeight: '600',
  },

  // Action Buttons - Floating
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  primaryActionButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  secondaryActionText: {
    color: '#2196F3',
    fontSize: 15,
    fontWeight: '600',
  },

  // Quick Info Grid - Modern Cards
  quickInfoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoCardModern: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  infoCardBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  infoIconContainer: {
    marginBottom: 8,
  },
  infoCardContent: {
    alignItems: 'center',
  },
  infoCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 2,
  },
  infoCardLabel: {
    fontSize: 12,
    color: '#666',
  },

  // Promo Card - Eye-catching
  promoCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  promoBg: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  promoIcon: {
    marginRight: 16,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },

  // Specialties Pills
  specialtiesContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  specialtiesPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyPill: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  specialtyPillBg: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  specialtyPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },

  // Stats Grid - Modern
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCardModern: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statCardInfo: {
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 2,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#666',
  },

  // Tabs - Modern Pills
  tabsContainer: {
    marginBottom: 20,
  },
  tabsScrollContent: {
    gap: 8,
  },
  tabButton: {
    marginRight: 8,
  },
  tabActive: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  tabActiveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  tabInactive: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tabInactiveText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },

  // Tab Content
  tabContentContainer: {
    marginBottom: 20,
  },
  aboutTab: {
    gap: 16,
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  aboutText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  languagesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  languageText: {
    fontSize: 14,
    color: '#666',
  },
  formatsList: {
    flexDirection: 'row',
    gap: 8,
  },
  formatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  formatText: {
    fontSize: 14,
    color: '#666',
  },

  // Reviews Tab
  reviewsTab: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reviewAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  reviewInfo: {
    flex: 1,
  },
  reviewName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212121',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },

  // Availability Tab
  availabilityTab: {
    gap: 16,
  },
  availabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  availabilityText: {
    fontSize: 15,
    color: '#333',
  },
  availabilityNote: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 12,
  },

  // Education Tab
  educationTab: {
    gap: 16,
  },
  educationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  educationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  educationInfo: {
    flex: 1,
  },
  educationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  educationInstitution: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  educationYear: {
    fontSize: 13,
    color: '#999',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    marginTop: 16,
  },
});

export default SpecialistDetailScreen;
