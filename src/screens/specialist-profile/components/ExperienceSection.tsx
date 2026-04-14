import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ExperienceSectionProps } from '../types';
import { spacing, borderRadius, shadows } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';

const STRINGS = {
  title: 'Experiencia y formación',
  education: 'Educación',
  experience: 'Experiencia',
  certificates: 'Certificaciones',
  yearsExperience: 'años de experiencia clínica',
};

const TimelineItem: React.FC<{
  title: string;
  subtitle: string;
  dateRange: string;
  isLast: boolean;
  styles: ReturnType<typeof createStyles>;
}> = ({ title, subtitle, dateRange, isLast, styles }) => (
  <View style={styles.timelineItem}>
    <View style={styles.timelineLeft}>
      <View style={styles.timelineDot} />
      {!isLast && <View style={styles.timelineLine} />}
    </View>
    <View style={styles.timelineRight}>
      <Text style={styles.timelineTitle}>{title}</Text>
      <Text style={styles.timelineSubtitle}>{subtitle}</Text>
      <Text style={styles.timelineDate}>{dateRange}</Text>
    </View>
  </View>
);

export const ExperienceSection: React.FC<ExperienceSectionProps> = ({
  education,
  experience,
  certifications,
  collegiateNumber,
  experienceYears,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const hasEducation = !!education?.length;
  const hasExperience = !!experience?.length;
  const hasCertificates = !!certifications?.length;
  const hasContent = hasEducation || hasExperience || hasCertificates || collegiateNumber || experienceYears;
  if (!hasContent) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{STRINGS.title}</Text>

      {hasEducation && (
        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>{STRINGS.education}</Text>
          <View style={styles.timeline}>
            {education!.map((item, index) => (
              <TimelineItem
                key={item.id}
                title={item.degree}
                subtitle={item.institution}
                dateRange={item.endYear ? `${item.startYear} – ${item.endYear}` : item.startYear}
                isLast={index === education!.length - 1}
                styles={styles}
              />
            ))}
          </View>
        </View>
      )}

      {(hasExperience || (typeof experienceYears === 'number' && experienceYears > 0)) && (
        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>{STRINGS.experience}</Text>
          {(typeof experienceYears === 'number' && experienceYears > 0) && !hasExperience && (
            <Text style={styles.experienceYearsText}>{experienceYears}+ {STRINGS.yearsExperience}</Text>
          )}
          {hasExperience && (
            <View style={styles.timeline}>
              {experience!.map((item, index) => (
                <TimelineItem
                  key={item.id}
                  title={item.position}
                  subtitle={item.organization}
                  dateRange={item.current || !item.endYear ? `${item.startYear} – Actual` : `${item.startYear} – ${item.endYear}`}
                  isLast={index === experience!.length - 1}
                  styles={styles}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {hasCertificates && (
        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>{STRINGS.certificates}</Text>
          <View style={styles.certificatesContainer}>
            {certifications!.map((cert) => (
              <View key={cert.id} style={styles.certificatePill}>
                <Text style={styles.certificatePillText}>{cert.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
  title: { fontSize: 22, fontWeight: '700', color: theme.textPrimary, marginBottom: spacing.lg },
  subSection: { marginBottom: spacing.lg },
  subSectionTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary, marginBottom: spacing.md },
  timeline: { marginLeft: spacing.xs },
  timelineItem: { flexDirection: 'row', minHeight: 60 },
  timelineLeft: { width: spacing.lg, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: theme.border, marginTop: spacing.xs, marginBottom: spacing.xs },
  timelineRight: { flex: 1, paddingLeft: spacing.sm, paddingBottom: spacing.md },
  timelineTitle: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginBottom: 2 },
  timelineSubtitle: { fontSize: 13, color: theme.textSecondary, marginBottom: 2 },
  timelineDate: { fontSize: 12, color: theme.textMuted },
  experienceYearsText: { fontSize: 15, color: theme.textPrimary, lineHeight: 24 },
  certificatesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  certificatePill: {
    backgroundColor: isDark ? theme.successBg : theme.surface,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm + 4,
    borderWidth: 1,
    borderColor: theme.successLight,
  },
  certificatePillText: { fontSize: 11, color: theme.success, fontWeight: '600' },
});

export default ExperienceSection;
