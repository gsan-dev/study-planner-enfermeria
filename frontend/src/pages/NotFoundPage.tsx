import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="grid min-h-[50vh] place-items-center text-center">
      <div>
        <p className="text-5xl font-bold text-brand-700">404</p>
        <h2 className="mt-3 text-xl font-semibold text-slate-900">Página no encontrada</h2>
        <p className="mt-2 text-slate-600">La página que buscas no existe o se ha movido.</p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800"
        >
          Volver al inicio
        </Link>
      </div>
    </section>
  )
}
