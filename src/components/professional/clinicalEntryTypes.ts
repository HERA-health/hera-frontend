export const noteTypes = [
  { value: "EVOLUTION", label: "Evolución de sesión" },
  { value: "FOLLOW_UP", label: "Seguimiento de sesión" },
  { value: "INCIDENT", label: "Incidencia" },
  { value: "EXERCISE_REVIEW", label: "Revisión de ejercicio" },
];
export const historyTypes = [
  { value: "ASSESSMENT", label: "Evaluación del proceso" },
  { value: "BACKGROUND", label: "Antecedentes" },
  { value: "OBJECTIVES", label: "Objetivos terapéuticos" },
  { value: "TREATMENT_PLAN", label: "Plan de tratamiento" },
];
// Historical values remain readable, searchable and editable without migrating
// their clinical meaning or making them options for newly created records.
export const legacyNoteType = {
  value: "ASSESSMENT",
  label: "Evaluación (registro anterior)",
};
export const legacyHistoryType = {
  value: "EVOLUTION",
  label: "Evolución (registro anterior)",
};
export const notePurpose =
  "Registra lo ocurrido en una sesión, su seguimiento o incidencias. Guarda las evaluaciones, antecedentes, objetivos y planes del proceso en Historia clínica.";
export const historyPurpose =
  "Organiza las evaluaciones, antecedentes, objetivos y planes del proceso terapéutico. Vincula las sesiones pertinentes y registra su seguimiento en Notas clínicas.";
