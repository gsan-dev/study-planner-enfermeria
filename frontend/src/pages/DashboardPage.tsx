import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Link } from 'react-router'
import { useCurrentUser } from '../auth/authContext'
import { HoyWidget } from '../components/dashboard/HoyWidget'
import { ProximosExamenes } from '../components/dashboard/ProximosExamenes'
import { SemanaWidget } from '../components/dashboard/SemanaWidget'
import { HorarioWidget } from '../components/horario/HorarioWidget'
import { BookIcon, CalendarIcon, CheckIcon, ChecklistIcon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { Cargando } from '../components/ui/Skeleton'
import { useApiHealth } from '../hooks/useApiHealth'
import { useDashboard } from '../hooks/useDashboard'
import type { DashboardResponse } from '../types/api'

function ApiStatus() {
  const health = useApiHealth()

  const [dot, label] =
    health.status === 'loading'
      ? ['bg-slate-300', 'Comprobando conexión…']
      : health.status === 'ok' && health.data.status === 'ok'
        ? ['bg-emerald-500', 'Servidor conectado']
        : ['bg-rose-500', 'Servidor no disponible']

  return (
    <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </p>
  )
}

/** Primeros pasos: se ve mientras falte alguno; cada paso se marca al completarlo. */
function ParaEmpezar({ resumen }: { resumen: DashboardResponse['resumen'] }) {
  const pasos = [
    {
      to: '/asignaturas',
      icon: BookIcon,
      title: 'Asignaturas',
      text: 'Añade tus asignaturas, profesores, horarios y temario.',
      hecho: resumen.asignaturas > 0 && resumen.temas > 0,
    },
    {
      to: '/examenes',
      icon: CalendarIcon,
      title: 'Exámenes',
      text: 'Apunta las fechas y qué temas entran en cada examen.',
      hecho: resumen.examenesProximos > 0,
    },
    {
      to: '/plan',
      icon: ChecklistIcon,
      title: 'Plan de estudio',
      text: 'Genera un plan día a día hasta el examen.',
      hecho: resumen.planes > 0,
    },
  ]
  if (pasos.every((p) => p.hecho)) return null

  return (
    <section aria-labelledby="empezar" className="flex flex-col gap-3">
      <h3 id="empezar" className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
        Para empezar
      </h3>
      {/* 1 columna en móvil, 2 en tablet, 3 en escritorio */}
      <ol className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {pasos.map(({ to, icon: Icon, title, text, hecho }, i) => (
          <li key={to}>
            <Link
              to={to}
              className={[
                'group flex h-full gap-4 rounded-2xl border p-4 transition md:p-5',
                hecho ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-superficie hover:border-brand-200 hover:shadow-sm',
              ].join(' ')}
            >
              <div
                className={[
                  'grid size-11 shrink-0 place-items-center rounded-xl transition-colors',
                  hecho ? 'bg-emerald-600 text-white' : 'bg-brand-50 text-brand-700 group-hover:bg-brand-100',
                ].join(' ')}
              >
                {hecho ? <CheckIcon className="size-6" strokeWidth={2.5} /> : <Icon className="size-6" />}
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {i + 1}. {title}
                  {hecho && <span className="ml-1.5 text-sm font-medium text-emerald-700">Hecho</span>}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">{text}</p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function DashboardPage() {
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })
  const nombre = useCurrentUser().nombre.trim().split(/\s+/)[0]
  const { data, setData, error, refresh } = useDashboard()

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-gradient-to-br from-primario to-primario-oscuro p-5 text-white shadow-sm md:p-8">
        <p className="text-sm font-medium capitalize text-white/80">{today}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">¡Hola, {nombre}! ¿Qué toca estudiar hoy?</h2>
        <p className="mt-2 max-w-xl text-white/80">
          Organiza tus asignaturas y exámenes y deja que la app reparta las horas de estudio por ti.
        </p>
      </section>

      {error && !data && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
          <p className="text-rose-700">{error}</p>
          <Button variant="secondary" onClick={refresh} className="mt-3">
            Reintentar
          </Button>
        </div>
      )}
      {!error && !data && (
        <Cargando variante="tarjetas" cantidad={3} />
      )}

      {data && (
        <>
          <ParaEmpezar resumen={data.resumen} />
          <ProximosExamenes examenes={data.proximosExamenes} total={data.resumen.examenesProximos} />
        </>
      )}

      {/* Horario a la izquierda; a la derecha, qué toca hoy (en el móvil, esto primero). */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <HorarioWidget />
        {data && (
          <div className="-order-1 min-w-0 lg:order-none">
            <HoyWidget hoy={data.hoy} onLocalChange={(hoy) => setData({ ...data, hoy })} onSaved={refresh} />
          </div>
        )}
      </div>

      {data && <SemanaWidget semana={data.semana} cumplimiento={data.cumplimiento} />}

      <ApiStatus />
    </div>
  )
}
