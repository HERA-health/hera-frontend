import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  wide: boolean;
  description?: string;
  notice?: React.ReactNode;
  leadContent?: React.ReactNode;
  highlighted?: boolean;
  anchorRef?: React.Ref<View>;
  children: React.ReactNode;
};

export function ProfileEditorSection({ title, icon, wide, description, notice, leadContent, highlighted, anchorRef, children }: Props) {
  const { theme } = useTheme();
  return (
    <View ref={anchorRef} collapsable={false} tabIndex={anchorRef ? -1 : undefined}
      style={[styles.section, wide && styles.horizontal, {
        borderColor: highlighted ? theme.focus : theme.border,
        backgroundColor: theme.bgCard,
      }]}>
      <View style={[styles.leadGroup, wide && styles.column]}>
        <View style={styles.lead}>
          <View style={[styles.icon, { backgroundColor: theme.navigationActive }]}>
            <Ionicons name={icon} color={theme.textPrimary} size={20} />
          </View>
          <View style={styles.copy}>
            <View style={styles.titleLine}>
              <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}>{title}</Text>
              {notice}
            </View>
            {description && <Text style={[styles.help, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{description}</Text>}
          </View>
        </View>
        {leadContent}
      </View>
      <View style={[styles.body, wide && styles.flexBody]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 14 },
  horizontal: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, gap: 24 },
  leadGroup: { gap: 14 },
  lead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  column: { width: '24%', maxWidth: 268 },
  icon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  titleLine: { flexDirection: 'row', alignItems: 'center', minHeight: 34 },
  title: { flexShrink: 1, fontSize: 17, lineHeight: 22 },
  help: { fontSize: 13, lineHeight: 19 },
  body: { minWidth: 0, gap: 8 },
  flexBody: { flex: 1 },
});
