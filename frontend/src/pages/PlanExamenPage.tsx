import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { useCurrentUser } from '../auth/authContext'
import { formatHoras } from '../components/asignaturas/constants'
import { nombreExamen, urgencia } from '../components/examenes/constants'
import { ChecklistIcon, PencilIcon, TrashIcon } from '../components/icons'
import { ParametrosForm, type ParametrosValues } from '../components/plan/ParametrosForm'
import { PlanAgenda } from '../components/plan/PlanAgenda'
import { PlanEditor, type PlanEditorGuardar } from '../components/plan/PlanEditor'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Spinner } from '../components/ui/Spinner'
import { Cargando } from '../components/ui/Skeleton'
import { cuentaAtras, diaKey, diaLocal, diasHasta, hoyKey, toDiaKey } from '../lib/fechas'
import { sumaHoras } from '../lib/plan'
import { getErrorMessage } from '../services/api'
import { getExamenDetalles } from '../services/examenesService'
import { actualizarSesion, deletePlan, generarPlan, getPlan, guardarPlan } from '../services/planService'
import type { ExamenDetalles, ParametrosPlan, PlanPreview, ResumenPlan, SesionInput, SesionPreview } from '../types/api'
import type { PlanEstudio } from '../types/models'

type Modo = 'ver' | 'elegir' | 'generar' | 'editar'

const vispera = (fechaExamen: string) => {
  const d = diaLocal(fechaExamen)
  d.setDate(d.getDate() - 1)
  return toDiaKey(d)
}

const aSesionInput = (s: SesionPreview): SesionInput => ({
  fecha: diaKey(s.fecha),
  temaId: s.temaId,
  horas: s.horas,
  tipo: s.tipo,
  completado: s.completado,
  notas: s.notas,
})

export function PlanExamenPage() {
  const { examenId = '' } = useParams()
  const user = useCurrentUser()
  const [datos, setDatos] = useState<{ detalles: ExamenDetalles; plan: PlanEstudio | null } | null>(null)
  const [loadError, setLoadError] = useState('')
  const [modo, setModo] = useState<Modo>('elegir')

  const [generando, setGenerando] = useState(false)
  const [generarError, setGenerarError] = useState('')
  const [preview, setPreview] = useState<{ plan: PlanPreview; resumen: ResumenPlan; parametros: ParametrosPlan } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [editorInicial, setEditorInicial] = useState<SesionPreview[]>([])
  const [pendientes, setPendientes] = useState<Set<string>>(new Set())
  const [borrando, setBorrando] = useState(false)
  const [borrarLoading, setBorrarLoading] = useState(false)
  const [borrarError, setBorrarError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getExamenDetalles(examenId, controller.signal), getPlan(examenId, controller.signal)])
      .then(([detalles, plan]) => {
        setDatos({ detalles, plan })
        setModo(plan ? 'ver' : 'elegir')
      })
      .catch((err) => {
        if (!controller.signal.aborted) setLoadError(getErrorMessage(err))
      })
    return () => controller.abort()
  }, [examenId])

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
        <p className="text-rose-700">{loadError}</p>
        <Link to="/plan" className="mt-3 inline-block font-semibold text-brand-700 hover:underline">
          Volver a los planes
        </Link>
      </div>
    )
  }
  if (!datos) {
    return (
      <div className="flex flex-col gap-5">
        <Cargando variante="bloque" />
        <Cargando variante="tarjetas" cantidad={4} />
      </div>
    )
  }

  const { detalles, plan } = datos
  const { examen, temas } = detalles
  const color = examen.asignatura?.color ?? '#475569'
  const fechaExamen = diaKey(examen.fecha)
  const dias = diasHasta(examen.fecha)
  const hoy = hoyKey()
  const temasPorId = new Map(detalles.temario.map((t) => [t._id, t]))
  const pasado = fechaExamen <= hoy

  const parametrosIniciales: ParametrosValues = {
    horasPorDia: String(plan?.horasPorDia ?? (user.horasEstudioDiarias || 3)).replace('.', ','),
    fechaInicio: hoy < fechaExamen ? hoy : fechaExamen,
    diasDescanso: plan?.diasDescanso ?? [],
    repaso: plan?.repaso ?? true,
    incluirEstudiados: plan?.incluirEstudiados ?? false,
  }

  const generar = async (parametros: ParametrosPlan) => {
    setGenerando(true)
    setGenerarError('')
    try {
      const resultado = await generarPlan(examenId, parametros)
      setPreview({ ...resultado, parametros })
    } catch (err) {
      setPreview(null)
      setGenerarError(getErrorMessage(err))
    } finally {
      setGenerando(false)
    }
  }

  const empezarGenerar = () => {
    setModo('generar')
    // "Un clic": se genera directamente con los parámetros por defecto.
    generar({
      horasPorDia: Number(parametrosIniciales.horasPorDia.replace(',', '.')),
      fechaInicio: parametrosIniciales.fechaInicio,
      diasDescanso: parametrosIniciales.diasDescanso,
      repaso: parametrosIniciales.repaso,
      incluirEstudiados: parametrosIniciales.incluirEstudiados,
    })
  }

  const empezarEditar = (sesiones: SesionPreview[]) => {
    setEditorInicial(sesiones)
    setModo('editar')
  }

  const alGuardar = (guardado: PlanEstudio, mensaje: string) => {
    setDatos({ detalles, plan: guardado })
    setPreview(null)
    setModo('ver')
    toast.success(mensaje)
    window.scrollTo({ top: 0 })
  }

  const guardarPreview = async () => {
    if (!preview) return
    setGuardando(true)
    try {
      const guardado = await guardarPlan(examenId, {
        ...preview.parametros,
        tipo: 'automatico',
        diasPlan: preview.plan.diasPlan.map(aSesionInput),
      })
      alGuardar(guardado, 'Plan de estudio guardado')
    } catch (err) {
      setGenerarError(getErrorMessage(err))
    } finally {
      setGuardando(false)
    }
  }

  const guardarManual = async (input: PlanEditorGuardar) => {
    const guardado = await guardarPlan(examenId, { ...input, tipo: 'manual' })
    alGuardar(guardado, 'Plan de estudio guardado')
  }

  const toggleSesion = async (sesion: SesionPreview) => {
    if (!plan || !sesion._id) return
    const id = sesion._id
    setPendientes((p) => new Set(p).add(id))
    // Optimista: se marca ya y se deshace si falla.
    const optimista = { ...plan, diasPlan: plan.diasPlan.map((s) => (s._id === id ? { ...s, completado: !s.completado } : s)) }
    setDatos({ detalles, plan: optimista })
    try {
      const { plan: actualizado, temaEstudiado } = await actualizarSesion(plan._id, id, { completado: !sesion.completado })
      setDatos((d) => (d ? { ...d, plan: actualizado } : d))
      if (temaEstudiado) {
        const nombre = temasPorId.get(temaEstudiado)?.nombre
        toast.success(`¡«${nombre}» estudiado!`, { description: 'Has completado todas sus sesiones de estudio.' })
        setDatos((d) =>
          d
            ? {
                ...d,
                detalles: {
                  ...d.detalles,
                  temas: d.detalles.temas.map((t) => (t._id === temaEstudiado ? { ...t, estudiado: true } : t)),
                  temario: d.detalles.temario.map((t) => (t._id === temaEstudiado ? { ...t, estudiado: true } : t)),
                },
              }
            : d,
        )
      }
    } catch (err) {
      setDatos((d) => (d ? { ...d, plan } : d))
      toast.error(getErrorMessage(err))
    } finally {
      setPendientes((p) => {
        const next = new Set(p)
        next.delete(id)
        return next
      })
    }
  }

  const confirmarBorrado = async () => {
    if (!plan) return
    setBorrarLoading(true)
    setBorrarError('')
    try {
      await deletePlan(plan._id)
      setDatos({ detalles, plan: null })
      setBorrando(false)
      setModo('elegir')
      toast.success('Plan eliminado')
    } catch (err) {
      setBorrarError(getErrorMessage(err))
    } finally {
      setBorrarLoading(false)
    }
  }

  const totalHoras = plan ? sumaHoras(plan.diasPlan) : 0
  const horasHechas = plan ? sumaHoras(plan.diasPlan.filter((s) => s.completado)) : 0
  const porcentaje = totalHoras > 0 ? Math.round((horasHechas / totalHoras) * 100) : 0

  return (
    <div className="flex flex-col gap-5">
      <Link to="/plan" className="-mb-2 self-start inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:underline">
        ← Todos los planes
      </Link>

      {/* Examen */}
      <section className="flex gap-4 rounded-2xl border border-slate-200 bg-superficie p-4 md:p-5">
        <div className="w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-600">{examen.asignatura?.nombre}</p>
          <h2 className="text-xl font-semibold text-slate-900">{nombreExamen(examen, examen.asignatura?.nombre)}</h2>
          <p className="mt-1 text-slate-700 first-letter:uppercase">
            {format(diaLocal(examen.fecha), "EEEE d 'de' MMMM", { locale: es })}
            {examen.hora && ` · ${examen.hora}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
            <span className={`rounded-full px-2 py-0.5 ${urgencia(dias)}`}>{cuentaAtras(dias)}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
              {temas.length} {temas.length === 1 ? 'tema' : 'temas'} · {temas.filter((t) => t.estudiado).length} estudiados
            </span>
          </div>
        </div>
      </section>

      {/* Sin temas: no se puede planificar */}
      {temas.length === 0 && modo !== 'ver' && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
          <p className="font-semibold text-slate-900">Este examen no tiene temas</p>
          <p className="mt-1 text-sm text-slate-600">Indica qué temas entran en el examen para poder planificar el estudio.</p>
          <Link to="/examenes" className="mt-3 inline-block font-semibold text-brand-700 hover:underline">
            Ir a Exámenes
          </Link>
        </div>
      )}

      {/* Elegir cómo crear el plan */}
      {modo === 'elegir' && temas.length > 0 && (
        <section aria-labelledby="crear-plan" className="flex flex-col gap-3">
          <h3 id="crear-plan" className="text-lg font-semibold text-slate-900">
            Crear el plan de estudio
          </h3>
          {pasado ? (
            <p className="text-slate-600">Este examen ya ha pasado.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={empezarGenerar}
                className="flex cursor-pointer flex-col gap-1 rounded-2xl border-2 border-brand-600 bg-brand-50 p-5 text-left transition hover:bg-brand-100"
              >
                <span className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Recomendado</span>
                <span className="text-lg font-semibold text-slate-900">Generar automático</span>
                <span className="text-sm text-slate-600">
                  Reparte los temas hasta el examen según su dificultad y tus horas libres, con repaso al final. Podrás revisarlo
                  antes de guardarlo.
                </span>
              </button>
              <button
                type="button"
                onClick={() => empezarEditar([])}
                className="flex cursor-pointer flex-col gap-1 rounded-2xl border border-slate-200 bg-superficie p-5 text-left transition hover:border-slate-300 hover:shadow-sm"
              >
                <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">A tu manera</span>
                <span className="text-lg font-semibold text-slate-900">Crear manual</span>
                <span className="text-sm text-slate-600">Coloca tú cada tema en los días que prefieras.</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* Generador: parámetros + vista previa */}
      {modo === 'generar' && (
        <section aria-labelledby="generador" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h3 id="generador" className="text-lg font-semibold text-slate-900">
              Plan automático
            </h3>
            <Button variant="ghost" onClick={() => setModo(plan ? 'ver' : 'elegir')}>
              Cancelar
            </Button>
          </div>

          <details className="group rounded-2xl border border-slate-200 bg-superficie p-4" open={Boolean(generarError)}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold text-slate-800">
              Ajustar parámetros
              <span className="text-sm font-normal text-slate-500 group-open:hidden">Horas al día, descansos, repaso…</span>
            </summary>
            <div className="mt-4">
              <ParametrosForm
                initial={parametrosIniciales}
                maxInicio={vispera(fechaExamen)}
                hayEstudiados={temas.some((t) => t.estudiado)}
                loading={generando}
                submitLabel="Volver a generar"
                onSubmit={generar}
              />
            </div>
          </details>

          {generarError && (
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-rose-700">
              {generarError}
            </p>
          )}
          {generando && !preview && (
            <div className="grid min-h-40 place-items-center text-slate-500">
              <Spinner />
            </div>
          )}

          {preview && (
            <div className={`flex flex-col gap-4 ${generando ? 'opacity-50' : ''}`}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ['Horas de estudio', formatHoras(preview.resumen.horasPlanificadas)],
                  ['Días con estudio', `${preview.resumen.diasConEstudio} de ${preview.resumen.dias}`],
                  ['Horas libres', formatHoras(preview.resumen.horasDisponibles)],
                  ['Temas', `${preview.resumen.temasEstudio} + ${preview.resumen.temasRepaso} repasos`],
                ].map(([label, valor]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-superficie p-3">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-lg font-semibold text-slate-900">{valor}</p>
                  </div>
                ))}
              </div>
              {preview.resumen.avisos.map((aviso) => (
                <p key={aviso} className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {aviso}
                </p>
              ))}
              <p className="text-sm text-slate-600">
                Vista previa: aún no se ha guardado. Los temas difíciles tienen más tiempo y los repasos van al final.
              </p>
              <PlanAgenda sesiones={preview.plan.diasPlan} temas={temasPorId} color={color} />
              <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 flex gap-2 rounded-2xl border border-slate-200 bg-superficie/95 p-3 shadow-lg backdrop-blur sm:justify-end md:bottom-4">
                <Button variant="secondary" onClick={() => empezarEditar(preview.plan.diasPlan)} disabled={guardando} className="flex-1 sm:flex-none">
                  <PencilIcon className="size-5" />
                  Retocar a mano
                </Button>
                <Button onClick={guardarPreview} loading={guardando} className="flex-1 sm:flex-none">
                  Guardar plan
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Editor manual */}
      {modo === 'editar' && (
        <section aria-labelledby="editor" className="flex flex-col gap-3">
          <h3 id="editor" className="text-lg font-semibold text-slate-900">
            {plan ? 'Editar el plan' : 'Plan manual'}
          </h3>
          <PlanEditor
            temas={temas}
            color={color}
            fechaExamen={fechaExamen}
            inicial={{
              sesiones: editorInicial,
              horasPorDia: plan?.horasPorDia ?? (user.horasEstudioDiarias || 3),
              fechaInicio: plan?.fechaInicio && diaKey(plan.fechaInicio) < hoy ? diaKey(plan.fechaInicio) : hoy,
              diasDescanso: plan?.diasDescanso ?? [],
            }}
            onCancel={() => setModo(plan ? 'ver' : preview ? 'generar' : 'elegir')}
            onSave={guardarManual}
          />
        </section>
      )}

      {/* Plan guardado */}
      {modo === 'ver' && plan && (
        <section aria-labelledby="tu-plan" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="tu-plan" className="text-lg font-semibold text-slate-900">
              Tu plan <span className="text-sm font-normal text-slate-500">· {plan.tipo === 'manual' ? 'manual' : 'automático'}</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {!pasado && (
                <Button variant="secondary" onClick={empezarGenerar}>
                  <ChecklistIcon className="size-5" />
                  Regenerar
                </Button>
              )}
              <Button variant="secondary" onClick={() => empezarEditar(plan.diasPlan)}>
                <PencilIcon className="size-5" />
                Editar
              </Button>
              <Button
                variant="ghost"
                onClick={() => setBorrando(true)}
                aria-label="Eliminar plan"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <TrashIcon className="size-5" />
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-superficie p-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-600">
                {formatHoras(horasHechas)} de {formatHoras(totalHoras)} estudiadas
              </span>
              <span className="font-semibold text-slate-900">{porcentaje}%</span>
            </div>
            <div
              className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={porcentaje}
              aria-label="Plan completado"
            >
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${porcentaje}%`, backgroundColor: color }} />
            </div>
            {!pasado && plan.diasPlan.some((s) => !s.completado && diaKey(s.fecha) < hoy) && (
              <p className="mt-3 text-sm text-amber-800">
                Tienes sesiones atrasadas. Puedes <strong>regenerar</strong> el plan para repartir lo pendiente desde hoy (lo ya
                completado se conserva).
              </p>
            )}
          </div>

          <PlanAgenda sesiones={plan.diasPlan} temas={temasPorId} color={color} onToggle={toggleSesion} pendientes={pendientes} />
        </section>
      )}

      <ConfirmDialog
        open={borrando}
        title="Eliminar plan"
        message={<p>Se eliminará el plan de estudio de este examen. Los temas y el examen no se tocan.</p>}
        confirmLabel="Eliminar"
        loading={borrarLoading}
        error={borrarError}
        onConfirm={confirmarBorrado}
        onCancel={() => {
          setBorrando(false)
          setBorrarError('')
        }}
      />
    </div>
  )
}
