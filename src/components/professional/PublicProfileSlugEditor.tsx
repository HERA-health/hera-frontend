import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { showAppAlert, useAppAlert } from '../common/alert';
import { Button } from '../common';
import { borderRadius, spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getWebAppUrl } from '../../config/api';
import * as professionalService from '../../services/professionalService';
import {
  getPublicProfileSlugValidationMessage,
  normalizePublicProfileSlug,
  normalizePublicProfileSlugDraft,
  PUBLIC_PROFILE_SLUG_MAX_CHANGES,
  PUBLIC_PROFILE_SLUG_MAX_LENGTH,
} from '../../utils/publicProfileSlug';

type PublicSlugAvailabilityState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'error';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface PublicProfileSlugEditorProps {
  initialSlug: string;
  initialRemainingChanges?: number;
  onSaved: (publicSlug: string, remainingChanges: number) => void;
  variant?: 'section' | 'dialog';
}

const getErrorMessage = (error: unknown, fallback: string): string => (
  error instanceof Error ? error.message : fallback
);

export const PublicProfileSlugEditor: React.FC<PublicProfileSlugEditorProps> = ({
  initialSlug,
  initialRemainingChanges = PUBLIC_PROFILE_SLUG_MAX_CHANGES,
  onSaved,
  variant = 'section',
}) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const appAlert = useAppAlert();
  const isMobile = width < 768;
  const styles = useMemo(() => createStyles(theme, isMobile), [isMobile, theme]);
  const [savedSlug, setSavedSlug] = useState(initialSlug);
  const [draftSlug, setDraftSlug] = useState(initialSlug);
  const [availability, setAvailability] = useState<PublicSlugAvailabilityState>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [remainingChanges, setRemainingChanges] = useState(initialRemainingChanges);
  const [wouldUseChange, setWouldUseChange] = useState(false);
  const [changeLimitReached, setChangeLimitReached] = useState(false);

  useEffect(() => {
    setSavedSlug(initialSlug);
    setDraftSlug(initialSlug);
    setAvailability('idle');
    setRemainingChanges(initialRemainingChanges);
    setWouldUseChange(false);
    setChangeLimitReached(false);
  }, [initialRemainingChanges, initialSlug]);

  const hasChanges = draftSlug !== savedSlug;
  const isDialog = variant === 'dialog';
  const validationMessage = getPublicProfileSlugValidationMessage(draftSlug);
  const publicProfileUrlPrefix = `${getWebAppUrl()}/especialista/`;

  useEffect(() => {
    if (!hasChanges || validationMessage) {
      setAvailability('idle');
      setWouldUseChange(false);
      setChangeLimitReached(false);
      return;
    }

    let active = true;
    setAvailability('checking');

    const timeout = setTimeout(() => {
      void professionalService
        .getPublicProfileSlugAvailability(draftSlug)
        .then((result) => {
          if (active) {
            setRemainingChanges(result.remainingChanges);
            setWouldUseChange(result.wouldUseChange);
            setChangeLimitReached(result.changeLimitReached);
            setAvailability(result.available ? 'available' : 'unavailable');
          }
        })
        .catch(() => {
          if (active) {
            setAvailability('error');
          }
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [draftSlug, hasChanges, validationMessage]);

  const status = useMemo((): {
    icon: IconName;
    message: string;
    color: string;
  } => {
    if (!hasChanges && savedSlug) {
      return {
        icon: 'checkmark-circle',
        message: `URL activa. Puedes crear ${remainingChanges} ${remainingChanges === 1 ? 'dirección nueva más' : 'direcciones nuevas más'}.`,
        color: theme.success,
      };
    }

    if (validationMessage) {
      return {
        icon: 'information-circle-outline',
        message: validationMessage,
        color: theme.warning,
      };
    }

    if (availability === 'checking') {
      return {
        icon: 'time-outline',
        message: 'Comprobando disponibilidad…',
        color: theme.textMuted,
      };
    }

    if (availability === 'available') {
      return {
        icon: 'checkmark-circle',
        message: wouldUseChange
          ? `Esta URL está disponible y usará 1 de tus ${remainingChanges} cambios restantes.`
          : 'Esta URL anterior vuelve a estar disponible sin consumir otro cambio.',
        color: theme.success,
      };
    }

    if (availability === 'unavailable') {
      return {
        icon: 'close-circle',
        message: changeLimitReached
          ? `Ya has utilizado tus ${PUBLIC_PROFILE_SLUG_MAX_CHANGES} cambios de URL.`
          : 'Esta URL no está disponible.',
        color: theme.warning,
      };
    }

    if (availability === 'error') {
      return {
        icon: 'cloud-offline-outline',
        message: 'No pudimos comprobarla. Modifica la URL para volver a intentarlo.',
        color: theme.warning,
      };
    }

    return {
      icon: 'link-outline',
      message: 'Elige una URL breve y fácil de recordar.',
      color: theme.textMuted,
    };
  }, [
    availability,
    changeLimitReached,
    hasChanges,
    remainingChanges,
    savedSlug,
    theme,
    validationMessage,
    wouldUseChange,
  ]);

  const handleSave = async () => {
    if (
      !hasChanges
      || validationMessage
      || availability !== 'available'
      || isSaving
    ) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await professionalService.updatePublicProfileSlug(draftSlug);
      setSavedSlug(result.publicSlug);
      setDraftSlug(result.publicSlug);
      setRemainingChanges(result.remainingChanges);
      setWouldUseChange(false);
      setChangeLimitReached(false);
      setAvailability('idle');
      onSaved(result.publicSlug, result.remainingChanges);
      showAppAlert(
        appAlert,
        'URL pública guardada',
        'Tus enlaces anteriores seguirán llevando a este perfil.',
      );
    } catch (error: unknown) {
      setAvailability('error');
      showAppAlert(
        appAlert,
        'No se pudo guardar la URL',
        getErrorMessage(error, 'Comprueba la dirección e inténtalo de nuevo.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, isDialog && styles.dialogContainer]}>
      {!isDialog ? (
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="link-outline" size={20} color={theme.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>URL del perfil público</Text>
            <Text style={styles.description}>
              Personaliza el enlace que compartes con tus pacientes. Puedes crear hasta {PUBLIC_PROFILE_SLUG_MAX_CHANGES} direcciones nuevas y las anteriores seguirán funcionando.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.prefix}>{publicProfileUrlPrefix}</Text>
        <TextInput
          value={draftSlug}
          onChangeText={(value) => setDraftSlug(normalizePublicProfileSlugDraft(value))}
          onBlur={() => setDraftSlug((value) => normalizePublicProfileSlug(value))}
          placeholder="nombre-apellidos"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={PUBLIC_PROFILE_SLUG_MAX_LENGTH}
          style={styles.input}
          accessibilityLabel="URL pública del perfil"
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.status}>
          {availability === 'checking' ? (
            <ActivityIndicator size="small" color={status.color} />
          ) : (
            <Ionicons name={status.icon} size={16} color={status.color} />
          )}
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.message}
          </Text>
        </View>

        <Button
          variant="outline"
          size="small"
          onPress={() => void handleSave()}
          disabled={
            !hasChanges
            || Boolean(validationMessage)
            || availability !== 'available'
            || isSaving
          }
          loading={isSaving}
          textStyle={styles.saveText}
        >
          Guardar URL
        </Button>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme, isMobile: boolean) => StyleSheet.create({
  container: {
    paddingBottom: spacing.lg,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: spacing.md,
  },
  dialogContainer: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primaryAlpha12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.fontHeading,
    color: theme.textPrimary,
  },
  description: {
    fontSize: 13,
    fontFamily: theme.fontSans,
    lineHeight: 19,
    color: theme.textSecondary,
  },
  field: {
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.primaryAlpha20,
    borderRadius: borderRadius.md,
    backgroundColor: theme.bgMuted,
  },
  prefix: {
    paddingHorizontal: spacing.md,
    paddingVertical: isMobile ? spacing.sm : spacing.md,
    fontSize: 13,
    fontFamily: theme.fontSansMedium,
    color: theme.textSecondary,
    borderBottomWidth: isMobile ? 1 : 0,
    borderRightWidth: isMobile ? 0 : 1,
    borderColor: theme.border,
  },
  input: {
    flex: 1,
    minWidth: 140,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    fontFamily: theme.fontSansSemiBold,
    color: theme.textPrimary,
    backgroundColor: theme.bgCard,
  },
  footer: {
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  status: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fontSansMedium,
    lineHeight: 18,
  },
  saveText: {
    color: theme.primary,
  },
});
