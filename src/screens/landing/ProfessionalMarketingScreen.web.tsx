import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Asset } from "expo-asset";
import { LandingHeader } from "./components/LandingHeader";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { AppNavigationProp, RootStackParamList } from "../../constants/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useWebPageMetadata } from "../../hooks/useWebPageMetadata";
import {
  professionalPages,
  type ProfessionalPageId,
} from "../../seo/professionalContent";
import {
  professionalCss,
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
  ProfessionalAgenda: "agenda",
  ProfessionalPatients: "patients",
  ProfessionalBillingInfo: "billing",
} as const;

/** The exported document and React mount share this markup, including breakpoints. */
export function PublicMarketingDocument({
  html,
}: {
  html: string;
}): React.ReactElement {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const container = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const image = useRef<HTMLImageElement>(null);
  const [fullImageUrl, setFullImageUrl] = useState<string>();
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
        steps[0];
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
    page.addEventListener("click", navigateStep);
    window.addEventListener("hashchange", selectStep);
    window.addEventListener("popstate", selectStep);
    return () => {
      page.removeEventListener("click", navigateStep);
      window.removeEventListener("hashchange", selectStep);
      window.removeEventListener("popstate", selectStep);
    };
  }, [html]);
  usePublicHtmlReady(true, container);
  useLayoutEffect(() => {
    document.documentElement.dataset.heraTheme = isDark ? "dark" : "light";
  }, [isDark]);
  return (
    <View style={{ flex: 1, backgroundColor: theme.landingCanvas }}>
      <LandingHeader
        context="professional"
        isScrolled={false}
        onLogoPress={() => window.location.assign("/")}
        onAccess={() => window.location.assign("/acceso")}
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
          const target = event.target.closest<HTMLElement>("a,button");
          if (!target) return;
          // Keep normal internal links in the mounted app. Leave modified clicks,
          // image downloads, legal documents and external URLs to the browser.
          if (target instanceof HTMLAnchorElement && !event.defaultPrevented &&
              event.button === 0 && !event.ctrlKey && !event.metaKey &&
              !event.shiftKey && !event.altKey && !target.target && !target.hasAttribute("download")) {
            const destination = professionalHeaderLinks.find(item => item.href === target.getAttribute("href"));
            if (destination) {
              event.preventDefault();
              navigation.navigate(destination.route);
              return;
            }
          }
          const capture = target.dataset.capture;
          if (capture && image.current && dialog.current) {
            event.preventDefault();
            origin.current = target;
            // Only renderer-authored image links can be enlarged.
            const shot = target.querySelector<HTMLImageElement>(
              isDark ? ".pro-shot-dark" : ".pro-shot-light",
            );
            if (!shot) return;
            image.current.src = shot.src;
            image.current.alt = shot.alt;
            setFullImageUrl(shot.src);
            dialog.current.showModal();
          }
        }}
      >
        <style>{professionalCss}</style>
        <div dangerouslySetInnerHTML={markup} />
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
  const html = useMemo(() => professionalHtml(id), [id]);
  return <PublicMarketingDocument html={html} />;
}
export function ProfessionalShowcaseScreen(): React.ReactElement {
  useWebPageMetadata({ ...tourMetadata, indexable: true, structuredWebPage: true });
  return <PublicMarketingDocument html={professionalTourHtml()} />;
}
