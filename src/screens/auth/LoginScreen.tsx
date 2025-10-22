import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ScrollView } from 'react-native';
import { colors, spacing } from '../../constants/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { login, loading: authLoading, error, clearError } = useAuth();

  const userType = route.params?.userType || 'client';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    // Clear any previous errors
    clearError();

    try {
      await login(email, password);
      // Navigation handled by RootNavigator based on auth state
    } catch (error: any) {
      // Show user-friendly error message
      const errorMessage = error.message || 'Error al iniciar sesión. Intenta de nuevo';
      Alert.alert('Error de autenticación', errorMessage);
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

      {/* Constrained form container */}
      <View style={styles.formContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {userType === 'client' ? 'Bienvenido de nuevo' : 'Portal Profesional'}
          </Text>
          <Text style={styles.subtitle}>
            {userType === 'client'
              ? 'Inicia sesión para continuar'
              : 'Accede a tu panel de profesional'}
          </Text>
        </View>

        <View style={styles.form}>
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
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            variant="primary"
            size="large"
            onPress={handleLogin}
            loading={authLoading}
          >
            Iniciar Sesión
          </Button>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes cuenta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register', { userType })}>
            <Text style={styles.registerLink}>Regístrate aquí</Text>
          </TouchableOpacity>
        </View>

        {/* Test account hint */}
        <View style={styles.mockHint}>
          <Text style={styles.mockHintText}>
            💡 Cuenta de prueba: maria.garcia@example.com / password123
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
  forgotPassword: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary.main,
    fontWeight: '500',
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
  registerLink: {
    fontSize: 14,
    color: colors.primary.main,
    fontWeight: '600',
  },
  mockHint: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary[50],
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  mockHintText: {
    fontSize: 12,
    color: colors.primary.dark,
    textAlign: 'center',
  },
});
