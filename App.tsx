/**
 * Prompt para pegar en el chat de Copilot:
 *
 * "Actúa como un desarrollador Senior de React. Quiero crear una aplicación de simulación de exámenes para la certificación DP-600.
 *
 * Genera una interfaz moderna con Tailwind CSS que incluya un 'Dashboard' para ver el progreso por áreas.
 *
 * Crea un componente 'ExamEngine' que reciba un JSON de preguntas. Debe soportar: selección única, selección múltiple y ordenamiento de pasos.
 *
 * Implementa un 'Review Mode' para ver solo las preguntas falladas almacenadas en LocalStorage.
 *
 * Haz que el diseño sea minimalista, oscuro (dark mode) y sin distracciones, enfocado en el código y el texto técnico."
 */

import React from "react";

const copilotPrompt = `Actúa como un desarrollador Senior de React. Quiero crear una aplicación de simulación de exámenes para la certificación DP-600.

Genera una interfaz moderna con Tailwind CSS que incluya un 'Dashboard' para ver el progreso por áreas.

Crea un componente 'ExamEngine' que reciba un JSON de preguntas. Debe soportar: selección única, selección múltiple y ordenamiento de pasos.

Implementa un 'Review Mode' para ver solo las preguntas falladas almacenadas en LocalStorage.

Haz que el diseño sea minimalista, oscuro (dark mode) y sin distracciones, enfocado en el código y el texto técnico.`;

export default function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-2xl font-semibold mb-4">Prompt para Copilot</h1>
      <p className="mb-4 text-sm text-gray-300">El prompt está incluido abajo; cópialo y pégalo en el chat de Copilot.</p>
      <pre className="whitespace-pre-wrap bg-gray-800 p-4 rounded-md text-sm leading-relaxed">
{copilotPrompt}
      </pre>
    </div>
  );
}
