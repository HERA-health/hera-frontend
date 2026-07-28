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
type PublicSlugErrorAction = 'availability' | 'save';

interface PublicProfileSlugEditorProps {
  initialSlug: string;
  initialRemainingChanges?: number;
  onSaved: (publicSlug: string, remainingChanges: number) => void;
  variant?: 'section' | 'dialog';
}

const getErrorMessage = (error: unknown, fallback: string): string => (
  error instanceof Error ? error.message : fallback
);

const isRetryableError = (error: unknown): boolean => (
  typeof error === 'object'
  && error !== null
  && 'retryable' in error
  && typeof (error as { retryable?: unknown }).retryable === 'boolean'
    ? (error as { retryable: boolean }).retryable
    : true
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
  const [availabilityErrorMessage, setAvailabilityErrorMessage] = useState<string | null>(null);
  const [availabilityErrorRetryable, setAvailabilityErrorRetryable] = useState(true);
  const [errorAction, setErrorAction] = useState<PublicSlugErrorAction | null>(null);
  const [availabilityCheckVersion, setAvailabilityCheckVersion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [remainingChanges, setRemainingChanges] = useState(initialRemainingChanges);
  const [wouldUseChange, setWouldUseChange] = useState(false);
  const [changeLimitReached, setChangeLimitReached] = useState(false);

  useEffect(() => {
    setSavedSlug(initialSlug);
    setDraftSlug(initialSlug);
    setAvailability('idle');
    setAvailabilityErrorMessage(null);
    setAvailabilityErrorRetryable(true);
    setErrorAction(null);
    setAvailabilityCheckVersion(0);
    setRemainingChanges(initialRemainingChanges);
    setWouldUseChange(false);
    setChangeLimitReached(false);
  }, [initialRemainingChanges, initialSlug]);

  const hasChanges = draftSlug !== savedSlug;
  const isDialog = variant === 'dialog';
  const validationMessage = getPublicProfileSlugValidationMessage(draftSlug);
  const publicProfileUrlPrefix = `${getWebAppUrl()}/especialista/`;
  const canRetryError = availability === 'error' && availabilityErrorRetryable;
  const shouldRetrySave = canRetryError && errorAction === 'save';

  useEffect(() => {
    if (!hasChanges || validationMessage) {
      setAvailability('idle');
      setAvailabilityErrorMessage(null);
      setAvailabilityErrorRetryable(true);
      setErrorAction(null);
      setWouldUseChange(false);
      setChangeLimitReached(false);
      return;
    }

    let active = true;
    setAvailability('checking');
    setAvailabilityErrorMessage(null);
    setAvailabilityErrorRetryable(true);
    setErrorAction(null);

    const timeout = setTimeout(() => {
      void professionalService
        .getPublicProfileSlugAvailability(draftSlug)
        .then((result) => {
          if (active) {
            setRemainingChanges(result.remainingChanges);
            setWouldUseChange(result.wouldUseChange);
            setChangeLimitReached(result.changeLimitReached);
            setAvailabilityErrorRetryable(true);
            setErrorAction(null);
            setAvailability(result.available ? 'available' : 'unavailable');
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setAvailability('error');
            setAvailabilityErrorRetryable(isRetryableError(error));
            setErrorAction('availability');
            setAvailabilityErrorMessage(
              getErrorMessage(
                error,
                'No hemos podido comprobar la URL. Revisa tu conexión y pulsa Reintentar.',
              ),
            );
          }
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [availabilityCheckVersion, draftSlug, hasChanges, validationMessage]);

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
      const remainingAfterSave = Math.max(0, remainingChanges - 1);
      return {
        icon: 'checkmark-circle',
        message: wouldUseChange
          ? `Esta dirección está disponible. Al guardarla te ${remainingAfterSave === 1 ? 'quedará 1 cambio' : `quedarán ${remainingAfterSave} cambios`}.`
          : 'Esta es una de tus direcciones anteriores. Puedes volver a usarla sin gastar otro cambio.',
        color: theme.success,
      };
    }

    if (availability === 'unavailable') {
      return {
        icon: 'close-circle',
        message: changeLimitReached
          ? `Has alcanzado el límite de ${PUBLIC_PROFILE_SLUG_MAX_CHANGES} cambios. Puedes volver a usar una de tus direcciones anteriores.`
          : 'Esta dirección no está disponible. Prueba con otra.',
        color: theme.warning,
      };
    }

    if (availability === 'error') {
      return {
        icon: 'cloud-offline-outline',
        message: availabilityErrorMessage
          ?? 'No hemos podido comprobar la URL. Revisa tu conexión y pulsa Reintentar.',
        color: theme.warning,
      };
    }

    return {
      icon: 'link-outline',
      message: 'Escribe tu nombre o una combinación breve y fácil de recordar.',
      color: theme.textMuted,
    };
  }, [
    availability,
    availabilityErrorMessage,
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
      || (availability !== 'available' && !shouldRetrySave)
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
      setAvailabilityErrorMessage(null);
      setAvailabilityErrorRetryable(true);
      setErrorAction(null);
      onSaved(result.publicSlug, result.remainingChanges);
      showAppAlert(
        appAlert,
        'URL actualizada',
        'Ya puedes compartir tu nueva dirección. Tus enlaces anteriores seguirán funcionando.',
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(
        error,
        'No hemos podido guardar la URL. Revisa tu conexión e inténtalo de nuevo.',
      );
      setAvailability('error');
      setAvailabilityErrorMessage(errorMessage);
      setAvailabilityErrorRetryable(isRetryableError(error));
      setErrorAction('save');
      showAppAlert(
        appAlert,
        'No hemos podido guardar la URL',
        errorMessage,
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
          onPress={() => {
            if (canRetryError) {
              if (errorAction === 'save') {
                void handleSave();
              } else {
                setAvailabilityCheckVersion((version) => version + 1);
              }
              return;
            }
            void handleSave();
          }}
          disabled={
            !canRetryError
            && (
              !hasChanges
              || Boolean(validationMessage)
              || availability !== 'available'
              || isSaving
            )
          }
          loading={isSaving}
          textStyle={styles.saveText}
        >
          {canRetryError
            ? (errorAction === 'save' ? 'Volver a guardar' : 'Reintentar')
            : 'Guardar URL'}
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
