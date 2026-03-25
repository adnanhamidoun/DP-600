# 🔧 Code Changes - Case Study Edit Feature

## File Modified
```
src/components/QuestionsBuilder.tsx
```

---

## Change 1: Add State for Tracking Edit Mode
**Line 19** - Add new state variable

```typescript
// BEFORE (line 18):
const [showCaseStudyForm, setShowCaseStudyForm] = useState(false);
const [caseStudies, setCaseStudies] = useState<any[]>([]);

// AFTER (lines 18-19):
const [showCaseStudyForm, setShowCaseStudyForm] = useState(false);
const [editingCaseStudyId, setEditingCaseStudyId] = useState<string | null>(null);  // ← NEW
const [caseStudies, setCaseStudies] = useState<any[]>([]);
```

---

## Change 2: Add handleEditCaseStudy Function
**Lines 352-364** - New function to load case data for editing

```typescript
const handleEditCaseStudy = (caseStudy: any) => {
  setNewCaseStudy({
    title: caseStudy.title,
    description: caseStudy.description,
    scenario: caseStudy.scenario,
    businessRequirements: caseStudy.businessRequirements,
    existingEnvironment: caseStudy.existingEnvironment,
    problemStatement: caseStudy.problemStatement,
    exhibits: caseStudy.exhibits || '',
    exhibitsImage: caseStudy.exhibitsImage || '',
  });
  setEditingCaseStudyId(caseStudy.id);
  setShowCaseStudyForm(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
```

---

## Change 3: Add handleSaveCaseStudy Function
**Lines 366-404** - Unified save function for both create and update

```typescript
const handleSaveCaseStudy = () => {
  if (newCaseStudy.title && newCaseStudy.description && newCaseStudy.scenario && newCaseStudy.businessRequirements) {
    const isUpdating = !!editingCaseStudyId;
    const caseId = editingCaseStudyId || `case-${Date.now()}`;
    
    storageUtils.addCaseStudy({
      id: caseId,
      title: newCaseStudy.title,
      description: newCaseStudy.description,
      scenario: newCaseStudy.scenario,
      businessRequirements: newCaseStudy.businessRequirements,
      existingEnvironment: newCaseStudy.scenario,
      problemStatement: newCaseStudy.businessRequirements,
      exhibits: newCaseStudy.exhibits,
      exhibitsImage: newCaseStudy.exhibitsImage,
    });
    
    if (!editingCaseStudyId) {
      setFormData({ ...formData, caseStudyId: caseId });
    }
    
    const updated = storageUtils.getCaseStudies();
    setCaseStudies(updated);
    resetCaseStudyForm();
    toast.success(isUpdating ? '✅ Case Study updated!' : '✅ Case Study created!');
  } else {
    toast.error('❌ Please complete: Title, Description, Scenario, Business Requirements');
  }
};
```

---

## Change 4: Add resetCaseStudyForm Function
**Lines 406-420** - Reset form to initial state

```typescript
const resetCaseStudyForm = () => {
  setNewCaseStudy({ 
    title: '', 
    description: '', 
    scenario: '',
    businessRequirements: '',
    existingEnvironment: '',
    problemStatement: '',
    exhibits: '',
    exhibitsImage: ''
  });
  setEditingCaseStudyId(null);
  setShowCaseStudyForm(false);
};
```

---

## Change 5: Update Create/Cancel Button Logic
**Lines 523-530** - Toggle button behavior based on edit mode

```typescript
// BEFORE:
<button
  onClick={() => setShowCaseStudyForm(!showCaseStudyForm)}
  className="w-full px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded text-white text-sm transition-colors font-semibold"
>
  {showCaseStudyForm ? '✕ Cancel' : '+ Create New Case Study'}
</button>

// AFTER:
<button
  onClick={() => {
    if (editingCaseStudyId) {
      resetCaseStudyForm();
    } else {
      setShowCaseStudyForm(!showCaseStudyForm);
    }
  }}
  className="w-full px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded text-white text-sm transition-colors font-semibold"
>
  {editingCaseStudyId ? '✕ Cancel Edit' : showCaseStudyForm ? '✕ Cancel' : '+ Create New Case Study'}
</button>
```

---

## Change 6: Replace Save Button with New Function
**Lines 623-632** - Update button text and use new function

```typescript
// BEFORE:
<button
  onClick={() => {
    if (newCaseStudy.title && newCaseStudy.description && newCaseStudy.scenario && newCaseStudy.businessRequirements) {
      const caseId = `case-${Date.now()}`;
      storageUtils.addCaseStudy({
        id: caseId,
        title: newCaseStudy.title,
        description: newCaseStudy.description,
        scenario: newCaseStudy.scenario,
        businessRequirements: newCaseStudy.businessRequirements,
        existingEnvironment: newCaseStudy.scenario,
        problemStatement: newCaseStudy.businessRequirements,
        exhibits: newCaseStudy.exhibits,
        exhibitsImage: newCaseStudy.exhibitsImage,
      });
      const updated = storageUtils.getCaseStudies();
      setCaseStudies(updated);
      setFormData({ ...formData, caseStudyId: caseId });
      setNewCaseStudy({ 
        title: '', 
        description: '', 
        scenario: '',
        businessRequirements: '',
        existingEnvironment: '',
        problemStatement: '',
        exhibits: '',
        exhibitsImage: ''
      });
      setShowCaseStudyForm(false);
      toast.success('Case Study created successfully!');
    } else {
      toast.error('Please complete: Title, Description, Scenario, Business Requirements, and Existing Environment');
    }
  }}
  className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white text-sm font-semibold transition-colors"
>
  ✅ Create Case Study
</button>

// AFTER:
<button
  onClick={handleSaveCaseStudy}
  className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white text-sm font-semibold transition-colors"
>
  {editingCaseStudyId ? '✅ Update Case Study' : '✅ Create Case Study'}
</button>
{editingCaseStudyId && (
  <button
    onClick={resetCaseStudyForm}
    className="w-full px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-sm font-semibold transition-colors mt-2"
  >
    ✕ Cancel Edit
  </button>
)}
```

---

## Change 7: Add Edit Button to Case Studies List
**Lines 943-963** - Replace single delete button with edit + delete

```typescript
// BEFORE:
<div
  key={cs.id}
  className="bg-gray-900 border border-gray-800 rounded p-3 hover:border-gray-700 transition-colors"
>
  <p className="text-sm font-semibold text-blue-300 mb-1">{cs.title}</p>
  <p className="text-xs text-gray-400 mb-2 line-clamp-2">{cs.description}</p>
  <button
    onClick={() => {
      if (window.confirm(`Delete case "${cs.title}"?`)) {
        storageUtils.deleteCaseStudy(cs.id);
        const updated = storageUtils.getCaseStudies();
        setCaseStudies(updated);
      }
    }}
    className="w-full px-2 py-1 bg-red-900 hover:bg-red-800 text-red-200 rounded text-xs"
  >
    Delete
  </button>
</div>

// AFTER:
<div
  key={cs.id}
  className="bg-gray-900 border border-gray-800 rounded p-3 hover:border-gray-700 transition-colors"
>
  <p className="text-sm font-semibold text-blue-300 mb-1">{cs.title}</p>
  <p className="text-xs text-gray-400 mb-2 line-clamp-2">{cs.description}</p>
  <div className="flex gap-2">
    <button
      onClick={() => handleEditCaseStudy(cs)}
      className="flex-1 px-2 py-1 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded text-xs"
    >
      ✏️ Edit
    </button>
    <button
      onClick={() => {
        if (window.confirm(`Delete case "${cs.title}"?`)) {
          storageUtils.deleteCaseStudy(cs.id);
          const updated = storageUtils.getCaseStudies();
          setCaseStudies(updated);
          toast.success('Case Study deleted!');
        }
      }}
      className="flex-1 px-2 py-1 bg-red-900 hover:bg-red-800 text-red-200 rounded text-xs"
    >
      ✕ Delete
    </button>
  </div>
</div>
```

---

## Summary of Changes

| Change | Type | Lines | Description |
|--------|------|-------|-------------|
| 1 | State | 19 | Added `editingCaseStudyId` state |
| 2 | Function | 352-364 | New `handleEditCaseStudy()` |
| 3 | Function | 366-404 | New `handleSaveCaseStudy()` |
| 4 | Function | 406-420 | New `resetCaseStudyForm()` |
| 5 | UI | 523-530 | Updated create/cancel button |
| 6 | UI | 623-632 | Updated save button & logic |
| 7 | UI | 943-963 | Added edit button to list |

---

## No Changes Required In

- ✅ `src/utils/storage.ts` - Already has merge logic in `addCaseStudy()`
- ✅ `src/types/index.ts` - No new types needed
- ✅ Export/Import logic - Already handles case studies
- ✅ Other components - No dependencies

---

## Testing Checklist

```
✅ Type: Create new case
✅ Type: Edit existing case
✅ Type: Cancel while creating
✅ Type: Cancel while editing
✅ Type: Delete case
✅ Verify: No duplicate cases on edit
✅ Verify: Form pre-population on edit
✅ Verify: Toast notifications show
✅ Verify: Export includes edits
✅ Verify: Import restores edits
✅ Build: TypeScript compilation
✅ Build: Production build succeeds
```

---

*Code Changes Document*  
*Date: 2026-03-25*  
*Feature: Case Study Edit*  
*Status: ✅ IMPLEMENTED*
