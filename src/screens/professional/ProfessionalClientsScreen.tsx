/**
 * ProfessionalClientsScreen - "Mis Clientes"
 *
 * PROFESSIONAL MEDICAL CRM for Specialists
 *
 * Features:
 * - Card/List view toggle
 * - Responsive grid (3/2/1 columns)
 * - Search and filters
 * - Client detail modal
 * - #F5F7F5 background
 * - Professional medical tool aesthetic
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Modal,
  Animated,
  useWindowDimensions,
  Platform,
  Image,
} from 'react-native';
import { heraLanding, colors, spacing, typography, shadows } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as professionalService from '../../services/professionalService';
import { Client, RootStackParamList } from '../../constants/types';
import { BrandText } from '../../components/common/BrandText';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfessionalClients'>;

// Extended client type with tags
interface ExtendedClient extends Client {
  tags?: string[];
  startDate?: Date;
  archived?: boolean;
}

// View mode type
type ViewMode = 'cards' | 'list';

// Date filter type
type DateFilter = 'this_week' | 'this_month' | 'all';

// Status filter type
type StatusFilter = 'active' | 'paused' | 'archived' | 'all';

export function ProfessionalClientsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { width: screenWidth } = useWindowDimensions();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ExtendedClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<ExtendedClient | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Responsive breakpoints
  const isDesktop = screenWidth >= 1024;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isMobile = screenWidth < 768;

  // Calculate columns
  const columns = isDesktop ? 3 : isTablet ? 2 : 1;

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await professionalService.getProfessionalClients();
      // Map API data with extended fields
      const mappedClients: ExtendedClient[] = data.map(c => ({
        id: c.id,
        name: c.user?.name || 'Cliente',
        email: c.user?.email || '',
        phone: '',
        initial: (c.user?.name || 'C')[0].toUpperCase(),
        status: 'active' as const,
        lastSession: c.sessions?.[0]?.scheduledDate ? new Date(c.sessions[0].scheduledDate) : undefined,
        totalSessions: c.sessions?.length || 0,
        nextSession: undefined,
        tags: ['Ansiedad', 'Individual'], // Mock tags
        startDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        archived: false,
      }));
      setClients(mappedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Search filter
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = client.status === 'active' && !client.archived;
      } else if (statusFilter === 'paused') {
        matchesStatus = client.status === 'inactive';
      } else if (statusFilter === 'archived') {
        matchesStatus = client.archived === true;
      }

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all' && client.nextSession) {
        const now = new Date();
        const sessionDate = new Date(client.nextSession);
        if (dateFilter === 'this_week') {
          const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          matchesDate = sessionDate <= weekEnd;
        } else if (dateFilter === 'this_month') {
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          matchesDate = sessionDate <= monthEnd;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [clients, searchQuery, statusFilter, dateFilter]);

  // Stats
  const activeClients = clients.filter(c => c.status === 'active' && !c.archived).length;
  const sessionsThisWeek = clients.reduce((acc, c) => {
    if (c.nextSession) {
      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date(c.nextSession) <= weekEnd) return acc + 1;
    }
    return acc;
  }, 0);

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const formatFullDate = (date?: Date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatStartDate = (date?: Date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const openClientModal = (client: ExtendedClient) => {
    setSelectedClient(client);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedClient(null);
  };

  // Calculate card width based on columns
  const getCardWidth = () => {
    const containerWidth = Math.min(screenWidth - (spacing.lg * 2), 1200 - (spacing.lg * 2));
    const gapTotal = (columns - 1) * spacing.lg;
    return (containerWidth - gapTotal) / columns;
  };

  // Skeleton Card component for loading state
  const SkeletonCard = () => (
    <View style={[styles.clientCard, styles.skeletonCard, { width: columns === 1 ? '100%' : getCardWidth() }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, styles.skeleton]} />
        <View style={styles.headerInfo}>
          <View style={[styles.skeletonLine, { width: '60%', height: 18 }]} />
          <View style={[styles.skeletonLine, { width: '40%', height: 14, marginTop: 8 }]} />
        </View>
      </View>
      <View style={styles.cardStats}>
        <View style={[styles.skeletonLine, { width: '70%', height: 14 }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 14, marginTop: 8 }]} />
      </View>
      <View style={styles.tagsContainer}>
        <View style={[styles.skeletonTag]} />
        <View style={[styles.skeletonTag]} />
      </View>
      <View style={[styles.cardActions, { borderTopColor: 'transparent' }]}>
        <View style={[styles.skeletonLine, { width: '100%', height: 36, borderRadius: 8 }]} />
      </View>
    </View>
  );

  // Loading state with skeleton cards
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={[styles.skeletonLine, { width: 180, height: 28 }]} />
            <View style={[styles.skeletonLine, { width: 250, height: 14, marginTop: 8 }]} />
          </View>
        </View>
        <View style={styles.controlsContainer}>
          <View style={styles.controlsRow}>
            <View style={[styles.searchContainer, { backgroundColor: heraLanding.primaryMuted }]} />
          </View>
        </View>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.cardsGrid}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Render client card
  const renderClientCard = (client: ExtendedClient) => (
    <TouchableOpacity
      key={client.id}
      style={[
        styles.clientCard,
        {
          width: columns === 1 ? '100%' : getCardWidth(),
          // @ts-ignore - web-only hover styles
          ...(Platform.OS === 'web' && {
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          })
        }
      ]}
      activeOpacity={0.95}
      onPress={() => openClientModal(client)}
    >
      {/* Avatar and Name */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          {client.avatar || client.user?.avatar ? (
            <Image
              source={{ uri: client.user?.avatar || client.avatar }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{client.initial}</Text>
            </View>
          )}
          {client.status === 'active' && (
            <View style={styles.onlineIndicator} />
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.clientName}>{client.name}</Text>
          {client.nextSession ? (
            <View style={styles.nextSessionRow}>
              <Ionicons name="calendar" size={14} color={heraLanding.primary} />
              <Text style={styles.nextSessionText}>
                Próxima: {formatFullDate(client.nextSession)}
              </Text>
            </View>
          ) : client.lastSession ? (
            <View style={styles.nextSessionRow}>
              <Ionicons name="checkmark-circle" size={14} color={heraLanding.textMuted} />
              <Text style={[styles.nextSessionText, { color: heraLanding.textMuted }]}>
                Última: {formatDate(client.lastSession)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.cardStats}>
        <Text style={styles.statsText}>
          Sesiones: <Text style={styles.statsValue}>{client.totalSessions} completadas</Text>
        </Text>
        <Text style={styles.statsText}>
          Desde: <Text style={styles.statsValue}>{formatStartDate(client.startDate)}</Text>
        </Text>
      </View>

      {/* Tags */}
      {client.tags && client.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {client.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {client.tags.length > 3 && (
            <View style={styles.tagMore}>
              <Text style={styles.tagMoreText}>+{client.tags.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => openClientModal(client)}
        >
          <Text style={styles.primaryButtonText}>Ver ficha</Text>
          <Ionicons name="arrow-forward" size={16} color={heraLanding.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => {/* Show actions menu */}}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={heraLanding.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Render client list row
  const renderClientRow = (client: ExtendedClient) => (
    <TouchableOpacity
      key={client.id}
      style={styles.listRow}
      activeOpacity={0.8}
      onPress={() => openClientModal(client)}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.statusDot, {
          backgroundColor: client.status === 'active'
            ? heraLanding.success
            : heraLanding.textMuted
        }]} />
        {client.avatar || client.user?.avatar ? (
          <Image
            source={{ uri: client.user?.avatar || client.avatar }}
            style={styles.rowAvatarImage}
          />
        ) : (
          <View style={styles.rowAvatar}>
            <Text style={styles.rowAvatarText}>{client.initial}</Text>
          </View>
        )}
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{client.name}</Text>
          <Text style={styles.rowEmail}>{client.email}</Text>
        </View>
      </View>

      {!isMobile && (
        <>
          <View style={styles.rowCell}>
            <Text style={styles.rowCellText}>
              {client.nextSession ? formatDate(client.nextSession) : '-'}
            </Text>
          </View>
          <View style={styles.rowCell}>
            <Text style={styles.rowCellText}>{client.totalSessions}</Text>
          </View>
          <View style={styles.rowCell}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: client.status === 'active'
                ? `${heraLanding.success}20`
                : `${heraLanding.textMuted}20`
              }
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: client.status === 'active'
                  ? heraLanding.success
                  : heraLanding.textMuted
                }
              ]}>
                {client.status === 'active' ? 'Activo' : 'Pausa'}
              </Text>
            </View>
          </View>
        </>
      )}

      <TouchableOpacity style={styles.rowAction}>
        <Ionicons name="chevron-forward" size={20} color={heraLanding.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <BrandText style={styles.headerTitle}>Mis Clientes</BrandText>
            <Text style={styles.headerSubtitle}>
              {activeClients} clientes activos  •  {sessionsThisWeek} sesiones esta semana
            </Text>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={heraLanding.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre..."
              placeholderTextColor={heraLanding.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={heraLanding.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Date Filter */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => {
                setShowDateDropdown(!showDateDropdown);
                setShowStatusDropdown(false);
              }}
            >
              <Ionicons name="calendar-outline" size={18} color={heraLanding.textSecondary} />
              <Text style={styles.filterButtonText}>
                {dateFilter === 'this_week' ? 'Esta semana' :
                 dateFilter === 'this_month' ? 'Este mes' : 'Todos'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={heraLanding.textSecondary} />
            </TouchableOpacity>

            {showDateDropdown && (
              <View style={styles.dropdown}>
                {(['this_week', 'this_month', 'all'] as DateFilter[]).map(filter => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.dropdownItem,
                      dateFilter === filter && styles.dropdownItemActive
                    ]}
                    onPress={() => {
                      setDateFilter(filter);
                      setShowDateDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      dateFilter === filter && styles.dropdownItemTextActive
                    ]}>
                      {filter === 'this_week' ? 'Esta semana' :
                       filter === 'this_month' ? 'Este mes' : 'Todos'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Status Filter */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowDateDropdown(false);
              }}
            >
              <Ionicons name="funnel-outline" size={18} color={heraLanding.textSecondary} />
              <Text style={styles.filterButtonText}>
                {statusFilter === 'active' ? 'Activos' :
                 statusFilter === 'paused' ? 'En pausa' :
                 statusFilter === 'archived' ? 'Archivados' : 'Todos'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={heraLanding.textSecondary} />
            </TouchableOpacity>

            {showStatusDropdown && (
              <View style={styles.dropdown}>
                {(['active', 'paused', 'archived', 'all'] as StatusFilter[]).map(filter => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.dropdownItem,
                      statusFilter === filter && styles.dropdownItemActive
                    ]}
                    onPress={() => {
                      setStatusFilter(filter);
                      setShowStatusDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      statusFilter === filter && styles.dropdownItemTextActive
                    ]}>
                      {filter === 'active' ? 'Activos' :
                       filter === 'paused' ? 'En pausa' :
                       filter === 'archived' ? 'Archivados' : 'Todos'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* View Toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'cards' && styles.viewButtonActive]}
              onPress={() => setViewMode('cards')}
            >
              <Ionicons
                name="grid-outline"
                size={20}
                color={viewMode === 'cards' ? heraLanding.textOnPrimary : heraLanding.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons
                name="list-outline"
                size={20}
                color={viewMode === 'list' ? heraLanding.textOnPrimary : heraLanding.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Results count */}
        {searchQuery && (
          <Text style={styles.resultsCount}>
            Mostrando {filteredClients.length} de {clients.length} clientes
          </Text>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredClients.length === 0 ? (
          // Empty state
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={searchQuery ? 'search' : 'people-outline'}
                size={48}
                color={heraLanding.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No encontramos clientes' : 'Aún no tienes clientes'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery
                ? 'Intenta ajustar los filtros o la búsqueda.'
                : 'Tus clientes aparecerán aquí cuando reserven su primera sesión contigo.'
              }
            </Text>
            {searchQuery && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setDateFilter('all');
                }}
              >
                <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : viewMode === 'cards' ? (
          // Card view
          <View style={styles.cardsGrid}>
            {filteredClients.map(renderClientCard)}
          </View>
        ) : (
          // List view
          <View style={styles.listContainer}>
            {/* List header */}
            {!isMobile && (
              <View style={styles.listHeader}>
                <Text style={[styles.listHeaderCell, { flex: 2 }]}>Cliente</Text>
                <Text style={styles.listHeaderCell}>Próxima sesión</Text>
                <Text style={styles.listHeaderCell}>Sesiones</Text>
                <Text style={styles.listHeaderCell}>Estado</Text>
                <View style={{ width: 40 }} />
              </View>
            )}
            {filteredClients.map(renderClientRow)}
          </View>
        )}
      </ScrollView>

      {/* Client Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
            {selectedClient && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
                    <Ionicons name="close" size={24} color={heraLanding.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Client Info */}
                <ScrollView
                  style={styles.modalScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalClientInfo}>
                    {selectedClient.avatar || selectedClient.user?.avatar ? (
                      <Image
                        source={{ uri: selectedClient.user?.avatar || selectedClient.avatar }}
                        style={styles.modalAvatarImage}
                      />
                    ) : (
                      <View style={styles.modalAvatar}>
                        <Text style={styles.modalAvatarText}>{selectedClient.initial}</Text>
                      </View>
                    )}
                    <BrandText style={styles.modalClientName}>{selectedClient.name}</BrandText>
                    <Text style={styles.modalClientSince}>
                      Cliente desde: {formatStartDate(selectedClient.startDate)}
                    </Text>
                  </View>

                  {/* Contact Info */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Contacto</Text>
                    <View style={styles.contactRow}>
                      <Ionicons name="mail-outline" size={18} color={heraLanding.textSecondary} />
                      <Text style={styles.contactText}>{selectedClient.email}</Text>
                    </View>
                    {selectedClient.phone && (
                      <View style={styles.contactRow}>
                        <Ionicons name="call-outline" size={18} color={heraLanding.textSecondary} />
                        <Text style={styles.contactText}>{selectedClient.phone}</Text>
                      </View>
                    )}
                  </View>

                  {/* Session Stats */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Estadísticas</Text>
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={styles.statBoxValue}>{selectedClient.totalSessions}</Text>
                        <Text style={styles.statBoxLabel}>Sesiones</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statBoxValue}>
                          {selectedClient.lastSession ? formatDate(selectedClient.lastSession) : '-'}
                        </Text>
                        <Text style={styles.statBoxLabel}>Última sesión</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statBoxValue}>
                          {selectedClient.nextSession ? formatDate(selectedClient.nextSession) : '-'}
                        </Text>
                        <Text style={styles.statBoxLabel}>Próxima sesión</Text>
                      </View>
                    </View>
                  </View>

                  {/* Tags */}
                  {selectedClient.tags && selectedClient.tags.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Temas de trabajo</Text>
                      <View style={styles.modalTagsContainer}>
                        {selectedClient.tags.map((tag, index) => (
                          <View key={index} style={styles.modalTag}>
                            <Text style={styles.modalTagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalActionButton}
                      onPress={() => {
                        closeModal();
                        navigation.navigate('ClientProfile', { clientId: selectedClient.id });
                      }}
                    >
                      <Ionicons name="person-outline" size={20} color={heraLanding.textOnPrimary} />
                      <Text style={styles.modalActionButtonText}>Ver perfil completo</Text>
                    </TouchableOpacity>

                    <View style={styles.modalSecondaryActions}>
                      <TouchableOpacity style={styles.modalSecondaryButton}>
                        <Ionicons name="chatbubble-outline" size={18} color={heraLanding.primary} />
                        <Text style={styles.modalSecondaryButtonText}>Mensaje</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalSecondaryButton}>
                        <Ionicons name="calendar-outline" size={18} color={heraLanding.primary} />
                        <Text style={styles.modalSecondaryButtonText}>Agendar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background, // #F5F7F5
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSizes.md,
    color: heraLanding.textSecondary,
  },

  // Header
  header: {
    backgroundColor: heraLanding.cardBg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  headerContent: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: heraLanding.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
  },

  // Controls
  controlsContainer: {
    backgroundColor: heraLanding.cardBg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  searchContainer: {
    flex: 1,
    minWidth: 200,
    maxWidth: 300,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: heraLanding.background,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: heraLanding.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.fontSizes.md,
    color: heraLanding.textPrimary,
  },
  filterContainer: {
    position: 'relative',
    zIndex: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: heraLanding.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: heraLanding.border,
    gap: spacing.xs,
  },
  filterButtonText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    backgroundColor: heraLanding.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: heraLanding.border,
    ...shadows.lg,
    zIndex: 100,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownItemActive: {
    backgroundColor: `${heraLanding.primary}15`,
  },
  dropdownItemText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
  },
  dropdownItemTextActive: {
    color: heraLanding.primary,
    fontWeight: '600',
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: heraLanding.border,
  },
  viewButton: {
    padding: spacing.sm + 2,
    backgroundColor: heraLanding.background,
  },
  viewButtonActive: {
    backgroundColor: heraLanding.primary,
  },
  resultsCount: {
    marginTop: spacing.sm,
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textMuted,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },

  // Cards Grid
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    justifyContent: 'flex-start',
  },
  clientCard: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: 12,
    padding: spacing.lg,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: heraLanding.background,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: heraLanding.background,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: heraLanding.success,
    borderWidth: 2,
    borderColor: heraLanding.cardBg,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: spacing.xs,
  },
  nextSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nextSessionText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.primary,
  },
  cardStats: {
    marginBottom: spacing.md,
  },
  statsText: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    lineHeight: 22,
  },
  statsValue: {
    color: heraLanding.textPrimary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: heraLanding.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },
  tagMore: {
    backgroundColor: heraLanding.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  tagMoreText: {
    fontSize: 12,
    color: heraLanding.primary,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: heraLanding.primary,
    gap: spacing.xs,
  },
  primaryButtonText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
    color: heraLanding.primary,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heraLanding.background,
  },

  // List View
  listContainer: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.sm,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: heraLanding.background,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  listHeaderCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: heraLanding.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
  },
  rowLeft: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rowAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  rowAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: heraLanding.primary,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: typography.fontSizes.md,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  rowEmail: {
    fontSize: 13,
    color: heraLanding.textMuted,
  },
  rowCell: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rowCellText: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rowAction: {
    width: 40,
    alignItems: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: typography.fontSizes.md,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  clearFiltersButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: heraLanding.primary,
    borderRadius: 8,
  },
  clearFiltersText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: 16,
    maxWidth: 500,
    width: '100%',
    maxHeight: '80%',
    ...shadows.xl,
  },
  modalContentMobile: {
    maxHeight: '90%',
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.borderLight,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heraLanding.background,
  },
  modalScroll: {
    flex: 1,
  },
  modalClientInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: heraLanding.primary,
  },
  modalAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: heraLanding.primary,
  },
  modalAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: heraLanding.primary,
  },
  modalClientName: {
    fontSize: 22,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalClientSince: {
    fontSize: typography.fontSizes.sm,
    color: heraLanding.textSecondary,
  },
  modalSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
  },
  modalSectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
    color: heraLanding.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  contactText: {
    fontSize: typography.fontSizes.md,
    color: heraLanding.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: heraLanding.background,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: spacing.xs,
  },
  statBoxLabel: {
    fontSize: 11,
    color: heraLanding.textMuted,
    textAlign: 'center',
  },
  modalTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  modalTag: {
    backgroundColor: heraLanding.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 16,
  },
  modalTagText: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    fontWeight: '500',
  },
  modalActions: {
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: heraLanding.primary,
    borderRadius: 12,
    gap: spacing.sm,
  },
  modalActionButtonText: {
    fontSize: typography.fontSizes.md,
    fontWeight: '600',
    color: heraLanding.textOnPrimary,
  },
  modalSecondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalSecondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: heraLanding.primary,
    gap: spacing.xs,
  },
  modalSecondaryButtonText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
    color: heraLanding.primary,
  },

  // Skeleton styles
  skeletonCard: {
    opacity: 0.7,
  },
  skeleton: {
    backgroundColor: heraLanding.primaryMuted,
  },
  skeletonLine: {
    backgroundColor: heraLanding.primaryMuted,
    borderRadius: 4,
  },
  skeletonTag: {
    width: 60,
    height: 24,
    backgroundColor: heraLanding.primaryMuted,
    borderRadius: 12,
  },
});
