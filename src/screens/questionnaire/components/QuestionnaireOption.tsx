import React from 'react';
import { Platform, Text, View, type DimensionValue } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { choiceKeyboardProps } from '../../../utils/choiceKeyboard';

import { QuestionnairePictogram, type QuestionnairePictogramName } from './QuestionnairePictogram';

interface Props {
  illustration?: QuestionnairePictogramName;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  multiple: boolean;
  variant: 'list' | 'row' | 'tile' | 'compact';
  width: DimensionValue;
  onPress: () => void;
  error?: string;
}

export function QuestionnaireOption({
  label,
  illustration,
  icon,
  selected,
  multiple,
  variant,
  width,
  onPress,
  error,
}: Props) {
  const { theme } = useTheme();
  const list = variant === 'list';
  const tile = variant === 'tile';
  const indicator = (
    <Ionicons
      aria-hidden
      name={
        multiple
          ? selected
            ? 'checkbox'
            : 'square-outline'
          : selected
            ? 'checkmark-circle'
            : 'ellipse-outline'
      }
      size={20}
      color={selected ? theme.textPrimary : theme.textMuted}
    />
  );
  return (
    <AnimatedPressable
      {...choiceKeyboardProps(onPress, false)}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      hoverLift={false}
      pressScale={1}
      style={{
        ...(Platform.OS === 'web' ? { outlineColor: theme.focus } : {}),
        width,
        minHeight: list ? 44 : illustration ? 114 : tile ? 82 : variant === 'row' ? 56 : 48,
        padding: list ? 6 : 10,
        borderWidth: 1,
        borderRadius: list ? 8 : 16,
        borderColor: selected
          ? theme.actionPrimary
          : list
            ? 'transparent'
            : theme.border,
        backgroundColor: selected
          ? theme.bgMuted
          : list
            ? 'transparent'
            : theme.bgCard,
        flexDirection: tile ? 'column' : 'row',
        alignItems: tile && !illustration ? 'flex-start' : 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {list ? indicator : null}
      {illustration ? <QuestionnairePictogram name={illustration} size={54} /> : icon ? (
        <View
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: variant === 'compact' ? 24 : 32,
            height: variant === 'compact' ? 24 : 32,
            borderRadius: 24,
            backgroundColor: theme.bgMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={icon}
            size={variant === 'compact' ? 20 : 22}
            color={theme.textPrimary}
          />
        </View>
      ) : null}
      <View
        style={{
          flex: tile ? undefined : 1,
          paddingRight: tile && !illustration ? 8 : 0,
          gap: 6,
        }}
      >
        <Text
          style={{
            fontFamily: selected ? theme.fontSansSemiBold : theme.fontSans,
            fontSize: 15,
            lineHeight: 20,
            textAlign: illustration && tile ? 'center' : 'left',
            color: theme.textPrimary,
          }}
        >
          {label}
        </Text>
        {error ? (
          <Text
            accessibilityRole="alert"
            style={{
              fontFamily: theme.fontSans,
              fontSize: 14,
              lineHeight: 20,
              color: theme.error,
            }}
          >
            {error}
          </Text>
        ) : null}
      </View>
      {!list ? (
        <View
          style={
            tile ? { position: 'absolute', top: 10, right: 10 } : undefined
          }
        >
          {indicator}
        </View>
      ) : null}
    </AnimatedPressable>
  );
}
