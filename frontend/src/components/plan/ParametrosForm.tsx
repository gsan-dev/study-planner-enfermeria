import { useState, type FormEvent } from 'react'
import { numberFromInput, validateForm, type FieldErrors } from '../../schemas/validation'
import type { ParametrosPlan } from '../../types/api'
import type { DiaSemana } from '../../types/models'
import { z } from 'zod'
import { DIAS } from '../asignaturas/constants'
import { Button } from '../ui/Button'
import { TextField } from '../ui/Field'

export interface ParametrosValues {
  horasPorDia: string
  fechaInicio: string
  diasDescanso: DiaSemana[]
  repaso: boolean
  incluirEstudiados: boolean
}

const schema = z.object({
  horasPorDia: numberFromInput('Introduce un número de horas').pipe(
    z.number({ error: 'Indica cuántas horas puedes estudiar al día' }).min(0.5, 'Mínimo media hora').max(16, 'Máximo 16 horas'),
  ),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige el día en que empiezas'),
  diasDescanso: z.array(z.number()).max(6, 'Deja al menos un día para estudiar'),
  repaso: z.boolean(),
  incluirEstudiados: z.boolean(),
})

interface ParametrosFormProps {
  initial: ParametrosValues
  /** Último día posible para empezar (el día antes del examen). */
  maxInicio: string
  hayEstudiados: boolean
  loading: boolean
  submitLabel: string
  onSubmit: (parametros: ParametrosPlan) => void
}

/** Parámetros del generador automático. */
export function ParametrosForm({ initial, maxInicio, hayEstudiados, loading, submitLabel, onSubmit }: ParametrosFormProps) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors>({})

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const result = validateForm(schema, values)
    if (result.errors) return setErrors(result.errors)
    setErrors({})
    onSubmit({ ...result.data, diasDescanso: result.data.diasDescanso as DiaSemana[] })
  }

  const toggleDescanso = (dia: DiaSemana) =>
    setValues((v) => ({
      ...v,
      diasDescanso: v.diasDescanso.includes(dia) ? v.diasDescanso.filter((d) => d !== dia) : [...v.diasDescanso, dia],
    }))

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <TextField
          label="Horas al día"
          inputMode="decimal"
          value={values.horasPorDia}
          onChange={(e) => setValues({ ...values, horasPorDia: e.target.value })}
          error={errors.horasPorDia}
        />
        <TextField
          label="Empiezo el"
          type="date"
          max={maxInicio}
          value={values.fechaInicio}
          onChange={(e) => setValues({ ...values, fechaInicio: e.target.value })}
          error={errors.fechaInicio}
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Días de descanso</legend>
        <div className="flex flex-wrap gap-1.5">
          {DIAS.map((d) => {
            const descansa = values.diasDescanso.includes(d.value)
            return (
              <button
                key={d.value}
                type="button"
                aria-pressed={descansa}
                aria-label={`${d.label}: ${descansa ? 'descanso' : 'se estudia'}`}
                onClick={() => toggleDescanso(d.value)}
                className={[
                  'min-h-11 min-w-11 cursor-pointer rounded-xl border px-2 text-sm font-semibold transition-colors',
                  descansa
                    ? 'border-slate-300 bg-slate-100 text-slate-500 line-through'
                    : 'border-brand-600 bg-brand-50 text-brand-800',
                ].join(' ')}
              >
                {d.short}
              </button>
            )
          })}
        </div>
        {errors.diasDescanso && <p className="mt-1.5 text-sm text-rose-600">{errors.diasDescanso}</p>}
        <p className="mt-1.5 text-sm text-slate-500">Toca un día para marcarlo como descanso.</p>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={values.repaso}
            onChange={(e) => setValues({ ...values, repaso: e.target.checked })}
            className="size-5 accent-primario"
          />
          <span className="text-sm text-slate-800">
            Repaso final <span className="text-slate-500">(un 25 % más de tiempo para repasar cada tema antes del examen)</span>
          </span>
        </label>
        {hayEstudiados && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={values.incluirEstudiados}
              onChange={(e) => setValues({ ...values, incluirEstudiados: e.target.checked })}
              className="size-5 accent-primario"
            />
            <span className="text-sm text-slate-800">
              Repasar también los temas que ya he estudiado
            </span>
          </label>
        )}
      </div>

      <Button type="submit" loading={loading} className="self-start">
        {submitLabel}
      </Button>
    </form>
  )
}
