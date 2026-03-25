// Tipos de preguntas
export type QuestionType =
  | "single"
  | "multiple"
  | "boolean"
  | "ordering"
  | "dragdrop"
  | "hotspot"
  | "dropdown"
  | "casestudy";

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

export interface ExamSession {
  sessionId: string;
  startDate: string;
  totalQuestions: number;
  correctAnswers: number;
  failedQuestions: Question[];
  answers: Record<string, unknown>;
}

export interface TopicProgress {
  topic: string;
  total: number;
  correct: number;
  percentage: number;
}
