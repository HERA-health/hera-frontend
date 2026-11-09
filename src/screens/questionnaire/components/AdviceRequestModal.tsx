import React, { useRef } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Button } from '../../../components/common/Button';
import {
  AnimatedPressable,
  type AnimatedPressableHandle,
} from '../../../components/common/AnimatedPressable';
import { AdviceRequestForm } from './AdviceRequestForm';
import { useAdviceRequest } from './useAdviceRequest';

export function AdviceRequestModal({
  visible,
  draftId,
  specialistId,
  onClose,
  onDismiss,
  onViewRequest,
  onSent,
}: {
  visible: boolean;
  draftId?: string;
  specialistId?: string;
  onClose: () => void;
  onDismiss?: () => void;
  onViewRequest: (id: string) => void;
  onSent: () => void;
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const composer = useAdviceRequest({ draftId, specialistId, onSent });
  const closeButton = useRef<AnimatedPressableHandle>(null);
  const close = () => {
    if (!composer.busy) onClose();
  };
  const text = {
    fontFamily: theme.fontSans,
    fontSize: 15,
    lineHeight: 22,
    color: theme.textPrimary,
  };
  return (
    <Modal
      visible={visible}
      transparent={!mobile}
      animationType="fade"
      onRequestClose={close}
      onDismiss={onDismiss}
      onShow={() => closeButton.current?.focus()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: mobile ? 0 : 24,
          backgroundColor: theme.overlay,
        }}
      >
        <Pressable
          accessible={false}
          onPress={close}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: mobile ? undefined : 720,
            maxHeight: '100%',
            flex: mobile ? 1 : undefined,
            backgroundColor: theme.bgCard,
            borderRadius: mobile ? 0 : 24,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: mobile ? 20 : 28,
              paddingTop: 16,
              paddingBottom: 12,
              backgroundColor: theme.bgMuted,
            }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  ...text,
                  fontSize: 12,
                  color: theme.textSecondary,
                  fontFamily: theme.fontSansSemiBold,
                }}
              >
                ORIENTACIÓN HERA
              </Text>
              <Text
                accessibilityRole="header"
                style={{
                  fontFamily: theme.fontDisplay,
                  fontSize: mobile ? 26 : 30,
                  color: theme.textPrimary,
                }}
              >
                {composer.result
                  ? 'Tu solicitud está guardada'
                  : 'Te ayudamos a elegir'}
              </Text>
            </View>
            <AnimatedPressable
              focusRef={closeButton}
              onPress={close}
              disabled={composer.busy}
              accessibilityRole="button"
              accessibilityLabel="Cerrar asesoramiento"
              style={{
                width: 44,
                height: 44,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </AnimatedPressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: mobile ? 20 : 28, gap: 16 }}
          >
            {composer.result ? (
              <View accessibilityLiveRegion="polite" style={{ gap: 18 }}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={48}
                  color={theme.textPrimary}
                />
                <Text style={text}>
                  Puedes consultar la solicitud y la respuesta del equipo en
                  «Mis solicitudes».
                </Text>
                {composer.result.notificationPending ? (
                  <Text style={{ ...text, color: theme.textSecondary }}>
                    El aviso por correo está pendiente de reintento. Tu
                    solicitud ya está guardada.
                  </Text>
                ) : null}
                <Button onPress={close}>Volver a resultados</Button>
                <Button
                  variant="outline"
                  onPress={() => {
                    if (composer.result) onViewRequest(composer.result.id);
                  }}
                >
                  Ver solicitud
                </Button>
              </View>
            ) : (
              <AdviceRequestForm controller={composer} />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
