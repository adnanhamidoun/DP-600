import React, { useState, useEffect } from "react";
import { storageUtils } from "../utils/storage";
import { Question } from "../types";

interface ReviewModeProps {
  onBack: () => void;
}

export const ReviewMode: React.FC<ReviewModeProps> = ({ onBack }) => {
  const [failedQuestions, setFailedQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const failed = storageUtils.getFailedQuestions();
    setFailedQuestions(failed);
  }, []);

  if (failedQuestions.length === 0) {
    return (
      <div className="app-shell flex items-center justify-center p-6">
        <div className="glass-panel p-8 text-center max-w-xl w-full">
          <h1 className="text-3xl font-semibold mb-4">Perfecto</h1>
          <p className="subtle-text mb-8">
            No hay preguntas falladas para revisar.
          </p>
          <button onClick={onBack} className="btn-primary">
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = failedQuestions[currentIndex];

  const handleNext = () => {
    if (currentIndex < failedQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleRemoveQuestion = () => {
    const updated = failedQuestions.filter((_, i) => i !== currentIndex);
    setFailedQuestions(updated);
    storageUtils.saveFailedQuestions(updated);
    if (updated.length > 0) {
      setCurrentIndex(Math.min(currentIndex, updated.length - 1));
    }
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        "¿Estás seguro de que deseas borrar todas las preguntas falladas?",
      )
    ) {
      storageUtils.clearFailedQuestions();
      setFailedQuestions([]);
    }
  };

  return (
    <div className="app-shell">
      <div className="app-container max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <p className="subtle-text mb-1 text-xs uppercase tracking-[0.18em]">
              Review
            </p>
            <h1 className="text-3xl font-semibold mb-2">
              Revisión de preguntas falladas
            </h1>
            <p className="subtle-text">
              Pregunta {currentIndex + 1} de {failedQuestions.length}
            </p>
          </div>
          <button onClick={onBack} className="btn-ghost px-3 py-2 text-sm">
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="progress-track h-1.5">
            <div
              className="progress-fill h-1.5"
              style={{
                width: `${((currentIndex + 1) / failedQuestions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Pregunta */}
        <div className="glass-panel p-8 mb-8">
          <div className="mb-6">
            <div className="flex gap-2 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-900/40 text-cyan-100 border border-cyan-800/60">
                {currentQuestion.type}
              </span>
              {currentQuestion.category && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-100 border border-emerald-800/60">
                  {currentQuestion.category}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold leading-tight mb-4">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Opciones */}
          {(currentQuestion.type === "single" ||
            currentQuestion.type === "multiple") &&
            currentQuestion.options && (
              <div className="space-y-3 mb-8">
                {currentQuestion.options.map((option) => {
                  const isCorrect = Array.isArray(currentQuestion.correctAnswer)
                    ? currentQuestion.correctAnswer.includes(option.id)
                    : currentQuestion.correctAnswer === option.id;

                  return (
                    <div
                      key={option.id}
                      className={`p-4 border-2 rounded-lg ${
                        isCorrect
                          ? "border-emerald-600 bg-emerald-900 bg-opacity-20"
                          : "border-gray-700 bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isCorrect && (
                          <span className="text-emerald-400">✓</span>
                        )}
                        <span>{option.text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          {currentQuestion.type === "boolean" && (
            <div className="mb-8 overflow-x-auto">
              <table className="w-full text-sm border border-slate-700/70 rounded-xl overflow-hidden">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="text-left p-3 font-semibold">Statements</th>
                    <th className="p-3 font-semibold text-center">Yes</th>
                    <th className="p-3 font-semibold text-center">No</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentQuestion.booleanStatements || []).map(
                    (statement) => (
                      <tr
                        key={statement.id}
                        className="border-t border-slate-700/60"
                      >
                        <td className="p-3">{statement.text}</td>
                        <td className="p-3 text-center">
                          {statement.correct === "true" ? "✓" : ""}
                        </td>
                        <td className="p-3 text-center">
                          {statement.correct === "false" ? "✓" : ""}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pasos de ordenamiento */}
          {currentQuestion.type === "ordering" && currentQuestion.steps && (
            <div className="space-y-2 mb-8">
              {currentQuestion.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="p-4 border-2 border-emerald-600 bg-emerald-900 bg-opacity-20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-emerald-400">
                      {index + 1}
                    </span>
                    <span>{step.text}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentQuestion.type === "dragdrop" &&
            currentQuestion.dragDropItems &&
            currentQuestion.dragDropBuckets && (
              <div className="mb-8 space-y-3">
                {currentQuestion.dragDropTemplate ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-7 bg-slate-900/35 border border-slate-700 rounded-lg p-4 overflow-x-auto">
                    {currentQuestion.dragDropTemplate.replace(
                      /\{\{([^}]+)\}\}/g,
                      (_, bucketId) => {
                        const matched = currentQuestion.dragDropItems?.find(
                          (item) => item.correctBucket === bucketId.trim(),
                        );
                        return `[${matched?.text || bucketId.trim()}]`;
                      },
                    )}
                  </pre>
                ) : (
                  <div className="space-y-2">
                    {currentQuestion.dragDropBuckets.map((bucket) => {
                      const matched = currentQuestion.dragDropItems?.find(
                        (item) => item.correctBucket === bucket.id,
                      );
                      return (
                        <div
                          key={bucket.id}
                          className="p-3 bg-gray-800 rounded flex justify-between text-sm"
                        >
                          <span>{bucket.label}</span>
                          <span className="text-emerald-300 font-semibold">
                            {matched?.text || "-"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          {/* Explicación */}
          {currentQuestion.explanation && (
            <div className="bg-blue-900 bg-opacity-20 border border-blue-600 rounded-lg p-4">
              <p className="text-sm text-gray-200">
                <span className="font-semibold text-blue-400">
                  💡 Explicación:
                </span>{" "}
                {currentQuestion.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex justify-between gap-4 mb-8">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-6 py-2 border border-gray-700 rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>

          <div className="flex gap-4">
            <button onClick={handleRemoveQuestion} className="btn-secondary">
              Eliminar
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === failedQuestions.length - 1}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>
        </div>

        {/* Botón para limpiar todo */}
        <button
          onClick={handleClearAll}
          className="btn-ghost w-full border border-rose-500/50 text-rose-200 hover:bg-rose-900/20"
        >
          Limpiar todas las preguntas falladas
        </button>
      </div>
    </div>
  );
};
