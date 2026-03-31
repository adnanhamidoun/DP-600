import React, { useEffect, useState } from "react";
import {
  OrderingStep,
  DragDropItem,
  DragDropBucket,
  HotspotArea,
} from "../types";

// Ordenamiento
interface OrderingQuestionProps {
  steps: OrderingStep[];
  onChange: (steps: OrderingStep[]) => void;
  currentAnswer?: OrderingStep[];
}

export const OrderingQuestion: React.FC<OrderingQuestionProps> = ({
  steps,
  onChange,
  currentAnswer,
}) => {
  const [orderedSteps, setOrderedSteps] = useState<OrderingStep[]>(
    currentAnswer || steps.map((s, i) => ({ ...s, order: i + 1 })),
  );
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    const newSteps = [...orderedSteps];
    const draggedStep = newSteps[draggedItem];
    newSteps.splice(draggedItem, 1);
    newSteps.splice(index, 0, draggedStep);
    setOrderedSteps(newSteps);
    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    onChange(orderedSteps);
  };

  return (
    <div className="space-y-2">
      {orderedSteps.map((step, index) => (
        <div
          key={step.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className="p-3 sm:p-4 border border-slate-700 rounded-xl bg-slate-900/45 cursor-move hover:border-slate-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-teal-300">{index + 1}</span>
            <span>{step.text}</span>
          </div>
        </div>
      ))}
      <p className="text-xs subtle-text mt-4">
        Arrastra para reordenar los pasos.
      </p>
    </div>
  );
};

// Drag & Drop
interface DragDropQuestionProps {
  items: DragDropItem[];
  buckets: DragDropBucket[];
  onChange: (assignments: Record<string, string>) => void;
  currentAnswer?: Record<string, string>;
  template?: string;
  readOnly?: boolean;
}

export const DragDropQuestion: React.FC<DragDropQuestionProps> = ({
  items,
  buckets,
  onChange,
  currentAnswer,
  template,
  readOnly = false,
}) => {
  const [assignments, setAssignments] = useState<Record<string, string>>(
    currentAnswer || {},
  );
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  useEffect(() => {
    setAssignments(currentAnswer || {});
  }, [currentAnswer]);

  const handleDragStart = (itemId: string) => {
    if (readOnly) return;
    setDraggedItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
  };

  const assignItemToBucket = (itemId: string, bucketId: string) => {
    const newAssignments = { ...assignments, [itemId]: bucketId };
    // Cada área solo admite 1 valor.
    Object.keys(newAssignments).forEach((assignedItemId) => {
      if (
        assignedItemId !== itemId &&
        newAssignments[assignedItemId] === bucketId
      ) {
        delete newAssignments[assignedItemId];
      }
    });
    setAssignments(newAssignments);
    onChange(newAssignments);
  };

  const handleDropOnBucket = (bucketId: string) => {
    if (readOnly) return;
    if (!draggedItem) return;
    assignItemToBucket(draggedItem, bucketId);
    setDraggedItem(null);
  };

  const handleDropOnPool = () => {
    if (readOnly) return;
    if (!draggedItem) return;
    const newAssignments = { ...assignments };
    delete newAssignments[draggedItem];
    setAssignments(newAssignments);
    onChange(newAssignments);
    setDraggedItem(null);
  };

  const renderSlot = (bucketId: string) => {
    const assignedItem = items.find(
      (item) => assignments[item.id] === bucketId,
    );
    return (
      <span
        key={bucketId}
        onDragOver={handleDragOver}
        onDrop={() => handleDropOnBucket(bucketId)}
        className="inline-flex min-w-24 sm:min-w-32 min-h-10 px-2 py-1 border-2 border-dashed border-teal-500/70 rounded bg-slate-900/70 align-middle"
      >
        {assignedItem ? (
          <span
            draggable={!readOnly}
            onDragStart={() => handleDragStart(assignedItem.id)}
            className={`w-full text-center px-2 py-1 bg-teal-700 text-white rounded ${
              readOnly ? "cursor-default" : "cursor-move"
            }`}
          >
            {assignedItem.text}
          </span>
        ) : (
          <span className="w-full text-center text-xs text-slate-400">
            Drop here
          </span>
        )}
      </span>
    );
  };

  const renderTemplate = () => {
    if (!template) return null;

    const parts: React.ReactNode[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(template)) !== null) {
      const text = template.slice(lastIndex, match.index);
      if (text) {
        parts.push(<span key={`text-${lastIndex}`}>{text}</span>);
      }
      const bucketId = match[1].trim();
      parts.push(renderSlot(bucketId));
      lastIndex = regex.lastIndex;
    }

    const tail = template.slice(lastIndex);
    if (tail) {
      parts.push(<span key={`tail-${lastIndex}`}>{tail}</span>);
    }

    return (
      <pre className="whitespace-pre-wrap font-mono text-sm sm:text-base leading-7 sm:leading-8 bg-slate-900/55 border border-slate-700 rounded-lg p-3 sm:p-4 overflow-x-auto">
        {parts}
      </pre>
    );
  };

  const availableItems = items.filter((item) => !assignments[item.id]);

  return (
    <div className="space-y-4">
      {template ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm font-semibold text-slate-300">
            <div>Values</div>
            <div className="col-span-2">Answer Area</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDropOnPool}
              className="p-3 border border-slate-700 rounded-lg bg-slate-900/55 min-h-40"
            >
              <div className="space-y-2">
                {availableItems.map((item) => (
                  <div
                    key={item.id}
                    draggable={!readOnly}
                    onDragStart={() => handleDragStart(item.id)}
                    className={`px-3 py-2 bg-teal-700 text-white rounded ${
                      readOnly
                        ? "cursor-default"
                        : "cursor-move hover:bg-teal-600"
                    }`}
                  >
                    {item.text}
                  </div>
                ))}
                {availableItems.length === 0 && (
                  <p className="text-xs text-slate-400">No remaining values</p>
                )}
              </div>
            </div>
            <div className="md:col-span-2">{renderTemplate()}</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {buckets.map((bucket) => (
            <div
              key={bucket.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDropOnBucket(bucket.id)}
              className="min-h-32 border-2 border-dashed border-slate-600 rounded-lg p-4 bg-slate-900/45"
            >
              <p className="text-sm font-semibold text-slate-200 mb-3">
                {bucket.label}
              </p>
              <div className="space-y-2">
                {items
                  .filter((item) => assignments[item.id] === bucket.id)
                  .map((item) => (
                    <div
                      key={item.id}
                      draggable={!readOnly}
                      onDragStart={() => handleDragStart(item.id)}
                      className={`p-3 bg-teal-700 text-white rounded ${
                        readOnly
                          ? "cursor-default"
                          : "cursor-move hover:bg-teal-600"
                      }`}
                    >
                      {item.text}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!template && (
        <div className="p-4 border border-slate-700 rounded-lg bg-slate-900/70">
          <p className="text-sm font-semibold text-slate-200 mb-3">
            Elementos disponibles
          </p>
          <div className="flex flex-wrap gap-2">
            {availableItems.map((item) => (
              <div
                key={item.id}
                draggable={!readOnly}
                onDragStart={() => handleDragStart(item.id)}
                className={`px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-200 ${
                  readOnly ? "cursor-default" : "cursor-move hover:bg-slate-700"
                }`}
              >
                {item.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {!readOnly && (
        <p className="text-xs subtle-text">
          Arrastra los elementos hacia los contenedores correctos.
        </p>
      )}
    </div>
  );
};

// Hotspot
interface HotspotQuestionProps {
  areas: HotspotArea[];
  imageUrl?: string;
  onChange: (selectedAreaIds: string[]) => void;
  currentAnswer?: string[];
}

export const HotspotQuestion: React.FC<HotspotQuestionProps> = ({
  areas,
  imageUrl,
  onChange,
  currentAnswer,
}) => {
  const [selected, setSelected] = useState<string[]>(currentAnswer || []);

  const handleAreaClick = (areaId: string) => {
    const newSelected = selected.includes(areaId)
      ? selected.filter((id) => id !== areaId)
      : [...selected, areaId];
    setSelected(newSelected);
    onChange(newSelected);
  };

  return (
    <div className="space-y-4">
      <div className="relative inline-block w-full">
        {imageUrl ? (
          <div className="relative">
            <img
              src={imageUrl}
              alt="Hotspot"
              className="w-full rounded-lg border border-gray-700"
            />
            {areas.map((area) => (
              <button
                key={area.id}
                onClick={() => handleAreaClick(area.id)}
                className={`absolute w-12 h-12 rounded-full border-2 transition-all ${
                  selected.includes(area.id)
                    ? "border-emerald-400 bg-emerald-400 bg-opacity-20"
                    : "border-blue-400 bg-blue-400 bg-opacity-10 hover:bg-opacity-20"
                }`}
                style={{
                  left: `${area.x}%`,
                  top: `${area.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                title={area.label}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 bg-gray-800 border border-gray-700 rounded-lg text-center text-gray-400">
            No hay imagen disponible
          </div>
        )}
      </div>

      {/* Lista de hotspots */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-300">Áreas</p>
        {areas.map((area) => (
          <label
            key={area.id}
            className="flex items-center gap-2 p-3 border border-gray-700 rounded-lg hover:bg-gray-800 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(area.id)}
              onChange={() => handleAreaClick(area.id)}
              className="w-4 h-4"
            />
            <span>{area.label}</span>
          </label>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        💡 Haz clic en los puntos o selecciona las áreas correctas
      </p>
    </div>
  );
};

// Desplegable
interface DropdownQuestionProps {
  options: Array<{ id: string; text: string }>;
  onChange: (selectedId: string) => void;
  currentAnswer?: string;
}

export const DropdownQuestion: React.FC<DropdownQuestionProps> = ({
  options,
  onChange,
  currentAnswer,
}) => {
  return (
    <select
      value={currentAnswer || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-gray-100 text-base"
    >
      <option value="">Selecciona una opción...</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.text}
        </option>
      ))}
    </select>
  );
};

// Caso de estudio
interface CaseStudyQuestionProps {
  scenario: string;
  questions: Array<{
    id: string;
    question: string;
    options: Array<{ id: string; text: string }>;
  }>;
  onChange: (answers: Record<string, string>) => void;
  currentAnswer?: Record<string, string>;
}

export const CaseStudyQuestion: React.FC<CaseStudyQuestionProps> = ({
  scenario,
  questions,
  onChange,
  currentAnswer,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>(
    currentAnswer || {},
  );

  const handleAnswer = (qId: string, optionId: string) => {
    const newAnswers = { ...answers, [qId]: optionId };
    setAnswers(newAnswers);
    onChange(newAnswers);
  };

  return (
    <div className="space-y-6">
      {/* Escenario */}
      <div className="p-4 bg-blue-900 bg-opacity-20 border border-blue-600 rounded-lg">
        <p className="text-gray-200">{scenario}</p>
      </div>

      {/* Preguntas del caso */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-2">
            <p className="font-semibold text-gray-200">
              Pregunta {idx + 1}: {q.question}
            </p>
            <div className="space-y-2 ml-4">
              {q.options.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 p-3 border border-gray-700 rounded hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={opt.id}
                    checked={answers[q.id] === opt.id}
                    onChange={() => handleAnswer(q.id, opt.id)}
                    className="w-4 h-4"
                  />
                  <span>{opt.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
