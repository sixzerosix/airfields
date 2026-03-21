# 🏗️ FIELD-DRIVEN ARCHITECTURE - ПОЛНАЯ СПЕЦИФИКАЦИЯ

**Версия:** 2.0 (с Conditional Fields)  
**Дата:** Март 2025  
**Назначение:** Документ для понимания архитектуры системы другими AI/разработчиками

---

## 📖 СОДЕРЖАНИЕ

1. [Философия и принципы](#философия-и-принципы)
2. [Архитектура слоёв](#архитектура-слоёв)
3. [Data Flow](#data-flow)
4. [Компоненты системы](#компоненты-системы)
5. [Lifecycle поля](#lifecycle-поля)
6. [Conditional Fields](#conditional-fields)
7. [Примеры использования](#примеры-использования)
8. [Архитектурные решения](#архитектурные-решения)

---

## 🎯 ФИЛОСОФИЯ И ПРИНЦИПЫ

### Главная идея: **FIELD-DRIVEN ARCHITECTURE**

```
Поле = Автономная единица с собственным состоянием, валидацией и синхронизацией
```

#### Ключевые принципы:

1. **Каждое поле независимо**
   - Своё состояние (localValue)
   - Своя валидация
   - Своя синхронизация с сервером
   - Не зависит от других полей (кроме conditional)

2. **Single Source of Truth: Supabase → Store → React**
   ```
   Database (Supabase)
       ↓
   Store (Zustand)
       ↓
   Components (React)
   ```

3. **Silent Updates (Notion-style)**
   - Пользователь печатает → мгновенная реакция UI
   - Сохранение в фоне (debounce 500ms)
   - Нет модалок "Сохранено!"
   - Ошибки показываем inline

4. **Optimistic UI + Rollback**
   - Сначала обновляем UI (optimistic)
   - Потом отправляем на сервер
   - Если ошибка → откатываем (rollback)

5. **Offline-First**
   - Работает без интернета
   - Изменения в очередь (localStorage)
   - Синхронизация при reconnect

6. **Focus Wins (Conflict Resolution)**
   - Если поле в фокусе → локальные изменения важнее
   - Remote updates откладываются до blur
   - Автоматическое разрешение конфликтов

---

## 🏛️ АРХИТЕКТУРА СЛОЁВ

```
┌─────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                      │
│  • EntityField (router)                                  │
│  • Field Components (EditableText, etc)                  │
│  • Pages/Forms                                           │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  BUSINESS LOGIC LAYER                                    │
│  • useEditableField (hook)                               │
│  • Registry (field configs)                              │
│  • Field Handler (update orchestrator)                   │
│  • ConditionalFieldsContext (visibility/required)        │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  STATE MANAGEMENT LAYER                                  │
│  • Zustand Store (universal)                             │
│  • Focus Wins (conflict resolver)                        │
│  • Offline Manager (queue)                               │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  DATA ACCESS LAYER                                       │
│  • Server Actions (next-safe-action)                     │
│  • Realtime (Supabase subscriptions)                     │
│  • Zod Schemas (validation)                              │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  DATABASE LAYER                                          │
│  • Supabase PostgreSQL                                   │
│  • Row Level Security (RLS)                              │
└─────────────────────────────────────────────────────────┘
```

### Описание слоёв:

#### 1. Presentation Layer
- **Что:** React компоненты
- **Задача:** Отображение и ввод данных
- **Примеры:** `<EditableText>`, `<EntityField>`, `<FieldGroup>`

#### 2. Business Logic Layer
- **Что:** Бизнес-правила и оркестрация
- **Задача:** Валидация, debounce, conditional logic
- **Примеры:** `useEditableField`, `Registry`, `FieldHandler`

#### 3. State Management Layer
- **Что:** Централизованное состояние
- **Задача:** Хранение данных, синхронизация
- **Примеры:** `Zustand Store`, `Focus Wins`, `Offline Queue`

#### 4. Data Access Layer
- **Что:** Коммуникация с сервером
- **Задача:** CRUD операции, real-time sync
- **Примеры:** `Server Actions`, `Supabase Realtime`

#### 5. Database Layer
- **Что:** Персистентность данных
- **Задача:** Хранение, безопасность (RLS)
- **Примеры:** Supabase PostgreSQL

---

## 🔄 DATA FLOW

### 1. USER INPUT → DATABASE (Write Path)

```
User types in field
      ↓
onChange handler
      ↓
useEditableField hook
  • setLocalValue (instant UI update)
  • Validation (Zod)
      ↓
debounce (500ms)
      ↓
Field Handler
  • Check if focused (Focus Wins)
  • Check online/offline
      ↓
Optimistic Update
  • Store.updateField()
  • UI shows new value immediately
      ↓
Server Action
  • updateEntityAction()
  • Zod validation (server-side)
  • RLS check
      ↓
Supabase INSERT/UPDATE
      ↓
Success?
  ├─ YES → Done ✅
  └─ NO → Rollback ❌
        • Store.updateField(oldValue)
        • Show error inline
```

### 2. DATABASE → UI (Read Path / Realtime)

```
Database changed
  (другой пользователь или другая вкладка)
      ↓
Supabase Realtime
  • Subscription active
  • Payload: { new, old }
      ↓
Focus Wins Check
  • Is field focused?
      ├─ YES → Save to pendingUpdates
      │         Apply on blur
      │
      └─ NO → Apply immediately
                ↓
          Store.applyRemoteUpdate()
                ↓
          React re-render
                ↓
          UI shows new value ✅
```

### 3. OFFLINE → ONLINE (Sync Path)

```
User offline
      ↓
Changes go to localStorage queue
      ↓
window 'online' event
      ↓
Offline Manager.sync()
      ↓
For each queued operation:
  • Try Server Action
  • Success → remove from queue
  • Fail → keep in queue, retry later
      ↓
Toast: "🌐 Connection restored"
```

---

## 🧩 КОМПОНЕНТЫ СИСТЕМЫ

### 1. ZUSTAND STORE (lib/store/index.ts)

**Назначение:** Universal state для всех entities

**Структура:**
```typescript
interface StoreState {
  entities: {
    [EntityType]: {
      [id: string]: EntityData
    }
  }
  loading: { [EntityType]: { [id: string]: boolean } }
  errors: { [EntityType]: { [id: string]: string | null } }
}
```

**Методы:**
```typescript
// Установить все сущности (bulk)
setEntities(entity, data)

// Добавить/обновить одну
upsertEntity(entity, id, data)

// Удалить
deleteEntity(entity, id)

// Обновить одно поле (ГЛАВНЫЙ МЕТОД!)
updateField(entity, id, field, value)

// Применить remote update (с timestamp check)
applyRemoteUpdate(entity, id, updates, timestamp)
```

**Особенности:**
- Auto-expands при добавлении новых таблиц в schemas
- Нет нормализации (denormalized для простоты)
- Нет memoized selectors (по дизайну, для простоты)

**Пример:**
```typescript
// Прочитать
const task = useStore(state => state.entities.tasks?.['task-123'])

// Обновить поле
useStore.getState().updateField('tasks', 'task-123', 'title', 'New Title')

// Добавить новую задачу
useStore.getState().upsertEntity('tasks', 'new-id', {
  id: 'new-id',
  title: 'New Task',
  status: 'todo'
})
```

---

### 2. FIELD HANDLER (lib/field-handler/index.ts)

**Назначение:** Оркестрация обновления полей

**Главный метод:**
```typescript
updateField({
  entity: 'tasks',
  entityId: 'task-123',
  field: 'title',
  value: 'New Title',
  debounceMs: 500  // optional
})
```

**Алгоритм работы:**
```
1. Validate (Zod)
   ├─ Invalid → return early, show error
   └─ Valid → continue

2. Optimistic Update
   • Store.updateField()
   • UI updates immediately

3. Check Offline
   ├─ Offline → queue to localStorage
   └─ Online → continue

4. Debounce (500ms default)
   • Cancel previous pending update
   • Wait debounceMs
   • Then continue

5. Server Action
   • updateEntityAction()
   • Server-side validation
   • RLS check
   • Database UPDATE

6. Handle Response
   ├─ Success → done ✅
   └─ Error → rollback ❌
       • Store.updateField(oldValue)
       • Show error
```

**Методы:**
```typescript
// С debounce (auto mode)
updateField(config)

// Без debounce (immediate)
updateFieldImmediate(config)

// Batch update (multiple fields)
updateFieldsBatch(entity, entityId, updates)
```

---

### 3. FOCUS WINS (lib/focus-wins/index.ts)

**Назначение:** Conflict resolution через focus detection

**Принцип:**
```
IF поле в фокусе (user печатает)
  THEN remote updates откладываются
  ELSE remote updates применяются сразу
```

**Data Attributes:**
```html
<input 
  data-entity="tasks"
  data-entity-id="task-123"
  data-field="title"
/>
```

**Методы:**
```typescript
// Проверить фокус
isFieldFocused(entity, entityId, field) → boolean

// Сохранить pending update
savePendingUpdate(entity, entityId, field, value)

// Применить pending updates (on blur)
applyPendingUpdates(entity, entityId, field)

// Очистить pending
clearPendingUpdates(entity, entityId, field)
```

**Стратегии:**
- `defer` (по умолчанию) - отложить до blur
- `local-wins` - игнорировать remote
- `remote-wins` - применить remote сразу (overwrites local)
- `notify-user` - показать UI (не реализовано)

**Пример:**
```typescript
// В Realtime handler
const isFocused = isFieldFocused('tasks', 'task-123', 'title')

if (isFocused) {
  // Отложить
  savePendingUpdate('tasks', 'task-123', 'title', newValue)
} else {
  // Применить
  Store.applyRemoteUpdate(...)
}
```

---

### 4. OFFLINE MANAGER (lib/offline/manager.ts)

**Назначение:** Работа без интернета

**Очередь:**
```typescript
interface QueueItem {
  id: string
  entity: EntityType
  entityId: string
  field: string
  value: any
  timestamp: number
  retries: number
}
```

**LocalStorage key:** `field_management_offline_queue`

**Методы:**
```typescript
// Добавить в очередь
addToQueue(operation)

// Синхронизировать (при reconnect)
sync()

// Очистить очередь
clearQueue()

// Получить размер
getQueueSize()
```

**Auto-sync на события:**
```typescript
window.addEventListener('online', () => {
  offlineManager.sync()
})
```

**Отключение на /share страницах:**
```typescript
const isSharePage = window.location.pathname.includes('/share')
if (isSharePage) {
  // Не используем offline manager
}
```

**Пример:**
```typescript
// При offline
if (!navigator.onLine) {
  offlineManager.addToQueue({
    entity: 'tasks',
    entityId: 'task-123',
    field: 'title',
    value: 'Updated offline'
  })
  
  toast('📡 Working offline', { duration: Infinity })
}

// При reconnect
// Auto-sync срабатывает автоматически
// toast('🌐 Connection restored')
```

---

### 5. REALTIME (lib/supabase/realtime.ts)

**Назначение:** Live sync с Supabase

**Subscription:**
```typescript
subscribeToEntity(
  entity: 'tasks',
  filter?: { field: 'user_id', value: 'user-123' }
)
```

**Алгоритм handleUpdate:**
```
1. Получить payload { new, old }
2. For each changed field:
   a) Check Focus Wins
      ├─ Focused → defer
      └─ Not focused → continue
   
   b) Timestamp check
      ├─ Older than current → skip
      └─ Newer → continue
   
   c) Apply to Store
      • Store.applyRemoteUpdate()
   
3. React re-render
```

**Active channels:**
```typescript
// Map для предотвращения дублей
activeChannels: Map<string, RealtimeChannel>

// Key: `${entity}:${entityId}`
```

**Cleanup:**
```typescript
// Вернуть unsubscribe функцию
const unsubscribe = subscribeToEntity('tasks')

// Cleanup
useEffect(() => {
  const unsub = subscribeToEntity('tasks')
  return () => unsub()
}, [])
```

---

### 6. useEditableField HOOK (hooks/useEditableField.ts)

**Назначение:** Главный хук для всех полей

**Props:**
```typescript
interface UseEditableFieldProps {
  entity: EntityType
  entityId: string
  field: string
  value: any
  
  saveMode?: 'auto' | 'manual' | 'hybrid'
  debounceMs?: number
  
  onSuccess?: () => void
  onError?: (error: string) => void
}
```

**Returns:**
```typescript
{
  // State
  localValue: any           // Локальное значение (для controlled input)
  isDirty: boolean         // Есть несохранённые изменения?
  isUpdating: boolean      // Сохранение в процессе?
  error: string | null     // Ошибка валидации/сохранения
  
  // Manual save
  hasUnsavedChanges: boolean
  isSaving: boolean
  
  // Handlers
  handleChange: (value) => void       // onChange
  handleFocus: () => void             // onFocus
  handleBlur: () => void              // onBlur
  handleKeyDown: (e) => void          // onKeyDown (Enter/Escape)
  
  // Manual mode
  save: () => Promise<void>           // Trigger save manually
  cancel: () => void                  // Cancel changes
  reset: () => void                   // Reset to original
}
```

**Save Modes:**

1. **auto** (по умолчанию)
   ```
   User types → debounce 500ms → save
   User blur → immediate save
   ```

2. **manual**
   ```
   User types → localValue only (не сохраняется)
   User clicks "Save" → save()
   ```

3. **hybrid**
   ```
   User types → debounce save (как auto)
   User clicks "Save" → immediate save
   ```

**Пример:**
```typescript
const {
  localValue,
  isDirty,
  isUpdating,
  error,
  handleChange,
  handleBlur,
  handleFocus,
} = useEditableField({
  entity: 'tasks',
  entityId: 'task-123',
  field: 'title',
  value: task.title,
  saveMode: 'auto',
  debounceMs: 500,
})

return (
  <input
    value={localValue}
    onChange={e => handleChange(e.target.value)}
    onFocus={handleFocus}
    onBlur={handleBlur}
    data-entity="tasks"
    data-entity-id="task-123"
    data-field="title"
  />
)
```

---

### 7. REGISTRY (lib/registry.tsx)

**Назначение:** Централизованная конфигурация полей

**Структура:**
```typescript
type Registry = {
  [EntityType]: EntityConfig
}

interface EntityConfig {
  displayName?: string
  icon?: ReactNode
  fields: {
    [fieldName]: FieldConfig
  }
}

interface FieldConfig {
  // Компонент
  component: ComponentType<any>
  
  // UI
  label?: string
  placeholder?: string
  
  // Validation
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  validate?: (value) => boolean | string
  
  // Save
  saveMode?: 'auto' | 'manual' | 'hybrid'
  debounceMs?: number
  
  // Conditional (NEW!)
  visibleWhen?: {
    field: string
    equals?: any
    condition?: (value) => boolean
  }
  requiredWhen?: {
    field: string
    equals?: any
    condition?: (value) => boolean
  }
  
  // Props для компонента
  props?: Record<string, any>
}
```

**Пример конфига:**
```typescript
export const registry: Registry = {
  tasks: {
    displayName: 'Tasks',
    fields: {
      title: {
        component: EditableText,
        label: 'Task Title',
        placeholder: 'Enter title...',
        required: true,
        minLength: 1,
        maxLength: 100,
        saveMode: 'auto',
        debounceMs: 500,
      },
      
      status: {
        component: EditableSelect,
        label: 'Status',
        required: true,
        props: {
          options: [
            { value: 'todo', label: 'To Do' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'done', label: 'Done' },
          ]
        },
        saveMode: 'auto',
      },
      
      // Conditional field
      assignee: {
        component: ReferencePicker,
        label: 'Assignee',
        visibleWhen: {
          field: 'status',
          condition: (val) => val !== 'todo'
        },
        props: {
          entity: 'users',
          labelField: 'name'
        }
      }
    }
  }
}
```

**Методы:**
```typescript
// Получить конфиг поля
getFieldConfig(entity, fieldName): FieldConfig | undefined

// Получить конфиг entity
getEntityConfig(entity): EntityConfig | undefined
```

---

### 8. ENTITYFIELD (components/EntityField.tsx)

**Назначение:** Universal router для полей

**Props:**
```typescript
interface EntityFieldProps<E extends EntityType> {
  entity: E
  entityId: string
  name: keyof EntityDataMap[E]
  value?: any
  customProps?: Record<string, any>
  className?: string
}
```

**Алгоритм:**
```
1. Получить конфиг из Registry
   • getFieldConfig(entity, name)

2. Conditional Check (NEW!)
   • useFieldVisibility() → isVisible?
   • useFieldRequired() → isDynamicRequired?
   
3. If !isVisible → return null

4. Resolve Component
   • config.component || EditableText (fallback)

5. Merge Props
   • registry props + customProps + conditional
   • customProps override all!

6. Render Component
   • <Component {...mergedProps} />
```

**Пример:**
```tsx
<EntityField 
  entity="tasks"
  entityId="task-123"
  name="title"
  value={task.title}
  customProps={{
    placeholder: 'Custom placeholder',
    className: 'my-custom-class'
  }}
/>
```

---

### 9. FIELD GROUP (components/fields/FieldGroup.tsx)

**Назначение:** Обёртка для группы полей + conditional support

**Props:**
```typescript
interface FieldGroupProps {
  // Conditional режим
  entity?: EntityType
  entityId?: string
  conditional?: boolean
  
  // UI
  title?: string
  description?: string
  className?: string
  
  children: ReactNode
}
```

**Логика:**
```
IF conditional === true:
  THEN wrap в ConditionalFieldsProvider
  ELSE просто div
```

**Пример:**
```tsx
// Обычный режим (без conditional)
<FieldGroup>
  <EntityField name="title" />
  <EntityField name="description" />
</FieldGroup>

// Conditional режим (поля видят друг друга!)
<FieldGroup 
  entity="tasks" 
  entityId={id} 
  conditional
>
  <EntityField name="status" />
  <EntityField name="assignee" />  {/* Auto show/hide! */}
</FieldGroup>
```

---

### 10. CONDITIONAL FIELDS CONTEXT (contexts/ConditionalFieldsContext.tsx)

**Назначение:** Conditional visibility/required logic

**Provider:**
```typescript
<ConditionalFieldsProvider entity="tasks" entityId="task-123">
  <EntityField name="status" />
  <EntityField name="assignee" />
</ConditionalFieldsProvider>
```

**Context Value:**
```typescript
{
  entity: EntityType
  entityId: string
  values: Record<string, any>    // Все значения entity
  visibility: Record<string, boolean>
  required: Record<string, boolean>
}
```

**Hooks:**
```typescript
// Проверить видимость
useFieldVisibility(entity, entityId, fieldName) → boolean

// Проверить обязательность
useFieldRequired(entity, entityId, fieldName) → boolean
```

**Алгоритм visibility:**
```
1. Get context (или null если вне провайдера)
2. Get field config (visibleWhen)
3. If !visibleWhen → always visible
4. Get dependent field value
5. Evaluate condition:
   • equals → value === equals
   • condition → condition(value)
6. Return boolean
```

**Пример в Registry:**
```typescript
assignee: {
  component: ReferencePicker,
  visibleWhen: {
    field: 'status',
    condition: (val) => val === 'in_progress' || val === 'done'
  },
  requiredWhen: {
    field: 'status',
    equals: 'done'
  }
}
```

---

### 11. SERVER ACTIONS (actions/update-entity.ts)

**Назначение:** Server-side CRUD через next-safe-action

**Actions:**
```typescript
// Update single field
updateEntityAction({
  entity: 'tasks',
  entityId: 'task-123',
  updates: { title: 'New Title' }
})

// Batch update
batchUpdateEntityAction({
  entity: 'tasks',
  entityId: 'task-123',
  updates: {
    title: 'New Title',
    status: 'done',
    priority: 'high'
  }
})

// Create
createEntityAction({
  entity: 'tasks',
  data: { title: 'New Task', status: 'todo' }
})

// Delete
deleteEntityAction({
  entity: 'tasks',
  entityId: 'task-123'
})
```

**Validation Flow:**
```
1. Client → Server Action
2. Zod validation (server-side!)
   • Используем FieldSchemas[entity][field]
3. Supabase client (server)
   • RLS применяется автоматически!
4. UPDATE/INSERT/DELETE
5. Return { data, error }
```

**Security:**
```typescript
// RLS проверяет на уровне БД
// Server Action только оркестрирует
// НЕТ дополнительных проверок!
```

---

### 12. ZOD SCHEMAS (lib/schemas/)

**Назначение:** Type-safe validation

**Структура:**
```typescript
// schemas/tasks.ts
export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.string().datetime().optional(),
  user_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Task = z.infer<typeof taskSchema>

// Per-field schemas
export const TaskFieldSchemas = {
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  // ...
}
```

**Usage:**
```typescript
// Validate entire object
const result = taskSchema.safeParse(data)

// Validate single field
const fieldResult = TaskFieldSchemas.title.safeParse(value)

// In Field Handler
const schema = FieldSchemas[entity][field]
const result = schema.safeParse(value)

if (!result.success) {
  return { error: result.error.errors[0].message }
}
```

---

## 🔄 LIFECYCLE ПОЛЯ

### Полный цикл жизни одного поля:

```
1. MOUNT
   • Component mount
   • useEditableField init
   • localValue = Store value
   • Subscribe to Store changes

2. USER INPUT
   • onChange event
   • handleChange(newValue)
   • setLocalValue(newValue) → instant UI
   • Start debounce timer

3. VALIDATION
   • Client-side Zod check
   • If invalid → show error, stop
   • If valid → continue

4. DEBOUNCE WAIT
   • Wait 500ms (default)
   • If another change → cancel previous, restart

5. OPTIMISTIC UPDATE
   • Store.updateField()
   • UI already shows newValue

6. OFFLINE CHECK
   • If offline → queue, stop
   • If online → continue

7. SERVER ACTION
   • updateEntityAction()
   • Server-side Zod validation
   • RLS check
   • Database UPDATE

8. RESPONSE
   • Success → done ✅
   • Error → rollback ❌
       • Store.updateField(oldValue)
       • Show error inline

9. REALTIME SYNC
   • Other tab/user changed field
   • Focus Wins check
       • Focused → defer
       • Not focused → apply

10. BLUR
    • onBlur event
    • Immediate save (if auto mode)
    • Apply pending updates (Focus Wins)
    • Clear focus

11. UNMOUNT
    • Cleanup subscriptions
    • Cancel pending debounce
    • Apply pending updates
```

---

## 🎨 CONDITIONAL FIELDS

### Концепция:

**Поля могут зависеть друг от друга:**
- Visibility: показать/скрыть
- Required: обязательное/опциональное

### Архитектура:

```
FieldGroup (conditional=true)
    ↓
ConditionalFieldsProvider
  • Subscribe to entity (ONE time!)
  • Compute visibility map
  • Compute required map
    ↓
Context (values, visibility, required)
    ↓
EntityField
  • useFieldVisibility()
  • useFieldRequired()
  • If !visible → return null
  • If required → add "*" to label
```

### Registry Config:

```typescript
description: {
  component: EditableTextarea,
  
  // Simple condition
  visibleWhen: {
    field: 'company_type',
    equals: 'legal_entity'
  },
  
  // Complex condition
  visibleWhen: {
    field: 'status',
    condition: (val) => val === 'active' || val === 'pending'
  },
  
  // Dynamic required
  requiredWhen: {
    field: 'company_type',
    equals: 'legal_entity'
  }
}
```

### Performance:

```
БЕЗ Conditional:
  10 fields × 10 subscriptions = 100 subscriptions ❌

С Conditional:
  1 FieldGroup × 1 subscription = 1 subscription ✅
  (провайдер подписывается один раз на всю entity)
```

### Ограничения:

1. **Нет AND/OR** (пока)
   ```typescript
   // ❌ НЕ РАБОТАЕТ:
   visibleWhen: {
     all: [
       { field: 'status', equals: 'active' },
       { field: 'type', equals: 'premium' }
     ]
   }
   
   // ✅ WORKAROUND:
   visibleWhen: {
     field: 'status',
     condition: (val) => {
       const type = values.type
       return val === 'active' && type === 'premium'
     }
   }
   ```

2. **Нет nested conditions** (A → B → C)
3. **Нет cross-entity** (tasks.field зависит от projects.field)

---

## 📖 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Пример 1: Простое поле (auto-save)

```tsx
// Auto-save, Notion-style
<EntityField 
  entity="tasks"
  entityId={taskId}
  name="title"
  value={task.title}
/>

// Пользователь печатает → auto-save через 500ms
```

### Пример 2: Manual save (с кнопками)

```tsx
import { FieldGroup } from '@/components/fields/FieldGroup'
import { FieldButtons } from '@/components/fields/FieldButtons'

<FieldGroup>
  <EntityField 
    entity="tasks"
    entityId={taskId}
    name="title"
    value={task.title}
    customProps={{ saveMode: 'manual' }}
  />
</FieldGroup>

<FieldButtons 
  onSubmit={handleSave}
  onCancel={handleCancel}
/>
```

### Пример 3: Conditional fields

```tsx
<FieldGroup 
  entity="companies" 
  entityId={companyId}
  conditional  // ✅ Включить conditional!
>
  {/* Всегда видимо */}
  <EntityField 
    name="company_type"
    value={company.company_type}
  />
  
  {/* Auto show/hide based on company_type! */}
  <EntityField 
    name="inn"
    value={company.inn}
  />
</FieldGroup>

// Registry:
inn: {
  component: EditableText,
  visibleWhen: {
    field: 'company_type',
    equals: 'legal_entity'
  }
}
```

### Пример 4: Custom validation

```tsx
<EntityField 
  entity="users"
  entityId={userId}
  name="email"
  value={user.email}
  customProps={{
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    validate: (val) => {
      if (val.includes('test@')) {
        return 'Test emails not allowed'
      }
      return true
    }
  }}
/>
```

### Пример 5: Создание новой записи

```tsx
const handleCreate = async () => {
  const result = await createEntityAction({
    entity: 'tasks',
    data: {
      title: formData.title,
      status: 'todo',
      user_id: currentUserId,
    }
  })
  
  if (result.data) {
    // Добавить в Store
    useStore.getState().upsertEntity('tasks', result.data.id, result.data)
    
    // Redirect
    router.push(`/tasks/${result.data.id}`)
  }
}
```

### Пример 6: Real-time subscription

```tsx
useEffect(() => {
  // Subscribe to all tasks for current user
  const unsubscribe = subscribeToEntity('tasks', {
    field: 'user_id',
    value: currentUserId
  })
  
  return () => unsubscribe()
}, [currentUserId])
```

---

## 🏗️ АРХИТЕКТУРНЫЕ РЕШЕНИЯ

### 1. Почему Zustand, а не Redux?

**Выбор:** Zustand  
**Причина:**
- Проще API (меньше boilerplate)
- Нет Provider hell
- Хорошая TypeScript поддержка
- Нет нормализации (by design)

### 2. Почему НЕ React Hook Form?

**Выбор:** Custom hook (useEditableField)  
**Причина:**
- Field-Driven vs Form-Driven конфликт
- Per-field auto-save невозможен в RHF
- RHF создаёт overhead (каждое поле = своя форма)
- Более простая архитектура

### 3. Почему Server Actions, а не tRPC?

**Выбор:** next-safe-action  
**Причина:**
- Нативная Next.js интеграция
- Нет дополнительного layer
- RLS на уровне Supabase (не нужен middleware)
- Проще для новичков

### 4. Почему denormalized Store?

**Выбор:** НЕ нормализовать данные  
**Причина:**
- Проще код
- Меньше complexity
- Supabase уже нормализован
- Не нужны selectors для связей

### 5. Почему Focus Wins?

**Выбор:** Defer remote updates пока поле в фокусе  
**Причина:**
- Не перебиваем ввод пользователя
- Лучший UX чем CRDTs
- Проще чем Operational Transform
- Работает для 99% случаев

### 6. Почему Optimistic UI?

**Выбор:** Update UI сразу, rollback при ошибке  
**Причина:**
- Instant feedback (ощущение скорости)
- Notion-style UX
- Лучше чем spinners/loaders
- Rollback покрывает ошибки

### 7. Почему Offline-First?

**Выбор:** localStorage queue + auto-sync  
**Причина:**
- Работает в плохой сети
- Mobile-friendly
- Нет потери данных
- Прогрессивное улучшение

### 8. Почему NOT IndexedDB?

**Выбор:** localStorage (пока)  
**Причина:**
- Проще API
- Достаточно для очереди
- Синхронный (не нужен await)
- Можем мигрировать позже

---

## 🎯 КЛЮЧЕВЫЕ ТОЧКИ ДЛЯ AI

Если ты AI и читаешь это для понимания архитектуры:

### Запомни главное:

1. **Field = Autonomous Unit**
   - Каждое поле независимо
   - Своё состояние, валидация, синхронизация

2. **Single Source of Truth: Supabase → Store → UI**
   - НЕ локальное состояние в компонентах
   - Всё через Zustand Store

3. **Optimistic Updates**
   - Сначала UI, потом сервер
   - Rollback при ошибке

4. **Focus Wins**
   - Если поле в фокусе → local приоритет
   - Remote updates defer до blur

5. **Conditional через Context**
   - FieldGroup создаёт провайдер
   - EntityField читает видимость/required

6. **Server Actions для мутаций**
   - Validation: client (Zod) + server (Zod)
   - Security: RLS на уровне БД

7. **Realtime для sync**
   - Supabase subscriptions
   - Focus Wins для конфликтов

8. **Offline queue**
   - localStorage для очереди
   - Auto-sync при reconnect

### НЕ делай так:

❌ НЕ создавай локальное состояние в компонентах (все через Store!)  
❌ НЕ используй React Hook Form (конфликт с Field-Driven)  
❌ НЕ нормализуй Store (denormalized by design)  
❌ НЕ создавай селекторы (читай напрямую)  
❌ НЕ показывай modals "Saved!" (silent updates)  
❌ НЕ блокируй UI при сохранении (optimistic!)  
❌ НЕ игнорируй Focus Wins (перебьёшь ввод!)  

### Делай так:

✅ Читай из Store: `useStore(state => state.entities...)`  
✅ Обновляй через Field Handler: `updateField(...)`  
✅ Используй data-attributes для Focus Wins  
✅ Используй conditional через FieldGroup  
✅ Validation через Zod (client + server)  
✅ Silent updates (inline errors только)  
✅ Offline-first подход  

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ

### Файлы для изучения:

1. `lib/store/index.ts` - Universal Store
2. `lib/field-handler/index.ts` - Update orchestration
3. `hooks/useEditableField.ts` - Main hook
4. `components/EntityField.tsx` - Universal router
5. `contexts/ConditionalFieldsContext.tsx` - Conditional logic
6. `lib/registry.tsx` - Field configs

### Документация:

- ARCHITECTURE_FULL.md - Полная архитектура
- CONDITIONAL_FIELDS_README.md - Conditional fields гайд
- TEST_NOTES_COMPLETE_GUIDE.md - Практический пример

---

**КОНЕЦ СПЕЦИФИКАЦИИ**

Версия: 2.0 (March 2025)  
Автор: Field Management System Team  
Лицензия: Для внутреннего использования

---

## 🤖 ДЛЯ AI: CHECKLIST ПОНИМАНИЯ

Прочитав этот документ, ты должен уметь:

- [ ] Объяснить разницу Field-Driven vs Form-Driven
- [ ] Описать data flow от User Input до Database
- [ ] Объяснить как работает Focus Wins
- [ ] Объяснить как работает Optimistic UI
- [ ] Создать новое поле по паттерну
- [ ] Настроить conditional field в registry
- [ ] Объяснить почему НЕ используем RHF
- [ ] Объяснить зачем Offline Manager
- [ ] Server Actions УЖЕ универсальные - ничего делать не нужно!
- [ ] Настроить Realtime subscription

Если что-то непонятно - задавай вопросы! 🚀
