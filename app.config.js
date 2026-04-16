export default {
  expo: {
    name: "HERA",
    slug: "hera",
    version: "1.0.0",
    scheme: "hera",
    orientation: "portrait",
    icon: "./assets/main-logo.png",
    userInterfaceStyle: "automatic",
    plugins: [
      "expo-font"
    ],
    newArchEnabled: true,
    splash: {
      image: "./assets/main-logo.png",
      resizeMode: "contain",
      backgroundColor: "#F4EDE4"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.hera.app",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/main-logo.png",
        backgroundColor: "#F4EDE4"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.hera.app",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "hera"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      favicon: "./assets/main-logo.png",
      bundler: "metro"
    },
    extra: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
    }
  }
};
