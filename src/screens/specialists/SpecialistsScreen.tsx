/**
 * SpecialistsScreen
 * Browse and search specialists with filters and sorting
 * Displays all specialist cards with affinity percentages
 *
 * LAYOUT STRUCTURE:
 * - Header with title
 * - Search bar (full width, gray background)
 * - Filters and Sort row (horizontal with space-between)
 * - Tabs (Especialistas | Publicaciones)
 * - Scrollable list of ALL specialist cards
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SpecialistCard } from '../../components/features/SpecialistCard';
import { colors, spacing, typography, borderRadius } from '../../constants/colors';
import { mockSpecialists } from '../../utils/mockData';
import { SortOption, Specialist } from '../../constants/types';

const SpecialistsScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('affinity');
  const [activeTab, setActiveTab] = useState<'specialists' | 'posts'>('specialists');

  const handleSpecialistPress = (specialistId: string) => {
    Alert.alert(
      'Perfil del Especialista',
      `Ver detalles del especialista ${specialistId}. Esta funcionalidad se implementará próximamente.`,
      [{ text: 'Entendido' }]
    );
  };

  const handleFilters = () => {
    Alert.alert(
      'Filtros',
      'Filtrar por: especialización, rango de precio, disponibilidad, idiomas, etc.',
      [{ text: 'Entendido' }]
    );
  };

  const handleSort = () => {
    Alert.alert(
      'Ordenar por',
      'Selecciona un criterio de ordenación',
      [
        { text: 'Afinidad (Recomendado)', onPress: () => setSortOption('affinity') },
        { text: 'Mejor valorados', onPress: () => setSortOption('rating') },
        { text: 'Precio más bajo', onPress: () => setSortOption('price_low') },
        { text: 'Precio más alto', onPress: () => setSortOption('price_high') },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const getSortLabel = () => {
    switch (sortOption) {
      case 'affinity':
        return 'Afinidad (Recomendado)';
      case 'rating':
        return 'Mejor valorados';
      case 'price_low':
        return 'Precio: Menor a Mayor';
      case 'price_high':
        return 'Precio: Mayor a Menor';
      default:
        return 'Ordenar por';
    }
  };

  // Filter specialists based on search query
  const filteredSpecialists = mockSpecialists.filter((specialist) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      specialist.name.toLowerCase().includes(query) ||
      specialist.specialization.toLowerCase().includes(query) ||
      specialist.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Render header for FlatList (results count)
  const renderListHeader = () => {
    if (activeTab !== 'specialists' || filteredSpecialists.length === 0) return null;
    return (
      <Text style={styles.resultsText}>
        {filteredSpecialists.length} especialista{filteredSpecialists.length !== 1 ? 's' : ''} encontrado{filteredSpecialists.length !== 1 ? 's' : ''}
      </Text>
    );
  };

  // Render specialist card item
  const renderSpecialistItem = ({ item }: { item: Specialist }) => (
    <SpecialistCard
      specialist={item}
      onPress={() => handleSpecialistPress(item.id)}
    />
  );

  // Empty state for no results
  const renderEmptySpecialists = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="search"
        size={64}
        color={colors.neutral.gray300}
      />
      <Text style={styles.emptyTitle}>No se encontraron resultados</Text>
      <Text style={styles.emptyDescription}>
        Intenta con otros términos de búsqueda o ajusta tus filtros
      </Text>
    </View>
  );

  // Empty state for posts tab
  const renderEmptyPosts = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text" size={64} color={colors.neutral.gray300} />
      <Text style={styles.emptyTitle}>Próximamente</Text>
      <Text style={styles.emptyDescription}>
        Publicaciones y artículos de especialistas estarán disponibles pronto
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar - Full Width with Gray Background */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.neutral.gray600} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar especialistas, temas, síntomas..."
            placeholderTextColor={colors.neutral.gray600}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.neutral.gray600} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters and Sort Row - Horizontal with Space Between */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterButton} onPress={handleFilters}>
            <Ionicons name="options" size={18} color={colors.neutral.gray900} />
            <Text style={styles.filterButtonText}>Filtros</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sortButton} onPress={handleSort}>
            <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.neutral.gray600} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs - Especialistas | Publicaciones */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'specialists' && styles.tabActive]}
          onPress={() => setActiveTab('specialists')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'specialists' && styles.tabTextActive,
            ]}
          >
            Especialistas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Text
            style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}
          >
            Publicaciones
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content - FlatList for better performance with all specialists */}
      {activeTab === 'specialists' ? (
        <FlatList
          data={filteredSpecialists}
          renderItem={renderSpecialistItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptySpecialists}
          removeClippedSubviews={false}
          initialNumToRender={10}
        />
      ) : (
        <View style={styles.postsContainer}>
          {renderEmptyPosts()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  searchSection: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral.gray900,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    gap: spacing.xs,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    gap: spacing.xs,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.gray700,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    gap: spacing.lg,
  },
  tab: {
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary.main,
  },
  tabText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
    color: colors.neutral.gray600,
  },
  tabTextActive: {
    color: colors.primary.main,
    fontWeight: typography.fontWeights.semibold,
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  postsContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  resultsText: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    marginBottom: spacing.md,
    fontWeight: typography.fontWeights.medium,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.neutral.gray900,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
});

export default SpecialistsScreen;
