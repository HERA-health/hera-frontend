import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { borderRadius, spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { Client } from '../../services/professionalService';
import { AnimatedPressable } from '../common/AnimatedPressable';

const PATIENT_RESULT_LIMIT = 50;

interface ManagedSessionPatientSelectorProps {
  clients: Client[];
  selectedClient: Client | null;
  selectedClientId: string;
  open: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (clientId: string) => void;
}

export function getManagedSessionClientName(client?: Client | null): string {
  if (!client) return 'Paciente';

  const managedName = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
  return client.displayName || managedName || client.user?.name || 'Paciente';
}

function getFirstNonBlank(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }

  return null;
}

export function getManagedSessionClientEmail(client?: Client | null): string | null {
  return getFirstNonBlank(client?.primaryEmail, client?.user?.email, client?.email);
}

function getManagedSessionClientAvatar(client?: Client | null): string | null {
  return getFirstNonBlank(client?.user?.avatar);
}

export function ManagedSessionPatientAvatar({
  client,
  testID,
}: {
  client: Client | null;
  testID: string;
}): React.ReactElement {
  const { theme } = useTheme();
  const componentStyles = useMemo(() => createStyles(theme), [theme]);
  const avatar = getManagedSessionClientAvatar(client);

  return (
    <View style={[componentStyles.avatar, { backgroundColor: theme.primaryAlpha12 }]}>
      {avatar ? (
        <Image testID={testID} source={{ uri: avatar }} style={componentStyles.avatarImage} resizeMode="cover" />
      ) : (
        <Text style={[componentStyles.avatarText, { color: theme.primary, fontFamily: theme.fontSansBold }]}>
          {getManagedSessionClientName(client).charAt(0).toLocaleUpperCase('es-ES')}
        </Text>
      )}
    </View>
  );
}

export function ManagedSessionPatientSelector({
  clients,
  selectedClient,
  selectedClientId,
  open,
  error,
  onOpenChange,
  onSelect,
}: ManagedSessionPatientSelectorProps): React.ReactElement {
  const { theme } = useTheme();
  const componentStyles = useMemo(() => createStyles(theme), [theme]);
  const rootRef = useRef<View>(null);
  const searchInputRef = useRef<TextInput>(null);
  const [search, setSearch] = useState('');

  const filteredClients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-ES');
    if (!query) return clients;

    return clients.filter((client) => {
      const name = getManagedSessionClientName(client).toLocaleLowerCase('es-ES');
      const email = getManagedSessionClientEmail(client)?.toLocaleLowerCase('es-ES') || '';
      return name.includes(query) || email.includes(query);
    });
  }, [clients, search]);
  const visibleClients = filteredClients.slice(0, PATIENT_RESULT_LIMIT);
  const hiddenResultCount = filteredClients.length - visibleClients.length;

  const close = useCallback(() => {
    setSearch('');
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }

    const focusTimeout = setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => clearTimeout(focusTimeout);
  }, [open]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !open || typeof document === 'undefined') return undefined;

    const handlePointerDown = (event: Event) => {
      const root = rootRef.current as unknown as {
        contains?: (target: EventTarget | null) => boolean;
      } | null;
      if (root?.contains?.(event.target)) return;
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [close, open]);

  const handleToggle = () => {
    if (open) {
      close();
      return;
    }

    onOpenChange(true);
  };

  const selectedEmail = getManagedSessionClientEmail(selectedClient);
  const triggerTitle = selectedClient
    ? getManagedSessionClientName(selectedClient)
    : clients.length
      ? 'Selecciona un paciente'
      : 'No hay pacientes disponibles';
  const triggerSubtitle = selectedClient
    ? selectedEmail || 'Sin email'
    : clients.length
      ? 'Obligatorio para crear la cita'
      : 'Añade un paciente antes de crear la cita';

  return (
    <View
      ref={rootRef}
      collapsable={false}
      style={componentStyles.section}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <Text style={componentStyles.label}>Paciente</Text>
      <AnimatedPressable
          testID="managed-session-client-selector"
          onPress={handleToggle}
          disabled={clients.length === 0}
          hoverLift={false}
          pressScale={0.99}
          accessibilityLabel={selectedClient
            ? `Seleccionar paciente. Actual: ${getManagedSessionClientName(selectedClient)}`
            : 'Seleccionar paciente'}
          accessibilityState={{ expanded: open, disabled: clients.length === 0 }}
          style={[
            componentStyles.trigger,
            {
              borderColor: error ? theme.error : open ? theme.primary : theme.border,
              backgroundColor: open ? theme.primaryAlpha12 : theme.bgMuted,
            },
          ]}
      >
          <ManagedSessionPatientAvatar
            client={selectedClient}
            testID="managed-session-selected-client-avatar"
          />
          <View style={componentStyles.clientInfo}>
            <Text style={componentStyles.clientName} numberOfLines={1}>{triggerTitle}</Text>
            <Text style={componentStyles.clientEmail} numberOfLines={1}>{triggerSubtitle}</Text>
          </View>
          <View style={componentStyles.chevron}>
            <Ionicons
              name={open ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={17}
              color={clients.length === 0 ? theme.textMuted : theme.primary}
            />
          </View>
      </AnimatedPressable>
      {error ? <Text style={componentStyles.errorText}>{error}</Text> : null}

      {open ? (
        <View style={componentStyles.dropdown}>
            <View style={componentStyles.inputWrap}>
              <Ionicons name="search-outline" size={17} color={theme.textMuted} />
              <TextInput
                ref={searchInputRef}
                value={search}
                onChangeText={setSearch}
                onKeyPress={(event) => {
                  if (event.nativeEvent.key === 'Escape') close();
                }}
                placeholder="Buscar por nombre o email"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={componentStyles.searchInput}
              />
              {search ? (
                <AnimatedPressable
                  onPress={() => setSearch('')}
                  hoverLift={false}
                  pressScale={0.92}
                  style={componentStyles.clearSearchButton}
                  accessibilityLabel="Limpiar búsqueda de pacientes"
                >
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </AnimatedPressable>
              ) : null}
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={Platform.OS === 'web'}
              style={componentStyles.optionsScroll}
              contentContainerStyle={componentStyles.clientList}
            >
              {visibleClients.length ? visibleClients.map((client) => {
                const active = client.id === selectedClientId;
                const email = getManagedSessionClientEmail(client);
                return (
                  <AnimatedPressable
                    key={client.id}
                    onPress={() => {
                      onSelect(client.id);
                      close();
                    }}
                    hoverLift={false}
                    pressScale={0.99}
                    accessibilityLabel={`${getManagedSessionClientName(client)}, ${email || 'sin email'}`}
                    accessibilityState={{ selected: active }}
                    style={[
                      componentStyles.clientRow,
                      {
                        borderColor: active ? theme.primary : theme.borderLight,
                        backgroundColor: active ? theme.primaryAlpha12 : theme.bgElevated,
                      },
                    ]}
                  >
                    <ManagedSessionPatientAvatar
                      client={client}
                      testID={`managed-session-client-avatar-${client.id}`}
                    />
                    <View style={componentStyles.clientInfo}>
                      <Text style={componentStyles.clientName} numberOfLines={1}>
                        {getManagedSessionClientName(client)}
                      </Text>
                      <Text style={componentStyles.clientEmail} numberOfLines={1}>
                        {email || 'Sin email'}
                      </Text>
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={20} color={theme.primary} /> : null}
                  </AnimatedPressable>
                );
              }) : (
                <Text style={componentStyles.emptyText}>
                  No hay pacientes activos de tu consulta con esa búsqueda.
                </Text>
              )}
              {hiddenResultCount > 0 ? (
                <Text style={componentStyles.resultHint}>
                  Hay {hiddenResultCount} resultados más. Escribe para acotar la búsqueda.
                </Text>
              ) : null}
            </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    section: { gap: spacing.sm, position: 'relative', zIndex: 30 },
    label: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 13 },
    trigger: {
      minHeight: 60,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    clientInfo: { minWidth: 0, flex: 1 },
    clientName: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 14 },
    clientEmail: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12, marginTop: 2 },
    chevron: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.bgCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: { color: theme.error, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 17 },
    dropdown: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: '100%',
      maxHeight: 360,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgElevated,
      elevation: 16,
      shadowColor: theme.shadowStrong,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 18,
      gap: spacing.sm,
      overflow: 'hidden',
      zIndex: 2100,
    },
    inputWrap: {
      minHeight: 44,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.md,
      backgroundColor: theme.bgMuted,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    searchInput: {
      minHeight: 44,
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      outlineStyle: 'none' as never,
    },
    clearSearchButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    optionsScroll: { flexShrink: 1, maxHeight: 292 },
    clientList: { gap: spacing.xs },
    clientRow: {
      minHeight: 54,
      padding: spacing.sm,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { fontSize: 14 },
    emptyText: {
      padding: spacing.md,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      textAlign: 'center',
    },
    resultHint: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.md,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
      textAlign: 'center',
    },
  });
}
