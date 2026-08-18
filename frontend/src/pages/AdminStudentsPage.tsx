import { useEffect, useState, type FormEvent } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import {
  createStudentGroup,
  listSections,
  listStudentGroups,
  searchStudents,
  addGroupMembers,
  type SectionOut,
  type StudentGroupOut,
  type StudentSearchResultOut,
  type StudentGroupCreateOut,
  type AddGroupMembersOut,
} from '../api/admin'
import { ApiError } from '../api/client'
import './AdminStudentsPage.css'

interface AdminStudentsPageProps {
  token: string
}

interface StudentDraft {
  full_name: string
  email: string
}

const MIN_GROUP_SIZE = 1
const MAX_GROUP_SIZE = 8

function emptyDraft(): StudentDraft {
  return { full_name: '', email: '' }
}

// --- Tipos y helpers del modo "agregar a grupo existente" ---

interface NewSlot {
  mode: 'new'
  full_name: string
  email: string
}

interface ExistingSlot {
  mode: 'existing'
  query: string
  results: StudentSearchResultOut[]
  searching: boolean
  searchError: string | null
  selected: StudentSearchResultOut | null
}

type Slot = NewSlot | ExistingSlot

function emptyNewSlot(): NewSlot {
  return { mode: 'new', full_name: '', email: '' }
}

function emptyExistingSlot(): ExistingSlot {
  return { mode: 'existing', query: '', results: [], searching: false, searchError: null, selected: null }
}

// Admin-only (ver App.tsx/AppShell.tsx: el nav item "Estudiantes" solo se
// muestra si isAdmin). Dos modos: crear un grupo nuevo (el proyecto en si
// NO se crea aca, queda vacio hasta que alguno de los estudiantes lo arme
// desde "Mi Proyecto" - ver create_project en el backend, ahi es donde se
// agrega automaticamente al resto del grupo como integrantes), o agregar
// integrantes a un grupo que ya existe (mezclando estudiantes nuevos con
// estudiantes que ya tienen cuenta).
export function AdminStudentsPage({ token }: AdminStudentsPageProps) {
  const [mode, setMode] = useState<'new-group' | 'existing-group'>('new-group')

  // --- Modo "grupo nuevo" ---
  const [sectionName, setSectionName] = useState('')
  const [groupSize, setGroupSize] = useState(String(MIN_GROUP_SIZE))
  const [students, setStudents] = useState<StudentDraft[]>([emptyDraft()])
  const [result, setResult] = useState<StudentGroupCreateOut | null>(null)

  // --- Modo "agregar a grupo existente" ---
  const [sections, setSections] = useState<SectionOut[]>([])
  const [sectionsError, setSectionsError] = useState<string | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
  const [groupsInSection, setGroupsInSection] = useState<StudentGroupOut[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [addSize, setAddSize] = useState(String(MIN_GROUP_SIZE))
  const [addSlots, setAddSlots] = useState<Slot[]>([emptyNewSlot()])
  const [addResult, setAddResult] = useState<AddGroupMembersOut | null>(null)

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (mode !== 'existing-group') return
    let cancelled = false
    listSections(token)
      .then((data) => {
        if (!cancelled) setSections(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setSectionsError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [mode, token])

  useEffect(() => {
    if (selectedSectionId === null) {
      setGroupsInSection([])
      return
    }
    let cancelled = false
    setGroupsLoading(true)
    listStudentGroups(token, selectedSectionId)
      .then((data) => {
        if (!cancelled) setGroupsInSection(data)
      })
      .catch(() => {
        if (!cancelled) setGroupsInSection([])
      })
      .finally(() => {
        if (!cancelled) setGroupsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedSectionId, token])

  function handleGroupSizeChange(rawValue: string) {
    if (rawValue === '') {
      setGroupSize('')
      return
    }
    const parsed = Number(rawValue)
    if (parsed < MIN_GROUP_SIZE || parsed > MAX_GROUP_SIZE) {
      return
    }
    setGroupSize(rawValue)
    setStudents((prev) => {
      const next = prev.slice(0, parsed)
      while (next.length < parsed) {
        next.push(emptyDraft())
      }

      return next
    })
  }

  function updateStudent(index: number, field: keyof StudentDraft, value: string) {
    setStudents((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  function resetForm() {
    setSectionName('')
    setGroupSize(String(MIN_GROUP_SIZE))
    setStudents([emptyDraft()])
    setResult(null)
    setCopied(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitError(null)
    setSubmitLoading(true)
    try {
      const created = await createStudentGroup(token, {
        section_name: sectionName,
        students,
      })
      setResult(created)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleCopyAll() {
    if (!result) return
    const lines = [
      `Sección: ${result.section_name}`,
      '',
      ...result.students.map(
        (s) => `${s.full_name} — usuario: ${s.username} — contraseña temporal: ${s.temporary_password}`,
      ),
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
  }

  // --- Handlers del modo "agregar a grupo existente" ---

  function handleAddSizeChange(rawValue: string) {
    if (rawValue === '') {
      setAddSize('')
      return
    }
    const parsed = Number(rawValue)
    if (parsed < MIN_GROUP_SIZE || parsed > MAX_GROUP_SIZE) {
      return
    }
    setAddSize(rawValue)
    setAddSlots((prev) => {
      const next = prev.slice(0, parsed)
      while (next.length < parsed) next.push(emptyNewSlot())
      return next
    })
  }

  function setSlotMode(index: number, slotMode: 'new' | 'existing') {
    setAddSlots((prev) =>
      prev.map((s, i) => (i === index ? (slotMode === 'new' ? emptyNewSlot() : emptyExistingSlot()) : s)),
    )
  }

  function updateAddNewSlot(index: number, field: 'full_name' | 'email', value: string) {
    setAddSlots((prev) =>
      prev.map((s, i) => (i === index && s.mode === 'new' ? { ...s, [field]: value } : s)),
    )
  }

  function updateExistingSlotQuery(index: number, value: string) {
    setAddSlots((prev) =>
      prev.map((s, i) => (i === index && s.mode === 'existing' ? { ...s, query: value } : s)),
    )
  }

  async function searchForSlot(index: number) {
    const slot = addSlots[index]
    if (slot.mode !== 'existing' || !slot.query.trim()) return
    setAddSlots((prev) =>
      prev.map((s, i) =>
        i === index && s.mode === 'existing' ? { ...s, searching: true, searchError: null } : s,
      ),
    )
    try {
      const results = await searchStudents(token, slot.query)
      setAddSlots((prev) =>
        prev.map((s, i) => (i === index && s.mode === 'existing' ? { ...s, results, searching: false } : s)),
      )
    } catch (err) {
      setAddSlots((prev) =>
        prev.map((s, i) =>
          i === index && s.mode === 'existing'
            ? {
                ...s,
                searching: false,
                searchError: err instanceof ApiError ? err.message : 'No se pudo buscar.',
              }
            : s,
        ),
      )
    }
  }

  function selectExistingForSlot(index: number, selected: StudentSearchResultOut) {
    setAddSlots((prev) =>
      prev.map((s, i) =>
        i === index && s.mode === 'existing' ? { ...s, selected, results: [], query: '' } : s,
      ),
    )
  }

  function clearExistingSelection(index: number) {
    setAddSlots((prev) =>
      prev.map((s, i) => (i === index && s.mode === 'existing' ? { ...s, selected: null } : s)),
    )
  }

  function resetAddForm() {
    setSelectedSectionId(null)
    setSelectedGroupId(null)
    setAddSize(String(MIN_GROUP_SIZE))
    setAddSlots([emptyNewSlot()])
    setAddResult(null)
    setCopied(false)
  }

  async function handleAddMembers(event: FormEvent) {
    event.preventDefault()
    if (selectedGroupId === null) return
    setSubmitError(null)
    setSubmitLoading(true)
    try {
      const addedResult = await addGroupMembers(token, selectedGroupId, {
        new_students: addSlots
          .filter((s): s is NewSlot => s.mode === 'new')
          .map(({ full_name, email }) => ({ full_name, email })),
        existing_student_ids: addSlots
          .filter((s): s is ExistingSlot => s.mode === 'existing' && s.selected !== null)
          .map((s) => s.selected!.id),
      })
      setAddResult(addedResult)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleCopyAddResult() {
    if (!addResult) return
    const lines = [
      `Sección: ${addResult.section_name}`,
      '',
      ...addResult.added_new.map(
        (s) => `${s.full_name} — usuario: ${s.username} — contraseña temporal: ${s.temporary_password}`,
      ),
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
  }

  const canSubmitAdd =
    selectedGroupId !== null &&
    addSlots.some(
      (s) => (s.mode === 'new' && s.full_name && s.email) || (s.mode === 'existing' && s.selected !== null),
    )

  // --- Resultado: grupo nuevo creado ---
  if (result) {
    return (
      <div className="admin-students-page">
        <Card className="admin-students-result">
          <p className="admin-students-warning" role="alert">
            Guardá esta información ahora — las contraseñas no se pueden volver a mostrar
            después de salir de esta pantalla.
          </p>
          <h2>Grupo creado en {result.section_name}</h2>
          <table className="admin-students-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Contraseña temporal</th>
              </tr>
            </thead>
            <tbody>
              {result.students.map((s) => (
                <tr key={s.id}>
                  <td>{s.full_name}</td>
                  <td>{s.username}</td>
                  <td className="admin-students-password">{s.temporary_password}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="admin-students-result-actions">
            <Button variant="secondary" onClick={handleCopyAll}>
              {copied ? 'Copiado ✓' : 'Copiar todo'}
            </Button>
            <Button onClick={resetForm}>Crear otro grupo</Button>
          </div>
        </Card>
      </div>
    )
  }

  // --- Resultado: integrantes agregados a un grupo existente ---
  if (addResult) {
    return (
      <div className="admin-students-page">
        <Card className="admin-students-result">
          {addResult.added_new.length > 0 && (
            <p className="admin-students-warning" role="alert">
              Guardá esta información ahora — las contraseñas no se pueden volver a mostrar
              después de salir de esta pantalla.
            </p>
          )}
          <h2>Integrantes agregados a {addResult.section_name}</h2>

          {addResult.added_new.length > 0 && (
            <>
              <h3 className="admin-students-subheading">Cuentas nuevas</h3>
              <table className="admin-students-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>Contraseña temporal</th>
                  </tr>
                </thead>
                <tbody>
                  {addResult.added_new.map((s) => (
                    <tr key={s.id}>
                      <td>{s.full_name}</td>
                      <td>{s.username}</td>
                      <td className="admin-students-password">{s.temporary_password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {addResult.added_existing.length > 0 && (
            <>
              <h3 className="admin-students-subheading">Cuentas existentes agregadas al grupo</h3>
              <ul className="admin-students-existing-list">
                {addResult.added_existing.map((s) => (
                  <li key={s.id}>
                    {s.full_name} — usuario: {s.username}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="admin-students-result-actions">
            {addResult.added_new.length > 0 && (
              <Button variant="secondary" onClick={handleCopyAddResult}>
                {copied ? 'Copiado ✓' : 'Copiar contraseñas nuevas'}
              </Button>
            )}
            <Button onClick={resetAddForm}>Agregar a otro grupo</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="admin-students-page">
      <div className="admin-students-mode-toggle">
        <Button variant={mode === 'new-group' ? 'primary' : 'secondary'} onClick={() => setMode('new-group')}>
          Crear grupo nuevo
        </Button>
        <Button
          variant={mode === 'existing-group' ? 'primary' : 'secondary'}
          onClick={() => setMode('existing-group')}
        >
          Agregar a un grupo existente
        </Button>
      </div>

      {mode === 'new-group' ? (
        <Card className="admin-students-form-card">
          <form className="admin-students-form" onSubmit={handleSubmit}>
            <Input
              label="Sección (ej. 11°A)"
              value={sectionName}
              onChange={(event) => setSectionName(event.target.value)}
              required
            />
            <Input
              label="Cantidad de estudiantes en el grupo"
              type="number"
              min={MIN_GROUP_SIZE}
              max={MAX_GROUP_SIZE}
              value={groupSize}
              onChange={(event) => handleGroupSizeChange(event.target.value)}
              onFocus={(event) => event.target.select()}
            />

            <div className="admin-students-list">
              {students.map((student, index) => (
                <div className="admin-students-row" key={index}>
                  <span className="admin-students-row-label">Estudiante {index + 1}</span>
                  <Input
                    label="Nombre completo"
                    value={student.full_name}
                    onChange={(event) => updateStudent(index, 'full_name', event.target.value)}
                    required
                  />
                  <Input
                    label="Correo"
                    type="email"
                    value={student.email}
                    onChange={(event) => updateStudent(index, 'email', event.target.value)}
                    required
                  />
                </div>
              ))}
            </div>

            {submitError && <p className="admin-students-error">{submitError}</p>}
            <Button type="submit" disabled={submitLoading}>
              Crear grupo
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="admin-students-form-card">
          <div className="admin-students-form">
            <div className="input-group">
              <label className="input-label" htmlFor="admin-students-section-select">
                Sección
              </label>
              <select
                id="admin-students-section-select"
                className="input"
                value={selectedSectionId ?? ''}
                onChange={(event) => {
                  setSelectedGroupId(null)
                  setSelectedSectionId(event.target.value ? Number(event.target.value) : null)
                }}
              >
                <option value="">Elegí una sección</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {sectionsError && <p className="admin-students-error">{sectionsError}</p>}
            </div>

            {selectedSectionId !== null && (
              <div className="admin-students-group-picker">
                {groupsLoading ? (
                  <p>Cargando grupos…</p>
                ) : groupsInSection.length === 0 ? (
                  <p className="admin-students-empty">Todavía no hay grupos en esta sección.</p>
                ) : (
                  groupsInSection.map((group, index) => (
                    <label key={group.id} className="admin-students-group-option">
                      <input
                        type="radio"
                        name="admin-students-group"
                        checked={selectedGroupId === group.id}
                        onChange={() => setSelectedGroupId(group.id)}
                      />
                      <span>
                        {/* index + 1, no group.id: el id es un correlativo global entre
                            TODAS las secciones (por eso 11°B mostraba "Grupo 5") - esta
                            lista ya viene filtrada a una sola sección, asi que la
                            posición en el array es un número 1, 2, 3... propio de esa
                            sección. */}
                        <strong>Grupo {index + 1}</strong> —{' '}
                        {group.students.length === 0
                          ? 'sin integrantes todavía'
                          : group.students.map((s) => s.full_name).join(', ')}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}

            {selectedGroupId !== null && (
              <form className="admin-students-form" onSubmit={handleAddMembers}>
                <Input
                  label="Cantidad de integrantes a agregar"
                  type="number"
                  min={MIN_GROUP_SIZE}
                  max={MAX_GROUP_SIZE}
                  value={addSize}
                  onChange={(event) => handleAddSizeChange(event.target.value)}
                  onFocus={(event) => event.target.select()}
                />

                <div className="admin-students-list">
                  {addSlots.map((slot, index) => (
                    <div className="admin-students-row" key={index}>
                      <div className="admin-students-row-header">
                        <span className="admin-students-row-label">Integrante {index + 1}</span>
                        <div className="admin-students-slot-toggle">
                          <button
                            type="button"
                            className={`admin-students-toggle-btn${slot.mode === 'new' ? ' admin-students-toggle-btn--active' : ''}`}
                            onClick={() => setSlotMode(index, 'new')}
                          >
                            Nuevo
                          </button>
                          <button
                            type="button"
                            className={`admin-students-toggle-btn${slot.mode === 'existing' ? ' admin-students-toggle-btn--active' : ''}`}
                            onClick={() => setSlotMode(index, 'existing')}
                          >
                            Existente
                          </button>
                        </div>
                      </div>

                      {slot.mode === 'new' ? (
                        <>
                          <Input
                            label="Nombre completo"
                            value={slot.full_name}
                            onChange={(event) => updateAddNewSlot(index, 'full_name', event.target.value)}
                          />
                          <Input
                            label="Correo"
                            type="email"
                            value={slot.email}
                            onChange={(event) => updateAddNewSlot(index, 'email', event.target.value)}
                          />
                        </>
                      ) : slot.selected ? (
                        <div className="admin-students-selected">
                          <span>
                            {slot.selected.full_name} — usuario: {slot.selected.username}
                          </span>
                          <Button type="button" variant="secondary" onClick={() => clearExistingSelection(index)}>
                            Cambiar
                          </Button>
                        </div>
                      ) : (
                        <div className="admin-students-search">
                          <div className="admin-students-search-row">
                            <Input
                              label="Buscar por nombre o usuario"
                              value={slot.query}
                              onChange={(event) => updateExistingSlotQuery(index, event.target.value)}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => searchForSlot(index)}
                              disabled={slot.searching || !slot.query.trim()}
                            >
                              Buscar
                            </Button>
                          </div>
                          {slot.searchError && <p className="admin-students-error">{slot.searchError}</p>}
                          {slot.results.length > 0 && (
                            <ul className="admin-students-search-results">
                              {slot.results.map((r) => (
                                <li key={r.id}>
                                  <span>
                                    {r.full_name} — {r.username}
                                    {r.already_in_group && (
                                      <span className="admin-students-occupied-tag">ya en un grupo</span>
                                    )}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => selectExistingForSlot(index, r)}
                                    disabled={r.already_in_group}
                                  >
                                    Elegir
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {submitError && <p className="admin-students-error">{submitError}</p>}
                <Button type="submit" disabled={submitLoading || !canSubmitAdd}>
                  Agregar al grupo
                </Button>
              </form>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
