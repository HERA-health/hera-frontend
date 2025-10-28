import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/colors';
import { BrandText } from '../../components/common/BrandText';
import { GradientButton } from '../../components/common/GradientButton';

interface Professional {
  id: string;
  name: string;
  specialization: string;
  experienceYears: number;
  avatar?: string;
}

interface StepProps {
  number: string;
  text: string;
}

interface TipOptionProps {
  label: string;
  subtitle: string;
  amount: number;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface ProfessionalCardProps {
  professional: Professional;
  tipAmount: number;
  onRequest: () => void;
}

const Step: React.FC<StepProps> = ({ number, text }) => (
  <View style={styles.step}>
    <View style={styles.stepNumber}>
      <Text style={styles.stepNumberText}>{number}</Text>
    </View>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

const TipOption: React.FC<TipOptionProps> = ({ label, subtitle, amount, selected, onPress, icon }) => (
  <TouchableOpacity
    style={[styles.tipOption, selected && styles.tipOptionSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {selected && (
      <LinearGradient
        colors={['#2196F3', '#00897B']}
        style={styles.tipOptionBorder}
      />
    )}
    <Ionicons
      name={icon || "sparkles"}
      size={24}
      color={selected ? "#2196F3" : "#FFB300"}
    />
    <Text style={[styles.tipLabel, selected && styles.tipLabelSelected]}>
      {label}
    </Text>
    <Text style={styles.tipSubtitleText}>{subtitle}</Text>
  </TouchableOpacity>
);

const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ professional, tipAmount, onRequest }) => (
  <View style={styles.professionalCard}>
    {/* Available Now Badge */}
    <LinearGradient
      colors={['#4CAF50', '#66BB6A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.availableBadge}
    >
      <View style={styles.pulsingDot} />
      <Text style={styles.availableText}>Disponible ahora</Text>
    </LinearGradient>

    <View style={styles.professionalHeader}>
      {/* Avatar */}
      <LinearGradient
        colors={['#2196F3', '#00897B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatar}
      >
        <Text style={styles.avatarText}>
          {professional.name[0]}
        </Text>
      </LinearGradient>

      <View style={styles.professionalInfo}>
        <Text style={styles.professionalName}>{professional.name}</Text>
        <Text style={styles.professionalSpecialization}>
          {professional.specialization}
        </Text>
        <View style={styles.experienceBadge}>
          <Ionicons name="briefcase" size={14} color={colors.neutral.gray600} />
          <Text style={styles.experienceText}>
            {professional.experienceYears} años de experiencia
          </Text>
        </View>
      </View>
    </View>

    {/* Summary Box */}
    <View style={styles.summaryBox}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Sesión voluntaria gratuita</Text>
        <Text style={styles.summaryValue}>0€</Text>
      </View>
      {tipAmount > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tu agradecimiento</Text>
          <BrandText style={styles.summaryValue}>+{tipAmount}€</BrandText>
        </View>
      )}
    </View>

    {/* Request Button */}
    <GradientButton
      title="Solicitar Ahora"
      onPress={onRequest}
      size="large"
    />

    <Text style={styles.responseTime}>
      ⚡ Respuesta típica: 5-10 minutos
    </Text>
  </View>
);

export function OnDutyPsychologistScreen({ navigation }: any) {
  const [selectedTip, setSelectedTip] = useState<number>(0); // 0 = gratis
  const [customTip, setCustomTip] = useState('');
  const [availableProfessionals, setAvailableProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailableProfessionals();
  }, []);

  const loadAvailableProfessionals = async () => {
    try {
      // Simulate API call - Replace with actual backend call
      // const response = await api.get('/specialists/on-duty');

      // Mock data for now
      setTimeout(() => {
        setAvailableProfessionals([
          {
            id: '1',
            name: 'Dr. María González',
            specialization: 'Psicóloga Clínica',
            experienceYears: 8,
          },
          {
            id: '2',
            name: 'Dr. Carlos Martínez',
            specialization: 'Terapeuta Cognitivo-Conductual',
            experienceYears: 12,
          },
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading on-duty professionals:', error);
      Alert.alert('Error', 'No se pudieron cargar los profesionales de guardia');
      setLoading(false);
    }
  };

  const handleRequestSession = async (professionalId: string) => {
    const finalTip = selectedTip === -1 ? parseFloat(customTip) || 0 : selectedTip;

    try {
      // Create session request with optional tip
      // const response = await api.post('/sessions/on-duty', {
      //   professionalId,
      //   tipAmount: finalTip,
      // });

      Alert.alert(
        '¡Solicitud enviada!',
        'El profesional confirmará tu sesión en 5-10 minutos. Recibirás un enlace de videollamada.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Sessions'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la solicitud');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header with Icon */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']} // Red-orange for urgency
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.urgentIcon}
          >
            <Ionicons name="call" size={32} color="#fff" />
          </LinearGradient>
        </View>

        <BrandText style={styles.title}>Psicólogos de Guardia</BrandText>

        <Text style={styles.subtitle}>
          Profesionales disponibles ahora para atenderte en momentos de crisis o ansiedad
        </Text>
      </View>

      {/* How it Works Info Box */}
      <View style={styles.infoBox}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={24} color="#2196F3" />
          <Text style={styles.infoTitle}>¿Cómo funciona?</Text>
        </View>

        <View style={styles.steps}>
          <Step number="1" text="Decide si quieres hacer una aportación voluntaria al profesional" />
          <Step number="2" text="Selecciona un profesional disponible" />
          <Step number="3" text="Envía tu solicitud y espera confirmación (normalmente 5-10 minutos)" />
          <Step number="4" text="Recibirás un enlace de videollamada una vez aceptada" />
        </View>
      </View>

      {/* Tip Selection */}
      <View style={styles.tipSection}>
        <View style={styles.tipHeader}>
          <Ionicons name="heart" size={20} color="#FF6B6B" />
          <Text style={styles.tipTitle}>¿Deseas agradecer al profesional? (Opcional)</Text>
        </View>

        <Text style={styles.tipSubtitle}>
          Estos profesionales donan su tiempo voluntariamente. Si deseas, puedes mostrar tu agradecimiento con una propina. Si no pones nada, la sesión será totalmente gratuita.
        </Text>

        <View style={styles.tipOptions}>
          <TipOption
            label="Gratis"
            subtitle="Voluntariado"
            amount={0}
            selected={selectedTip === 0}
            onPress={() => setSelectedTip(0)}
            icon="heart"
          />
          <TipOption
            label="3€"
            subtitle="Gracias"
            amount={3}
            selected={selectedTip === 3}
            onPress={() => setSelectedTip(3)}
          />
          <TipOption
            label="5€"
            subtitle="Gracias"
            amount={5}
            selected={selectedTip === 5}
            onPress={() => setSelectedTip(5)}
          />
          <TipOption
            label="10€"
            subtitle="Gracias"
            amount={10}
            selected={selectedTip === 10}
            onPress={() => setSelectedTip(10)}
          />
          <TipOption
            label="15€"
            subtitle="Gracias"
            amount={15}
            selected={selectedTip === 15}
            onPress={() => setSelectedTip(15)}
          />
        </View>

        {/* Custom Amount Option */}
        <TouchableOpacity
          style={[styles.customTipButton, selectedTip === -1 && styles.customTipSelected]}
          onPress={() => setSelectedTip(-1)}
          activeOpacity={0.7}
        >
          <TextInput
            style={styles.customTipInput}
            placeholder="Cantidad personalizada"
            keyboardType="numeric"
            value={customTip}
            onChangeText={setCustomTip}
            onFocus={() => setSelectedTip(-1)}
          />
          <Text style={styles.euroSymbol}>€</Text>
        </TouchableOpacity>

        <Text style={styles.tipNote}>
          💡 Cualquier cantidad es bienvenida. El profesional solo recibirá el pago si acepta la sesión.
        </Text>
      </View>

      {/* Available Professionals */}
      <View style={styles.professionalsSection}>
        <BrandText style={styles.sectionTitle}>Profesionales disponibles ahora</BrandText>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Buscando profesionales...</Text>
          </View>
        ) : availableProfessionals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time" size={48} color={colors.neutral.gray400} />
            <Text style={styles.emptyText}>
              No hay profesionales disponibles en este momento
            </Text>
            <Text style={styles.emptySubtext}>
              Intenta de nuevo en unos minutos o usa nuestro sistema de citas programadas
            </Text>
          </View>
        ) : (
          availableProfessionals.map(professional => (
            <ProfessionalCard
              key={professional.id}
              professional={professional}
              tipAmount={selectedTip === -1 ? parseFloat(customTip) || 0 : selectedTip}
              onRequest={() => handleRequestSession(professional.id)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  urgentIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.gray900,
  },
  steps: {
    gap: spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral.gray700,
    lineHeight: 20,
    paddingTop: 4,
  },
  tipSection: {
    marginBottom: spacing.xl,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.gray900,
  },
  tipSubtitle: {
    fontSize: 14,
    color: colors.neutral.gray600,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  tipOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tipOption: {
    flex: 1,
    minWidth: 90,
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral.gray200,
    position: 'relative',
    overflow: 'hidden',
  },
  tipOptionSelected: {
    borderColor: 'transparent',
  },
  tipOptionBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  tipLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginTop: spacing.xs,
  },
  tipLabelSelected: {
    color: '#2196F3',
  },
  tipSubtitleText: {
    fontSize: 12,
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  customTipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.neutral.gray200,
    marginBottom: spacing.md,
  },
  customTipSelected: {
    borderColor: '#2196F3',
  },
  customTipInput: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral.gray900,
  },
  euroSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.gray600,
    marginLeft: spacing.sm,
  },
  tipNote: {
    fontSize: 13,
    color: colors.neutral.gray600,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  professionalsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: colors.neutral.gray600,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.gray900,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 22,
  },
  professionalCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
  },
  availableBadge: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    gap: spacing.xs,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral.white,
  },
  availableText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  professionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginBottom: 4,
  },
  professionalSpecialization: {
    fontSize: 15,
    color: colors.neutral.gray600,
    marginBottom: spacing.xs,
  },
  experienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  experienceText: {
    fontSize: 13,
    color: colors.neutral.gray600,
  },
  summaryBox: {
    backgroundColor: colors.neutral.gray50,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.neutral.gray700,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.gray900,
  },
  responseTime: {
    fontSize: 13,
    color: colors.neutral.gray600,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
