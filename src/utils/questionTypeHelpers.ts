import { QuestionType, QUESTION_TYPE_DESCRIPTIONS } from "../types";

export const getQuestionTypeLabel = (type: QuestionType): string => {
  return QUESTION_TYPE_DESCRIPTIONS[type]?.label || type;
};

export const getQuestionTypeDescription = (type: QuestionType): string => {
  return QUESTION_TYPE_DESCRIPTIONS[type]?.description || "";
};

export const getQuestionTypeCategory = (
  type: QuestionType,
): "conceptual" | "practical" => {
  return QUESTION_TYPE_DESCRIPTIONS[type]?.category || "conceptual";
};

export const getConceptualTypes = (): QuestionType[] => {
  return Object.entries(QUESTION_TYPE_DESCRIPTIONS)
    .filter(([_, { category }]) => category === "conceptual")
    .map(([type]) => type as QuestionType);
};

export const getPracticalTypes = (): QuestionType[] => {
  return Object.entries(QUESTION_TYPE_DESCRIPTIONS)
    .filter(([_, { category }]) => category === "practical")
    .map(([type]) => type as QuestionType);
};
