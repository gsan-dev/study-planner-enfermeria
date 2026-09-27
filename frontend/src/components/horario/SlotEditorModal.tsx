import { useState, type FormEvent } from 'react'
import type { DiaSemana, Horario } from '../../types/models'
import { COLORES, DIAS } from '../asignaturas/constants'
import { TrashIcon } from '../icons'
import { Button } from '../ui/Button'
import { inputClass, SelectField, TextField } from '../ui/Field'
import { FormError } from '../ui/FormError'
import { Modal } from '../ui/Modal'

const NUEVA = '__nueva__'

export interface SlotDraft extends Horario {
  /** Asignatura a la que pertenece (solo en el editor global). */
  asignaturaKey?: string
}

export interface SlotResult extends Horario {
  asignaturaKey?: string
  /** Si se eligió "Nueva asignatura". */
  nuevaAsignatura?: { nombre: string; color: string }
}

interface SlotEditorModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initial: SlotDraft | null
  /** Si se pasa, se puede elegir (o crear) la asignatura de la clase. */
  asignaturas?: { key: string; nombre: string; color: string }[]
  /** Devuelve un mensaje si la franja choca con otra de la misma asignatura. */
  validate?: (slot: SlotResult) => string | null
  onSave: (slot: SlotResult) => void
  onDelete?: () => void
  onClose: () => void
}

export function SlotEditorModal(props: SlotEditorModalProps) {
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.mode === 'create' ? 'Añadir clase' : 'Editar clase'}>
      {props.open && props.initial && <SlotForm {...props} initial={props.initial} />}
    </Modal>
  )
}

function SlotForm({ mode, initial, asignaturas, validate, onSave, onDelete, onClose }: SlotEditorModalProps & { initial: SlotDraft }) {
  const [asignaturaKey, setAsignaturaKey] = useState(initial.asignaturaKey ?? asignaturas?.[0]?.key ?? NUEVA)
  const [nuevaNombre, setNuevaNombre] = useState('')
  const usados = new Set(asignaturas?.map((a) => a.color))
  const [nuevaColor] = useState(() => COLORES.find((c) => !usados.has(c.value))?.value ?? COLORES[0].value)
  const [dia, setDia] = useState<DiaSemana>(initial.dia)
  const [horaInicio, setHoraInicio] = useState(initial.horaInicio)
  const [horaFin, setHoraFin] = useState(initial.horaFin)
  const [aula, setAula] = useState(initial.aula ?? '')
  const [error, setError] = useState('')

  const conSelector = Boolean(asignaturas)
  const esNueva = conSelector && asignaturaKey === NUEVA

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    // Este modal puede abrirse dentro del formulario de asignatura: sin esto,
    // React propagaría el submit y también se enviaría ese formulario.
    event.stopPropagation()
    if (esNueva && !nuevaNombre.trim()) return setError('Escribe el nombre de la nueva asignatura')
    if (!/^\d{2}:\d{2}$/.test(horaInicio) || !/^\d{2}:\d{2}$/.test(horaFin)) return setError('Indica la hora de inicio y de fin')
    if (horaFin <= horaInicio) return setError('La hora de fin debe ser posterior a la de inicio')

    const slot: SlotResult = {
      dia,
      horaInicio,
      horaFin,
      ...(aula.trim() ? { aula: aula.trim() } : {}),
      ...(conSelector
        ? esNueva
          ? { nuevaAsignatura: { nombre: nuevaNombre.trim(), color: nuevaColor } }
          : { asignaturaKey }
        : {}),
    }
    const conflicto = validate?.(slot)
    if (conflicto) return setError(conflicto)
    onSave(slot)
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {conSelector && (
        <>
          <SelectField label="Asignatura" value={asignaturaKey} onChange={(e) => setAsignaturaKey(e.target.value)}>
            {asignaturas!.map((a) => (
              <option key={a.key} value={a.key}>
                {a.nombre}
              </option>
            ))}
            <option value={NUEVA}>+ Nueva asignatura…</option>
          </SelectField>
          {esNueva && (
            <TextField
              label="Nombre de la nueva asignatura"
              autoFocus
              placeholder="Ej. Farmacología"
              value={nuevaNombre}
              onChange={(e) => setNuevaNombre(e.target.value)}
            />
          )}
        </>
      )}

      <SelectField label="Día" value={dia} onChange={(e) => setDia(Number(e.target.value) as DiaSemana)}>
        {DIAS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </SelectField>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium text-slate-700">
          Inicio
          <input
            type="time"
            step={300}
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            className={`${inputClass} mt-1.5 border-slate-300`}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Fin
          <input
            type="time"
            step={300}
            value={horaFin}
            onChange={(e) => setHoraFin(e.target.value)}
            className={`${inputClass} mt-1.5 border-slate-300`}
          />
        </label>
      </div>

      <TextField label="Aula" placeholder="Opcional" value={aula} onChange={(e) => setAula(e.target.value)} />

      <FormError message={error} />

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
        {mode === 'edit' && onDelete && (
          <Button variant="ghost" onClick={onDelete} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:mr-auto">
            <TrashIcon className="size-4" />
            Quitar clase
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} className="sm:ml-auto">
          Cancelar
        </Button>
        <Button type="submit">{mode === 'create' ? 'Añadir' : 'Guardar'}</Button>
      </div>
    </form>
  )
}
