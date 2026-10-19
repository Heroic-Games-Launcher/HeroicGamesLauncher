/**
 * Reads and writes Unreal Engine save games (GVAS files), which games built on
 * `USaveGame` store their settings in. Supports the property tag layout used
 * up to Unreal Engine 5.3. Values Heroic doesn't understand are kept as raw
 * bytes, so writing an unmodified file reproduces it byte for byte
 */

interface GvasTag {
  structName?: string
  structGuid?: Buffer
  enumName?: string
  innerType?: string
  keyType?: string
  valueType?: string
}

type GvasValue =
  | { kind: 'raw'; data: Buffer }
  | { kind: 'string'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'properties'; properties: GvasProperty[] }
  | { kind: 'map'; entries: Array<[GvasValue, GvasValue]> }

export interface GvasProperty {
  name: string
  type: string
  arrayIndex: number
  tag: GvasTag
  guid?: Buffer
  value: GvasValue
}

interface GvasFile {
  /** Everything up to the first property, kept as is */
  header: Buffer
  saveClass: string
  properties: GvasProperty[]
  /** Bytes after the terminating `None` property */
  trailer: Buffer
}

/** First UE5 package version that extended property tags (Unreal Engine 5.4) */
const UE5_PROPERTY_TAG_EXTENSION = 1011

const STRING_TYPES = new Set(['NameProperty', 'StrProperty', 'EnumProperty'])

const FIXED_SIZE_TYPES: Record<string, number> = {
  BoolProperty: 1,
  Int8Property: 1,
  Int16Property: 2,
  UInt16Property: 2,
  IntProperty: 4,
  UInt32Property: 4,
  FloatProperty: 4,
  Int64Property: 8,
  UInt64Property: 8,
  DoubleProperty: 8
}

class Reader {
  constructor(
    private readonly buffer: Buffer,
    public pos = 0,
    private readonly end = buffer.length
  ) {}

  get remaining() {
    return this.end - this.pos
  }

  bytes(length: number): Buffer {
    if (length < 0 || length > this.remaining) {
      throw new Error(`Unexpected end of save data at byte ${this.pos}`)
    }
    const slice = this.buffer.subarray(this.pos, this.pos + length)
    this.pos += length
    return slice
  }

  u8 = () => this.bytes(1).readUInt8(0)
  u16 = () => this.bytes(2).readUInt16LE(0)
  i32 = () => this.bytes(4).readInt32LE(0)

  string(): string {
    const length = this.i32()
    if (length === 0) return ''
    if (length > 0) {
      return this.bytes(length).toString('latin1').replace(/\0$/, '')
    }
    return this.bytes(-length * 2)
      .toString('utf16le')
      .replace(/\0$/, '')
  }
}

function int32(value: number): Buffer {
  const buffer = Buffer.alloc(4)
  buffer.writeInt32LE(value, 0)
  return buffer
}

function fstring(value: string): Buffer {
  if (!value) return int32(0)
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7f]*$/.test(value)) {
    return Buffer.concat([
      int32(value.length + 1),
      Buffer.from(`${value}\0`, 'latin1')
    ])
  }
  return Buffer.concat([
    int32(-(value.length + 1)),
    Buffer.from(`${value}\0`, 'utf16le')
  ])
}

function readMapItem(reader: Reader, type: string): GvasValue {
  if (STRING_TYPES.has(type)) return { kind: 'string', value: reader.string() }
  if (type === 'StructProperty') {
    return { kind: 'properties', properties: readProperties(reader) }
  }
  const size = FIXED_SIZE_TYPES[type]
  if (size === undefined) throw new Error(`Unsupported map item type ${type}`)
  return { kind: 'raw', data: Buffer.from(reader.bytes(size)) }
}

/** Parses `data` with `parse`, keeping the bytes as they are if that fails */
function parseOrRaw(data: Buffer, parse: (reader: Reader) => GvasValue) {
  try {
    const reader = new Reader(data)
    const value = parse(reader)
    if (reader.remaining === 0) return value
  } catch {
    // Not in a layout Heroic understands
  }
  return { kind: 'raw', data: Buffer.from(data) } satisfies GvasValue
}

function readValue(type: string, tag: GvasTag, data: Buffer): GvasValue {
  if (STRING_TYPES.has(type)) {
    return parseOrRaw(data, (reader) => ({
      kind: 'string',
      value: reader.string()
    }))
  }
  if (type === 'StructProperty') {
    return parseOrRaw(data, (reader) => ({
      kind: 'properties',
      properties: readProperties(reader)
    }))
  }
  if (type === 'MapProperty' && tag.keyType && tag.valueType) {
    const { keyType, valueType } = tag
    return parseOrRaw(data, (reader) => {
      if (reader.i32() !== 0) throw new Error('Maps with removed keys')
      const count = reader.i32()
      const entries: Array<[GvasValue, GvasValue]> = []
      for (let i = 0; i < count; i++) {
        entries.push([
          readMapItem(reader, keyType),
          readMapItem(reader, valueType)
        ])
      }
      return { kind: 'map', entries }
    })
  }
  return { kind: 'raw', data: Buffer.from(data) }
}

function readProperties(reader: Reader): GvasProperty[] {
  const properties: GvasProperty[] = []
  for (;;) {
    const name = reader.string()
    if (name === 'None') return properties

    const type = reader.string()
    const size = reader.i32()
    const arrayIndex = reader.i32()
    const tag: GvasTag = {}
    let boolValue: boolean | undefined
    switch (type) {
      case 'StructProperty':
        tag.structName = reader.string()
        tag.structGuid = Buffer.from(reader.bytes(16))
        break
      case 'BoolProperty':
        boolValue = reader.u8() !== 0
        break
      case 'ByteProperty':
      case 'EnumProperty':
        tag.enumName = reader.string()
        break
      case 'ArrayProperty':
      case 'SetProperty':
        tag.innerType = reader.string()
        break
      case 'MapProperty':
        tag.keyType = reader.string()
        tag.valueType = reader.string()
        break
    }
    const guid = reader.u8() ? Buffer.from(reader.bytes(16)) : undefined
    const data = reader.bytes(size)
    const value: GvasValue =
      boolValue === undefined
        ? readValue(type, tag, data)
        : { kind: 'bool', value: boolValue }
    properties.push({ name, type, arrayIndex, tag, guid, value })
  }
}

function writeMapItem(value: GvasValue): Buffer {
  switch (value.kind) {
    case 'string':
      return fstring(value.value)
    case 'properties':
      return writeProperties(value.properties)
    case 'raw':
      return value.data
    default:
      throw new Error(`A ${value.kind} value can't be a map item`)
  }
}

function writeValue(value: GvasValue): Buffer {
  switch (value.kind) {
    case 'raw':
      return value.data
    case 'string':
      return fstring(value.value)
    case 'bool':
      return Buffer.alloc(0)
    case 'properties':
      return writeProperties(value.properties)
    case 'map':
      return Buffer.concat([
        int32(0),
        int32(value.entries.length),
        ...value.entries.flatMap(([key, item]) => [
          writeMapItem(key),
          writeMapItem(item)
        ])
      ])
  }
}

function writeProperty(property: GvasProperty): Buffer {
  const { tag, value } = property
  const data = writeValue(value)
  const parts = [
    fstring(property.name),
    fstring(property.type),
    int32(data.length),
    int32(property.arrayIndex)
  ]
  switch (property.type) {
    case 'StructProperty':
      parts.push(
        fstring(tag.structName ?? ''),
        tag.structGuid ?? Buffer.alloc(16)
      )
      break
    case 'BoolProperty':
      parts.push(Buffer.from([value.kind === 'bool' && value.value ? 1 : 0]))
      break
    case 'ByteProperty':
    case 'EnumProperty':
      parts.push(fstring(tag.enumName ?? 'None'))
      break
    case 'ArrayProperty':
    case 'SetProperty':
      parts.push(fstring(tag.innerType ?? ''))
      break
    case 'MapProperty':
      parts.push(fstring(tag.keyType ?? ''), fstring(tag.valueType ?? ''))
      break
  }
  parts.push(
    property.guid
      ? Buffer.concat([Buffer.from([1]), property.guid])
      : Buffer.from([0]),
    data
  )
  return Buffer.concat(parts)
}

function writeProperties(properties: GvasProperty[]): Buffer {
  return Buffer.concat([...properties.map(writeProperty), fstring('None')])
}

export function parseGvas(data: Buffer): GvasFile {
  const reader = new Reader(data)
  if (reader.bytes(4).toString('latin1') !== 'GVAS') {
    throw new Error('Not an Unreal Engine save game')
  }
  const saveGameVersion = reader.i32()
  reader.i32() // UE4 package version
  if (saveGameVersion >= 3) {
    const ue5Version = reader.i32()
    if (ue5Version >= UE5_PROPERTY_TAG_EXTENSION) {
      throw new Error(
        `Save games from Unreal Engine 5.4 or newer (package version ${ue5Version}) aren't supported`
      )
    }
  }
  reader.bytes(10) // engine version: major, minor, patch, changelist
  reader.string() // engine branch
  reader.i32() // custom version format
  const customVersions = reader.i32()
  reader.bytes(customVersions * 20)
  const saveClass = reader.string()
  const header = Buffer.from(data.subarray(0, reader.pos))
  const properties = readProperties(reader)
  return {
    header,
    saveClass,
    properties,
    trailer: Buffer.from(reader.bytes(reader.remaining))
  }
}

export function serializeGvas(file: GvasFile): Buffer {
  return Buffer.concat([
    file.header,
    writeProperties(file.properties),
    file.trailer
  ])
}

export function findProperty(
  properties: GvasProperty[],
  name: string
): GvasProperty | undefined {
  return properties.find((property) => property.name === name)
}

/** The fields of a struct property, or of a struct stored in a map */
export function structFields(
  value: GvasValue | undefined
): GvasProperty[] | undefined {
  return value?.kind === 'properties' ? value.properties : undefined
}

/** The value of a map property entry whose key is the given name or string */
export function mapEntry(
  property: GvasProperty | undefined,
  key: string
): GvasValue | undefined {
  if (property?.value.kind !== 'map') return
  return property.value.entries.find(
    ([entryKey]) => entryKey.kind === 'string' && entryKey.value === key
  )?.[1]
}

export function nameProperty(name: string, value: string): GvasProperty {
  return {
    name,
    type: 'NameProperty',
    arrayIndex: 0,
    tag: {},
    value: { kind: 'string', value }
  }
}

export function boolProperty(name: string, value: boolean): GvasProperty {
  return {
    name,
    type: 'BoolProperty',
    arrayIndex: 0,
    tag: {},
    value: { kind: 'bool', value }
  }
}
