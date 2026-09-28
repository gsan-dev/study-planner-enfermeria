import { useSyncExternalStore } from 'react'

/** 'sistema' sigue el modo claro/oscuro del dispositivo. */
export type PreferenciaTema = 'claro' | 'oscuro' | 'sistema'
export type Tema = 'claro' | 'oscuro'

const CLAVE = 'tema'
const COLOR_BARRA: Record<Tema, string> = { claro: '#0f766e', oscuro: '#0b1120' }
const oscuroDelSistema = window.matchMedia('(prefers-color-scheme: dark)')
const oyentes = new Set<() => void>()

function leerPreferencia(): PreferenciaTema {
  try {
    const guardada = localStorage.getItem(CLAVE)
    return guardada === 'claro' || guardada === 'oscuro' ? guardada : 'sistema'
  } catch {
    return 'sistema'
  }
}

const temaDe = (preferencia: PreferenciaTema): Tema =>
  preferencia === 'sistema' ? (oscuroDelSistema.matches ? 'oscuro' : 'claro') : preferencia

/** Pone el tema en <html> y el color de la barra del sistema (public/tema.js hace lo mismo al cargar). */
function aplicar() {
  const tema = temaDe(leerPreferencia())
  document.documentElement.dataset.tema = tema
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[tema])
  oyentes.forEach((avisar) => avisar())
}

// Si se sigue al sistema y el móvil cambia de modo (p. ej. al anochecer), la app también.
oscuroDelSistema.addEventListener('change', () => {
  if (leerPreferencia() === 'sistema') aplicar()
})

export function setPreferenciaTema(preferencia: PreferenciaTema) {
  try {
    if (preferencia === 'sistema') localStorage.removeItem(CLAVE)
    else localStorage.setItem(CLAVE, preferencia)
  } catch {
    // Sin almacenamiento: se aplica solo en esta sesión.
    document.documentElement.dataset.tema = temaDe(preferencia)
    oyentes.forEach((avisar) => avisar())
    return
  }
  aplicar()
}

const suscribir = (avisar: () => void) => {
  oyentes.add(avisar)
  return () => oyentes.delete(avisar)
}
const instantanea = () => `${leerPreferencia()}:${document.documentElement.dataset.tema ?? 'claro'}`

/** Preferencia elegida y tema que se ve ahora mismo. */
export function useTema() {
  const [preferencia, tema] = useSyncExternalStore(suscribir, instantanea).split(':') as [PreferenciaTema, Tema]
  return { preferencia, tema, setPreferencia: setPreferenciaTema }
}
