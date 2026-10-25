import React from "react";
import { View, useWindowDimensions, type DimensionValue } from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";
import { Panel, pd } from "./PatientDetailPrimitives";

function Placeholder({
  width = "100%",
  height = 12,
}: {
  width?: DimensionValue;
  height?: number;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{ width, height, borderRadius: 5, backgroundColor: theme.bgMuted }}
    />
  );
}

export function PatientSessionListSkeleton() {
  const { theme } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando sesiones"
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <View
          key={index}
          style={[pd.row, { borderBottomColor: theme.borderLight, gap: 12 }]}
        >
          <View style={pd.toolbar}>
            <Placeholder width="40%" height={14} />
            <Placeholder width={68} height={20} />
          </View>
          <Placeholder width="60%" />
        </View>
      ))}
    </View>
  );
}

export function PatientSessionDetailSkeleton() {
  const { theme } = useTheme();
  const narrow = useWindowDimensions().width < 720;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando detalle de la sesión"
      accessibilityState={{ busy: true }}
    >
      <Panel title="Detalle de la sesión" icon="document-text-outline">
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            columnGap: 16,
            rowGap: 18,
            paddingVertical: 12,
          }}
        >
          {Array.from({ length: 8 }, (_, index) => (
            <View
              key={index}
              style={{
                flexBasis: narrow ? "100%" : "46%",
                flexGrow: 1,
                minWidth: 0,
                gap: 10,
                flexDirection: narrow ? "row" : "column",
              }}
            >
              <Placeholder width={narrow ? "35%" : "45%"} height={10} />
              <Placeholder
                width={narrow ? "50%" : index % 2 ? "65%" : "85%"}
                height={14}
              />
            </View>
          ))}
        </View>
        <View
          style={{
            gap: 16,
            paddingTop: 20,
            paddingBottom: 16,
            marginTop: 12,
            borderTopWidth: 1,
            borderTopColor: theme.borderLight,
          }}
        >
          <Placeholder width="50%" height={15} />
          <Placeholder width="80%" />
          <Placeholder height={36} />
          <Placeholder width="40%" height={15} />
          <Placeholder width="70%" />
        </View>
      </Panel>
    </View>
  );
}
