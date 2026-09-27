import { useEffect, useId, useRef, useState } from 'react'
import { guardarDiario } from '../../services/agendaService'
import { getErrorMessage } from '../../services/api'
import type { Animo, EntradaDiario } from '../../types/models'
import { inputClass } from '../ui/Field'

const ANIMOS: { value: Animo; emoji: string; label: string }[] = [
  { value: 1, emoji: '😣', label: 'Muy mal' },
  { value: 2, emoji: '😕', label: 'Mal' },
  { value: 3, emoji: '😐', label: 'Normal' },
  { value: 4, emoji: '🙂', label: 'Bien' },
  { value: 5, emoji: '😄', label: 'Muy bien' },
]

const ESPERA_MS = 800

type Estado = 'idle' | 'pendiente' | 'guardando' | 'guardado' | 'error'

interface DiarioSectionProps {
  dia: string
  entrada: EntradaDiario | null
  onSaved: (dia: string, entrada: EntradaDiario | null) => void
}

/**
 * Diario del día: texto libre y ánimo. Se guarda solo, un momento después de
 * dejar de escribir (y al cambiar de día o salir de la página).
 *
 * Se monta con `key={dia}`: cada día arranca con su propia entrada.
 */
export function DiarioSection({ dia, entrada, onSaved }: DiarioSectionProps) {
  const [texto, setTexto] = useState(entrada?.texto ?? '')
  const [animo, setAnimo] = useState<Animo | null>(entrada?.animo ?? null)
  const [estado, setEstado] = useState<Estado>('idle')
  const [error, setError] = useState('')
  const textoId = useId()

  // Último valor sin guardar, para poder guardarlo al desmontar.
  const pendiente = useRef<{ texto: string; animo: Animo | null } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const onSavedRef = useRef(onSaved)
  useEffect(() => {
    onSavedRef.current = onSaved
  })

  const guardar = async () => {
    window.clearTimeout(timer.current)
    const valores = pendiente.current
    if (!valores) return
    pendiente.current = null
    setEstado('guardando')
    try {
      const guardada = await guardarDiario(dia, valores.texto, valores.animo)
      onSavedRef.current(dia, guardada)
      // Si se ha seguido escribiendo mientras tanto, queda otro guardado en cola.
      setEstado(pendiente.current ? 'pendiente' : 'guardado')
      setError('')
    } catch (err) {
      pendiente.current ??= valores
      setEstado('error')
      setError(getErrorMessage(err))
    }
  }

  const programar = (valores: { texto: string; animo: Animo | null }, inmediato = false) => {
    pendiente.current = valores
    setEstado('pendiente')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(guardar, inmediato ? 0 : ESPERA_MS)
  }

  // Al cambiar de día o salir, se guarda lo que quedara pendiente.
  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current)
      const valores = pendiente.current
      if (valores) {
        guardarDiario(dia, valores.texto, valores.animo)
          .then((guardada) => onSavedRef.current(dia, guardada))
          .catch(() => {
            // La página ya no está: no hay dónde mostrar el error.
          })
      }
    }
  }, [dia])

  const textoEstado =
    estado === 'pendiente' || estado === 'guardando' ? 'Guardando…' : estado === 'guardado' ? 'Guardado' : ''

  return (
    <section aria-labelledby="diario" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id="diario" className="font-semibold text-slate-900">
          Diario
        </h3>
        <span className="text-xs text-slate-500" aria-live="polite">
          {textoEstado}
        </span>
      </div>

      <div role="radiogroup" aria-label="¿Qué tal el día?" className="flex flex-wrap items-center gap-1">
        <span className="w-full text-sm text-slate-600 sm:mr-1 sm:w-auto">¿Qué tal el día?</span>
        {ANIMOS.map((a) => {
          const activo = animo === a.value
          return (
            <button
              key={a.value}
              type="button"
              role="radio"
              aria-checked={activo}
              aria-label={a.label}
              title={a.label}
              onClick={() => {
                const nuevo = activo ? null : a.value
                setAnimo(nuevo)
                programar({ texto, animo: nuevo }, true)
              }}
              className={[
                'grid size-11 cursor-pointer place-items-center rounded-xl text-2xl transition',
                activo ? 'scale-110 bg-brand-50 ring-2 ring-brand-600' : 'opacity-60 grayscale hover:opacity-100 hover:grayscale-0',
              ].join(' ')}
            >
              <span aria-hidden="true">{a.emoji}</span>
            </button>
          )
        })}
      </div>

      <label htmlFor={textoId} className="sr-only">
        Entrada del diario
      </label>
      <textarea
        id={textoId}
        rows={6}
        maxLength={20000}
        placeholder="Qué has estudiado, qué te ha costado, cómo te sientes…"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          programar({ texto: e.target.value, animo })
        }}
        onBlur={() => {
          if (pendiente.current) guardar()
        }}
        className={`${inputClass} min-h-36 resize-y border-slate-300 py-2.5 leading-relaxed focus:border-brand-600`}
      />
      {estado === 'error' && (
        <p role="alert" className="flex items-center justify-between gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>No se pudo guardar: {error}</span>
          <button type="button" onClick={guardar} className="min-h-9 cursor-pointer rounded-lg px-2 font-semibold hover:bg-rose-100">
            Reintentar
          </button>
        </p>
      )}
    </section>
  )
}
