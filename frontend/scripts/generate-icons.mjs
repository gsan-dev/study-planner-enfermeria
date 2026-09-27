// Genera los iconos PNG de la PWA sin dependencias nativas (solo zlib de Node).
// Uso: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public')

const BG = [15, 118, 110] // #0f766e (brand-700)
const FG = [255, 255, 255]
const SUPERSAMPLE = 4

// CRC32 para los chunks PNG.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([len, typeAndData, crc])
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bits por canal
  header[9] = 6 // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0 // filtro "none"
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Distancia con signo a un rectángulo redondeado centrado en (0,0).
function roundedRect(x, y, halfW, halfH, r) {
  const qx = Math.abs(x) - halfW + r
  const qy = Math.abs(y) - halfH + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

/**
 * Cruz sanitaria blanca sobre fondo teal (fondo a sangre para que sirva como
 * icono "maskable" y apple-touch-icon; la cruz cabe en la zona segura del 80%).
 */
function renderIcon(size, crossScale = 0.5) {
  const rgba = Buffer.alloc(size * size * 4)
  const arm = crossScale / 2 // semilongitud del brazo (en unidades 0..1)
  const thick = crossScale / 6 // semigrosor del brazo
  const radius = thick * 0.35
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let coverage = 0
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const x = (px + (sx + 0.5) / SUPERSAMPLE) / size - 0.5
          const y = (py + (sy + 0.5) / SUPERSAMPLE) / size - 0.5
          const d = Math.min(roundedRect(x, y, thick, arm, radius), roundedRect(x, y, arm, thick, radius))
          if (d <= 0) coverage += 1
        }
      }
      const a = coverage / SUPERSAMPLE ** 2
      const i = (py * size + px) * 4
      for (let c = 0; c < 3; c += 1) rgba[i + c] = Math.round(BG[c] * (1 - a) + FG[c] * a)
      rgba[i + 3] = 255
    }
  }
  return encodePng(size, rgba)
}

const outputs = [
  ['icons/icon-192.png', 192],
  ['icons/icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]

for (const [file, size] of outputs) {
  const path = resolve(publicDir, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, renderIcon(size))
  console.log(`✔ ${file} (${size}x${size})`)
}
