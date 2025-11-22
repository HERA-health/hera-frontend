import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { colors, spacing } from '../../constants/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth, UserType } from '../../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export function RegisterScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { register, loading, clearError } = useAuth();

  // Convert uppercase backend format to lowercase frontend format
  const paramUserType = route.params?.userType;
  const userType: UserType = paramUserType === 'PROFESSIONAL' ? 'professional' : 'client';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validateInputs = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu nombre');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return false;
    }

    if (!password) {
      Alert.alert('Error', 'Por favor ingresa una contraseña');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateInputs()) {
      return;
    }

    // Clear any previous errors
    clearError();

    try {
      await register(email, password, name, userType);
      // Navigation handled by RootNavigator based on auth state
    } catch (error: any) {
      // Show user-friendly error message
      let errorMessage = 'Error al registrarse. Intenta de nuevo';

      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        errorMessage = 'Este email ya está registrado';
      } else if (error.message.includes('Network error')) {
        errorMessage = 'Error de conexión. Verifica tu internet';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error de registro', errorMessage);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.neutral.gray900} />
      </TouchableOpacity>

      <View style={styles.formContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {userType === 'client' ? 'Crear Cuenta' : 'Registro Profesional'}
          </Text>
          <Text style={styles.subtitle}>
            {userType === 'client'
              ? 'Únete a HERA - Health Era'
              : 'Regístrate como profesional de la salud mental'}
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Nombre completo"
            placeholder="Tu nombre"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Input
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Contraseña"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Input
            label="Confirmar contraseña"
            placeholder="Ingresa tu contraseña nuevamente"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Button
            variant="primary"
            size="large"
            onPress={handleRegister}
            loading={loading}
          >
            Crear Cuenta
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginLink}>Inicia sesión aquí</Text>
          </TouchableOpacity>
        </View>

        {/* Terms notice */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            Al registrarte, aceptas nuestros Términos de Servicio y Política de Privacidad
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  formContainer: {
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: spacing.xxxl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.neutral.gray600,
  },
  form: {
    gap: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    fontSize: 14,
    color: colors.neutral.gray600,
  },
  loginLink: {
    fontSize: 14,
    color: colors.primary.main,
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  termsText: {
    fontSize: 12,
    color: colors.neutral.gray500,
    textAlign: 'center',
    lineHeight: 18,
  },
});
