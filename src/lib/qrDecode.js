import jsQR from 'jsqr'

/** Match `.scan-qr-viewfinder-box` width (62%) so decode targets the framed area. */
export const VIEWFINDER_CROP_FRACTION = 0.62

const JSQR_OPTS = { inversionAttempts: 'attemptBoth' }

export function jsqrDecodeRaw(imageData) {
  const r = jsQR(imageData.data, imageData.width, imageData.height, JSQR_OPTS)
  return r?.data ?? null
}

export function imageDataGrayscale(src) {
  const w = src.width
  const h = src.height
  const out = new ImageData(w, h)
  const s = src.data
  const d = out.data
  for (let i = 0; i < s.length; i += 4) {
    const y = (0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2]) | 0
    d[i] = d[i + 1] = d[i + 2] = y
    d[i + 3] = 255
  }
  return out
}

export function imageDataCenterCrop(src, fraction = VIEWFINDER_CROP_FRACTION) {
  const w = src.width
  const h = src.height
  const side = Math.max(64, Math.floor(Math.min(w, h) * fraction))
  const sx = Math.floor((w - side) / 2)
  const sy = Math.floor((h - side) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = side
  canvas.height = side
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  tmp.getContext('2d', { willReadFrequently: true }).putImageData(src, 0, 0)
  ctx.drawImage(tmp, sx, sy, side, side, 0, 0, side, side)
  return ctx.getImageData(0, 0, side, side)
}

function imageDataMaxSide(src, maxSide) {
  const w = src.width
  const h = src.height
  const m = Math.max(w, h)
  if (m <= maxSide) return src
  const scale = maxSide / m
  const nw = Math.max(1, Math.round(w * scale))
  const nh = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = nw
  canvas.height = nh
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  tmp.getContext('2d', { willReadFrequently: true }).putImageData(src, 0, 0)
  ctx.drawImage(tmp, 0, 0, nw, nh)
  return ctx.getImageData(0, 0, nw, nh)
}

function buildDecodeVariants(imageData) {
  const list = [
    imageDataCenterCrop(imageData, VIEWFINDER_CROP_FRACTION),
    imageData,
    imageDataGrayscale(imageDataCenterCrop(imageData, VIEWFINDER_CROP_FRACTION)),
    imageDataGrayscale(imageData),
  ]
  const scaled = imageDataMaxSide(imageData, 720)
  if (scaled.width !== imageData.width || scaled.height !== imageData.height) {
    list.push(
      imageDataCenterCrop(scaled, VIEWFINDER_CROP_FRACTION),
      scaled,
      imageDataGrayscale(imageDataCenterCrop(scaled, VIEWFINDER_CROP_FRACTION)),
      imageDataGrayscale(scaled),
    )
  }
  return list
}

/**
 * Decode a PhilFIDA asset QR from still image pixels (upload / file).
 * @param {ImageData} imageData
 * @param {(raw: string) => object | null} parsePayload
 */
export function decodePhilFidaAssetFromImageData(imageData, parsePayload) {
  for (const variant of buildDecodeVariants(imageData)) {
    const raw = jsqrDecodeRaw(variant)
    if (!raw) continue
    const parsed = parsePayload(raw)
    if (parsed) return parsed
  }
  return null
}

/**
 * Live camera: decode from current video frame (center crop + full; optional grayscale).
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @param {(raw: string) => object | null} parsePayload
 * @param {boolean} tryGrayscale - run grayscale copies of crop + full (2 extra jsQR calls)
 */
export function decodePhilFidaAssetFromVideoFrame(video, canvas, parsePayload, tryGrayscale) {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (vw <= 0 || vh <= 0) return null

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  const side = Math.max(1, Math.floor(Math.min(vw, vh) * VIEWFINDER_CROP_FRACTION))
  const sx = Math.floor((vw - side) / 2)
  const sy = Math.floor((vh - side) / 2)

  const tryOne = (imageData) => {
    const raw = jsqrDecodeRaw(imageData)
    if (!raw) return null
    return parsePayload(raw)
  }

  canvas.width = side
  canvas.height = side
  ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side)
  let parsed = tryOne(ctx.getImageData(0, 0, side, side))
  if (parsed) return parsed

  if (tryGrayscale) {
    parsed = tryOne(imageDataGrayscale(ctx.getImageData(0, 0, side, side)))
    if (parsed) return parsed
  }

  canvas.width = vw
  canvas.height = vh
  ctx.drawImage(video, 0, 0, vw, vh)
  parsed = tryOne(ctx.getImageData(0, 0, vw, vh))
  if (parsed) return parsed

  if (tryGrayscale) {
    parsed = tryOne(imageDataGrayscale(ctx.getImageData(0, 0, vw, vh)))
    if (parsed) return parsed
  }

  return null
}
