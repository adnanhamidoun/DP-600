# DP-600 Exam Simulator 📚

Aplicación de simulación de exámenes para la certificación **Power BI Engineer (DP-600)** construida con **React**, **TypeScript** y **Tailwind CSS**.

## 🎯 Características

### 📊 Dashboard
- Vista general del progreso por áreas de estudio
- Estadísticas de sesiones completadas
- Puntuación promedio y preguntas falladas
- Acceso rápido a examen y revisión de falladas

### 🧪 Motor de examen (ExamEngine)
Soporta tres tipos de preguntas:
- **Selección única**: Un solo respuesta correcta
- **Selección múltiple**: Múltiples respuestas correctas
- **Ordenamiento de pasos**: Reorganizar pasos en orden correcto

Características:
- Navegación flexible entre preguntas
- Indicadores de dificultad (Fácil, Medio, Difícil)
- Barra de progreso en tiempo real
- Almacenamiento temporal de respuestas

### 🔄 Review Mode
- Ver solo las preguntas falladas
- Mostrar respuesta correcta con explicación
- Eliminar preguntas de la lista de revisión
- Limpiar todas las preguntas falladas de una vez

### 💾 Persistencia con LocalStorage
- Almacenamiento de sesiones completadas
- Historial de preguntas falladas
- Recuperación automática de estado

### 🌙 Tema Oscuro Minimalista
- Diseño dark mode por defecto
- Enfocado en legibilidad y técnico
- Sin distracciones visuales
- Scrollbars personalizadas

## 📁 Estructura del proyecto

```
DP-600/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx       # Vista principal con progreso
│   │   ├── ExamEngine.tsx      # Motor de examen
│   │   └── ReviewMode.tsx      # Revisión de preguntas falladas
│   ├── data/
│   │   └── questions.ts        # Banco de preguntas
│   ├── utils/
│   │   └── storage.ts          # Utilidades de LocalStorage
│   ├── types.ts                # Tipos TypeScript
│   ├── App.tsx                 # Componente principal
│   ├── main.tsx                # Punto de entrada React
│   └── index.css               # Estilos Tailwind
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── README.md
```

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Ejecutar en desarrollo
```bash
npm run dev
```
La aplicación se abrirá en `http://localhost:3000`

### 3. Compilar para producción
```bash
npm run build
```

### 4. Preview de producción
```bash
npm run preview
```

## 🔧 Tecnologías

- **React 18**: Librería UI
- **TypeScript**: Type safety
- **Tailwind CSS**: Estilos minimalistas
- **Vite**: Build tool y dev server
- **LocalStorage API**: Persistencia de datos

## 💡 Uso

### 1. Dashboard
- Ve tu progreso general
- Haz clic en "Comenzar examen" para iniciar
- Si tienes preguntas falladas, puedes revisarlas con el botón "Revisar preguntas falladas"

### 2. Examen
- Responde cada pregunta (selección única, múltiple u ordenamiento)
- Usa los botones "Anterior" y "Siguiente" para navegar
- El progreso se guarda automáticamente
- Al terminar, haz clic en "Finalizar examen"

### 3. Resultados
- Ve tu puntuación y respuestas correctas
- Observa el feedback del examen
- Revisa las preguntas falladas si lo necesitas

### 4. Revisión
- Accede a las preguntas que fallaste
- Lee la explicación de cada respuesta correcta
- Elimina preguntas individuales o limpia toda la lista

## 📝 Agregar nuevas preguntas

Edita `src/data/questions.ts` y añade preguntas siguiendo este formato:

```typescript
{
  id: 'unique-id',
  type: 'single' | 'multiple' | 'ordering',
  question: 'Tu pregunta aquí',
  options: [
    { id: 'a', text: 'Opción A' },
    { id: 'b', text: 'Opción B' },
  ],
  correctAnswer: 'a', // o ['a', 'b'] para múltiple
  explanation: 'Explicación de la respuesta correcta',
  difficulty: 'easy' | 'medium' | 'hard',
  topic: 'Tema de la pregunta',
}
```

## 🎨 Personalización

### Cambiar colores de tema
Edita `tailwind.config.js` para modificar los colores del tema oscuro.

### Ajustar estilos globales
Modifica `src/index.css` para cambiar estilos generales.

## 📊 Datos almacenados

LocalStorage guarda:
- **`dp600_exam_sessions`**: Array de sesiones completadas
- **`dp600_failed_questions`**: Array de preguntas falladas

Cada vez que completas un examen, las preguntas falladas se agregan automáticamente a esta lista.

## 🧪 Ejemplo de uso

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Abre http://localhost:3000 en tu navegador

# 4. ¡Comienza a practicar!
```

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo licencia MIT.

## 👨‍💻 Desarrollado para

**Certificación DP-600: Power BI Engineer**

---

**Nota**: Agrega más preguntas a `src/data/questions.ts` para un banco de preguntas más completo. Este proyecto es un punto de partida; puedes personalizar y expandir según tus necesidades de estudio.
