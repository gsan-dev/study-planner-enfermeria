/** Bloque gris que late mientras llegan los datos (con la forma aproximada del contenido). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />
}

/** Tarjeta de carga: título, línea secundaria y una barra. */
function TarjetaSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-2xl border border-slate-200 bg-superficie p-4 md:p-5">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/3" />
      <Skeleton className="mt-6 h-2 w-full" />
    </div>
  )
}

interface CargandoProps {
  /** tarjetas: rejilla de tarjetas · lista: filas · bloque: una caja grande (gráficos, tablas). */
  variante?: 'tarjetas' | 'lista' | 'bloque'
  cantidad?: number
  className?: string
}

/**
 * Estado de carga con la forma del contenido que va a aparecer, para que la
 * página no "salte" al llegar los datos. Se anuncia a los lectores de pantalla.
 */
export function Cargando({ variante = 'tarjetas', cantidad = 3, className = '' }: CargandoProps) {
  return (
    <div role="status" aria-label="Cargando…" className={className}>
      {variante === 'tarjetas' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: cantidad }, (_, i) => (
            <TarjetaSkeleton key={i} />
          ))}
        </div>
      )}
      {variante === 'lista' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-superficie p-4">
          {Array.from({ length: cantidad }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}
      {variante === 'bloque' && <Skeleton className="h-40 w-full" />}
    </div>
  )
}
