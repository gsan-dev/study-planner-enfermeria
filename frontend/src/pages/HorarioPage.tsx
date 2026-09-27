import { HorarioEditor } from '../components/horario/HorarioEditor'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useAsignaturas } from '../hooks/useAsignaturas'

export function HorarioPage() {
  const { asignaturas, status, error, reload, replaceAll } = useAsignaturas('false')

  if (status === 'loading') {
    return (
      <div className="grid min-h-[40vh] place-items-center text-slate-400">
        <Spinner className="size-7" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
        <p className="text-rose-700">{error}</p>
        <Button variant="secondary" onClick={reload} className="mt-3">
          Reintentar
        </Button>
      </div>
    )
  }

  return <HorarioEditor asignaturas={asignaturas} onSaved={replaceAll} />
}
