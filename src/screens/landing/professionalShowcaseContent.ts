import type { ImageSourcePropType } from "react-native";
import type { ComponentProps } from "react";
import type Ionicons from "@expo/vector-icons/Ionicons";
import {
  PROFESSIONAL_SHOWCASE_STEP_IDS,
  type ProfessionalShowcaseStepId,
} from "../../constants/professionalShowcase";
import { marketingCaptures } from "../../seo/professionalContent";
export interface ProfessionalShowcaseStep {
  id: ProfessionalShowcaseStepId;
  eyebrow: string;
  title: string;
  navigationLabel: string;
  navigationSummary: string;
  description: string;
  highlights: readonly [string, string, string];
  icon: ComponentProps<typeof Ionicons>["name"];
  images: Readonly<{ light: ImageSourcePropType; dark: ImageSourcePropType }>;
  imageAccessibilityLabel: string;
}
const details: Record<
  ProfessionalShowcaseStepId,
  {
    icon: ProfessionalShowcaseStep["icon"];
    highlights: ProfessionalShowcaseStep["highlights"];
  }
> = {
  home: {
    icon: "home-outline",
    highlights: ["Próxima cita", "Actividad del día", "Resumen semanal"],
  },
  agenda: {
    icon: "calendar-outline",
    highlights: [
      "Sesiones en contexto",
      "Estados de las citas",
      "Organización semanal",
    ],
  },
  patients: {
    icon: "people-outline",
    highlights: [
      "Buscador y filtros",
      "Datos de contacto",
      "Acceso a la ficha",
    ],
  },
  record: {
    icon: "document-text-outline",
    highlights: [
      "Historia clínica",
      "Evolución del proceso",
      "Acceso clínico protegido",
    ],
  },
  documents: {
    icon: "folder-open-outline",
    highlights: [
      "Documentos clasificados",
      "Consentimiento",
      "Material del proceso",
    ],
  },
  billing: {
    icon: "receipt-outline",
    highlights: [
      "Facturas de la consulta",
      "Cobros registrados",
      "Seguimiento de estados",
    ],
  },
  availability: {
    icon: "time-outline",
    highlights: ["Horario semanal", "Huecos disponibles", "Excepciones"],
  },
  statistics: {
    icon: "stats-chart-outline",
    highlights: [
      "Actividad de la consulta",
      "Sesiones completadas",
      "Evolución de cobros",
    ],
  },
};
export const PROFESSIONAL_SHOWCASE_STEPS: readonly ProfessionalShowcaseStep[] =
  PROFESSIONAL_SHOWCASE_STEP_IDS.map((id) => {
    const shot = marketingCaptures.find((item) => item.id === id);
    if (!shot) throw new Error("Missing showcase content: " + id);
    return {
      id,
      eyebrow: "HERA POR DENTRO",
      title: shot.label,
      navigationLabel: shot.label,
      navigationSummary: shot.text,
      description: shot.text,
      ...details[id],
      images: {
        light: {
          uri: `https://www.health-hera.com/marketing/product/${id}-light-1600.webp`,
        },
        dark: {
          uri: `https://www.health-hera.com/marketing/product/${id}-dark-1600.webp`,
        },
      },
      imageAccessibilityLabel: shot.label + " · Datos de demostración",
    };
  });
