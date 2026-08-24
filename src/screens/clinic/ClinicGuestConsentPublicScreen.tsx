import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { darkTheme, lightTheme, type Theme } from '../../constants/theme';
import { GuestConsentHttpError } from '../../services/guestConsentHttpClient';
import { GuestConsentDocumentFrame } from '../consent/GuestConsentDocumentFrame';
import {
  getGuestConsentFlowAdapter,
  type GuestConsentDocumentBytes as AnyDocumentBytes,
  type GuestConsentFlow,
  type GuestConsentFlowAdapter,
  type GuestConsentReadyResolution as ReadyResolution,
  type GuestConsentResolution as AnyResolution,
} from '../consent/guestConsentFlowAdapter';

interface Props { requestId: string; flow?: GuestConsentFlow }
type Confirmation = 'ACCEPT' | 'REJECT' | null;

interface VolatileBootstrapCredentials {
  token: string;
  clientNonce: string | null;
  cleanupTimer?: number;
}

const volatileCredentials = new Map<string, VolatileBootstrapCredentials>();
const credentialsKey = (requestId: string, flow: 'clinic' | 'specialist'): string => `${flow}:${requestId}`;

const captureBootstrapCredentials = (
  requestId: string,
  flow: GuestConsentFlow,
  adapter: GuestConsentFlowAdapter
): VolatileBootstrapCredentials | null => {
  const key = credentialsKey(requestId, flow);
  const captured = volatileCredentials.get(key);
  if (captured) {
    if (captured.cleanupTimer) window.clearTimeout(captured.cleanupTimer);
    captured.cleanupTimer = undefined;
    return captured;
  }
  const token = adapter.parseFragment(window.location.hash);
  window.history.replaceState(
    null,
    document.title,
    `${window.location.pathname}${window.location.search}`
  );
  if (!token) return null;
  const credentials = { token, clientNonce: null };
  volatileCredentials.set(key, credentials);
  return credentials;
};

const transientErrorMessage = (error: unknown): string => {
  if (
    error instanceof GuestConsentHttpError
  ) {
    if (error.failure === 'TIMEOUT') {
      return 'La respuesta está tardando más de lo esperado. Puedes reintentarlo sin duplicar la operación.';
    }
    if (error.failure === 'NETWORK') {
      return 'No hay conexión en este momento. Comprueba tu red y vuelve a intentarlo.';
    }
    if (error.failure === 'RATE_LIMITED') {
      const wait = error.retryAfterSeconds
        ? ` Espera ${error.retryAfterSeconds} segundos antes de volver a intentarlo.`
        : ' Espera un momento antes de volver a intentarlo.';
      return `Se han realizado demasiados intentos.${wait}`;
    }
    if (error.failure === 'SERVICE_UNAVAILABLE') {
      return 'No podemos confirmar todavía el resultado; compruébalo o inténtalo de nuevo.';
    }
    if (error.failure === 'OTP_INVALID') {
      return 'El código no es válido o ha caducado. Compruébalo o solicita uno nuevo.';
    }
  }
  return 'No se ha podido completar la operación. Inténtalo de nuevo.';
};

export function GuestConsentPublicScreen({ requestId, flow = 'clinic' }: Props): React.ReactElement {
  const adapter = useMemo(() => getGuestConsentFlowAdapter(flow), [flow]);
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const credentialsRef = useRef<VolatileBootstrapCredentials | null | undefined>(undefined);
  if (credentialsRef.current === undefined) {
    credentialsRef.current = captureBootstrapCredentials(requestId, flow, adapter);
  }
  const bootstrapAmbiguousRef = useRef(false);
  const stageHeadingRef = useRef<React.ElementRef<typeof View> | null>(null);
  const decisionTriggerRef = useRef<React.ElementRef<typeof Pressable> | null>(null);
  const confirmationRef = useRef<React.ElementRef<typeof View> | null>(null);
  const [started, setStarted] = useState(false);
  const [resolution, setResolution] = useState<AnyResolution | null>(null);
  const [documentBytes, setDocumentBytes] = useState<AnyDocumentBytes | null>(null);
  const [documentError, setDocumentError] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [fatalError, setFatalError] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);

  const rememberRateLimit = useCallback((error: unknown): void => {
    if (
      error instanceof GuestConsentHttpError
      && error.failure === 'RATE_LIMITED'
      && error.retryAfterSeconds
    ) {
      setRateLimitedUntil((current) => Math.max(
        current,
        Date.now() + error.retryAfterSeconds! * 1000
      ));
    }
  }, []);

  React.useEffect(() => {
    if (!resolution) return;
    setServerOffsetMs(new Date(resolution.serverTime).getTime() - Date.now());
  }, [resolution]);

  React.useEffect(() => {
    if (resolution?.stage !== 'OTP_REQUIRED' && resolution?.stage !== 'READY') return undefined;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resolution?.stage]);

  React.useEffect(() => {
    if (!started && !fatalError) return;
    const node = stageHeadingRef.current as unknown as { focus?: () => void } | null;
    node?.focus?.();
  }, [started, resolution?.stage, fatalError]);

  React.useEffect(() => {
    if (!confirmation) return;
    const node = confirmationRef.current as unknown as { focus?: () => void } | null;
    node?.focus?.();
  }, [confirmation]);

  React.useEffect(() => () => {
    const credentials = credentialsRef.current;
    if (!credentials) return;
    credentials.cleanupTimer = window.setTimeout(() => {
      const key = credentialsKey(requestId, flow);
      if (volatileCredentials.get(key) === credentials) {
        volatileCredentials.delete(key);
      }
    }, bootstrapAmbiguousRef.current ? 15 * 60_000 : 0);
    credentialsRef.current = null;
  }, [flow, requestId]);

  React.useEffect(() => {
    if (resolution?.stage === 'READY') {
      setOtp('');
      return;
    }
    setDocumentBytes(null);
    setDocumentError('');
    setConfirmation(null);
  }, [resolution?.stage]);

  const loadDocument = useCallback(async (
    readyResolution: Extract<AnyResolution, { stage: 'READY' }>
  ): Promise<void> => {
    setDocumentError('');
    try {
      setDocumentBytes(await adapter.loadDocument(requestId, readyResolution));
    } catch (error: unknown) {
      setDocumentError(transientErrorMessage(error));
    }
  }, [adapter, requestId]);

  React.useEffect(() => {
    if (resolution?.stage !== 'READY' || documentBytes || documentError) return;
    void loadDocument(resolution);
  }, [documentBytes, documentError, loadDocument, resolution]);

  const requestInitialOtp = useCallback(async (
    current: AnyResolution
  ): Promise<void> => {
    if (current.stage !== 'OTP_REQUIRED' || current.otpDeliveryStatus !== 'NOT_SENT') return;
    try {
      setResolution(await adapter.requestOtp(requestId));
    } catch (error: unknown) {
      rememberRateLimit(error);
      const unavailable = (
        error instanceof GuestConsentHttpError
      ) && error.failure === 'UNAVAILABLE';
      if (unavailable) {
        setResolution(null);
        setOtp('');
        setDocumentBytes(null);
        setFatalError('Este enlace no está disponible o ya ha caducado.');
        return;
      }
      const ambiguous = error instanceof GuestConsentHttpError
        && ['TIMEOUT', 'NETWORK', 'SERVICE_UNAVAILABLE'].includes(error.failure);
      if (ambiguous) {
        try {
          setResolution(await adapter.resolve(requestId));
          setActionError('');
          return;
        } catch (resolutionError: unknown) {
          rememberRateLimit(resolutionError);
          if (
            resolutionError instanceof GuestConsentHttpError
            && resolutionError.failure === 'UNAVAILABLE'
          ) {
            setResolution(null);
            setOtp('');
            setDocumentBytes(null);
            setFatalError('Este enlace no está disponible o ya ha caducado.');
            return;
          }
          setActionError(transientErrorMessage(resolutionError));
          return;
        }
      }
      setActionError(transientErrorMessage(error));
    }
  }, [adapter, rememberRateLimit, requestId]);

  React.useEffect(() => {
    if (
      resolution?.stage !== 'OTP_REQUIRED'
      || resolution.otpDeliveryStatus !== 'PROCESSING'
    ) return undefined;

    let active = true;
    let requestInFlight = false;
    const refreshDeliveryStatus = async (): Promise<void> => {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const nextResolution = await adapter.resolve(requestId);
        if (active) {
          setResolution(nextResolution);
          setActionError('');
        }
      } catch (error: unknown) {
        if (
          active
          && (
            error instanceof GuestConsentHttpError
          )
          && error.failure === 'UNAVAILABLE'
        ) {
          setResolution(null);
          setOtp('');
          setDocumentBytes(null);
          setFatalError('Este enlace no está disponible o ya ha caducado.');
        }
        // Transient polling failures keep the last honest delivery state visible.
      } finally {
        requestInFlight = false;
      }
    };

    const timer = window.setInterval(() => {
      void refreshDeliveryStatus();
    }, 20_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [adapter, requestId, resolution?.stage, resolution?.stage === 'OTP_REQUIRED'
    ? resolution.otpDeliveryStatus
    : null]);

  const continueFlow = useCallback(async (): Promise<void> => {
    setStarted(true);
    setBusy(true);
    setActionError('');
    setFatalError('');
    try {
      const credentials = credentialsRef.current;
      let nextResolution: AnyResolution;
      if (credentials) {
        credentials.clientNonce ??= adapter.generateNonce();
        nextResolution = await adapter.bootstrap(requestId, credentials.token, credentials.clientNonce);
        bootstrapAmbiguousRef.current = false;
        credentialsRef.current = null;
        volatileCredentials.delete(credentialsKey(requestId, flow));
      } else {
        nextResolution = await adapter.resolve(requestId);
      }
      setResolution(nextResolution);
      await requestInitialOtp(nextResolution);
    } catch (error: unknown) {
      if (
        (
          error instanceof GuestConsentHttpError
        )
        && error.failure === 'UNAVAILABLE'
      ) {
        bootstrapAmbiguousRef.current = false;
        credentialsRef.current = null;
        volatileCredentials.delete(credentialsKey(requestId, flow));
        setFatalError('Este enlace no está disponible o ya ha caducado.');
      } else {
        bootstrapAmbiguousRef.current = Boolean(credentialsRef.current);
        setActionError(transientErrorMessage(error));
      }
    } finally {
      setBusy(false);
    }
  }, [adapter, flow, requestId, requestInitialOtp]);

  const runResolutionAction = useCallback(async (
    task: () => Promise<AnyResolution>,
    failureMessage?: string
  ): Promise<void> => {
    setBusy(true);
    setActionError('');
    try {
      const nextResolution = await task();
      setResolution(nextResolution);
      if (nextResolution.stage === 'TERMINAL') {
        setOtp('');
        setDocumentBytes(null);
      }
    } catch (error: unknown) {
      rememberRateLimit(error);
      const definitiveFailure = (
        error instanceof GuestConsentHttpError
      )
        && error.failure === 'UNAVAILABLE';
      const invalidOtp = (
        error instanceof GuestConsentHttpError
      ) && error.failure === 'OTP_INVALID';
      if (invalidOtp) setOtp('');
      if (definitiveFailure) setOtp('');
      if (definitiveFailure) {
        setResolution(null);
        setDocumentBytes(null);
        setFatalError('Este enlace no está disponible o ya ha caducado.');
        setActionError('');
      } else {
        setActionError(invalidOtp && failureMessage
          ? failureMessage
          : transientErrorMessage(error));
      }
    } finally {
      setBusy(false);
    }
  }, [rememberRateLimit]);

  const submitDecision = useCallback(async (decision: 'ACCEPT' | 'REJECT'): Promise<void> => {
    setBusy(true);
    setActionError('');
    try {
      let nextResolution: AnyResolution;
      try {
        nextResolution = await adapter.decide(requestId, decision);
      } catch (error: unknown) {
        const ambiguous = (
          error instanceof GuestConsentHttpError
        )
          && ['TIMEOUT', 'NETWORK', 'SERVICE_UNAVAILABLE'].includes(error.failure);
        if (!ambiguous) throw error;
        const recovered = await adapter.resolve(requestId);
        nextResolution = recovered.stage === 'READY'
          ? await adapter.decide(requestId, decision)
          : recovered;
      }
      setResolution(nextResolution);
      setConfirmation(null);
      if (nextResolution.stage === 'TERMINAL') {
        setOtp('');
        setDocumentBytes(null);
      }
    } catch (error: unknown) {
      rememberRateLimit(error);
      if (
        (
          error instanceof GuestConsentHttpError
        )
        && error.failure === 'UNAVAILABLE'
      ) {
        setResolution(null);
        setOtp('');
        setDocumentBytes(null);
        setConfirmation(null);
        setFatalError('Este enlace no está disponible o ya ha caducado.');
      }
      setActionError(transientErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [adapter, rememberRateLimit, requestId]);

  const downloadDocument = (): void => {
    if (!documentBytes) return;
    const exactBuffer = new ArrayBuffer(documentBytes.bytes.byteLength);
    new Uint8Array(exactBuffer).set(documentBytes.bytes);
    const blob = new Blob([exactBuffer], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'autorizacion-hera.html';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const isWithdrawal = resolution?.stage === 'READY' && resolution.requestKind === 'WITHDRAWAL';
  const effectiveClock = clock + serverOffsetMs;
  const resendSeconds = resolution?.stage === 'OTP_REQUIRED'
    ? Math.max(0, Math.ceil((new Date(resolution.canResendAt).getTime() - effectiveClock) / 1000))
    : 0;
  const rateLimitSeconds = Math.max(0, Math.ceil((rateLimitedUntil - clock) / 1000));
  const effectiveResendSeconds = Math.max(resendSeconds, rateLimitSeconds);
  const otpSeconds = resolution?.stage === 'OTP_REQUIRED' && resolution.otpExpiresAt
    ? Math.max(0, Math.ceil((new Date(resolution.otpExpiresAt).getTime() - effectiveClock) / 1000))
    : null;
  const requestSeconds = resolution?.stage === 'READY'
    ? Math.max(0, Math.ceil((new Date(resolution.expiresAt).getTime() - effectiveClock) / 1000))
    : null;
  const requestExpiryMessage = requestSeconds !== null && requestSeconds <= 300
    ? requestSeconds > 60
      ? 'Quedan menos de cinco minutos para decidir.'
      : requestSeconds > 0
        ? 'Queda menos de un minuto para decidir.'
        : 'La solicitud ha caducado.'
    : '';
  const otpExpiryAnnouncement = otpSeconds === 300
    ? 'Quedan cinco minutos para usar el código.'
    : otpSeconds === 60
      ? 'Queda un minuto para usar el código.'
      : otpSeconds === 0
        ? 'El código ha caducado.'
        : '';
  const formattedRequestExpiry = resolution?.stage === 'READY'
    ? new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'Europe/Madrid',
      }).format(new Date(resolution.expiresAt))
    : null;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>HERA</Text>
        <Text style={styles.secureLabel}>Canal privado</Text>
      </View>
      <View style={styles.card}>
        {!started && !fatalError ? (
          <View style={styles.centerState} accessibilityLiveRegion="polite">
            <View style={styles.securityMark}><Text style={styles.securityMarkText}>✓</Text></View>
            <Text style={styles.eyebrow}>Autorización protegida</Text>
            <View ref={stageHeadingRef} style={styles.stageHeading} tabIndex={-1} role="heading" aria-level={1}>
              <Text style={styles.title}>
                {adapter.intro}
              </Text>
            </View>
            <Text style={[styles.body, styles.centeredCopy]}>
              Para proteger tus datos, no abriremos la autorización ni enviaremos ningún código hasta que pulses el botón.
            </Text>
            <ActionButton
              label={busy ? 'Comprobando…' : 'Continuar y recibir código por email'}
              disabled={busy}
              onPress={() => { void continueFlow(); }}
              theme={theme}
            />
          </View>
        ) : null}

        {fatalError ? (
          <View style={styles.centerState} accessibilityLiveRegion="assertive">
            <View ref={stageHeadingRef} style={styles.stageHeading} tabIndex={-1} role="heading" aria-level={1}>
              <Text style={styles.title}>Solicitud no disponible</Text>
            </View>
            <Text style={[styles.body, styles.centeredCopy]}>{fatalError}</Text>
            <Text style={styles.support}>Si necesitas ayuda, escribe a health-hera@gmail.com.</Text>
          </View>
        ) : null}

        {!fatalError && actionError ? (
          <View style={styles.inlineError} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            <Text style={styles.inlineErrorText}>{actionError}</Text>
            {!resolution ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => { void continueFlow(); }}
                disabled={busy}
              >
                <Text style={styles.retryLink}>Reintentar</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {!fatalError && resolution?.stage === 'OTP_REQUIRED' ? (
          <View style={styles.stack}>
            <Text style={styles.eyebrow}>Confirma que eres tú</Text>
            <View ref={stageHeadingRef} style={styles.stageHeading} tabIndex={-1} role="heading" aria-level={1}>
              <Text style={styles.title}>Introduce el código de seis cifras</Text>
            </View>
            <Text style={styles.body}>
              {resolution.otpDeliveryStatus === 'SENT'
                ? `El código está en camino a ${resolution.maskedEmail}. Puede tardar unos segundos en llegar.`
                : resolution.otpDeliveryStatus === 'PROCESSING'
                  ? `Estamos confirmando el envío a ${resolution.maskedEmail}.`
                : resolution.otpDeliveryStatus === 'UNKNOWN'
                  ? `No hemos podido confirmar el envío a ${resolution.maskedEmail}. El código podría llegar; también puedes pedir uno nuevo cuando termine la espera.`
                  : resolution.otpDeliveryStatus === 'FAILED'
                    ? `No se pudo enviar el código a ${resolution.maskedEmail}. Puedes volver a solicitarlo cuando esté disponible.`
                    : `Todavía no se ha enviado ningún código a ${resolution.maskedEmail}.`}
            </Text>
            {otpSeconds !== null ? (
              <Text style={styles.timerText}>
                {otpSeconds > 0 ? `El código caduca en ${otpSeconds} s` : 'El código ha caducado'}
              </Text>
            ) : null}
            {otpExpiryAnnouncement ? (
              <Text style={styles.visuallyHidden} accessibilityLiveRegion="polite">
                {otpExpiryAnnouncement}
              </Text>
            ) : null}
            <TextInput
              value={otp}
              onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor={theme.textMuted}
              accessibilityLabel="Código de verificación de seis cifras"
            />
            <View style={styles.actions}>
              <ActionButton
                label="Verificar código"
                disabled={busy || otp.length !== 6 || otpSeconds === 0}
                onPress={() => { void runResolutionAction(
                  () => adapter.verifyOtp(requestId, otp),
                  'El código no es válido, ha caducado o ha alcanzado el máximo de intentos.'
                ); }}
                theme={theme}
              />
              <ActionButton
                label={resolution.otpDeliveryStatus === 'PROCESSING'
                  ? 'Confirmando el envío…'
                  : effectiveResendSeconds > 0
                    ? `Nuevo código en ${effectiveResendSeconds} s`
                    : 'Enviar otro código por email'}
                secondary
                disabled={busy || effectiveResendSeconds > 0 || resolution.otpDeliveryStatus === 'PROCESSING'}
                onPress={() => { void runResolutionAction(
                  () => adapter.requestOtp(requestId)
                ); }}
                theme={theme}
              />
            </View>
          </View>
        ) : null}

        {!fatalError && resolution?.stage === 'READY' ? (
          <View style={styles.stack}>
            <Text style={styles.eyebrow}>
              {isWithdrawal
                ? 'Retirada de autorización'
                : adapter.grantLabel}
            </Text>
            <View ref={stageHeadingRef} style={styles.stageHeading} tabIndex={-1} role="heading" aria-level={1}>
              <Text style={styles.title}>
                {'specialist' in resolution ? resolution.specialist.displayName : resolution.clinic.name}
              </Text>
            </View>
            <Text style={styles.body}>
              {'specialist' in resolution
                ? `${resolution.specialist.professionalTitle || 'Profesional de la salud'}${resolution.specialist.licenseNumber ? ` · Colegiado/a ${resolution.specialist.licenseNumber}` : ''}. Lee el documento completo antes de decidir.`
                : `Autorización dirigida a ${resolution.patient.displayName}. Lee el documento completo antes de decidir.`}
            </Text>
            <Text style={styles.timerText}>
              {`La solicitud caduca el ${formattedRequestExpiry} (hora peninsular).`}
            </Text>
            {requestExpiryMessage ? (
              <Text style={styles.timerText} accessibilityLiveRegion="polite">
                {requestExpiryMessage}
              </Text>
            ) : null}
            {documentBytes ? (
              <GuestConsentDocumentFrame
                html={documentBytes.html}
                borderColor={theme.border}
              />
            ) : documentError ? (
              <View style={styles.documentError} accessibilityRole="alert">
                <Text style={styles.body}>{documentError}</Text>
                <ActionButton
                  label="Reintentar documento"
                  secondary
                  disabled={busy}
                  onPress={() => { void loadDocument(resolution); }}
                  theme={theme}
                />
              </View>
            ) : (
              <View style={styles.documentLoading} accessibilityLiveRegion="polite">
                <ActivityIndicator color={theme.primary} size="large" />
                <Text style={styles.support}>Verificando el documento inmutable…</Text>
              </View>
            )}
            <Pressable
              onPress={downloadDocument}
              disabled={!documentBytes}
              accessibilityRole="button"
              accessibilityState={{ disabled: !documentBytes }}
            >
              <Text style={[styles.download, !documentBytes && styles.disabledText]}>
                Descargar una copia de este documento
              </Text>
            </Pressable>
            {confirmation ? (
              <View
                ref={confirmationRef}
                tabIndex={-1}
                role="dialog"
                aria-modal
                style={styles.confirmBox}
                accessibilityLiveRegion="polite"
              >
                <Text style={styles.confirmTitle}>
                  {confirmation === 'ACCEPT'
                    ? isWithdrawal ? '¿Confirmas la retirada?' : '¿Confirmas la autorización?'
                    : '¿Confirmas que rechazas la solicitud?'}
                </Text>
                <Text style={styles.body}>
                  Esta acción quedará registrada como evidencia de tu decisión.
                </Text>
                <View style={styles.actions}>
                  <ActionButton
                    label="Confirmar decisión"
                    disabled={busy}
                    onPress={() => { void submitDecision(confirmation); }}
                    theme={theme}
                  />
                  <ActionButton
                    label="Volver"
                    secondary
                    disabled={busy}
                    onPress={() => {
                      setConfirmation(null);
                      window.setTimeout(() => {
                        const node = decisionTriggerRef.current as unknown as { focus?: () => void } | null;
                        node?.focus?.();
                      }, 0);
                    }}
                    theme={theme}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.actions}>
                <ActionButton
                  label={isWithdrawal ? 'Retirar autorización' : 'Autorizar'}
                  disabled={busy || !documentBytes || requestSeconds === 0}
                  buttonRef={decisionTriggerRef}
                  onPress={() => setConfirmation('ACCEPT')}
                  theme={theme}
                />
                <ActionButton
                  label="Rechazar"
                  secondary
                  disabled={busy || !documentBytes || requestSeconds === 0}
                  onPress={() => setConfirmation('REJECT')}
                  theme={theme}
                />
              </View>
            )}
          </View>
        ) : null}

        {!fatalError && resolution?.stage === 'TERMINAL' ? (
          <View style={styles.centerState} accessibilityLiveRegion="polite">
            <View style={styles.securityMark}><Text style={styles.securityMarkText}>✓</Text></View>
            <Text style={styles.eyebrow}>Decisión registrada</Text>
            <View ref={stageHeadingRef} style={styles.stageHeading} tabIndex={-1} role="heading" aria-level={1}>
              <Text style={styles.title}>
                {resolution.result.status === 'ACCEPTED'
                  ? 'Autorización confirmada'
                  : resolution.result.status === 'REVOKED'
                    ? 'Autorización retirada'
                    : 'Solicitud rechazada'}
              </Text>
            </View>
            <Text style={[styles.body, styles.centeredCopy]}>
              Tu decisión se ha guardado correctamente. Puedes cerrar esta pestaña; no necesitas una cuenta HERA.
            </Text>
          </View>
        ) : null}
        {busy && resolution ? <ActivityIndicator color={theme.primary} style={styles.busyOverlay} /> : null}
      </View>
      <Text style={styles.footer}>HERA · Confirmación privada de autorizaciones · health-hera@gmail.com</Text>
    </ScrollView>
  );
}

function ActionButton({ label, onPress, disabled, secondary, theme, buttonRef }: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  secondary?: boolean;
  theme: Theme;
  buttonRef?: React.Ref<React.ElementRef<typeof Pressable>>;
}): React.ReactElement {
  return (
    <Pressable
      ref={buttonRef}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: theme.primary,
        backgroundColor: secondary ? 'transparent' : theme.primary,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      <Text style={{
        color: secondary ? theme.primary : theme.textOnPrimary,
        fontFamily: theme.fontSansBold,
        fontSize: 15,
      }}>
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 18,
  },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  stageHeading: { outlineColor: 'transparent', outlineStyle: 'solid', outlineWidth: 0 },
  brand: { color: theme.primary, fontFamily: theme.fontDisplay, fontSize: 30, letterSpacing: 1 },
  secureLabel: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 13 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgCard,
    padding: 24,
    minHeight: 330,
  },
  stack: { gap: 18 },
  centerState: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 14 },
  centeredCopy: { maxWidth: 620, textAlign: 'center' },
  securityMark: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primaryAlpha12,
    borderWidth: 1,
    borderColor: theme.primary,
  },
  securityMarkText: { color: theme.primary, fontFamily: theme.fontSansBold, fontSize: 22 },
  eyebrow: {
    color: theme.primary,
    fontFamily: theme.fontSansBold,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: { color: theme.textPrimary, fontFamily: theme.fontDisplay, fontSize: 28, lineHeight: 36 },
  body: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 16, lineHeight: 24 },
  support: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21 },
  timerText: { color: theme.textMuted, fontFamily: theme.fontSansBold, fontSize: 13, lineHeight: 18 },
  otpInput: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.bg,
    color: theme.textPrimary,
    fontFamily: theme.fontSansBold,
    fontSize: 28,
    letterSpacing: 10,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  download: { color: theme.primary, fontFamily: theme.fontSansBold, fontSize: 14, textDecorationLine: 'underline' },
  disabledText: { opacity: 0.45 },
  confirmBox: { gap: 12, borderWidth: 1, borderColor: theme.warning, borderRadius: 14, backgroundColor: theme.warningBg, padding: 18 },
  confirmTitle: { color: theme.textPrimary, fontFamily: theme.fontSansBold, fontSize: 18 },
  documentError: { gap: 12, borderWidth: 1, borderColor: theme.error, borderRadius: 12, backgroundColor: theme.errorBg, padding: 16 },
  documentLoading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 },
  busyOverlay: { marginTop: 18 },
  footer: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  inlineError: { gap: 8, borderWidth: 1, borderColor: theme.error, borderRadius: 10, backgroundColor: theme.errorBg, padding: 12, marginBottom: 16 },
  inlineErrorText: { color: theme.error, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 20 },
  retryLink: { color: theme.primary, fontFamily: theme.fontSansBold, fontSize: 14, textDecorationLine: 'underline' },
  visuallyHidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
});

export const ClinicGuestConsentPublicScreen = GuestConsentPublicScreen;
export default GuestConsentPublicScreen;
