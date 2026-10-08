import { Asset } from "expo-asset";
import { File } from "expo-file-system";

// Connect renders in a WebView: it cannot inherit Expo's registered native fonts.
export async function connectFonts() {
  return Promise.all(
    [
      {
        module: require("../../../assets/fonts/GlacialIndifference-Regular.otf"),
        weight: "400",
      },
      {
        module: require("../../../assets/fonts/GlacialIndifference-Bold.otf"),
        weight: "700",
      },
    ].map(async (font) => {
      const asset = await Asset.fromModule(font.module).downloadAsync();
      if (!asset.localUri) throw new Error("CONNECT_FONT_UNAVAILABLE");
      const base64 = await new File(asset.localUri).base64();
      return {
        family: "HeraSans",
        weight: font.weight,
        display: "swap",
        src: `url("data:font/otf;base64,${base64}")`,
      };
    }),
  );
}
