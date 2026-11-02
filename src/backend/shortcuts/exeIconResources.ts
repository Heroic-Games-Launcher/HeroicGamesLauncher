import { open } from 'fs/promises'

const maxResourceBytes = 32 * 1024 * 1024

/** Read PE icon resources as data; the executable is never launched or modified. */
export async function readExeIconResources(path: string): Promise<Buffer[]> {
  const file = await open(path, 'r')
  try {
    const { size: fileSize } = await file.stat()
    const read = async (offset: number, size: number) => {
      if (
        offset < 0 ||
        size < 0 ||
        size > maxResourceBytes ||
        offset + size > fileSize
      )
        throw new Error('Invalid PE file range')
      const buffer = Buffer.alloc(size)
      let bytesRead = 0
      while (bytesRead < size) {
        const result = await file.read(
          buffer,
          bytesRead,
          size - bytesRead,
          offset + bytesRead
        )
        if (!result.bytesRead) throw new Error('Truncated PE file')
        bytesRead += result.bytesRead
      }
      return buffer
    }
    const dos = await read(0, 64)
    if (dos.toString('ascii', 0, 2) !== 'MZ') return []
    const peOffset = dos.readUInt32LE(60)
    const pe = await read(peOffset, 24)
    if (pe.readUInt32LE(0) !== 0x4550) return []
    const sectionCount = pe.readUInt16LE(6)
    const optionalSize = pe.readUInt16LE(20)
    if (
      !sectionCount ||
      sectionCount > 96 ||
      optionalSize < 2 ||
      optionalSize > 4096
    )
      return []
    const optional = await read(peOffset + 24, optionalSize)
    const magic = optional.readUInt16LE(0)
    const directory = magic === 0x10b ? 96 : magic === 0x20b ? 112 : 0
    if (!directory || optional.length < directory + 24) return []
    if (optional.readUInt32LE(directory - 4) < 3) return []
    const resourceRva = optional.readUInt32LE(directory + 16)
    const resourceSize = optional.readUInt32LE(directory + 20)
    if (!resourceRva || !resourceSize || resourceSize > maxResourceBytes)
      return []
    const sections = await read(peOffset + 24 + optionalSize, sectionCount * 40)
    const fileOffset = (rva: number, size: number) => {
      for (let i = 0; i < sectionCount; i++) {
        const pos = i * 40
        const start = sections.readUInt32LE(pos + 12)
        const rawSize = sections.readUInt32LE(pos + 16)
        const delta = rva - start
        if (delta >= 0 && delta + size <= rawSize)
          return sections.readUInt32LE(pos + 20) + delta
      }
      throw new Error('PE resource outside file-backed sections')
    }
    const resources = await read(
      fileOffset(resourceRva, resourceSize),
      resourceSize
    )
    const check = (offset: number, size: number) => {
      if (offset < 0 || size < 0 || offset + size > resources.length)
        throw new Error('Invalid PE resource range')
    }
    const entries = (offset: number) => {
      check(offset, 16)
      const count =
        resources.readUInt16LE(offset + 12) +
        resources.readUInt16LE(offset + 14)
      if (count > 4096) throw new Error('Too many PE resources')
      check(offset + 16, count * 8)
      return Array.from({ length: count }, (_, i) => {
        const pos = offset + 16 + i * 8
        const target = resources.readUInt32LE(pos + 4)
        return {
          id: resources.readUInt32LE(pos),
          directory: !!(target & 0x80000000),
          offset: target & 0x7fffffff
        }
      })
    }
    const root = entries(0)
    const iconType = root.find((entry) => entry.id === 3 && entry.directory)
    const groupType = root.find((entry) => entry.id === 14 && entry.directory)
    if (!iconType || !groupType) return []
    const dataAt = async (offset: number) => {
      check(offset, 16)
      const rva = resources.readUInt32LE(offset)
      const size = resources.readUInt32LE(offset + 4)
      // Icons should be small even in very large executables.
      if (!size || size > 4 * 1024 * 1024)
        throw new Error('Oversized icon resource')
      return read(fileOffset(rva, size), size)
    }
    const icons = entries(iconType.offset)
    // Windows uses the first icon group as the application's default icon.
    const group = entries(groupType.offset).find((entry) => entry.directory)
    if (!group) return []
    const language = entries(group.offset).find((entry) => !entry.directory)
    if (!language) return []
    const groupData = await dataAt(language.offset)
    if (
      groupData.length < 6 ||
      groupData.readUInt16LE(0) !== 0 ||
      groupData.readUInt16LE(2) !== 1
    )
      return []
    const count = groupData.readUInt16LE(4)
    if (count > 256 || groupData.length < 6 + count * 14) return []
    const candidates = Array.from({ length: count }, (_, i) => {
      const pos = 6 + i * 14
      return {
        id: groupData.readUInt16LE(pos + 12),
        area: (groupData[pos] || 256) * (groupData[pos + 1] || 256),
        depth: groupData.readUInt16LE(pos + 6)
      }
    }).sort((a, b) => b.area - a.area || b.depth - a.depth)
    const result: Buffer[] = []
    let totalIconBytes = 0
    for (const candidate of candidates) {
      try {
        const icon = icons.find(
          (entry) => entry.id === candidate.id && entry.directory
        )
        if (!icon) continue
        const languages = entries(icon.offset).filter(
          (entry) => !entry.directory
        )
        const matching =
          languages.find((entry) => entry.id === language.id) || languages[0]
        if (matching) {
          check(matching.offset, 16)
          // Account for the allocation before reading the next candidate.
          const size = resources.readUInt32LE(matching.offset + 4)
          if (size > 4 * 1024 * 1024) continue
          totalIconBytes += size
          if (totalIconBytes > maxResourceBytes) break
          const data = await dataAt(matching.offset)
          result.push(data)
        }
      } catch {
        // A damaged large image must not hide a usable smaller icon.
      }
    }
    return result
  } finally {
    await file.close()
  }
}

/** Convert legacy ICO DIB pixels and their transparency mask to premultiplied BGRA. */
export function decodeIconBitmap(data: Buffer) {
  if (data.length < 40) throw new Error('Truncated icon bitmap')
  const headerSize = data.readUInt32LE(0)
  const width = data.readInt32LE(4)
  const fullHeight = data.readInt32LE(8)
  const height = Math.abs(fullHeight) / 2
  const depth = data.readUInt16LE(14)
  if (
    headerSize < 40 ||
    headerSize > data.length ||
    width < 1 ||
    width > 256 ||
    !Number.isInteger(height) ||
    height < 1 ||
    height > 256 ||
    ![1, 4, 8, 24, 32].includes(depth) ||
    data.readUInt16LE(12) !== 1 ||
    data.readUInt32LE(16) !== 0
  )
    throw new Error('Unsupported icon bitmap')
  const colorCount = data.readUInt32LE(32) || (depth <= 8 ? 2 ** depth : 0)
  if (colorCount > 256 || (depth <= 8 && colorCount > 2 ** depth))
    throw new Error('Invalid icon palette')
  const start = headerSize + colorCount * 4
  const stride = Math.ceil((width * depth) / 32) * 4
  const maskStart = start + stride * height
  const maskStride = Math.ceil(width / 32) * 4
  if (maskStart > data.length) throw new Error('Truncated icon pixels')
  const hasMask = maskStart + maskStride * height <= data.length
  if (!hasMask && depth !== 32) throw new Error('Truncated icon mask')
  const pixels = Buffer.alloc(width * height * 4)
  let hasAlpha = false
  for (let y = 0; y < height; y++) {
    const row = start + (fullHeight > 0 ? height - 1 - y : y) * stride
    for (let x = 0; x < width; x++) {
      const dest = (y * width + x) * 4
      let src: number
      if (depth <= 8) {
        const packed = data[row + Math.floor((x * depth) / 8)]
        const index =
          (packed >> (8 - depth - ((x * depth) % 8))) & ((1 << depth) - 1)
        if (index >= colorCount) throw new Error('Invalid palette index')
        src = headerSize + index * 4
      } else {
        src = row + (x * depth) / 8
      }
      data.copy(pixels, dest, src, src + 3)
      const alpha = depth === 32 ? data[src + 3] : 255
      pixels[dest + 3] = alpha
      if (depth === 32 && alpha !== 0) hasAlpha = true
    }
  }
  for (let y = 0; y < height; y++) {
    const row = maskStart + (fullHeight > 0 ? height - 1 - y : y) * maskStride
    for (let x = 0; x < width; x++) {
      const dest = (y * width + x) * 4
      let alpha = hasAlpha ? pixels[dest + 3] : 255
      if (!hasAlpha && hasMask && data[row + (x >> 3)] & (0x80 >> (x % 8)))
        alpha = 0
      pixels[dest + 3] = alpha
      for (let channel = 0; channel < 3; channel++)
        pixels[dest + channel] = Math.round(
          (pixels[dest + channel] * alpha) / 255
        )
    }
  }
  return { pixels, width, height }
}
