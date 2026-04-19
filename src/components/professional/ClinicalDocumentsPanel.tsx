import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, Button, Card } from '../common';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { ClinicalDocument } from '../../services/clinicalService';

interface ClinicalDocumentsPanelProps {
  isTablet: boolean;
  title: string;
  description: string;
  documents: ClinicalDocument[];
  openingDocumentId: string | null;
  uploadLabel?: string;
  uploading?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onUpload?: () => void;
  onOpenDocument: (document: ClinicalDocument) => void;
}

const formatDate = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Sin fecha';

const formatFileSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) {
    return '0 KB';
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getDocumentIcon = (mimeType: string) => {
  if (mimeType === 'application/pdf') {
    return 'document-text-outline' as const;
  }

  if (mimeType.startsWith('image/')) {
    return 'image-outline' as const;
  }

  return 'document-outline' as const;
};

export function ClinicalDocumentsPanel({
  isTablet,
  title,
  description,
  documents,
  openingDocumentId,
  uploadLabel = 'Subir',
  uploading = false,
  emptyTitle,
  emptyDescription,
  onUpload,
  onOpenDocument,
}: ClinicalDocumentsPanelProps) {
  const { theme } = useTheme();
  const displayTitleStyle = useMemo(() => ({ fontFamily: theme.fontDisplayBold }), [theme]);
  const labelStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const emphasisStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);

  return (
    <Card variant="default" padding="large">
      <View style={[styles.header, !isTablet && styles.headerMobile]}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.textPrimary }, displayTitleStyle]}>
            {title}
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {description}
          </Text>
        </View>
        {onUpload ? (
          <Button variant="outline" size="small" onPress={onUpload} loading={uploading}>
            {uploadLabel}
          </Button>
        ) : null}
      </View>

      {documents.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
          <Ionicons name="folder-open-outline" size={22} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }, emphasisStyle]}>
            {emptyTitle}
          </Text>
          <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
            {emptyDescription}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {documents.map((document) => (
            <AnimatedPressable
              key={document.id}
              hoverLift={false}
              pressScale={0.995}
              onPress={() => onOpenDocument(document)}
              style={[
                styles.documentRow,
                {
                  backgroundColor: theme.bgMuted,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={[styles.documentIconWrap, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons
                  name={getDocumentIcon(document.mimeType)}
                  size={18}
                  color={theme.primary}
                />
              </View>
              <View style={styles.documentMeta}>
                <Text
                  numberOfLines={1}
                  style={[styles.documentName, { color: theme.textPrimary }, emphasisStyle]}
                >
                  {document.fileName}
                </Text>
                <Text style={[styles.documentCaption, { color: theme.textSecondary }]}>
                  {formatDate(document.uploadedAt)} · {formatFileSize(document.sizeBytes)}
                </Text>
              </View>
              {openingDocumentId === document.id ? (
                <Ionicons name="hourglass-outline" size={18} color={theme.textMuted} />
              ) : (
                <Ionicons name="open-outline" size={18} color={theme.textSecondary} />
              )}
            </AnimatedPressable>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    lineHeight: 30,
  },
  description: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
    textAlign: 'center',
  },
  list: {
    gap: spacing.md,
  },
  documentRow: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  documentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentMeta: {
    flex: 1,
    gap: 4,
  },
  documentName: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  documentCaption: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
});
