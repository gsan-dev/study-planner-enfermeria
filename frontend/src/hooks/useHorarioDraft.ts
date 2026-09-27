import { useCallback, useMemo, useState } from 'react'
import { COLORES, ordenarHorarios } from '../components/asignaturas/constants'
import type { ScanDecision } from '../components/horario/ScanReviewModal'
import { normalizarNombre, solapan, type GridEntry } from '../lib/horario'
import type { GuardarHorarioItem } from '../services/horarioService'
import type { Asignatura, Horario } from '../types/models'

export interface DraftAsignatura {
  key: string
  /** Undefined si aún no existe en el servidor. */
  _id?: string
  nombre: string
  color: string
  horarios: Horario[]
}

const fromAsignaturas = (asignaturas: Asignatura[]): DraftAsignatura[] =>
  asignaturas.map((a) => ({ key: a._id, _id: a._id, nombre: a.nombre, color: a.color, horarios: ordenarHorarios(a.horarios) }))

const firma = (draft: DraftAsignatura[]) =>
  JSON.stringify(draft.map((d) => [d.key, d.nombre, ordenarHorarios(d.horarios)]))

let nuevoId = 0
const nuevaKey = () => `nueva-${++nuevoId}`

function siguienteColor(draft: DraftAsignatura[]): string {
  const usados = new Set(draft.map((d) => d.color))
  return COLORES.find((c) => !usados.has(c.value))?.value ?? COLORES[draft.length % COLORES.length].value
}

/** Añade franjas a una asignatura evitando solapes consigo misma. Devuelve cuántas se descartaron. */
function anadirFranjas(destino: DraftAsignatura, franjas: Horario[]): number {
  let descartadas = 0
  for (const franja of franjas) {
    if (destino.horarios.some((h) => solapan(h, franja))) descartadas += 1
    else destino.horarios.push(franja)
  }
  destino.horarios = ordenarHorarios(destino.horarios)
  return descartadas
}

/**
 * Borrador editable del horario semanal de todas las asignaturas activas.
 * Nada se guarda hasta llamar a `buildPayload` + guardar en el API.
 */
export function useHorarioDraft(asignaturas: Asignatura[]) {
  const [base, setBase] = useState(() => fromAsignaturas(asignaturas))
  const [draft, setDraft] = useState(base)

  // Si cambian las asignaturas de origen (p. ej. tras guardar), se reinicia el borrador.
  const [origen, setOrigen] = useState(asignaturas)
  if (origen !== asignaturas) {
    const nuevo = fromAsignaturas(asignaturas)
    setOrigen(asignaturas)
    setBase(nuevo)
    setDraft(nuevo)
  }

  const dirty = useMemo(() => firma(draft) !== firma(base), [draft, base])

  const entries: GridEntry[] = useMemo(
    () =>
      draft.flatMap((a) =>
        a.horarios.map((h, i) => ({
          id: `${a.key}::${i}`,
          dia: h.dia,
          horaInicio: h.horaInicio,
          horaFin: h.horaFin,
          titulo: a.nombre,
          detalle: h.aula,
          color: a.color,
        })),
      ),
    [draft],
  )

  /** Crea (en el borrador) una asignatura nueva y devuelve su key. */
  const crearAsignatura = useCallback((nombre: string, color?: string) => {
    const key = nuevaKey()
    setDraft((prev) => [...prev, { key, nombre, color: color ?? siguienteColor(prev), horarios: [] }])
    return key
  }, [])

  const setFranja = useCallback(
    (destinoKey: string, franja: Horario, origenRef?: { key: string; index: number }) => {
      setDraft((prev) =>
        prev.map((a) => {
          let horarios = a.horarios
          if (origenRef && a.key === origenRef.key) horarios = horarios.filter((_, i) => i !== origenRef.index)
          if (a.key === destinoKey) horarios = ordenarHorarios([...horarios, franja])
          return horarios === a.horarios ? a : { ...a, horarios }
        }),
      )
    },
    [],
  )

  const quitarFranja = useCallback((key: string, index: number) => {
    setDraft((prev) => prev.map((a) => (a.key === key ? { ...a, horarios: a.horarios.filter((_, i) => i !== index) } : a)))
  }, [])

  /** Mensaje de error si la franja choca con otra de la misma asignatura. */
  const conflicto = useCallback(
    (destinoKey: string, franja: Horario, origenRef?: { key: string; index: number }) => {
      const destino = draft.find((a) => a.key === destinoKey)
      const choca = destino?.horarios.some(
        (h, i) => !(origenRef && origenRef.key === destinoKey && origenRef.index === i) && solapan(h, franja),
      )
      return choca ? `Se solapa con otra clase de ${destino?.nombre}` : null
    },
    [draft],
  )

  /** Vuelca en el borrador lo revisado tras escanear. Devuelve las franjas descartadas por solaparse. */
  const aplicarEscaneo = useCallback(
    (decision: ScanDecision) => {
      let descartadas = 0
      const next = draft.map((a) => ({ ...a, horarios: decision.modo === 'reemplazar' ? [] : [...a.horarios] }))
      for (const grupo of decision.grupos) {
        let destino = grupo.destinoKey
          ? next.find((a) => a.key === grupo.destinoKey)
          : next.find((a) => !a._id && normalizarNombre(a.nombre) === normalizarNombre(grupo.nombre))
        if (!destino) {
          destino = { key: nuevaKey(), nombre: grupo.nombre, color: siguienteColor(next), horarios: [] }
          next.push(destino)
        }
        descartadas += anadirFranjas(destino, grupo.horarios)
      }
      setDraft(next)
      return descartadas
    },
    [draft],
  )

  const descartar = useCallback(() => setDraft(base), [base])

  /** Solo lo que cambió: franjas de asignaturas existentes y asignaturas nuevas con clases. */
  const buildPayload = useCallback((): GuardarHorarioItem[] => {
    const baseById = new Map(base.map((b) => [b.key, JSON.stringify(ordenarHorarios(b.horarios))]))
    return draft.flatMap((a): GuardarHorarioItem[] => {
      if (a._id) {
        return baseById.get(a.key) === JSON.stringify(ordenarHorarios(a.horarios)) ? [] : [{ _id: a._id, horarios: a.horarios }]
      }
      return a.horarios.length > 0 ? [{ nombre: a.nombre, color: a.color, horarios: a.horarios }] : []
    })
  }, [draft, base])

  return { draft, entries, dirty, crearAsignatura, setFranja, quitarFranja, conflicto, aplicarEscaneo, descartar, buildPayload }
}

export const parseEntryId = (id: string) => {
  const [key, index] = id.split('::')
  return { key, index: Number(index) }
}
