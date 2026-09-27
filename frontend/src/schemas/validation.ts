import { z } from 'zod'

z.config(z.locales.es())

export type FieldErrors = Record<string, string>

/** Convierte los errores de zod en { "campo.anidado": "mensaje" } (el primero de cada campo). */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    errors[key] ??= issue.message
  }
  return errors
}

/** Valida y devuelve { data } o { errors }. */
export function validateForm<T extends z.ZodType>(
  schema: T,
  values: unknown,
): { data: z.output<T>; errors?: undefined } | { data?: undefined; errors: FieldErrors } {
  const result = schema.safeParse(values)
  return result.success ? { data: result.data } : { errors: toFieldErrors(result.error) }
}

/** Texto numérico de un <input> → número (o null si está vacío). */
export const numberFromInput = (message: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === '') return null
      const parsed = Number(value.replace(',', '.'))
      if (Number.isNaN(parsed)) {
        ctx.addIssue({ code: 'custom', message })
        return z.NEVER
      }
      return parsed
    })
