import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { EyeIcon, EyeOffIcon } from '../icons'

// text-base (16px) en los inputs evita que Safari iOS haga zoom al enfocarlos.
export const inputClass =
  'block min-h-11 w-full rounded-xl border bg-superficie px-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600/30 disabled:bg-slate-50 md:text-sm'

const borderClass = (error?: string) =>
  error ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-brand-600'

interface FieldWrapperProps {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}

function FieldWrapper({ id, label, error, hint, required, children, className = '' }: FieldWrapperProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  wrapperClassName?: string
}

export function TextField({ label, error, hint, wrapperClassName, className = '', id, required, ...props }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldWrapper id={inputId} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <input
        id={inputId}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`${inputClass} ${borderClass(error)} ${className}`}
        {...props}
      />
    </FieldWrapper>
  )
}

/** Campo de contraseña con botón para mostrarla (útil al escribir en el móvil). */
export function PasswordField(props: Omit<TextFieldProps, 'type'>) {
  const [visible, setVisible] = useState(false)
  const { label, error, hint, wrapperClassName, id, required, ...rest } = props
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldWrapper id={inputId} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`${inputClass} ${borderClass(error)} pr-12`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center text-slate-500 hover:text-slate-800"
        >
          {visible ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      </div>
    </FieldWrapper>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  wrapperClassName?: string
}

export function SelectField({ label, error, wrapperClassName, className = '', id, required, children, ...props }: SelectFieldProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <FieldWrapper id={selectId} label={label} error={error} required={required} className={wrapperClassName}>
      <select
        id={selectId}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        className={`${inputClass} ${borderClass(error)} ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  )
}
