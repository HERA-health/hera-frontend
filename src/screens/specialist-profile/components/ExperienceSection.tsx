import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ExperienceSectionProps, CertificateItem } from '../types';
import { spacing, borderRadius, shadows } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';
import { AnimatedPressable } from '../../../components/common';
import { ProfileDisclosureSection } from './ProfileDisclosureSection';

const STRINGS = {
  title: 'Experiencia y formación',
  education: 'Formación superior y profesional',
  experience: 'Experiencia profesional',
  certificates: 'Certificaciones y acreditaciones',
  credentials: 'Credenciales profesionales',
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

const composeEntryText = (
  range: string | null,
  primary: string,
  secondary?: string | null
): string => {
  const body = secondary ? `${primary} - ${secondary}` : primary;
  return range ? `${range}: ${body}` : body;
};

const CertificateAttachmentTile: React.FC<{
  certificate: CertificateItem;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  onOpenCertificate?: (certificate: CertificateItem) => void;
  compact?: boolean;
  interactive?: boolean;
}> = ({ certificate, styles, theme, onOpenCertificate, compact = false, interactive = true }) => {
  const canOpen = Boolean(onOpenCertificate && certificate.documentUrl);
  const tileStyle = compact ? styles.certificateTileCompact : styles.certificateTile;
  const thumbnailStyle = compact ? styles.certificateThumbnailCompact : styles.certificateThumbnail;
  const thumbnail = (
    <View style={thumbnailStyle}>
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
  );

  if (!interactive) {
    return <View style={tileStyle}>{thumbnail}</View>;
  }

  return (
    <AnimatedPressable
      style={tileStyle}
      onPress={() => onOpenCertificate?.(certificate)}
      disabled={!canOpen}
      hoverLift={false}
      pressScale={0.98}
      accessibilityRole={canOpen ? 'button' : 'none'}
      accessibilityState={canOpen ? undefined : { disabled: true }}
      accessibilityLabel={canOpen ? `Ver certificado ${certificate.name}` : certificate.name}
    >
      {thumbnail}
    </AnimatedPressable>
  );
};

const CertificateStrip: React.FC<{
  certificates: CertificateItem[];
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  onOpenCertificate?: (certificate: CertificateItem) => void;
}> = ({ certificates, styles, theme, onOpenCertificate }) => (
  <View style={styles.attachmentBlock}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.attachmentStrip}
    >
      {certificates.map((certificate) => (
        <CertificateAttachmentTile
          key={certificate.id}
          certificate={certificate}
          styles={styles}
          theme={theme}
          onOpenCertificate={onOpenCertificate}
        />
      ))}
    </ScrollView>
    <View style={styles.documentBadgeSubtle}>
      <Ionicons name="shield-checkmark-outline" size={12} color={theme.success} />
      <Text style={styles.documentBadgeSubtleText}>{STRINGS.documentProvided}</Text>
    </View>
  </View>
);

const CertificateListRow: React.FC<{
  certificate: CertificateItem;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  onOpenCertificate?: (certificate: CertificateItem) => void;
}> = ({ certificate, styles, theme, onOpenCertificate }) => {
  const canOpen = Boolean(onOpenCertificate && certificate.documentUrl);

  return (
    <AnimatedPressable
      style={styles.certificateListRow}
      onPress={canOpen ? () => onOpenCertificate?.(certificate) : undefined}
      disabled={!canOpen}
      hoverLift={false}
      pressScale={0.99}
      accessibilityRole={canOpen ? 'button' : 'none'}
      accessibilityState={canOpen ? undefined : { disabled: true }}
      accessibilityLabel={canOpen ? `Ver certificado ${certificate.name}` : certificate.name}
    >
      <CertificateAttachmentTile
        certificate={certificate}
        styles={styles}
        theme={theme}
        compact
        interactive={false}
      />
      <View style={styles.certificateCopy}>
        <Text style={styles.certificateName}>{certificate.name}</Text>
        {certificate.issuer ? <Text style={styles.certificateIssuer}>{certificate.issuer}</Text> : null}
        {certificate.validUntil ? (
          <Text style={styles.certificateMeta}>Válido hasta {certificate.validUntil}</Text>
        ) : null}
        <View style={styles.documentBadgeSubtle}>
          <Ionicons name="shield-checkmark-outline" size={12} color={theme.success} />
          <Text style={styles.documentBadgeSubtleText}>{STRINGS.documentProvided}</Text>
        </View>
      </View>
      {canOpen ? (
        <View style={styles.certificateOpenAction}>
          <Text style={styles.certificateOpenText}>{STRINGS.viewCertificate}</Text>
          <Ionicons name="open-outline" size={15} color={theme.primary} />
        </View>
      ) : null}
    </AnimatedPressable>
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
  const educationItems = useMemo(() => education ?? [], [education]);
  const experienceItems = useMemo(() => experience ?? [], [experience]);

  const educationIds = useMemo(
    () => new Set(educationItems.map((item) => item.id)),
    [educationItems]
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

  const hasEducation = educationItems.length > 0;
  const hasExperience = experienceItems.length > 0;
  const hasCertificates = Boolean(unlinkedCertificates.length);
  const hasContent = hasEducation || hasExperience || hasCertificates || collegiateNumber || experienceYears;
  const credentialItems = [
    collegiateNumber ? `Col. ${collegiateNumber}` : null,
    typeof experienceYears === 'number' && experienceYears > 0
      ? `${experienceYears}+ ${STRINGS.yearsExperience}`
      : null,
  ].filter((item): item is string => Boolean(item));
  const firstDisclosureKey = hasEducation
    ? 'education'
    : hasExperience
      ? 'experience'
      : hasCertificates
        ? 'certificates'
        : null;
  const hasDisclosures = hasEducation || hasExperience || hasCertificates;

  if (!hasContent) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{STRINGS.title}</Text>

      {!hasDisclosures && credentialItems.length ? (
        <View style={styles.credentialsOnlyRow}>
          <Ionicons name="checkmark-circle-outline" size={20} color={theme.success} />
          <View style={styles.credentialsOnlyCopy}>
            <Text style={styles.credentialsOnlyTitle}>{STRINGS.credentials}</Text>
            <Text style={styles.credentialsOnlyText}>{credentialItems.join(' · ')}</Text>
          </View>
        </View>
      ) : credentialItems.length ? (
        <View style={styles.summaryRow}>
          {credentialItems.map((item) => (
            <View key={item} style={styles.summaryPill}>
              <Ionicons name="checkmark-circle-outline" size={14} color={theme.success} />
              <Text style={styles.summaryPillText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {hasDisclosures ? (
        <View style={styles.disclosureList}>
          {hasEducation ? (
            <ProfileDisclosureSection
              title={STRINGS.education}
              iconName="school-outline"
              defaultExpanded={firstDisclosureKey === 'education'}
              testID="experience-education-disclosure"
              variant="row"
            >
              <View style={styles.blockList}>
                {educationItems.map((item) => {
                  const linkedCertificates = certificatesByEducation.get(item.id) ?? [];
                  const range = formatRange(item.startYear, item.endYear);
                  const entryText = composeEntryText(range, item.degree, item.institution);

                  return (
                    <View key={item.id} style={styles.timelineItem}>
                      <View style={styles.bulletDot} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineText}>{entryText}</Text>
                        {linkedCertificates.length ? (
                          <CertificateStrip
                            certificates={linkedCertificates}
                            styles={styles}
                            theme={theme}
                            onOpenCertificate={onOpenCertificate}
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ProfileDisclosureSection>
          ) : null}

          {hasExperience ? (
            <ProfileDisclosureSection
              title={STRINGS.experience}
              iconName="briefcase-outline"
              defaultExpanded={firstDisclosureKey === 'experience'}
              testID="experience-work-disclosure"
              variant="row"
            >
              <View style={styles.blockList}>
                {experienceItems.map((item) => {
                  const range = formatRange(item.startYear, item.endYear, item.current);
                  const entryText = composeEntryText(range, item.position, item.organization);

                  return (
                    <View key={item.id} style={styles.timelineItem}>
                      <View style={styles.bulletDot} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineText}>{entryText}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ProfileDisclosureSection>
          ) : null}

          {unlinkedCertificates.length ? (
            <ProfileDisclosureSection
              title={STRINGS.certificates}
              iconName="ribbon-outline"
              defaultExpanded={firstDisclosureKey === 'certificates'}
              testID="experience-certificates-disclosure"
              variant="row"
            >
              <View style={styles.certificateList}>
                {unlinkedCertificates.map((certificate) => (
                  <CertificateListRow
                    key={certificate.id}
                    certificate={certificate}
                    styles={styles}
                    theme={theme}
                    onOpenCertificate={onOpenCertificate}
                  />
                ))}
              </View>
            </ProfileDisclosureSection>
          ) : null}
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
  credentialsOnlyRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.borderLight,
    paddingVertical: spacing.md,
  },
  credentialsOnlyCopy: {
    flex: 1,
    minWidth: 0,
  },
  credentialsOnlyTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  credentialsOnlyText: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: theme.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  disclosureList: {
    gap: 0,
  },
  blockList: {
    gap: spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.textPrimary,
    marginTop: 9,
  },
  timelineContent: {
    flex: 1,
    minWidth: 0,
  },
  timelineText: {
    fontSize: 16,
    lineHeight: 25,
    color: theme.textPrimary,
  },
  attachmentBlock: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  attachmentStrip: {
    gap: spacing.sm,
    alignItems: 'center',
    paddingRight: spacing.md,
  },
  certificateList: {
    gap: spacing.sm,
  },
  certificateTile: {
    width: 58,
    height: 58,
    borderRadius: borderRadius.sm,
  },
  certificateTileCompact: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  certificateThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? theme.bgElevated : theme.surface,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  certificateThumbnailCompact: {
    width: '100%',
    height: '100%',
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
  certificateListRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  certificateCopy: {
    flex: 1,
    minWidth: 0,
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
    marginTop: 2,
  },
  documentBadgeSubtle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  documentBadgeSubtleText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.success,
  },
  certificateOpenAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: spacing.sm,
  },
  certificateOpenText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.primary,
  },
});

export default ExperienceSection;
