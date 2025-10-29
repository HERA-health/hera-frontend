/**
 * ClientProfileScreen
 * Professional view of client profile with session history, notes, and progress tracking
 *
 * FEATURES:
 * - Client information and contact details
 * - Session history timeline
 * - Private therapist notes (encrypted)
 * - Progress tracking with visual indicators
 * - Matching profile and compatibility info
 * - Quick actions (schedule, message, notes)
 * - Professional gradient design
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GradientButton } from '../../components/common/GradientButton';
import { BrandText } from '../../components/common/BrandText';
import { StatusBadge } from '../../components/common/StatusBadge';
import { colors, spacing, typography } from '../../constants/colors';
import { api } from '../../services/api';

// Types
interface ClientProfileScreenProps {
  route: any;
  navigation: any;
}

interface ClientDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  matchingScore?: number;
  goals?: string[];
  mainConcerns?: string;
  therapeuticApproach?: string;
  communicationStyle?: string;
  status: 'active' | 'inactive' | 'pending';
}

interface Session {
  id: string;
  date: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending';
  notes?: string;
  type: 'video' | 'audio' | 'chat';
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

// Main Component
export const ClientProfileScreen: React.FC<ClientProfileScreenProps> = ({
  route,
  navigation,
}) => {
  console.log('🔍 ClientProfileScreen MOUNTED');
  console.log('📦 Route params:', route?.params);

  const { clientId } = route?.params || {};
  console.log('🆔 Client ID:', clientId);

  const { width } = useWindowDimensions();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'notes' | 'progress'>('info');

  useEffect(() => {
    loadClientProfile();
  }, [clientId]);

  const loadClientProfile = async () => {
    try {
      console.log('🔄 Loading client profile for ID:', clientId);
      setLoading(true);

      // For now, use mock data since backend isn't ready
      // TODO: Replace with actual API calls when backend is ready
      // const clientResponse = await api.get(`/clients/${clientId}`);
      // setClient(clientResponse.data.data);

      console.log('✅ Loading mock client data...');

      // Mock data for development
      const mockClient: ClientDetail = {
        id: clientId || 'mock-id',
        name: 'Ana María López',
        email: 'ana.lopez@email.com',
        phone: '+34 612 345 678',
        avatar: undefined,
        createdAt: '2024-08-15T10:00:00Z',
        matchingScore: 0.87,
        goals: [
          'Reducir niveles de ansiedad',
          'Mejorar autoestima y confianza',
          'Gestionar estrés laboral',
        ],
        mainConcerns: 'Ansiedad generalizada, estrés laboral, dificultades para dormir',
        therapeuticApproach: 'Cognitivo-conductual',
        communicationStyle: 'Directa y práctica',
        status: 'active',
      };

      console.log('✅ Mock client loaded:', mockClient.name);
      setClient(mockClient);

      // Mock sessions
      const mockSessions: Session[] = [
        {
          id: '1',
          date: '2024-10-25T10:00:00Z',
          duration: 50,
          status: 'completed',
          notes: 'Sesión muy productiva. Cliente mostró avances significativos en técnicas de respiración.',
          type: 'video',
        },
        {
          id: '2',
          date: '2024-10-18T10:00:00Z',
          duration: 50,
          status: 'completed',
          notes: 'Trabajamos en identificación de pensamientos automáticos negativos.',
          type: 'video',
        },
        {
          id: '3',
          date: '2024-10-11T10:00:00Z',
          duration: 50,
          status: 'completed',
          type: 'video',
        },
      ];

      console.log('✅ Mock sessions loaded:', mockSessions.length, 'sessions');
      setSessions(mockSessions);

      // Mock notes
      const mockNotes: Note[] = [
        {
          id: '1',
          content: 'Cliente muy receptiva al tratamiento. Muestra compromiso con los ejercicios entre sesiones.',
          createdAt: '2024-10-25T11:00:00Z',
        },
        {
          id: '2',
          content: 'Observar evolución de síntomas de ansiedad en las próximas semanas.',
          createdAt: '2024-10-18T11:00:00Z',
        },
      ];

      console.log('✅ Mock notes loaded:', mockNotes.length, 'notes');
      setNotes(mockNotes);
    } catch (error) {
      console.error('❌ Error loading client profile:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil del cliente');
    } finally {
      setLoading(false);
      console.log('⏹️ Loading complete');
    }
  };

  const handleScheduleSession = () => {
    // TODO: Navigate to schedule session screen
    Alert.alert('Programar Sesión', 'Esta funcionalidad estará disponible próximamente');
  };

  const handleSendMessage = () => {
    // TODO: Navigate to chat screen
    Alert.alert('Enviar Mensaje', 'Esta funcionalidad estará disponible próximamente');
  };

  const handleAddNote = () => {
    // TODO: Show add note modal or navigate to add note screen
    Alert.alert('Añadir Nota', 'Esta funcionalidad estará disponible próximamente');
  };

  if (loading) {
    console.log('⏳ Still loading...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!client) {
    console.log('❌ No client data');
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.feedback.error} />
        <Text style={styles.errorText}>No se pudo cargar el perfil del cliente</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('✅ Rendering client:', client.name);

  // Calculate stats
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const attendanceRate = totalSessions > 0
    ? Math.round((completedSessions / totalSessions) * 100)
    : 0;
  const lastSession = sessions[0]; // Assuming sorted by date desc

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#2196F3', '#00897B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarBorder}
          >
            <View style={styles.avatar}>
              {client.avatar ? (
                <Text style={styles.avatarText}>{client.name[0]}</Text>
              ) : (
                <Text style={styles.avatarText}>{client.name[0]}</Text>
              )}
            </View>
          </LinearGradient>

          {/* Status indicator */}
          {client.status === 'active' && (
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
            </View>
          )}
        </View>

        {/* Client Info */}
        <BrandText style={styles.clientName}>{client.name}</BrandText>
        <Text style={styles.clientEmail}>{client.email}</Text>

        {/* Client Since Badge */}
        <View style={styles.clientSinceBadge}>
          <Ionicons name="calendar" size={14} color={colors.neutral.gray600} />
          <Text style={styles.clientSinceText}>
            Cliente desde {formatDate(client.createdAt)}
          </Text>
        </View>

        {/* Compatibility Badge (from matching) */}
        {client.matchingScore && (
          <LinearGradient
            colors={['#2196F3', '#00897B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.compatibilityBadge}
          >
            <Ionicons name="analytics" size={14} color="#fff" />
            <Text style={styles.compatibilityText}>
              {Math.round(client.matchingScore * 100)}% de afinidad
            </Text>
          </LinearGradient>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <StatCard
          icon="calendar"
          value={totalSessions.toString()}
          label="Sesiones totales"
          gradient={['#2196F3', '#00897B'] as const}
        />
        <StatCard
          icon="checkmark-circle"
          value={`${attendanceRate}%`}
          label="Asistencia"
          gradient={['#4CAF50', '#66BB6A'] as const}
        />
        <StatCard
          icon="time"
          value={lastSession ? formatRelativeDate(lastSession.date) : 'N/A'}
          label="Última sesión"
          gradient={['#FF9800', '#FFB74D'] as const}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <View style={styles.primaryActionContainer}>
          <GradientButton
            title="Programar Sesión"
            onPress={handleScheduleSession}
            icon={<Ionicons name="add-circle" size={20} color="#fff" />}
          />
        </View>

        <View style={styles.secondaryActionsContainer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSendMessage}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.primary.main} />
            <Text style={styles.secondaryButtonText}>Mensaje</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleAddNote}>
            <Ionicons name="create-outline" size={20} color={colors.primary.main} />
            <Text style={styles.secondaryButtonText}>Nota</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TabButton
          label="Información"
          active={activeTab === 'info'}
          onPress={() => setActiveTab('info')}
        />
        <TabButton
          label="Historial"
          active={activeTab === 'history'}
          count={totalSessions}
          onPress={() => setActiveTab('history')}
        />
        <TabButton
          label="Notas"
          active={activeTab === 'notes'}
          count={notes.length}
          onPress={() => setActiveTab('notes')}
        />
        <TabButton
          label="Progreso"
          active={activeTab === 'progress'}
          onPress={() => setActiveTab('progress')}
        />
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'info' && <InfoTab client={client} />}
        {activeTab === 'history' && <HistoryTab sessions={sessions} />}
        {activeTab === 'notes' && <NotesTab notes={notes} onRefresh={loadClientProfile} clientId={clientId} />}
        {activeTab === 'progress' && <ProgressTab sessions={sessions} />}
      </View>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

// Sub-components
interface StatCardProps {
  icon: string;
  value: string;
  label: string;
  gradient: readonly [string, string, ...string[]];
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, gradient }) => (
  <View style={styles.statCard}>
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statIconCircle}
    >
      <Ionicons name={icon as any} size={20} color="#fff" />
    </LinearGradient>
    <BrandText style={styles.statValue}>{value}</BrandText>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

interface TabButtonProps {
  label: string;
  active: boolean;
  count?: number;
  onPress: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, active, count, onPress }) => (
  <TouchableOpacity style={styles.tabButton} onPress={onPress}>
    {active ? (
      <LinearGradient
        colors={['#2196F3', '#00897B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.activeTabButton}
      >
        <Text style={styles.activeTabText}>
          {label} {count !== undefined ? `(${count})` : ''}
        </Text>
      </LinearGradient>
    ) : (
      <View style={styles.inactiveTabButton}>
        <Text style={styles.inactiveTabText}>
          {label} {count !== undefined ? `(${count})` : ''}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

// Tab Content Components
const InfoTab: React.FC<{ client: ClientDetail }> = ({ client }) => (
  <View style={styles.infoTab}>
    {/* Client's Goals */}
    <View style={styles.infoSection}>
      <BrandText style={styles.infoSectionTitle}>Objetivos del Cliente</BrandText>
      <View style={styles.goalsList}>
        {(client.goals || []).map((goal, i) => (
          <View key={i} style={styles.goalItem}>
            <LinearGradient
              colors={['#2196F3', '#00897B']}
              style={styles.goalDot}
            />
            <Text style={styles.goalText}>{goal}</Text>
          </View>
        ))}
      </View>
    </View>

    {/* Main Concerns */}
    <View style={styles.infoSection}>
      <BrandText style={styles.infoSectionTitle}>Motivo de Consulta</BrandText>
      <Text style={styles.infoText}>
        {client.mainConcerns || 'No especificado'}
      </Text>
    </View>

    {/* Contact Info */}
    <View style={styles.infoSection}>
      <BrandText style={styles.infoSectionTitle}>Contacto</BrandText>
      <View style={styles.contactItem}>
        <Ionicons name="mail" size={20} color={colors.neutral.gray600} />
        <Text style={styles.contactText}>{client.email}</Text>
      </View>
      {client.phone && (
        <View style={styles.contactItem}>
          <Ionicons name="call" size={20} color={colors.neutral.gray600} />
          <Text style={styles.contactText}>{client.phone}</Text>
        </View>
      )}
    </View>

    {/* Matching Profile */}
    <View style={styles.infoSection}>
      <BrandText style={styles.infoSectionTitle}>Perfil de Afinidad</BrandText>
      <Text style={styles.infoText}>
        <Text style={styles.infoLabel}>Enfoque preferido: </Text>
        {client.therapeuticApproach || 'No especificado'}
      </Text>
      <Text style={styles.infoText}>
        <Text style={styles.infoLabel}>Estilo de comunicación: </Text>
        {client.communicationStyle || 'No especificado'}
      </Text>
    </View>
  </View>
);

const HistoryTab: React.FC<{ sessions: Session[] }> = ({ sessions }) => (
  <View style={styles.historyTab}>
    {sessions.length === 0 ? (
      <View style={styles.emptyState}>
        <Ionicons name="calendar-outline" size={48} color={colors.neutral.gray300} />
        <Text style={styles.emptyText}>Aún no hay sesiones</Text>
      </View>
    ) : (
      sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))
    )}
  </View>
);

const NotesTab: React.FC<{ notes: Note[]; onRefresh: () => void; clientId: string }> = ({ notes, onRefresh, clientId }) => {
  const [newNote, setNewNote] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      Alert.alert('Error', 'Por favor escribe una nota');
      return;
    }

    try {
      setAdding(true);
      // TODO: Replace with actual API call
      await api.post(`/clients/${clientId}/notes`, { content: newNote });
      setNewNote('');
      Alert.alert('Éxito', 'Nota añadida correctamente');
      onRefresh();
    } catch (error) {
      Alert.alert('Error', 'No se pudo añadir la nota');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.notesTab}>
      {/* Add Note Input */}
      <View style={styles.addNoteSection}>
        <TextInput
          style={styles.noteInput}
          placeholder="Añadir nota privada sobre el cliente..."
          placeholderTextColor={colors.neutral.gray500}
          multiline
          value={newNote}
          onChangeText={setNewNote}
          numberOfLines={3}
        />
        <TouchableOpacity onPress={handleAddNote} disabled={adding}>
          <LinearGradient
            colors={['#2196F3', '#00897B']}
            style={styles.addNoteButton}
          >
            {adding ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="add" size={24} color="#fff" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Notes List */}
      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={colors.neutral.gray300} />
          <Text style={styles.emptyText}>Aún no hay notas</Text>
        </View>
      ) : (
        notes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))
      )}
    </View>
  );
};

const ProgressTab: React.FC<{ sessions: Session[] }> = ({ sessions }) => {
  // Calculate progress metrics
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const progressData = calculateProgress(completedSessions);

  return (
    <View style={styles.progressTab}>
      {/* Progress Cards */}
      <ProgressCard
        title="Sesiones Completadas"
        value={completedSessions.length.toString()}
        icon="checkmark-circle"
      />

      <ProgressCard
        title="Racha Actual"
        value={`${progressData.currentStreak} semanas`}
        icon="flame"
      />

      <ProgressCard
        title="Progreso General"
        value={`${progressData.totalProgress}%`}
        icon="trending-up"
      />

      {/* Simple progress visualization */}
      <View style={styles.progressChart}>
        <BrandText style={styles.chartTitle}>Evolución del Cliente</BrandText>
        <Text style={styles.chartSubtitle}>Últimas 8 semanas</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="analytics" size={48} color={colors.neutral.gray300} />
          <Text style={styles.chartPlaceholderText}>
            Gráfico de progreso disponible próximamente
          </Text>
        </View>
      </View>
    </View>
  );
};

const SessionCard: React.FC<{ session: Session }> = ({ session }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.feedback.success;
      case 'scheduled': return colors.primary.main;
      case 'cancelled': return colors.feedback.error;
      default: return colors.neutral.gray600;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'scheduled': return 'Programada';
      case 'cancelled': return 'Cancelada';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  };

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <LinearGradient
          colors={['#2196F3', '#00897B']}
          style={styles.sessionDateBadge}
        >
          <Ionicons name="calendar" size={14} color="#fff" />
          <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
        </LinearGradient>
        <View style={[styles.sessionStatusBadge, { backgroundColor: getStatusColor(session.status) + '20' }]}>
          <Text style={[styles.sessionStatusText, { color: getStatusColor(session.status) }]}>
            {getStatusLabel(session.status)}
          </Text>
        </View>
      </View>

      <View style={styles.sessionDetails}>
        <View style={styles.sessionDetailItem}>
          <Ionicons name="time" size={16} color={colors.neutral.gray600} />
          <Text style={styles.sessionDetailText}>{session.duration} minutos</Text>
        </View>
        <View style={styles.sessionDetailItem}>
          <Ionicons name={session.type === 'video' ? 'videocam' : session.type === 'audio' ? 'call' : 'chatbubbles'} size={16} color={colors.neutral.gray600} />
          <Text style={styles.sessionDetailText}>{session.type === 'video' ? 'Videollamada' : session.type === 'audio' ? 'Llamada' : 'Chat'}</Text>
        </View>
      </View>

      {session.notes && (
        <View style={styles.sessionNotesContainer}>
          <Text style={styles.sessionNotes} numberOfLines={2}>
            {session.notes}
          </Text>
        </View>
      )}
    </View>
  );
};

const NoteCard: React.FC<{ note: Note }> = ({ note }) => (
  <View style={styles.noteCard}>
    <View style={styles.noteHeader}>
      <Ionicons name="document-text" size={20} color={colors.primary.main} />
      <Text style={styles.noteDate}>{formatDate(note.createdAt)}</Text>
    </View>
    <Text style={styles.noteContent}>{note.content}</Text>
  </View>
);

interface ProgressCardProps {
  title: string;
  value: string;
  icon: string;
}

const ProgressCard: React.FC<ProgressCardProps> = ({ title, value, icon }) => (
  <View style={styles.progressCard}>
    <LinearGradient
      colors={['#2196F3', '#00897B']}
      style={styles.progressIcon}
    >
      <Ionicons name={icon as any} size={24} color="#fff" />
    </LinearGradient>
    <View style={styles.progressInfo}>
      <BrandText style={styles.progressValue}>{value}</BrandText>
      <Text style={styles.progressLabel}>{title}</Text>
    </View>
  </View>
);

// Helper functions
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatRelativeDate = (dateString: string): string => {
  const now = new Date();
  const sessionDate = new Date(dateString);
  const diffMs = now.getTime() - sessionDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays}d`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)}sem`;
  return `Hace ${Math.floor(diffDays / 30)}m`;
};

const calculateProgress = (sessions: Session[]) => {
  // Simple progress calculation
  // In real app, this would be more sophisticated
  return {
    currentStreak: 4,
    totalProgress: Math.min(sessions.length * 10, 100),
  };
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSizes.md,
    color: colors.neutral.gray600,
    fontWeight: typography.fontWeights.medium as any,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: typography.fontSizes.lg,
    color: colors.neutral.gray900,
    fontWeight: typography.fontWeights.semibold as any,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  backButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary.main,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: typography.fontSizes.md,
    color: colors.neutral.white,
    fontWeight: typography.fontWeights.semibold as any,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background.secondary,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.primary.main,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.feedback.success,
  },
  clientName: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  clientEmail: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  clientSinceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  clientSinceText: {
    fontSize: typography.fontSizes.xs,
    color: colors.neutral.gray600,
    fontWeight: typography.fontWeights.medium as any,
  },
  compatibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
  },
  compatibilityText: {
    color: colors.neutral.white,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold as any,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.neutral.gray900,
  },
  statLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.neutral.gray600,
    textAlign: 'center',
    fontWeight: typography.fontWeights.medium as any,
  },
  actionButtons: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryActionContainer: {
    width: '100%',
  },
  secondaryActionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary.main,
    backgroundColor: colors.neutral.white,
  },
  secondaryButtonText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.primary.main,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  tabButton: {
    flex: 1,
  },
  activeTabButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTabText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.neutral.white,
  },
  inactiveTabButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  inactiveTabText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium as any,
    color: colors.neutral.gray600,
  },
  tabContent: {
    paddingHorizontal: spacing.lg,
  },
  infoTab: {
    gap: spacing.lg,
  },
  infoSection: {
    gap: spacing.sm,
  },
  infoSectionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.neutral.gray900,
  },
  goalsList: {
    gap: spacing.sm,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  goalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  goalText: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray700,
    flex: 1,
  },
  infoText: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray700,
    lineHeight: typography.fontSizes.sm * 1.5,
  },
  infoLabel: {
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.neutral.gray900,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  contactText: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray700,
  },
  historyTab: {
    gap: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSizes.md,
    color: colors.neutral.gray600,
  },
  sessionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    gap: spacing.xs,
  },
  sessionDate: {
    fontSize: typography.fontSizes.xs,
    color: colors.neutral.white,
    fontWeight: typography.fontWeights.semibold as any,
  },
  sessionStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  sessionStatusText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold as any,
  },
  sessionDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sessionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sessionDetailText: {
    fontSize: typography.fontSizes.xs,
    color: colors.neutral.gray600,
  },
  sessionNotesContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
    paddingTop: spacing.sm,
  },
  sessionNotes: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray700,
    fontStyle: 'italic',
  },
  notesTab: {
    gap: spacing.md,
  },
  addNoteSection: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  noteInput: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray900,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  addNoteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  noteDate: {
    fontSize: typography.fontSizes.xs,
    color: colors.neutral.gray600,
    fontWeight: typography.fontWeights.medium as any,
  },
  noteContent: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray700,
    lineHeight: typography.fontSizes.sm * 1.5,
  },
  progressTab: {
    gap: spacing.md,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
  },
  progressIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressInfo: {
    flex: 1,
  },
  progressValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.neutral.gray900,
  },
  progressLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
  },
  progressChart: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  chartTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.neutral.gray900,
  },
  chartSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  chartPlaceholderText: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray500,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: spacing.xxl,
  },
});

export default ClientProfileScreen;
