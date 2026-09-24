import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SimpleDropdown } from '../common/SimpleDropdown';
import { AnimatedPressable } from '../common/AnimatedPressable';
import type { PrivateServiceOption } from '../../services/privateCatalogService';
import type { SessionType } from '../../services/sessionsService';
import { formatPrivatePrice } from '../../utils/privateTariff';

export function PrivateServicePicker({ options, modality, value, onChange, disabled = false, showDuration = true }: {
  options: PrivateServiceOption[]; modality: SessionType; value?: string;
  onChange: (id: string) => void; disabled?: boolean; showDuration?: boolean;
}) {
  const { theme } = useTheme();
  const selected = options.find(o => o.id === value && o.modality === modality);
  const [serviceId, setServiceId] = useState(selected?.serviceId);
  useEffect(() => { if (selected) setServiceId(selected.serviceId); }, [selected?.id]);
  const available = options.filter(o => o.modality === modality && o.isActive);
  const groups = [...new Set(available.map(o => o.serviceId))].map(id => ({ id, options: available.filter(o => o.serviceId === id) }));
  const durations = available.filter(o => o.serviceId === (selected?.serviceId ?? serviceId));
  return <View style={{ gap: 12 }}>
    <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 16 }}>¿Qué servicio quieres reservar?</Text>
    {groups.map(group => {
      const main = group.options.find(o => o.isPreferred) ?? group.options[0];
      const active = selected?.serviceId === group.id;
      return <AnimatedPressable key={group.id} accessibilityRole="radio" accessibilityState={{ checked: active, disabled }} disabled={disabled}
        accessibilityLabel={`${main.serviceName ?? 'General'}, ${main.durationMinutes} minutos, ${formatPrivatePrice(main.priceCents)}`}
        hoverLift={false} onPress={() => { setServiceId(group.id); onChange(main.id); }}
        style={{ padding: 16, borderRadius: 12, borderWidth: 1, borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primaryAlpha12 : theme.bgCard, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 15, flexShrink: 1 }}>{main.serviceName ?? 'General'}</Text>
          <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }}>{(active ? selected : main)?.durationMinutes} min · {formatPrivatePrice((active ? selected : main)?.priceCents ?? main.priceCents)}</Text>
        </View>
        {!!main.serviceDescription && <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, lineHeight: 20 }}>{main.serviceDescription}</Text>}
      </AnimatedPressable>;
    })}
    {showDuration && durations.length > 1 && <SimpleDropdown presentation="portal" highlightSelection={false} disabled={disabled} accessibilityLabel="Duración y precio del servicio" placeholder="Elige duración" value={selected?.id ?? null}
      options={durations.map(o => ({ value: o.id, label: `${o.durationMinutes} min · ${formatPrivatePrice(o.priceCents)}` }))} onSelect={onChange} />}
    {!groups.length && <Text style={{ color: theme.textSecondary }}>No hay servicios disponibles en esta modalidad.</Text>}
  </View>;
}
