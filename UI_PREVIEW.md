# 🎨 UI Preview - Botones y Funcionalidad

## 📍 Ubicación en la Interfaz

### Question Builder - Header

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  Question Builder                                             │
│  150 questions saved          [💾 Export Backup]  [📂 Restore Backup]  [✕]
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔘 Botones en Detalle

### 1. 💾 Export Backup

**Ubicación:** Esquina superior derecha (junto al título)

**Apariencia:**
```
┌─────────────────────┐
│ 💾 Export Backup    │
└─────────────────────┘
Fondo: Gris oscuro (gray-800)
Borde: Gris medio (gray-700)
Texto: Gris claro (gray-200)
Hover: Fondo más oscuro (gray-900)
```

**Al hacer clic:**
1. Recolecta todos los datos de localStorage
2. Crea un archivo ZIP con compresión
3. Descarga automáticamente: `dp600-backup-2026-03-25T14-30-00Z.zip`
4. Muestra toast:
   ```
   ✅ Backup created: 150 questions, 5 cases
   ```

**Tooltip (al pasar mouse):**
```
"Export all questions, cases, and sessions as ZIP"
```

---

### 2. 📂 Restore Backup

**Ubicación:** Junto al botón Export (esquina superior derecha)

**Apariencia:**
```
┌──────────────────────┐
│ 📂 Restore Backup    │
└──────────────────────┘
Fondo: Gris oscuro (gray-800)
Borde: Gris medio (gray-700)
Texto: Gris claro (gray-200)
Hover: Fondo más oscuro (gray-900)
```

**Al hacer clic:**
1. Abre selector de archivos (solo .zip)
2. Usuario selecciona un archivo `.zip`
3. App descomprime el ZIP
4. Lee y procesa los JSON
5. Fusiona datos en localStorage
6. Actualiza UI
7. Muestra toast:
   ```
   ✅ Import successful!
   150 questions
   5 cases
   10 sessions
   ```

**Tooltip (al pasar mouse):**
```
"Import backup ZIP file"
```

---

## 🎬 Screenshots de Interacción

### Estado 1: Vista Normal

```
┌─────────────────────────────────────────────────────────────┐
│ Question Builder                                             │
│ 150 questions saved                                         │
│                          [💾 Export][📂 Restore][✕]        │
└─────────────────────────────────────────────────────────────┘

Grid:
├─ Form (left 2/3)
│  ├─ Question type dropdown
│  ├─ Case study selector
│  ├─ Question textarea
│  ├─ Options/Steps/Drag-Drop inputs
│  └─ Save/Update button
│
└─ Sidebar (right 1/3)
   ├─ Case Studies list
   └─ Saved Questions list
```

---

### Estado 2: Export en Progreso

```
Usuario hace click en: 💾 Export Backup

Loading state (visual):
  → El botón se vuelve ligeramente más opaco
  → Se está recolectando datos
  → Se está comprimiendo

Resultado (< 1 segundo):
  ↓
  📥 Descarga iniciada
  ↓
  dp600-backup-2026-03-25T14-30-00Z.zip (en Downloads)

Toast (verde, arriba derecha):
  ✅ Backup created: 150 questions, 5 cases
     (desaparece después de 3-5 segundos)
```

---

### Estado 3: Restore en Progreso

```
Usuario hace click en: 📂 Restore Backup

Abre file picker:
  ┌────────────────────────────────────┐
  │  Select file...                    │
  │                                    │
  │  Archivos encontrados:             │
  │  📦 dp600-backup-2026-03-25.zip   │
  │  📦 dp600-backup-2026-03-20.zip   │
  │  📦 backup-respaldo.zip           │
  │  📄 config.json (deshabilitado)    │
  │                                    │
  │  [Seleccionar] [Cancelar]         │
  └────────────────────────────────────┘

Usuario selecciona: dp600-backup-2026-03-25.zip

Procesando (1-2 segundos):
  → Descomprimiendo ZIP
  → Leyendo JSON
  → Procesando preguntas
  → Actualizando localStorage
  → Refrescando UI

Toast (verde, arriba derecha):
  ✅ Import successful!
     150 questions
     5 cases
     10 sessions

UI se actualiza:
  - Sidebar muestra preguntas nuevas
  - Caso estudios se agregan a dropdown
  - Contadores se actualizan
```

---

### Estado 4: Error en Import

```
Usuario selecciona archivo: "no-valido.txt"

Error:
  Toast (rojo, arriba derecha):
  ❌ Invalid backup file or format error

Log en consola (F12):
  Error: ZIP format not recognized
```

---

## 📱 Responsive Design

### Desktop (PC)

```
Full width
┌────────────────────────────────────────┐
│ Question Builder               [💾][📂][✕]
├───────────────────┬────────────────────┤
│                   │                    │
│   FORM (2/3)     │  SIDEBAR (1/3)     │
│                   │                    │
│   - Inputs        │  Case Studies      │
│   - Preview       │  Saved Questions   │
│   - Canvas        │                    │
│                   │                    │
└───────────────────┴────────────────────┘
```

### Tablet

```
┌─────────────────────────────────┐
│ Question Builder           [💾][📂][✕]
├─────────────────────────────────┤
│ FORM                            │
├─────────────────────────────────┤
│ SIDEBAR (Scrollable)            │
└─────────────────────────────────┘
```

### Mobile

```
┌──────────────────────┐
│ Question Builder   [✕]
│ [💾] [📂]          │
├──────────────────────┤
│ FORM                 │
│ (scrollable)         │
├──────────────────────┤
│ SIDEBAR              │
│ (scrollable)         │
└──────────────────────┘
```

---

## 🎨 Colores y Estilo

### Botones Export/Import

```
Estado Normal:
  Fondo:    #1f2937 (gray-800)
  Borde:    #374151 (gray-700)
  Texto:    #d1d5db (gray-200)
  Padding:  px-3 py-1
  Font:     text-sm

Hover:
  Fondo:    #111827 (gray-900)
  Cursor:   pointer
  
Focus:
  Outline: 2px solid #3b82f6 (blue-500)

Iconos:
  💾 Export → Emoji disk
  📂 Restore → Emoji folder
  ✕ Close → X character
```

---

## 🔊 Feedback Visual

### Toast Notifications

#### Success (Green)
```
┌─────────────────────────────────────────┐
│ ✅ Backup created: 150 questions, 5 cases
│                                (⊗ close)
└─────────────────────────────────────────┘
Posición: Top-right
Duración: 3-5 segundos
Color: Green (#10b981)
```

#### Error (Red)
```
┌─────────────────────────────────────────┐
│ ❌ Invalid backup file or format error
│                                (⊗ close)
└─────────────────────────────────────────┘
Posición: Top-right
Duración: 5-10 segundos
Color: Red (#ef4444)
```

#### Info (Blue)
```
┌─────────────────────────────────────────┐
│ ℹ️ Import successful! 150 questions...
│                                (⊗ close)
└─────────────────────────────────────────┘
Posición: Top-right
Duración: 4-6 segundos
Color: Blue (#3b82f6)
```

---

## ⌨️ Atajos de Teclado

### File Selection Dialog

```
Space     → Select highlighted file
Enter     → Confirm selection
Escape    → Cancel
```

---

## 🎯 Flujo Visual de Usuario

### Export Flow

```
┌─────────────────────────────────┐
│ Question Builder                │
│ (usuario aquí)                  │
└──────────────┬──────────────────┘
               │
               │ Click: 💾 Export Backup
               ▼
       ┌───────────────────┐
       │ Collecting data   │
       │ (loading state)   │
       └───────────────────┘
               │ (< 1 segundo)
               ▼
       ┌───────────────────┐
       │ Compressing ZIP   │
       │ (loading state)   │
       └───────────────────┘
               │ (< 1 segundo)
               ▼
    ┌──────────────────────┐
    │ 📥 Download started  │
    │ dp600-backup.zip     │
    │ (en carpeta Downloads)
    └──────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────┐
    │ ✅ Backup created: 150 Q, 5 cases   │
    │ (toast - auto-close)                │
    └──────────────────────────────────────┘
```

---

### Import Flow

```
┌─────────────────────────────────┐
│ Question Builder                │
│ (usuario aquí)                  │
└──────────────┬──────────────────┘
               │
               │ Click: 📂 Restore Backup
               ▼
    ┌──────────────────────┐
    │ File selector opens  │
    │ Filter: *.zip only   │
    │ (Windows/Mac/Linux)  │
    └──────────┬───────────┘
               │
               │ User selects: backup.zip
               ▼
    ┌──────────────────────┐
    │ Decompressing...     │
    │ (loading state)      │
    └──────────┬───────────┘
               │ (< 2 segundos)
               ▼
    ┌──────────────────────┐
    │ Reading JSON files   │
    │ (parsing data)       │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Merging to storage   │
    │ (updating localStorage)
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ UI Refresh           │
    │ (setQuestions,etc)   │
    └──────────┬───────────┘
               │
               ▼
    ┌────────────────────────────────────┐
    │ ✅ Import successful!              │
    │    150 questions                   │
    │    5 cases                         │
    │    10 sessions                     │
    │ (toast - auto-close)               │
    └────────────────────────────────────┘
               │
               ▼
    ┌────────────────────────────────────┐
    │ Question Builder                   │
    │ (ahora con datos importados)       │
    │ Sidebar actualizado                │
    └────────────────────────────────────┘
```

---

## 📊 Estado de Componentes

### Disabled States

Botones se deshabilitan cuando:
- ```javascript
  // No hay preguntas/casos? Export aún disponible
  // (exporta ZIP vacío con metadata)
  
  // No soporta input file? Browsers antiguos
  // (muestra error en consola)
  ```

### Loading States

Visual feedback durante operaciones:
```
// Export
  - Button opacity reduced
  - Toast shows progress
  
// Import
  - Toast shows "Processing..."
  - UI temporarily shows previous state
```

---

## 🎬 Animaciones

### Toast Appearance
```
1. Slide in from right (0.3s)
2. Visible (3-10s depending on type)
3. Slide out to right (0.3s)
```

### Button Hover
```
1. Background color changes (instantly)
2. Opacity effect (100% → 90% → 100%)
3. Cursor changes to pointer
```

---

## ✨ Resumen de UI

| Elemento | Ubicación | Apariencia | Función |
|----------|-----------|-----------|---------|
| 💾 Export Backup | Arriba derecha | Gray button | Descargar ZIP |
| 📂 Restore Backup | Arriba derecha | Gray button | Importar ZIP |
| Toast Success | Arriba derecha | Green box | Confirmación OK |
| Toast Error | Arriba derecha | Red box | Error notification |
| File Picker | Modal | Native dialog | Seleccionar ZIP |

---

**La interfaz está lista y lista para usar.** 🚀
