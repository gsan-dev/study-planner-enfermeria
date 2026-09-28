const LADO = 256
const CALIDAD = 0.85

/** Decodifica la imagen respetando la orientación de la foto (EXIF). */
async function decodificar(archivo: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    // Navegadores sin createImageBitmap para ese formato: se usa un <img>.
    const url = URL.createObjectURL(archivo)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

/**
 * Prepara la foto de perfil en el propio dispositivo: recorte cuadrado
 * centrado, 256 × 256 px y JPEG. Queda en unos 20-30 KB aunque la foto
 * original sea de la cámara del móvil.
 */
export async function prepararFotoPerfil(archivo: File): Promise<string> {
  if (!archivo.type.startsWith('image/')) throw new Error('Elige una imagen')
  const imagen = await decodificar(archivo)
  const lado = Math.min(imagen.width, imagen.height)
  const canvas = document.createElement('canvas')
  canvas.width = LADO
  canvas.height = LADO
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  // Fondo blanco: las PNG con transparencia no quedan negras al pasar a JPEG.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, LADO, LADO)
  ctx.drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, LADO, LADO)
  if ('close' in imagen && typeof imagen.close === 'function') imagen.close()
  return canvas.toDataURL('image/jpeg', CALIDAD)
}
