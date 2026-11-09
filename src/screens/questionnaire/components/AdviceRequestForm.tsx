import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Button } from '../../../components/common/Button';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { choiceKeyboardProps } from '../../../utils/choiceKeyboard';
import type { AdviceRequestController } from './useAdviceRequest';

export function AdviceRequestForm({
  controller,
  disabled = false,
}: {
  controller: AdviceRequestController;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const { reason, setReason, message, setMessage, share, setShare, send } =
    controller;
  const busy = disabled || controller.busy;
  const text = {
    fontFamily: theme.fontSans,
    fontSize: 15,
    lineHeight: 21,
    color: theme.textPrimary,
  };
  const inputStyle = {
    ...text,
    textAlignVertical: 'top' as const,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    minHeight: 104,
    backgroundColor: theme.bgCard,
  };
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ ...text, fontFamily: theme.fontSansSemiBold }}>
        ¿En qué podemos ayudarte?
      </Text>
      <View style={{ gap: 6 }}>
        {(
          [
            ['choose', 'Necesito ayuda para elegir'],
            ['no-match', 'No encuentro un profesional compatible'],
            ['booking', 'Necesito ayuda con la primera cita'],
            ['other', 'Otro motivo'],
          ] as const
        ).map(([value, label]) => (
          <AnimatedPressable
            key={value}
            {...choiceKeyboardProps(() => setReason(value), busy)}
            disabled={busy}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: reason === value, disabled: busy }}
            aria-checked={reason === value}
            onPress={() => setReason(value)}
            style={{
              minHeight: 48,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderRadius: 10,
              backgroundColor: reason === value ? theme.bgMuted : theme.bgCard,
              borderWidth: 1,
              borderColor:
                reason === value ? theme.borderStrong : theme.borderLight,
            }}
          >
            <Ionicons
              name={reason === value ? 'radio-button-on' : 'radio-button-off'}
              size={19}
              color={reason === value ? theme.primary : theme.textSecondary}
            />
            <Text style={{ ...text, fontSize: 15, lineHeight: 21, flex: 1 }}>
              {label}
            </Text>
          </AnimatedPressable>
        ))}
      </View>
      <TextInput
        accessibilityLabel="Cuéntanos qué necesitas"
        editable={!busy}
        multiline
        maxLength={500}
        value={message}
        onChangeText={setMessage}
        placeholder="Cuéntanos qué necesitas, sin nombres ni datos de otras personas"
        placeholderTextColor={theme.textMuted}
        style={inputStyle}
      />
      <Text
        style={{
          ...text,
          fontSize: 12,
          textAlign: 'right',
          color: theme.textSecondary,
        }}
      >
        {message.length}/500
      </Text>
      <Text style={text}>
        Compartiremos con el equipo tu contacto, el tipo de atención y quién
        responde, este mensaje y el profesional de interés, si has elegido uno.
      </Text>
      <Pressable
        {...choiceKeyboardProps(() => setShare(!share), busy)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: share, disabled: busy }}
        aria-checked={share}
        disabled={busy}
        onPress={() => setShare(!share)}
        style={{
          padding: 14,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
        }}
      >
        <Text style={text}>
          {share ? '✓' : '○'} También quiero compartir las respuestas de este
          cuestionario con el equipo.
        </Text>
      </Pressable>
      {controller.error ? (
        <Text accessibilityRole="alert" style={{ ...text, color: theme.error }}>
          {controller.error}
        </Text>
      ) : null}
      <Button
        size="small"
        style={{ minHeight: 44, alignSelf: 'flex-start' }}
        loading={busy}
        disabled={!message.trim()}
        onPress={() => void send()}
      >
        Enviar solicitud al equipo
      </Button>
    </View>
  );
}
