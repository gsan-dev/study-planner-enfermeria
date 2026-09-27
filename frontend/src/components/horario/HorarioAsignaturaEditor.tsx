import { useMemo, useState } from 'react'
import { fromMinutes, solapan, type GridEntry } from '../../lib/horario'
import type { Asignatura, Horario } from '../../types/models'
import { ordenarHorarios } from '../asignaturas/constants'
import { SlotEditorModal, type SlotDraft, type SlotResult } from './SlotEditorModal'
import { TimetableGrid } from './TimetableGrid'

interface HorarioAsignaturaEditorProps {
  horarios: Horario[]
  onChange: (horarios: Horario[]) => void
  nombre: string
  color: string
  /** Resto de asignaturas: se pintan en gris para ver los huecos libres. */
  otras: Asignatura[]
}

type Editing = { mode: 'create' | 'edit'; initial: SlotDraft; index?: number } | null

/** Horario de UNA asignatura editado sobre la tabla semanal. */
export function HorarioAsignaturaEditor({ horarios, onChange, nombre, color, otras }: HorarioAsignaturaEditorProps) {
  const [editing, setEditing] = useState<Editing>(null)

  const entries = useMemo<GridEntry[]>(
    () => [
      ...otras.flatMap((a) =>
        a.horarios.map((h, i) => ({ id: `otra-${a._id}-${i}`, ...h, titulo: a.nombre, color: a.color, muted: true })),
      ),
      ...horarios.map((h, i) => ({
        id: `propia-${i}`,
        ...h,
        titulo: nombre.trim() || 'Esta asignatura',
        detalle: h.aula,
        color,
      })),
    ],
    [otras, horarios, nombre, color],
  )

  const validate = (slot: SlotResult) =>
    horarios.some((h, i) => i !== editing?.index && solapan(h, slot)) ? 'Se solapa con otra clase de esta asignatura' : null

  const save = ({ dia, horaInicio, horaFin, aula }: SlotResult) => {
    const franja: Horario = { dia, horaInicio, horaFin, ...(aula ? { aula } : {}) }
    const resto = editing?.index === undefined ? horarios : horarios.filter((_, i) => i !== editing.index)
    onChange(ordenarHorarios([...resto, franja]))
    setEditing(null)
  }

  return (
    <div>
      <p className="mb-2 text-sm text-slate-500">
        Toca un hueco para añadir una clase y toca una clase para cambiarla.
        {otras.some((a) => a.horarios.length > 0) && ' En gris, tus otras asignaturas.'}
      </p>
      <div className="rounded-xl border border-slate-200 p-1.5">
        <TimetableGrid
          entries={entries}
          hourHeight={40}
          compact
          onCellClick={(dia, hora) =>
            setEditing({ mode: 'create', initial: { dia, horaInicio: fromMinutes(hora * 60), horaFin: fromMinutes((hora + 1) * 60) } })
          }
          onEntryClick={(entry) => {
            const index = Number(entry.id.replace('propia-', ''))
            setEditing({ mode: 'edit', initial: horarios[index], index })
          }}
        />
      </div>
      <SlotEditorModal
        open={editing !== null}
        mode={editing?.mode ?? 'create'}
        initial={editing?.initial ?? null}
        validate={validate}
        onSave={save}
        onDelete={() => {
          if (editing?.index !== undefined) onChange(horarios.filter((_, i) => i !== editing.index))
          setEditing(null)
        }}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
