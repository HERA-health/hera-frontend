import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  borderRadius,
  shadows,
  spacing,
  typography,
} from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { Client, RootStackParamList } from '../../constants/types';
import { AnimatedPressable, Button, Card } from '../../components/common';
import { BrandText } from '../../components/common/BrandText';
import { useTheme } from '../../contexts/ThemeContext';
import * as professionalService from '../../services/professionalService';
import { questionnaire } from '../../utils/questionnaireData';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfessionalClients'>;
type ViewMode = 'cards' | 'list';
type DateFilter = 'this_week' | 'this_month' | 'all';
type StatusFilter = 'active' | 'paused' | 'archived' | 'all';

interface ExtendedClient extends Client {
  tags?: string[];
  startDate?: Date;
  archived?: boolean;
  completedSessions?: number;
}

interface FilterOption<T extends string> {
  label: string;
  value: T;
}

const DATE_FILTER_OPTIONS: FilterOption<DateFilter>[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Esta semana', value: 'this_week' },
  { label: 'Este mes', value: 'this_month' },
];

const STATUS_FILTER_OPTIONS: FilterOption<StatusFilter>[] = [
  { label: 'Activos', value: 'active' },
  { label: 'En pausa', value: 'paused' },
  { label: 'Archivados', value: 'archived' },
  { label: 'Todos', value: 'all' },
];

function formatShortDate(date?: Date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function formatLongDate(date?: Date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function isWithinThisWeek(date: Date) {
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return date <= weekEnd;
}

function isWithinThisMonth(date: Date) {
  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return date <= monthEnd;
}

function getStatusLabel(status: StatusFilter | ExtendedClient['status'], archived?: boolean) {
  if (archived) return 'Archivado';
  if (status === 'active') return 'Activo';
  if (status === 'inactive' || status === 'paused') return 'En pausa';
  return 'Activo';
}

function getClientTagsFromQuestionnaire(answers?: unknown): string[] {
  if (!answers || !Array.isArray(answers)) return [];

  const specialtiesQuestion = questionnaire.find((item) => item.category === 'specialties');
  if (!specialtiesQuestion) return [];

  const specialtyAnswer = answers.find((answer) => {
    if (!answer || typeof answer !== 'object') return false;
    const safeAnswer = answer as { questionId?: string };
    return safeAnswer.questionId === specialtiesQuestion.id;
  }) as { answers?: string[] } | undefined;

  if (!specialtyAnswer?.answers?.length) return [];

  return specialtyAnswer.answers
    .map((value) => {
      const option = specialtiesQuestion.options.find((item) => item.value === value || item.id === value);
      return option?.text || value;
    })
    .slice(0, 3);
}

function FilterDropdown<T extends string>({
  icon,
  label,
  options,
  value,
  open,
  onToggle,
  onSelect,
  styles,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  options: FilterOption<T>[];
  value: T;
  open: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label || label;

  return (
    <View style={[styles.filterField, open ? styles.filterFieldRaised : null]}>
      <AnimatedPressable
        onPress={onToggle}
        style={styles.filterButton}
        hoverLift={false}
        pressScale={0.98}
      >
        <Ionicons name={icon} size={18} color={theme.textSecondary} />
        <Text style={styles.filterButtonText}>{selectedLabel}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.textSecondary}
        />
      </AnimatedPressable>

      {open ? (
        <View style={styles.dropdownMenu}>
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <AnimatedPressable
                key={option.value}
                onPress={() => onSelect(option.value)}
                style={isActive ? [styles.dropdownItem, styles.dropdownItemActive] : styles.dropdownItem}
                hoverLift={false}
                pressScale={0.99}
              >
                <Text
                  style={isActive ? [styles.dropdownItemText, styles.dropdownItemTextActive] : styles.dropdownItemText}
                >
                  {option.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function ProfessionalClientsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;
  const columns = isDesktop ? 3 : isTablet ? 2 : 1;

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ExtendedClient[]>([]);
  const [openFilter, setOpenFilter] = useState<'date' | 'status' | null>(null);

  const navigateToClient = useCallback(
    (clientId: string) => {
      setOpenFilter(null);
      navigation.navigate('ClientProfile', { clientId });
    },
    [navigation],
  );

  const loadClients = useCallback(async () => {
    try {
      const data = await professionalService.getProfessionalClients();
      const mappedClients: ExtendedClient[] = data.map((client) => {
        const sessions = client.sessions || [];
        const completedSessions = sessions.filter(
          (session) => session.status === 'COMPLETED' || session.status === 'completed',
        ).length;
        const upcomingSessions = sessions
          .filter((session) => new Date(session.date) > new Date())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const nextSession = upcomingSessions[0] ? new Date(upcomingSessions[0].date) : undefined;
        const lastSession = sessions[0]?.date ? new Date(sessions[0].date) : undefined;

        return {
          id: client.id,
          name: client.user?.name || 'Cliente',
          email: client.user?.email || '',
          phone: client.user?.phone || '',
          initial: (client.user?.name || 'C')[0].toUpperCase(),
          status: 'active',
          lastSession,
          totalSessions: sessions.length,
          completedSessions,
          nextSession,
          tags: getClientTagsFromQuestionnaire(client.questionnaireAnswers),
          startDate: client.createdAt ? new Date(client.createdAt) : undefined,
          archived: false,
          user: client.user,
          sessions,
        };
      });
      setClients(mappedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = client.status === 'active' && !client.archived;
      } else if (statusFilter === 'paused') {
        matchesStatus = client.status === 'inactive';
      } else if (statusFilter === 'archived') {
        matchesStatus = client.archived === true;
      }

      let matchesDate = true;
      if (dateFilter !== 'all' && client.nextSession) {
        matchesDate =
          dateFilter === 'this_week'
            ? isWithinThisWeek(new Date(client.nextSession))
            : isWithinThisMonth(new Date(client.nextSession));
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [clients, dateFilter, searchQuery, statusFilter]);

  const activeClients = useMemo(
    () => clients.filter((client) => client.status === 'active' && !client.archived).length,
    [clients],
  );

  const sessionsThisWeek = useMemo(() => {
    return clients.reduce((total, client) => {
      if (client.nextSession && isWithinThisWeek(new Date(client.nextSession))) {
        return total + 1;
      }
      return total;
    }, 0);
  }, [clients]);

  const getCardWidth = () => {
    const containerWidth = Math.min(width - spacing.lg * 2, 1200 - spacing.lg * 2);
    const gapTotal = (columns - 1) * spacing.lg;
    return (containerWidth - gapTotal) / columns;
  };

  const renderClientAvatar = (client: ExtendedClient, size: 'large' | 'small' = 'large') => {
    const avatarStyle = size === 'large' ? styles.avatar : styles.rowAvatar;
    const avatarImageStyle = size === 'large' ? styles.avatarImage : styles.rowAvatarImage;
    const avatarTextStyle = size === 'large' ? styles.avatarText : styles.rowAvatarText;

    if (client.avatar || client.user?.avatar) {
      return (
        <Image
          source={{ uri: client.user?.avatar || client.avatar }}
          style={avatarImageStyle}
        />
      );
    }

    return (
      <View style={avatarStyle}>
        <Text style={avatarTextStyle}>{client.initial}</Text>
      </View>
    );
  };

  const renderSkeletonCard = (index: number) => (
    <View
      key={`skeleton-${index}`}
      style={[
        styles.clientCard,
        styles.skeletonCard,
        { width: columns === 1 ? '100%' : getCardWidth() },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, styles.skeletonBlock]} />
        <View style={styles.headerInfo}>
          <View style={[styles.skeletonLine, { width: '60%', height: 18 }]} />
          <View style={[styles.skeletonLine, { width: '40%', height: 14, marginTop: 8 }]} />
        </View>
      </View>
      <View style={styles.cardStats}>
        <View style={[styles.skeletonLine, { width: '75%', height: 14 }]} />
        <View style={[styles.skeletonLine, { width: '55%', height: 14, marginTop: 8 }]} />
      </View>
      <View style={styles.tagsContainer}>
        <View style={styles.skeletonTag} />
        <View style={styles.skeletonTag} />
      </View>
      <View style={styles.cardActions}>
        <View style={[styles.skeletonLine, { width: '100%', height: 40, borderRadius: borderRadius.md }]} />
      </View>
    </View>
  );

  const renderClientCard = (client: ExtendedClient) => (
    <Card
      key={client.id}
      variant="default"
      padding="large"
      onPress={() => navigateToClient(client.id)}
      hoverLift
      style={[
        styles.clientCard,
        { width: columns === 1 ? '100%' : getCardWidth() },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          {renderClientAvatar(client)}
          {client.status === 'active' ? <View style={styles.onlineIndicator} /> : null}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.clientName}>{client.name}</Text>
          {client.nextSession ? (
            <View style={styles.nextSessionRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.primary} />
              <Text style={styles.nextSessionText}>Próxima: {formatShortDate(client.nextSession)}</Text>
            </View>
          ) : client.lastSession ? (
            <View style={styles.nextSessionRow}>
              <Ionicons name="time-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.nextSessionText, styles.nextSessionMuted]}>
                Última: {formatShortDate(client.lastSession)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.cardStats}>
        <Text style={styles.statsText}>
          Sesiones: <Text style={styles.statsValue}>{client.completedSessions || 0} completadas</Text>
        </Text>
        <Text style={styles.statsText}>
          Desde: <Text style={styles.statsValue}>{formatLongDate(client.startDate)}</Text>
        </Text>
      </View>

      {client.tags?.length ? (
        <View style={styles.tagsContainer}>
          {client.tags.slice(0, 3).map((tag) => (
            <View key={`${client.id}-${tag}`} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {client.tags.length > 3 ? (
            <View style={styles.tagMore}>
              <Text style={styles.tagMoreText}>+{client.tags.length - 3}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.cardActions}>
        <View style={styles.cardButtonSlot}>
          <Button
            variant="outline"
            size="medium"
            onPress={() => navigateToClient(client.id)}
            fullWidth
            icon={<Ionicons name="arrow-forward" size={16} color={theme.primary} />}
            iconPosition="right"
          >
            Ver ficha
          </Button>
        </View>
        <AnimatedPressable
          style={styles.menuButton}
          onPress={() => navigateToClient(client.id)}
          hoverLift={false}
          pressScale={0.98}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.textSecondary} />
        </AnimatedPressable>
      </View>
    </Card>
  );

  const renderClientRow = (client: ExtendedClient) => (
    <AnimatedPressable
      key={client.id}
      style={styles.listRow}
      onPress={() => navigateToClient(client.id)}
      hoverLift={false}
      pressScale={0.99}
    >
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: client.status === 'active' ? theme.success : theme.textMuted },
          ]}
        />
        {renderClientAvatar(client, 'small')}
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{client.name}</Text>
          <Text style={styles.rowEmail}>{client.email}</Text>
        </View>
      </View>

      {!isMobile ? (
        <>
          <View style={styles.rowCell}>
            <Text style={styles.rowCellText}>
              {client.nextSession ? formatShortDate(client.nextSession) : '-'}
            </Text>
          </View>
          <View style={styles.rowCell}>
            <Text style={styles.rowCellText}>{client.completedSessions || 0}</Text>
          </View>
          <View style={styles.rowCell}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    client.status === 'active' ? theme.primaryAlpha12 : theme.surfaceMuted,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: client.status === 'active' ? theme.primary : theme.textSecondary },
                ]}
              >
                {getStatusLabel(client.status, client.archived)}
              </Text>
            </View>
          </View>
        </>
      ) : null}

      <View style={styles.rowAction}>
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      </View>
    </AnimatedPressable>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={[styles.skeletonLine, { width: 180, height: 30 }]} />
            <View style={[styles.skeletonLine, { width: 240, height: 14, marginTop: 10 }]} />
          </View>
        </View>
        <View style={styles.controlsContainer}>
          <View style={styles.controlsRow}>
            <View style={[styles.searchContainer, styles.skeletonBlock]} />
          </View>
        </View>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.cardsGrid}>
            {Array.from({ length: 6 }, (_, index) => renderSkeletonCard(index))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextBlock}>
            <BrandText style={styles.headerTitle}>Mis Pacientes</BrandText>
            <Text style={styles.headerSubtitle}>
              {activeClients} pacientes activos · {sessionsThisWeek} sesiones esta semana
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={theme.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setOpenFilter(null)}
            />
            {searchQuery ? (
              <AnimatedPressable onPress={() => setSearchQuery('')} hoverLift={false} pressScale={0.95}>
                <Ionicons name="close-circle" size={20} color={theme.textMuted} />
              </AnimatedPressable>
            ) : null}
          </View>

          <FilterDropdown
            icon="calendar-outline"
            label="Todos"
            options={DATE_FILTER_OPTIONS}
            value={dateFilter}
            open={openFilter === 'date'}
            onToggle={() => setOpenFilter((prev) => (prev === 'date' ? null : 'date'))}
            onSelect={(value) => {
              setDateFilter(value);
              setOpenFilter(null);
            }}
            styles={styles}
            theme={theme}
          />

          <FilterDropdown
            icon="funnel-outline"
            label="Activos"
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            open={openFilter === 'status'}
            onToggle={() => setOpenFilter((prev) => (prev === 'status' ? null : 'status'))}
            onSelect={(value) => {
              setStatusFilter(value);
              setOpenFilter(null);
            }}
            styles={styles}
            theme={theme}
          />

          <View style={styles.viewToggle}>
            <AnimatedPressable
              style={viewMode === 'cards' ? [styles.viewButton, styles.viewButtonActive] : styles.viewButton}
              onPress={() => setViewMode('cards')}
              hoverLift={false}
              pressScale={0.98}
            >
              <Ionicons
                name="grid-outline"
                size={20}
                color={viewMode === 'cards' ? theme.textOnPrimary : theme.textSecondary}
              />
            </AnimatedPressable>
            <AnimatedPressable
              style={viewMode === 'list' ? [styles.viewButton, styles.viewButtonActive] : styles.viewButton}
              onPress={() => setViewMode('list')}
              hoverLift={false}
              pressScale={0.98}
            >
              <Ionicons
                name="list-outline"
                size={20}
                color={viewMode === 'list' ? theme.textOnPrimary : theme.textSecondary}
              />
            </AnimatedPressable>
          </View>
        </View>

        {searchQuery ? (
          <Text style={styles.resultsCount}>
            Mostrando {filteredClients.length} de {clients.length} pacientes
          </Text>
        ) : null}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setOpenFilter(null)}
      >
        {filteredClients.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={searchQuery ? 'search-outline' : 'people-outline'}
                size={48}
                color={theme.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No encontramos pacientes' : 'Aún no tienes pacientes'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery
                ? 'Prueba ajustando la búsqueda o los filtros.'
                : 'Tus clientes aparecerán aquí cuando reserven su primera sesión contigo.'}
            </Text>
            {searchQuery ? (
              <View style={styles.clearFiltersButtonWrap}>
                <Button
                  variant="secondary"
                  size="medium"
                  onPress={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setDateFilter('all');
                  }}
                >
                  Limpiar filtros
                </Button>
              </View>
            ) : null}
          </View>
        ) : viewMode === 'cards' ? (
          <View style={styles.cardsGrid}>{filteredClients.map(renderClientCard)}</View>
        ) : (
          <View style={styles.listContainer}>
            {!isMobile ? (
              <View style={styles.listHeader}>
                <Text style={[styles.listHeaderCell, styles.listHeaderCellWide]}>Cliente</Text>
                <Text style={styles.listHeaderCell}>Próxima sesión</Text>
                <Text style={styles.listHeaderCell}>Sesiones</Text>
                <Text style={styles.listHeaderCell}>Estado</Text>
                <View style={styles.listHeaderActionSpacer} />
              </View>
            ) : null}
            {filteredClients.map(renderClientRow)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    header: {
      backgroundColor: theme.bgAlt,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerContent: {
      maxWidth: 1200,
      width: '100%',
      alignSelf: 'center',
    },
    headerTextBlock: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    headerTitle: {
      fontSize: 28,
      color: theme.textPrimary,
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: typography.fontSizes.sm,
      color: theme.textSecondary,
      textAlign: 'center',
      fontFamily: theme.fontSans,
    },
    controlsContainer: {
      backgroundColor: theme.bgAlt,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      zIndex: 40,
    },
    controlsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.sm,
      maxWidth: 1200,
      width: '100%',
      alignSelf: 'center',
      zIndex: 50,
    },
    searchContainer: {
      flex: 1,
      minWidth: 220,
      maxWidth: 360,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 2,
    },
    searchInput: {
      flex: 1,
      marginLeft: spacing.sm,
      fontSize: typography.fontSizes.md,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
    },
    filterField: {
      position: 'relative',
      minWidth: 150,
      zIndex: 60,
    },
    filterFieldRaised: {
      zIndex: 80,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      gap: spacing.xs,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 2,
    },
    filterButtonText: {
      flex: 1,
      fontSize: typography.fontSizes.sm,
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
    },
    dropdownMenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: spacing.xs,
      backgroundColor: theme.bgElevated,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadowNeutral,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius: 18,
      elevation: 10,
      zIndex: 200,
      overflow: 'hidden',
    },
    dropdownItem: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    dropdownItemActive: {
      backgroundColor: theme.primaryAlpha12,
    },
    dropdownItemText: {
      fontSize: typography.fontSizes.sm,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    dropdownItemTextActive: {
      color: theme.primary,
      fontFamily: theme.fontSansSemiBold,
    },
    viewToggle: {
      flexDirection: 'row',
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgCard,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 2,
    },
    viewButton: {
      padding: spacing.sm + 2,
      backgroundColor: theme.bgCard,
    },
    viewButtonActive: {
      backgroundColor: theme.primary,
    },
    resultsCount: {
      marginTop: spacing.sm,
      maxWidth: 1200,
      width: '100%',
      alignSelf: 'center',
      fontSize: typography.fontSizes.sm,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.lg,
      maxWidth: 1200,
      width: '100%',
      alignSelf: 'center',
    },
    cardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.lg,
      justifyContent: 'flex-start',
    },
    clientCard: {
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
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
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.primaryAlpha12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    avatarImage: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 1,
      borderColor: theme.border,
    },
    avatarText: {
      fontSize: 28,
      color: theme.primary,
      fontFamily: theme.fontSansBold,
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 4,
      right: 2,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.success,
      borderWidth: 2,
      borderColor: theme.bgCard,
    },
    headerInfo: {
      flex: 1,
      justifyContent: 'center',
      gap: 4,
    },
    clientName: {
      fontSize: 18,
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
    },
    nextSessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    nextSessionText: {
      fontSize: typography.fontSizes.sm,
      color: theme.primary,
      fontFamily: theme.fontSans,
    },
    nextSessionMuted: {
      color: theme.textMuted,
    },
    cardStats: {
      marginBottom: spacing.md,
      gap: 2,
    },
    statsText: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 22,
      fontFamily: theme.fontSans,
    },
    statsValue: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    tag: {
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    tagText: {
      fontSize: 12,
      color: theme.textSecondary,
      fontFamily: theme.fontSansMedium,
    },
    tagMore: {
      backgroundColor: theme.primaryAlpha12,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    tagMoreText: {
      fontSize: 12,
      color: theme.primary,
      fontFamily: theme.fontSansSemiBold,
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingTop: spacing.md,
      marginTop: spacing.xs,
    },
    cardButtonSlot: {
      flex: 1,
    },
    menuButton: {
      width: 42,
      height: 42,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderWidth: 1,
      borderColor: theme.border,
    },
    listContainer: {
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      ...shadows.sm,
    },
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    listHeaderCell: {
      flex: 1,
      fontSize: 12,
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontFamily: theme.fontSansSemiBold,
    },
    listHeaderCellWide: {
      flex: 2,
    },
    listHeaderActionSpacer: {
      width: 40,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      backgroundColor: theme.bgCard,
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
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primaryAlpha12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rowAvatarImage: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rowAvatarText: {
      fontSize: 17,
      color: theme.primary,
      fontFamily: theme.fontSansBold,
    },
    rowInfo: {
      flex: 1,
    },
    rowName: {
      fontSize: typography.fontSizes.md,
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
    },
    rowEmail: {
      fontSize: 13,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
    },
    rowCell: {
      flex: 1,
      alignItems: 'flex-start',
    },
    rowCellText: {
      fontSize: typography.fontSizes.sm,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    statusBadgeText: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
    },
    rowAction: {
      width: 40,
      alignItems: 'center',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxxl * 2,
    },
    emptyIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.primaryAlpha12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: typography.fontSizes.lg,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
      textAlign: 'center',
      fontFamily: theme.fontSansBold,
    },
    emptyDescription: {
      fontSize: typography.fontSizes.md,
      color: theme.textSecondary,
      textAlign: 'center',
      maxWidth: 320,
      fontFamily: theme.fontSans,
    },
    clearFiltersButtonWrap: {
      marginTop: spacing.lg,
    },
    skeletonCard: {
      opacity: 0.8,
    },
    skeletonBlock: {
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderColor: theme.borderLight,
    },
    skeletonLine: {
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      borderRadius: borderRadius.md,
    },
    skeletonTag: {
      width: 72,
      height: 28,
      borderRadius: borderRadius.full,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
    },
  });
}
