/**
 * ExperienceSection - Education, experience, and certifications
 * Timeline visual for education/experience, pill badges for certificates
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExperienceSectionProps, EducationItem, ExperienceItem, CertificateItem } from '../types';
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';

const STRINGS = {
  title: 'Experiencia y formación',
  education: 'Educación',
  experience: 'Experiencia',
  certificates: 'Certificaciones',
  yearsExperience: 'años de experiencia clínica',
};

interface TimelineItemProps {
  title: string;
  subtitle: string;
  dateRange: string;
  isLast: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ title, subtitle, dateRange, isLast }) => (
  <View style={styles.timelineItem}>
    {/* Left column: dot + line */}
    <View style={styles.timelineLeft}>
      <View style={styles.timelineDot} />
      {!isLast && <View style={styles.timelineLine} />}
    </View>
    {/* Right column: content */}
    <View style={styles.timelineRight}>
      <Text style={styles.timelineTitle}>{title}</Text>
      <Text style={styles.timelineSubtitle}>{subtitle}</Text>
      <Text style={styles.timelineDate}>{dateRange}</Text>
    </View>
  </View>
);

interface SubSectionHeaderProps {
  emoji: string;
  title: string;
}

const SubSectionHeader: React.FC<SubSectionHeaderProps> = ({ emoji, title }) => (
  <View style={styles.subSectionHeader}>
    <Text style={styles.subSectionEmoji}>{emoji}</Text>
    <Text style={styles.subSectionTitle}>{title}</Text>
  </View>
);

export const ExperienceSection: React.FC<ExperienceSectionProps> = ({
  education,
  experience,
  certifications,
  collegiateNumber,
  experienceYears,
}) => {
  const hasEducation = education && education.length > 0;
  const hasExperience = experience && experience.length > 0;
  const hasCertificates = certifications && certifications.length > 0;
  const hasContent = hasEducation || hasExperience || hasCertificates || collegiateNumber || experienceYears;

  if (!hasContent) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{STRINGS.title}</Text>

      {/* Education timeline */}
      {hasEducation && (
        <View style={styles.subSection}>
          <SubSectionHeader emoji="🎓" title={STRINGS.education} />
          <View style={styles.timeline}>
            {education!.map((item, index) => (
              <TimelineItem
                key={item.id}
                title={item.degree}
                subtitle={item.institution}
                dateRange={item.endYear ? `${item.startYear} – ${item.endYear}` : item.startYear}
                isLast={index === education!.length - 1}
              />
            ))}
          </View>
        </View>
      )}

      {/* Experience timeline */}
      {(hasExperience || (typeof experienceYears === 'number' && experienceYears > 0)) && (
        <View style={styles.subSection}>
          <SubSectionHeader emoji="💼" title={STRINGS.experience} />
          {(typeof experienceYears === 'number' && experienceYears > 0) && !hasExperience && (
            <Text style={styles.experienceYearsText}>
              {experienceYears}+ {STRINGS.yearsExperience}
            </Text>
          )}
          {hasExperience && (
            <View style={styles.timeline}>
              {experience!.map((item, index) => (
                <TimelineItem
                  key={item.id}
                  title={item.position}
                  subtitle={item.organization}
                  dateRange={item.current || !item.endYear ? `${item.startYear} - Actual` : `${item.startYear} - ${item.endYear}`}
                  isLast={index === experience!.length - 1}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Certificates as pill badges */}
      {hasCertificates && (
        <View style={styles.subSection}>
          <SubSectionHeader emoji="✓" title={STRINGS.certificates} />
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: spacing.lg,
  },

  // Sub-sections
  subSection: {
    marginBottom: spacing.lg,
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  subSectionEmoji: {
    fontSize: 20,
  },
  subSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },

  // Timeline
  timeline: {
    marginLeft: spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    width: spacing.lg,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: heraLanding.primary,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: heraLanding.border,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: heraLanding.textPrimary,
    marginBottom: 2,
  },
  timelineSubtitle: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: heraLanding.textMuted,
  },

  // Experience years fallback
  experienceYearsText: {
    fontSize: 15,
    color: heraLanding.textPrimary,
    marginLeft: spacing.xxl,
    lineHeight: 24,
  },

  // Certificate pills
  certificatesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  certificatePill: {
    backgroundColor: heraLanding.successBg,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 4,
    borderWidth: 1,
    borderColor: heraLanding.successLight,
  },
  certificatePillText: {
    fontSize: 11,
    color: heraLanding.success,
    fontWeight: '500',
  },
});

export default ExperienceSection;
