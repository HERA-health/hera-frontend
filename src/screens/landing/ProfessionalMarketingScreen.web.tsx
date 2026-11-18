import { FooterSection } from './components/FooterSection';
import { useProfessionalDemo } from "./useProfessionalDemo.web";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Asset } from "expo-asset";
import { LandingHeader } from "./components/LandingHeader";
import { CommonActions, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { AppNavigationProp, RootStackParamList } from "../../constants/types";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useWebPageMetadata } from "../../hooks/useWebPageMetadata";
import {
  professionalPages,
  marketingCaptures,
  type MarketingCapture,
  type ProfessionalPageId,
} from "../../seo/professionalContent";
import {
  professionalCss,
  capturePath,
  directoryCapturePath,
  professionalRegisterHref,
  professionalHtml,
  professionalTourHtml,
  tourMetadata,
} from "../../seo/professionalPresentation";
import {
  publicThemeStyle,
  professionalHeaderLinks,
} from "../../seo/publicNavigation";
import { usePublicHtmlReady } from "../../seo/usePublicHtmlReady";

export const professionalRoutePages = {
  ProfessionalSoftware: "software",
  ProfessionalDirectory: "directory",
  ProfessionalAgenda: "agenda",
  ProfessionalPatients: "patients",
  ProfessionalBillingInfo: "billing",
} as const;

/** The exported document and React mount share this markup, including breakpoints. */
export function PublicMarketingDocument({
  html,
  initialStep,
}: {
  html: string;
  initialStep?: MarketingCapture;
}): React.ReactElement {
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation<AppNavigationProp>();
  const container = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const image = useRef<HTMLImageElement>(null);
  const [fullImageUrl, setFullImageUrl] = useState<string>();
  useProfessionalDemo(container, html);
  const markup = useMemo(() => ({ __html: html }), [html]);
  useLayoutEffect(() => {
    const page = container.current?.querySelector<HTMLElement>(".pro-page");
    const steps = Array.from(
      page?.querySelectorAll<HTMLElement>(".pro-tour-step") || [],
    );
    if (!page || !steps.length) return;
    const selectStep = () => {
      const selected =
        steps.find((step) => `#${step.id}` === window.location.hash) ||
        steps.find((step) => step.id === `tour-${initialStep}`) || steps[0];
      // :target still refers to the initial document's removed element after mount.
      // Keep the same selection explicitly, including reload and browser history.
      page.dataset.tourSelection = selected.id;
      const nav = page.querySelector<HTMLElement>(".pro-tour-nav");
      nav?.querySelectorAll<HTMLAnchorElement>("a").forEach((item) => {
        if (item.hash === `#${selected.id}`) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
      });
      const link = nav?.querySelector<HTMLAnchorElement>(
        `a[href="#${selected.id}"]`,
      );
      if (nav && link && nav.scrollWidth > nav.clientWidth)
        nav.scrollLeft +=
          link.getBoundingClientRect().left -
          nav.getBoundingClientRect().left -
          8;
    };
    const navigateStep = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>(".pro-tour-nav a")
        : null;
      if (!link || !steps.some((step) => `#${step.id}` === link.hash)) return;
      event.preventDefault();
      // Change the screen in place; anchors remain usable before React loads.
      // This is a selector within one page, not a new navigation entry.
      // Preserve React Navigation's state and the reader's scroll position.
      if (window.location.hash !== link.hash)
        window.history.replaceState(window.history.state, "", link.hash);
      selectStep();
    };
    selectStep();
    // React Navigation serializes the incoming selection as a query. Keep the
    // public hash URL so reloads select the same panel even before JS starts.
    const frame = requestAnimationFrame(() => {
      const url = new URL(window.location.href);
      if (initialStep && steps.some(step => step.id === `tour-${initialStep}`) &&
          url.pathname === "/profesionales/recorrido" && url.searchParams.has("vista")) {
        url.searchParams.delete("vista");
        if (!url.hash) url.hash = `tour-${initialStep}`;
        window.history.replaceState(window.history.state, "", url);
        selectStep();
      }
    });
    page.addEventListener("click", navigateStep);
    window.addEventListener("hashchange", selectStep);
    window.addEventListener("popstate", selectStep);
    return () => {
      cancelAnimationFrame(frame);
      page.removeEventListener("click", navigateStep);
      window.removeEventListener("hashchange", selectStep);
      window.removeEventListener("popstate", selectStep);
    };
  }, [html, initialStep]);
  const canVisitLanding = navigation.getState().routeNames.includes('Landing');
  const handleAccess = () => {
    if (!isAuthenticated) navigation.navigate('Welcome');
    else navigation.dispatch(CommonActions.navigate(navigation.getState().routeNames[0]));
  };
  usePublicHtmlReady(true, container);
  useLayoutEffect(() => {
    document.documentElement.dataset.heraTheme = isDark ? "dark" : "light";
  }, [isDark]);
  return (
    <View style={{ flex: 1, backgroundColor: theme.landingCanvas }}>
      <LandingHeader
        context="professional"
        isScrolled={false}
        onLogoPress={isAuthenticated ? undefined : () => navigation.navigate("Landing")}
        accessLabel={isAuthenticated ? "Mi espacio" : "Acceder"}
        onAccess={handleAccess}
        navigationItems={professionalHeaderLinks.map((item) => ({
          ...item,
          onPress: () => navigation.navigate(item.route),
        }))}
      />
      <div
        ref={container}
        className="public-surface pro-mounted"
        style={{
          ...publicThemeStyle(theme),
          ...{
            "--hera-public-logo": `url("${Asset.fromModule(require("../../../assets/main-logo.webp")).uri}")`,
            "--hera-public-logo-dark": `url("${Asset.fromModule(require("../../../assets/Logo-Hera-beige-oscuro.webp")).uri}")`,
          },
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
        }}
        onClick={(event) => {
          if (!(event.target instanceof Element)) return;
          const target = event.target.closest<HTMLAnchorElement>("a");
          // Leave modified clicks and new-tab actions to the browser.
          if (!target || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey ||
              event.shiftKey || event.altKey || target.target || target.hasAttribute("download")) return;
          const href = target.getAttribute("href");
          if (href === professionalRegisterHref && navigation.getState().routeNames.includes("Register")) {
            event.preventDefault();
            navigation.navigate("Register", { userType: "PROFESSIONAL" });
            return;
          }
          if (href === "/especialistas" && navigation.getState().routeNames.includes("PublicSpecialists")) {
            event.preventDefault();
            navigation.navigate("PublicSpecialists");
            return;
          }
          const tourStep = marketingCaptures.find((shot) => href === `/profesionales/recorrido#tour-${shot.id}`);
          if (tourStep) {
            event.preventDefault();
            navigation.navigate("ProfessionalShowcase", { vista: tourStep.id });
            return;
          }
          const destination = professionalHeaderLinks.find(item => item.href === href);
          if (destination) {
            event.preventDefault();
            navigation.navigate(destination.route);
            return;
          }
          const capture = marketingCaptures.find((shot) => shot.id === target.dataset.capture);
          const directory = target.dataset.capture === "directory";
          if ((directory || capture) && image.current && dialog.current) {
            event.preventDefault();
            origin.current = target;
            const mode = isDark ? "dark" : "light";
            const url = capture ? capturePath(capture.id, mode) : directoryCapturePath(window.matchMedia("(max-width:760px)").matches ? "mobile" : "desktop", mode);
            image.current.src = url;
            image.current.alt = `${capture?.label ?? "Directorio de psicólogos"} — HERA con datos de demostración`;
            setFullImageUrl(url);
            dialog.current.showModal();
          }
        }}
      >
        <style>{professionalCss}</style>
        <div dangerouslySetInnerHTML={markup} />
        <FooterSection
          professionalActionLabel={isAuthenticated ? 'Mi espacio' : 'Crear cuenta profesional'}
          professionalActionHref={isAuthenticated ? '/acceso' : professionalRegisterHref}
          onProfessionalAction={isAuthenticated ? handleAccess : () => navigation.navigate('Register', { userType: 'PROFESSIONAL' })}
          professionalLoginHref={isAuthenticated ? '/acceso' : undefined}
          onProfessionalLogin={isAuthenticated ? handleAccess : () => navigation.navigate('Login', { userType: 'PROFESSIONAL' })}
          onFindSpecialist={() => navigation.navigate('PublicSpecialists')}
          onViewPlans={() => navigation.navigate('Pricing')}
          onScrollToSection={canVisitLanding ? section => navigation.navigate('Landing', { section }) : undefined}
        />
        <dialog
          ref={dialog}
          className="pro-dialog"
          aria-label="Captura ampliada de HERA"
          onClose={() => origin.current?.focus()}
          onClick={(event) => {
            if (event.target === dialog.current) dialog.current.close();
          }}
        >
          <button
            className="pub-button secondary"
            type="button"
            autoFocus
            onClick={() => dialog.current?.close()}
          >
            Cerrar imagen
          </button>
          <img ref={image} alt="" />
          <p>
            Aplicación HERA · Datos de demostración ·{" "}
            {fullImageUrl && <a href={fullImageUrl} target="_blank" rel="noopener">
              Abrir imagen a tamaño completo
            </a>}
          </p>
        </dialog>
      </div>
    </View>
  );
}
export function ProfessionalMarketingScreen(): React.ReactElement {
  const route =
    useRoute<
      RouteProp<RootStackParamList, keyof typeof professionalRoutePages>
    >();
  const id: ProfessionalPageId = professionalRoutePages[route.name];
  const page = professionalPages[id];
  useWebPageMetadata({
    title: page.title,
    description: page.description,
    canonicalPath: page.path,
    indexable: true,
    structuredWebPage: true,
  });
  const { isAuthenticated } = useAuth();
  const html = useMemo(() => professionalHtml(id,
    Asset.fromModule(require("../../../assets/landing/psychologist-portrait-480.webp")).uri,
    !isAuthenticated,
  ), [id, isAuthenticated]);
  return <PublicMarketingDocument html={html} />;
}
export function ProfessionalShowcaseScreen(): React.ReactElement {
  useWebPageMetadata({ ...tourMetadata, indexable: true, structuredWebPage: true });
  const route = useRoute<RouteProp<RootStackParamList, "ProfessionalShowcase">>();
  const { isAuthenticated } = useAuth();
  return <PublicMarketingDocument html={professionalTourHtml(!isAuthenticated)} initialStep={route.params?.vista} />;
}
