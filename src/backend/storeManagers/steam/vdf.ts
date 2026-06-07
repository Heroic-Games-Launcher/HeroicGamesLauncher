// Util for reading binary VDFs
// https://github.com/ValveResourceFormat/ValveKeyValue

const magicHeader = 0x564b4256

enum BinaryNodeType {
  ChildObject = 0,
  String = 1,
  Int32 = 2,
  Float32 = 3,
  Pointer = 4,
  WideString = 5,
  Color = 6,
  UInt64 = 7,
  End = 8,
  ProbablyBinary = 9,
  Int64 = 10,
  AlternateEnd = 11
}

// This supports memory lookups only, guess we could make it support streaming but eh..

export class HeroicVDFParser {
  buffer: Buffer = Buffer.alloc(0)
  offset: number = 0
  stringTable: string[]
  endMarker = BinaryNodeType.End
  objectStack: { [key: string]: unknown }[] = []

  pendingKeys: string[] = []

  constructor(stringTable: string[] = []) {
    this.stringTable = stringTable
    this.objectStack.push({})
  }

  parse(buffer: Buffer, offset: number = 0) {
    this.buffer = buffer
    this.offset = offset
    this.objectStack = [{}]
    this.endMarker = BinaryNodeType.End
    if (this.buffer.readUint32LE(this.offset) == magicHeader) {
      this.offset += 8 // Move after the header and CRC32
      this.endMarker = BinaryNodeType.AlternateEnd
    }
    this.readObjectCore()
    return this.objectStack.pop()
  }

  readObjectCore() {
    let type = this.readNextNodeType()
    while (type !== this.endMarker) {
      this.readValue(type)
      type = this.readNextNodeType()
    }
  }

  readValue(type: BinaryNodeType) {
    const name = this.readNextKey()
    let value: unknown
    switch (type) {
      case BinaryNodeType.ChildObject:
        this.objectStart(name)
        this.readObjectCore()
        this.objectEnd()
        return
      case BinaryNodeType.String:
        value = this.readString('utf-8')
        break
      case BinaryNodeType.Int32:
      case BinaryNodeType.Color:
      case BinaryNodeType.Pointer:
        value = this.buffer.readUint32LE(this.offset)
        this.offset += 4
        break
      case BinaryNodeType.UInt64:
        value = this.buffer.readBigUInt64LE(this.offset)
        this.offset += 8
        break
      case BinaryNodeType.Float32:
        value = this.buffer.readFloatLE(this.offset)
        this.offset += 4
        break
      case BinaryNodeType.Int64:
        value = this.buffer.readBigInt64LE(this.offset)
        this.offset += 8
        break
      default:
        throw new Error(`Unhandled binary node type ${type}`)
    }

    this.objectAdd(name, value)
  }

  readNextKey() {
    if (this.stringTable.length) {
      const index = this.buffer.readUint32LE(this.offset)
      this.offset += 4
      return this.stringTable[index]
    }
    return this.readString('utf-8')
  }

  readString(encoding: BufferEncoding): string {
    let pos = this.offset
    while (true) {
      if (this.buffer.at(pos) === 0) {
        break
      }
      pos++
    }

    if (pos !== this.offset) {
      const offset = this.offset
      this.offset = pos + 1
      return this.buffer.toString(encoding, offset, pos)
    }
    this.offset += 1
    return ''
  }

  readNextNodeType(): BinaryNodeType {
    const type = this.buffer.at(this.offset) as BinaryNodeType
    this.offset += 1
    return type
  }

  objectStart(key: string) {
    this.objectStack.push({})
    this.pendingKeys.push(key)
  }
  objectEnd() {
    const key = this.pendingKeys.pop()
    if (!key) return
    const value = this.objectStack.pop()
    this.objectAdd(key, value)
  }
  objectAdd(key: string, value: unknown) {
    this.objectStack[this.objectStack.length - 1][key] = value
  }
}
