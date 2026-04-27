import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/colors';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAuthButtonProps {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            ux_mode?: 'popup' | 'redirect';
            auto_select?: boolean;
            itp_support?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
              locale?: string;
              logo_alignment?: 'left' | 'center';
            }
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_AUTH_CLIENT_ID;
const BUTTON_HEIGHT = 54;
const GOOGLE_BUTTON_HEIGHT = 40;
const GOOGLE_BUTTON_SCALE = BUTTON_HEIGHT / GOOGLE_BUTTON_HEIGHT;

const loadGoogleIdentityScript = (): Promise<void> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Google Auth is only available on web'));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Auth failed to load')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Auth failed to load'));
    document.head.appendChild(script);
  });
};

export function GoogleAuthButton({ onCredential, disabled = false }: GoogleAuthButtonProps) {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const fallbackWidth = Math.min(440, Math.max(240, Math.floor(width - spacing.lg * 2)));
  const visualButtonWidth = Math.max(240, Math.floor(containerWidth || fallbackWidth));
  const googleButtonWidth = Math.max(240, Math.floor(visualButtonWidth / GOOGLE_BUTTON_SCALE));

  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) {
      return undefined;
    }

    const element = containerRef.current;
    const updateContainerWidth = () => {
      setContainerWidth(Math.floor(element.offsetWidth));
    };

    updateContainerWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateContainerWidth);
      return () => window.removeEventListener('resize', updateContainerWidth);
    }

    const observer = new ResizeObserver(updateContainerWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !GOOGLE_CLIENT_ID) {
      return;
    }

    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) {
          return;
        }

        containerRef.current.innerHTML = '';
        setIsReady(false);
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) {
              onCredential(response.credential);
            }
          },
          ux_mode: 'popup',
          auto_select: false,
          itp_support: true,
        });

        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: isDark ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: googleButtonWidth,
          locale: 'es',
          logo_alignment: 'left',
        });
        setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [googleButtonWidth, isDark, onCredential]);

  if (Platform.OS !== 'web') {
    return null;
  }

  if (!GOOGLE_CLIENT_ID) {
    if (!__DEV__) {
      return null;
    }

    return (
      <View style={[styles.fallback, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}>
        <Text style={[styles.fallbackText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
          Configura EXPO_PUBLIC_GOOGLE_AUTH_CLIENT_ID para mostrar Google.
        </Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.fallback, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}>
        <Text style={[styles.fallbackText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
          Google no está disponible ahora mismo.
        </Text>
      </View>
    );
  }

  return (
    <View
      pointerEvents={disabled ? 'none' : 'auto'}
      style={[
        styles.wrapper,
        disabled ? styles.disabled : null,
      ]}
    >
      {!isReady ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.primary} size="small" />
          <Text style={[styles.loadingText, { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold }]}>
            Preparando Google
          </Text>
        </View>
      ) : null}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: BUTTON_HEIGHT,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: BUTTON_HEIGHT,
          opacity: isReady ? 1 : 0,
          textAlign: 'center',
          transform: `scale(${GOOGLE_BUTTON_SCALE})`,
          transformOrigin: 'center',
          transition: 'opacity 160ms ease',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: BUTTON_HEIGHT,
  },
  disabled: {
    opacity: 0.6,
  },
  loadingState: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
  },
  fallback: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  fallbackText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
