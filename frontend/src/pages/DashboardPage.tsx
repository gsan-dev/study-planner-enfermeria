import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Link } from 'react-router'
import { BookIcon, CalendarIcon, ChecklistIcon } from '../components/icons'
import { useApiHealth } from '../hooks/useApiHealth'

const quickLinks = [
  {
    to: '/asignaturas',
    icon: BookIcon,
    title: 'Asignaturas',
    text: 'Añade tus asignaturas, profesores, horarios y temario.',
  },
  {
    to: '/examenes',
    icon: CalendarIcon,
    title: 'Exámenes',
    text: 'Apunta las fechas y qué temas entran en cada examen.',
  },
  {
    to: '/plan',
    icon: ChecklistIcon,
    title: 'Plan de estudio',
    text: 'Genera un plan día a día hasta el examen.',
  },
]

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

export function DashboardPage() {
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white shadow-sm md:p-8">
        <p className="text-sm font-medium capitalize text-brand-100">{today}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">¡Hola María! ¿Qué toca estudiar hoy?</h2>
        <p className="mt-2 max-w-xl text-brand-100">
          Organiza tus asignaturas y exámenes y deja que la app reparta las horas de estudio por ti.
        </p>
      </section>

      <section aria-labelledby="empezar" className="flex flex-col gap-3">
        <h3 id="empezar" className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Para empezar
        </h3>
        {/* 1 columna en móvil, 2 en tablet, 3 en escritorio */}
        <div className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {quickLinks.map(({ to, icon: Icon, title, text }) => (
            <Link
              key={to}
              to={to}
              className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm md:p-5"
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100">
                <Icon className="size-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="mt-0.5 text-sm text-slate-600">{text}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <ApiStatus />
    </div>
  )
}
