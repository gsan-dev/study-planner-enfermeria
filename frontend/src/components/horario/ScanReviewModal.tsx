import { useState } from 'react'
import { emparejarAsignatura } from '../../lib/horario'
import type { ClaseEscaneada, ResultadoEscaneo } from '../../services/horarioService'
import type { Horario } from '../../types/models'
import { formatHorario, ordenarHorarios } from '../asignaturas/constants'
import { Button } from '../ui/Button'
import { inputClass } from '../ui/Field'
import { Modal } from '../ui/Modal'

const NUEVA = '__nueva__'

export interface GrupoEscaneado {
  /** Asignatura existente de destino, o null para crear una nueva. */
  destinoKey: string | null
  nombre: string
  horarios: Horario[]
}

export interface ScanDecision {
  modo: 'reemplazar' | 'anadir'
  grupos: GrupoEscaneado[]
}

interface ScanReviewModalProps {
  resultado: ResultadoEscaneo | null
  asignaturas: { key: string; nombre: string }[]
  hayHorarioActual: boolean
  onConfirm: (decision: ScanDecision) => void
  onClose: () => void
}

interface FilaRevision {
  detectado: string
  profesor: string
  clases: ClaseEscaneada[]
  destino: string
  nombreNuevo: string
  incluir: boolean
}

function agrupar(clases: ClaseEscaneada[], asignaturas: { key: string; nombre: string }[]): FilaRevision[] {
  const grupos = new Map<string, ClaseEscaneada[]>()
  for (const clase of clases) grupos.set(clase.asignatura, [...(grupos.get(clase.asignatura) ?? []), clase])
  return [...grupos.entries()].map(([detectado, lista]) => ({
    detectado,
    profesor: lista.find((c) => c.profesor)?.profesor ?? '',
    clases: lista,
    destino: emparejarAsignatura(detectado, asignaturas)?.key ?? NUEVA,
    nombreNuevo: detectado,
    incluir: true,
  }))
}

export function ScanReviewModal(props: ScanReviewModalProps) {
  return (
    <Modal open={props.resultado !== null} onClose={props.onClose} title="Revisa el horario escaneado" size="lg">
      {props.resultado && <ScanReview {...props} resultado={props.resultado} />}
    </Modal>
  )
}

function ScanReview({ resultado, asignaturas, hayHorarioActual, onConfirm, onClose }: ScanReviewModalProps & { resultado: ResultadoEscaneo }) {
  const [filas, setFilas] = useState(() => agrupar(resultado.clases, asignaturas))
  const [modo, setModo] = useState<ScanDecision['modo']>(hayHorarioActual ? 'reemplazar' : 'anadir')

  const update = (i: number, patch: Partial<FilaRevision>) => setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  const incluidas = filas.filter((f) => f.incluir)
  const faltaNombre = incluidas.some((f) => f.destino === NUEVA && !f.nombreNuevo.trim())

  const confirmar = () => {
    onConfirm({
      modo,
      grupos: incluidas.map((f) => ({
        destinoKey: f.destino === NUEVA ? null : f.destino,
        nombre: f.destino === NUEVA ? f.nombreNuevo.trim() : '',
        horarios: f.clases.map(({ dia, horaInicio, horaFin, aula }) => ({ dia, horaInicio, horaFin, ...(aula ? { aula } : {}) })),
      })),
    })
  }

  if (filas.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-slate-700">No se ha encontrado ninguna clase en el archivo.</p>
        {resultado.avisos && <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">{resultado.avisos}</p>}
        <div className="flex justify-end">
          <Button onClick={onClose}>Entendido</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-slate-600">
        Se han detectado <strong className="text-slate-900">{resultado.clases.length} clases</strong> de{' '}
        <strong className="text-slate-900">{filas.length} asignaturas</strong>. Indica a qué asignatura corresponde cada
        una; después podrás retocarlo todo en la tabla antes de guardar.
      </p>

      {resultado.avisos && (
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <strong>A tener en cuenta:</strong> {resultado.avisos}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {filas.map((fila, i) => (
          <li key={fila.detectado} className={`rounded-xl border p-3 ${fila.incluir ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-60'}`}>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={fila.incluir}
                onChange={(e) => update(i, { incluir: e.target.checked })}
                className="mt-1 size-5 shrink-0 accent-brand-700"
              />
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900">{fila.detectado}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {ordenarHorarios(fila.clases).map(formatHorario).join(' · ')}
                  {fila.profesor && ` · ${fila.profesor}`}
                </span>
              </span>
            </label>
            {fila.incluir && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:pl-8">
                <select
                  aria-label={`Asignatura para ${fila.detectado}`}
                  value={fila.destino}
                  onChange={(e) => update(i, { destino: e.target.value })}
                  className={`${inputClass} border-slate-300`}
                >
                  <option value={NUEVA}>Crear asignatura nueva</option>
                  {asignaturas.map((a) => (
                    <option key={a.key} value={a.key}>
                      Añadir a «{a.nombre}»
                    </option>
                  ))}
                </select>
                {fila.destino === NUEVA && (
                  <input
                    aria-label="Nombre de la nueva asignatura"
                    value={fila.nombreNuevo}
                    onChange={(e) => update(i, { nombreNuevo: e.target.value })}
                    className={`${inputClass} ${fila.nombreNuevo.trim() ? 'border-slate-300' : 'border-rose-400'}`}
                  />
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {hayHorarioActual && (
        <fieldset className="rounded-xl bg-slate-50 p-3">
          <legend className="sr-only">Qué hacer con el horario actual</legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="modo" checked={modo === 'reemplazar'} onChange={() => setModo('reemplazar')} className="size-4 accent-brand-700" />
              Sustituir el horario actual
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="modo" checked={modo === 'anadir'} onChange={() => setModo('anadir')} className="size-4 accent-brand-700" />
              Añadirlo al horario actual
            </label>
          </div>
        </fieldset>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={confirmar} disabled={incluidas.length === 0 || faltaNombre}>
          Pasar a la tabla
        </Button>
      </div>
    </div>
  )
}
