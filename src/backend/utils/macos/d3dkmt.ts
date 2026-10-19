import { existsSync } from 'graceful-fs'
import { copyFile, readFile, rename, writeFile } from 'fs/promises'
import { join } from 'path'

const STOCK_SUFFIX = '.heroic-stock'

/**
 * Streamline (the SDK games use for DLSS Frame Generation) only enables frame
 * generation when Windows reports hardware-accelerated GPU scheduling, which it
 * reads with `D3DKMTEnumAdapters2` and `D3DKMTQueryAdapterInfo`. The Wine 7.7
 * in Game Porting Toolkit 3 doesn't export either, so frame generation stays
 * off although D3DMetal implements it with MetalFX frame interpolation.
 *
 * D3DMetal's dxgi.dll also calls `D3DKMTEnumAdapters2` when it exists and uses
 * the adapter LUID it returns for DXGI and NVAPI, so all three sources
 * Streamline compares agree on this one adapter
 */
const D3DKMT_ADAPTER = {
  handle: 0x4b4d0001,
  luidLow: 0xd3d1,
  luidHigh: 0
}

const STATUS_INVALID_PARAMETER = 0xc000000d
const STATUS_BUFFER_TOO_SMALL = 0xc0000023
const STATUS_NOT_SUPPORTED = 0xc00000bb
const KMTQAITYPE_WDDM_2_7_CAPS = 70
/** HwSchSupported | HwSchEnabled | HwSchEnabledByDefault */
const WDDM_2_7_CAPS_HWSCH = 0x7

type Instruction = number[] | { label: string } | { jump: number; to: string }

const JZ = 0x74
const JNZ = 0x75
const JB = 0x72

function imm32(value: number): number[] {
  const bytes = Buffer.alloc(4)
  bytes.writeUInt32LE(value >>> 0)
  return [...bytes]
}

/** Assembles x86-64 code whose only relative operands are short jumps to labels */
function assemble(code: Instruction[]): Buffer {
  const labels = new Map<string, number>()
  let size = 0
  for (const instruction of code) {
    if ('label' in instruction) labels.set(instruction.label, size)
    else size += Array.isArray(instruction) ? instruction.length : 2
  }
  const out: number[] = []
  for (const instruction of code) {
    if ('label' in instruction) continue
    if (Array.isArray(instruction)) {
      out.push(...instruction)
      continue
    }
    const target = labels.get(instruction.to)
    if (target === undefined) throw new Error(`unknown label ${instruction.to}`)
    const distance = target - (out.length + 2)
    if (distance < -128 || distance > 127) throw new Error('jump out of range')
    out.push(instruction.jump, distance & 0xff)
  }
  return Buffer.from(out)
}

/** NTSTATUS D3DKMTEnumAdapters2(D3DKMT_ENUMADAPTERS2 *desc), desc in rcx */
function enumAdapters2Code(): Buffer {
  const { handle, luidLow, luidHigh } = D3DKMT_ADAPTER
  return assemble([
    [0x48, 0x85, 0xc9], // test rcx, rcx
    { jump: JZ, to: 'invalid' },
    [0x48, 0x8b, 0x41, 0x08], // mov rax, [rcx+8]   desc->pAdapters
    [0x48, 0x85, 0xc0], // test rax, rax
    { jump: JZ, to: 'count' },
    [0x83, 0x39, 0x01], // cmp dword [rcx], 1   desc->NumAdapters
    { jump: JB, to: 'small' },
    [0xc7, 0x00, ...imm32(handle)], // mov dword [rax], hAdapter
    [0xc7, 0x40, 0x04, ...imm32(luidLow)], // mov dword [rax+4], AdapterLuid.LowPart
    [0xc7, 0x40, 0x08, ...imm32(luidHigh)], // mov dword [rax+8], AdapterLuid.HighPart
    [0xc7, 0x40, 0x0c, ...imm32(1)], // mov dword [rax+12], NumOfSources
    [0xc7, 0x40, 0x10, ...imm32(0)], // mov dword [rax+16], bPrecisePresentRegionsPreferred
    { label: 'count' },
    [0xc7, 0x01, ...imm32(1)], // mov dword [rcx], 1
    [0x31, 0xc0], // xor eax, eax
    [0xc3], // ret
    { label: 'small' },
    [0xc7, 0x01, ...imm32(1)], // mov dword [rcx], 1
    [0xb8, ...imm32(STATUS_BUFFER_TOO_SMALL)], // mov eax, STATUS_BUFFER_TOO_SMALL
    [0xc3], // ret
    { label: 'invalid' },
    [0xb8, ...imm32(STATUS_INVALID_PARAMETER)], // mov eax, STATUS_INVALID_PARAMETER
    [0xc3] // ret
  ])
}

/** NTSTATUS D3DKMTQueryAdapterInfo(D3DKMT_QUERYADAPTERINFO *info), info in rcx */
function queryAdapterInfoCode(): Buffer {
  return assemble([
    [0x48, 0x85, 0xc9], // test rcx, rcx
    { jump: JZ, to: 'invalid' },
    [0x81, 0x39, ...imm32(D3DKMT_ADAPTER.handle)], // cmp dword [rcx], hAdapter
    { jump: JNZ, to: 'invalid' },
    [0x48, 0x8b, 0x51, 0x08], // mov rdx, [rcx+8]   info->pPrivateDriverData
    [0x48, 0x85, 0xd2], // test rdx, rdx
    { jump: JZ, to: 'invalid' },
    [0x83, 0x79, 0x04, KMTQAITYPE_WDDM_2_7_CAPS], // cmp dword [rcx+4], Type
    { jump: JNZ, to: 'unsupported' },
    [0x83, 0x79, 0x10, 0x04], // cmp dword [rcx+16], 4   info->PrivateDriverDataSize
    { jump: JB, to: 'small' },
    [0xc7, 0x02, ...imm32(WDDM_2_7_CAPS_HWSCH)], // mov dword [rdx], caps
    [0x31, 0xc0], // xor eax, eax
    [0xc3], // ret
    { label: 'unsupported' },
    [0xb8, ...imm32(STATUS_NOT_SUPPORTED)], // mov eax, STATUS_NOT_SUPPORTED
    [0xc3], // ret
    { label: 'small' },
    [0xb8, ...imm32(STATUS_BUFFER_TOO_SMALL)], // mov eax, STATUS_BUFFER_TOO_SMALL
    [0xc3], // ret
    { label: 'invalid' },
    [0xb8, ...imm32(STATUS_INVALID_PARAMETER)], // mov eax, STATUS_INVALID_PARAMETER
    [0xc3] // ret
  ])
}

export const D3DKMT_FUNCTIONS: Record<string, () => Buffer> = {
  D3DKMTEnumAdapters2: enumAdapters2Code,
  D3DKMTQueryAdapterInfo: queryAdapterInfoCode
}

interface Section {
  name: string
  virtualSize: number
  virtualAddress: number
  rawSize: number
  rawPointer: number
  headerOffset: number
}

interface PEFile {
  optionalHeader: number
  sections: Section[]
  sectionAlignment: number
  fileAlignment: number
  sizeOfHeaders: number
  exportDirectory: { rva: number; size: number }
}

const PE32_PLUS = 0x20b
const DATA_DIRECTORIES = 112
const CHECKSUM_OFFSET = 64
const SECTION_HEADER_SIZE = 40
const EXPORT_DIRECTORY_SIZE = 40
const IMAGE_SCN_CODE_EXECUTE_READ = 0x60000020
const PATCH_SECTION = '.hkmt'

function align(value: number, alignment: number): number {
  return Math.ceil(value / alignment) * alignment
}

function parsePE(data: Buffer): PEFile {
  if (data.readUInt16LE(0) !== 0x5a4d) throw new Error('not a PE file')
  const peHeader = data.readUInt32LE(0x3c)
  if (data.readUInt32LE(peHeader) !== 0x4550) throw new Error('not a PE file')
  const numberOfSections = data.readUInt16LE(peHeader + 6)
  const sizeOfOptionalHeader = data.readUInt16LE(peHeader + 20)
  const optionalHeader = peHeader + 24
  if (data.readUInt16LE(optionalHeader) !== PE32_PLUS) {
    throw new Error('not a 64-bit PE file')
  }
  const sections: Section[] = []
  for (let i = 0; i < numberOfSections; i++) {
    const header =
      optionalHeader + sizeOfOptionalHeader + i * SECTION_HEADER_SIZE
    sections.push({
      name: data.toString('latin1', header, header + 8).replace(/\0+$/, ''),
      virtualSize: data.readUInt32LE(header + 8),
      virtualAddress: data.readUInt32LE(header + 12),
      rawSize: data.readUInt32LE(header + 16),
      rawPointer: data.readUInt32LE(header + 20),
      headerOffset: header
    })
  }
  return {
    optionalHeader,
    sections,
    sectionAlignment: data.readUInt32LE(optionalHeader + 32),
    fileAlignment: data.readUInt32LE(optionalHeader + 36),
    sizeOfHeaders: data.readUInt32LE(optionalHeader + 60),
    exportDirectory: {
      rva: data.readUInt32LE(optionalHeader + DATA_DIRECTORIES),
      size: data.readUInt32LE(optionalHeader + DATA_DIRECTORIES + 4)
    }
  }
}

function rvaToOffset(pe: PEFile, rva: number): number {
  const section = pe.sections.find(
    (s) =>
      rva >= s.virtualAddress &&
      rva < s.virtualAddress + Math.max(s.virtualSize, s.rawSize)
  )
  if (!section)
    throw new Error(`RVA 0x${rva.toString(16)} is outside every section`)
  return rva - section.virtualAddress + section.rawPointer
}

function readString(data: Buffer, pe: PEFile, rva: number): string {
  const start = rvaToOffset(pe, rva)
  return data.toString('latin1', start, data.indexOf(0, start))
}

interface PEExport {
  name: string
  /** RVA of the code, or the target ("module.function") of a forwarder */
  target: number | string
}

interface ExportTable {
  dllName: string
  base: number
  timeDateStamp: number
  version: number
  /** Indexed by ordinal - base */
  functions: Array<number | string>
  names: Array<{ name: string; index: number }>
}

function readExportTable(data: Buffer, pe: PEFile): ExportTable {
  const { rva, size } = pe.exportDirectory
  if (!rva) throw new Error('the DLL has no export table')
  const dir = rvaToOffset(pe, rva)
  const numberOfFunctions = data.readUInt32LE(dir + 20)
  const numberOfNames = data.readUInt32LE(dir + 24)
  const functionsAt = rvaToOffset(pe, data.readUInt32LE(dir + 28))
  const namesAt = rvaToOffset(pe, data.readUInt32LE(dir + 32))
  const ordinalsAt = rvaToOffset(pe, data.readUInt32LE(dir + 36))

  const functions: Array<number | string> = []
  for (let i = 0; i < numberOfFunctions; i++) {
    const target = data.readUInt32LE(functionsAt + i * 4)
    // A function RVA inside the export directory is a forwarder string
    functions.push(
      target >= rva && target < rva + size
        ? readString(data, pe, target)
        : target
    )
  }
  const names = []
  for (let i = 0; i < numberOfNames; i++) {
    names.push({
      name: readString(data, pe, data.readUInt32LE(namesAt + i * 4)),
      index: data.readUInt16LE(ordinalsAt + i * 2)
    })
  }
  return {
    dllName: readString(data, pe, data.readUInt32LE(dir + 12)),
    base: data.readUInt32LE(dir + 16),
    timeDateStamp: data.readUInt32LE(dir + 4),
    version: data.readUInt32LE(dir + 8),
    functions,
    names
  }
}

/** Named exports of a 64-bit PE file */
export function readExports(data: Buffer): PEExport[] {
  const pe = parsePE(data)
  const table = readExportTable(data, pe)
  return table.names.map(({ name, index }) => ({
    name,
    target: table.functions[index]
  }))
}

/** The PE checksum, computed with the checksum field itself taken as zero */
export function peChecksum(data: Buffer): number {
  const checksumAt = parsePE(data).optionalHeader + CHECKSUM_OFFSET
  let sum = 0
  for (let i = 0; i < data.length; i += 2) {
    if (i === checksumAt || i === checksumAt + 2) continue
    sum += i + 1 < data.length ? data.readUInt16LE(i) : data[i]
    sum = (sum & 0xffff) + (sum >>> 16)
  }
  return ((sum & 0xffff) + data.length) >>> 0
}

function compareNames(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, 'latin1'), Buffer.from(b, 'latin1'))
}

/**
 * Returns a copy of a 64-bit DLL that also exports the given functions. Their
 * code and a rebuilt export directory go into a new executable section; the
 * rest of the file is unchanged
 */
export function addExports(
  data: Buffer,
  additions: Record<string, Buffer>
): Buffer {
  const pe = parsePE(data)
  const table = readExportTable(data, pe)
  const existing = new Set(table.names.map(({ name }) => name))
  for (const name of Object.keys(additions)) {
    if (existing.has(name)) throw new Error(`${name} is already exported`)
  }

  const last = pe.sections.reduce((a, b) =>
    b.virtualAddress > a.virtualAddress ? b : a
  )
  const sectionRva = align(
    last.virtualAddress + Math.max(last.virtualSize, last.rawSize),
    pe.sectionAlignment
  )
  const rawEnd = Math.max(...pe.sections.map((s) => s.rawPointer + s.rawSize))
  if (data.length > rawEnd) {
    throw new Error('the DLL has data after its last section')
  }
  const headerOffset =
    pe.sections[pe.sections.length - 1].headerOffset + SECTION_HEADER_SIZE
  const firstRaw = Math.min(
    ...pe.sections.filter((s) => s.rawPointer).map((s) => s.rawPointer)
  )
  if (
    headerOffset + SECTION_HEADER_SIZE >
    Math.min(pe.sizeOfHeaders, firstRaw)
  ) {
    throw new Error('no room for another section header')
  }

  // Code first, 16-byte aligned, then the export directory and its tables
  const blob: number[] = []
  const functions = [...table.functions]
  const names = [...table.names]
  for (const [name, code] of Object.entries(additions)) {
    while (blob.length % 16) blob.push(0xcc)
    names.push({ name, index: functions.length })
    functions.push(sectionRva + blob.length)
    blob.push(...code)
  }
  while (blob.length % 16) blob.push(0xcc)
  names.sort((a, b) => compareNames(a.name, b.name))

  const directoryRva = sectionRva + blob.length
  const functionsAt = EXPORT_DIRECTORY_SIZE
  const namesAt = functionsAt + functions.length * 4
  const ordinalsAt = namesAt + names.length * 4
  const directory = Buffer.alloc(ordinalsAt + names.length * 2)
  const strings: Buffer[] = []
  let stringsSize = 0
  const addString = (value: string) => {
    const rva = directoryRva + directory.length + stringsSize
    const bytes = Buffer.from(value + '\0', 'latin1')
    strings.push(bytes)
    stringsSize += bytes.length
    return rva
  }

  directory.writeUInt32LE(table.timeDateStamp, 4)
  directory.writeUInt32LE(table.version, 8)
  directory.writeUInt32LE(addString(table.dllName), 12)
  directory.writeUInt32LE(table.base, 16)
  directory.writeUInt32LE(functions.length, 20)
  directory.writeUInt32LE(names.length, 24)
  directory.writeUInt32LE(directoryRva + functionsAt, 28)
  directory.writeUInt32LE(directoryRva + namesAt, 32)
  directory.writeUInt32LE(directoryRva + ordinalsAt, 36)
  names.forEach(({ name, index }, i) => {
    directory.writeUInt32LE(addString(name), namesAt + i * 4)
    directory.writeUInt16LE(index, ordinalsAt + i * 2)
  })
  functions.forEach((target, i) => {
    const rva = typeof target === 'string' ? addString(target) : target
    directory.writeUInt32LE(rva, functionsAt + i * 4)
  })

  const exportDirectorySize = directory.length + stringsSize
  const content = Buffer.concat([Buffer.from(blob), directory, ...strings])
  const rawPointer = align(rawEnd, pe.fileAlignment)
  const rawSize = align(content.length, pe.fileAlignment)

  const out = Buffer.alloc(rawPointer + rawSize)
  data.copy(out)
  content.copy(out, rawPointer)

  out.write(PATCH_SECTION.padEnd(8, '\0'), headerOffset, 'latin1')
  out.writeUInt32LE(content.length, headerOffset + 8)
  out.writeUInt32LE(sectionRva, headerOffset + 12)
  out.writeUInt32LE(rawSize, headerOffset + 16)
  out.writeUInt32LE(rawPointer, headerOffset + 20)
  out.writeUInt32LE(IMAGE_SCN_CODE_EXECUTE_READ, headerOffset + 36)

  const peHeader = data.readUInt32LE(0x3c)
  const { optionalHeader } = pe
  out.writeUInt16LE(pe.sections.length + 1, peHeader + 6)
  out.writeUInt32LE(
    out.readUInt32LE(optionalHeader + 4) + rawSize,
    optionalHeader + 4
  )
  out.writeUInt32LE(
    align(sectionRva + content.length, pe.sectionAlignment),
    optionalHeader + 56
  )
  out.writeUInt32LE(directoryRva, optionalHeader + DATA_DIRECTORIES)
  out.writeUInt32LE(exportDirectorySize, optionalHeader + DATA_DIRECTORIES + 4)
  out.writeUInt32LE(peChecksum(out), optionalHeader + CHECKSUM_OFFSET)
  return out
}

/**
 * - `patched`: gdi32.dll was patched now
 * - `ready`: gdi32.dll was patched before
 * - `native`: the runner's Wine has its own D3DKMT adapter functions
 * - `unsupported`: gdi32.dll has only one of the two functions, or is missing
 */
export type FrameGenerationRunnerState =
  | 'patched'
  | 'ready'
  | 'native'
  | 'unsupported'

/**
 * Makes the runner's gdi32.dll report hardware-accelerated GPU scheduling (see
 * {@link D3DKMT_ADAPTER}). The original stays next to it as `*.heroic-stock`
 *
 * @param windowsDllDir The runner's `lib/wine/x86_64-windows` folder
 */
export async function enableFrameGenerationInRunner(
  windowsDllDir: string
): Promise<FrameGenerationRunnerState> {
  const gdi32 = join(windowsDllDir, 'gdi32.dll')
  const inspected = await inspectGdi32(gdi32)
  if (inspected.state !== 'unpatched') return inspected.state

  const patched = addExports(
    inspected.data,
    Object.fromEntries(
      Object.entries(D3DKMT_FUNCTIONS).map(([name, code]) => [name, code()])
    )
  )
  const temporary = gdi32 + '.heroic-new'
  await writeFile(temporary, patched)
  await copyFile(gdi32, gdi32 + STOCK_SUFFIX)
  await rename(temporary, gdi32)
  return 'patched'
}

/**
 * Whether the runner's gdi32.dll reports hardware-accelerated GPU scheduling,
 * patched by {@link enableFrameGenerationInRunner} or on its own
 *
 * @param windowsDllDir The runner's `lib/wine/x86_64-windows` folder
 */
export async function runnerOffersFrameGeneration(
  windowsDllDir: string
): Promise<boolean> {
  const { state } = await inspectGdi32(join(windowsDllDir, 'gdi32.dll'))
  return state === 'ready' || state === 'native'
}

async function inspectGdi32(
  gdi32: string
): Promise<
  | { state: 'ready' | 'native' | 'unsupported' }
  | { state: 'unpatched'; data: Buffer }
> {
  if (!existsSync(gdi32)) return { state: 'unsupported' }

  const data = await readFile(gdi32)
  if (parsePE(data).sections.some(({ name }) => name === PATCH_SECTION)) {
    return { state: 'ready' }
  }
  const exported = new Set(readExports(data).map(({ name }) => name))
  const present = Object.keys(D3DKMT_FUNCTIONS).filter((name) =>
    exported.has(name)
  )
  if (present.length === Object.keys(D3DKMT_FUNCTIONS).length) {
    return { state: 'native' }
  }
  if (present.length) return { state: 'unsupported' }
  return { state: 'unpatched', data }
}
