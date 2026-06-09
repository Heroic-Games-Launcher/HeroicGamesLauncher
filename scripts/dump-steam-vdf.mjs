// One-off script: parse Steam's binary/text appcache VDFs into human-readable
// JSON, written next to the originals. Reuses the binary-VDF logic from
// src/backend/storeManagers/steam/vdf.ts and library.ts (loadAppInfo /
// loadPackageInfo). Text VDF (localization.vdf) uses @node-steam/vdf.

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseTextVdf } from '@node-steam/vdf'

const APPCACHE = 'C:\\Program Files (x86)\\Steam\\appcache'

const magicHeader = 0x564b4256

const BinaryNodeType = {
  ChildObject: 0,
  String: 1,
  Int32: 2,
  Float32: 3,
  Pointer: 4,
  WideString: 5,
  Color: 6,
  UInt64: 7,
  End: 8,
  ProbablyBinary: 9,
  Int64: 10,
  AlternateEnd: 11
}

class HeroicVDFParser {
  constructor(stringTable = []) {
    this.buffer = Buffer.alloc(0)
    this.offset = 0
    this.stringTable = stringTable
    this.endMarker = BinaryNodeType.End
    this.objectStack = [{}]
    this.pendingKeys = []
  }

  parse(buffer, offset = 0) {
    this.buffer = buffer
    this.offset = offset
    this.objectStack = [{}]
    this.endMarker = BinaryNodeType.End
    if (this.buffer.readUint32LE(this.offset) === magicHeader) {
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

  readValue(type) {
    const name = this.readNextKey()
    let value
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

  readString(encoding) {
    let pos = this.offset
    while (true) {
      if (this.buffer.at(pos) === 0) break
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

  readNextNodeType() {
    const type = this.buffer.at(this.offset)
    this.offset += 1
    return type
  }

  objectStart(key) {
    this.objectStack.push({})
    this.pendingKeys.push(key)
  }
  objectEnd() {
    const key = this.pendingKeys.pop()
    if (!key) return
    const value = this.objectStack.pop()
    this.objectAdd(key, value)
  }
  objectAdd(key, value) {
    this.objectStack[this.objectStack.length - 1][key] = value
  }
}

async function loadAppInfo(appInfoPath) {
  const data = await readFile(appInfoPath)
  let offset = 0
  const magic = data.readUInt32LE(offset)
  offset += 4
  offset += 4 // universe
  const version = magic & 0xff
  if (version < 39 || version > 41) {
    throw new Error(`Unknown appinfo.vdf version ${version}`)
  }

  const table = []
  if (version >= 41) {
    const stringTableOffset = data.readBigInt64LE(offset)
    offset += 8
    const position = offset
    offset = Number(stringTableOffset)
    const count = data.readUInt32LE(offset)
    offset += 4
    for (let i = 0; i < count; i++) {
      let pos = offset
      while (data.at(pos) !== 0) pos++
      if (pos !== offset) table.push(data.toString('utf-8', offset, pos))
      offset = pos + 1
    }
    offset = position
  }

  const parser = new HeroicVDFParser(table)
  const games = {}
  while (true) {
    const appid = data.readUInt32LE(offset)
    offset += 4
    if (appid === 0) break
    const size = data.readUInt32LE(offset)
    offset += 4
    const end = offset + size
    const infoState = data.readUInt32LE(offset)
    offset += 4
    const updateTime = data.readUInt32LE(offset)
    offset += 4
    const token = data.readBigInt64LE(offset)
    offset += 8
    offset += 20 // sha1 hash
    const changeNumber = data.readUInt32LE(offset)
    offset += 4
    if (version >= 40) offset += 20 // binary vdf hash
    const vdfData = data.subarray(offset, end)
    offset = end
    try {
      const parsedData = parser.parse(vdfData)
      games[appid.toString()] = {
        appid,
        infoState,
        updateTime,
        token,
        changeNumber,
        data: parsedData
      }
    } catch (error) {
      console.warn(
        `  ! Failed to parse appinfo entry ${appid}: ${error.message}`
      )
    }
  }
  return games
}

async function loadPackageInfo(packageInfoPath) {
  const data = await readFile(packageInfoPath)
  let offset = 0
  const magic = data.readUInt32LE(offset)
  offset += 4
  offset += 4 // universe
  const version = magic & 0xff
  if (version < 39 || version > 40) {
    throw new Error(`Unknown packageinfo.vdf version ${version}`)
  }

  const parser = new HeroicVDFParser([])
  let packages = {}
  while (true) {
    const subid = data.readUInt32LE(offset)
    offset += 4
    if (subid === 0xffffffff) break
    offset += 20 // sha1 hash
    offset += 4 // change number
    if (version >= 40) offset += 8 // token
    try {
      const parsedData = parser.parse(data, offset)
      offset = parser.offset
      packages = { ...packages, ...parsedData }
    } catch (error) {
      console.warn(
        `  ! Failed to parse packageinfo entry ${subid}: ${error.message}`
      )
      break
    }
  }
  return packages
}

// JSON.stringify can't serialize BigInt; render it as a numeric string.
const bigintReplacer = (_key, value) =>
  typeof value === 'bigint' ? value.toString() : value

async function dump(name, loader) {
  const src = join(APPCACHE, name)
  if (!existsSync(src)) {
    console.warn(`SKIP ${name}: not found`)
    return
  }
  const out = join(APPCACHE, name.replace(/\.vdf$/i, '.json'))
  console.log(`Parsing ${name} ...`)
  const parsed = await loader(src)
  await writeFile(out, JSON.stringify(parsed, bigintReplacer, 2), 'utf-8')
  console.log(`  -> wrote ${out}`)
}

await dump('appinfo.vdf', loadAppInfo)
await dump('packageinfo.vdf', loadPackageInfo)
await dump('localization.vdf', async (p) =>
  parseTextVdf(await readFile(p, 'utf-8'))
)

console.log('Done.')
