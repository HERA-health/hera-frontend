import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';

interface CustomDrawerContentProps {
  currentRoute?: string;
}

export function CustomDrawerContent({ currentRoute = 'Home' }: CustomDrawerContentProps) {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();

  const isProfessional = user?.type === 'professional';

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
          <View style={styles.logoContainer}>
            <Ionicons name="heart" size={32} color={colors.primary.main} />
          </View>
          <Text style={styles.brandName}>MindConnect</Text>
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
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => handleNavigation(item.name)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={isActive ? colors.neutral.white : colors.neutral.gray600}
                />
                <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Support Section - only for clients */}
        {!isProfessional && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SOPORTE</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => console.log('Crisis support')}
              activeOpacity={0.7}
            >
              <Ionicons name="warning" size={20} color={colors.support.crisis} />
              <Text style={styles.menuItemText}>Apoyo en Crisis</Text>
            </TouchableOpacity>

            <View style={styles.helpCard}>
              <View style={styles.helpCardHeader}>
                <Ionicons name="chatbubble-ellipses" size={20} color={colors.support.help} />
                <Text style={styles.helpCardTitle}>Ayuda 24/7</Text>
              </View>
              <Text style={styles.helpCardText}>
                Estamos aquí para apoyarte en cada paso
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* User Section */}
      <View style={styles.userSection}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>{user?.name?.charAt(0) || 'U'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name || 'Usuario'}</Text>
          <Text style={styles.userSubtitle}>
            {user?.type === 'professional' ? 'Profesional' : 'Cuidando tu bienestar'}
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
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary.main,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.xs,
  },
  menuItemActive: {
    backgroundColor: colors.primary.main,
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
  },
  helpCard: {
    backgroundColor: colors.support.helpBg,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.support.help + '30',
  },
  helpCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  helpCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.gray900,
    marginLeft: spacing.xs,
  },
  helpCardText: {
    fontSize: 12,
    color: colors.neutral.gray600,
    lineHeight: 16,
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
    backgroundColor: colors.primary.main,
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
