import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AsignaturaFormModal } from '../components/asignaturas/AsignaturaFormModal'
import { formatHorario, formatHoras, ordenarHorarios } from '../components/asignaturas/constants'
import { TemasPanel } from '../components/asignaturas/TemasPanel'
import { ExamenGrande, type ExamenConPlan } from '../components/dashboard/ProximosExamenes'
import { ExamenCard } from '../components/examenes/ExamenCard'
import { ClockIcon, PencilIcon, UserIcon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { Cargando } from '../components/ui/Skeleton'
import { useAsignaturas } from '../hooks/useAsignaturas'
import { diaKey, hoyKey } from '../lib/fechas'
import { getErrorMessage } from '../services/api'
import { getAsignatura } from '../services/asignaturasService'
import { listExamenesDeAsignatura } from '../services/examenesService'
import { listPlanes } from '../services/planService'
import type { ExamenConResumen, PlanResumenLista } from '../types/api'
import type { Asignatura } from '../types/models'

interface Datos {
  asignatura: Asignatura
  examenes: ExamenConResumen[]
  planes: Map<string, PlanResumenLista>
}

/** Examen + resumen de su plan, en el formato de la tarjeta grande. */
function conPlan(examen: ExamenConResumen, plan?: PlanResumenLista): ExamenConPlan {
  return {
    ...examen,
    plan: plan
      ? {
          _id: plan._id,
          porcentaje: plan.horasTotales > 0 ? Math.round((plan.horasCompletadas / plan.horasTotales) * 100) : 0,
          horasTotales: plan.horasTotales,
          horasCompletadas: plan.horasCompletadas,
        }
      : null,
  }
}

export function AsignaturaPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [datos, setDatos] = useState<Datos | null>(null)
  const [error, setError] = useState('')
  const [editando, setEditando] = useState(false)
  const { asignaturas: activas } = useAsignaturas('false')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getAsignatura(id, controller.signal),
      listExamenesDeAsignatura(id, controller.signal),
      listPlanes(controller.signal),
    ])
      .then(([asignatura, examenes, planes]) =>
        setDatos({ asignatura, examenes, planes: new Map(planes.map((p) => [p.examenId, p])) }),
      )
      .catch((err) => {
        if (!controller.signal.aborted) setError(getErrorMessage(err))
      })
    return () => controller.abort()
  }, [id])

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
        <p className="text-rose-700">{error}</p>
        <Link to="/asignaturas" className="mt-3 inline-block font-semibold text-brand-700 hover:underline">
          Volver a Asignaturas
        </Link>
      </div>
    )
  }
  if (!datos) {
    return (
      <div className="flex flex-col gap-5">
        <Cargando variante="bloque" />
        <Cargando variante="tarjetas" cantidad={2} />
      </div>
    )
  }

  const { asignatura, examenes, planes } = datos
  const { total, estudiados, horasEstimadas } = asignatura.resumenTemas
  const porcentaje = total > 0 ? Math.round((estudiados / total) * 100) : 0
  const hoy = hoyKey()
  const proximos = examenes.filter((e) => diaKey(e.fecha) >= hoy)
  const pasados = examenes.filter((e) => diaKey(e.fecha) < hoy).reverse()
  const [proximo, ...siguientes] = proximos
  const horarios = ordenarHorarios(asignatura.horarios)

  return (
    <div className="flex flex-col gap-5">
      <Link to="/asignaturas" className="-mb-2 self-start inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:underline">
        ← Asignaturas
      </Link>

      {/* Cabecera */}
      <section
        className="rounded-2xl border border-slate-200 bg-superficie p-4 shadow-sm md:p-6"
        style={{ borderTopColor: asignatura.color, borderTopWidth: 6 }}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {asignatura.nombre}
              {asignatura.archivada && (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 align-middle text-xs font-semibold text-slate-600">
                  Archivada
                </span>
              )}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              {asignatura.profesor && (
                <span className="inline-flex items-center gap-1.5">
                  <UserIcon className="size-4 text-slate-500" />
                  {asignatura.profesor}
                </span>
              )}
              {asignatura.creditos != null && (
                <span>
                  {asignatura.creditos} {asignatura.creditos === 1 ? 'crédito' : 'créditos'}
                </span>
              )}
            </div>
          </div>
          {!asignatura.archivada && (
            <Button variant="secondary" onClick={() => setEditando(true)} aria-label="Editar asignatura">
              <PencilIcon className="size-5" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
          )}
        </div>

        {horarios.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Horario">
            {horarios.map((h, i) => (
              <li key={i} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                <ClockIcon className="size-3.5 text-slate-500" />
                {formatHorario(h)}
                {h.aula && <span className="text-slate-600">· {h.aula}</span>}
              </li>
            ))}
          </ul>
        )}

        {/* Progreso del temario */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm text-slate-600">
              {total === 0 ? 'Aún no hay temas' : `${estudiados} de ${total} temas estudiados · ${formatHoras(horasEstimadas)} estimadas`}
            </p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">{porcentaje}%</p>
          </div>
          <div
            className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentaje}
            aria-label="Temario estudiado"
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${porcentaje}%`, backgroundColor: asignatura.color }}
            />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* Temario */}
        <section aria-labelledby="temario" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-superficie p-4 md:p-5">
          <h3 id="temario" className="font-semibold text-slate-900">
            Temario
          </h3>
          <TemasPanel
            asignaturaId={asignatura._id}
            color={asignatura.color}
            readOnly={asignatura.archivada}
            onResumenChange={(resumenTemas) => setDatos((d) => (d ? { ...d, asignatura: { ...d.asignatura, resumenTemas } } : d))}
          />
        </section>

        {/* Exámenes */}
        <section aria-labelledby="examenes-asignatura" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 id="examenes-asignatura" className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Próximo examen
            </h3>
            <Link to="/examenes" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:underline">
              Exámenes
            </Link>
          </div>
          {proximo ? (
            <ExamenGrande examen={conPlan(proximo, planes.get(proximo._id))} />
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
              No hay exámenes próximos de esta asignatura.
            </p>
          )}

          {siguientes.length > 0 && (
            <>
              <h4 className="mt-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Después</h4>
              {siguientes.map((e) => (
                <ExamenCard key={e._id} examen={e} onOpen={() => navigate(`/plan/${e._id}`)} />
              ))}
            </>
          )}

          {pasados.length > 0 && (
            <details className="group mt-2">
              <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-semibold text-slate-500 uppercase">
                Exámenes pasados ({pasados.length})
              </summary>
              <div className="mt-2 flex flex-col gap-3">
                {pasados.map((e) => (
                  <ExamenCard key={e._id} examen={e} onOpen={() => navigate(`/plan/${e._id}`)} />
                ))}
              </div>
            </details>
          )}
        </section>
      </div>

      <AsignaturaFormModal
        open={editando}
        asignatura={asignatura}
        otras={activas.filter((a) => a._id !== asignatura._id)}
        onClose={() => setEditando(false)}
        onSaved={(guardada) => {
          setDatos((d) => (d ? { ...d, asignatura: guardada } : d))
          setEditando(false)
        }}
      />
    </div>
  )
}
