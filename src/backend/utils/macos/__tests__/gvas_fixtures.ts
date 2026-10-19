/**
 * Builds Unreal Engine save games byte by byte, independently of the
 * serializer under test, in the layout Unreal Engine 5.3 writes
 */

export function int32(value: number): Buffer {
  const buffer = Buffer.alloc(4)
  buffer.writeInt32LE(value, 0)
  return buffer
}

export function str(value: string): Buffer {
  return Buffer.concat([
    int32(value.length + 1),
    Buffer.from(`${value}\0`, 'latin1')
  ])
}

export function header(saveClass: string, ue5Version = 1009): Buffer {
  return Buffer.concat([
    Buffer.from('GVAS', 'latin1'),
    int32(3), // save game version
    int32(522), // UE4 package version
    int32(ue5Version),
    Buffer.from([5, 0, 3, 0, 2, 0, 0, 0, 0, 0]), // 5.3.2, changelist 0
    str('UE5'),
    int32(3), // custom version format
    int32(1),
    Buffer.alloc(16, 7),
    int32(1),
    str(saveClass)
  ])
}

function tag(
  name: string,
  type: string,
  data: Buffer,
  extra = Buffer.alloc(0)
) {
  return Buffer.concat([
    str(name),
    str(type),
    int32(data.length),
    int32(0),
    extra,
    Buffer.from([0]),
    data
  ])
}

export const nameProp = (name: string, value: string) =>
  tag(name, 'NameProperty', str(value))

const intProp = (name: string, value: number) =>
  tag(name, 'IntProperty', int32(value))

const boolProp = (name: string, value: boolean) =>
  Buffer.concat([
    str(name),
    str('BoolProperty'),
    int32(0),
    int32(0),
    Buffer.from([value ? 1 : 0, 0])
  ])

const structTag = (structName: string) =>
  Buffer.concat([str(structName), Buffer.alloc(16)])

const structProp = (name: string, structName: string, fields: Buffer[]) =>
  tag(
    name,
    'StructProperty',
    Buffer.concat([...fields, str('None')]),
    structTag(structName)
  )

/** A struct Unreal serializes natively, like `IntPoint` */
const nativeStructProp = (name: string, structName: string, data: Buffer) =>
  tag(name, 'StructProperty', data, structTag(structName))

const structMapProp = (name: string, entries: Array<[string, Buffer[]]>) =>
  tag(
    name,
    'MapProperty',
    Buffer.concat([
      int32(0),
      int32(entries.length),
      ...entries.flatMap(([key, fields]) => [
        str(key),
        Buffer.concat([...fields, str('None')])
      ])
    ]),
    Buffer.concat([str('NameProperty'), str('StructProperty')])
  )

export const save = (saveClass: string, properties: Buffer[]) =>
  Buffer.concat([header(saveClass), ...properties, str('None'), int32(0)])

export const GRAPHICS_CLASS = '/Script/NTUI.NTVMGraphicsSettingsSaveModel'
export const SYSTEM_CLASS = '/Script/NTUI.NTVMSystemSettingsSaveModel'

const upscaler = (id: string, mode: string, frameGeneration: string) => [
  nameProp('UpscalerId', id),
  nameProp('QualityModeId', mode),
  nameProp('FrameGenerationId', frameGeneration),
  boolProp('IsAutoSharpness', true),
  tag('Sharpness', 'FloatProperty', Buffer.alloc(4))
]

/** What Hellblade II saves after picking the Low preset on its first launch */
export function hellblade2LowGraphics({ dlss = true } = {}): Buffer {
  const upscalers: Array<[string, Buffer[]]> = [
    ['TSR', upscaler('TSR', 'None', 'Off')],
    ['FSR3', upscaler('FSR3', 'Quality', 'None')]
  ]
  if (dlss) upscalers.push(['DLSS', upscaler('DLSS', 'Auto', 'None')])
  return save(GRAPHICS_CLASS, [
    structProp('Gamma', 'NTVMFloatValue', [intProp('Version', 2)]),
    boolProp('IsVSyncEnabled', false),
    structProp('GlobalQualityPreset', 'NTGlobalQualityPreset', [
      nameProp('ShadowQuality', 'Low'),
      nameProp('GlobalIlluminationQuality', 'Low'),
      nameProp('ReflectionQuality', 'Low'),
      nameProp('TextureQuality', 'Low'),
      nameProp('PostProcessingQuality', 'Low'),
      nameProp('FoliageDetail', 'Low'),
      nameProp('ViewDistance', 'Low'),
      nameProp('VolumetricFog', 'Low'),
      nameProp('AntiAliasingQuality', 'Low'),
      nameProp('EffectsQuality', 'Standard')
    ]),
    nameProp('ReflexId', 'Enabled'),
    structMapProp('UpscalerSettings', upscalers),
    intProp('DataVersion', 2)
  ])
}

export function hellblade2SystemSettings(
  firstLaunchDone: boolean,
  [width, height] = [1920, 1080]
): Buffer {
  const target = Buffer.concat([int32(width), int32(height)])
  return save(SYSTEM_CLASS, [
    ...(firstLaunchDone ? [boolProp('bFirstLaunch', false)] : []),
    nativeStructProp('TargetRes', 'IntPoint', target)
  ])
}
