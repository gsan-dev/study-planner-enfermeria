import type { TemaFormValues } from '../../schemas/tema'
import type { FieldErrors } from '../../schemas/validation'
import { SelectField, TextField } from '../ui/Field'
import { DIFICULTADES } from './constants'

interface TemaFieldsProps {
  values: TemaFormValues
  errors: FieldErrors
  onChange: (values: TemaFormValues) => void
  autoFocus?: boolean
  /** Diseño en una fila (alta rápida) o apilado (modal). */
  layout?: 'inline' | 'stacked'
}

/** Campos de un tema, compartidos por el alta rápida y el modal de edición. */
export function TemaFields({ values, errors, onChange, autoFocus, layout = 'stacked' }: TemaFieldsProps) {
  return (
    <div
      className={
        layout === 'inline'
          ? 'grid grid-cols-2 gap-2 sm:grid-cols-[1fr_10rem_6.5rem]'
          : 'grid grid-cols-2 gap-4'
      }
    >
      <TextField
        label="Tema"
        placeholder="Ej. Sistema cardiovascular"
        autoFocus={autoFocus}
        autoComplete="off"
        value={values.nombre}
        onChange={(e) => onChange({ ...values, nombre: e.target.value })}
        error={errors.nombre}
        wrapperClassName="col-span-2 sm:col-span-1"
      />
      <SelectField
        label="Dificultad"
        value={values.dificultad as string}
        onChange={(e) => onChange({ ...values, dificultad: e.target.value })}
        error={errors.dificultad}
        wrapperClassName={layout === 'stacked' ? 'col-span-2 sm:col-span-1' : undefined}
      >
        {DIFICULTADES.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Horas"
        inputMode="decimal"
        value={values.horasEstimadas}
        onChange={(e) => onChange({ ...values, horasEstimadas: e.target.value })}
        error={errors.horasEstimadas}
        wrapperClassName={layout === 'stacked' ? 'col-span-2 sm:col-span-1' : undefined}
      />
    </div>
  )
}
