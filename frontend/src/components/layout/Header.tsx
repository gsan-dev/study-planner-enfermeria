import { MenuIcon } from '../icons'
import { Campana } from '../notificaciones/Campana'
import { UserMenu } from './UserMenu'

interface HeaderProps {
  title: string
  onOpenMenu: () => void
}

export function Header({ title, onOpenMenu }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-superficie/90 pt-safe backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-2 md:h-16 md:px-6 xl:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menú"
          className="grid size-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
        >
          <MenuIcon className="size-6" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-slate-900 md:text-xl">{title}</h1>
        <Campana />
        <UserMenu />
      </div>
    </header>
  )
}
