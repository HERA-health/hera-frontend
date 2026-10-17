import React, { useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, SimpleDropdown } from '../../../../components/common';
import type { AnimatedPressableHandle } from '../../../../components/common/AnimatedPressable';
import { TourTarget } from '../../../../components/onboarding/TourTarget';
import type { SessionViewMode } from '../../../../constants/types';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { GoogleCalendarStatus } from '../../../../services/googleCalendarService';
import { formatMadridInstant } from '../../../../utils/madridTime';
import { type AgendaOriginFilter, type AgendaStatusFilter, ORIGIN_FILTER_OPTIONS, STATUS_FILTER_OPTIONS, VIEW_OPTIONS, capitalizeFirst } from './professionalAgendaUtils';

interface Props {
  viewMode: SessionViewMode;
  selectedDate: Date;
  weekDays: Date[];
  originFilter: AgendaOriginFilter;
  statusFilter: AgendaStatusFilter;
  isMobile: boolean;
  visibleCount: number;
  pendingCount: number;
  summaryAvailable: boolean;
  nextSessionLabel?: string;
  onJumpToNextSession?: () => void;
  onChangeView: (view: SessionViewMode) => void;
  onChangeOrigin: (origin: AgendaOriginFilter) => void;
  onChangeStatus: (status: AgendaStatusFilter) => void;
  onResetFilters: () => void;
  onNavigateDate: (direction: number) => void;
  onGoToToday: () => void;
  onPickDate: () => void;
  googleCalendarStatus?: GoogleCalendarStatus | null;
  onGoogleCalendar: () => void;
  onSettings: (anchor: { x: number; y: number }) => void;
}
export function ProfessionalAgendaToolbar(props: Props) {
  const { theme } = useTheme();
  const settingsRef = useRef<AnimatedPressableHandle>(null);
  const [toolbarWidth, setToolbarWidth] = useState(0);
  const stacked = props.isMobile || (toolbarWidth > 0 && toolbarWidth < 860);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtered = props.originFilter !== 'ALL' || props.statusFilter !== 'ACTIVE';
  const filterCount = Number(props.originFilter !== 'ALL') + Number(props.statusFilter !== 'ACTIVE');
  const filterDescription = `${ORIGIN_FILTER_OPTIONS.find((option) => option.value === props.originFilter)?.label} · ${STATUS_FILTER_OPTIONS.find((option) => option.value === props.statusFilter)?.label}`;
  const title = props.viewMode === 'month'
    ? formatMadridInstant(props.selectedDate, { month: 'long', year: 'numeric' })
    : props.viewMode === 'day' ? formatMadridInstant(props.selectedDate, { weekday: 'short', day: 'numeric', month: 'long' })
      : `${formatMadridInstant(props.weekDays[0], { day: 'numeric', month: 'short' })} – ${formatMadridInstant(props.weekDays[6], { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const text = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 14 };
  const button = [styles.button, { backgroundColor: theme.bgCard, borderColor: theme.border }];
  const calendarStatus = props.googleCalendarStatus;
  const calendarNeedsAttention = calendarStatus?.status === 'REAUTH_REQUIRED'
    || Boolean(calendarStatus?.privacyUpdateRequired)
    || calendarStatus?.errorCode === 'CALENDAR_CREDENTIAL_STORAGE_ERROR';
  const calendarConnected = calendarStatus?.enabled && calendarStatus.status === 'CONNECTED' && !calendarNeedsAttention;
  const calendarLabel = calendarConnected ? 'Google Calendar · Sincronizado'
    : calendarNeedsAttention ? 'Revisar Google Calendar'
    : calendarStatus?.status === 'DISCONNECTING' ? 'Google Calendar · Desconectando…'
    : calendarStatus?.enabled && calendarStatus.status === 'DISCONNECTED' ? 'Sincronizar con Google Calendar'
    : 'Google Calendar';
  return <View style={{ backgroundColor: theme.bg, borderBottomWidth: 1, borderColor: theme.borderLight }}>
    <View onLayout={(event) => setToolbarWidth(event.nativeEvent.layout.width)} style={styles.toolbar}>
      <TourTarget id="professional.sessions.date-controls" style={stacked ? { width: '100%' } : styles.side}>
        <View style={styles.row}>
          <AnimatedPressable accessibilityLabel="Ir a hoy" onPress={props.onGoToToday} style={button} hoverLift={false}><Text style={text}>Hoy</Text></AnimatedPressable>
          <AnimatedPressable accessibilityLabel="Periodo anterior" onPress={() => props.onNavigateDate(-1)} style={button} hoverLift={false}><Ionicons name="chevron-back" size={17} color={theme.textPrimary} /></AnimatedPressable>
          <AnimatedPressable accessibilityLabel="Periodo siguiente" onPress={() => props.onNavigateDate(1)} style={button} hoverLift={false}><Ionicons name="chevron-forward" size={17} color={theme.textPrimary} /></AnimatedPressable>
          <View style={{ flex: 1, minWidth: 0, flexDirection: props.isMobile ? 'column' : 'row', flexWrap: 'wrap', alignItems: props.isMobile ? 'flex-start' : 'center', columnGap: 14, rowGap: 2, paddingHorizontal: 8 }}>
            <AnimatedPressable accessibilityLabel={`Elegir fecha, ${title}`} onPress={props.onPickDate} style={{ paddingVertical: props.isMobile ? 2 : 10 }} hoverLift={false}><Text style={text}>{capitalizeFirst(title)}</Text></AnimatedPressable>
            <Text accessibilityLabel={props.summaryAvailable ? `${props.visibleCount} citas visibles en este periodo, ${props.pendingCount} por confirmar` : 'Actualizando agenda'} style={{ color: props.pendingCount > 0 ? theme.textPrimary : theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12 }}>
              {props.summaryAvailable ? `${props.visibleCount} ${props.visibleCount === 1 ? 'cita' : 'citas'}${props.pendingCount > 0 ? ` · ${props.pendingCount} por confirmar` : ''}` : 'Actualizando…'}
            </Text>
          </View>
        </View>
      </TourTarget>
      <View style={{ alignItems: 'center', ...(stacked ? { width: '100%' as const } : { flexShrink: 0 }) }}>
        <AnimatedPressable onPress={props.onGoogleCalendar} accessibilityLabel={calendarLabel} accessibilityHint="Abre los ajustes de conexión y sincronización" style={[button, calendarConnected && { backgroundColor: theme.successBg }]} hoverLift={false}>
          <Image source={require('../../../../../assets/google-calendar.png')} style={{ width: 20, height: 20 }} accessibilityElementsHidden importantForAccessibility="no" />
          <Text accessibilityLiveRegion="polite" style={[text, { fontSize: 12 }, calendarConnected && { color: theme.success }]}>{calendarLabel}</Text>
          {calendarConnected ? <Ionicons name="checkmark-circle" size={17} color={theme.success} accessible={false} /> : null}
        </AnimatedPressable>
      </View>
      <View style={[styles.row, stacked ? { width: '100%', justifyContent: 'center' } : [styles.side, { justifyContent: 'flex-end' }]]}>
      {props.nextSessionLabel && props.summaryAvailable ? <AnimatedPressable onPress={props.onJumpToNextSession} hoverLift={false} style={{ minHeight: 38, minWidth: 32, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`Ir a la próxima cita de este periodo, ${props.nextSessionLabel}`}>{toolbarWidth >= 1320 ? <Text style={{ color: theme.link, fontFamily: theme.fontSans, fontSize: 12 }}>Próxima · {props.nextSessionLabel}</Text> : <Ionicons name="arrow-forward-circle-outline" size={22} color={theme.link} />}</AnimatedPressable> : null}
      <View style={styles.row}>
        <TourTarget id="professional.sessions.view-tabs"><SimpleDropdown options={VIEW_OPTIONS} value={props.viewMode} onSelect={props.onChangeView} accessibilityLabel="Vista del calendario" presentation="portal" compact optionsMinWidth={192} maxHeight={240} keyboardNavigation /></TourTarget>
        <AnimatedPressable accessibilityLabel="Filtros de agenda" accessibilityHint={filterDescription} accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen(!filtersOpen)} style={[button, filtered && { backgroundColor: theme.primaryMuted, borderColor: theme.borderStrong }]} hoverLift={false}><Ionicons name="options-outline" size={17} color={theme.textPrimary} /><Text style={text}>Filtros{filtered ? ` · ${filterCount}` : ''}</Text></AnimatedPressable>
        <AnimatedPressable focusRef={settingsRef} accessibilityLabel="Ajustes de agenda" onPress={() => settingsRef.current?.measureInWindow((x, y, width, height) => props.onSettings({ x: x + width, y: y + height }))} style={button} hoverLift={false}><Text style={text}>Ajustes</Text><Ionicons name="chevron-down" size={14} color={theme.textPrimary} /></AnimatedPressable>
      </View>
      </View>
    </View>
    {filtersOpen ? <View style={[styles.filters, { borderColor: theme.borderLight }]}>
      <View style={styles.filter}><Text style={[text, { fontSize: 12 }]}>Procedencia</Text><SimpleDropdown options={ORIGIN_FILTER_OPTIONS} value={props.originFilter} onSelect={props.onChangeOrigin} accessibilityLabel="Procedencia" presentation="portal" optionsMinWidth={240} selectionIndicator="radio" /></View>
      <View style={styles.filter}><Text style={[text, { fontSize: 12 }]}>Estado</Text><SimpleDropdown options={STATUS_FILTER_OPTIONS} value={props.statusFilter} onSelect={props.onChangeStatus} accessibilityLabel="Estado" presentation="portal" optionsMinWidth={190} selectionIndicator="radio" /></View>
      <AnimatedPressable onPress={props.onResetFilters} style={button} hoverLift={false}><Text style={text}>Restablecer</Text></AnimatedPressable>
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  side: { flex: 1, flexBasis: 0, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  button: { minHeight: 38, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', padding: 16, gap: 12, borderTopWidth: 1 },
  filter: { minWidth: 160, gap: 5, flex: 1 },
});
