import { nativeImage } from 'electron'

/**
 * Pads an image buffer onto a transparent square canvas instead of
 * stretching or cropping it, so non-square art (box covers, banners)
 * doesn't get distorted when used as an app icon.
 */
function padToSquare(buffer: Buffer): Buffer {
  const image = nativeImage.createFromBuffer(buffer)
  const { width, height } = image.getSize()

  if (width === height || width === 0 || height === 0) {
    return image.toPNG()
  }

  const side = Math.max(width, height)
  const offsetX = Math.floor((side - width) / 2)
  const offsetY = Math.floor((side - height) / 2)

  const source = image.toBitmap()
  const padded = Buffer.alloc(side * side * 4)

  for (let y = 0; y < height; y++) {
    const srcStart = y * width * 4
    const destStart = ((y + offsetY) * side + offsetX) * 4
    source.copy(padded, destStart, srcStart, srcStart + width * 4)
  }

  return nativeImage
    .createFromBitmap(padded, { width: side, height: side })
    .toPNG()
}

export { padToSquare }
