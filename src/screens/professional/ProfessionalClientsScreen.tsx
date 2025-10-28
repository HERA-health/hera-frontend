import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as professionalService from '../../services/professionalService';
import { Client } from '../../constants/types';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandText } from '../../components/common/BrandText';

const { width: screenWidth } = Dimensions.get('window');

export function ProfessionalClientsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await professionalService.getProfessionalClients();
      // Map API data to match existing UI expectations
      const mappedClients = data.map(c => ({
        id: c.id,
        name: c.user?.name || 'Cliente',
        email: c.user?.email || '',
        phone: '',
        initial: (c.user?.name || 'C')[0].toUpperCase(),
        status: 'active' as const,
        lastSession: c.sessions?.[0]?.scheduledDate ? new Date(c.sessions[0].scheduledDate) : undefined,
        totalSessions: c.sessions?.length || 0,
        nextSession: undefined
      }));
      setClients(mappedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Filter clients based on search and status
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || client.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const statusFilters = [
    { id: 'all', label: 'Todos', count: clients.length },
    { id: 'active', label: 'Activos', count: clients.filter(c => c.status === 'active').length },
    { id: 'inactive', label: 'Inactivos', count: clients.filter(c => c.status === 'inactive').length },
    { id: 'pending', label: 'Pendientes', count: clients.filter(c => c.status === 'pending').length },
  ];

  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'active':
        return colors.primary.main;
      case 'inactive':
        return colors.neutral.gray400;
      case 'pending':
        return colors.secondary.orange;
      default:
        return colors.neutral.gray600;
    }
  };

  const getStatusLabel = (status: Client['status']) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
      case 'pending':
        return 'Pendiente';
      default:
        return status;
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BrandText style={styles.headerTitle}>Mis Clientes</BrandText>
        <Text style={styles.headerSubtitle}>
          Gestiona tu lista de pacientes
        </Text>
      </View>

      {/* Search and filters */}
      <View style={styles.controlsContainer}>
        {/* Search input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.neutral.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor={colors.neutral.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.neutral.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContainer}
        >
          {statusFilters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={styles.filterChipWrapper}
              onPress={() => setSelectedStatus(filter.id as any)}
            >
              {selectedStatus === filter.id ? (
                <LinearGradient
                  colors={['#2196F3', '#00897B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.filterChipActive}
                >
                  <Text style={styles.filterChipTextActive}>
                    {filter.label}
                  </Text>
                  <View style={styles.filterChipBadgeActive}>
                    <Text style={styles.filterChipBadgeTextActive}>
                      {filter.count}
                    </Text>
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>
                    {filter.label}
                  </Text>
                  <View style={styles.filterChipBadge}>
                    <Text style={styles.filterChipBadgeText}>
                      {filter.count}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Clients list */}
      <ScrollView
        style={styles.clientsList}
        contentContainerStyle={styles.clientsListContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredClients.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name={searchQuery ? "search" : "people-outline"}
                size={56}
                color={colors.neutral.gray400}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No se encontraron clientes' : 'No hay clientes'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery
                ? 'Intenta con otro término de búsqueda'
                : 'Tus pacientes aparecerán aquí'
              }
            </Text>
          </View>
        ) : (
          filteredClients.map((client) => (
            <TouchableOpacity
              key={client.id}
              style={styles.clientCard}
              activeOpacity={0.7}
            >
              {/* Client avatar and info */}
              <View style={styles.clientHeader}>
                <LinearGradient
                  colors={['#2196F3', '#00897B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.clientAvatarBorder}
                >
                  <View style={styles.clientAvatar}>
                    <Text style={styles.clientAvatarText}>{client.initial}</Text>
                  </View>
                </LinearGradient>

                <View style={styles.clientInfo}>
                  <View style={styles.clientTitleRow}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(client.status) + '20' }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(client.status) }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(client.status) }]}>
                        {getStatusLabel(client.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.clientMeta}>
                    <Ionicons name="mail-outline" size={14} color={colors.neutral.gray500} />
                    <Text style={styles.clientEmail}>{client.email}</Text>
                  </View>

                  {client.phone && (
                    <View style={styles.clientMeta}>
                      <Ionicons name="call-outline" size={14} color={colors.neutral.gray500} />
                      <Text style={styles.clientPhone}>{client.phone}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Session info */}
              <View style={styles.clientStats}>
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="calendar" size={16} color="#2196F3" />
                  </View>
                  <View style={styles.statInfo}>
                    <Text style={styles.statLabel}>Última sesión</Text>
                    <Text style={styles.statValue}>{formatDate(client.lastSession)}</Text>
                  </View>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="time" size={16} color="#2196F3" />
                  </View>
                  <View style={styles.statInfo}>
                    <Text style={styles.statLabel}>Próxima sesión</Text>
                    <Text style={styles.statValue}>{formatDate(client.nextSession)}</Text>
                  </View>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="bar-chart" size={16} color="#2196F3" />
                  </View>
                  <View style={styles.statInfo}>
                    <Text style={styles.statLabel}>Sesiones totales</Text>
                    <Text style={styles.statValue}>{client.totalSessions}</Text>
                  </View>
                </View>
              </View>

              {/* Notes preview */}
              {client.notes && (
                <View style={styles.notesSection}>
                  <View style={styles.notesHeader}>
                    <Ionicons name="document-text" size={14} color={colors.neutral.gray600} />
                    <Text style={styles.notesLabel}>Notas:</Text>
                  </View>
                  <Text style={styles.notesText} numberOfLines={2}>
                    {client.notes}
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.clientActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="chatbubble-outline" size={16} color="#2196F3" />
                  <Text style={styles.actionButtonText}>Contactar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="calendar-outline" size={16} color="#2196F3" />
                  <Text style={styles.actionButtonText}>Agendar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButtonWrapper}>
                  <LinearGradient
                    colors={['#2196F3', '#00897B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButtonPrimary}
                  >
                    <Ionicons name="arrow-forward" size={16} color={colors.neutral.white} />
                    <Text style={styles.actionButtonTextPrimary}>
                      Ver perfil
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
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
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.neutral.gray600,
  },
  controlsContainer: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 15,
    color: colors.neutral.gray900,
  },
  filtersScroll: {
    marginHorizontal: -spacing.lg,
  },
  filtersContainer: {
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    gap: spacing.sm,
  },
  filterChipWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.neutral.gray100,
    gap: spacing.xs,
  },
  filterChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  filterChipTextActive: {
    color: colors.neutral.white,
  },
  filterChipBadge: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  filterChipBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterChipBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.gray700,
  },
  filterChipBadgeTextActive: {
    color: colors.neutral.white,
  },
  clientsList: {
    flex: 1,
  },
  clientsListContent: {
    padding: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    gap: spacing.lg,
  },
  clientCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  clientHeader: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  clientAvatarBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2196F3',
  },
  clientInfo: {
    flex: 1,
  },
  clientTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.gray900,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  clientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  clientEmail: {
    fontSize: 14,
    color: colors.neutral.gray600,
  },
  clientPhone: {
    fontSize: 14,
    color: colors.neutral.gray600,
  },
  clientStats: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: colors.neutral.gray500,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.gray900,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.neutral.gray200,
    marginHorizontal: spacing.sm,
  },
  notesSection: {
    backgroundColor: colors.primary[50],
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  notesText: {
    fontSize: 14,
    color: colors.neutral.gray700,
    lineHeight: 20,
  },
  clientActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    gap: spacing.xs,
  },
  actionButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  actionButtonTextPrimary: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: 15,
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
});
