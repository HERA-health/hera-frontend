import { colors } from "./colors";
import { darkTheme, lightTheme, type Theme } from "./theme";

export function publicAudienceTheme(
  theme: Theme,
  audience: "patient" | "professional",
): Theme {
  const dark = theme.landingCanvas === darkTheme.landingCanvas;
  if (audience === "professional") {
    const green = dark ? theme.secondaryLight : theme.secondaryDark;
    return {
      ...theme,
      primary: green,
      actionPrimary: green,
      link: green,
      focus: green,
    };
  }
  const blue = dark ? colors.primary[100] : lightTheme.primary;
  const tint = dark ? "#323C3E" : lightTheme.primaryAlpha12;
  return {
    ...theme,
    primary: blue,
    actionPrimary: blue,
    link: blue,
    focus: blue,
    secondary: blue,
    textPrimary: dark ? theme.textPrimary : lightTheme.primaryDark,
    secondaryMuted: tint,
    secondaryAlpha12: dark ? `${blue}1F` : tint,
    primaryAlpha12: dark ? `${blue}1F` : theme.primaryAlpha12,
    primaryAlpha20: dark ? `${blue}33` : theme.primaryAlpha20,
    primaryMuted: tint,
    landingProfessional: tint,
    landingTrustPanel: theme.surface,
    landingCta: dark ? tint : lightTheme.primaryDark,
    landingCtaText: dark ? theme.textPrimary : lightTheme.textOnPrimary,
    landingCtaMutedText: dark
      ? theme.textSecondary
      : lightTheme.landingCtaMutedText,
  };
}

/** The canvas is the brand directory blue diluted toward the neutral card surface. */
export function publicDirectoryTheme(base: Theme): Theme {
  const patient = publicAudienceTheme(base, "patient");
  const dark = base.landingCanvas === darkTheme.landingCanvas;
  return {
    ...patient,
    bgMuted: dark ? "#252B2C" : "#EFF5F7",
    textSecondary: dark ? "#B7C8CD" : "#53666D",
    textMuted: dark ? "#9AAEB6" : "#657780",
    borderStrong: dark ? "#526971" : "#BDCDD3",
  };
}
