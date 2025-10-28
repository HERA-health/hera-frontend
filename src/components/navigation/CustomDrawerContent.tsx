import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { BrandText } from '../common/BrandText';

interface CustomDrawerContentProps {
  currentRoute?: string;
}

export function CustomDrawerContent({ currentRoute = 'Home' }: CustomDrawerContentProps) {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();

  const isProfessional = user?.type === 'professional' || user?.userType === 'PROFESSIONAL';

  // Different menu items based on user type
  const menuItems = isProfessional
    ? [
        { name: 'ProfessionalHome', label: 'Panel Principal', icon: 'grid' as const },
        { name: 'ProfessionalClients', label: 'Mis Clientes', icon: 'people' as const },
        { name: 'ProfessionalSessions', label: 'Sesiones', icon: 'calendar' as const },
        { name: 'ProfessionalProfile', label: 'Editar Perfil', icon: 'create' as const },
      ]
    : [
        { name: 'Home', label: 'Inicio', icon: 'home' as const },
        { name: 'Specialists', label: 'Especialistas', icon: 'search' as const },
        { name: 'Sessions', label: 'Mis Sesiones', icon: 'calendar' as const },
        { name: 'Profile', label: 'Perfil', icon: 'person' as const },
      ];

  const handleNavigation = (screenName: string) => {
    navigation.navigate(screenName);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#2196F3', '#00897B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoContainer}
          >
            <Ionicons name="heart" size={32} color={colors.neutral.white} />
          </LinearGradient>
          <BrandText style={styles.brandName}>MindConnect</BrandText>
          <Text style={styles.tagline}>
            {isProfessional ? 'Panel Profesional' : 'Tu bienestar mental'}
          </Text>
        </View>

        {/* Navigation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NAVEGACIÓN</Text>
          {menuItems.map((item) => {
            const isActive = currentRoute === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                style={[styles.menuItem, isActive && styles.menuItemActiveWrapper]}
                onPress={() => handleNavigation(item.name)}
                activeOpacity={0.7}
              >
                {isActive ? (
                  <LinearGradient
                    colors={['#2196F3', '#00897B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.menuItemActive}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={colors.neutral.white}
                    />
                    <Text style={styles.menuItemTextActive}>
                      {item.label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.menuItemInactive}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={colors.neutral.gray600}
                    />
                    <Text style={styles.menuItemText}>
                      {item.label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Support Section - only for clients */}
        {!isProfessional && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SOPORTE</Text>

            <TouchableOpacity
              style={[styles.menuItem, currentRoute === 'OnDutyPsychologist' && styles.menuItemActiveWrapper]}
              onPress={() => handleNavigation('OnDutyPsychologist')}
              activeOpacity={0.7}
            >
              {currentRoute === 'OnDutyPsychologist' ? (
                <LinearGradient
                  colors={['#2196F3', '#00897B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.menuItemActive}
                >
                  <Ionicons name="call" size={20} color={colors.neutral.white} />
                  <Text style={styles.menuItemTextActive}>Psicólogo de Guardia</Text>
                  <View style={styles.badge24Active}>
                    <Text style={styles.badge24Text}>24/7</Text>
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.menuItemInactive}>
                  <Ionicons name="call" size={20} color="#FF6B6B" />
                  <Text style={styles.menuItemText}>Psicólogo de Guardia</Text>
                  <LinearGradient
                    colors={['#FF6B6B', '#FF8E53']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.badge24Gradient}
                  >
                    <Text style={styles.badge24Text}>24/7</Text>
                  </LinearGradient>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* User Section */}
      <View style={styles.userSection}>
        <LinearGradient
          colors={['#2196F3', '#00897B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userAvatar}
        >
          <Text style={styles.userAvatarText}>{user?.name?.charAt(0) || 'U'}</Text>
        </LinearGradient>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name || 'Usuario'}</Text>
          <Text style={styles.userSubtitle}>
            {isProfessional ? 'Profesional' : 'Cuidando tu bienestar'}
          </Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color={colors.neutral.gray600} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    backgroundColor: colors.primary[50],
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.neutral.gray900,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: colors.neutral.gray600,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.gray500,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  menuItem: {
    borderRadius: 12,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.xs,
    overflow: 'hidden',
  },
  menuItemActiveWrapper: {
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuItemInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuItemText: {
    fontSize: 15,
    color: colors.neutral.gray700,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: colors.neutral.white,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  badge24Active: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badge24Gradient: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badge24Text: {
    color: colors.neutral.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.gray900,
  },
  userSubtitle: {
    fontSize: 12,
    color: colors.neutral.gray600,
  },
  logoutButton: {
    padding: spacing.xs,
  },
});
