import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { diaLocal } from '../../lib/fechas'
import { actualizarTarea, borrarTarea, crearTarea } from '../../services/agendaService'
import { getErrorMessage } from '../../services/api'
import type { Tarea } from '../../types/models'
import { CheckIcon, ClockIcon, PlusIcon, TrashIcon } from '../icons'
import { Button, IconButton } from '../ui/Button'
import { inputClass } from '../ui/Field'

interface TareasSectionProps {
  dia: string
  esHoy: boolean
  tareas: Tarea[]
  /** Tareas sin hacer de días anteriores (solo se muestran en el día de hoy). */
  pendientes: Tarea[]
  onChange: (tarea: Tarea) => void
  onRemove: (id: string) => void
}

function Casilla({ hecho, label, onClick, disabled }: { hecho: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={hecho}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-11 shrink-0 cursor-pointer place-items-center disabled:cursor-wait"
    >
      <span
        className={[
          'grid size-6 place-items-center rounded-full border-2 text-white transition-colors',
          hecho ? 'border-primario bg-primario' : 'border-slate-300 bg-superficie',
        ].join(' ')}
      >
        {hecho && <CheckIcon className="size-4" strokeWidth={3} />}
      </span>
    </button>
  )
}

function TareaItem({ tarea, onChange, onRemove }: { tarea: Tarea; onChange: (t: Tarea) => void; onRemove: (id: string) => void }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(tarea.texto)
  const [hora, setHora] = useState(tarea.hora ?? '')
  const [ocupado, setOcupado] = useState(false)

  const guardar = async (cambios: Parameters<typeof actualizarTarea>[1], optimista: Tarea) => {
    const anterior = tarea
    onChange(optimista)
    setOcupado(true)
    try {
      onChange(await actualizarTarea(tarea._id, cambios))
    } catch (err) {
      onChange(anterior)
      toast.error(getErrorMessage(err))
    } finally {
      setOcupado(false)
    }
  }

  const terminarEdicion = () => {
    setEditando(false)
    const limpio = texto.trim()
    if (!limpio) {
      setTexto(tarea.texto)
      setHora(tarea.hora ?? '')
      return
    }
    if (limpio === tarea.texto && hora === (tarea.hora ?? '')) return
    guardar({ texto: limpio, hora }, { ...tarea, texto: limpio, hora: hora || undefined })
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      terminarEdicion()
    }
    if (event.key === 'Escape') {
      setTexto(tarea.texto)
      setHora(tarea.hora ?? '')
      setEditando(false)
    }
  }

  const borrar = async () => {
    onRemove(tarea._id)
    try {
      await borrarTarea(tarea._id)
      toast.success('Tarea borrada', {
        action: {
          label: 'Deshacer',
          onClick: () => {
            crearTarea({ fecha: tarea.fecha.slice(0, 10), texto: tarea.texto, hora: tarea.hora })
              .then(onChange)
              .catch((err) => toast.error(getErrorMessage(err)))
          },
        },
      })
    } catch (err) {
      onChange(tarea)
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <li className="flex items-center gap-1 rounded-xl hover:bg-slate-50">
      <Casilla
        hecho={tarea.hecho}
        label={`${tarea.texto}: ${tarea.hecho ? 'hecha' : 'pendiente'}`}
        disabled={ocupado}
        onClick={() => guardar({ hecho: !tarea.hecho }, { ...tarea, hecho: !tarea.hecho })}
      />
      {editando ? (
        <div
          className="flex min-w-0 flex-1 gap-2 py-1"
          onBlur={(e) => {
            // Termina al salir del grupo (texto + hora), no al pasar de uno a otro.
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) terminarEdicion()
          }}
        >
          <input
            autoFocus
            aria-label="Texto de la tarea"
            value={texto}
            maxLength={300}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={onKeyDown}
            className={`${inputClass} min-h-10 min-w-0 flex-1 border-slate-300 focus:border-brand-600`}
          />
          <input
            type="time"
            aria-label="Hora"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            onKeyDown={onKeyDown}
            className={`${inputClass} min-h-10 w-28! shrink-0 border-slate-300 focus:border-brand-600`}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditando(true)}
          aria-label={`Editar: ${tarea.texto}`}
          className="flex min-h-11 min-w-0 flex-1 cursor-text items-center gap-2 text-left"
        >
          <span className={`min-w-0 flex-1 break-words ${tarea.hecho ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
            {tarea.texto}
          </span>
          {tarea.hora && (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm text-slate-500 tabular-nums">
              <ClockIcon className="size-4" />
              {tarea.hora}
            </span>
          )}
        </button>
      )}
      <IconButton label={`Borrar: ${tarea.texto}`} tone="danger" onClick={borrar}>
        <TrashIcon className="size-4.5" />
      </IconButton>
    </li>
  )
}

/** Tareas y apuntes rápidos del día. */
export function TareasSection({ dia, esHoy, tareas, pendientes, onChange, onRemove }: TareasSectionProps) {
  const [texto, setTexto] = useState('')
  const [hora, setHora] = useState('')
  const [adding, setAdding] = useState(false)
  const [moviendo, setMoviendo] = useState(false)

  const anadir = async (event: FormEvent) => {
    event.preventDefault()
    const limpio = texto.trim()
    if (!limpio) return
    setAdding(true)
    try {
      onChange(await crearTarea({ fecha: dia, texto: limpio, hora: hora || undefined }))
      setTexto('')
      setHora('')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  const pasarAHoy = async (lista: Tarea[]) => {
    setMoviendo(true)
    try {
      const movidas = await Promise.all(lista.map((t) => actualizarTarea(t._id, { fecha: dia })))
      movidas.forEach(onChange)
      toast.success(movidas.length === 1 ? 'Tarea pasada a hoy' : `${movidas.length} tareas pasadas a hoy`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setMoviendo(false)
    }
  }

  // Sin hacer primero; las hechas, al final.
  const ordenadas = [...tareas.filter((t) => !t.hecho), ...tareas.filter((t) => t.hecho)]

  return (
    <section aria-labelledby="tareas" className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-superficie p-4">
      <h2 id="tareas" className="font-semibold text-slate-900">
        Tareas y apuntes
      </h2>

      {esHoy && pendientes.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-amber-900">Pendientes de otros días ({pendientes.length})</p>
            {pendientes.length > 1 && (
              <button
                type="button"
                onClick={() => pasarAHoy(pendientes)}
                disabled={moviendo}
                className="min-h-11 shrink-0 cursor-pointer rounded-lg px-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                Pasar todas a hoy
              </button>
            )}
          </div>
          <ul className="mt-1 flex flex-col">
            {pendientes.map((t) => (
              <li key={t._id} className="flex items-center gap-1">
                <Casilla
                  hecho={false}
                  label={`${t.texto}: pendiente`}
                  onClick={() => {
                    const hecha = { ...t, hecho: true }
                    onChange(hecha)
                    actualizarTarea(t._id, { hecho: true })
                      .then(onChange)
                      .catch((err) => {
                        onChange(t)
                        toast.error(getErrorMessage(err))
                      })
                  }}
                />
                <span className="min-w-0 flex-1 text-sm text-slate-800">
                  {t.texto}
                  <span className="ml-1.5 text-xs text-amber-800">
                    · {format(diaLocal(t.fecha), 'EEE d MMM', { locale: es })}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => pasarAHoy([t])}
                  disabled={moviendo}
                  className="min-h-11 shrink-0 cursor-pointer rounded-lg px-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  A hoy
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ordenadas.length === 0 ? (
        <p className="text-sm text-slate-500">Nada apuntado para este día.</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {ordenadas.map((t) => (
            <TareaItem key={t._id} tarea={t} onChange={onChange} onRemove={onRemove} />
          ))}
        </ul>
      )}

      <form onSubmit={anadir} className="mt-1 flex gap-2">
        <input
          aria-label="Nueva tarea"
          placeholder="Apunta algo…"
          autoComplete="off"
          value={texto}
          maxLength={300}
          onChange={(e) => setTexto(e.target.value)}
          className={`${inputClass} min-w-0 flex-1 border-slate-300 focus:border-brand-600`}
        />
        <input
          type="time"
          aria-label="Hora (opcional)"
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          className={`${inputClass} w-28! shrink-0 border-slate-300 focus:border-brand-600`}
        />
        <Button type="submit" loading={adding} disabled={!texto.trim()} aria-label="Añadir tarea" className="shrink-0 px-3">
          <PlusIcon className="size-5" />
        </Button>
      </form>
    </section>
  )
}
