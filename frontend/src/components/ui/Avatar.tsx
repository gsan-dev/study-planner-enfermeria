import type { User } from '../../types/models'

const TAMANOS = {
  sm: 'size-9 text-sm',
  lg: 'size-24 text-3xl',
}

/** Foto de perfil, o la inicial del nombre si no hay foto. */
export function Avatar({ user, size = 'sm' }: { user: Pick<User, 'nombre' | 'foto'>; size?: keyof typeof TAMANOS }) {
  const inicial = user.nombre.trim().charAt(0).toUpperCase() || '?'
  if (user.foto) {
    return <img src={user.foto} alt="" className={`${TAMANOS[size]} shrink-0 rounded-full object-cover`} />
  }
  return (
    <span className={`grid ${TAMANOS[size]} shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-800`}>
      {inicial}
    </span>
  )
}
