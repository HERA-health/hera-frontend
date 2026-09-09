import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../components/common';
import { SimpleDropdown, type DropdownOption } from '../../components/common/SimpleDropdown';
import { SchedulerCalendar } from '../../components/scheduling/SchedulerCalendar';
import { useTheme } from '../../contexts/ThemeContext';
import { getMadridDateKey, parseMadridDateTime } from '../../utils/madridTime';
import { ReferralCard, ReferralField } from './ReferralElements';

type Icon = React.ComponentProps<typeof Ionicons>['name'];
export function WorkflowButton(props: React.ComponentProps<typeof Button>) {
  const { theme } = useTheme();
  return <Button {...props} style={{ borderRadius: 12, minHeight: 44, ...(props.variant === 'outline' ? { borderColor: theme.border } : {}), ...props.style }} textStyle={{ fontSize: 14, flexShrink: 1, ...(props.variant === 'outline' ? { color: theme.textPrimary } : {}), ...props.textStyle }} />;
}
export function WorkflowHeader({ title, subtitle, eyebrow, action }: { title: string; subtitle: string; eyebrow?: string; action?: React.ReactNode }) {
  const { theme } = useTheme();
  return <View style={workflow.header}><View style={workflow.headerCopy}>{eyebrow ? <Text style={{ color: theme.textMuted, fontFamily: theme.fontSansSemiBold, fontSize: 11, letterSpacing: 1.4 }}>{eyebrow}</Text> : null}<Text accessibilityRole="header" style={{ color: theme.textPrimary, fontFamily: theme.fontHeading, fontSize: 27, lineHeight: 34 }}>{title}</Text><WorkflowHint>{subtitle}</WorkflowHint></View>{action}</View>;
}
export function WorkflowHeading({ title, subtitle, number, icon }: { title: string; subtitle?: string; number?: string; icon?: Icon }) {
  const { theme } = useTheme();
  return <View style={{ gap: 8 }}><View style={workflow.inline}>{number || icon ? <View style={[workflow.icon, { backgroundColor: theme.bg }]}>{icon ? <Ionicons name={icon} size={20} color={theme.textSecondary} /> : <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSansSemiBold }}>{number}</Text>}</View> : null}<Text accessibilityRole="header" style={{ flex: 1, color: theme.textPrimary, fontFamily: theme.fontHeading, fontSize: 20, lineHeight: 27 }}>{title}</Text></View>{subtitle ? <WorkflowHint>{subtitle}</WorkflowHint> : null}</View>;
}
export function WorkflowHint({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 22 }}>{children}</Text>;
}
export function WorkflowBadge({ label }: { label: string }) {
  const { theme } = useTheme();
  return <View style={[workflow.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}><Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 12, lineHeight: 18 }}>{label}</Text></View>;
}
export function WorkflowDisclosure({ title, children, initiallyOpen = false }: { title: string; children: React.ReactNode; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <View style={{ gap: 12 }}><WorkflowButton variant="ghost" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)}>{open ? 'Ocultar' : 'Mostrar'} {title}</WorkflowButton>{open ? children : null}</View>;
}
export function WorkflowNotice({ children, icon = 'information-circle-outline' }: { children: React.ReactNode; icon?: Icon }) {
  const { theme } = useTheme();
  return <View style={[workflow.notice, { backgroundColor: theme.bgCard, borderColor: theme.border }]}><Ionicons name={icon} size={21} color={theme.textSecondary} /><View style={{ flex: 1 }}><WorkflowHint>{children}</WorkflowHint></View></View>;
}
export function WorkflowEmpty({ title, description, icon = 'file-tray-outline', action }: { title: string; description: string; icon?: Icon; action?: React.ReactNode }) {
  const { theme } = useTheme();
  return <ReferralCard style={workflow.empty}><View style={[workflow.emptyIcon, { backgroundColor: theme.bg }]}><Ionicons name={icon} size={30} color={theme.textSecondary} /></View><WorkflowHeading title={title} /><View style={{ maxWidth: 580 }}><WorkflowHint>{description}</WorkflowHint></View>{action}</ReferralCard>;
}
export function WorkflowColumns({ children }: { children: React.ReactNode }) {
  const [wide, setWide] = useState(false);
  return <View onLayout={event => setWide(event.nativeEvent.layout.width >= 860)} style={{ flexDirection: wide ? 'row' : 'column', gap: 20, alignItems: 'flex-start', width: '100%' }}>{React.Children.toArray(children).filter(Boolean).map((child, index) => <View key={index} style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', minWidth: 0, gap: 20 }}>{child}</View>)}</View>;
}
export function WorkflowSelect<T extends string>({ label, value, options, onSelect }: { label: string; value: T; options: readonly DropdownOption<T>[]; onSelect: (value: T) => void }) {
  const { theme } = useTheme();
  return <View style={{ gap: 7 }}><Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 14 }}>{label}</Text><SimpleDropdown accessibilityLabel={label} value={value} options={options} onSelect={onSelect} presentation="portal" selectionIndicator="radio" highlightSelection={false} maxHeight={300} /></View>;
}

// The text value stays a Madrid date key; opening the calendar never changes it.
export function WorkflowDate({ label, value, onChangeText, disabled = false }: { label: string; value: string; onChangeText: (value: string) => void; disabled?: boolean }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 8 }}><ReferralField label={label} value={value} onChangeText={onChangeText} editable={!disabled} maxLength={10} placeholder="AAAA-MM-DD" /><WorkflowButton size="small" variant="ghost" disabled={disabled} accessibilityLabel={`Elegir fecha: ${label}`} icon={<Ionicons name="calendar-outline" size={17} color={theme.textSecondary} />} style={{ alignSelf: 'flex-start' }} onPress={() => setOpen(true)}>Elegir en el calendario</WorkflowButton>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}><View style={workflow.overlay}><View accessibilityViewIsModal style={[workflow.calendar, { backgroundColor: theme.bgCard, borderColor: theme.border }]}><ScrollView keyboardShouldPersistTaps="handled"><WorkflowHeading title={label.replace(' (AAAA-MM-DD)', '')} /><SchedulerCalendar current={parseMadridDateTime(value, '00:00') ? value : getMadridDateKey()} markedDates={value ? { [value]: { selected: true } } : undefined} onSelectDate={date => { onChangeText(date); setOpen(false); }} /><WorkflowButton variant="ghost" onPress={() => setOpen(false)}>Cerrar calendario</WorkflowButton></ScrollView></View></View></Modal>
  </View>;
}
export const workflow = StyleSheet.create({
  page: { width: '100%', maxWidth: 1400, alignSelf: 'center', padding: 20, gap: 20 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20, paddingVertical: 6 }, headerCopy: { flex: 1, minWidth: 220, gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderWidth: 1, borderRadius: 14 },
  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6, alignSelf: 'flex-start' },
  empty: { padding: 28, gap: 14, alignItems: 'flex-start', minHeight: 230, justifyContent: 'center' }, emptyIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, field: { flex: 1, minWidth: 220 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.4)' },
  calendar: { width: '100%', maxWidth: 400, maxHeight: '90%', borderWidth: 1, borderRadius: 18, padding: 20 },
});
