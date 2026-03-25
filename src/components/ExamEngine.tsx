import React, { useState } from "react";
import { Question } from "../types";
import {
  OrderingQuestion,
  DragDropQuestion,
  DropdownQuestion,
} from "./QuestionTypes";
import { HotspotExam } from "./HotspotExam";
import { storageUtils } from "../utils/storage";

interface ExamEngineProps {
  questions: Question[];
  mode?: "normal" | "training";
  onComplete: (results: ExamResults) => void;
  onCancel: () => void;
}

export interface ExamResults {
  totalQuestions: number;
  correctAnswers: number;
  failedQuestions: Question[];
  answers: Record<string, unknown>;
  score: number;
  earnedPoints: number;
  totalPoints: number;
}

export const ExamEngine: React.FC<ExamEngineProps> = ({
  questions,
  mode = "normal",
  onComplete,
  onCancel,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  if (questions.length === 0) {
    return (
      <div className="app-shell flex items-center justify-center p-6">
        <div className="glass-panel p-8 text-center max-w-lg w-full">
          <h1 className="text-2xl font-semibold mb-3">No hay preguntas</h1>
          <p className="subtle-text mb-5">
            Carga o crea preguntas para empezar una simulación.
          </p>
          <button onClick={onCancel} className="btn-primary">
            Volver
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const isTrainingMode = mode === "training";

  const getPartialScore = (correctIds: string[], selectedIds: string[]) => {
    if (correctIds.length === 0) return 0;
    const correctSet = new Set(correctIds);
    const selectedSet = new Set(selectedIds);
    let correctSelections = 0;
    let incorrectSelections = 0;

    selectedSet.forEach((id) => {
      if (correctSet.has(id)) {
        correctSelections++;
      } else {
        incorrectSelections++;
      }
    });

    const rawScore =
      (correctSelections - incorrectSelections) / correctIds.length;
    return Math.max(0, Math.min(1, rawScore));
  };

  const calculateQuestionPoints = (question: Question, userAnswer: unknown) => {
    if (question.type === "single" || question.type === "dropdown") {
      return userAnswer === question.correctAnswer ? 1 : 0;
    }

    if (question.type === "boolean") {
      const statements = question.booleanStatements || [];
      const userMap = (userAnswer as Record<string, "true" | "false">) || {};
      if (statements.length === 0) return 0;
      const correct = statements.filter(
        (s) => userMap[s.id] === s.correct,
      ).length;
      return correct / statements.length;
    }

    if (question.type === "multiple") {
      const correctIds = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : question.correctAnswer
          ? [question.correctAnswer]
          : [];
      const selectedIds = Array.isArray(userAnswer)
        ? (userAnswer as string[])
        : [];
      return getPartialScore(correctIds, selectedIds);
    }

    if (question.type === "ordering") {
      const correctOrder = question.steps?.map((s) => s.id).join(",");
      const userOrder = (userAnswer as any)?.map((s: any) => s.id).join(",");
      return correctOrder === userOrder ? 1 : 0;
    }

    if (question.type === "dragdrop") {
      const userAssignments = (userAnswer as Record<string, string>) || {};
      const items = question.dragDropItems || [];
      const requiredItems = items.filter((item) => !!item.correctBucket);
      const distractorItems = items.filter((item) => !item.correctBucket);

      const correctPlacements = requiredItems.filter(
        (item) => userAssignments[item.id] === item.correctBucket,
      ).length;
      const incorrectRequiredPlacements = requiredItems.filter(
        (item) =>
          userAssignments[item.id] !== undefined &&
          userAssignments[item.id] !== item.correctBucket,
      ).length;
      const usedDistractors = distractorItems.filter(
        (item) => userAssignments[item.id] !== undefined,
      ).length;

      const denominator = Math.max(requiredItems.length, 1);
      const rawScore =
        (correctPlacements - incorrectRequiredPlacements - usedDistractors) /
        denominator;
      return Math.max(0, Math.min(1, rawScore));
    }

    if (question.type === "hotspot") {
      const selectedIds = (userAnswer as string[]) || [];
      const correctIds =
        question.hotspotAreas?.filter((a) => a.correct).map((a) => a.id) || [];
      return getPartialScore(correctIds, selectedIds);
    }

    if (question.type === "casestudy") {
      return JSON.stringify(userAnswer) ===
        JSON.stringify(question.correctAnswer)
        ? 1
        : 0;
    }

    return 0;
  };

  const hasAnswer = (question: Question, userAnswer: unknown) => {
    if (userAnswer === undefined || userAnswer === null) return false;

    if (question.type === "multiple" || question.type === "hotspot") {
      return Array.isArray(userAnswer) && userAnswer.length > 0;
    }

    if (question.type === "dragdrop") {
      return (
        typeof userAnswer === "object" &&
        userAnswer !== null &&
        Object.keys(userAnswer as Record<string, string>).length > 0
      );
    }

    if (question.type === "boolean") {
      const map = (userAnswer as Record<string, "true" | "false">) || {};
      return Object.keys(map).length > 0;
    }

    return true;
  };

  const getCorrectAnswerText = (question: Question) => {
    if (question.type === "single" || question.type === "dropdown") {
      const id =
        typeof question.correctAnswer === "string"
          ? question.correctAnswer
          : "";
      const option = question.options?.find((o) => o.id === id);
      return option?.text || "No definida";
    }

    if (question.type === "multiple") {
      const ids = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : question.correctAnswer
          ? [question.correctAnswer]
          : [];
      const labels = ids
        .map((id) => question.options?.find((o) => o.id === id)?.text || id)
        .filter(Boolean);
      return labels.length > 0 ? labels.join(" | ") : "No definida";
    }

    if (question.type === "boolean") {
      const statements = question.booleanStatements || [];
      if (statements.length === 0) return "No definida";
      return statements
        .map((s) => `${s.text}: ${s.correct === "true" ? "Yes" : "No"}`)
        .join(" | ");
    }

    if (question.type === "ordering") {
      const ordered = question.steps || [];
      if (ordered.length === 0) return "No definida";
      return ordered.map((s) => s.text).join(" -> ");
    }

    if (question.type === "dragdrop") {
      const items = question.dragDropItems || [];
      const buckets = question.dragDropBuckets || [];
      const mappings = items
        .filter((item) => !!item.correctBucket)
        .map((item) => {
          const bucketLabel =
            buckets.find((b) => b.id === item.correctBucket)?.label ||
            item.correctBucket;
          return `${item.text} -> ${bucketLabel}`;
        });
      return mappings.length > 0 ? mappings.join(" | ") : "No definida";
    }

    if (question.type === "hotspot") {
      const areas = question.hotspotAreas?.filter((a) => a.correct) || [];
      return areas.length > 0
        ? areas.map((a) => a.label || a.id).join(" | ")
        : "No definida";
    }

    return "No definida";
  };

  const currentUserAnswer = answers[currentQuestion.id];
  const currentHasAnswer = hasAnswer(currentQuestion, currentUserAnswer);
  const currentPoints = calculateQuestionPoints(
    currentQuestion,
    currentUserAnswer,
  );
  const currentIsPerfect = currentPoints === 1;

  // Obtener el case study si la pregunta pertenece a uno
  const caseStudy = currentQuestion.caseStudyId
    ? storageUtils
        .getCaseStudies()
        .find((c) => c.id === currentQuestion.caseStudyId)
    : null;

  const handleSingleSelect = (optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  const handleMultipleSelect = (optionId: string) => {
    setAnswers((prev) => {
      const current = (prev[currentQuestion.id] as string[]) || [];
      const newAnswers = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return {
        ...prev,
        [currentQuestion.id]: newAnswers,
      };
    });
  };

  const handleAnswer = (value: unknown) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleBooleanStatementAnswer = (
    statementId: string,
    value: "true" | "false",
  ) => {
    setAnswers((prev) => {
      const current =
        (prev[currentQuestion.id] as Record<string, "true" | "false">) || {};
      return {
        ...prev,
        [currentQuestion.id]: {
          ...current,
          [statementId]: value,
        },
      };
    });
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    const failedQuestions: Question[] = [];
    let correctCount = 0;
    let earnedPoints = 0;
    let totalPoints = 0;

    questions.forEach((question) => {
      const userAnswer = answers[question.id];
      const points = calculateQuestionPoints(question, userAnswer);

      totalPoints += 1;
      earnedPoints += points;
      const isCorrect = points === 1;

      if (!isCorrect) {
        failedQuestions.push(question);
      } else {
        correctCount++;
      }
    });

    const results: ExamResults = {
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      failedQuestions,
      answers,
      score:
        totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0,
      earnedPoints,
      totalPoints,
    };

    onComplete(results);
  };

  return (
    <div className="app-shell">
      <div className="app-container max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <p className="subtle-text mb-1 text-xs uppercase tracking-[0.18em]">
              {isTrainingMode ? "Entrenamiento" : "Simulacion"}
            </p>
            <h1 className="text-3xl font-semibold mb-1">DP-600 Exam</h1>
            <p className="subtle-text">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          <button onClick={onCancel} className="btn-ghost px-3 py-2 text-sm">
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="progress-track h-1.5">
            <div
              className="progress-fill h-1.5"
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Case Study */}
        {caseStudy && (
          <div className="glass-panel p-6 mb-6 space-y-4">
            <h3 className="text-xl font-semibold">
              Case Study: {caseStudy.title}
            </h3>

            {caseStudy.description && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Description
                </p>
                <p className="text-sm">{caseStudy.description}</p>
              </div>
            )}

            {caseStudy.scenario && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Scenario
                </p>
                <p className="text-sm">{caseStudy.scenario}</p>
              </div>
            )}

            {caseStudy.businessRequirements && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Business Requirements
                </p>
                <p className="text-sm">{caseStudy.businessRequirements}</p>
              </div>
            )}

            {caseStudy.existingEnvironment && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Existing Environment
                </p>
                <p className="text-sm">{caseStudy.existingEnvironment}</p>
              </div>
            )}

            {caseStudy.problemStatement && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Problem Statement
                </p>
                <p className="text-sm">{caseStudy.problemStatement}</p>
              </div>
            )}

            {caseStudy.exhibits && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Additional Details
                </p>
                <p className="text-sm">{caseStudy.exhibits}</p>
              </div>
            )}

            {caseStudy.exhibitsImage && (
              <div>
                <p className="text-sm font-semibold subtle-text mb-2">
                  Exhibits Image
                </p>
                <img
                  src={caseStudy.exhibitsImage}
                  alt="Case study exhibits"
                  className="max-w-full h-auto rounded-xl border border-slate-600/60"
                />
              </div>
            )}
          </div>
        )}

        {/* Pregunta */}
        <div className="glass-panel p-6 sm:p-8 mb-8">
          {/* Tags */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-900/40 text-cyan-100 border border-cyan-800/60">
              {currentQuestion.type}
            </span>
            {currentQuestion.category && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-100 border border-emerald-800/60">
                {currentQuestion.category}
              </span>
            )}
          </div>

          {/* Enunciado */}
          <h2 className="text-2xl sm:text-3xl font-semibold leading-relaxed mb-8">
            {currentQuestion.question}
          </h2>

          {/* Question Image (if present) */}
          {currentQuestion.questionImage && (
            <div className="mb-8 p-4 rounded-xl border border-slate-700/70 bg-slate-900/35">
              <img
                src={currentQuestion.questionImage}
                alt="Question context"
                className="max-w-full h-auto max-h-96 rounded"
              />
            </div>
          )}

          {/* Respuestas según el tipo */}
          <div className="space-y-4">
            {currentQuestion.type === "single" && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-start p-4 rounded-xl border border-slate-700/70 bg-slate-900/35 hover:bg-slate-800/45 hover:border-slate-500 cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name={currentQuestion.id}
                      value={option.id}
                      checked={answers[currentQuestion.id] === option.id}
                      onChange={() => handleSingleSelect(option.id)}
                      className="w-5 h-5 mr-4 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-base leading-relaxed">
                      {option.text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === "multiple" && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-start p-4 rounded-xl border border-slate-700/70 bg-slate-900/35 hover:bg-slate-800/45 hover:border-slate-500 cursor-pointer transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={
                        (answers[currentQuestion.id] as string[])?.includes(
                          option.id,
                        ) || false
                      }
                      onChange={() => handleMultipleSelect(option.id)}
                      className="w-5 h-5 mr-4 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-base leading-relaxed">
                      {option.text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === "dropdown" && currentQuestion.options && (
              <DropdownQuestion
                options={currentQuestion.options}
                onChange={handleSingleSelect}
                currentAnswer={answers[currentQuestion.id] as string}
              />
            )}

            {currentQuestion.type === "boolean" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-slate-700/70 rounded-xl overflow-hidden">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">
                        Statements
                      </th>
                      <th className="p-3 font-semibold text-center">Yes</th>
                      <th className="p-3 font-semibold text-center">No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentQuestion.booleanStatements || []).map(
                      (statement) => {
                        const answerMap =
                          (answers[currentQuestion.id] as Record<
                            string,
                            "true" | "false"
                          >) || {};
                        return (
                          <tr
                            key={statement.id}
                            className="border-t border-slate-700/60"
                          >
                            <td className="p-3">{statement.text}</td>
                            <td className="p-3 text-center">
                              <input
                                type="radio"
                                name={`${currentQuestion.id}-${statement.id}`}
                                checked={answerMap[statement.id] === "true"}
                                onChange={() =>
                                  handleBooleanStatementAnswer(
                                    statement.id,
                                    "true",
                                  )
                                }
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="radio"
                                name={`${currentQuestion.id}-${statement.id}`}
                                checked={answerMap[statement.id] === "false"}
                                onChange={() =>
                                  handleBooleanStatementAnswer(
                                    statement.id,
                                    "false",
                                  )
                                }
                              />
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {currentQuestion.type === "ordering" && currentQuestion.steps && (
              <OrderingQuestion
                steps={currentQuestion.steps}
                onChange={(steps) => handleAnswer(steps)}
                currentAnswer={answers[currentQuestion.id] as any}
              />
            )}

            {currentQuestion.type === "dragdrop" &&
              currentQuestion.dragDropItems &&
              currentQuestion.dragDropBuckets && (
                <DragDropQuestion
                  items={currentQuestion.dragDropItems}
                  buckets={currentQuestion.dragDropBuckets}
                  template={currentQuestion.dragDropTemplate}
                  onChange={(assignments) => handleAnswer(assignments)}
                  currentAnswer={
                    answers[currentQuestion.id] as Record<string, string>
                  }
                />
              )}

            {currentQuestion.type === "hotspot" &&
              currentQuestion.hotspotAreas && (
                <div className="space-y-4">
                  <HotspotExam
                    key={currentQuestion.id}
                    areas={currentQuestion.hotspotAreas}
                    imageBase64={currentQuestion.hotspotImage || ""}
                    onChange={(selectedIds: string[]) =>
                      handleAnswer(selectedIds)
                    }
                    currentAnswer={answers[currentQuestion.id] as string[]}
                    maxSelections={currentQuestion.correctBoxCount}
                  />
                </div>
              )}
          </div>

          {isTrainingMode && currentHasAnswer && (
            <div
              className={`mt-6 rounded-xl border p-4 ${
                currentIsPerfect
                  ? "border-emerald-500/50 bg-emerald-900/20"
                  : "border-rose-500/50 bg-rose-900/20"
              }`}
            >
              <p className="font-semibold mb-1">
                {currentIsPerfect
                  ? "Correcto"
                  : currentPoints > 0
                    ? "Parcialmente correcto"
                    : "Incorrecto"}
              </p>
              <p className="text-sm subtle-text mb-2">
                Puntos en esta pregunta: {(currentPoints * 100).toFixed(0)}%
              </p>
              {!currentIsPerfect && (
                <p className="text-sm">
                  Respuesta esperada: {getCorrectAnswerText(currentQuestion)}
                </p>
              )}
              {currentQuestion.explanation && (
                <p className="text-sm subtle-text mt-2">
                  Explicacion: {currentQuestion.explanation}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <div className="flex gap-4">
            {!isLastQuestion ? (
              <button onClick={handleNext} className="btn-primary">
                Next →
              </button>
            ) : (
              <button onClick={handleFinish} className="btn-secondary">
                Finish Exam
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
