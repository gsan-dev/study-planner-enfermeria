/** Error general de un formulario o diálogo (los toasts quedarían detrás de un <dialog> modal). */
export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
      {message}
    </p>
  )
}
