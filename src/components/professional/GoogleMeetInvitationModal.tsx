import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Button } from '../common/Button';

interface GoogleMeetInvitationModalProps {
  connected: boolean;
  renewing: boolean;
  onDismiss: () => void;
  onConfigure: () => void;
}

export function GoogleMeetInvitationModal({ connected, renewing, onDismiss, onConfigure }: GoogleMeetInvitationModalProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const description = renewing
    ? connected ? 'Tu calendario sigue conectado. Revisa el nuevo aviso y confirma de nuevo Meet para tus próximas videollamadas.'
      : 'Para seguir usando Meet, reconecta la misma cuenta de Google y confirma el nuevo aviso. Te acompañamos desde tu perfil.'
    : connected ? 'Tu Google Calendar ya está conectado. Da el siguiente paso y activa Meet para tus próximas videollamadas.'
      : 'Ahora puedes conectar Google Calendar con HERA y usar Google Meet en tus próximas videollamadas.';

  return <Modal visible transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
    <View style={[styles.overlay, { backgroundColor: theme.overlay, padding: compact ? spacing.md : spacing.xl }]}>
      <Pressable onPress={onDismiss} style={StyleSheet.absoluteFill} accessible={false} testID="meet-invitation-backdrop" />
      <View accessibilityViewIsModal style={[styles.card, { backgroundColor: theme.bgElevated, borderColor: theme.borderLight,
        shadowColor: theme.shadowStrong }]}>
        <ScrollView bounces={false} style={styles.body} contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.md }}>
          <View style={styles.topRow}>
            <View style={[styles.integration, { backgroundColor: theme.secondaryMuted }]} accessibilityLabel="Google Calendar y Google Meet">
              <Image source={require('../../../assets/google-calendar.png')} style={styles.productLogo} resizeMode="contain" accessible={false} />
              <View style={[styles.connector, { backgroundColor: theme.secondaryLight }]} />
              <Image source={require('../../../assets/google-meet.png')} style={styles.productLogo} resizeMode="contain" accessible={false} />
            </View>
            <AnimatedPressable accessibilityLabel="Cerrar invitación de Google Meet" onPress={onDismiss}
              hoverLift={false} style={styles.close}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </AnimatedPressable>
          </View>

          <Text style={[styles.eyebrow, { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold }]}>
            {renewing ? 'SIGAMOS CONECTADOS' : 'NUEVO EN HERA'}
          </Text>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontDisplay,
            fontSize: compact ? typography.fontSizes.xxl : typography.fontSizes.xxxl, lineHeight: compact ? 32 : 36 }]}>
            {renewing ? 'Sigamos con Google Meet.' : 'Tu agenda y tus sesiones, conectadas.'}
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{description}</Text>

          <View style={[styles.benefits, { borderColor: theme.borderLight }]}>
            <View style={styles.benefit}>
              <Image source={require('../../../assets/google-calendar.png')} style={styles.benefitLogo} resizeMode="contain" accessible={false} />
              <View style={styles.benefitCopy}>
                <Text style={[styles.benefitTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Tus citas, también en Google Calendar</Text>
                <Text style={[styles.benefitBody, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Consulta las citas de HERA desde tu calendario.</Text>
              </View>
            </View>
            <View style={styles.benefit}>
              <Image source={require('../../../assets/google-meet.png')} style={styles.benefitLogo} resizeMode="contain" accessible={false} />
              <View style={styles.benefitCopy}>
                <Text style={[styles.benefitTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Tu enlace Meet, preparado por HERA</Text>
                <Text style={[styles.benefitBody, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Sin crear una reunión a mano para cada nueva sesión.</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.reassurance, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
            Tú eliges cuándo activarlo. Las citas ya preparadas conservan su enlace.
          </Text>
        </ScrollView>
        <View style={styles.footerPanel}>
          <View style={[styles.actions, { flexDirection: compact ? 'column' : 'row-reverse' }]}>
            <Button fullWidth={compact} style={compact ? undefined : { flex: 1 }} onPress={onConfigure}
              icon={<Ionicons name="arrow-forward" size={18} color={theme.actionPrimaryText} />} iconPosition="right">
              {renewing ? 'Renovar conexión' : 'Configurar Google Meet'}
            </Button>
            <Button fullWidth={compact} variant="ghost" onPress={onDismiss}>Ahora no</Button>
          </View>
          <Text style={[styles.footer, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Siempre disponible en Tu perfil → Cuenta.</Text>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 520, maxHeight: '90%', borderRadius: borderRadius.xxl, borderWidth: 1,
    shadowOffset: { width: 0, height: 16 }, shadowOpacity: 1, shadowRadius: 32, elevation: 14 },
  body: { flexShrink: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  integration: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: borderRadius.xl, padding: spacing.md },
  connector: { width: 20, height: 1 },
  productLogo: { width: 34, height: 34 },
  benefitLogo: { width: 24, height: 24 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.full },
  eyebrow: { fontSize: 11, letterSpacing: 1.5, marginBottom: spacing.sm },
  title: { marginBottom: spacing.md },
  description: { fontSize: typography.fontSizes.md, lineHeight: 24 },
  benefits: { borderTopWidth: 1, borderBottomWidth: 1, gap: spacing.md, paddingVertical: spacing.md, marginVertical: spacing.lg },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  benefitCopy: { flex: 1, gap: spacing.xs },
  benefitTitle: { fontSize: typography.fontSizes.sm, lineHeight: 20 },
  benefitBody: { fontSize: typography.fontSizes.sm, lineHeight: 21 },
  reassurance: { fontSize: typography.fontSizes.sm, lineHeight: 21 },
  footerPanel: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, paddingTop: spacing.sm },
  actions: { gap: spacing.sm },
  footer: { fontSize: typography.fontSizes.xs, lineHeight: 18, textAlign: 'center', marginTop: spacing.sm },
});
