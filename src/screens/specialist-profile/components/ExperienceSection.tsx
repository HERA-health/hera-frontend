/**
 * ExperienceSection - Education, experience, and certifications
 * Displays professional credentials and background
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExperienceSectionProps, EducationItem } from '../types';
import { heraLanding, spacing, borderRadius, shadows } from '../../../constants/colors';

interface SubSectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}

const SubSection: React.FC<SubSectionProps> = ({ icon, title, children }) => (
  <View style={styles.subSection}>
    <View style={styles.subSectionHeader}>
      <Text style={styles.subSectionIcon}>
        {icon === 'school-outline' ? '🎓' : icon === 'briefcase-outline' ? '💼' : '✓'}
      </Text>
      <Text style={styles.subSectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

interface EducationItemViewProps {
  item: EducationItem;
}

const EducationItemView: React.FC<EducationItemViewProps> = ({ item }) => (
  <View style={styles.educationItem}>
    <View style={[styles.itemBullet, item.type === 'certificate' && styles.itemBulletCert]} />
    <View style={styles.itemContent}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemSubtitle}>{item.institution} • {item.year}</Text>
    </View>
  </View>
);

interface ListItemProps {
  text: string;
}

const ListItem: React.FC<ListItemProps> = ({ text }) => (
  <View style={styles.listItem}>
    <Text style={styles.listBullet}>•</Text>
    <Text style={styles.listText}>{text}</Text>
  </View>
);

interface VerificationBadgeProps {
  label: string;
  value: string;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({ label, value }) => (
  <View style={styles.badge}>
    <Ionicons name="checkmark-circle" size={16} color={heraLanding.success} />
    <Text style={styles.badgeText}>{label}: {value}</Text>
  </View>
);

export const ExperienceSection: React.FC<ExperienceSectionProps> = ({
  education,
  experience,
  certifications,
  collegiateNumber,
  experienceYears,
}) => {
  const hasContent = (education && education.length > 0) ||
    (experience && experience.length > 0) ||
    (certifications && certifications.length > 0) ||
    collegiateNumber ||
    experienceYears;

  if (!hasContent) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Experiencia y formación</Text>

      {/* Education */}
      {education && education.length > 0 && (
        <SubSection icon="school-outline" title="Educación">
          <View style={styles.educationList}>
            {education.map((item) => (
              <EducationItemView key={item.id} item={item} />
            ))}
          </View>
        </SubSection>
      )}

      {/* Experience */}
      {((experience && experience.length > 0) || experienceYears) && (
        <SubSection icon="briefcase-outline" title="Experiencia">
          <View style={styles.listContainer}>
            {experienceYears && (
              <ListItem text={`${experienceYears}+ años de experiencia clínica`} />
            )}
            {experience?.map((item, index) => (
              <ListItem key={index} text={item} />
            ))}
          </View>
        </SubSection>
      )}

      {/* Verification Badges */}
      {(collegiateNumber || (certifications && certifications.length > 0)) && (
        <View style={styles.badgesContainer}>
          {collegiateNumber && (
            <VerificationBadge label="Colegiada" value={collegiateNumber} />
          )}
          {certifications && certifications.length > 0 && (
            <VerificationBadge
              label="Certificaciones"
              value={certifications.join(', ')}
            />
          )}
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
  subSection: {
    marginBottom: spacing.lg,
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  subSectionIcon: {
    fontSize: 20,
  },
  subSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  educationList: {
    gap: spacing.sm,
    marginLeft: spacing.xxl,
  },
  educationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  itemBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: heraLanding.primary,
    marginTop: 6,
  },
  itemBulletCert: {
    backgroundColor: heraLanding.secondary,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    color: heraLanding.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    color: heraLanding.textSecondary,
  },
  listContainer: {
    marginLeft: spacing.xxl,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  listBullet: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    lineHeight: 24,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: heraLanding.textPrimary,
    lineHeight: 24,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F0F7F0',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 14,
    color: heraLanding.success,
    fontWeight: '500',
  },
});

export default ExperienceSection;
