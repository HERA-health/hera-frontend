import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  CLINIC_PATIENT_DETAIL_TABS,
  type ClinicPatientDetailTab,
} from './clinicPatientDomain';
import { createDetailStyles } from './clinicPatientStyles';

interface ClinicPatientDetailTabsProps {
  activeTab: ClinicPatientDetailTab;
  disabled: boolean;
  onSelect: (tab: ClinicPatientDetailTab) => void;
}

export function ClinicPatientDetailTabs({
  activeTab,
  disabled,
  onSelect,
}: ClinicPatientDetailTabsProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createDetailStyles(theme), [theme]);
  const scrollRef = useRef<ScrollView>(null);
  const tabOffsets = useRef<Partial<Record<ClinicPatientDetailTab, number>>>({});

  const scrollToActiveTab = useCallback((animated: boolean) => {
    const offset = tabOffsets.current[activeTab];
    if (offset === undefined) return;
    scrollRef.current?.scrollTo({ x: Math.max(0, offset - 16), animated });
  }, [activeTab]);

  useEffect(() => {
    scrollToActiveTab(true);
  }, [scrollToActiveTab]);

  return (
    <View role="tablist" accessibilityLabel="Secciones de la ficha">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        onContentSizeChange={() => scrollToActiveTab(false)}
      >
        {CLINIC_PATIENT_DETAIL_TABS.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <View
              key={tab.key}
              onLayout={(event) => {
                tabOffsets.current[tab.key] = event.nativeEvent.layout.x;
                if (selected) {
                  scrollToActiveTab(false);
                }
              }}
            >
              <AnimatedPressable
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                hoverLift={false}
                pressScale={0.98}
                onPress={() => onSelect(tab.key)}
                style={[styles.tab, selected ? styles.tabSelected : null]}
              >
                <Text style={[styles.tabText, selected ? styles.tabTextSelected : null]}>
                  {tab.label}
                </Text>
              </AnimatedPressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
