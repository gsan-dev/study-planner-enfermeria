import type { ComponentType, SVGProps } from 'react'

interface PlaceholderPageProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  description: string
  fase: number
}

/** Página provisional para secciones que se implementan en fases posteriores. */
export function PlaceholderPage({ icon: Icon, title, description, fase }: PlaceholderPageProps) {
  return (
    <section className="grid min-h-[50vh] place-items-center">
      <div className="max-w-md text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon className="size-8" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-slate-600">{description}</p>
        <p className="mt-4 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Disponible en la fase {fase}
        </p>
      </div>
    </section>
  )
}
