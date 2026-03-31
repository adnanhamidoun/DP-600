import React, { useState, useMemo } from "react";
import { Question, QuestionType, QUESTION_TYPE_DESCRIPTIONS } from "../types";
import { useToast } from "./Toast";

interface TrainingBuilderProps {
  questions: Question[];
  onStartTraining: (selectedQuestions: Question[], shuffle: boolean) => void;
  onCancel: () => void;
}

export const TrainingBuilder: React.FC<TrainingBuilderProps> = ({
  questions,
  onStartTraining,
  onCancel,
}) => {
  const toast = useToast();
  const [questionCount, setQuestionCount] = useState(
    Math.min(25, questions.length),
  );
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [filterType, setFilterType] = useState<QuestionType | "all">("all");
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [rangeFrom, setRangeFrom] = useState<string>("");
  const [rangeTo, setRangeTo] = useState<string>("");

  // Extract question numbers from IDs (Q001 -> 1, Q100 -> 100, etc)
  const questionNumbers = useMemo(() => {
    return questions
      .map((q) => {
        const match = q.id.match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);
  }, [questions]);

  const minNumber = questionNumbers.length > 0 ? questionNumbers[0] : 1;
  const maxNumber =
    questionNumbers.length > 0
      ? questionNumbers[questionNumbers.length - 1]
      : 1;

  // Extract unique topics
  const uniqueTopics = useMemo(() => {
    const topics = new Set(questions.map((q) => q.topic).filter(Boolean));
    return Array.from(topics).sort();
  }, [questions]);

  // Get unique types
  const uniqueTypes = useMemo(() => {
    const types = new Set(questions.map((q) => q.type));
    return Array.from(types).sort();
  }, [questions]);

  // Filter questions by range and other criteria
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesType = filterType === "all" || q.type === filterType;
      const matchesTopic = filterTopic === "all" || q.topic === filterTopic;

      // Range filter
      if (rangeFrom || rangeTo) {
        const match = q.id.match(/\d+/);
        const num = match ? parseInt(match[0], 10) : null;
        if (!num) return false;

        const from = rangeFrom ? parseInt(rangeFrom, 10) : minNumber;
        const to = rangeTo ? parseInt(rangeTo, 10) : maxNumber;

        if (num < from || num > to) return false;
      }

      return matchesType && matchesTopic;
    });
  }, [
    questions,
    filterType,
    filterTopic,
    rangeFrom,
    rangeTo,
    minNumber,
    maxNumber,
  ]);

  const selectedCount = Math.min(questionCount, filteredQuestions.length);

  const handleStart = () => {
    if (filteredQuestions.length === 0) {
      toast.error("No hay preguntas disponibles con los filtros seleccionados");
      return;
    }

    if (selectedCount === 0) {
      toast.error("Selecciona al menos 1 pregunta");
      return;
    }

    // Shuffle if needed
    const toUse = [...filteredQuestions];
    if (shuffleQuestions) {
      for (let i = toUse.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [toUse[i], toUse[j]] = [toUse[j], toUse[i]];
      }
    }

    const selectedQuestions = toUse.slice(0, selectedCount);
    toast.success(
      `Iniciando entrenamiento con ${selectedQuestions.length} pregunta${selectedQuestions.length !== 1 ? "s" : ""}`,
    );
    onStartTraining(selectedQuestions, false); // Already shuffled above if needed
  };

  return (
    <div className="app-shell">
      <div className="app-container max-w-2xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between sm:items-center">
          <div>
            <p className="subtle-text mb-1 text-xs uppercase tracking-[0.18em]">
              Configurar Entrenamiento
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold">
              Modo Entrenamiento
            </h1>
          </div>
          <button
            onClick={onCancel}
            className="btn-ghost px-3 py-2 text-sm self-start sm:self-auto"
          >
            ✕
          </button>
        </div>

        {/* Main Panel */}
        <div className="glass-panel p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 mb-6 sm:mb-8">
          {/* Quantity */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="text-lg font-semibold">
                Cantidad de preguntas
              </label>
              <span className="text-2xl font-bold text-teal-300">
                {selectedCount}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={filteredQuestions.length}
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
            <p className="text-xs subtle-text mt-2">
              {filteredQuestions.length} preguntas disponibles con los filtros
              actuales
            </p>
          </div>

          {/* Shuffle Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="w-5 h-5 rounded accent-teal-500"
              />
              <span className="text-base font-semibold">Mezclar preguntas</span>
            </label>
            <p className="text-xs subtle-text mt-2 ml-8">
              {shuffleQuestions
                ? "Las preguntas aparecerán en orden aleatorio"
                : "Las preguntas aparecerán en orden original"}
            </p>
          </div>

          {/* Range Selector */}
          <div className="border-t border-slate-700/50 pt-6">
            <h3 className="font-semibold mb-4">
              Rango de preguntas (opcional)
            </h3>
            <p className="text-xs subtle-text mb-4">
              Selecciona el rango de preguntas disponible: {minNumber} -{" "}
              {maxNumber}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium block mb-2">Desde</label>
                <input
                  type="number"
                  min={minNumber}
                  max={maxNumber}
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  placeholder={`${minNumber}`}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-100 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Hasta</label>
                <input
                  type="number"
                  min={minNumber}
                  max={maxNumber}
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  placeholder={`${maxNumber}`}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-100 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {(rangeFrom || rangeTo) && (
              <p className="text-xs text-teal-300 bg-teal-500/10 px-3 py-2 rounded">
                Rango: {rangeFrom || minNumber} - {rangeTo || maxNumber}
              </p>
            )}
          </div>

          {/* Filters */}
          <div className="border-t border-slate-700/50 pt-6">
            <h3 className="font-semibold mb-4">Filtros (opcional)</h3>

            {/* Type Filter */}
            <div className="mb-4">
              <label className="text-sm font-medium block mb-2">
                Tipo de pregunta
              </label>
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType((e.target.value as any) || "all")
                }
                className="w-full px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-100 text-sm focus:outline-none focus:border-teal-500"
              >
                <option value="all">Todas</option>
                {uniqueTypes.map((type) => (
                  <option key={type} value={type}>
                    {QUESTION_TYPE_DESCRIPTIONS[type as QuestionType]?.label ||
                      type}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Filter */}
            {uniqueTopics.length > 0 && (
              <div>
                <label className="text-sm font-medium block mb-2">Tema</label>
                <select
                  value={filterTopic}
                  onChange={(e) => setFilterTopic(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-100 text-sm focus:outline-none focus:border-teal-500"
                >
                  <option value="all">Todos</option>
                  {uniqueTopics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="glass-panel p-4 sm:p-6 mb-6 sm:mb-8 grid grid-cols-2 lg:grid-cols-4 gap-3 text-center text-sm">
          <div>
            <p className="subtle-text text-xs mb-1">Rango</p>
            <p className="text-lg font-bold text-slate-100">
              {rangeFrom || minNumber} - {rangeTo || maxNumber}
            </p>
          </div>
          <div>
            <p className="subtle-text text-xs mb-1">Disponible</p>
            <p className="text-lg font-bold text-slate-100">
              {filteredQuestions.length}
            </p>
          </div>
          <div>
            <p className="subtle-text text-xs mb-1">A entrenar</p>
            <p className="text-lg font-bold text-teal-300">{selectedCount}</p>
          </div>
          <div>
            <p className="subtle-text text-xs mb-1">Modo</p>
            <p className="text-lg font-semibold text-slate-100">
              {shuffleQuestions ? "Aleatorio" : "Orden"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={onCancel} className="btn-ghost w-full sm:w-auto">
            Cancelar
          </button>
          <button
            onClick={handleStart}
            className="btn-primary w-full sm:w-auto"
          >
            Iniciar Entrenamiento
          </button>
        </div>
      </div>
    </div>
  );
};
