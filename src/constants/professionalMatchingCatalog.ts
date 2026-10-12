// Canonical profile catalog. Keep the frontend/backend copies aligned (contract test).
export interface ProfessionalMatchingOption { value: string; label: string; aliases: readonly string[] }
export const PROFESSIONAL_SPECIALTY_OPTIONS = [
  {
    "value": "anxiety",
    "label": "Ansiedad",
    "aliases": [
      "ansiedad y estrés",
      "ansiedad"
    ]
  },
  {
    "value": "depression",
    "label": "Depresión y estado de ánimo",
    "aliases": [
      "depresión"
    ]
  },
  {
    "value": "stress",
    "label": "Estrés y regulación emocional",
    "aliases": [
      "estrés"
    ]
  },
  {
    "value": "ocd",
    "label": "TOC y pensamientos intrusivos",
    "aliases": [
      "toc"
    ]
  },
  {
    "value": "sleep",
    "label": "Trastornos del sueño",
    "aliases": [
      "sueño",
      "problemas de sueño"
    ]
  },
  {
    "value": "trauma",
    "label": "Trauma y estrés postraumático",
    "aliases": [
      "trauma",
      "trauma (EMDR)"
    ]
  },
  {
    "value": "grief",
    "label": "Duelo y pérdidas",
    "aliases": [
      "duelo"
    ]
  },
  {
    "value": "eating",
    "label": "TCA e imagen corporal",
    "aliases": [
      "trastornos alimentarios",
      "alimentación"
    ]
  },
  {
    "value": "couples",
    "label": "Problemas de pareja y relaciones",
    "aliases": [
      "terapia de pareja",
      "pareja",
      "relaciones",
      "relationships"
    ]
  },
  {
    "value": "sexuality",
    "label": "Sexualidad",
    "aliases": []
  },
  {
    "value": "self-esteem",
    "label": "Autoestima y desarrollo personal",
    "aliases": [
      "autoestima",
      "self_esteem"
    ]
  },
  {
    "value": "addiction",
    "label": "Adicciones",
    "aliases": [
      "adicción"
    ]
  },
  {
    "value": "personality",
    "label": "Trastornos de la personalidad",
    "aliases": []
  },
  {
    "value": "neurodivergence",
    "label": "Neurodivergencias",
    "aliases": []
  },
  {
    "value": "neuropsychology",
    "label": "Neuropsicología",
    "aliases": []
  },
  {
    "value": "children-adolescents",
    "label": "Infancia y adolescencia",
    "aliases": [
      "infantil",
      "adolescentes"
    ]
  },
  {
    "value": "parenting-family",
    "label": "Crianza y familia",
    "aliases": []
  },
  {
    "value": "burnout",
    "label": "Estrés laboral y burnout",
    "aliases": [
      "estrés laboral"
    ]
  },
  {
    "value": "health",
    "label": "Problemas relacionados con la salud",
    "aliases": []
  },
  {
    "value": "chronic-pain",
    "label": "Dolor crónico",
    "aliases": []
  },
  {
    "value": "self-harm",
    "label": "Conductas autolesivas e ideación suicida",
    "aliases": []
  },
  {
    "value": "psychosis",
    "label": "Psicosis y trastornos psicóticos",
    "aliases": []
  }
] as const;
export const PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS = [
  {
    "value": "cbt",
    "label": "Cognitivo-Conductual (TCC)",
    "aliases": [
      "tcc",
      "terapia cognitivo-conductual",
      "terapia cognitivo conductual",
      "cognitive-behavioral"
    ]
  },
  {
    "value": "contextual",
    "label": "Contextual / Tercera Generación",
    "aliases": [
      "act",
      "terapia de aceptación y compromiso",
      "aceptación y compromiso (ACT)"
    ]
  },
  {
    "value": "emdr",
    "label": "EMDR y terapias centradas en trauma",
    "aliases": [
      "emdr"
    ]
  },
  {
    "value": "systemic",
    "label": "Sistémico-Familiar",
    "aliases": [
      "sistémico",
      "terapia sistémica"
    ]
  },
  {
    "value": "couple-therapy",
    "label": "Terapia de Pareja",
    "aliases": []
  },
  {
    "value": "psychodynamic",
    "label": "Psicodinámico",
    "aliases": [
      "terapia psicodinámica"
    ]
  },
  {
    "value": "humanistic",
    "label": "Humanista",
    "aliases": [
      "terapia humanista"
    ]
  },
  {
    "value": "existential",
    "label": "Existencial",
    "aliases": []
  },
  {
    "value": "eft",
    "label": "Centrada en las Emociones (EFT)",
    "aliases": [
      "eft"
    ]
  },
  {
    "value": "ipt",
    "label": "Interpersonal (IPT)",
    "aliases": [
      "ipt"
    ]
  },
  {
    "value": "mindfulness",
    "label": "Mindfulness / terapias basadas en mindfulness",
    "aliases": [
      "mindfulness"
    ]
  },
  {
    "value": "integrative",
    "label": "Integrativo / Ecléctico",
    "aliases": []
  }
] as const;
export const SPECIALTY_VALUES = ["anxiety","depression","stress","ocd","sleep","trauma","grief","eating","couples","sexuality","self-esteem","addiction","personality","neurodivergence","neuropsychology","children-adolescents","parenting-family","burnout","health","chronic-pain","self-harm","psychosis"] as const;
export const THERAPEUTIC_APPROACH_VALUES = ["cbt","contextual","emdr","systemic","couple-therapy","psychodynamic","humanistic","existential","eft","ipt","mindfulness","integrative"] as const;
export const matchingChoiceKey = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
export const resolveMatchingChoice = (value: string, options: readonly ProfessionalMatchingOption[]): string | undefined => {
  const key = matchingChoiceKey(value);
  return options.find(option => [option.value, option.label, ...option.aliases].some(alias => matchingChoiceKey(alias) === key))?.value;
};
export const matchingChoiceLabel = (value: string, options: readonly ProfessionalMatchingOption[]): string =>
  options.find(option => option.value === resolveMatchingChoice(value, options))?.label ?? value;
export const customChoiceKey = (value: string): string => matchingChoiceKey(value) === 'phobias' ? 'fobias' : matchingChoiceKey(value);
export const customChoiceError = (value: string, custom: readonly string[], options: readonly ProfessionalMatchingOption[]): string | null => {
  if (!value.trim() || value.trim().length > 40) return 'Introduce entre 1 y 40 caracteres.';
  if (resolveMatchingChoice(value, options)) return 'Esta opción ya existe en la lista.';
  if (custom.some(entry => customChoiceKey(entry) === customChoiceKey(value))) return 'Ya has añadido esta opción.';
  return null;
};
