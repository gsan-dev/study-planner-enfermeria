import { borrarSuscripcion, getClavePublica, guardarSuscripcion } from '../services/notificacionesService'

/**
 * Estado de las notificaciones push en este dispositivo:
 * - 'no-soportado': el navegador no tiene Web Push.
 * - 'instalar-ios': iPhone/iPad en Safari; solo funciona con la app añadida a la pantalla de inicio.
 * - 'sin-https': hace falta HTTPS (o localhost).
 * - 'bloqueado': la usuaria denegó el permiso (se cambia en los ajustes del sistema).
 * - 'activo' / 'inactivo': suscrito o no.
 */
export type EstadoPush = 'no-soportado' | 'instalar-ios' | 'sin-https' | 'bloqueado' | 'activo' | 'inactivo'

export const esIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Abierta como app instalada (pantalla de inicio), no en una pestaña del navegador. */
export const esAppInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const soportaPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** Descripción corta del dispositivo para la lista de dispositivos. */
function nombreDispositivo(): string {
  const ua = navigator.userAgent
  const sistema = /iphone/i.test(ua)
    ? 'iPhone'
    : /ipad/i.test(ua) || esIOS()
      ? 'iPad'
      : /android/i.test(ua)
        ? 'Android'
        : /windows/i.test(ua)
          ? 'Windows'
          : /mac os/i.test(ua)
            ? 'Mac'
            : /cros/i.test(ua)
              ? 'Chromebook'
              : /linux/i.test(ua)
                ? 'Linux'
                : 'Dispositivo'
  const navegador = /edg\//i.test(ua) ? 'Edge' : /chrome|crios/i.test(ua) ? 'Chrome' : /firefox|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : ''
  return `${sistema}${esAppInstalada() ? ' (app)' : navegador ? ` · ${navegador}` : ''}`
}

async function registroSW() {
  // En desarrollo no hay service worker (ver useServiceWorker): se registra aquí solo para push.
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register('/service-worker.js')
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!window.isSecureContext) return 'sin-https'
  if (!soportaPush()) return esIOS() && !esAppInstalada() ? 'instalar-ios' : 'no-soportado'
  if (Notification.permission === 'denied') return 'bloqueado'
  const registro = await navigator.serviceWorker.getRegistration()
  const suscripcion = await registro?.pushManager.getSubscription()
  return suscripcion && Notification.permission === 'granted' ? 'activo' : 'inactivo'
}

/** Clave VAPID (base64url) → bytes, como la pide pushManager.subscribe. */
function claveABytes(base64url: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (base64url.length % 4)) % 4)
  const binario = atob((base64url + relleno).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(new ArrayBuffer(binario.length))
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
  return bytes
}

const zonaHoraria = () => Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * Pide permiso (tiene que llamarse desde un toque/clic) y suscribe este
 * dispositivo. Devuelve el estado final.
 */
export async function activarPush(): Promise<EstadoPush> {
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return permiso === 'denied' ? 'bloqueado' : 'inactivo'

  const registro = await registroSW()
  await navigator.serviceWorker.ready
  const clave = claveABytes(await getClavePublica())
  let suscripcion = await registro.pushManager.getSubscription()
  // Si la suscripción es de otra clave (servidor distinto), se rehace.
  const claveActual = suscripcion?.options.applicationServerKey
  if (suscripcion && claveActual && new Uint8Array(claveActual).toString() !== clave.toString()) {
    await suscripcion.unsubscribe()
    suscripcion = null
  }
  suscripcion ??= await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clave })
  await guardarSuscripcion(suscripcion.toJSON(), nombreDispositivo(), zonaHoraria())
  return 'activo'
}

export async function desactivarPush(): Promise<EstadoPush> {
  const registro = await navigator.serviceWorker.getRegistration()
  const suscripcion = await registro?.pushManager.getSubscription()
  if (suscripcion) {
    await borrarSuscripcion(suscripcion.endpoint).catch(() => undefined)
    await suscripcion.unsubscribe()
  }
  return 'inactivo'
}

/**
 * Al abrir la app: si este dispositivo ya estaba suscrito, vuelve a mandar la
 * suscripción al servidor (el navegador puede renovarla, o el servidor pudo
 * borrarla) y actualiza la zona horaria.
 */
export async function sincronizarPush() {
  if (!soportaPush() || Notification.permission !== 'granted') return
  const registro = await navigator.serviceWorker.getRegistration()
  const suscripcion = await registro?.pushManager.getSubscription()
  if (suscripcion) await guardarSuscripcion(suscripcion.toJSON(), nombreDispositivo(), zonaHoraria())
}
