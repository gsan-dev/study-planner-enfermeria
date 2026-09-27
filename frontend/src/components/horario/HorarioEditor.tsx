import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import { toast } from 'sonner'
import { parseEntryId, useHorarioDraft } from '../../hooks/useHorarioDraft'
import { fromMinutes } from '../../lib/horario'
import { getErrorMessage } from '../../services/api'
import {
  escanearHorario,
  getEscaneoDisponible,
  guardarHorario,
  prepararArchivo,
  type ResultadoEscaneo,
} from '../../services/horarioService'
import type { Asignatura, DiaSemana } from '../../types/models'
import { CameraIcon, PlusIcon } from '../icons'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Spinner } from '../ui/Spinner'
import { ScanReviewModal } from './ScanReviewModal'
import { SlotEditorModal, type SlotDraft, type SlotResult } from './SlotEditorModal'
import { TimetableGrid } from './TimetableGrid'

interface HorarioEditorProps {
  asignaturas: Asignatura[]
  onSaved: (asignaturas: Asignatura[]) => void
}

type EditorState = { mode: 'create' | 'edit'; initial: SlotDraft; origen?: { key: string; index: number } } | null

export function HorarioEditor({ asignaturas, onSaved }: HorarioEditorProps) {
  const horario = useHorarioDraft(asignaturas)
  const [editor, setEditor] = useState<EditorState>(null)
  const [showWeekend, setShowWeekend] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scanDisponible, setScanDisponible] = useState<boolean | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ResultadoEscaneo | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getEscaneoDisponible()
      .then(setScanDisponible)
      .catch(() => setScanDisponible(false))
  }, [])

  // Aviso al salir con cambios sin guardar (navegación interna y cierre de pestaña).
  const blocker = useBlocker(horario.dirty && !saving)
  useEffect(() => {
    if (!horario.dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [horario.dirty])

  const opciones = horario.draft.map((a) => ({ key: a.key, nombre: a.nombre, color: a.color }))
  const hayClases = horario.entries.length > 0

  const abrirNueva = (dia: DiaSemana = 1, hora = 9) =>
    setEditor({
      mode: 'create',
      initial: { dia, horaInicio: fromMinutes(hora * 60), horaFin: fromMinutes((hora + 1) * 60), asignaturaKey: opciones[0]?.key },
    })

  const guardarSlot = (slot: SlotResult) => {
    const destinoKey = slot.nuevaAsignatura
      ? horario.crearAsignatura(slot.nuevaAsignatura.nombre, slot.nuevaAsignatura.color)
      : slot.asignaturaKey!
    const { dia, horaInicio, horaFin, aula } = slot
    horario.setFranja(destinoKey, { dia, horaInicio, horaFin, ...(aula ? { aula } : {}) }, editor?.origen)
    setEditor(null)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setScanning(true)
    try {
      const archivo = await prepararArchivo(file)
      setScanResult(await escanearHorario(archivo))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setScanning(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const guardar = async () => {
    setSaving(true)
    try {
      const actualizadas = await guardarHorario(horario.buildPayload())
      onSaved(actualizadas)
      toast.success('Horario guardado')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          onClick={() => fileRef.current?.click()}
          disabled={!scanDisponible || scanning}
          title={scanDisponible === false ? 'El escaneo no está configurado en el servidor' : undefined}
        >
          <CameraIcon className="size-5" />
          Escanear horario
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button variant="secondary" onClick={() => abrirNueva()}>
          <PlusIcon className="size-5" />
          Añadir clase
        </Button>
        <label className="ml-auto flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showWeekend}
            onChange={(e) => setShowWeekend(e.target.checked)}
            className="size-4 accent-brand-700"
          />
          Fin de semana
        </label>
      </div>

      {scanDisponible === false && (
        <p className="text-sm text-slate-500">
          El escaneo automático no está activado en este servidor. Puedes crear el horario tocando los huecos de la tabla.
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-3">
        {!hayClases && (
          <p className="px-2 pt-1 pb-3 text-sm text-slate-600">
            Toca un hueco de la tabla para añadir una clase, o escanea una foto o PDF de tu horario.
          </p>
        )}
        <TimetableGrid
          entries={horario.entries}
          showWeekend={showWeekend}
          highlightToday
          onCellClick={(dia, hora) => abrirNueva(dia, hora)}
          onEntryClick={(entry) => {
            const { key, index } = parseEntryId(entry.id)
            const franja = horario.draft.find((a) => a.key === key)?.horarios[index]
            if (franja) setEditor({ mode: 'edit', initial: { ...franja, asignaturaKey: key }, origen: { key, index } })
          }}
        />
      </div>

      {horario.dirty && (
        // Sticky: queda pegada abajo (encima de la barra de navegación en móvil) mientras se ve el editor.
        <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 md:bottom-4">
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 pl-4 shadow-lg backdrop-blur">
            <p className="mr-auto text-sm font-medium text-slate-700">Cambios sin guardar</p>
            <Button variant="ghost" onClick={horario.descartar} disabled={saving}>
              Descartar
            </Button>
            <Button onClick={guardar} loading={saving}>
              Guardar
            </Button>
          </div>
        </div>
      )}

      {scanning && (
        <div role="status" className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-6">
          <div className="flex max-w-xs flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-xl">
            <Spinner className="size-8 text-brand-700" />
            <p className="font-semibold text-slate-900">Leyendo tu horario…</p>
            <p className="text-sm text-slate-600">Puede tardar hasta un minuto.</p>
          </div>
        </div>
      )}

      <SlotEditorModal
        open={editor !== null}
        mode={editor?.mode ?? 'create'}
        initial={editor?.initial ?? null}
        asignaturas={opciones}
        validate={(slot) =>
          slot.nuevaAsignatura ? null : horario.conflicto(slot.asignaturaKey!, slot, editor?.origen)
        }
        onSave={guardarSlot}
        onDelete={() => {
          if (editor?.origen) horario.quitarFranja(editor.origen.key, editor.origen.index)
          setEditor(null)
        }}
        onClose={() => setEditor(null)}
      />

      <ScanReviewModal
        resultado={scanResult}
        asignaturas={opciones}
        hayHorarioActual={hayClases}
        onClose={() => setScanResult(null)}
        onConfirm={(decision) => {
          const descartadas = horario.aplicarEscaneo(decision)
          setScanResult(null)
          toast.success('Horario cargado en la tabla. Revísalo y pulsa Guardar.', {
            description: descartadas > 0 ? `${descartadas} clases se omitieron por solaparse con otras de la misma asignatura.` : undefined,
          })
        }}
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Cambios sin guardar"
        message="Has modificado el horario y no lo has guardado. Si sales ahora, perderás los cambios."
        confirmLabel="Salir sin guardar"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  )
}
