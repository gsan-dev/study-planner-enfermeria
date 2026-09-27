import type { Asignatura, DiaSemana, Horario } from '../types/models'
import { api } from './api'

export interface ClaseEscaneada {
  asignatura: string
  dia: DiaSemana
  horaInicio: string
  horaFin: string
  aula: string
  profesor: string
}

export interface ResultadoEscaneo {
  clases: ClaseEscaneada[]
  avisos: string
}

export type GuardarHorarioItem = { _id: string; horarios: Horario[] } | { nombre: string; color: string; horarios: Horario[] }

export async function getEscaneoDisponible() {
  const { data } = await api.get<{ disponible: boolean }>('/horario/escanear')
  return data.disponible
}

export async function escanearHorario(archivo: { mediaType: string; data: string }) {
  // Leer un horario con IA puede tardar bastante más que una petición normal.
  const { data } = await api.post<ResultadoEscaneo>('/horario/escanear', { archivo }, { timeout: 180_000 })
  return data
}

export async function guardarHorario(asignaturas: GuardarHorarioItem[]) {
  const { data } = await api.put<{ asignaturas: Asignatura[] }>('/horario', { asignaturas })
  return data.asignaturas
}

const MAX_PDF_BYTES = 10 * 1024 * 1024
const MAX_LADO = 2000

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Prepara el archivo para enviarlo: los PDF van tal cual; las fotos se
 * reducen a 2000 px y se pasan a JPEG (una foto de iPhone pesa varios MB y la
 * IA no necesita tanta resolución para leer un horario).
 */
export async function prepararArchivo(file: File): Promise<{ mediaType: string; data: string }> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) throw new Error('El PDF es demasiado grande (máximo 10 MB)')
    return { mediaType: 'application/pdf', data: await toBase64(file) }
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('No se pudo abrir la imagen. Prueba con una foto JPG o PNG, o con un PDF.')
  }

  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Tu navegador no puede procesar la imagen')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
  if (!blob) throw new Error('No se pudo procesar la imagen')
  return { mediaType: 'image/jpeg', data: await toBase64(blob) }
}
