# DP-600 Exam Simulator - Backup & Restore Guide

## 🎯 Overview

El sistema de backup/restore permite **guardar y restaurar ilimitadas preguntas, casos de estudio, sesiones de examen y preguntas fallidas** en archivos ZIP comprimidos.

---

## 📦 Formato de Backup

### Extensión: `.zip`
- Estándar universal (se abre en cualquier gestor de archivos)
- Comprimido automáticamente (reduce ~90% de tamaño)
- Incluye múltiples archivos JSON organizados

### Contenido del ZIP

```
dp600-backup-2026-03-25T14-30-00Z.zip
│
├── 📄 questions.json              ← Todas las preguntas personalizadas
├── 📄 case-studies.json           ← Todos los casos de estudio
├── 📄 sessions.json               ← Historial de exámenes completados
├── 📄 failed-questions.json       ← Preguntas que necesitan revisión
├── 📄 metadata.json               ← Info de exportación (fecha, versión, conteo)
└── 📄 README.txt                  ← Este archivo (instrucciones)
```

---

## 💾 Cómo Exportar (Guardar Backup)

### Paso 1: Abrir Question Builder
- Click en **"Question Builder"** desde el menú principal

### Paso 2: Hacer clic en "💾 Export Backup"
- Botón en la esquina superior derecha
- Se descargará automáticamente un archivo `.zip`

### Paso 3: Guardar en un lugar seguro
- El archivo se llama: `dp600-backup-2026-03-25T14-30-00Z.zip`
- Recomendación: Guarda en Google Drive, OneDrive, o una USB externa

### ¿Qué se exporta?
✅ Todas tus preguntas personalizadas (sin límite)  
✅ Todos tus casos de estudio (con imágenes)  
✅ Historial de exámenes completados  
✅ Preguntas fallidas (para revisión)  
✅ Metadatos (fecha, conteo de items)

---

## 📂 Cómo Importar (Restaurar Backup)

### Paso 1: Abrir Question Builder
- Click en **"Question Builder"**

### Paso 2: Hacer clic en "📂 Restore Backup"
- Botón junto al de Export
- Se abrirá un selector de archivos

### Paso 3: Seleccionar el archivo `.zip`
- Busca el archivo `dp600-backup-*.zip` que hayas descargado

### Paso 4: Esperar confirmación
- Verás un toast verde con el resumen:
  ```
  ✅ Import successful!
  150 questions
  5 cases
  10 sessions
  ```

### ¿Qué sucede al importar?
🔄 Los datos se **fusionan** con lo que ya existe (no borra)  
🔄 Si hay preguntas con ID duplicado, se **actualizan**  
🔄 Si son nuevas, se **agregan**  
✅ Los datos se guardan inmediatamente en localStorage

---

## 🎓 Casos de Uso

### Caso 1: Cambiar de computadora
1. En PC vieja: Click "💾 Export Backup" → Guarda el ZIP
2. En PC nueva: Click "📂 Restore Backup" → Selecciona el ZIP
3. ✅ Todas tus preguntas aparecen en la PC nueva

### Caso 2: Compartir preguntas con un colega
1. Creas 50 preguntas en tu PC
2. Haces backup → obtienes `dp600-backup-*.zip`
3. Envías el ZIP a tu colega por email
4. Tu colega importa el ZIP en su PC
5. ✅ Ambos tienen las 50 preguntas (se fusionan si él ya tenía algunas)

### Caso 3: Backup de seguridad regular
1. Cada semana haces click en "💾 Export Backup"
2. Guardas los ZIP en carpeta "Backups" en tu PC
3. Subes los ZIP a Google Drive
4. ✅ Si algo pasa, siempre tienes un respaldo

### Caso 4: Restaurar después de limpiar localStorage
1. Accidentalmente haces "Clear all" en la app
2. Abres "📂 Restore Backup" y seleccionas tu ZIP anterior
3. ✅ Todas tus preguntas vuelven

---

## 📊 Datos Incluidos en Cada Exportación

### Metadatos
```json
{
  "exportDate": "2026-03-25T14:30:00.000Z",
  "appVersion": "1.0.0",
  "itemCount": {
    "questions": 150,
    "caseStudies": 5,
    "sessions": 10,
    "failedQuestions": 8
  }
}
```

### Información de Preguntas
- ID único
- Tipo (single, multiple, hotspot, etc.)
- Texto de pregunta
- Opciones/respuestas
- Imágenes en Base64 (hotspots)
- Explicaciones
- Caso de estudio asociado

### Información de Casos
- ID único
- Título
- Descripción
- Escenario
- Requisitos
- Imagen de exhibits (Base64)

### Historial de Exámenes
- Fecha de realización
- Calificación
- Respuestas dadas
- Tiempo empleado

---

## ⚠️ Importante

### Compresión automática
- Si tienes 100 preguntas con imágenes grandes
- El archivo sin comprimir sería ~500 MB
- El ZIP comprimido será ~50 MB
- ✅ Puedes enviarlo por email sin problema

### Compatibilidad
- Los archivos ZIP se abren nativamente en:
  - Windows Explorer ✅
  - Mac Finder ✅
  - Linux File Manager ✅
- No necesitas instalar nada especial

### Límites
- ✅ Preguntas ilimitadas
- ✅ Imágenes ilimitadas
- ✅ Casos ilimitados
- ✅ Sesiones ilimitadas
- ⚠️ Limitado solo por espacio en disco y memoria del navegador

---

## 🆘 Solución de Problemas

### Problema: "Invalid backup file or format error"
**Solución**: Asegúrate de que:
- El archivo es un ZIP real (no renombrado)
- Lo descargaste completamente (no está corrupto)
- Fue creado por esta app (misma versión)

### Problema: Import muy lento
**Causa**: Si tienes 1000+ preguntas con imágenes grandes  
**Solución**: Espera 10-30 segundos, el navegador está procesando

### Problema: Las preguntas importadas no aparecen
**Solución**:
1. Recarga la página (F5)
2. Abre Question Builder de nuevo
3. Si aún no aparecen, revisa la consola (F12) para errores

### Problema: El ZIP descargado pesa mucho
**Esperado**: Si tienes 500 preguntas con hotspots grandes:
- Sin comprimir: ~200-500 MB
- Con ZIP: ~20-50 MB
- Es normal, la compresión es efectiva

---

## 🔒 Seguridad

- ✅ Los datos se guardan **localmente en tu PC** (tu navegador)
- ✅ El backup es un archivo ZIP **normal**, sin encriptación especial
- ⚠️ Si compartes el ZIP, otros pueden ver tus preguntas
- 💡 Para mayor seguridad, encripta el ZIP antes de compartir (7-Zip, WinRAR, etc.)

---

## 📝 Ejemplos de Nombres de Archivo

```
dp600-backup-2026-03-25T14-30-45-123Z.zip      ← Export automático
dp600-backup-2026-03-20T08-15-30-000Z.zip      ← Backup de la semana pasada
dp600-backup-backup-importante.zip             ← Renombrado manualmente
```

---

## 🚀 Resumen Rápido

| Acción | Botón | Resultado |
|--------|-------|-----------|
| Guardar todo | 💾 Export Backup | Descarga `.zip` comprimido |
| Restaurar | 📂 Restore Backup | Importa preguntas + casos |
| Compartir | Envía el `.zip` | Otro usuario lo importa |
| Backup regular | Export cada semana | Respaldo de seguridad |

---

**¿Preguntas?** Consulta el README en el archivo ZIP exportado.
