import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { Button } from '../../components/common/Button';
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from '../../constants/legal';
import { spacing } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { acceptLegalDocuments } from '../../services/legalService';
import type { AppNavigationProp } from '../../constants/types';
import { getErrorMessage } from '../../constants/errors';

interface RequiredLegalAcceptanceScreenProps {
  requiredDocumentKeys: LegalDocumentKey[];
  onAccepted: () => void;
}

export function RequiredLegalAcceptanceScreen({
  requiredDocumentKeys,
  onAccepted,
}: RequiredLegalAcceptanceScreenProps) {
  const navigation = useNavigation<AppNavigationProp>();
  const { theme } = useTheme();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!accepted) {
      setError('Debes confirmar que has leído y aceptas las condiciones vigentes.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await acceptLegalDocuments(requiredDocumentKeys, 'required-gate');
      onAccepted();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'No se pudo registrar la aceptación.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.shell}>
        <View style={[styles.icon, { backgroundColor: theme.primaryAlpha12 }]}>
          <Ionicons name="shield-checkmark-outline" size={28} color={theme.primary} />
        </View>
        <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>
          Antes de continuar
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
          Hemos actualizado las condiciones legales y de privacidad de HERA. Para seguir usando la aplicación,
          necesitamos registrar tu aceptación de las versiones vigentes.
        </Text>

        <View style={styles.documents}>
          {requiredDocumentKeys.map((key) => {
            const document = LEGAL_DOCUMENTS[key];
            return (
              <AnimatedPressable
                key={key}
                onPress={() => navigation.navigate('LegalDocument', { documentKey: key })}
                hoverLift={false}
                pressScale={0.98}
                style={[styles.documentRow, { borderColor: theme.border, backgroundColor: theme.bgCard }]}
              >
                <View style={styles.documentCopy}>
                  <Text style={[styles.documentTitle, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}>
                    {document.title}
                  </Text>
                  <Text style={[styles.documentMeta, { color: theme.textMuted, fontFamily: theme.fontSans }]}>
                    Versión {document.version}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={18} color={theme.textSecondary} />
              </AnimatedPressable>
            );
          })}
        </View>

        <AnimatedPressable
          onPress={() => setAccepted((value) => !value)}
          hoverLift={false}
          pressScale={0.99}
          style={styles.acceptRow}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: accepted ? theme.primary : theme.bgCard,
                borderColor: accepted ? theme.primary : theme.border,
              },
            ]}
          >
            {accepted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
          <Text style={[styles.acceptText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
            He leído y acepto los documentos vigentes indicados arriba.
          </Text>
        </AnimatedPressable>

        {error ? (
          <Text style={[styles.error, { color: theme.warning, fontFamily: theme.fontSansSemiBold }]}>
            {error}
          </Text>
        ) : null}

        <Button
          onPress={submit}
          variant="primary"
          size="large"
          fullWidth
          loading={loading}
          disabled={!accepted}
          icon={<Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />}
        >
          Aceptar y continuar
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  shell: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 38,
    lineHeight: 44,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 25,
    marginBottom: spacing.xl,
  },
  documents: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
  },
  documentCopy: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  documentMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  acceptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  acceptText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
});
