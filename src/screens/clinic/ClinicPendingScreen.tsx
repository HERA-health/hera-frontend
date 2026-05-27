import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../components/common/Button';
import { spacing } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicService from '../../services/clinicService';

export function ClinicPendingScreen() {
  const { logout, user } = useAuth();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(width >= 768), [width]);
  const [memberships, setMemberships] = useState<clinicService.ClinicMembershipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadClinic = async () => {
      try {
        setLoading(true);
        setError('');
        const nextMemberships = await clinicService.getMyClinicMemberships();
        if (active) {
          setMemberships(nextMemberships);
        }
      } catch (loadError: unknown) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la cuenta de clínica');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadClinic();

    return () => {
      active = false;
    };
  }, []);

  const primaryMembership = memberships[0];
  const clinicName = primaryMembership?.clinic.commercialName ?? user?.name ?? 'Cuenta de clínica';
  const hasMembership = memberships.length > 0;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.shell}>
        <View
          style={[
            styles.iconShell,
            {
              backgroundColor: theme.primaryAlpha12,
              borderColor: theme.borderLight,
            },
          ]}
        >
          <Ionicons name="business-outline" size={30} color={theme.primary} />
        </View>

        <Text style={[styles.kicker, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>
          HERA Clínicas
        </Text>
        <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>
          {clinicName}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
          {hasMembership
            ? 'Tu clínica ya tiene panel básico activo. Si has llegado aquí, vuelve a iniciar sesión para recargar la navegación.'
            : 'Esta cuenta existe, pero todavía no tiene una clínica activa vinculada por el equipo de HERA.'}
        </Text>

        <View
          style={[
            styles.statusPanel,
            {
              backgroundColor: theme.bgCard,
              borderColor: theme.border,
              shadowColor: theme.shadowCard,
            },
          ]}
        >
          {loading ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={theme.primary} size="small" />
              <Text style={[styles.statusText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                Cargando cuenta de clínica
              </Text>
            </View>
          ) : error ? (
            <View style={styles.statusRow}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.warning} />
              <Text style={[styles.statusText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                {error}
              </Text>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.success} />
              <View style={styles.statusCopy}>
                <Text style={[styles.statusTitle, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}>
                  {hasMembership ? 'Base multi-clínica activa' : 'Sin clínica vinculada'}
                </Text>
                <Text style={[styles.statusText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
                  {hasMembership
                    ? `Rol ${primaryMembership?.role ?? 'OWNER'} preparado para el panel de gestión.`
                    : 'La creación pública de clínicas sigue cerrada en esta fase.'}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Button
            variant="outline"
            size="medium"
            onPress={() => { void logout(); }}
            icon={<Ionicons name="log-out-outline" size={18} color={theme.primary} />}
          >
            Cerrar sesión
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (isWide: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: isWide ? spacing.xxl : spacing.lg,
      paddingVertical: spacing.xxl,
    },
    shell: {
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
    },
    iconShell: {
      width: 64,
      height: 64,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    kicker: {
      fontSize: 13,
      lineHeight: 18,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    title: {
      fontSize: isWide ? 44 : 34,
      lineHeight: isWide ? 52 : 40,
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 25,
      maxWidth: 620,
      marginBottom: spacing.xl,
    },
    statusPanel: {
      borderWidth: 1,
      borderRadius: 8,
      padding: spacing.lg,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 3,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    statusCopy: {
      flex: 1,
    },
    statusTitle: {
      fontSize: 16,
      lineHeight: 22,
      marginBottom: 2,
    },
    statusText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 21,
    },
    actions: {
      flexDirection: 'row',
      marginTop: spacing.xl,
    },
  });
