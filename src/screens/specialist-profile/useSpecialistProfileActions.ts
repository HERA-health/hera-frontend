import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Share } from 'react-native';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { getWebAppUrl } from '../../config/api';
import * as specialistsService from '../../services/specialistsService';
import type { Specialist } from './types';

interface UseSpecialistProfileActionsOptions {
  specialist: Specialist;
  favoriteEnabled: boolean;
}

export const useSpecialistProfileActions = ({
  specialist,
  favoriteEnabled,
}: UseSpecialistProfileActionsOptions) => {
  const appAlert = useAppAlert();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(favoriteEnabled);
  const activeSpecialistIdRef = useRef(specialist.id);
  activeSpecialistIdRef.current = specialist.id;
  const profileUrl = useMemo(() => {
    const reference = specialist.publicSlug ?? specialist.id;
    return `${getWebAppUrl()}/especialista/${encodeURIComponent(reference)}`;
  }, [specialist.id, specialist.publicSlug]);

  useEffect(() => {
    let active = true;
    if (!favoriteEnabled) {
      setIsFavorite(false);
      setFavoriteLoading(false);
      return () => { active = false; };
    }

    setFavoriteLoading(true);
    specialistsService.getFavoriteSpecialistStatus(specialist.id)
      .then((status) => {
        if (active) setIsFavorite(status);
      })
      .catch(() => {
        if (active) setIsFavorite(false);
      })
      .finally(() => {
        if (active) setFavoriteLoading(false);
      });

    return () => { active = false; };
  }, [favoriteEnabled, specialist.id]);

  const shareProfile = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(profileUrl);
        showAppAlert(appAlert, 'Enlace copiado', 'El perfil está listo para compartir.');
        return;
      }

      await Share.share({
        title: `Perfil de ${specialist.name} en HERA`,
        message: `Conoce el perfil profesional de ${specialist.name} en HERA: ${profileUrl}`,
        url: profileUrl,
      });
    } catch {
      showAppAlert(appAlert, 'No se pudo compartir', 'Inténtalo de nuevo en unos instantes.');
    }
  }, [appAlert, profileUrl, specialist.name]);

  const toggleFavorite = useCallback(async () => {
    if (!favoriteEnabled || favoriteLoading) return;
    const targetSpecialistId = specialist.id;
    const previous = isFavorite;
    setIsFavorite(!previous);
    setFavoriteLoading(true);
    try {
      if (previous) {
        await specialistsService.removeFavoriteSpecialist(targetSpecialistId);
      } else {
        await specialistsService.addFavoriteSpecialist(targetSpecialistId);
      }
    } catch {
      if (activeSpecialistIdRef.current === targetSpecialistId) {
        setIsFavorite(previous);
        showAppAlert(
          appAlert,
          'No se pudo actualizar',
          'Tu selección no se ha perdido. Inténtalo de nuevo.',
        );
      }
    } finally {
      if (activeSpecialistIdRef.current === targetSpecialistId) {
        setFavoriteLoading(false);
      }
    }
  }, [appAlert, favoriteEnabled, favoriteLoading, isFavorite, specialist.id]);

  return {
    isFavorite,
    favoriteLoading,
    shareProfile,
    toggleFavorite,
  };
};
