import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { NotificacionesContext } from '../../hooks/notificacionesContext'
import { sincronizarPush } from '../../lib/push'
import { listNotificaciones, marcarLeida as marcarLeidaApi, marcarTodasLeidas } from '../../services/notificacionesService'
import type { Notificacion } from '../../types/models'

const CADA_MS = 60_000
const RECIENTES = 10

/** Número en el icono de la app instalada (donde el sistema lo permite). */
function ponerBadge(n: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
  if (n > 0) nav.setAppBadge?.(n).catch(() => {})
  else nav.clearAppBadge?.().catch(() => {})
}

/**
 * Notificaciones de la app abierta: las pide al entrar, cada minuto mientras
 * la app está visible, al volver a ella y en cuanto llega un push. Las nuevas
 * se anuncian con un toast.
 */
export function NotificacionesProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [recientes, setRecientes] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  // Ids ya vistos: solo las nuevas tras la primera carga generan toast.
  const vistas = useRef<Set<string> | null>(null)

  const abrir = useCallback(
    (n: Notificacion) => {
      if (!n.leida) {
        setRecientes((lista) => lista.map((x) => (x._id === n._id ? { ...x, leida: true } : x)))
        setNoLeidas((c) => Math.max(0, c - 1))
        marcarLeidaApi(n._id).catch(() => {})
      }
      navigate(n.url || '/')
    },
    [navigate],
  )

  const recargar = useCallback(() => {
    listNotificaciones({ limite: RECIENTES })
      .then(({ notificaciones, noLeidas: total }) => {
        setRecientes(notificaciones)
        setNoLeidas(total)
        ponerBadge(total)
        const primeraVez = vistas.current === null
        vistas.current ??= new Set()
        for (const n of notificaciones) {
          if (!primeraVez && !n.leida && !vistas.current.has(n._id)) {
            toast(n.titulo, { description: n.mensaje, action: { label: 'Ver', onClick: () => abrir(n) } })
          }
          vistas.current.add(n._id)
        }
      })
      .catch(() => {
        // Sin conexión: se reintenta en la siguiente vuelta.
      })
  }, [abrir])

  useEffect(() => {
    recargar()
    sincronizarPush().catch(() => {})
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === 'visible') recargar()
    }, CADA_MS)
    const alVolver = () => {
      if (document.visibilityState === 'visible') recargar()
    }
    document.addEventListener('visibilitychange', alVolver)

    // Mensajes del service worker: llegó un push o se tocó una notificación.
    const alMensaje = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICACION_NUEVA') recargar()
      if (event.data?.type === 'NAVEGAR') {
        if (event.data.id) marcarLeidaApi(event.data.id).then(recargar, () => {})
        navigate(event.data.url || '/')
      }
    }
    navigator.serviceWorker?.addEventListener('message', alMensaje)

    return () => {
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      navigator.serviceWorker?.removeEventListener('message', alMensaje)
    }
  }, [recargar, navigate])

  // App abierta desde una notificación del sistema: ?notificacion=<id>.
  const desdeNotificacion = params.get('notificacion')
  useEffect(() => {
    if (!desdeNotificacion) return
    marcarLeidaApi(desdeNotificacion).then(recargar, () => {})
    setParams(
      (p) => {
        p.delete('notificacion')
        return p
      },
      { replace: true },
    )
  }, [desdeNotificacion, recargar, setParams])

  const marcarLeida = useCallback(
    async (id: string) => {
      await marcarLeidaApi(id)
      recargar()
    },
    [recargar],
  )

  const marcarTodas = useCallback(async () => {
    await marcarTodasLeidas()
    recargar()
  }, [recargar])

  const valor = useMemo(
    () => ({ recientes, noLeidas, recargar, marcarLeida, marcarTodas, abrir }),
    [recientes, noLeidas, recargar, marcarLeida, marcarTodas, abrir],
  )

  return <NotificacionesContext value={valor}>{children}</NotificacionesContext>
}
