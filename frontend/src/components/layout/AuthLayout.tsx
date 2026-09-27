import type { ReactNode } from 'react'
import { LogoMark } from '../icons'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

/** Pantalla centrada para login/registro (sin navegación). */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 pt-safe pb-safe">
      <main className="w-full max-w-sm py-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="size-14 shadow-sm" />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-slate-600">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">{children}</div>
        <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
      </main>
    </div>
  )
}
