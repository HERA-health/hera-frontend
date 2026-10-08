import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  Image,
  Linking,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import type { Theme } from "../../constants/theme";
import { Button } from "../../components/common/Button";
import {
  AnimatedPressable,
  type AnimatedPressableHandle,
} from "../../components/common/AnimatedPressable";
import { PaymentsList } from "../../components/payments/PaymentsList";
import ConnectAccount, {
  type ConnectView,
} from "../../components/payments/ConnectAccount";
import { getErrorMessage } from "../../constants/errors";
import {
  getPaymentAccount,
  setPaymentPreference,
  startPaymentAccount,
  syncPaymentAccount,
  type PaymentAccount,
} from "../../services/sessionPaymentService";

function focusTarget(target: View | AnimatedPressableHandle | null) {
  if (!target) return;
  if (Platform.OS === "web") {
    if ("focus" in target && typeof target.focus === "function") target.focus();
  } else {
    const handle = findNodeHandle(target);
    if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
  }
}

export function ProfessionalPaymentsScreen() {
  const { theme, isDark } = useTheme();
  const s = makeStyles(theme);
  const [account, setAccount] = useState<PaymentAccount>();
  const [accepted, setAccepted] = useState(false);
  const [details, setDetails] = useState<"terms" | "fees">();
  const detailsHeading = useRef<View>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<ConnectView>();
  const [section, setSection] = useState<"settings" | "payments">("settings");
  const [width, setWidth] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const heading = useRef<View>(null);
  const setupAction = useRef<AnimatedPressableHandle>(null);
  const balanceAction = useRef<AnimatedPressableHandle>(null);
  const returnAction = useRef<"setup" | "balance">("setup");
  const changingView = useRef(false);
  const inFlight = useRef(false);
  const alive = useRef(true);
  const wide = width >= 1100;

  const run = async (
    action: () => Promise<PaymentAccount>,
  ): Promise<boolean> => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await action();
      if (alive.current) setAccount(result);
      return alive.current;
    } catch (e) {
      if (alive.current)
        setError(
          getErrorMessage(
            e,
            "No se pudo actualizar tu cuenta. Inténtalo de nuevo.",
          ),
        );
      return false;
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  };
  useEffect(() => {
    alive.current = true;
    void run(getPaymentAccount);
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!changingView.current || busy) return;
    changingView.current = false;
    const frame = requestAnimationFrame(() => {
      scroll.current?.scrollTo({ y: 0, animated: false });
      focusTarget(
        view
          ? heading.current
          : ((returnAction.current === "balance"
              ? balanceAction.current
              : setupAction.current) ?? heading.current),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [view, busy]);

  const open = (next: ConnectView) => {
    returnAction.current = next === "balance" ? "balance" : "setup";
    changingView.current = true;
    setView(next);
  };
  const close = () => {
    changingView.current = true;
    setView(undefined);
    void run(syncPaymentAccount);
  };
  const pending = account?.status === "ONBOARDING";
  const requiredChecks = [
    ...new Set(
      (account?.requirements ?? []).map((field) => {
        if (
          /^(individual\.|person_|representative\.|owners\.|directors\.|executives\.)/.test(
            field,
          )
        )
          return "Datos personales y verificación de identidad";
        if (field.startsWith("external_account")) return "Cuenta bancaria";
        if (field.startsWith("business_profile.url"))
          return "Web o perfil público profesional";
        if (/^(company\.|business_profile\.)/.test(field))
          return "Datos de la actividad profesional";
        if (field.startsWith("tos_acceptance"))
          return "Aceptación de las condiciones de Stripe";
        return "Información adicional solicitada por Stripe";
      }),
    ),
  ];
  const status = !account
    ? "Cargando cuenta"
    : account.status === "ATTENTION"
      ? "Cuenta pendiente de revisión"
      : pending
        ? "Verificación pendiente"
        : account.status === "REVIEW"
          ? "Stripe está revisando tus datos"
          : account.enabled
            ? "Cobros online activados"
            : "Cobros online desactivados";
  const preferenceDisabled =
    busy ||
    !account ||
    (!account.enabled &&
      (!account.hasAccount ||
        !account.available ||
        pending ||
        account.status === "REVIEW" ||
        account.status === "ATTENTION"));
  const title =
    view === "balance"
      ? "Saldo y transferencias"
      : view === "management"
        ? "Gestionar cuenta"
        : "Configurar cobros";

  return (
    <View
      style={s.root}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={scroll}
        contentContainerStyle={[s.content, width < 600 && s.mobileContent]}
      >
        <View style={s.page}>
          {view ? (
            <>
              <Button
                accessibilityLabel="Volver a Cobros"
                variant="ghost"
                size="small"
                style={s.button}
                icon={
                  <Feather name="arrow-left" size={17} color={theme.primary} />
                }
                onPress={close}
              >
                Volver a Cobros
              </Button>
              <View
                style={[
                  s.columns,
                  wide ? s.wideColumns : s.mobileConnectHeader,
                ]}
              >
                <View style={[s.stripeIdentity, s.form]}>
                  <Image
                    source={
                      isDark
                        ? require("../../../assets/stripe/wordmark-white.png")
                        : require("../../../assets/stripe/wordmark-blurple.png")
                    }
                    accessibilityLabel="Stripe"
                    resizeMode="contain"
                    style={s.stripeLogo}
                  />
                  <Text style={s.caption}>
                    {view === "balance"
                      ? "Tu cuenta Stripe"
                      : "Formulario gestionado por Stripe"}
                  </Text>
                </View>
                <View
                  ref={heading}
                  accessible
                  accessibilityRole="header"
                  tabIndex={-1}
                  style={[s.heading, wide && s.sideHelp]}
                >
                  <Text style={s.title}>{title}</Text>
                  {view === "balance" && (
                    <Text style={s.body}>
                      Consulta el dinero disponible y los envíos a tu banco.
                    </Text>
                  )}
                </View>
              </View>
              <View style={[s.columns, wide && s.wideColumns]}>
                <View style={s.form}>
                  <ConnectAccount view={view} onExit={close} />
                </View>
                <View style={[s.help, wide && s.sideHelp]}>
                  <Feather
                    name={view === "balance" ? "credit-card" : "shield"}
                    size={22}
                    color={theme.primary}
                  />
                  <Text style={s.sectionTitle}>
                    {view === "balance"
                      ? "Tu cuenta Stripe"
                      : "Antes de empezar"}
                  </Text>
                  <Text style={s.body}>
                    {view === "balance"
                      ? "Aquí se muestra toda tu cuenta Stripe, no solo los pagos de HERA. Una transferencia al banco puede agrupar varias sesiones."
                      : "Ten a mano tus datos personales, los de tu actividad profesional y la cuenta bancaria donde quieres recibir el dinero."}
                  </Text>
                  {view !== "balance" && (
                    <>
                      <View style={s.terms}>
                        <Text style={s.link}>
                          ¿Qué pongo en «Tu sitio web»?
                        </Text>
                        <Text style={s.caption}>
                          En HERA, ve a «Editar perfil» → «Enlace público»
                          («Enlace» en móvil) → «Copiar enlace». Pégalo en
                          «Tu sitio web» de Stripe.
                        </Text>
                        <Text style={s.caption}>
                          Tu perfil debe estar publicado y mostrar tus servicios
                          sin iniciar sesión. No necesitas una web propia.
                        </Text>
                      </View>
                      <Text style={s.body}>
                        Stripe puede solicitar documentos para verificar tu
                        identidad o tu actividad.
                      </Text>
                      <Text style={s.caption}>
                        Al terminar, vuelve a Cobros para actualizar el estado.
                        Completar el formulario no activa los cobros
                        automáticamente.
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </>
          ) : (
            <>
              <View ref={heading} tabIndex={-1} style={s.headerRow}>
                <View style={s.tabs} accessibilityRole="tablist">
                  {(
                    [
                      { key: "settings", label: "Configuración" },
                      { key: "payments", label: "Pagos de sesiones" },
                    ] as const
                  ).map((tab) => (
                    <AnimatedPressable
                      key={tab.key}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: section === tab.key }}
                      onPress={() => setSection(tab.key)}
                      hoverLift={false}
                      pressScale={1}
                      style={[s.tab, section === tab.key && s.selectedTab]}
                    >
                      <Text
                        style={[
                          s.tabText,
                          section === tab.key && s.selectedTabText,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
                {account && (
                  <View style={s.status}>
                    <View
                      style={[
                        s.dot,
                        {
                          backgroundColor:
                            account.status === "ATTENTION"
                              ? theme.error
                              : account.enabled
                                ? theme.success
                                : theme.warning,
                        },
                      ]}
                    />
                    <Text style={s.statusText}>{status}</Text>
                  </View>
                )}
              </View>
              {!!error && (
                <View style={s.error}>
                  <Text accessibilityRole="alert" style={s.errorText}>
                    {error}
                  </Text>
                  <Button
                    variant="ghost"
                    size="small"
                    style={s.button}
                    disabled={busy}
                    onPress={() => void run(getPaymentAccount)}
                  >
                    Volver a consultar
                  </Button>
                </View>
              )}
              {!account && busy && (
                <ActivityIndicator
                  accessibilityLabel="Cargando cuenta de cobros"
                  color={theme.primary}
                />
              )}
              {account && section === "settings" && (
                <View style={s.settings}>
                  <View style={s.heading}>
                    <Text accessibilityRole="header" style={s.title}>
                      Elige cómo cobrar
                    </Text>
                    <Text style={s.body}>
                      Tu agenda, tu forma de trabajar. El cobro online es
                      opcional.
                    </Text>
                  </View>
                  <View
                    style={[s.settingsColumns, width >= 900 && s.wideColumns]}
                  >
                    <View
                      style={[
                        s.preference,
                        width < 600 && s.compactPreference,
                        width >= 900 && s.preferenceWide,
                      ]}
                    >
                      <View style={s.preferenceHeader}>
                        <View style={s.preferenceCopy}>
                          <Text style={s.sectionTitle}>Cobros online</Text>
                          <Text style={s.caption}>
                            Para tus sesiones y bonos
                          </Text>
                        </View>
                        <View style={s.switchControl}>
                          {busy && (
                            <ActivityIndicator
                              size="small"
                              color={theme.primary}
                              accessibilityLabel="Actualizando configuración"
                            />
                          )}
                          <Text style={s.switchLabel}>
                            {account.enabled ? "Activados" : "Desactivados"}
                          </Text>
                          <AnimatedPressable
                            accessibilityRole="switch"
                            accessibilityLabel="Cobros online"
                            disabled={preferenceDisabled}
                            accessibilityState={{
                              disabled: preferenceDisabled,
                              checked: account.enabled,
                            }}
                            onPress={() =>
                              void run(() =>
                                setPaymentPreference(!account.enabled),
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key !== " " && event.key !== "Enter") return;
                              event.preventDefault();
                              if (!preferenceDisabled && !event.repeat) {
                                void run(() => setPaymentPreference(!account.enabled));
                              }
                            }}
                            hoverLift={false}
                            pressScale={1}
                            style={[
                              s.switchTarget,
                              preferenceDisabled && s.switchDisabled,
                            ]}
                          >
                            <View
                              style={[
                                s.switchTrack,
                                {
                                  backgroundColor: account.enabled
                                    ? theme.actionPrimary
                                    : theme.borderStrong,
                                  alignItems: account.enabled
                                    ? "flex-end"
                                    : "flex-start",
                                },
                              ]}
                            >
                              <View style={s.switchThumb} />
                            </View>
                          </AnimatedPressable>
                        </View>
                      </View>
                      <View style={s.modeSummary}>
                        {width >= 600 && (
                          <View style={s.modeIcon}>
                            <Feather
                              name={account.enabled ? "credit-card" : "users"}
                              size={24}
                              color={theme.primary}
                            />
                          </View>
                        )}
                        <View style={s.preferenceCopy}>
                          <Text style={s.modeTitle}>
                            {account.enabled
                              ? "El pago, dentro de HERA"
                              : "El pago, por tu cuenta"}
                          </Text>
                          <Text style={s.body}>
                            {account.enabled
                              ? "Tus pacientes pagan sus sesiones y bonos a través de Stripe. Tú gestionas los cobros desde aquí."
                              : "Sigues recibiendo reservas y generando facturas. Acuerda y gestiona el pago directamente con tus pacientes."}
                          </Text>
                        </View>
                      </View>
                      <View style={s.choiceNote}>
                        <Feather
                          name="repeat"
                          size={18}
                          color={theme.textSecondary}
                        />
                        <Text style={[s.caption, s.shrink]}>
                          Al desactivar, tu agenda y facturación siguen
                          funcionando; gestionas los pagos por fuera. Los pagos
                          y las reservas ya iniciados se mantienen.
                        </Text>
                      </View>
                      {!account.enabled && (
                        <Text style={s.caption}>
                          {!account.hasAccount
                            ? "Para elegir el cobro online, configura primero tu cuenta Stripe."
                            : pending ||
                                account.status === "REVIEW" ||
                                account.status === "ATTENTION"
                              ? "Podrás activarlo cuando Stripe habilite tu cuenta y tengas completos tus datos fiscales en Facturación."
                              : "Actívalo con el interruptor cuando quieras. Necesitas tus datos fiscales completos en Facturación."}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        s.accountPanel,
                        width >= 900 && s.accountPanelWide,
                      ]}
                    >
                      <View style={s.accountHeader}>
                        <Text style={s.accountTitle}>
                          {account.hasAccount
                            ? "Tu cuenta de cobros"
                            : "Empieza con Stripe"}
                        </Text>
                        <Image
                          source={
                            isDark
                              ? require("../../../assets/stripe/wordmark-white.png")
                              : require("../../../assets/stripe/wordmark-blurple.png")
                          }
                          accessibilityLabel="Stripe"
                          resizeMode="contain"
                          style={s.stripeLogo}
                        />
                      </View>
                      <Text style={s.caption}>
                        {account.hasAccount
                          ? "Colaboramos con Stripe, un proveedor externo que procesa los pagos. Tu cuenta está vinculada: gestiona tus datos y el banco donde recibes el dinero."
                          : "Colaboramos con Stripe, un proveedor externo que procesa los pagos y envía el dinero a tu banco. Completa tus datos en su formulario seguro."}
                      </Text>
                      {!account.available && (
                        <Text style={s.notice}>
                          Por ahora no puedes activar nuevos cobros. Puedes
                          gestionar las operaciones existentes.
                        </Text>
                      )}
                      {account.status === "ATTENTION" ? (
                        <Text accessibilityRole="alert" style={s.errorText}>
                          Revisa tu cuenta Stripe para poder recibir nuevos
                          pagos.
                        </Text>
                      ) : pending ? (
                        <View style={s.noticeBox}>
                          <Text style={s.body}>
                            Stripe necesita que revises información para
                            habilitar los cobros:
                          </Text>
                          {requiredChecks.map((label) => (
                            <Text key={label} style={s.caption}>
                              • {label}
                            </Text>
                          ))}
                          <Text style={s.caption}>
                            Completa los pasos pendientes en Stripe y después
                            actualiza el estado. Omitir un paso puede mantener
                            los cobros deshabilitados.
                          </Text>
                        </View>
                      ) : account.status === "REVIEW" ? (
                        <Text style={s.notice}>
                          Stripe está revisando tus datos. Puedes volver más
                          tarde y actualizar el estado.
                        </Text>
                      ) : account.requirements.length > 0 ? (
                        <Text style={s.notice}>
                          Stripe solicita información adicional. Revísala en
                          Gestionar mi cuenta Stripe.
                        </Text>
                      ) : null}
                      {!account.hasAccount && account.available && (
                        <>
                          <AnimatedPressable
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: accepted }}
                            accessibilityLabel="Acepto las condiciones de cobro y cancelación"
                            onPress={() => setAccepted(!accepted)}
                            hoverLift={false}
                            pressScale={1}
                            style={s.checkboxAction}
                          >
                            <View
                              style={[
                                s.checkbox,
                                accepted && {
                                  backgroundColor: theme.actionPrimary,
                                  borderColor: theme.actionPrimary,
                                },
                              ]}
                            >
                              {accepted && (
                                <Feather
                                  name="check"
                                  size={15}
                                  color={theme.actionPrimaryText}
                                />
                              )}
                            </View>
                            <Text style={s.body}>
                              Acepto las condiciones de cobro y cancelación.
                            </Text>
                          </AnimatedPressable>
                          <Button
                            focusRef={setupAction}
                            accessibilityLabel="Configurar cobros"
                            style={s.button}
                            loading={busy}
                            disabled={!accepted || busy}
                            icon={
                              <Feather
                                name="arrow-right"
                                size={17}
                                color={theme.actionPrimaryText}
                              />
                            }
                            iconPosition="right"
                            onPress={() =>
                              void (async () => {
                                if (
                                  await run(() =>
                                    startPaymentAccount(account.termsVersion),
                                  )
                                )
                                  open("onboarding");
                              })()
                            }
                          >
                            Configurar cobros
                          </Button>
                        </>
                      )}
                      {account.hasAccount && (
                        <View style={s.accountActions}>
                          <Button
                            focusRef={setupAction}
                            style={s.accountButton}
                            disabled={busy}
                            icon={
                              <Feather
                                name="arrow-up-right"
                                size={17}
                                color={theme.actionPrimaryText}
                              />
                            }
                            iconPosition="right"
                            onPress={() =>
                              open(pending ? "onboarding" : "management")
                            }
                          >
                            {pending
                              ? "Completar datos en Stripe"
                              : "Gestionar mi cuenta Stripe"}
                          </Button>
                          <Button
                            style={s.accountButton}
                            variant="secondary"
                            disabled={busy}
                            icon={
                              <Feather
                                name="refresh-cw"
                                size={15}
                                color={theme.textPrimary}
                              />
                            }
                            onPress={() => void run(syncPaymentAccount)}
                          >
                            Actualizar estado
                          </Button>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={s.detailsFooter}>
                    <View style={s.feeSummary}>
                      <Feather
                        name="info"
                        size={18}
                        color={theme.textSecondary}
                      />
                      <Text style={[s.caption, s.shrink]}>
                        Stripe descuenta su comisión de cada pago online. Tu
                        paciente paga el precio indicado, sin recargos.
                      </Text>
                    </View>
                    <View style={s.actions}>
                      <Button
                        size="small"
                        variant="outline"
                        style={s.detailButton}
                        onPress={() => setDetails("fees")}
                      >
                        Comisiones
                      </Button>
                      <Button
                        size="small"
                        variant="outline"
                        style={s.detailButton}
                        onPress={() => setDetails("terms")}
                      >
                        Condiciones y cancelaciones
                      </Button>
                    </View>
                  </View>
                </View>
              )}
              {section === "payments" && (
                <View>
                  <PaymentsList
                    action={
                      account?.hasAccount ? (
                        <Button
                          focusRef={balanceAction}
                          accessibilityLabel="Saldo y transferencias"
                          style={s.button}
                          size="small"
                          variant="outline"
                          icon={
                            <Feather
                              name="external-link"
                              size={16}
                              color={theme.primary}
                            />
                          }
                          onPress={() => open("balance")}
                        >
                          Saldo y transferencias
                        </Button>
                      ) : undefined
                    }
                  />
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
      <Modal
        visible={details !== undefined}
        transparent
        animationType="none"
        onRequestClose={() => setDetails(undefined)}
        onShow={() => focusTarget(detailsHeading.current)}
      >
        <View style={s.overlay}>
          <Pressable
            accessible={false}
            style={StyleSheet.absoluteFill}
            onPress={() => setDetails(undefined)}
          />
          <View accessibilityViewIsModal style={s.detailsCard}>
            <View style={s.preferenceHeader}>
              <View
                ref={detailsHeading}
                accessible
                accessibilityRole="header"
                tabIndex={-1}
                style={s.preferenceCopy}
              >
                <Text style={s.sectionTitle}>
                  {details === "fees"
                    ? "Comisiones de Stripe"
                    : "Condiciones y cancelaciones"}
                </Text>
              </View>
              <Button
                accessibilityLabel="Cerrar información"
                size="small"
                variant="secondary"
                style={s.closeButton}
                onPress={() => setDetails(undefined)}
                icon={<Feather name="x" size={20} color={theme.textPrimary} />}
              >
                {""}
              </Button>
            </View>
            <ScrollView contentContainerStyle={s.modalContent}>
              {details === "terms" ? (
                <View style={s.terms}>
                  <Text style={s.caption}>
                    Stripe descuenta sus comisiones de procesamiento del importe
                    que recibes. El paciente paga el precio de la sesión, sin
                    recargos. Las tarifas aplicables son las de tu cuenta
                    Stripe; puedes consultarlas en «Comisiones».
                  </Text>
                  <Text style={s.accountTitle}>
                    Sesiones con pago individual
                  </Text>
                  <Text style={s.caption}>
                    En una cita confirmada, el paciente recibe el importe
                    pendiente si cancela con al menos 24 horas de antelación.
                    Con menos tiempo, no hay devolución automática; puedes
                    concederla manualmente cuando el estado del pago lo permita.
                  </Text>
                  <Text style={s.caption}>
                    También se devuelve el importe pendiente si la solicitud
                    sigue sin aceptar, si rechazas o cancelas la cita, o si
                    vence el plazo de aceptación.
                  </Text>
                  <Text style={s.caption}>
                    Si confirmas las citas manualmente, debes aceptarlas antes
                    de que pasen 24 horas desde el pago o de que falte una hora
                    para la cita, lo que ocurra primero.
                  </Text>
                  <Text style={s.caption}>
                    Las devoluciones descuentan cualquier importe ya recuperado
                    por el paciente.
                  </Text>
                  <Text style={s.accountTitle}>
                    Sesiones incluidas en un bono
                  </Text>
                  <Text style={s.caption}>
                    Reservar una sesión incluida no genera otro cobro.
                    Cancelarla no devuelve el pago del bono a la tarjeta; las
                    condiciones de devolución de una sesión individual no se
                    aplican al bono.
                  </Text>
                </View>
              ) : (
                <View style={s.terms}>
                  <Text style={s.body}>
                    Stripe cobra una comisión por procesar cada pago online y la
                    descuenta del importe que recibes.
                  </Text>
                  <Text style={s.body}>
                    El paciente paga el precio que has indicado, sin recargos.
                    La tarifa depende de la tarjeta, la moneda y las condiciones
                    de tu cuenta Stripe; otros servicios pueden tener costes
                    adicionales.
                  </Text>
                  <View style={s.noticeBox}>
                    <Text style={s.caption}>
                      Importe del pago − comisión de Stripe = importe que
                      recibes en tu cuenta Stripe.
                    </Text>
                  </View>
                  <Button
                    variant="outline"
                    style={s.button}
                    onPress={() => {
                      void Linking.openURL(
                        "https://stripe.com/es/pricing",
                      ).catch(() => {
                        setDetails(undefined);
                        setError(
                          "No se pudo abrir la página de tarifas de Stripe. Inténtalo de nuevo.",
                        );
                      });
                    }}
                  >
                    Ver tarifas en Stripe
                  </Button>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    settings: { gap: 24 },
    settingsColumns: { gap: 28 },
    preference: {
      padding: 28,
      gap: 22,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 20,
    },
    preferenceWide: { flex: 1, minWidth: 0 },
    preferenceHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    preferenceCopy: { flex: 1, minWidth: 0, gap: 6 },
    compactPreference: { padding: 20, gap: 18 },
    switchTarget: {
      width: 56,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 12,
    },
    switchTrack: {
      width: 52,
      height: 30,
      padding: 4,
      borderRadius: 15,
      justifyContent: "center",
    },
    switchThumb: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.textOnPrimary,
    },
    switchDisabled: { opacity: 0.5 },
    switchControl: { alignItems: "center", gap: 6 },
    switchLabel: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      color: theme.textSecondary,
    },
    modeSummary: {
      flexDirection: "row",
      gap: 16,
      alignItems: "flex-start",
      paddingVertical: 22,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.borderLight,
    },
    modeIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryAlpha12,
    },
    modeTitle: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 18,
      lineHeight: 26,
      color: theme.textPrimary,
    },
    choiceNote: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    shrink: { flex: 1 },
    accountPanel: { gap: 18, paddingVertical: 8 },
    accountPanelWide: { width: 320 },
    accountHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    accountTitle: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 16,
      lineHeight: 24,
      color: theme.textPrimary,
    },
    accountActions: { gap: 10 },
    accountButton: {
      minHeight: 48,
      borderRadius: 12,
      shadowOpacity: 0,
      elevation: 0,
    },
    detailsFooter: {
      gap: 16,
      borderTopWidth: 1,
      borderColor: theme.borderLight,
      paddingTop: 20,
    },
    feeSummary: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      maxWidth: 760,
    },
    detailButton: {
      minHeight: 44,
      borderRadius: 10,
      borderColor: theme.borderStrong,
      backgroundColor: theme.bgCard,
    },
    overlay: {
      flex: 1,
      padding: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(18, 28, 18, 0.48)",
    },
    detailsCard: {
      width: "100%",
      maxWidth: 640,
      maxHeight: "85%",
      padding: 24,
      gap: 20,
      backgroundColor: theme.bgCard,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    modalContent: { paddingBottom: 8 },
    closeButton: {
      minHeight: 44,
      width: 44,
      paddingHorizontal: 0,
      borderRadius: 12,
    },
    root: { flex: 1, backgroundColor: theme.bg },
    content: { flexGrow: 1, padding: 32 },
    mobileContent: { padding: 20 },
    page: { width: "100%", maxWidth: 1180, alignSelf: "center", gap: 28 },
    heading: { gap: 8, flexShrink: 1 },
    mobileConnectHeader: { flexDirection: "column-reverse", gap: 12 },
    title: {
      fontFamily: theme.fontHeading,
      fontSize: 30,
      lineHeight: 38,
      color: theme.textPrimary,
    },
    body: {
      fontFamily: theme.fontSans,
      fontSize: 16,
      lineHeight: 24,
      color: theme.textSecondary,
      flexShrink: 1,
    },
    caption: {
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      color: theme.textSecondary,
    },
    sectionTitle: {
      fontFamily: theme.fontSansBold,
      fontSize: 21,
      lineHeight: 28,
      color: theme.textPrimary,
    },
    headerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    status: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 1,
    },
    statusText: {
      fontFamily: theme.fontSans,
      fontSize: 14,
      color: theme.textSecondary,
      flexShrink: 1,
    },
    dot: { width: 7, height: 7, borderRadius: 4 },
    columns: { gap: 24 },
    wideColumns: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "center",
    },
    main: {
      flex: 1,
      minWidth: 0,
      padding: 24,
      gap: 18,
      backgroundColor: theme.bgCard,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    form: {
      flex: 1,
      minWidth: 0,
      width: "100%",
      maxWidth: 760,
      alignSelf: "center",
    },
    stripeIdentity: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 16,
    },
    stripeLogo: { width: 72, height: 36 },
    help: { gap: 14, paddingVertical: 12 },
    sideHelp: { width: 280, flexShrink: 0, paddingHorizontal: 8 },
    button: {
      alignSelf: "flex-start",
      minHeight: 44,
      maxWidth: "100%",
      shadowOpacity: 0,
      elevation: 0,
      borderRadius: 12,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      alignItems: "center",
    },
    activation: {
      gap: 12,
      paddingTop: 16,
      borderTopWidth: 1,
      borderColor: theme.borderLight,
    },
    checkboxAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 44,
      alignSelf: "flex-start",
    },
    checkbox: {
      width: 22,
      height: 22,
      borderWidth: 1.5,
      borderRadius: 6,
      borderColor: theme.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    notice: {
      fontFamily: theme.fontSans,
      fontSize: 15,
      lineHeight: 23,
      color: theme.textSecondary,
      backgroundColor: theme.surfaceMuted,
      padding: 14,
      borderRadius: 10,
    },
    noticeBox: {
      gap: 10,
      backgroundColor: theme.surfaceMuted,
      padding: 14,
      borderRadius: 10,
    },
    termsButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 44,
      alignSelf: "flex-start",
    },
    link: {
      fontFamily: theme.fontSansBold,
      fontSize: 14,
      lineHeight: 21,
      color: theme.primary,
      flexShrink: 1,
    },
    terms: { gap: 12 },
    error: {
      gap: 8,
      padding: 16,
      backgroundColor: theme.errorBg,
      borderRadius: 12,
    },
    errorText: {
      fontFamily: theme.fontSans,
      fontSize: 15,
      lineHeight: 23,
      color: theme.error,
    },
    tabs: {
      flexDirection: "row",
      gap: 24,
      borderBottomWidth: 1,
      borderColor: theme.border,
    },
    tab: {
      paddingHorizontal: 4,
      justifyContent: "center",
      minHeight: 52,
      borderBottomWidth: 3,
      borderBottomColor: "transparent",
      marginBottom: -1,
    },
    selectedTab: { borderBottomColor: theme.primary },
    tabText: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 17,
      color: theme.textSecondary,
    },
    selectedTabText: { color: theme.textPrimary },
  });
