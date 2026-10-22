import React, { useEffect, useRef, useState } from 'react';
import {
  Image, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View,
  useWindowDimensions, type StyleProp, type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useWebPageMetadata } from '../../hooks/useWebPageMetadata';
import { LandingHeader } from './components/LandingHeader';
import { FooterSection } from './components/FooterSection';
import type { LandingSectionAnchor } from './types';
import {
  DIRECTORY_OFFER, PRICING_AVAILABILITY, PRICING_COMMISSION_NOTE, PRICING_FAQS,
  PRICING_PLANS, PRICING_STORAGE_NOTE, SUBSCRIPTION_ESSENTIALS, SUBSCRIPTION_TOOL_GROUPS, type PricingPlanId,
} from './pricingContent';

const DESKTOP_BREAKPOINT = 1040;
const TABLET_BREAKPOINT = 720;
const HEADER_OFFSET = 88;

interface PricingActionProps {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
  selected?: boolean;
  expanded?: boolean;
  filled?: boolean;
  quiet?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  focusRef?: React.Ref<View>;
}

function PricingAction({ children, label, onPress, selected, expanded, filled, quiet, icon, style, focusRef }: PricingActionProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      ref={focusRef}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded, ...(Platform.OS !== 'web' ? { selected } : {}) }}
      {...(Platform.OS === 'web' ? { 'aria-pressed': selected } : {})}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.action, {
        backgroundColor: filled ? theme.actionPrimary : selected ? theme.secondaryMuted : theme.surface,
        borderColor: focused ? theme.focus : quiet ? 'transparent' : selected || filled ? theme.actionPrimary : theme.borderStrong,
        opacity: pressed ? 0.85 : 1,
      }, style]}
    >
      <Text style={[styles.actionText, icon && styles.flex, { color: filled ? theme.actionPrimaryText : theme.textPrimary, fontFamily: theme.fontSansSemiBold, textAlign: quiet ? 'left' : 'center' }]}>{children}</Text>
      {icon ? <Ionicons name={icon} size={18} color={filled ? theme.actionPrimaryText : theme.primary} accessible={false} /> : null}
    </Pressable>
  );
}

export function PricingScreen(): React.ReactElement {
  const navigation = useNavigation<AppNavigationProp>();
  const { theme, isDark } = useTheme();
  const { isAuthenticated, user, verificationSubmitted } = useAuth();
  const { width } = useWindowDimensions();
  const desktop = width >= DESKTOP_BREAKPOINT;
  const tablet = width >= TABLET_BREAKPOINT;
  const inlinePrice = width >= 1280;
  const scrollRef = useRef<ScrollView>(null);
  const detailY = useRef<number | null>(null);
  const revealPending = useRef(false);
  const originPlan = useRef<PricingPlanId>('calma');
  const cardButtons = useRef<Partial<Record<PricingPlanId, View | null>>>({});
  const selectedButton = useRef<View>(null);
  const [selectedId, setSelectedId] = useState<PricingPlanId | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const selectedPlan = PRICING_PLANS.find(plan => plan.id === selectedId);
  const body = { color: theme.textSecondary, fontFamily: theme.fontSans };
  const strong = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };
  const display = { color: theme.textPrimary, fontFamily: theme.fontDisplay };
  const canVisitLanding = navigation.getState().routeNames.includes('Landing');

  useWebPageMetadata({
    title: 'Hera | Planes para especialistas',
    description: 'Conoce el directorio de HERA y compara los planes Calma, Crecimiento y Horizonte para gestionar tu consulta. Contratación de suscripciones próximamente.',
    canonicalPath: '/planes',
    indexable: true,
  });

  const handleAccess = () => {
    if (!isAuthenticated || !user) {
      navigation.navigate('Welcome');
      return;
    }
    const workspace = user.type === 'professional'
      ? (verificationSubmitted === false ? 'ProfessionalVerification' : 'ProfessionalHome')
      : user.type === 'clinic' ? 'ClinicDashboard' : 'Home';
    // The mounted navigator reflects legal acceptance updates; the login snapshot can be stale.
    navigation.navigate(navigation.getState().routeNames.includes('RequiredLegalAcceptance')
      ? 'RequiredLegalAcceptance' : workspace);
  };
  const handleSection = (section: LandingSectionAnchor) => navigation.navigate('Landing', { section });

  const revealDetails = () => {
    if (!revealPending.current || detailY.current === null) return;
    revealPending.current = false;
    // Focus first, then position inside our ScrollView. No motion is required to read details.
    if (Platform.OS === 'web') selectedButton.current?.focus();
    // The content already starts HEADER_OFFSET below the scroll origin.
    scrollRef.current?.scrollTo({ y: Math.max(0, detailY.current), animated: false });
  };
  useEffect(() => {
    if (!selectedId) return;
    const frame = requestAnimationFrame(revealDetails);
    return () => cancelAnimationFrame(frame);
  }, [selectedId]);

  const openDetails = (id: PricingPlanId) => {
    originPlan.current = id;
    revealPending.current = true;
    if (id === selectedId) revealDetails();
    else setSelectedId(id);
  };
  const closeDetails = () => {
    setSelectedId(null);
    detailY.current = null;
    revealPending.current = false;
    if (Platform.OS === 'web') requestAnimationFrame(() => cardButtons.current[originPlan.current]?.focus());
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.landingCanvas }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.landingCanvas} />
      <LandingHeader
        context="pricing" isScrolled
        accessLabel={isAuthenticated ? 'Mi espacio' : 'Acceder'}
        onAccess={handleAccess}
        onLogoPress={canVisitLanding ? () => navigation.navigate('Landing') : handleAccess}
        onFindSpecialist={() => navigation.navigate('PublicSpecialists')}
        onExploreProfessionals={canVisitLanding ? () => handleSection('forSpecialists') : () => navigation.navigate('PublicSpecialists')}
        onScrollToSection={canVisitLanding ? handleSection : undefined}
        onViewPlans={() => scrollRef.current?.scrollTo({ y: 0, animated: false })}
      />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.content, !tablet && styles.contentMobile]}>
          <View style={[styles.hero, desktop && styles.horizontal]}>
            <View style={[styles.heroCopy, desktop && styles.flex]}>
              <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>PARA ESPECIALISTAS</Text>
              <Text accessibilityRole="header" aria-level={1} style={[styles.title, !tablet && styles.titleMobile, display]}>Planes pensados para tu forma de trabajar.</Text>
              <Text style={[styles.intro, body]}>Recibe pacientes desde HERA o reúne toda tu consulta en un mismo espacio.</Text>
              <View style={styles.availability}>
                <Ionicons name="information-circle-outline" color={theme.primary} size={16} accessible={false} />
                <Text style={[styles.caption, body, styles.flex]}>{PRICING_AVAILABILITY}</Text>
              </View>
            </View>
            {desktop ? <Image
              source={Platform.OS === 'web' ? require('../../../assets/landing/psychologist-landscape-640.webp') : require('../../../assets/landing/psychologist-landscape-640.jpg')}
              accessible={false} style={[styles.heroImage, { opacity: isDark ? 0.8 : 1 }]} resizeMode="cover"
            /> : null}
          </View>

          <View style={[styles.directory, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>
            <View style={[styles.directoryColumns, desktop && styles.horizontal]}>
              <View style={[styles.directoryCopy, desktop && styles.directoryCopyDesktop]}>
                <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>01 / DIRECTORIO</Text>
                <Text accessibilityRole="header" aria-level={2} style={[styles.directoryTitle, display]}>Conecta con nuevos pacientes.</Text>
                <Text style={[styles.small, body]}>Recibe y atiende a pacientes que llegan desde HERA.</Text>
                <Text style={[styles.small, strong]}>Sin cuota mensual fija. Comisión por sesión.</Text>
              </View>
              <View style={[styles.commissions, desktop && styles.flex]}>
                <Text style={[styles.small, strong]}>Comisiones por sesión</Text>
                <View style={styles.commissionScale}>{DIRECTORY_OFFER.commissions.map((item, index) => <View key={item.session} style={[styles.commissionStep, index > 0 && styles.commissionDivider, { borderColor: theme.borderLight }]}>
                  <Text style={[styles.rate, strong]}>{item.rate}</Text>
                  <Text style={[styles.caption, body]}>{item.session}</Text>
                </View>)}</View>
                <Text style={[styles.caption, body]}>La escala se cuenta para cada relación entre paciente y especialista.</Text>
              </View>
            </View>
            <View style={[styles.directoryIncludes, tablet && styles.directoryIncludesRow, { backgroundColor: theme.landingProfessional }]}>
              <View style={styles.directoryStorage}>
                <Text style={styles.directoryStorageIcon} accessible={false} aria-hidden>📁</Text>
                <Text style={[styles.small, strong, styles.directoryStorageLabel]}>{DIRECTORY_OFFER.storageLabel} de almacenamiento total</Text>
              </View>
              <Text style={[styles.caption, body, tablet && styles.flex]}>Agenda, historial, documentos, consentimientos, facturación, recordatorios, Google Meet y resumen de actividad.</Text>
            </View>
            <Text style={[styles.directoryScope, styles.caption, body]}>Herramientas para tus pacientes de HERA. La gestión de pacientes propios no está incluida.</Text>
          </View>

          <View style={styles.subscriptionHeading}>
            <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>02 / SUSCRIPCIONES</Text>
            <Text accessibilityRole="header" aria-level={2} style={[styles.sectionTitle, display]}>Tu consulta, con espacio para crecer.</Text>
            <Text style={[styles.body, body]}>Gestiona también tus pacientes propios y amplía las prestaciones de tu consulta.</Text>
          </View>
          <View style={[styles.cards, desktop && styles.horizontal]}>
            {PRICING_PLANS.map(plan => {
              const featured = plan.id === 'crecimiento';
              return <View key={plan.id} style={[styles.card, desktop && styles.flex, {
                backgroundColor: featured ? theme.landingProfessional : theme.surface,
                borderColor: featured ? theme.secondary : theme.borderLight,
              }]}>
                <View style={[styles.cardAccent, { backgroundColor: featured ? theme.actionPrimary : theme.borderStrong }]} />
                <View style={[styles.planHeading, inlinePrice && styles.horizontal]}>
                  <Text accessibilityRole="header" aria-level={3} style={[styles.planName, inlinePrice && styles.planNameInline, display]}>{plan.name}</Text>
                  <View style={[styles.priceRow, inlinePrice && styles.priceInline]}>
                    <Text style={[styles.price, inlinePrice && styles.priceCompact, strong]}>{plan.monthlyPrice} €</Text>
                    <Text style={[styles.caption, body]}>/ mes + IVA</Text>
                  </View>
                </View>
                <Text style={[styles.small, body, styles.cardDescription, desktop && styles.cardDescriptionDesktop]}>{plan.description}</Text>
                <View style={[styles.capacity, { borderColor: theme.borderStrong }]}>
                  <View style={styles.capacityMetrics}>
                    <View style={styles.patientMetric} accessible accessibilityLabel={`${plan.ownPatients} pacientes propios activos`}>
                      <View style={styles.metricHeading}><Text style={styles.metricEmoji} accessible={false} aria-hidden>👥</Text><Text style={[styles.metricValue, strong]}>{plan.ownPatients}</Text></View>
                      <Text style={[styles.caption, body]}>pacientes propios activos</Text>
                    </View>
                    <View style={[styles.flex, styles.storageMetric, { borderColor: theme.borderStrong }]} accessible accessibilityLabel={`${plan.storageLabel} de almacenamiento`}>
                      <View style={styles.metricHeading}><Text style={styles.metricEmoji} accessible={false} aria-hidden>📁</Text><Text style={[styles.metricValue, strong]}>{plan.storageLabel}</Text></View>
                      <Text style={[styles.caption, body]}>de almacenamiento</Text>
                    </View>
                  </View>
                  <Text style={[styles.caption, body]}>Los pacientes de HERA no consumen tu cupo.</Text>
                </View>
                <View style={[styles.cardFeatures, desktop && styles.flex]}>
                  {[
                    SUBSCRIPTION_ESSENTIALS[4],
                    SUBSCRIPTION_ESSENTIALS[3],
                    `Supervisión de casos: ${plan.supervision.toLowerCase()}`,
                    `Publicaciones en redes de HERA: ${plan.publications.toLowerCase()}`,
                    `Perfil en el directorio ${plan.directoryProfile.toLowerCase()}`,
                    `Plantillas clínicas: ${plan.templates.toLowerCase()}`,
                  ].map(text => <View style={styles.checkRow} key={text}><Ionicons name="checkmark" size={17} color={theme.primary} accessible={false} /><Text style={[styles.small, body, styles.flex]}>{text}</Text></View>)}
                </View>
                <PricingAction label={`Ver detalles de ${plan.name}`} expanded={selectedId === plan.id} onPress={() => openDetails(plan.id)} filled={featured} icon="arrow-forward"
                  focusRef={node => { cardButtons.current[plan.id] = node; }}>
                  Ver detalles
                </PricingAction>
              </View>;
            })}
          </View>

          {selectedPlan ? <View nativeID="pricing-plan-details" testID="pricing-plan-details"
            onLayout={event => { detailY.current = event.nativeEvent.layout.y; revealDetails(); }}
            style={[styles.details, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
            <View style={[styles.detailHeader, { backgroundColor: theme.landingProfessional }]}>
              <View style={[styles.detailToolbar, tablet && styles.horizontal]}>
                <View style={[styles.planSelector, { backgroundColor: theme.surface }]}>
                  {PRICING_PLANS.map(plan => <PricingAction key={plan.id} label={`Consultar ${plan.name}`} selected={plan.id === selectedId}
                    focusRef={plan.id === selectedId ? selectedButton : undefined}
                    style={styles.selectorAction} quiet
                    onPress={() => setSelectedId(plan.id)}>{plan.name}</PricingAction>)}
                </View>
                <PricingAction label="Cerrar detalles del plan" onPress={closeDetails} quiet icon="close-outline" style={styles.closeAction}>Cerrar</PricingAction>
              </View>
              <View style={[styles.detailHeading, tablet && styles.horizontal]}>
                <View style={tablet && styles.flex}>
                  <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>ESTO ES LO QUE INCLUYE</Text>
                  <Text accessibilityRole="header" aria-level={3} accessibilityLabel={`${selectedPlan.name} · ${selectedPlan.monthlyPrice} €/mes + IVA`} style={[styles.detailPlanName, display]}>{selectedPlan.name}</Text>
                  <Text style={[styles.body, body]}>{selectedPlan.description}</Text>
                </View>
                <View style={styles.detailPrice}>
                  <Text style={[styles.price, strong]}>{selectedPlan.monthlyPrice} €</Text>
                  <Text style={[styles.small, body]}>al mes + IVA · contratación próximamente</Text>
                </View>
              </View>
            </View>
            <View style={styles.detailBody}>
              <View style={[styles.detailMetrics, tablet && styles.horizontal, { borderColor: theme.borderLight }]}>
                {([
                  { value: selectedPlan.ownPatients, label: 'Pacientes propios activos', emoji: '👥', icon: 'people-outline' },
                  { value: `${selectedPlan.storageLabel} por especialista`, label: 'Espacio total para tus archivos', emoji: '📁', icon: 'cloud-outline' },
                  { value: 'Pacientes de HERA incluidos', label: 'No consumen el cupo de propios', emoji: null, icon: 'person-add-outline' },
                ] as const).map(metric => <View key={metric.label} style={[styles.detailMetric, tablet && styles.flex]}>
                  {metric.emoji ? <Text style={styles.metricEmoji} accessible={false} aria-hidden>{metric.emoji}</Text> : <Ionicons name={metric.icon} size={20} color={theme.primary} accessible={false} />}
                  <View style={styles.flex}><Text style={[styles.body, strong]}>{metric.value}</Text><Text style={[styles.caption, body]}>{metric.label}</Text></View>
                </View>)}
              </View>
              <View style={[styles.detailGroups, desktop && styles.horizontal]}>
                <View style={[styles.detailGroup, desktop && styles.flex]}>
                  <View style={styles.groupTitle}><Ionicons name="calendar-outline" size={22} color={theme.primary} accessible={false} /><Text accessibilityRole="header" aria-level={4} style={[styles.groupName, strong]}>Tu día a día, organizado</Text></View>
                  <Text style={[styles.small, body]}>Herramientas para pacientes propios y de HERA.</Text>
                  <View style={styles.detailTools}>{SUBSCRIPTION_ESSENTIALS.map(item => <View key={item} style={styles.checkRow}><Ionicons name="checkmark" size={16} color={theme.primary} accessible={false} /><Text style={[styles.small, body, styles.flex]}>{item}</Text></View>)}</View>
                  <View style={[styles.detailValue, { borderColor: theme.borderLight }]}>
                    <Text style={[styles.caption, body]}>Estadísticas</Text><Text style={[styles.body, strong]}>{selectedPlan.statistics}</Text>
                    <Text style={[styles.caption, body]}>Para consultar la actividad de tu consulta.</Text>
                  </View>
                </View>
                <View style={[styles.detailGroup, desktop && styles.flex]}>
                  <View style={styles.groupTitle}><Ionicons name="book-outline" size={22} color={theme.primary} accessible={false} /><Text accessibilityRole="header" aria-level={4} style={[styles.groupName, strong]}>Recursos y acompañamiento</Text></View>
                  {[
                    ['Supervisión de casos', selectedPlan.supervision],
                    ['Plantillas clínicas', selectedPlan.templates],
                    ['Consentimientos y documentos', selectedPlan.documents],
                    ['Soporte', selectedPlan.support],
                  ].map(([label, value]) => <View key={label} style={[styles.detailValue, { borderColor: theme.borderLight }]}><Text style={[styles.caption, body]}>{label}</Text><Text style={[styles.body, strong]}>{value}</Text></View>)}
                  <Text style={[styles.caption, body]}>La supervisión la presta otro especialista para acompañarte en tus casos.</Text>
                  <Text style={[styles.caption, body]}>Las plantillas son recursos para apoyar tu trabajo terapéutico.</Text>
                </View>
                <View style={[styles.detailGroup, desktop && styles.flex]}>
                  <View style={styles.groupTitle}><Ionicons name="megaphone-outline" size={22} color={theme.primary} accessible={false} /><Text accessibilityRole="header" aria-level={4} style={[styles.groupName, strong]}>Tu presencia en HERA</Text></View>
                  {[
                    ['Perfil en directorio', selectedPlan.directoryProfile],
                    ['Publicaciones en redes de HERA', selectedPlan.publications],
                  ].map(([label, value]) => <View key={label} style={[styles.detailValue, { borderColor: theme.borderLight }]}><Text style={[styles.caption, body]}>{label}</Text><Text style={[styles.body, strong]}>{value}</Text></View>)}
                  <Text style={[styles.caption, body]}>{selectedPlan.id === 'horizonte' ? 'Tu perfil se presenta como destacado en el directorio de especialistas de HERA.' : 'Tu perfil forma parte del directorio de especialistas de HERA.'}</Text>
                  <Text style={[styles.caption, body]}>El equipo de HERA prepara y publica este contenido en sus redes sociales.</Text>
                </View>
              </View>
              <View style={[styles.detailNote, { backgroundColor: theme.surfaceMuted }]}><Ionicons name="shield-checkmark-outline" size={19} color={theme.primary} accessible={false} /><Text style={[styles.caption, body, styles.flex]}>Los consentimientos necesarios para atender a tus pacientes están incluidos en todas las modalidades. Consultar este detalle no activa el plan.</Text></View>
            </View>
          </View> : null}

          <View style={[styles.essentials, { backgroundColor: theme.landingProfessional }]}>
            <View style={styles.essentialsHeading}>
              <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>INCLUIDO EN LOS TRES PLANES</Text>
              <Text accessibilityRole="header" aria-level={2} style={[styles.sectionTitle, display]}>Todo lo esencial. En un mismo espacio.</Text>
            </View>
            <View style={[styles.essentialGroups, tablet && styles.horizontal]}>{SUBSCRIPTION_TOOL_GROUPS.map(group => <View key={group.title} style={[styles.essentialGroup, tablet && styles.flex]}>
              <View style={[styles.toolIcon, { backgroundColor: theme.surface }]}><Ionicons name={group.icon} size={23} color={theme.primary} accessible={false} /></View>
              <View style={styles.flex}>
                <Text style={[styles.groupName, strong]}>{group.title}</Text>
                {group.items.map(item => <Text key={item} style={[styles.small, body]}>{item}</Text>)}
              </View>
            </View>)}</View>
            <Text style={[styles.caption, body, styles.essentialNote, { borderColor: theme.borderStrong }]}>Consentimientos necesarios incluidos. Perfil en el directorio sujeto a verificación profesional y aceptación de sus condiciones.</Text>
          </View>
          <View style={[styles.conditions, tablet && styles.horizontal]}>
            <View style={[styles.condition, tablet && styles.flex]}><Ionicons name="swap-horizontal-outline" size={20} color={theme.primary} accessible={false} /><View style={styles.flex}><Text style={[styles.small, strong]}>Si combinas directorio y suscripción</Text><Text style={[styles.small, body]}>{PRICING_COMMISSION_NOTE}</Text></View></View>
            <View style={[styles.condition, tablet && styles.flex]}><Ionicons name="cloud-outline" size={20} color={theme.primary} accessible={false} /><View style={styles.flex}><Text style={[styles.small, strong]}>Un único espacio para tus archivos</Text><Text style={[styles.small, body]}>{PRICING_STORAGE_NOTE}</Text></View></View>
          </View>

          <View style={[styles.faq, desktop && styles.horizontal]}>
            <View style={[styles.faqHeading, desktop && styles.faqHeadingDesktop]}>
              <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>CON LAS COSAS CLARAS</Text>
              <Text accessibilityRole="header" aria-level={2} style={[styles.sectionTitle, display]}>Antes de elegir.</Text>
              <Text style={[styles.body, body]}>Resolvemos las dudas sobre cómo encajan las dos modalidades.</Text>
            </View>
            <View style={[styles.faqList, desktop && styles.flex, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}>{PRICING_FAQS.map((item, index) => <View key={item.question} style={[styles.faqItem, index < PRICING_FAQS.length - 1 && styles.faqDivider, { borderColor: theme.borderLight, backgroundColor: openFaq === index ? theme.landingProfessional : undefined }]}>
              <PricingAction quiet label={item.question} expanded={openFaq === index} icon={openFaq === index ? 'remove-outline' : 'add-outline'} onPress={() => setOpenFaq(current => current === index ? null : index)} style={styles.faqAction}>
                {item.question}
              </PricingAction>
              {openFaq === index ? <Text style={[styles.body, body, styles.faqAnswer]}>{item.answer}</Text> : null}
            </View>)}</View>
          </View>
        </View>
        <FooterSection
          onFindSpecialist={() => navigation.navigate('PublicSpecialists')}
          professionalActionLabel={canVisitLanding ? 'Conocer las herramientas' : 'Mi espacio'}
          onProfessionalAction={canVisitLanding ? () => navigation.navigate('ProfessionalShowcase') : handleAccess}
          onProfessionalLogin={handleAccess}
          onScrollToSection={canVisitLanding ? handleSection : undefined}
          onViewPlans={() => scrollRef.current?.scrollTo({ y: 0, animated: false })}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingTop: HEADER_OFFSET },
  content: { width: '100%', maxWidth: 1280, alignSelf: 'center', paddingHorizontal: 32 },
  contentMobile: { paddingHorizontal: 20 },
  horizontal: { flexDirection: 'row' },
  flex: { flex: 1, minWidth: 0 },
  hero: { gap: 28, alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
  heroCopy: { width: '100%', gap: 7 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, lineHeight: 16 },
  title: { fontSize: 36, lineHeight: 44, maxWidth: 1000 },
  titleMobile: { fontSize: 30, lineHeight: 37 },
  intro: { fontSize: 14, lineHeight: 22 },
  heroImage: { width: 148, height: 108, borderRadius: 16, borderTopRightRadius: 42, borderBottomLeftRadius: 42 },
  availability: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingTop: 2 },
  small: { fontSize: 13, lineHeight: 21 },
  caption: { fontSize: 12, lineHeight: 19 },
  body: { fontSize: 15, lineHeight: 24 },
  sectionTitle: { fontSize: 27, lineHeight: 34 },
  directory: { padding: 18, borderWidth: 1, borderRadius: 14 },
  directoryTitle: { fontSize: 24, lineHeight: 30 },
  directoryColumns: { gap: 20 },
  directoryCopy: { gap: 5 },
  directoryCopyDesktop: { flex: 1.1 },
  commissions: { gap: 5, minWidth: 0 },
  commissionScale: { flexDirection: 'row', paddingVertical: 2 },
  commissionStep: { flex: 1, minWidth: 0, paddingHorizontal: 10, gap: 3 },
  commissionDivider: { borderLeftWidth: 1 },
  rate: { fontSize: 25, lineHeight: 32 },
  directoryIncludes: { gap: 14, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, marginTop: 12, alignItems: 'flex-start' },
  directoryIncludesRow: { flexDirection: 'row', alignItems: 'center' },
  directoryStorage: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' },
  directoryStorageIcon: { fontSize: 16, lineHeight: 21, flexShrink: 0 },
  directoryStorageLabel: { flexShrink: 1 },
  directoryScope: { marginTop: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  subscriptionHeading: { paddingTop: 26, paddingBottom: 16, gap: 5 },
  cards: { gap: 18 },
  card: { padding: 22, borderWidth: 1, borderRadius: 14, overflow: 'hidden', gap: 6 },
  cardAccent: { height: 4, position: 'absolute', top: 0, left: 0, right: 0 },
  planName: { fontSize: 29, lineHeight: 35 },
  planNameInline: { fontSize: 26, lineHeight: 34 },
  planHeading: { justifyContent: 'space-between', gap: 6 },
  cardDescription: { marginBottom: 8 },
  cardDescriptionDesktop: { minHeight: 42 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8, paddingTop: 8, paddingBottom: 12 },
  priceInline: { flexDirection: 'column', alignItems: 'flex-end', paddingTop: 0, paddingBottom: 0, flexWrap: 'nowrap' },
  priceCompact: { fontSize: 28, lineHeight: 34 },
  price: { fontSize: 32, lineHeight: 40 },
  capacity: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 14, gap: 10 },
  capacityMetrics: { flexDirection: 'row', gap: 12 },
  patientMetric: { flex: 1.15, minWidth: 0 },
  metricHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 4 },
  metricEmoji: { fontSize: 16, lineHeight: 26, flexShrink: 0 },
  metricValue: { fontSize: 21, lineHeight: 29, flexShrink: 1 },
  storageMetric: { borderLeftWidth: 1, paddingLeft: 16 },
  cardFeatures: { gap: 8, paddingVertical: 10 },
  action: { borderWidth: 2, borderRadius: 9, paddingVertical: 10, paddingHorizontal: 14, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionText: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  details: { marginTop: 22, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  detailHeader: { padding: 22, gap: 20 },
  detailToolbar: { gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' },
  planSelector: { flexDirection: 'row', padding: 4, borderRadius: 12, maxWidth: '100%', flexShrink: 1 },
  selectorAction: { paddingHorizontal: 10, flexShrink: 1 },
  closeAction: { backgroundColor: 'transparent', paddingHorizontal: 8 },
  detailHeading: { gap: 16, alignItems: 'flex-start' },
  detailPlanName: { fontSize: 36, lineHeight: 45 },
  detailPrice: { gap: 2 },
  detailBody: { padding: 22 },
  detailMetrics: { gap: 18, paddingBottom: 22, borderBottomWidth: 1 },
  detailMetric: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  detailGroups: { gap: 28, paddingVertical: 24 },
  detailGroup: { gap: 8 },
  groupTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
  groupName: { fontSize: 15, lineHeight: 23, flexShrink: 1 },
  detailTools: { gap: 8, paddingVertical: 6 },
  detailValue: { borderBottomWidth: 1, paddingBottom: 10, gap: 2 },
  detailNote: { flexDirection: 'row', gap: 10, padding: 13, borderRadius: 9 },
  essentials: { marginTop: 26, borderRadius: 16, padding: 24, gap: 22 },
  essentialsHeading: { gap: 6 },
  essentialGroups: { gap: 24 },
  essentialGroup: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  toolIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  essentialNote: { paddingTop: 14, borderTopWidth: 1 },
  conditions: { paddingTop: 20, gap: 28 },
  condition: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  faq: { paddingTop: 32, paddingBottom: 38, gap: 32 },
  faqHeading: { gap: 10 },
  faqHeadingDesktop: { flex: 0.46 },
  faqList: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  faqItem: { padding: 4 },
  faqDivider: { borderBottomWidth: 1 },
  faqAction: { backgroundColor: 'transparent', minHeight: 54 },
  faqAnswer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2 },
});
