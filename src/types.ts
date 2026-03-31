// Question Types with descriptions for UI clarity
export type QuestionType =
  | "single"
  | "multiple"
  | "boolean"
  | "ordering"
  | "dragdrop"
  | "hotspot"
  | "dropdown"
  | "casestudy";

export const QUESTION_TYPE_DESCRIPTIONS: Record<
  QuestionType,
  { label: string; description: string; category: "conceptual" | "practical" }
> = {
  single: {
    label: "Single Choice",
    description:
      "Select one correct answer from multiple options. Best for testing discrete knowledge.",
    category: "conceptual",
  },
  multiple: {
    label: "Multiple Choice",
    description:
      "Select all correct answers from multiple options. Allows multiple valid selections.",
    category: "conceptual",
  },
  boolean: {
    label: "True/False Matrix",
    description:
      "Evaluate multiple statements as true or false. Ideal for scenario-based analysis.",
    category: "conceptual",
  },
  ordering: {
    label: "Ordering/Sequencing",
    description:
      "Arrange steps in the correct order. Perfect for process flows and procedures.",
    category: "practical",
  },
  dragdrop: {
    label: "Drag & Drop",
    description:
      "Drag values to correct categories/buckets. Great for classification tasks.",
    category: "practical",
  },
  hotspot: {
    label: "Hotspot/Image Click",
    description:
      "Click on correct areas of an image. Ideal for diagram and interface-based questions.",
    category: "practical",
  },
  dropdown: {
    label: "Dropdown Selection",
    description:
      "Select one answer from a dropdown list. Compact format for many options.",
    category: "conceptual",
  },
  casestudy: {
    label: "Case Study",
    description:
      "Complex scenario with multiple related questions. Tests integrated knowledge.",
    category: "practical",
  },
};

export interface Option {
  id: string;
  text: string;
}

export interface OrderingStep {
  id: string;
  text: string;
  order?: number;
}

export interface DragDropItem {
  id: string;
  text: string;
  correctBucket?: string; // ID del bucket correcto; vacío = distractor
}

export interface DragDropBucket {
  id: string;
  label: string;
}

export interface HotspotArea {
  id: string;
  label: string;
  x: number; // Posición X en %
  y: number; // Posición Y en %
  width: number; // Ancho en %
  height: number; // Alto en %
  correct: boolean;
}

export interface BooleanStatement {
  id: string;
  text: string;
  correct: "true" | "false";
}

export interface CaseStudy {
  id: string;
  title: string;
  description: string;
  scenario: string;
  businessRequirements?: string;
  existingEnvironment?: string;
  problemStatement?: string;
  exhibits?: string; // Text description or supplementary information
  exhibitsImage?: string; // Base64 encoded image
}

export interface Scenario {
  id: string;
  title: string;
  description?: string;
  context?: string; // Additional context/background
  scenarioImage?: string; // Base64 encoded image for same scenario
}

// Hardcoded preamble for all same scenarios
export const SCENARIO_PREAMBLE = `Note: This question is part of a series of questions that present the same scenario. Each question in the series contains a unique solution that might meet the stated goals. Some question sets might have more than one correct solution, while others might not have a correct solution.

After you answer a question in this section, you will NOT be able to return to it. As a result, these questions will not appear in the review screen.`;

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  explanation?: string;
  correctAnswer?: string | string[]; // Para single/multiple/dropdown/boolean
  steps?: OrderingStep[]; // Para ordering
  options?: Option[]; // Para single/multiple/dropdown
  topic?: string;
  category?: string; // Categorización libre
  caseStudyId?: string; // ID del caso de estudio si pertenece a uno
  scenarioId?: string; // ID del scenario compartido (múltiples preguntas pueden compartir mismo scenario)
  questionImage?: string; // Base64 image for tables, diagrams, etc
  // Drag & Drop
  dragDropItems?: DragDropItem[];
  dragDropBuckets?: DragDropBucket[];
  dragDropTemplate?: string; // Plantilla con placeholders: {{bucket-id}}
  // Hotspot
  hotspotImage?: string; // URL de la imagen
  hotspotAreas?: HotspotArea[];
  correctBoxCount?: number; // Cuántos recuadros/puntos se deben seleccionar (limita selecciones)
  // True/False matrix
  booleanStatements?: BooleanStatement[];
}
