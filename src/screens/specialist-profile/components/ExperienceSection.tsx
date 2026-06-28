import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ExperienceSectionProps, CertificateItem } from '../types';
import { spacing, borderRadius, shadows } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import { AnimatedPressable } from '../../../components/common';

const STRINGS = {
  title: 'Experiencia y formación',
  education: 'Formación académica',
  experience: 'Experiencia profesional',
  certificates: 'Certificaciones y acreditaciones',
  documentProvided: 'Documento aportado',
  viewCertificate: 'Ver certificado',
  yearsExperience: 'años de experiencia clínica',
};

const formatRange = (startYear?: string | null, endYear?: string | null, current?: boolean): string | null => {
  if (!startYear && !endYear) {
    return null;
  }

  if (current || !endYear) {
    return startYear ? `${startYear} - Actual` : 'Actual';
  }

  return startYear ? `${startYear} - ${endYear}` : endYear;
};

const isImageCertificate = (certificate: CertificateItem): boolean =>
  typeof certificate.mimeType === 'string' && certificate.mimeType.startsWith('image/');

const CertificateCard: React.FC<{
  certificate: CertificateItem;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  onOpenCertificate?: (certificate: CertificateItem) => void;
}> = ({ certificate, styles, theme, onOpenCertificate }) => {
  const canOpen = Boolean(onOpenCertificate && certificate.documentUrl);

  return (
    <View style={styles.certificateCard}>
      <View style={styles.certificateThumbnail}>
        {isImageCertificate(certificate) && certificate.previewUrl ? (
          <Image
            source={{ uri: certificate.previewUrl }}
            style={styles.certificateImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="document-text-outline" size={24} color={theme.primary} />
        )}
      </View>

      <View style={styles.certificateCopy}>
        <Text style={styles.certificateName}>{certificate.name}</Text>
        {certificate.issuer ? (
          <Text style={styles.certificateIssuer}>{certificate.issuer}</Text>
        ) : null}
        {certificate.validUntil ? (
          <Text style={styles.certificateMeta}>Válido hasta {certificate.validUntil}</Text>
        ) : null}
        <View style={styles.documentBadge}>
          <Ionicons name="shield-checkmark-outline" size={13} color={theme.success} />
          <Text style={styles.documentBadgeText}>{STRINGS.documentProvided}</Text>
        </View>
      </View>

      <AnimatedPressable
        style={[styles.certificateButton, !canOpen && styles.certificateButtonDisabled]}
        onPress={() => onOpenCertificate?.(certificate)}
        disabled={!canOpen}
        hoverLift={false}
        pressScale={0.985}
        accessibilityLabel={`Ver certificado ${certificate.name}`}
      >
        <Ionicons name="open-outline" size={16} color={theme.textOnPrimary} />
        <Text style={styles.certificateButtonText}>{STRINGS.viewCertificate}</Text>
      </AnimatedPressable>
    </View>
  );
};

export const ExperienceSection: React.FC<ExperienceSectionProps> = ({
  education,
  experience,
  certifications,
  collegiateNumber,
  experienceYears,
  onOpenCertificate,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const educationIds = useMemo(
    () => new Set((education ?? []).map((item) => item.id)),
    [education]
  );

  const { certificatesByEducation, unlinkedCertificates } = useMemo(() => {
    const grouped = new Map<string, CertificateItem[]>();
    const unlinked: CertificateItem[] = [];

    (certifications ?? []).forEach((certificate) => {
      if (certificate.educationId && educationIds.has(certificate.educationId)) {
        grouped.set(certificate.educationId, [
          ...(grouped.get(certificate.educationId) ?? []),
          certificate,
        ]);
        return;
      }

      unlinked.push(certificate);
    });

    return {
      certificatesByEducation: grouped,
      unlinkedCertificates: unlinked,
    };
  }, [certifications, educationIds]);

  const hasEducation = Boolean(education?.length);
  const hasExperience = Boolean(experience?.length);
  const hasCertificates = Boolean(certifications?.length);
  const hasContent = hasEducation || hasExperience || hasCertificates || collegiateNumber || experienceYears;
  if (!hasContent) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{STRINGS.title}</Text>

      {(collegiateNumber || (typeof experienceYears === 'number' && experienceYears > 0)) ? (
        <View style={styles.summaryRow}>
          {typeof experienceYears === 'number' && experienceYears > 0 ? (
            <View style={styles.summaryPill}>
              <Ionicons name="briefcase-outline" size={15} color={theme.primary} />
              <Text style={styles.summaryPillText}>{experienceYears}+ {STRINGS.yearsExperience}</Text>
            </View>
          ) : null}
          {collegiateNumber ? (
            <View style={styles.summaryPill}>
              <Ionicons name="checkmark-circle-outline" size={15} color={theme.success} />
              <Text style={styles.summaryPillText}>Col. {collegiateNumber}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {hasEducation ? (
        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>{STRINGS.education}</Text>
          <View style={styles.blockList}>
            {education!.map((item) => {
              const linkedCertificates = certificatesByEducation.get(item.id) ?? [];
              const range = formatRange(item.startYear, item.endYear);

              return (
                <View key={item.id} style={styles.storyBlock}>
                  <View style={styles.storyIcon}>
                    <Ionicons name="school-outline" size={20} color={theme.primary} />
                  </View>
                  <View style={styles.storyContent}>
                    <Text style={styles.storyTitle}>{item.degree}</Text>
                    <Text style={styles.storySubtitle}>{item.institution}</Text>
                    {range ? <Text style={styles.storyMeta}>{range}</Text> : null}
                    {linkedCertificates.length ? (
                      <View style={styles.linkedCertificates}>
                        {linkedCertificates.map((certificate) => (
                          <CertificateCard
                            key={certificate.id}
                            certificate={certificate}
                            styles={styles}
                            theme={theme}
                            onOpenCertificate={onOpenCertificate}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {hasExperience ? (
        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>{STRINGS.experience}</Text>
          <View style={styles.blockList}>
            {experience!.map((item) => {
              const range = formatRange(item.startYear, item.endYear, item.current);

              return (
                <View key={item.id} style={styles.storyBlock}>
                  <View style={styles.storyIcon}>
                    <Ionicons name="medkit-outline" size={20} color={theme.primary} />
                  </View>
                  <View style={styles.storyContent}>
                    <Text style={styles.storyTitle}>{item.position}</Text>
                    <Text style={styles.storySubtitle}>{item.organization}</Text>
                    {range ? <Text style={styles.storyMeta}>{range}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {unlinkedCertificates.length ? (
        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>{STRINGS.certificates}</Text>
          <View style={styles.certificateList}>
            {unlinkedCertificates.map((certificate) => (
              <CertificateCard
                key={certificate.id}
                certificate={certificate}
                styles={styles}
                theme={theme}
                onOpenCertificate={onOpenCertificate}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...shadows.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: isDark ? theme.bgElevated : theme.surface,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  summaryPillText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  subSection: {
    marginBottom: spacing.lg,
  },
  subSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: spacing.md,
  },
  blockList: {
    gap: spacing.md,
  },
  storyBlock: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: isDark ? theme.bgElevated : theme.bgMuted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  storyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? theme.primaryMuted : theme.surface,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  storyContent: {
    flex: 1,
    minWidth: 0,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 3,
  },
  storySubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  storyMeta: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 4,
  },
  linkedCertificates: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  certificateList: {
    gap: spacing.sm,
  },
  certificateCard: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  certificateThumbnail: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? theme.bgElevated : theme.surface,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  certificateImage: {
    width: '100%',
    height: '100%',
  },
  certificateCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  certificateName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  certificateIssuer: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  certificateMeta: {
    fontSize: 12,
    color: theme.textMuted,
  },
  documentBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: isDark ? theme.successBg : theme.surface,
    borderWidth: 1,
    borderColor: theme.successLight,
  },
  documentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.success,
  },
  certificateButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.primary,
  },
  certificateButtonDisabled: {
    opacity: 0.5,
  },
  certificateButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textOnPrimary,
  },
});

export default ExperienceSection;
