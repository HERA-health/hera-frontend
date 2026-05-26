import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { MotionView } from '../../../components/common/MotionView';
import type { Theme } from '../../../constants/theme';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  audience: 'Profesionales' | 'Pacientes' | 'Privacidad' | 'Producto';
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'what-is-hera',
    audience: 'Producto',
    question: '¿Qué es HERA?',
    answer:
      'HERA es una plataforma para profesionales de salud mental que centraliza la gestión de la consulta y mantiene una entrada clara para pacientes que buscan terapia. Reúne agenda, pacientes, sesiones, perfil público, documentación y parte administrativa en un entorno pensado para trabajar con calma y orden.',
  },
  {
    id: 'professional-tools',
    audience: 'Profesionales',
    question: '¿Qué puede gestionar un profesional dentro de HERA?',
    answer:
      'Desde su espacio profesional puede organizar disponibilidad, sesiones, pacientes, tarifas, facturas, perfil público y documentación vinculada a su actividad. También hay áreas específicas para consentimientos, verificación profesional y acceso protegido a información más sensible.',
  },
  {
    id: 'patient-booking',
    audience: 'Pacientes',
    question: '¿Cómo reservan sesión los pacientes?',
    answer:
      'El paciente puede revisar perfiles profesionales, especialidades, modalidad de sesión y horarios disponibles. A partir de ahí avanza hacia la reserva con la información que cada especialista haya publicado y configurado en su agenda.',
  },
  {
    id: 'privacy',
    audience: 'Privacidad',
    question: '¿Cómo se trata la privacidad?',
    answer:
      'La privacidad se trata como una parte central del producto. HERA trabaja con minimización de datos, accesos diferenciados para información sensible, documentación protegida y flujos de consentimiento alineados con RGPD y LOPDGDD.',
  },
  {
    id: 'billing',
    audience: 'Profesionales',
    question: '¿La facturación está incluida?',
    answer:
      'Sí. HERA incluye herramientas para configurar tarifas, preparar facturas, revisar estados de pago y descargar documentación en PDF. No sustituye el asesoramiento fiscal, pero ayuda a que la parte administrativa de la consulta esté más ordenada.',
  },
  {
    id: 'modalities',
    audience: 'Pacientes',
    question: '¿Hay sesiones online y presenciales?',
    answer:
      'Sí, siempre que el profesional las haya activado. Cada perfil puede ofrecer sesiones online, presenciales o ambas, y el paciente solo verá opciones que estén disponibles según la configuración real del especialista.',
  },
  {
    id: 'verification',
    audience: 'Profesionales',
    question: '¿Los especialistas pasan verificación?',
    answer:
      'HERA contempla revisión de documentación profesional para reforzar la confianza y cuidar la calidad del acceso a la plataforma. Esta verificación ayuda a validar el uso profesional, aunque no sustituye las obligaciones legales, colegiales o clínicas de cada especialista.',
  },
  {
    id: 'beta',
    audience: 'Producto',
    question: '¿Hay funciones en demo o beta?',
    answer:
      'Cuando una función esté en demo, beta o pendiente de revisión final, se mostrará identificada como tal. Preferimos explicar el estado real de cada herramienta antes que prometer una experiencia que todavía no esté disponible para todos los usuarios.',
  },
];

export const FAQSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const isDesktop = width >= 1024;
  const [expandedId, setExpandedId] = useState<string>(FAQ_ITEMS[0].id);

  const midpoint = Math.ceil(FAQ_ITEMS.length / 2);
  const columns = isDesktop
    ? [FAQ_ITEMS.slice(0, midpoint), FAQ_ITEMS.slice(midpoint)]
    : [FAQ_ITEMS];

  const toggleItem = (id: string) => {
    setExpandedId((currentId) => (currentId === id ? '' : id));
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bgMuted },
        isDesktop && styles.containerDesktop,
      ]}
    >
      <View style={styles.content}>
        <MotionView entering="fadeInUp" delay={0} style={styles.header}>
          <Text
            style={[
              styles.eyebrow,
              { color: theme.primary, fontFamily: theme.fontSansSemiBold },
            ]}
          >
            FAQ
          </Text>
          <Text
            style={[
              styles.title,
              isDesktop && styles.titleDesktop,
              { color: theme.textPrimary, fontFamily: theme.fontDisplay },
            ]}
          >
            Preguntas frecuentes
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: theme.textSecondary, fontFamily: theme.fontSans },
            ]}
          >
            Respuestas directas para entender qué ofrece HERA hoy, tanto para
            profesionales como para pacientes.
          </Text>
        </MotionView>

        <View style={[styles.columns, isDesktop && styles.columnsDesktop]}>
          {columns.map((column, columnIndex) => (
            <View key={columnIndex} style={styles.column}>
              {column.map((item, index) => (
                <MotionView
                  key={item.id}
                  entering="fadeInUp"
                  delay={80 + (columnIndex * midpoint + index) * 45}
                >
                  <FAQCard
                    item={item}
                    expanded={expandedId === item.id}
                    onToggle={() => toggleItem(item.id)}
                    theme={theme}
                    isDark={isDark}
                  />
                </MotionView>
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

interface FAQCardProps {
  item: FAQItem;
  expanded: boolean;
  onToggle: () => void;
  theme: Theme;
  isDark: boolean;
}

function FAQCard({ item, expanded, onToggle, theme, isDark }: FAQCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? theme.bgCard : theme.bgElevated,
          borderColor: expanded ? theme.primaryAlpha20 : theme.border,
          shadowColor: theme.shadowNeutral,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={styles.questionButton}
      >
        <View style={styles.questionCopy}>
          <View
            style={[
              styles.audienceBadge,
              {
                backgroundColor: isDark ? theme.bgMuted : theme.primaryAlpha12,
                borderColor: theme.primaryAlpha20,
              },
            ]}
          >
            <Text
              style={[
                styles.audienceText,
                { color: theme.primary, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              {item.audience}
            </Text>
          </View>
          <Text
            style={[
              styles.question,
              { color: theme.textPrimary, fontFamily: theme.fontSansBold },
            ]}
          >
            {item.question}
          </Text>
        </View>

        <View
          style={[
            styles.chevron,
            {
              backgroundColor: expanded ? theme.primary : theme.secondaryAlpha12,
            },
          ]}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={expanded ? theme.textOnPrimary : theme.secondaryDark}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <Text
          style={[
            styles.answer,
            { color: theme.textSecondary, fontFamily: theme.fontSans },
          ]}
        >
          {item.answer}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingVertical: 96,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 44,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    lineHeight: 39,
    letterSpacing: 0,
    textAlign: 'center',
    marginBottom: 12,
  },
  titleDesktop: {
    fontSize: 42,
    lineHeight: 50,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    maxWidth: 720,
  },
  columns: {
    gap: 14,
  },
  columnsDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  column: {
    flex: 1,
    gap: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 3,
  },
  questionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  questionCopy: {
    flex: 1,
    minWidth: 0,
  },
  audienceBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  audienceText: {
    fontSize: 11,
  },
  question: {
    fontSize: 17,
    lineHeight: 23,
  },
  chevron: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  answer: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 16,
    paddingRight: 48,
  },
});
