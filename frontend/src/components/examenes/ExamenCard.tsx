import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cuentaAtras, diaLocal, diasHasta } from '../../lib/fechas'
import type { ExamenConResumen } from '../../types/api'
import { ClockIcon } from '../icons'
import { labelTipo, nombreExamen, urgencia } from './constants'

interface ExamenCardProps {
  examen: ExamenConResumen
  onOpen: () => void
}

/** Tarjeta de examen: fecha, asignatura (con su color), cuenta atrás y temas estudiados. */
export function ExamenCard({ examen, onOpen }: ExamenCardProps) {
  const fecha = diaLocal(examen.fecha)
  const dias = diasHasta(examen.fecha)
  const color = examen.asignatura?.color ?? '#475569'
  const { total, estudiados } = examen.resumenTemas
  const porcentaje = total > 0 ? Math.round((estudiados / total) * 100) : 0
  const detalles = [examen.hora, examen.aula, examen.peso != null ? `${examen.peso}% de la nota` : null].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full cursor-pointer items-stretch gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-superficie p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow md:gap-4 md:p-4"
    >
      <div
        className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl border-l-4 py-2 text-center text-slate-900 md:w-16"
        style={{ backgroundColor: `${color}1a`, borderLeftColor: color }}
      >
        <span className="text-xs font-semibold uppercase">{format(fecha, 'EEE', { locale: es })}</span>
        <span className="text-2xl leading-none font-bold">{format(fecha, 'd')}</span>
        <span className="text-xs font-semibold uppercase">{format(fecha, 'MMM', { locale: es })}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-slate-600">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
            <span className="truncate">{examen.asignatura?.nombre ?? 'Asignatura eliminada'}</span>
          </p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${urgencia(dias)}`}>{cuentaAtras(dias)}</span>
        </div>
        <p className="mt-0.5 font-semibold text-slate-900">
          {nombreExamen(examen, examen.asignatura?.nombre)}
          {examen.titulo && <span className="ml-1.5 text-sm font-normal text-slate-500">· {labelTipo(examen.tipo)}</span>}
        </p>
        {detalles.length > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
            {examen.hora && <ClockIcon className="size-4 shrink-0 text-slate-500" />}
            <span className="truncate">{detalles.join(' · ')}</span>
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentaje}
            aria-label="Temas estudiados"
          >
            <div className="h-full rounded-full" style={{ width: `${porcentaje}%`, backgroundColor: color }} />
          </div>
          <span className="shrink-0 text-xs text-slate-500">
            {total === 0 ? 'Sin temas' : `${estudiados}/${total} temas`}
          </span>
        </div>
      </div>
    </button>
  )
}
