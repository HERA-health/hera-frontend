import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  kind: 'formación' | 'experiencia';
  title: string;
  organization: string;
  startYear: string;
  endYear: string | null;
  current?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  children: React.ReactNode;
};

export function TrajectoryEntry({ kind, title, organization, startYear, endYear, current, expanded, onToggle, onRemove, children }: Props) {
  const { theme } = useTheme();
  const heading = title?.trim() || (kind === 'formación' ? 'Nueva formación' : 'Nueva experiencia');
  const end = current ? 'Actualidad' : endYear;
  const period = startYear && end ? `${startYear}\u00a0–\u00a0${end}` : startYear ? `Desde ${startYear}` : end;
  const institution = organization?.trim();
  const metadataStyle = [styles.meta, { color: theme.textSecondary, fontFamily: theme.fontSans }];
  const subtitle = [institution, period].filter(Boolean).join(' · ');
  return (
    <View style={[styles.entry, { borderColor: expanded ? theme.borderStrong : theme.border, backgroundColor: theme.bgCard }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${expanded ? 'Cerrar' : 'Editar'} ${kind}, ${heading}`}
        accessibilityHint={subtitle || undefined} accessibilityState={{ expanded }} aria-expanded={expanded} onPress={onToggle}
        style={({ pressed }) => [styles.summary, { backgroundColor: pressed ? theme.navigationActive : 'transparent' }]}>
        <View style={[styles.icon, { backgroundColor: theme.navigationActive }]}>
          <Ionicons name={kind === 'formación' ? 'school-outline' : 'briefcase-outline'} size={21} color={theme.textPrimary} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{heading}</Text>
          {Boolean(subtitle) && <View style={styles.metadata}>
            {Boolean(institution) && <Text style={metadataStyle}>{institution}</Text>}
            {Boolean(period) && <View style={styles.period}>
              <Ionicons name="calendar-outline" size={13} color={theme.textSecondary} />
              <Text style={metadataStyle}>{period}</Text>
            </View>}
          </View>}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'pencil-outline'} size={16} color={theme.primary} />
        <Text style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold }}>{expanded ? 'Cerrar' : 'Editar'}</Text>
      </Pressable>
      {expanded && <View style={[styles.form, { borderColor: theme.border }]}>
        {children}
        <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${kind}`} onPress={onRemove} style={styles.remove}>
          <Ionicons name="trash-outline" size={17} color={theme.error} />
          <Text style={{ color: theme.error, fontFamily: theme.fontSansSemiBold }}>Eliminar {kind}</Text>
        </Pressable>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  entry: { borderWidth: 1, borderRadius: 12 },
  summary: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 7 },
  icon: { width: 36, height: 36, borderRadius: 9, marginRight: 3, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 16, lineHeight: 22 },
  metadata: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 10, rowGap: 2 },
  period: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { maxWidth: '100%', fontSize: 14, lineHeight: 20 },
  form: { borderTopWidth: 1, padding: 16, gap: 12 },
  remove: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
});
