import { useState, type KeyboardEvent } from 'react'
import { getErrorMessage } from '../../services/api'
import { createTema } from '../../services/asignaturasService'
import type { Tema } from '../../types/models'
import { CheckIcon, PlusIcon } from '../icons'
import { Button } from '../ui/Button'
import { inputClass } from '../ui/Field'
import { Spinner } from '../ui/Spinner'

interface TemasSelectorProps {
  asignaturaId: string
  /** null = cargando. */
  temario: Tema[] | null
  selected: string[]
  onChange: (selected: string[]) => void
  /** Tema recién creado desde aquí (ya viene seleccionado). */
  onTemaCreado: (tema: Tema) => void
  color: string
  error?: string
}

/**
 * Lista de temas de la asignatura con casillas para elegir cuáles entran en
 * el examen. Permite añadir temas nuevos al temario sin salir.
 *
 * No usa <form>: vive dentro del formulario del examen.
 */
export function TemasSelector({ asignaturaId, temario, selected, onChange, onTemaCreado, color, error }: TemasSelectorProps) {
  const [nuevo, setNuevo] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  if (!temario) {
    return (
      <div className="flex justify-center py-6 text-slate-400">
        <Spinner />
      </div>
    )
  }

  const seleccion = new Set(selected)
  const todos = temario.length > 0 && temario.every((t) => seleccion.has(t._id))

  const toggle = (id: string) => {
    // Se mantiene el orden del temario.
    const next = new Set(seleccion)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(temario.filter((t) => next.has(t._id)).map((t) => t._id))
  }

  const anadir = async () => {
    const nombre = nuevo.trim()
    if (!nombre) return
    setAdding(true)
    setAddError('')
    try {
      const tema = await createTema(asignaturaId, { nombre, dificultad: 3, horasEstimadas: 2 })
      onTemaCreado(tema)
      setNuevo('')
    } catch (err) {
      setAddError(getErrorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter añade el tema en lugar de enviar el formulario del examen.
    if (event.key === 'Enter') {
      event.preventDefault()
      anadir()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {temario.length === 0 ? (
        <p className="text-sm text-slate-500">Esta asignatura aún no tiene temas. Puedes añadirlos aquí abajo.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-slate-600">
              {selected.length} de {temario.length} temas
            </span>
            <button
              type="button"
              onClick={() => onChange(todos ? [] : temario.map((t) => t._id))}
              className="min-h-9 cursor-pointer rounded-lg px-2 font-semibold text-brand-700 hover:bg-brand-50"
            >
              {todos ? 'Quitar todos' : 'Marcar todos'}
            </button>
          </div>
          <ul className="flex max-h-64 flex-col overflow-y-auto rounded-xl border border-slate-200">
            {temario.map((tema) => {
              const checked = seleccion.has(tema._id)
              return (
                <li key={tema._id} className="border-b border-slate-100 last:border-b-0">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                    <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => toggle(tema._id)} />
                    <span
                      aria-hidden="true"
                      className={[
                        'grid size-5 shrink-0 place-items-center rounded-md border-2 text-white transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600/40',
                        checked ? 'border-transparent' : 'border-slate-300 bg-white',
                      ].join(' ')}
                      style={checked ? { backgroundColor: color } : undefined}
                    >
                      {checked && <CheckIcon className="size-3.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-slate-800">{tema.nombre}</span>
                    {tema.estudiado && <span className="shrink-0 text-xs font-medium text-emerald-700">Estudiado</span>}
                  </label>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          aria-label="Nuevo tema"
          placeholder="Añadir un tema al temario…"
          autoComplete="off"
          value={nuevo}
          maxLength={160}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={onKeyDown}
          className={`${inputClass} border-slate-300 focus:border-brand-600`}
        />
        <Button variant="secondary" onClick={anadir} loading={adding} disabled={!nuevo.trim()} aria-label="Añadir tema">
          <PlusIcon className="size-5" />
        </Button>
      </div>
      {(addError || error) && <p className="text-sm text-rose-600">{addError || error}</p>}
    </div>
  )
}
