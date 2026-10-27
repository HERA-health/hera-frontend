import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button, Card } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/colors';
import { createSecureRandomUuid } from '../../utils/secureRandom';
import { pickClinicalFiles } from '../../services/clinicalFilePicker';
import { releaseClinicalAssets } from '../../services/clinicalFileCache';
import { isClinicalSaveUncertain, openClinicalDocument } from '../../services/clinicalService';
import type { UploadAsset } from '../../utils/multipartUpload';
import * as consent from '../../services/treatmentConsentService';
import { TreatmentConsentDocument } from './TreatmentConsentDocument';

export const treatmentStatusLabel = {
  PENDING: 'Pendiente',
  SENT: 'Enviado',
  SIGNED: 'Firmado',
  WITHDRAWN: 'Retirado',
};
export function TreatmentConsentPanel({
  clientId,
  token,
  onChanged,
}: {
  clientId: string;
  token: string;
  onChanged: () => Promise<unknown>;
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<consent.TreatmentConsent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<consent.TreatmentPreview | null>(null);
  const [reviewScope, setReviewScope] = useState<'GRANT' | 'WITHDRAWAL' | null>(null);
  const [history, setHistory] = useState<consent.TreatmentHistory | null>(null);
  const [correction, setCorrection] = useState<'WITHDRAW' | 'INVALIDATE' | null>(null);
  const [reason, setReason] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const preparedChoice = useRef<{ scope: 'GRANT' | 'WITHDRAWAL'; document: consent.TreatmentPreview; sendKey: string } | null>(null);
  const fileRef = useRef<{ file: UploadAsset; key: string } | null>(null);
  const operation = useRef<{ action: string; key: string } | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const busyRef = useRef(false);
  const currentContext = useRef(`${clientId}:${token}`);
  if (currentContext.current !== `${clientId}:${token}`) {
    currentContext.current = `${clientId}:${token}`;
    generation.current++;
  }
  const commandKey = (action: string) => {
    if (operation.current?.action !== action)
      operation.current = { action, key: createSecureRandomUuid() };
    return operation.current.key;
  };
  const refresh = useCallback(async () => {
    const current = generation.current;
    const result = await consent.getTreatmentConsent(clientId, token);
    if (mounted.current && current === generation.current) setData(result);
  }, [clientId, token]);
  useEffect(() => {
    mounted.current = true;
    setData(null);
    setPreview(null);
    setError(null);
    setHistory(null);
    setReviewScope(null);
    setCorrection(null);
    setShowHelp(false);
    preparedChoice.current = null;
    setBusy(false);
    operation.current = null;
    void refresh().catch((e) => {
      if (mounted.current)
        setError(e instanceof Error ? e.message : 'No se pudo cargar el consentimiento.');
    });
    return () => {
      mounted.current = false;
      if (fileRef.current) releaseClinicalAssets([fileRef.current.file]);
      fileRef.current = null;
    };
  }, [refresh]);
  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const current = generation.current;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      if (mounted.current && current === generation.current)
        setError(e instanceof Error ? e.message : 'No se pudo completar la operación.');
    } finally {
      busyRef.current = false;
      if (mounted.current && current === generation.current) setBusy(false);
    }
  };
  const changed = async (result: consent.TreatmentConsent) => {
    if (!mounted.current) return;
    setData(result);
    setPreview(null);
    setHistory(null);
    setReviewScope(null);
    preparedChoice.current = null;
    operation.current = null;
    try {
      await onChanged();
    } catch {
      setError('El cambio está registrado. Actualiza la ficha para sincronizar el resumen.');
    }
  };
  const upload = async () => {
    const current = generation.current;
    if (!fileRef.current) {
      const files = await pickClinicalFiles(false, ['application/pdf']);
      if (!files[0]) return;
      if (!mounted.current || current !== generation.current) {
        releaseClinicalAssets(files);
        return;
      }
      fileRef.current = { file: files[0], key: createSecureRandomUuid() };
    }
    const pending = fileRef.current;
    let result: consent.TreatmentConsent;
    try {
      result = await consent.uploadTreatmentPdf(clientId, token, pending.file, pending.key);
    } catch (error) {
      // An uncertain response must reuse the operation key. A definitive
      // rejection lets the user choose a corrected PDF on the next attempt.
      if (!isClinicalSaveUncertain(error) && fileRef.current === pending) {
        releaseClinicalAssets([pending.file]);
        fileRef.current = null;
      }
      throw error;
    }
    if (mounted.current && current === generation.current) {
      releaseClinicalAssets([pending.file]);
      fileRef.current = null;
      await changed(result);
    }
  };
  const sendDocument = async (document: consent.TreatmentPreview, key: string) => {
    const current = generation.current;
    let result: consent.TreatmentConsent;
    try {
      result = await consent.sendTreatmentConsent(clientId, token, document.requestId, document.sha256, key);
    } catch (error) {
      if (mounted.current && current === generation.current && !isClinicalSaveUncertain(error)) {
        preparedChoice.current = null;
        operation.current = null;
      }
      throw error;
    }
    if (mounted.current && current === generation.current) await changed(result);
  };
  const prepareDocument = async (sendNow: boolean) => {
    if (!reviewScope) return;
    const current = generation.current;
    let prepared = preparedChoice.current;
    if (!prepared || prepared.scope !== reviewScope) {
      const document = await consent.prepareTreatmentConsent(
        clientId, token, commandKey(`prepare:${reviewScope}`), reviewScope === 'WITHDRAWAL',
      );
      if (!mounted.current || current !== generation.current) return;
      prepared = { scope: reviewScope, document, sendKey: createSecureRandomUuid() };
      preparedChoice.current = prepared;
    }
    if (sendNow && prepared.document.canSend && !prepared.document.pendingLegalReview) {
      await sendDocument(prepared.document, prepared.sendKey);
    } else {
      if (!prepared.document.canSend || prepared.document.pendingLegalReview) preparedChoice.current = null;
      setPreview(prepared.document);
      setReviewScope(null);
      await refresh();
    }
  };
  const body = {
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
    fontSize: 14,
    lineHeight: 22,
  };
  const date = (value: string | null) => (value ? new Date(value).toLocaleDateString('es-ES') : '');
  return (
    <View style={styles.stack}>
      <View style={styles.stack}>
          <View style={styles.heading}>
            <Text
              accessibilityRole="header"
              style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 19 }}
            >
              Estado del consentimiento
            </Text>
            {data ? (
              <Text
                style={{
                  color: data.status === 'SIGNED' ? theme.primary : theme.textSecondary,
                  fontFamily: theme.fontSansSemiBold,
                  backgroundColor: theme.primaryAlpha12,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: 20,
                }}
              >
                {treatmentStatusLabel[data.status]}
              </Text>
            ) : (
              <ActivityIndicator />
            )}
          </View>
          {data?.recordedAt ? (
            <Text style={body}>
              {data.method === 'UPLOADED_PDF'
                ? 'PDF aportado por el profesional'
                : 'Firmado digitalmente'}{' '}
              · Registrado el {date(data.recordedAt)}
            </Text>
          ) : (
            <Text style={body}>Envía el documento de HERA o registra un PDF ya firmado.</Text>
          )}
          <View style={[styles.actions, width < 600 && styles.mobileActions]}>
            <Button fullWidth={width < 600}
              size="small"
              disabled={busy || !data?.capabilities.canSend}
              onPress={() => setReviewScope('GRANT')}
            >
              Enviar para firma
            </Button>
            <Button fullWidth={width < 600}
              size="small"
              variant="outline"
              disabled={busy || !data?.capabilities.canUpload}
              onPress={() => void run(upload)}
            >
              {fileRef.current ? 'Reintentar subida' : 'Subir PDF firmado'}
            </Button>
          </View>
          {reviewScope ? (
            <Card variant="outlined" padding="medium">
              <View style={styles.stack}>
                <Text accessibilityRole="header" style={{ ...body, color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 18 }}>
                  {reviewScope === 'WITHDRAWAL' ? 'Enviar solicitud de retirada' : 'Enviar consentimiento por correo'}
                </Text>
                <Text style={body}>
                  {data?.capabilities.canSend ? 'Puedes enviarlo ahora o leerlo antes.' : 'Puedes leer el borrador antes de que esté disponible para enviar.'} El documento incluye los datos del paciente y del profesional.
                </Text>
                <Text style={body}>
                  Al continuar confirmas que se trata de psicología sanitaria individual para una persona adulta que actúa por sí misma.
                </Text>
                <View style={[styles.actions, width < 600 && styles.mobileActions]}>
                  {data?.capabilities.canSend ? (
                    <Button fullWidth={width < 600} disabled={busy} onPress={() => void run(() => prepareDocument(true))}>
                      Enviar ahora
                    </Button>
                  ) : null}
                  <Button fullWidth={width < 600}
                    variant="outline"
                    disabled={busy}
                    onPress={() => void run(() => prepareDocument(false))}
                  >
                    Revisar antes
                  </Button>
                  <Button fullWidth={width < 600} variant="outline" disabled={busy} onPress={() => setReviewScope(null)}>
                    Volver
                  </Button>
                </View>
              </View>
            </Card>
          ) : null}
          {data?.capabilities.digitalUnavailableReason ? (
            <Text style={body}>{data.capabilities.digitalUnavailableReason}</Text>
          ) : null}
          {data?.capabilities.canPrepare && !data.capabilities.canSend ? (
            <Button fullWidth={width < 600}
              style={{ alignSelf: 'flex-start' }}
              size="small"
              variant="outline"
              disabled={busy}
              onPress={() => setReviewScope('GRANT')}
            >
              Revisar borrador de HERA
            </Button>
          ) : null}
          {busy ? (
            <ActivityIndicator
              accessibilityLabel="Guardando consentimiento"
              color={theme.primary}
            />
          ) : null}
          {error ? (
            <View style={styles.stack}>
              <Text accessibilityRole="alert" style={{ ...body, color: theme.error }}>
                {error}
              </Text>
              <Button fullWidth={width < 600}
                size="small"
                variant="outline"
                disabled={busy}
                onPress={() => void run(refresh)}
              >
                Actualizar estado
              </Button>
            </View>
          ) : null}
          {data?.activeRequest ? (
            <View style={styles.stack}>
              <Text style={body}>
                {data.activeRequest.stage === 'PREPARED'
                  ? 'Documento preparado, todavía sin enviar.'
                  : data.activeRequest.deliveryStatus === 'PROVIDER_ACCEPTED'
                    ? 'Solicitud enviada.'
                    : data.activeRequest.deliveryStatus === 'FAILED'
                      ? 'No se pudo entregar la solicitud.'
                      : 'Entrega todavía no confirmada.'}{' '}
                Caduca el {date(data.activeRequest.expiresAt)}.
              </Text>
              <View style={styles.actions}>
                <Button fullWidth={width < 600}
                  size="small"
                  variant="outline"
                  disabled={busy}
                  onPress={() =>
                    void run(async () =>
                      setPreview(
                        await consent.previewTreatmentConsent(
                          clientId,
                          token,
                          data.activeRequest!.id,
                        ),
                      ),
                    )
                  }
                >
                  Revisar solicitud
                </Button>
                <Button fullWidth={width < 600}
                  size="small"
                  variant="outline"
                  disabled={busy}
                  onPress={() =>
                    void run(async () =>
                      changed(
                        await consent.cancelTreatmentConsent(
                          clientId,
                          token,
                          data.activeRequest!.id,
                        ),
                      ),
                    )
                  }
                >
                  Cancelar solicitud
                </Button>
              </View>
            </View>
          ) : null}
          <Text style={{ ...body, color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }}>Documentos e historial</Text>
          <View style={[styles.actions, width < 600 && styles.mobileActions]}>
            {data?.evidenceDocumentId ? (
              <Button fullWidth={width < 600}
                size="small"
                variant="outline"
                disabled={busy}
                onPress={() =>
                  void run(() =>
                    openClinicalDocument(
                      data.evidenceDocumentId!,
                      'consentimiento-informado.pdf',
                      'application/pdf',
                      token,
                    ),
                  )
                }
              >
                Ver PDF
              </Button>
            ) : null}
            {data?.evidenceRequestId ? (
              <Button fullWidth={width < 600}
                size="small"
                variant="outline"
                disabled={busy}
                onPress={() =>
                  void run(async () =>
                    setPreview(
                      await consent.previewTreatmentConsent(
                        clientId,
                        token,
                        data.evidenceRequestId!,
                      ),
                    ),
                  )
                }
              >
                Ver documento aceptado
              </Button>
            ) : null}
            {data?.evidenceRequestId ? (
              <Button fullWidth={width < 600}
                size="small"
                variant="outline"
                disabled={busy}
                onPress={() =>
                  void run(() =>
                    consent.downloadSpecialistReceipt(clientId, token, data.evidenceRequestId!),
                  )
                }
              >
                Descargar justificante
              </Button>
            ) : null}
            <Button fullWidth={width < 600}
              size="small"
              variant="outline"
              disabled={busy || !data}
              onPress={() => void run(async () => setHistory(history ? null : await consent.getTreatmentHistory(clientId, token)))}
            >
              {history ? 'Ocultar historial' : 'Ver historial'}
            </Button>
          </View>
          {data?.status === 'SIGNED' && (data.capabilities.canUpload || (data.evidenceRequestId && data.capabilities.canSend)) ? (
            <Text style={{ ...body, color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }}>Otras gestiones</Text>
          ) : null}
          <View style={[styles.actions, width < 600 && styles.mobileActions]}>
            {data?.status === 'SIGNED' && data.evidenceRequestId && data.capabilities.canSend ? (
              <Button fullWidth={width < 600}
                size="small"
                variant="outline"
                disabled={busy}
                onPress={() => setReviewScope('WITHDRAWAL')}
              >
                Solicitar retirada al paciente
              </Button>
            ) : null}
            {data?.status === 'SIGNED' && data.capabilities.canUpload ? (
              <>
                <Button fullWidth={width < 600}
                  size="small"
                  variant="outline"
                  disabled={busy}
                  onPress={() => setCorrection('WITHDRAW')}
                >
                  Registrar retirada
                </Button>
                <Button fullWidth={width < 600}
                  size="small"
                  variant="outline"
                  disabled={busy}
                  onPress={() => setCorrection('INVALIDATE')}
                >
                  Corregir registro
                </Button>
              </>
            ) : null}
          </View>
      </View>
      <Modal
        visible={Boolean(preview)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busyRef.current) setPreview(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: theme.overlay }}>
          <ScrollView
            contentContainerStyle={{ padding: width < 600 ? 12 : 32, alignItems: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            {preview ? (
              <View
                accessibilityViewIsModal
                style={{
                  width: '100%',
                  maxWidth: 860,
                  padding: width < 600 ? 16 : 24,
                  borderRadius: 16,
                  backgroundColor: theme.bgCard,
                  gap: spacing.md,
                }}
              >
                <View style={styles.heading}>
                  <Text
                    accessibilityRole="header"
                    style={{
                      ...body,
                      color: theme.textPrimary,
                      fontFamily: theme.fontSansSemiBold,
                      fontSize: 19,
                    }}
                  >
                    Revisar consentimiento informado
                  </Text>
                  <Button fullWidth={width < 600}
                    size="small"
                    variant="outline"
                    disabled={busy}
                    onPress={() => setPreview(null)}
                  >
                    Cerrar
                  </Button>
                </View>
                {preview.sendUnavailableReason || preview.pendingLegalReview ? (
                  <Text style={body}>
                    {preview.sendUnavailableReason || 'Borrador pendiente de revisión. No puede enviarse al paciente.'}
                  </Text>
                ) : null}
                <TreatmentConsentDocument html={preview.html} borderColor={theme.borderLight} />
                <View style={styles.actions}>
                  {data?.activeRequest?.id === preview.requestId ? (
                    <Button fullWidth={width < 600}
                      disabled={busy || !preview.canSend}
                      onPress={() =>
                        void run(() =>
                          sendDocument(
                            preview,
                            preparedChoice.current?.document.requestId === preview.requestId
                              ? preparedChoice.current.sendKey
                              : commandKey(`send:${preview.requestId}`),
                          ),
                        )
                      }
                    >
                      {data.activeRequest.stage === 'SENT'
                        ? 'Reenviar enlace'
                        : 'Enviar por correo'}
                    </Button>
                  ) : null}
                  <Button fullWidth={width < 600} variant="outline" onPress={() => setPreview(null)}>
                    Cerrar documento
                  </Button>
                </View>
                {error ? (
                  <Text accessibilityRole="alert" style={{ ...body, color: theme.error }}>
                    {error}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
      {correction && data?.eventId ? (
        <Card padding="medium">
          <View style={styles.stack}>
            <Text style={body}>
              {correction === 'WITHDRAW'
                ? 'Registra la retirada comunicada por el paciente. Las evidencias se conservarán.'
                : 'Indica por qué este registro no debe considerarse vigente. La evidencia y su historial se conservarán.'}
            </Text>
            <TextInput
              accessibilityLabel="Motivo del cambio"
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={1000}
              style={{
                ...body,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.borderLight,
                borderRadius: 8,
              }}
            />
            <View style={styles.actions}>
              <Button fullWidth={width < 600}
                disabled={busy || reason.trim().length < 3}
                onPress={() =>
                  void run(async () => {
                    const result = await consent.changeTreatmentEvidence(
                      clientId,
                      token,
                      data.eventId!,
                      correction,
                      reason,
                      commandKey(`correction:${data.eventId}:${correction}:${reason}`),
                    );
                    setCorrection(null);
                    setReason('');
                    await changed(result);
                  })
                }
              >
                Guardar cambio
              </Button>
              <Button fullWidth={width < 600} variant="outline" onPress={() => setCorrection(null)}>
                Cancelar
              </Button>
            </View>
          </View>
        </Card>
      ) : null}
      {history ? (
        <Card padding="medium">
          <View style={styles.stack}>
            <Text style={{ ...body, fontFamily: theme.fontSansSemiBold }}>
              Historial del consentimiento informado
            </Text>
            {history.items.length === 0 ? (
              <Text style={body}>Todavía no hay actuaciones registradas.</Text>
            ) : (
              history.items.map((item) => (
                <View key={item.id}>
                  <Text style={body}>
                    {item.reasonCode === 'EVIDENCE_INVALIDATED'
                      ? 'Registro corregido'
                      : item.reasonCode?.includes('WITHDRAWAL')
                        ? 'Retirada registrada'
                        : [
                              'SIGNED_DOCUMENT_UPLOADED',
                              'PATIENT_ACCEPTANCE',
                              'LEGACY_DOCUMENT_IMPORT',
                            ].includes(item.reasonCode ?? '')
                          ? 'Consentimiento registrado'
                          : 'Solicitud actualizada'}{' '}
                    · {date(item.createdAt)}
                  </Text>
                  {item.reason ? <Text style={body}>{item.reason}</Text> : null}
                  {item.evidenceDocumentId ? (
                    <Button fullWidth={width < 600}
                      size="small"
                      variant="outline"
                      onPress={() =>
                        void run(() =>
                          openClinicalDocument(
                            item.evidenceDocumentId!,
                            'consentimiento-informado.pdf',
                            'application/pdf',
                            token,
                          ),
                        )
                      }
                    >
                      Ver documento
                    </Button>
                  ) : item.requestId ? (
                    <Button fullWidth={width < 600}
                      size="small"
                      variant="outline"
                      onPress={() =>
                        void run(async () =>
                          setPreview(
                            await consent.previewTreatmentConsent(clientId, token, item.requestId!),
                          ),
                        )
                      }
                    >
                      Ver documento
                    </Button>
                  ) : null}
                </View>
              ))
            )}
            {history.nextCursor ? (
              <Button fullWidth={width < 600}
                variant="outline"
                onPress={() =>
                  void run(async () => {
                    const next = await consent.getTreatmentHistory(
                      clientId,
                      token,
                      history.nextCursor!,
                    );
                    setHistory({
                      items: [...history.items, ...next.items],
                      nextCursor: next.nextCursor,
                    });
                  })
                }
              >
                Ver anteriores
              </Button>
            ) : null}
          </View>
        </Card>
      ) : null}
      <Button fullWidth={width < 600} size="small" variant="outline" style={{ alignSelf: 'flex-start' }} onPress={() => setShowHelp(!showHelp)}>
        {showHelp ? 'Ocultar información' : 'Sobre los documentos y la privacidad'}
      </Button>
      {showHelp ? <Text style={[body, { fontSize: 12 }]}>
        Informa al paciente sobre la privacidad de sus datos por tus canales habituales.
        Si subes un PDF, comprueba su contenido y su firma: HERA lo guarda, pero no los verifica.
      </Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mobileActions: { flexDirection: 'column', alignItems: 'stretch' },
});
