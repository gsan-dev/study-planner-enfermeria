import { useId, useState } from 'react'
import { Link } from 'react-router'
import type { Asignatura, ResumenTemas } from '../../types/models'
import { ArchiveIcon, ChevronDownIcon, ClockIcon, PencilIcon, TrashIcon, UnarchiveIcon, UserIcon } from '../icons'
import { IconButton } from '../ui/Button'
import { formatHorario, formatHoras, ordenarHorarios } from './constants'
import { TemasPanel } from './TemasPanel'

interface AsignaturaCardProps {
  asignatura: Asignatura
  onEdit: () => void
  onToggleArchivada: () => void
  onDelete: () => void
  onResumenChange: (resumen: ResumenTemas) => void
}

export function AsignaturaCard({ asignatura, onEdit, onToggleArchivada, onDelete, onResumenChange }: AsignaturaCardProps) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const { total, estudiados, horasEstimadas } = asignatura.resumenTemas
  const porcentaje = total > 0 ? Math.round((estudiados / total) * 100) : 0
  const horarios = ordenarHorarios(asignatura.horarios)

  return (
    <article
      className="overflow-hidden rounded-2xl border border-slate-200 bg-superficie shadow-sm"
      style={{ borderTopColor: asignatura.color, borderTopWidth: 4 }}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-snug font-semibold text-slate-900">
              <Link to={`/asignaturas/${asignatura._id}`} className="inline-flex min-h-11 items-center hover:underline">
                {asignatura.nombre}
              </Link>
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
          <div className="-mt-1.5 -mr-2 flex">
            {!asignatura.archivada && (
              <IconButton label="Editar asignatura" onClick={onEdit}>
                <PencilIcon className="size-5" />
              </IconButton>
            )}
            <IconButton label={asignatura.archivada ? 'Recuperar asignatura' : 'Archivar asignatura'} onClick={onToggleArchivada}>
              {asignatura.archivada ? <UnarchiveIcon className="size-5" /> : <ArchiveIcon className="size-5" />}
            </IconButton>
            <IconButton label="Eliminar asignatura" tone="danger" onClick={onDelete}>
              <TrashIcon className="size-5" />
            </IconButton>
          </div>
        </div>

        {horarios.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Horario">
            {horarios.map((h, i) => (
              <li
                key={i}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
              >
                <ClockIcon className="size-3.5 text-slate-500" />
                {formatHorario(h)}
                {h.aula && <span className="text-slate-600">· {h.aula}</span>}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-slate-600">
              {total === 0 ? 'Sin temas' : `${estudiados} de ${total} temas estudiados`}
            </span>
            {total > 0 && <span className="font-semibold text-slate-900">{porcentaje}%</span>}
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
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
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex min-h-12 w-full cursor-pointer items-center justify-between border-t border-slate-100 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:px-5"
      >
        <span>
          Temario
          {total > 0 && <span className="ml-1.5 font-normal text-slate-500">· {formatHoras(horasEstimadas)} estimadas</span>}
        </span>
        <ChevronDownIcon className={`size-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div id={panelId} className="border-t border-slate-100 px-4 pt-2 pb-4 md:px-5">
          <TemasPanel
            asignaturaId={asignatura._id}
            color={asignatura.color}
            readOnly={asignatura.archivada}
            onResumenChange={onResumenChange}
          />
        </div>
      )}
    </article>
  )
}
