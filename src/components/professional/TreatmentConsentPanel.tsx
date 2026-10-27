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
  const body = {
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
    fontSize: 14,
    lineHeight: 22,
  };
  const date = (value: string | null) => (value ? new Date(value).toLocaleDateString('es-ES') : '');
  return (
    <View style={styles.stack}>
      <Card padding="medium">
        <View style={styles.stack}>
          <View style={styles.heading}>
            <Text
              accessibilityRole="header"
              style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 19 }}
            >
              Consentimiento informado
            </Text>
            {data ? (
              <Text
                style={{
                  color: data.status === 'SIGNED' ? theme.primary : theme.textSecondary,
                  fontFamily: theme.fontSansSemiBold,
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
                : 'Aceptación digital'}{' '}
              · Registrado el {date(data.recordedAt)}
            </Text>
          ) : (
            <Text style={body}>Envía el documento de HERA o registra un PDF ya firmado.</Text>
          )}
          <View style={[styles.actions, width < 600 && styles.mobileActions]}>
            <Button
              size="small"
              disabled={busy || !data?.capabilities.canSend}
              onPress={() => setReviewScope('GRANT')}
            >
              Enviar para firma
            </Button>
            <Button
              size="small"
              variant="outline"
              disabled={busy || !data?.capabilities.canUpload}
              onPress={() => void run(upload)}
            >
              {fileRef.current ? 'Reintentar subida' : 'Subir PDF firmado'}
            </Button>
          </View>
          {data?.capabilities.digitalUnavailableReason ? (
            <Text style={body}>{data.capabilities.digitalUnavailableReason}</Text>
          ) : null}
          {data?.capabilities.canPrepare && !data.capabilities.canSend ? (
            <Button
              style={{ alignSelf: 'flex-start' }}
              size="small"
              variant="ghost"
              disabled={busy}
              onPress={() => setReviewScope('GRANT')}
            >
              Revisar borrador de HERA
            </Button>
          ) : null}
          <Text style={[body, { fontSize: 12, lineHeight: 18 }]}>
            El profesional responde de la documentación aportada. HERA registra el PDF sin verificar
            jurídicamente su contenido ni sus firmas.
          </Text>
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
              <Button
                size="small"
                variant="ghost"
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
                <Button
                  size="small"
                  variant="ghost"
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
                <Button
                  size="small"
                  variant="ghost"
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
          <View style={styles.actions}>
            {data?.evidenceDocumentId ? (
              <Button
                size="small"
                variant="ghost"
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
              <Button
                size="small"
                variant="ghost"
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
              <Button
                size="small"
                variant="ghost"
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
            {data?.status === 'SIGNED' && data.evidenceRequestId && data.capabilities.canSend ? (
              <Button
                size="small"
                variant="ghost"
                disabled={busy}
                onPress={() => setReviewScope('WITHDRAWAL')}
              >
                Solicitar retirada al paciente
              </Button>
            ) : null}
            {data?.status === 'SIGNED' && data.capabilities.canUpload ? (
              <>
                <Button
                  size="small"
                  variant="ghost"
                  disabled={busy}
                  onPress={() => setCorrection('WITHDRAW')}
                >
                  Registrar retirada
                </Button>
                <Button
                  size="small"
                  variant="ghost"
                  disabled={busy}
                  onPress={() => setCorrection('INVALIDATE')}
                >
                  Corregir registro
                </Button>
              </>
            ) : null}
            <Button
              size="small"
              variant="ghost"
              disabled={busy || !data}
              onPress={() =>
                void run(async () =>
                  setHistory(history ? null : await consent.getTreatmentHistory(clientId, token)),
                )
              }
            >
              {history ? 'Ocultar historial' : 'Ver historial'}
            </Button>
          </View>
        </View>
      </Card>
      {reviewScope ? (
        <Card padding="medium">
          <View style={styles.stack}>
            <Text style={body}>
              La plantilla cubre atención psicológica sanitaria individual de una persona adulta que
              actúa por sí misma. Al continuar confirmas que este es el caso.
            </Text>
            <View style={styles.actions}>
              <Button
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    const result = await consent.prepareTreatmentConsent(
                      clientId,
                      token,
                      commandKey(`prepare:${reviewScope}`),
                      reviewScope === 'WITHDRAWAL',
                    );
                    setPreview(result);
                    setReviewScope(null);
                    await refresh();
                  })
                }
              >
                Revisar documento
              </Button>
              <Button variant="ghost" onPress={() => setReviewScope(null)}>
                Volver
              </Button>
            </View>
          </View>
        </Card>
      ) : null}
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
                  <Button
                    size="small"
                    variant="ghost"
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
                    <Button
                      disabled={busy || !preview.canSend}
                      onPress={() =>
                        void run(async () =>
                          changed(
                            await consent.sendTreatmentConsent(
                              clientId,
                              token,
                              preview.requestId,
                              preview.sha256,
                              commandKey(`send:${preview.requestId}`),
                            ),
                          ),
                        )
                      }
                    >
                      {data.activeRequest.stage === 'SENT'
                        ? 'Reenviar enlace'
                        : 'Enviar documento revisado'}
                    </Button>
                  ) : null}
                  <Button variant="ghost" onPress={() => setPreview(null)}>
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
              <Button
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
              <Button variant="ghost" onPress={() => setCorrection(null)}>
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
                          ? 'Evidencia registrada'
                          : 'Solicitud actualizada'}{' '}
                    · {date(item.createdAt)}
                  </Text>
                  {item.reason ? <Text style={body}>{item.reason}</Text> : null}
                  {item.evidenceDocumentId ? (
                    <Button
                      size="small"
                      variant="ghost"
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
                      Ver evidencia
                    </Button>
                  ) : item.requestId ? (
                    <Button
                      size="small"
                      variant="ghost"
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
              <Button
                variant="ghost"
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
      <Text style={[body, { fontSize: 12 }]}>
        El profesional debe facilitar al paciente la información de privacidad fuera de HERA.
        No se requiere una segunda aceptación en la aplicación.
      </Text>
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
