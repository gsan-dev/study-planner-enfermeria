import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState, type DragEvent } from 'react'
import { diaKey, diaLocal } from '../../lib/fechas'
import { horasRecomendadas, rangoDias, sumaHoras, TIPO_SESION } from '../../lib/plan'
import { getErrorMessage } from '../../services/api'
import type { SesionInput, SesionPreview } from '../../types/api'
import type { DiaSemana, Tema, TipoSesion } from '../../types/models'
import { formatHoras } from '../asignaturas/constants'
import { CheckIcon, CloseIcon } from '../icons'
import { Button } from '../ui/Button'
import { TextField } from '../ui/Field'

interface EditorSesion {
  key: string
  fecha: string // YYYY-MM-DD
  temaId: string
  horas: number
  tipo: TipoSesion
  completado: boolean
  notas?: string
}

type Seleccion = { tipo: 'tema'; temaId: string } | { tipo: 'sesion'; key: string } | null

export interface PlanEditorGuardar {
  horasPorDia: number
  fechaInicio: string
  diasDescanso: DiaSemana[]
  diasPlan: SesionInput[]
}

interface PlanEditorProps {
  /** Temas del examen, en el orden del temario. */
  temas: Tema[]
  color: string
  /** Día del examen (YYYY-MM-DD): se planifica hasta el día anterior. */
  fechaExamen: string
  inicial: { sesiones: SesionPreview[]; horasPorDia: number; fechaInicio: string; diasDescanso: DiaSemana[] }
  onCancel: () => void
  onSave: (plan: PlanEditorGuardar) => Promise<void>
}

let contador = 0
const nuevaKey = () => `s${(contador += 1)}`

const PASO = 0.5
const MAX_DIA = 16

/**
 * Editor manual del plan: se coloca cada tema en los días que se quiera.
 * Tocar un tema (o una sesión) y después un día lo coloca (o lo mueve); en
 * escritorio también se puede arrastrar.
 */
export function PlanEditor({ temas, color, fechaExamen, inicial, onCancel, onSave }: PlanEditorProps) {
  const [sesiones, setSesiones] = useState<EditorSesion[]>(() =>
    inicial.sesiones.map((s) => ({
      key: nuevaKey(),
      fecha: diaKey(s.fecha),
      temaId: s.temaId,
      horas: s.horas,
      tipo: s.tipo,
      completado: s.completado,
      notas: s.notas,
    })),
  )
  const [horasPorDia, setHorasPorDia] = useState(String(inicial.horasPorDia).replace('.', ','))
  const [fechaInicio, setFechaInicio] = useState(inicial.fechaInicio)
  const [seleccion, setSeleccion] = useState<Seleccion>(null)
  const [errores, setErrores] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const temasPorId = new Map(temas.map((t) => [t._id, t]))
  const maxHoras = Number(horasPorDia.replace(',', '.'))
  const limite = Number.isFinite(maxHoras) && maxHoras > 0 ? maxHoras : MAX_DIA

  // Días visibles: desde el inicio (o la primera sesión, si es anterior) hasta la víspera del examen.
  const primera = sesiones.map((s) => s.fecha).sort()[0]
  const desde = primera && primera < fechaInicio ? primera : fechaInicio
  const dias = /^\d{4}-\d{2}-\d{2}$/.test(desde) ? rangoDias(desde, fechaExamen) : []

  const planificadas = (temaId: string) => sumaHoras(sesiones.filter((s) => s.temaId === temaId && s.tipo === 'estudio'))

  const colocar = (dia: string, sel: Exclude<Seleccion, null>) => {
    setErrores([])
    setSesiones((prev) => {
      if (sel.tipo === 'tema') {
        const tema = temasPorId.get(sel.temaId)
        const restante = tema ? horasRecomendadas(tema) - planificadas(sel.temaId) : 1
        const horas = restante > 0 && restante < 1 ? restante : 1
        const existente = prev.find((s) => s.fecha === dia && s.temaId === sel.temaId && s.tipo === 'estudio' && !s.completado)
        if (existente) {
          return prev.map((s) => (s === existente ? { ...s, horas: Math.min(MAX_DIA, s.horas + horas) } : s))
        }
        return [...prev, { key: nuevaKey(), fecha: dia, temaId: sel.temaId, horas, tipo: 'estudio', completado: false }]
      }
      const movida = prev.find((s) => s.key === sel.key)
      if (!movida || movida.fecha === dia) return prev
      const destino = prev.find(
        (s) => s.fecha === dia && s.temaId === movida.temaId && s.tipo === movida.tipo && !s.completado && s.key !== movida.key,
      )
      if (destino) {
        return prev
          .filter((s) => s.key !== movida.key)
          .map((s) => (s === destino ? { ...s, horas: Math.min(MAX_DIA, s.horas + movida.horas) } : s))
      }
      return prev.map((s) => (s.key === movida.key ? { ...s, fecha: dia } : s))
    })
    setSeleccion(null)
  }

  const cambiar = (key: string, cambios: Partial<EditorSesion>) =>
    setSesiones((prev) => prev.map((s) => (s.key === key ? { ...s, ...cambios } : s)))

  const quitar = (key: string) => {
    setSesiones((prev) => prev.filter((s) => s.key !== key))
    if (seleccion?.tipo === 'sesion' && seleccion.key === key) setSeleccion(null)
  }

  // --- Arrastrar (escritorio)
  const onDragStart = (event: DragEvent, sel: Exclude<Seleccion, null>) => {
    event.dataTransfer.setData('application/json', JSON.stringify(sel))
    event.dataTransfer.effectAllowed = 'move'
  }
  const onDrop = (event: DragEvent, dia: string) => {
    event.preventDefault()
    try {
      colocar(dia, JSON.parse(event.dataTransfer.getData('application/json')))
    } catch {
      // Se ha soltado otra cosa (texto, un archivo…): se ignora.
    }
  }

  const validar = (): string[] => {
    const problemas: string[] = []
    if (!Number.isFinite(maxHoras) || maxHoras < 0.5 || maxHoras > MAX_DIA) {
      problemas.push('Indica entre 0,5 y 16 horas al día.')
    }
    if (sesiones.length === 0) problemas.push('Coloca al menos un tema en algún día.')
    const faltan = temas.filter((t) => !t.estudiado && !sesiones.some((s) => s.temaId === t._id))
    if (faltan.length > 0) problemas.push(`Faltan por colocar: ${faltan.map((t) => t.nombre).join(', ')}.`)
    for (const dia of dias) {
      const total = sumaHoras(sesiones.filter((s) => s.fecha === dia))
      if (total > limite) {
        problemas.push(
          `El ${format(diaLocal(dia), "EEEE d 'de' MMMM", { locale: es })} tiene ${formatHoras(total)} (máximo ${formatHoras(limite)}).`,
        )
      }
    }
    return problemas
  }

  const guardar = async () => {
    const problemas = validar()
    setErrores(problemas)
    if (problemas.length > 0) return
    setSaving(true)
    try {
      await onSave({
        horasPorDia: maxHoras,
        fechaInicio,
        diasDescanso: inicial.diasDescanso,
        diasPlan: sesiones.map(({ fecha, temaId, horas, tipo, completado, notas }) => ({ fecha, temaId, horas, tipo, completado, notas })),
      })
    } catch (error) {
      setErrores([getErrorMessage(error)])
      setSaving(false)
    }
  }

  const nombreSeleccion =
    seleccion?.tipo === 'tema'
      ? temasPorId.get(seleccion.temaId)?.nombre
      : seleccion
        ? temasPorId.get(sesiones.find((s) => s.key === seleccion.key)?.temaId ?? '')?.nombre
        : undefined

  return (
    <div className="flex flex-col gap-4">
      <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Horas al día"
              inputMode="decimal"
              value={horasPorDia}
              onChange={(e) => setHorasPorDia(e.target.value)}
            />
            <TextField
              label="Empiezo el"
              type="date"
              value={fechaInicio}
              onChange={(e) => e.target.value && setFechaInicio(e.target.value)}
            />
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-700">Temas del examen</h4>
            <p className="mt-0.5 text-xs text-slate-500">
              Toca un tema y luego el día en que quieres estudiarlo
              <span className="hidden lg:inline"> (o arrástralo)</span>.
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5 lg:flex-col">
              {temas.map((tema) => {
                const hechas = planificadas(tema._id)
                const recomendadas = horasRecomendadas(tema)
                const colocado = sesiones.some((s) => s.temaId === tema._id)
                const activo = seleccion?.tipo === 'tema' && seleccion.temaId === tema._id
                return (
                  <li key={tema._id}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => onDragStart(e, { tipo: 'tema', temaId: tema._id })}
                      onClick={() => setSeleccion(activo ? null : { tipo: 'tema', temaId: tema._id })}
                      aria-pressed={activo}
                      className={[
                        'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-left text-sm transition-colors',
                        activo ? 'border-transparent text-white' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300',
                      ].join(' ')}
                      style={activo ? { backgroundColor: color } : undefined}
                    >
                      {colocado ? (
                        <CheckIcon className="size-4 shrink-0" strokeWidth={3} style={activo ? undefined : { color }} />
                      ) : (
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: activo ? 'white' : color }} />
                      )}
                      <span className="min-w-0 flex-1">
                        {tema.nombre}
                        {tema.estudiado && <span className={activo ? 'text-white/80' : 'text-emerald-700'}> · estudiado</span>}
                      </span>
                      <span className={`shrink-0 text-xs tabular-nums ${activo ? 'text-white/90' : 'text-slate-500'}`}>
                        {formatHoras(hechas).replace(' h', '')}/{formatHoras(recomendadas)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-3">
          {seleccion && (
            <div className="sticky top-2 z-10 flex items-center gap-2 rounded-xl bg-slate-900 py-1 pr-1 pl-4 text-sm text-white shadow-lg">
              <span className="flex-1">
                {seleccion.tipo === 'tema' ? 'Toca un día para colocar' : 'Toca otro día para mover'}{' '}
                <strong>«{nombreSeleccion}»</strong>
              </span>
              <button
                type="button"
                onClick={() => setSeleccion(null)}
                aria-label="Cancelar selección"
                className="grid size-10 cursor-pointer place-items-center rounded-lg hover:bg-white/10"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
          )}

          {dias.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
              No hay días entre la fecha de inicio y el examen.
            </p>
          ) : (
            <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dias.map((dia) => {
                const delDia = sesiones.filter((s) => s.fecha === dia)
                const total = sumaHoras(delDia)
                const excede = total > limite
                const etiqueta = format(diaLocal(dia), "EEEE d 'de' MMMM", { locale: es })
                return (
                  <li
                    key={dia}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, dia)}
                    aria-label={etiqueta}
                    className={[
                      'flex flex-col gap-1 rounded-2xl border bg-white p-3',
                      excede ? 'border-rose-300' : 'border-slate-200',
                    ].join(' ')}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="font-semibold text-slate-900 first-letter:uppercase">{etiqueta}</h4>
                      <span className={`shrink-0 text-sm tabular-nums ${excede ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
                        {formatHoras(total).replace(' h', '')}/{formatHoras(limite)}
                      </span>
                    </div>

                    {delDia.map((s) => {
                      const nombre = temasPorId.get(s.temaId)?.nombre ?? 'Tema'
                      const moviendo = seleccion?.tipo === 'sesion' && seleccion.key === s.key
                      if (s.completado) {
                        return (
                          <div key={s.key} className="flex min-h-10 items-center gap-2 px-1 text-sm text-slate-400">
                            <CheckIcon className="size-4 shrink-0" strokeWidth={3} style={{ color }} />
                            <span className="flex-1 line-through">{nombre}</span>
                            <span className="tabular-nums">{formatHoras(s.horas)}</span>
                          </div>
                        )
                      }
                      return (
                        <div
                          key={s.key}
                          draggable
                          onDragStart={(e) => onDragStart(e, { tipo: 'sesion', key: s.key })}
                          className={[
                            'flex items-center gap-1 rounded-xl border-l-4 py-0.5 pl-1',
                            moviendo ? 'bg-slate-100 ring-2 ring-slate-900' : 'bg-slate-50',
                          ].join(' ')}
                          style={{ borderLeftColor: color }}
                        >
                          <button
                            type="button"
                            onClick={() => setSeleccion(moviendo ? null : { tipo: 'sesion', key: s.key })}
                            aria-pressed={moviendo}
                            aria-label={`Mover ${nombre} a otro día`}
                            className="min-h-10 min-w-0 flex-1 cursor-pointer px-1 text-left text-sm text-slate-800"
                          >
                            <span className="line-clamp-2">{nombre}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => cambiar(s.key, { tipo: s.tipo === 'estudio' ? 'repaso' : 'estudio' })}
                            aria-label={`${nombre}: ${TIPO_SESION[s.tipo].toLowerCase()}. Cambiar a ${s.tipo === 'estudio' ? 'repaso' : 'estudio'}`}
                            className={[
                              'min-h-8 shrink-0 cursor-pointer rounded-full px-2 text-xs font-semibold',
                              s.tipo === 'repaso' ? 'bg-amber-100 text-amber-800' : 'bg-white text-slate-600 ring-1 ring-slate-200',
                            ].join(' ')}
                          >
                            {TIPO_SESION[s.tipo]}
                          </button>
                          <div className="flex shrink-0 items-center" role="group" aria-label={`Horas de ${nombre}`}>
                            <button
                              type="button"
                              onClick={() => cambiar(s.key, { horas: Math.max(0.25, s.horas - (s.horas > PASO ? PASO : 0.25)) })}
                              disabled={s.horas <= 0.25}
                              aria-label={`Menos tiempo para ${nombre}`}
                              className="grid size-9 cursor-pointer place-items-center rounded-lg text-lg text-slate-600 hover:bg-white disabled:opacity-30"
                            >
                              −
                            </button>
                            <span className="w-11 text-center text-sm tabular-nums">{formatHoras(s.horas)}</span>
                            <button
                              type="button"
                              onClick={() => cambiar(s.key, { horas: Math.min(MAX_DIA, s.horas + PASO) })}
                              aria-label={`Más tiempo para ${nombre}`}
                              className="grid size-9 cursor-pointer place-items-center rounded-lg text-lg text-slate-600 hover:bg-white"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => quitar(s.key)}
                            aria-label={`Quitar ${nombre} de este día`}
                            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <CloseIcon className="size-4" />
                          </button>
                        </div>
                      )
                    })}

                    {seleccion ? (
                      <button
                        type="button"
                        onClick={() => colocar(dia, seleccion)}
                        className="mt-1 min-h-11 cursor-pointer rounded-xl border-2 border-dashed border-brand-600 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                      >
                        {seleccion.tipo === 'tema' ? 'Colocar aquí' : 'Mover aquí'}
                      </button>
                    ) : (
                      delDia.length === 0 && <p className="py-2 text-sm text-slate-400">Día libre</p>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>

      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur md:bottom-4">
        {errores.length > 0 && (
          <ul role="alert" className="flex flex-col gap-1 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2 sm:justify-end">
          <span className="mr-auto hidden text-sm text-slate-600 sm:inline">
            {formatHoras(sumaHoras(sesiones))} en {new Set(sesiones.map((s) => s.fecha)).size} días
          </span>
          <Button variant="secondary" onClick={onCancel} disabled={saving} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button onClick={guardar} loading={saving} className="flex-1 sm:flex-none">
            Guardar plan
          </Button>
        </div>
      </div>
    </div>
  )
}
