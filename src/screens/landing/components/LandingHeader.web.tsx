import React, { useLayoutEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { Asset } from "expo-asset";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../../contexts/ThemeContext";
import type { AppNavigationProp } from "../../../constants/types";
import { professionalHeaderLinks } from "../../../constants/professionalNavigation";
import { publicBarCss, publicBarHtml } from "../../../seo/publicBar";
import {
  LandingHeader as BaseHeader,
  type LandingHeaderProps,
} from "./LandingHeaderBase";
export type { LandingHeaderContext } from "./LandingHeaderBase";

const brand = (asset: number) => `url("${Asset.fromModule(asset).uri}")`;
const brandStyle = {
  "--hera-public-mark": brand(require("../../../../assets/Isotipo-Hera-Azul-oscuro-original.webp")),
  "--hera-public-mark-dark": brand(require("../../../../assets/Isotipo-Hera-beige-claro.webp")),
  "--hera-public-logo": brand(require("../../../../assets/main-logo.webp")),
  "--hera-public-logo-dark": brand(
    require("../../../../assets/Logo-Hera-beige-oscuro.webp"),
  ),
} satisfies Record<string, string>;

function MarketingHeader(props: LandingHeaderProps) {
  const nav = useNavigation<AppNavigationProp>();
  const { isDark, setMode } = useTheme();
  const host = useRef<HTMLDivElement>(null);
  const pro = props.context === "professional";
  const surface = props.context === "landing" || props.context === "questionnaire" ? props.context : props.surface;
  const signedIn = props.accessLabel === "Mi espacio";
  const routes = nav.getState().routeNames;
  const hasLanding = routes.includes("Landing");
  const hasQuestionnaire = routes.includes("Questionnaire");
  const markup = useMemo(
    () => ({
      __html: publicBarHtml(pro ? "professional" : "patient", signedIn, surface, { hasLanding, hasQuestionnaire }),
    }),
    [pro, signedIn, surface, hasLanding, hasQuestionnaire],
  );
  useLayoutEffect(() => {
    document.documentElement.dataset.heraTheme = isDark ? "dark" : "light";
  }, [isDark]);
  useLayoutEffect(() => {
    const node = host.current;
    if (!node) return;
    // The ScrollView owns the browser scrollbar. Match its actual usable width,
    // including changes from zoom, viewport resizing or a longer results list.
    const wrapper = node.parentElement;
    const scroll = wrapper?.nextElementSibling;
    const syncWidth = () => {
      if (wrapper && scroll instanceof HTMLElement && /auto|scroll/.test(getComputedStyle(scroll).overflowY)) {
        wrapper.style.right = (scroll.offsetWidth - scroll.clientWidth) + "px";
      }
    };
    syncWidth();
    const observer = new ResizeObserver(syncWidth);
    if (scroll) observer.observe(scroll);
    const close = () =>
      node
        .querySelectorAll("details[open]")
        .forEach((el) => el.removeAttribute("open"));
    const initial = document.querySelector(
      "#hera-public-html .sitebar, #pricing-first-paint .sitebar",
    );
    const initialDetails = initial?.querySelectorAll("details");
    node.querySelectorAll("details").forEach((details, i) => {
      if (initialDetails?.[i]?.open) details.open = true;
    });
    const initialFocus = initial?.contains(document.activeElement)
      ? document.activeElement
      : null;
    const focusIndex =
      initialFocus && initial
        ? Array.from(initial.querySelectorAll("summary, a, button")).indexOf(
            initialFocus,
          )
        : -1;
    const focusFrame = requestAnimationFrame(() => {
      if (focusIndex >= 0 && document.activeElement === document.body)
        node
          .querySelectorAll<HTMLElement>("summary, a, button")
          [focusIndex]?.focus({ preventScroll: true });
    });
    const pointer = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !node.contains(e.target)) close();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const open = Array.from(
        node.querySelectorAll<HTMLDetailsElement>("details[open]"),
      )
        .reverse()
        .find((el) => el.offsetWidth);
      if (open) {
        open.open = false;
        open.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", escape);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", escape);
    };
  }, [markup]);

  function activate(event: React.MouseEvent) {
    if (
      !(event.target instanceof Element) ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    if (event.target.closest(".sitebar-theme")) {
      setMode(isDark ? "light" : "dark");
      return;
    }
    const anchor = event.target.closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    const professional = professionalHeaderLinks.find(
      (item) => item.href === href,
    );
    const configured = props.navigationItems?.find(
      (item) => item.href === href,
    );
    function go(action: () => void) {
      event.preventDefault();
      host.current
        ?.querySelectorAll("details[open]")
        .forEach((el) => el.removeAttribute("open"));
      action();
    }
    if (configured) go(configured.onPress);
    else if (professional)
      go(() =>
        props.onProfessionalMenuSelect
          ? props.onProfessionalMenuSelect(professional.route)
          : nav.navigate(professional.route),
      );
    else if (href === "/acceso") go(props.onAccess);
    else if (href === "/" && props.onLogoPress) go(props.onLogoPress);
    else if (href === "/register?userType=PROFESSIONAL")
      go(() => nav.navigate("Register", { userType: "PROFESSIONAL" }));
    else if (href === "/especialistas")
      go(props.onFindSpecialist ?? (() => nav.navigate("PublicSpecialists")));
    else if (
      href === "/cuestionario" &&
      (props.onQuestionnaire ||
        nav.getState().routeNames.includes("Questionnaire"))
    )
      go(props.onQuestionnaire ?? (() => nav.navigate("Questionnaire")));
    else if (props.onScrollToSection && href === "/?section=howItWorks")
      go(() => props.onScrollToSection?.("howItWorks"));
    else if (props.onScrollToSection && href === "/?section=specializations")
      go(() => props.onScrollToSection?.("specializations"));
    else if (href === "/") go(hasLanding ? () => nav.navigate("Landing") : props.onAccess);
  }
  return (
    <View
      onLayout={props.onLayout}
      style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 1000 }}
    >
      <style>{publicBarCss}</style>
      <div
        ref={host}
        data-scrolled={props.isScrolled}
        style={{ ...brandStyle, width: "100%" }}
        onClick={activate}
        dangerouslySetInnerHTML={markup}
      />
    </View>
  );
}
export function LandingHeader(props: LandingHeaderProps) {
  if (props.context === "access" || props.context === "pricing")
    return <BaseHeader {...props} />;
  return <MarketingHeader {...props} />;
}
