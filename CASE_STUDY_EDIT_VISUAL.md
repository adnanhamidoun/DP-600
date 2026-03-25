# 📸 Case Study Edit Feature - Visual Guide

## Ubicación de Botones

### En el Formulario (Arriba)

```
┌─────────────────────────────────────────────────────────────┐
│  Question Builder    [💾 Export] [📂 Restore] [✕]          │
└─────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────┐
│  LEFT COLUMN: Question Form                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📚 Case study (optional)                                   │
│  Select or create a case study to attach to this question   │
│                                                              │
│  ┌──────────────────────────────────────┐                  │
│  │ No case study ▼                      │  ← Dropdown       │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  ┌────────────────────────────────────────┐               │
│  │ ✕ Cancel Edit                         │               │
│  │ + Create New Case Study  ← Cambia según│               │
│  │                                        │  modo           │
│  └────────────────────────────────────────┘               │
│                                                              │
│  ┌────────────────────────────────────────┐               │
│  │ Case study title                       │               │
│  │ Contoso, Ltd. - Power BI...            │               │
│  ├────────────────────────────────────────┤               │
│  │ Description                            │               │
│  │ Provide company context...             │               │
│  │ [textarea]                             │               │
│  ├────────────────────────────────────────┤               │
│  │ Scenario                               │               │
│  │ Describe: Infrastructure...            │               │
│  │ [textarea]                             │               │
│  ├────────────────────────────────────────┤               │
│  │ Requirements                           │               │
│  │ Planned changes...                     │               │
│  │ [textarea]                             │               │
│  ├────────────────────────────────────────┤               │
│  │ Exhibits / Additional Info             │               │
│  │ Add any additional context...          │               │
│  │ [textarea]                             │               │
│  ├────────────────────────────────────────┤               │
│  │ 📷 Exhibits Image                      │               │
│  │ [File upload] [Preview Image]          │               │
│  └────────────────────────────────────────┘               │
│                                                              │
│  ┌──────────────────┬──────────────────┐                  │
│  │ ✅ Update Case   │ ✕ Cancel Edit    │  ← Botones       │
│  │ Study            │                  │     Save/Cancel   │
│  └──────────────────┴──────────────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### En la Lista de Casos (Derecha)

```
┌─────────────────────────────────┐
│  RIGHT COLUMN                   │
├─────────────────────────────────┤
│                                 │
│  📚 Case Studies                │
│  ┌───────────────────────────┐  │
│  │ Contoso, Ltd.             │  │
│  │ Company context, divisions│  │
│  │                           │  │
│  │ ┌─────────┬──────────┐   │  │
│  │ │ ✏️ Edit │ ✕ Delete │   │  │
│  │ └─────────┴──────────┘   │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Another Case              │  │
│  │ Different company...      │  │
│  │                           │  │
│  │ ┌─────────┬──────────┐   │  │
│  │ │ ✏️ Edit │ ✕ Delete │   │  │
│  │ └─────────┴──────────┘   │  │
│  └───────────────────────────┘  │
│                                 │
│  ❓ Saved Questions             │
│  [...]                          │
│                                 │
└─────────────────────────────────┘
```

---

## 🎬 Flujo de Edición

### Step 1: Haz clic en "✏️ Edit"
```
Case Studies List (RIGHT)
    ↓
Encuentra el caso a editar
    ↓
Haz clic: ✏️ Edit
```

### Step 2: Formulario sube y se carga
```
Page sube automáticamente (smooth scroll)
    ↓
El formulario "📚 Case study" aparece
    ↓
Todos los campos están llenos con los datos actuales
    ↓
Botón de crear ahora dice: "✅ Update Case Study"
    ↓
Botón de cancelar ahora dice: "✕ Cancel Edit"
```

### Step 3: Modifica lo que necesites
```
Edita Title
Edita Description
Edita Scenario
Edita Requirements
Edita Exhibits
Cambia imagen (opcional)
```

### Step 4: Guarda los cambios
```
Haz clic: "✅ Update Case Study"
    ↓
Validación (requiere campos básicos)
    ↓
Toast: "✅ Case Study updated!"
    ↓
Formulario se resetea
    ↓
Lista se actualiza
```

### Step 5: Los cambios se sincronizar
```
Cuando hagas export:
    ↓
El ZIP incluye los cambios
    ↓
Cuando importes en otro PC:
    ↓
Los cambios están incluidos (merge automático)
```

---

## 🎨 Visual States

### Estado Normal (Sin Edición)
```
Botón: "+ Create New Case Study"
Estado: Ready to create new cases
```

### Estado Creando Caso Nuevo
```
Botón: "✕ Cancel"
Formulario abierto
Estado: Creating new case
```

### Estado Editando Caso
```
Botón: "✕ Cancel Edit"
Botón Guardar: "✅ Update Case Study"
Formulario abierto con datos
Estado: Editing existing case
```

---

## ✅ Validaciones

```
Campos Requeridos:
├── ✅ Title (obligatorio)
├── ✅ Description (obligatorio)
├── ✅ Scenario (obligatorio)
├── ✅ Business Requirements (obligatorio)
├── ⚪ Exhibits (opcional)
└── ⚪ Exhibits Image (opcional)

Si falta algún campo requerido:
    ↓
Toast: "❌ Please complete: Title, Description, Scenario, Business Requirements"
```

---

## 🔄 Diferencias: Crear vs. Editar

### Crear Nuevo Caso
```
1. Haz clic: "+ Create New Case Study"
2. Formulario se abre
3. Campos vacíos
4. ID generado automáticamente: case-{timestamp}
5. Botón: "✅ Create Case Study"
6. Toast: "✅ Case Study created!"
7. Caso aparece en lista
```

### Editar Caso Existente
```
1. Haz clic: "✏️ Edit" en la lista
2. Formulario sube y se abre
3. Campos pre-poblados
4. ID es el mismo (update, no create)
5. Botón: "✅ Update Case Study"
6. Toast: "✅ Case Study updated!"
7. Lista se actualiza sin duplicar
```

---

## 🚀 Casos de Uso

### Caso 1: Typo en el Título
```
Oops: "Contoso LTd." (con typo)
Solution:
    ↓
1. Haz clic: ✏️ Edit
2. Modifica: "Contoso, Ltd." (corrección)
3. Haz clic: ✅ Update Case Study
4. ✅ Corregido
```

### Caso 2: Agregar Imagen a Caso Existente
```
Tenía caso sin imagen
Solution:
    ↓
1. Haz clic: ✏️ Edit
2. Ve a: "📷 Exhibits Image"
3. Sube imagen
4. Haz clic: ✅ Update Case Study
5. ✅ Imagen agregada
```

### Caso 3: Actualizar Información
```
Información de caso cambió
Solution:
    ↓
1. Haz clic: ✏️ Edit
2. Modifica campos necesarios
3. Haz clic: ✅ Update Case Study
4. ✅ Actualizado
5. 💾 Exporta (cambios en ZIP)
```

---

## 🛡️ Protecciones

### Confirmación de Eliminación
```
Haz clic: ✕ Delete
    ↓
Popup: "Delete case 'Contoso, Ltd'?"
    ↓
Si confirmas:
    ↓
Toast: "Case Study deleted!"
    ↓
Caso removido de lista
```

### Flush de Preguntas Asociadas
```
Cuando eliminas un caso:
    ↓
storageUtils.deleteCaseStudy() también:
    ↓
Limpia referencias en todas las preguntas
    ↓
Preguntas siguen existiendo (sin caso asociado)
```

---

## 📊 Estado Actual

### Storage (localStorage)
```
case-studies: [
  {
    id: "case-1234567890",
    title: "Contoso, Ltd.",
    description: "Company context...",
    scenario: "Infrastructure, systems...",
    businessRequirements: "Planned changes...",
    existingEnvironment: "Infrastructure, systems...",
    problemStatement: "Planned changes...",
    exhibits: "Additional context...",
    exhibitsImage: "data:image/png;base64,..."  ← Base64 image
  }
]

questions: [
  {
    id: "q-123456",
    question: "Which solution?",
    caseStudyId: "case-1234567890",  ← Links to case
    ...
  }
]
```

### Cuando Exportas
```
ZIP contains:
    ↓
case-studies.json ← All cases with images
    ↓
questions.json ← All questions with caseStudyId references
```

### Cuando Importas
```
ZIP → Decompress
    ↓
Parse case-studies.json
    ↓
storageUtils.addCaseStudy() ← Merge por ID
    ↓
Parse questions.json
    ↓
storageUtils.addCustomQuestion() ← Merge por ID
    ↓
UI Refresh
    ↓
✅ Todo sincronizado
```

---

## 🎯 Próximas Mejoras (Opcionales)

- [ ] Batch edit (editar múltiples casos)
- [ ] Duplicate case (clonar un caso)
- [ ] Search/filter cases
- [ ] Sort cases (by date, name, etc)
- [ ] Preview case in modal
- [ ] Bulk operations (delete multiple)
- [ ] Audit log (quién cambió qué)
- [ ] Version history (cambios anteriores)

---

*Visual Guide Creado: 2026-03-25*  
*Feature: Edit Case Studies*  
*Status: ✅ COMPLETO*
