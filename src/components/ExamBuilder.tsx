import React, { useState, useMemo } from "react";
import {
  Question,
  Scenario,
  QuestionType,
  QUESTION_TYPE_DESCRIPTIONS,
} from "../types";
import { useToast, ToastContainer } from "./Toast";

export interface ExamBuildOptions {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

interface ExamBuilderProps {
  questions: Question[];
  scenarios: Scenario[];
  onBuildExam: (
    selectedQuestions: Question[],
    options: ExamBuildOptions,
  ) => void;
  onCancel: () => void;
}

export const ExamBuilder: React.FC<ExamBuilderProps> = ({
  questions,
  scenarios,
  onBuildExam,
  onCancel,
}) => {
  const toast = useToast();
  const [examTitle, setExamTitle] = useState("Mi examen personalizado");
  const [targetQuestionCount, setTargetQuestionCount] = useState(25);
  const [shuffleQuestionsOnBuild, setShuffleQuestionsOnBuild] = useState(true);
  const [shuffleOptionsOnBuild, setShuffleOptionsOnBuild] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [filterType, setFilterType] = useState<QuestionType | "all">("all");
  const [filterScenario, setFilterScenario] = useState<string>("all");
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  // Extract unique topics
  const uniqueTopics = useMemo(() => {
    const topics = new Set(questions.map((q) => q.topic).filter(Boolean));
    return Array.from(topics).sort();
  }, [questions]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesType = filterType === "all" || q.type === filterType;
      const matchesScenario =
        filterScenario === "all"
          ? true
          : filterScenario === "none"
            ? !q.scenarioId
            : q.scenarioId === filterScenario;
      const matchesTopic = filterTopic === "all" || q.topic === filterTopic;
      const matchesSearch =
        searchText === "" ||
        q.question.toLowerCase().includes(searchText.toLowerCase()) ||
        q.id.toLowerCase().includes(searchText.toLowerCase());

      return matchesType && matchesScenario && matchesTopic && matchesSearch;
    });
  }, [questions, filterType, filterScenario, filterTopic, searchText]);

  const handleToggleQuestion = (questionId: string) => {
    const newSelected = new Set(selectedQuestionIds);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestionIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedQuestionIds.size === filteredQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(filteredQuestions.map((q) => q.id)));
    }
  };

  const handleBuild = () => {
    if (selectedQuestionIds.size === 0) {
      toast.error("Selecciona al menos una pregunta");
      return;
    }

    const selectedQuestions = questions.filter((q) =>
      selectedQuestionIds.has(q.id),
    );

    toast.success(
      `Examen '${examTitle}' creado con ${selectedQuestions.length} preguntas`,
    );

    onBuildExam(selectedQuestions, {
      shuffleQuestions: shuffleQuestionsOnBuild,
      shuffleOptions: shuffleOptionsOnBuild,
    });
  };

  const handleAutoSelect = () => {
    if (filteredQuestions.length === 0) {
      toast.error("No hay preguntas con los filtros actuales");
      return;
    }

    const safeTarget = Math.max(1, Math.min(targetQuestionCount, 200));
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(safeTarget, shuffled.length));

    setSelectedQuestionIds(new Set(picked.map((q) => q.id)));
    toast.success(`Seleccionadas ${picked.length} preguntas automaticamente`);
  };

  const handleClearSelection = () => {
    setSelectedQuestionIds(new Set());
  };

  const selectedCount = selectedQuestionIds.size;
  const isAllSelected =
    selectedCount === filteredQuestions.length && filteredQuestions.length > 0;

  return (
    <div className="app-shell">
      <ToastContainer />
      <div className="app-container max-w-7xl">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between sm:items-center mb-6 sm:mb-8">
          <div>
            <p className="subtle-text mb-1 text-xs uppercase tracking-[0.18em]">
              Exam Builder
            </p>
            <h1 className="text-3xl font-semibold">
              Panel de Examen Personalizado
            </h1>
            <p className="subtle-text mt-2 text-sm">
              Filtra por topico y tipo, selecciona preguntas y empieza a
              practicar en segundos.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="btn-ghost self-start sm:self-auto"
          >
            Volver
          </button>
        </div>

        <div className="glass-panel p-4 sm:p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold subtle-text mb-2 uppercase">
              Nombre del examen
            </label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
              placeholder="Ej. Simulacro SQL + DAX"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold subtle-text mb-2 uppercase">
              Objetivo preguntas
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={targetQuestionCount}
              onChange={(e) =>
                setTargetQuestionCount(
                  Math.max(1, Math.min(200, Number(e.target.value) || 1)),
                )
              }
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <div className="space-y-2 text-sm subtle-text">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={shuffleQuestionsOnBuild}
                  onChange={(e) => setShuffleQuestionsOnBuild(e.target.checked)}
                />
                Mezclar preguntas
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={shuffleOptionsOnBuild}
                  onChange={(e) => setShuffleOptionsOnBuild(e.target.checked)}
                />
                Mezclar opciones
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters & Controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-panel p-6">
              <h2 className="text-lg font-semibold mb-1">Paso 1: Filtra</h2>
              <p className="subtle-text text-xs mb-6">
                Reduce la lista para quedarte solo con las preguntas relevantes.
              </p>

              {/* Search */}
              <div className="mb-6">
                <label className="block text-xs font-semibold mb-2 uppercase">
                  Buscar
                </label>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Texto de pregunta o ID..."
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                />
              </div>

              {/* Type Filter */}
              <div className="mb-6">
                <label className="block text-xs font-semibold mb-2 uppercase">
                  Tipo de pregunta
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                >
                  <option value="all">Todos los tipos</option>
                  {Object.entries(QUESTION_TYPE_DESCRIPTIONS).map(
                    ([type, { label }]) => (
                      <option key={type} value={type}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* Scenario Filter */}
              {scenarios.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs font-semibold mb-2 uppercase">
                    Escenario
                  </label>
                  <select
                    value={filterScenario}
                    onChange={(e) => setFilterScenario(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                  >
                    <option value="all">Todos los escenarios</option>
                    <option value="none">Sin escenario</option>
                    {scenarios.map((scn) => (
                      <option key={scn.id} value={scn.id}>
                        {scn.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Topic Filter */}
              {uniqueTopics.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs font-semibold mb-2 uppercase">
                    Topico
                  </label>
                  <select
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
                  >
                    <option value="all">Todos los topicos</option>
                    {uniqueTopics.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Results Summary */}
              <div className="pt-4 border-t border-slate-700">
                <p className="text-xs subtle-text mb-2">
                  Mostrando {filteredQuestions.length} de {questions.length}{" "}
                  preguntas
                </p>
                <p className="text-sm font-semibold text-teal-300">
                  Seleccionadas: {selectedCount}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="glass-panel p-4 space-y-2">
              <p className="text-sm font-semibold">Paso 2: Selecciona</p>
              <button
                onClick={handleSelectAll}
                className="btn-secondary w-full text-sm"
              >
                {isAllSelected ? "Deseleccionar todo" : "Seleccionar todo"}
              </button>
              <button
                onClick={handleAutoSelect}
                className="btn-secondary w-full text-sm"
              >
                Auto-seleccionar por filtros ({targetQuestionCount})
              </button>
              <button
                onClick={handleClearSelection}
                className="btn-ghost w-full text-sm"
              >
                Limpiar seleccion
              </button>
            </div>

            <div className="glass-panel p-4 space-y-2">
              <p className="text-sm font-semibold">Paso 3: Genera</p>
              <button
                onClick={handleBuild}
                disabled={selectedCount === 0}
                className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Empezar examen ({selectedCount})
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="lg:col-span-3">
            <div className="glass-panel p-6">
              <h2 className="text-lg font-semibold mb-4">
                Preguntas ({filteredQuestions.length})
              </h2>

              {filteredQuestions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="subtle-text">
                    No hay preguntas con estos filtros
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredQuestions.map((q) => {
                    const isSelected = selectedQuestionIds.has(q.id);
                    const scenarioTitle = q.scenarioId
                      ? scenarios.find((s) => s.id === q.scenarioId)?.title
                      : null;

                    return (
                      <div
                        key={q.id}
                        onClick={() => handleToggleQuestion(q.id)}
                        className={`p-4 rounded border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "bg-teal-900/30 border-teal-500"
                            : "bg-slate-900/45 border-slate-700 hover:border-slate-500"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-5 h-5 rounded"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-teal-300">
                                {q.id}
                              </span>
                              <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">
                                {QUESTION_TYPE_DESCRIPTIONS[q.type]?.label ||
                                  q.type}
                              </span>
                              {scenarioTitle && (
                                <span className="text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded">
                                  {scenarioTitle}
                                </span>
                              )}
                              {q.topic && (
                                <span className="text-xs subtle-text">
                                  {q.topic}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap break-words line-clamp-3">
                              {q.question}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
