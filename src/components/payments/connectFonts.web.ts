import { Asset } from "expo-asset";

export async function connectFonts() {
  return [
    {
      module: require("../../../assets/fonts/GlacialIndifference-Regular.otf"),
      weight: "400",
    },
    {
      module: require("../../../assets/fonts/GlacialIndifference-Bold.otf"),
      weight: "700",
    },
  ].map((font) => ({
    family: "HeraSans",
    weight: font.weight,
    display: "swap",
    src: `url("${new URL(Asset.fromModule(font.module).uri, window.location.href).href}")`,
  }));
}
