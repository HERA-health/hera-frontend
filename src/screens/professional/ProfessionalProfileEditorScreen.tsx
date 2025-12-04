import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Alert } from 'react-native';
import { colors, spacing, branding } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { GradientButton } from '../../components/common/GradientButton';
import { BrandText } from '../../components/common/BrandText';
import { GradientBackground } from '../../components/common/GradientBackground';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

// Options for each field based on questionnaire data
const THERAPEUTIC_APPROACHES = [
  { value: 'cognitive-behavioral', label: 'Cognitivo-conductual' },
  { value: 'humanistic', label: 'Humanista' },
  { value: 'psychodynamic', label: 'Psicodinámico' },
  { value: 'mindfulness', label: 'Mindfulness' },
];

const SPECIALTIES = [
  { value: 'anxiety', label: 'Ansiedad' },
  { value: 'depression', label: 'Depresión' },
  { value: 'stress', label: 'Estrés laboral' },
  { value: 'relationships', label: 'Relaciones' },
  { value: 'trauma', label: 'Traumas' },
  { value: 'self-esteem', label: 'Autoestima' },
];

const SESSION_STYLES = [
  { value: 'structured', label: 'Estructuradas' },
  { value: 'conversational', label: 'Conversacionales' },
  { value: 'flexible', label: 'Flexibles' },
];

const PERSONALITY_TRAITS = [
  { value: 'empathetic', label: 'Empático' },
  { value: 'direct', label: 'Directo' },
  { value: 'patient', label: 'Paciente' },
  { value: 'motivating', label: 'Motivador' },
  { value: 'warm', label: 'Cálido' },
];

const AGE_GROUPS = [
  { value: 'youth', label: '18-25 años' },
  { value: 'adults', label: '26-45 años' },
  { value: 'middle-aged', label: '46-65 años' },
  { value: 'elderly', label: '+65 años' },
];

const LANGUAGES = [
  { value: 'spanish', label: 'Español' },
  { value: 'english', label: 'Inglés' },
  { value: 'catalan', label: 'Catalán' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'morning', label: 'Mañanas' },
  { value: 'afternoon', label: 'Tardes' },
  { value: 'evening', label: 'Noches' },
  { value: 'flexible', label: 'Horario flexible' },
];

const FORMAT_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'in-person', label: 'Presencial' },
  { value: 'both', label: 'Ambas' },
];

export function ProfessionalProfileEditorScreen() {
  const { user } = useAuth();

  // Initialize with default values (in real app, load from current profile)
  const [therapeuticApproach, setTherapeuticApproach] = useState<string[]>(['cognitive-behavioral']);
  const [specialties, setSpecialties] = useState<string[]>(['anxiety', 'stress']);
  const [sessionStyle, setSessionStyle] = useState<string>('flexible');
  const [personality, setPersonality] = useState<string[]>(['empathetic', 'patient']);
  const [ageGroups, setAgeGroups] = useState<string[]>(['adults', 'middle-aged']);
  const [experienceYears, setExperienceYears] = useState<string>('8');
  const [languages, setLanguages] = useState<string[]>(['spanish']);
  const [availability, setAvailability] = useState<string>('flexible');
  const [format, setFormat] = useState<string[]>(['both']);

  // Basic profile fields
  const [name, setName] = useState(user?.name || '');
  const [specialization, setSpecialization] = useState('');
  const [pricePerSession, setPricePerSession] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);

  const toggleMultiSelect = (value: string, current: string[], setter: (val: string[]) => void) => {
    if (current.includes(value)) {
      setter(current.filter(v => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (therapeuticApproach.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un enfoque terapéutico');
      return;
    }
    if (specialties.length === 0) {
      Alert.alert('Error', 'Selecciona al menos una especialidad');
      return;
    }
    if (!sessionStyle) {
      Alert.alert('Error', 'Selecciona un estilo de sesión');
      return;
    }
    if (personality.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un rasgo de personalidad');
      return;
    }
    if (ageGroups.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un grupo de edad');
      return;
    }
    if (!experienceYears || parseInt(experienceYears) < 0) {
      Alert.alert('Error', 'Ingresa años de experiencia válidos');
      return;
    }
    if (languages.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un idioma');
      return;
    }
    if (!availability) {
      Alert.alert('Error', 'Selecciona tu disponibilidad');
      return;
    }
    if (format.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un formato de sesión');
      return;
    }

    setLoading(true);

    // Simulate save
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Éxito', 'Tu perfil ha sido actualizado correctamente');
    }, 1000);
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <BrandText style={styles.headerTitle}>Editar Perfil Profesional</BrandText>
          <Text style={styles.headerSubtitle}>
            Actualiza tu información para mejorar el matching con clientes
          </Text>
        </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color={branding.accent} />
            <BrandText style={styles.sectionTitle}>Información Básica</BrandText>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Dr. Juan Pérez"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Especialización</Text>
            <TextInput
              style={styles.input}
              value={specialization}
              onChangeText={setSpecialization}
              placeholder="Psicólogo Clínico"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Precio por sesión (€)</Text>
            <TextInput
              style={styles.input}
              value={pricePerSession}
              onChangeText={setPricePerSession}
              placeholder="65"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Descripción breve</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe tu enfoque y experiencia..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Matching Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart" size={20} color={branding.accent} />
            <BrandText style={styles.sectionTitle}>Perfil de Matching</BrandText>
          </View>
          <Text style={styles.sectionDescription}>
            Esta información se usa para conectarte con los clientes más compatibles
          </Text>

          {/* Therapeutic Approach */}
          <View style={styles.field}>
            <Text style={styles.label}>Enfoques terapéuticos <Text style={styles.required}>*</Text></Text>
            <Text style={styles.fieldHint}>Selecciona uno o más</Text>
            <View style={styles.chipContainer}>
              {THERAPEUTIC_APPROACHES.map((option) => {
                const isSelected = therapeuticApproach.includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.chipWrapper}
                    onPress={() => toggleMultiSelect(option.value, therapeuticApproach, setTherapeuticApproach)}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={[branding.accent, branding.accentLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.chipSelected}
                      >
                        <Ionicons name="checkmark" size={16} color={colors.neutral.white} />
                        <Text style={styles.chipTextSelected}>{option.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{option.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Specialties */}
          <View style={styles.field}>
            <Text style={styles.label}>Especialidades <Text style={styles.required}>*</Text></Text>
            <Text style={styles.fieldHint}>Selecciona tus áreas de expertise</Text>
            <View style={styles.chipContainer}>
              {SPECIALTIES.map((option) => {
                const isSelected = specialties.includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.chipWrapper}
                    onPress={() => toggleMultiSelect(option.value, specialties, setSpecialties)}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={[branding.accent, branding.accentLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.chipSelected}
                      >
                        <Ionicons name="checkmark" size={16} color={colors.neutral.white} />
                        <Text style={styles.chipTextSelected}>{option.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{option.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Session Style */}
          <View style={styles.field}>
            <Text style={styles.label}>Estilo de sesión <Text style={styles.required}>*</Text></Text>
            <Text style={styles.fieldHint}>Selecciona uno</Text>
            <View style={styles.chipContainer}>
              {SESSION_STYLES.map((option) => {
                const isSelected = sessionStyle === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.chipWrapper}
                    onPress={() => setSessionStyle(option.value)}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={[branding.accent, branding.accentLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.chipSelected}
                      >
                        <Ionicons name="checkmark" size={16} color={colors.neutral.white} />
                        <Text style={styles.chipTextSelected}>{option.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{option.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Personality */}
          <View style={styles.field}>
            <Text style={styles.label}>Rasgos de personalidad <Text style={styles.required}>*</Text></Text>
            <Text style={styles.fieldHint}>Cómo te describirías</Text>
            <View style={styles.chipContainer}>
              {PERSONALITY_TRAITS.map((option) => {
                const isSelected = personality.includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.chipWrapper}
                    onPress={() => toggleMultiSelect(option.value, personality, setPersonality)}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={[branding.accent, branding.accentLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.chipSelected}
                      >
                        <Ionicons name="checkmark" size={16} color={colors.neutral.white} />
                        <Text style={styles.chipTextSelected}>{option.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{option.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Age Groups */}
          <View style={styles.field}>
            <Text style={styles.label}>Grupos de edad atendidos <Text style={styles.required}>*</Text></Text>
            <Text style={styles.fieldHint}>Con qué edades trabajas</Text>
            <View style={styles.chipContainer}>
              {AGE_GROUPS.map((option) => {
                const isSelected = ageGroups.includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.chipWrapper}
                    onPress={() => toggleMultiSelect(option.value, ageGroups, setAgeGroups)}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={[branding.accent, branding.accentLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.chipSelected}
                      >
                        <Ionicons name="checkmark" size={16} color={colors.neutral.white} />
                        <Text style={styles.chipTextSelected}>{option.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{option.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Experience Years */}
          <View style={styles.field}>
            <Text style={styles.label}>Años de experiencia <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.inputSmall]}
              value={experienceYears}
              onChangeText={setExperienceYears}
              placeholder="8"
              keyboardType="numeric"
            />
          </View>

          {/* Languages */}
          <View style={styles.field}>
            <Text style={styles.label}>Idiomas <Text style={styles.required}>*</Text></Text>
            <Text style={styles.fieldHint}>Idiomas en los que ofreces sesiones</Text>
            <View style={styles.chipContainer}>
              {LANGUAGES.map((option) => {
                const isSelected = languages.includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.chipWrapper}
                    onPress={() => toggleMultiSelect(option.value, languages, setLanguages)}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={[branding.accent, branding.accentLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.chipSelected}
                      >
                        <Ionicons name="checkmark" size={16} color={colors.neutral.white} />
                        <Text style={styles.chipTextSelected}>{option.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{option.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Availability */}
          <View style={styles.field}>
            <Text style={styles.label}>Disponibilidad horaria <Text style={styles.required}>*</Text></Text>
            <Text style={styles.fieldHint}>Cuándo sueles tener sesiones</Text>
            <View style={styles.chipContainer}>
              {AVAILABILITY_OPTIONS.map((option) => {
                const isSelected = availability === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.chipWrapper}
                    onPress={() => setAvailability(option.value)}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={[branding.accent, branding.accentLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.chipSelected}
                      >
                        <Ionicons name="checkmark" size={16} color={colors.neutral.white} />
                        <Text style={styles.chipTextSelected}>{option.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{option.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Format */}
          <View style={styles.field}>
            <Text style={styles.label}>Formato de sesiones <Text style={styles.required}>*</Text></Text>
            <Text style={styles.fieldHint}>Qué formatos ofreces</Text>
            <View style={styles.chipContainer}>
              {FORMAT_OPTIONS.map((option) => {
                const isSelected = format.includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.chipWrapper}
                    onPress={() => toggleMultiSelect(option.value, format, setFormat)}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={[branding.accent, branding.accentLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.chipSelected}
                      >
                        <Ionicons name="checkmark" size={16} color={colors.neutral.white} />
                        <Text style={styles.chipTextSelected}>{option.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{option.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Save button */}
        <View style={styles.actionsSection}>
          <GradientButton
            title="Guardar cambios"
            onPress={handleSave}
            size="large"
            loading={loading}
          />
          <Text style={styles.hint}>
            * Campos obligatorios
          </Text>
        </View>
      </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // GradientBackground handles the background
  },
  header: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.neutral.gray600,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  section: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.neutral.gray600,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  required: {
    color: branding.accent,
  },
  fieldHint: {
    fontSize: 13,
    color: colors.neutral.gray500,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.neutral.gray900,
  },
  inputSmall: {
    maxWidth: 120,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.neutral.gray100,
    borderWidth: 2,
    borderColor: colors.neutral.gray200,
    gap: spacing.xs,
  },
  chipSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    shadowColor: branding.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  chipTextSelected: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  actionsSection: {
    gap: spacing.md,
  },
  hint: {
    fontSize: 13,
    color: colors.neutral.gray500,
    textAlign: 'center',
  },
});
