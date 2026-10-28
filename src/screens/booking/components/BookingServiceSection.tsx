import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { useTheme } from '../../../contexts/ThemeContext';
import type { PrivateServiceOption } from '../../../services/privateCatalogService';
import { formatPrivatePrice } from '../../../utils/privateTariff';

interface Props {
  options: PrivateServiceOption[];
  heading?: React.ReactNode;
  serviceId?: string;
  selectedOptionId?: string;
  disabled: boolean;
  onServiceSelect: (serviceId: string) => void;
}

/** Group the existing bookable options without fetching or exposing another catalog. */
export function BookingServiceSection({ options, heading, serviceId, selectedOptionId, disabled, onServiceSelect }: Props) {
  const { theme } = useTheme();
  const active = options.filter(option => option.isActive);
  const groups = [...new Set(active.map(option => option.serviceId))].map(id => {
    const variants = active.filter(option => option.serviceId === id);
    const main = variants.find(option => option.id === selectedOptionId)
      ?? variants.find(option => option.isPreferred) ?? variants[0];
    const prices = variants.map(option => option.priceCents);
    const durations = [...new Set(variants.map(option => option.durationMinutes))].sort((a, b) => a - b);
    const exact = variants.find(option => option.id === selectedOptionId);
    const price = exact ? formatPrivatePrice(exact.priceCents) : `${new Set(prices).size > 1 ? 'Desde ' : ''}${formatPrivatePrice(Math.min(...prices))}`;
    const duration = exact ? `${exact.durationMinutes} min` : durations.length === 1 ? `${durations[0]} min` : `${durations[0]}–${durations[durations.length - 1]} min`;
    return { id, main, price, duration };
  });
  const selectedIndex = groups.findIndex(group => group.id === serviceId);
  const pageCount = Math.max(1, Math.ceil(groups.length / 3));
  const [page, setPage] = useState(() => Math.max(0, Math.floor(selectedIndex / 3)));
  const currentPage = Math.min(page, pageCount - 1);
  useEffect(() => {
    if (selectedIndex >= 0) setPage(Math.floor(selectedIndex / 3));
  }, [selectedIndex]);
  useEffect(() => { setPage(current => Math.min(current, pageCount - 1)); }, [pageCount]);
  const visible = groups.slice(currentPage * 3, currentPage * 3 + 3);
  const selectedOffPage = selectedIndex >= 0 && Math.floor(selectedIndex / 3) !== currentPage;

  return <View style={styles.section}>
    {(heading || pageCount > 1) && <View style={styles.header}>
      {heading && <View style={styles.heading}>{heading}</View>}
      {pageCount > 1 && <View style={styles.pagination}>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="Servicios anteriores"
          accessibilityState={{ disabled: disabled || currentPage === 0 }} disabled={disabled || currentPage === 0}
          hoverLift={false} onPress={() => setPage(currentPage - 1)}
          style={[styles.pageButton, { backgroundColor: theme.primaryMuted, opacity: currentPage === 0 ? 0.4 : 1 }]}>
          <Ionicons name="chevron-back" size={17} color={theme.primary} />
        </AnimatedPressable>
        <Text accessibilityLiveRegion="polite" accessibilityLabel={`Página ${currentPage + 1} de ${pageCount} de servicios`}
          style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 11 }}>{currentPage + 1}/{pageCount}</Text>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="Servicios siguientes"
          accessibilityState={{ disabled: disabled || currentPage === pageCount - 1 }} disabled={disabled || currentPage === pageCount - 1}
          hoverLift={false} onPress={() => setPage(currentPage + 1)}
          style={[styles.pageButton, { backgroundColor: theme.primaryMuted, opacity: currentPage === pageCount - 1 ? 0.4 : 1 }]}>
          <Ionicons name="chevron-forward" size={17} color={theme.primary} />
        </AnimatedPressable>
      </View>}
    </View>}
    <View accessibilityRole={groups.length > 1 ? 'radiogroup' : undefined} accessibilityLabel="Servicios" style={styles.grid}>
      {visible.map(group => {
        const selected = group.id === serviceId;
        const informational = groups.length === 1 && selected;
        const durationText = <Text style={{ fontFamily: theme.fontSans, color: theme.textSecondary, fontSize: 12, lineHeight: 17 }}>{group.duration}</Text>;
        const priceText = <Text style={{ fontFamily: theme.fontSansSemiBold, color: theme.textPrimary, fontSize: 13 }}>{group.price}</Text>;
        const content = <View style={styles.optionContent}>
          <View style={styles.optionHeader}>
            <Ionicons name="list-outline" size={18} color={theme.primary} />
            <View style={styles.copy}>
              <Text style={{ fontFamily: theme.fontSansSemiBold, color: theme.textPrimary, fontSize: 13, lineHeight: 18 }}>{group.main.serviceName ?? group.main.name}</Text>
              {durationText}
            </View>
            {priceText}
            {!informational && <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={19} color={selected ? theme.primary : theme.textMuted} />}
          </View>
        </View>;
        const style = [styles.option, { borderColor: selected ? theme.primaryAlpha20 : theme.borderLight, backgroundColor: selected ? theme.primaryMuted : theme.bgCard }];
        return <View key={group.id} style={styles.service}>
          {informational ? <View style={style}>{content}</View> :
            <AnimatedPressable accessibilityRole="radio" accessibilityLabel={`${group.main.serviceName ?? group.main.name}, ${group.duration}, ${group.price}`}
              accessibilityState={{ checked: selected, disabled }} disabled={disabled} hoverLift={false}
              onPress={() => onServiceSelect(group.id)} style={style}>{content}</AnimatedPressable>}
        </View>;
      })}
    </View>
    {selectedOffPage && <AnimatedPressable accessibilityRole="button" accessibilityLabel="Volver al servicio seleccionado"
      disabled={disabled} hoverLift={false} onPress={() => setPage(Math.floor(selectedIndex / 3))} style={styles.selectedNotice}>
      <Ionicons name="checkmark-circle-outline" size={16} color={theme.primary} />
      <Text style={{ flex: 1, color: theme.primary, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 17 }}>
        Seleccionado: {groups[selectedIndex].main.serviceName ?? groups[selectedIndex].main.name}
      </Text>
      <Ionicons name="arrow-undo-outline" size={16} color={theme.primary} />
    </AnimatedPressable>}
    {!groups.length && <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans }}>No hay servicios disponibles para reservar.</Text>}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  heading: { flexGrow: 1, flexShrink: 1, flexBasis: 160 },
  pagination: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageButton: { width: 36, minHeight: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  selectedNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  grid: { gap: 8 },
  service: { gap: 8 },
  option: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', minHeight: 54, minWidth: 0, gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderRadius: 12 },
  optionContent: { flex: 1, minWidth: 0, gap: 4 },
  optionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
