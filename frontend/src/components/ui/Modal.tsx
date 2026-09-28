import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../icons'

// Contador de modales abiertos: con modales anidados, el scroll de la página
// se desbloquea solo cuando se cierra el último.
let openModals = 0
function lockScroll() {
  openModals += 1
  document.body.style.overflow = 'hidden'
}
function unlockScroll() {
  openModals = Math.max(0, openModals - 1)
  if (openModals === 0) document.body.style.overflow = ''
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Botones del pie (se quedan fijos abajo aunque el contenido haga scroll). */
  footer?: ReactNode
  size?: 'md' | 'lg'
}

/**
 * Modal sobre <dialog> nativo (foco atrapado, Escape y capa superior gratis).
 * En móvil se muestra como hoja inferior a pantalla completa de ancho; desde
 * md, centrado.
 *
 * Se renderiza en un portal sobre <body>: así un modal abierto desde dentro
 * de un formulario (p. ej. el editor de clase dentro del de asignatura) no
 * acaba con un <form> anidado en otro, que el navegador enviaría por su cuenta.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    if (!dialog.open) dialog.showModal()
    lockScroll()
    return () => {
      if (dialog.open) dialog.close()
      unlockScroll()
    }
  }, [open])

  return createPortal(
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // Clic en el fondo (fuera de la caja) → cerrar.
        if (event.target === ref.current) onClose()
      }}
      aria-labelledby={titleId}
      className={[
        'm-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl bg-superficie p-0 text-slate-900 shadow-xl backdrop:bg-black/50',
        'md:m-auto md:rounded-2xl',
        size === 'lg' ? 'md:max-w-2xl' : 'md:max-w-lg',
      ].join(' ')}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 py-2 pr-2 pl-5">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid size-11 cursor-pointer place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>,
    document.body,
  )
}
