import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, AnimatedPressable, Card } from '../../../components/common';
import { spacing, borderRadius, shadows } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import ProfileFormField from './ProfileFormField';
import type { CardFormState, PaymentMethod, Transaction } from '../types';

interface ProfilePaymentSectionProps {
  paymentMethod: PaymentMethod | null;
  transactions: Transaction[];
  isAddingCard: boolean;
  cardForm: CardFormState;
  onAddCard: () => void;
  onCancelAddCard: () => void;
  onSaveCard: () => void;
  onRemoveCard: () => void;
  onCardFormChange: (updates: Partial<CardFormState>) => void;
}

export const ProfilePaymentSection: React.FC<ProfilePaymentSectionProps> = ({
  paymentMethod,
  transactions,
  isAddingCard,
  cardForm,
  onAddCard,
  onCancelAddCard,
  onSaveCard,
  onRemoveCard,
  onCardFormChange,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.content}>
      <View style={[styles.securityBanner, { backgroundColor: theme.primaryAlpha12 }]}>
        <View style={[styles.securityIcon, { backgroundColor: theme.primaryAlpha20 }]}>
          <Ionicons name="lock-closed" size={16} color={theme.primary} />
        </View>
        <Text style={[styles.securityText, { color: theme.primary }]}>
          Conexión segura • Datos encriptados
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Método de pago</Text>

        {paymentMethod && !isAddingCard ? (
          <Card style={styles.paymentCard}>
            <View style={[styles.creditCard, { backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted }]}>
              <View style={styles.creditCardHeader}>
                <Ionicons
                  name={paymentMethod.type === 'visa' ? 'card' : 'card-outline'}
                  size={32}
                  color={theme.textPrimary}
                />
                <Text style={styles.cardBrand}>{paymentMethod.type.toUpperCase()}</Text>
              </View>
              <Text style={styles.cardNumber}>•••• •••• •••• {paymentMethod.last4}</Text>
              <Text style={styles.cardExpiry}>
                Válida hasta: {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
              </Text>
            </View>

            <View style={styles.cardActions}>
              <Button
                onPress={onAddCard}
                variant="secondary"
                size="medium"
                icon={<Ionicons name="pencil-outline" size={16} color={theme.textPrimary} />}
              >
                Editar
              </Button>
              <Button
                onPress={onRemoveCard}
                variant="danger"
                size="medium"
                icon={<Ionicons name="trash-outline" size={16} color="#FFFFFF" />}
              >
                Eliminar
              </Button>
            </View>
          </Card>
        ) : isAddingCard ? (
          <Card style={styles.formCard}>
            <View style={styles.cardFormHeader}>
              <Text style={styles.cardFormTitle}>Añadir tarjeta</Text>
              <View style={styles.secureInputBadge}>
                <Ionicons name="shield-checkmark" size={14} color={theme.success} />
                <Text style={[styles.secureInputText, { color: theme.success }]}>Pago seguro</Text>
              </View>
            </View>

            <ProfileFormField
              label="Número de tarjeta"
              value={cardForm.number}
              placeholder="1234 5678 9012 3456"
              onChangeText={(text) => onCardFormChange({ number: text })}
              keyboardType="number-pad"
              maxLength={19}
            />

            <View style={styles.formRow}>
              <View style={styles.formRowHalf}>
                <ProfileFormField
                  label="Fecha de expiración"
                  value={cardForm.expiry}
                  placeholder="MM/AA"
                  onChangeText={(text) => onCardFormChange({ expiry: text })}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              <View style={styles.formRowHalf}>
                <ProfileFormField
                  label="CVV"
                  value={cardForm.cvv}
                  placeholder="123"
                  onChangeText={(text) => onCardFormChange({ cvv: text })}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  helperText="Código de seguridad"
                />
              </View>
            </View>

            <ProfileFormField
              label="Nombre en la tarjeta"
              value={cardForm.name}
              placeholder="Como aparece en la tarjeta"
              onChangeText={(text) => onCardFormChange({ name: text })}
            />

            <View style={styles.formActions}>
              <Button onPress={onCancelAddCard} variant="ghost" size="large">
                Cancelar
              </Button>
              <Button
                onPress={onSaveCard}
                size="large"
                icon={<Ionicons name="lock-closed" size={16} color={theme.textOnPrimary} />}
              >
                Guardar tarjeta
              </Button>
            </View>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIconShell, { backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted }]}>
              <Ionicons name="card-outline" size={48} color={theme.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No tienes método de pago</Text>
            <Text style={styles.emptyDescription}>
              Añade una tarjeta para reservar sesiones de forma rápida y segura.
            </Text>
            <Button
              onPress={onAddCard}
              icon={<Ionicons name="add" size={20} color={theme.textOnPrimary} />}
            >
              Añadir tarjeta
            </Button>
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historial de pagos</Text>

        {transactions.length > 0 ? (
          <View style={styles.transactionList}>
            {transactions.map((transaction) => (
              <Card key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={styles.transactionIcon}>
                    <Ionicons
                      name={transaction.status === 'paid' ? 'checkmark-circle' : 'time'}
                      size={20}
                      color={transaction.status === 'paid' ? theme.success : theme.warningAmber}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDate}>
                      {transaction.date.toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={styles.transactionSpecialist}>{transaction.specialistName}</Text>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={styles.transactionAmount}>
                    {transaction.currency}{transaction.amount.toFixed(2)}
                  </Text>
                  <AnimatedPressable style={styles.receiptLink}>
                    <Text style={[styles.receiptLinkText, { color: theme.primary }]}>Ver recibo</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.primary} />
                  </AnimatedPressable>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <Card style={styles.emptyTransactions}>
            <View style={[styles.emptyIconShell, { backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted }]}>
              <Ionicons name="receipt-outline" size={40} color={theme.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Sin transacciones</Text>
            <Text style={styles.emptyDescription}>
              Tus pagos aparecerán aquí después de tu primera sesión.
            </Text>
          </Card>
        )}
      </View>
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean
) =>
  StyleSheet.create({
    content: {
      gap: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    securityBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      alignSelf: 'flex-start',
    },
    securityIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    securityText: {
      fontSize: 14,
      fontFamily: theme.fontSansSemiBold,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      fontSize: 18,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    paymentCard: {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      gap: spacing.lg,
      ...shadows.md,
    },
    creditCard: {
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      gap: spacing.sm,
    },
    creditCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardBrand: {
      color: theme.textSecondary,
      fontSize: 13,
      fontFamily: theme.fontSansBold,
      letterSpacing: 0.8,
    },
    cardNumber: {
      color: theme.textPrimary,
      fontSize: 22,
      fontFamily: theme.fontDisplayBold,
      letterSpacing: 1.2,
    },
    cardExpiry: {
      color: theme.textSecondary,
      fontSize: 14,
      fontFamily: theme.fontSansMedium,
    },
    cardActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    formCard: {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      gap: spacing.lg,
      ...shadows.md,
    },
    cardFormHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    cardFormTitle: {
      fontSize: 18,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
    },
    secureInputBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    secureInputText: {
      fontSize: 13,
      fontFamily: theme.fontSansSemiBold,
    },
    formRow: {
      flexDirection: 'row',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    formRowHalf: {
      flex: 1,
      minWidth: 180,
    },
    formActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    emptyCard: {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      padding: spacing.xxxl,
      alignItems: 'center',
      gap: spacing.md,
      ...shadows.md,
    },
    emptyIconShell: {
      width: 80,
      height: 80,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      fontFamily: theme.fontSansBold,
      textAlign: 'center',
    },
    emptyDescription: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 24,
      textAlign: 'center',
      fontFamily: theme.fontSansMedium,
      maxWidth: 420,
    },
    transactionList: {
      gap: spacing.md,
    },
    transactionItem: {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      flexWrap: 'wrap',
      ...shadows.sm,
    },
    transactionLeft: {
      flexDirection: 'row',
      gap: spacing.sm,
      flex: 1,
      minWidth: 240,
    },
    transactionIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    transactionDetails: {
      flex: 1,
      gap: 2,
    },
    transactionDate: {
      color: theme.textPrimary,
      fontSize: 14,
      fontFamily: theme.fontSansSemiBold,
    },
    transactionDescription: {
      color: theme.textPrimary,
      fontSize: 15,
      fontFamily: theme.fontSansBold,
    },
    transactionSpecialist: {
      color: theme.textSecondary,
      fontSize: 14,
      fontFamily: theme.fontSansMedium,
    },
    transactionRight: {
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    transactionAmount: {
      color: theme.textPrimary,
      fontSize: 18,
      fontFamily: theme.fontDisplayBold,
    },
    receiptLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    receiptLinkText: {
      fontSize: 14,
      fontFamily: theme.fontSansSemiBold,
    },
    emptyTransactions: {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      padding: spacing.xxxl,
      alignItems: 'center',
      gap: spacing.md,
      ...shadows.md,
    },
  });

export default ProfilePaymentSection;
