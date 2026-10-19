import {
  findProperty,
  mapEntry,
  parseGvas,
  serializeGvas,
  structFields
} from '../gvas'
import {
  GRAPHICS_CLASS,
  header,
  hellblade2LowGraphics,
  hellblade2SystemSettings,
  int32,
  nameProp,
  save,
  str
} from './gvas_fixtures'

describe('GVAS save games', () => {
  test('reads the save class and nested properties', () => {
    const file = parseGvas(hellblade2LowGraphics())

    expect(file.saveClass).toBe(GRAPHICS_CLASS)
    expect(file.properties.map(({ name }) => name)).toEqual([
      'Gamma',
      'IsVSyncEnabled',
      'GlobalQualityPreset',
      'ReflexId',
      'UpscalerSettings',
      'DataVersion'
    ])
    expect(findProperty(file.properties, 'IsVSyncEnabled')?.value).toEqual({
      kind: 'bool',
      value: false
    })
    const preset = structFields(
      findProperty(file.properties, 'GlobalQualityPreset')?.value
    )
    expect(findProperty(preset ?? [], 'EffectsQuality')?.value).toEqual({
      kind: 'string',
      value: 'Standard'
    })
    const dlss = structFields(
      mapEntry(findProperty(file.properties, 'UpscalerSettings'), 'DLSS')
    )
    expect(findProperty(dlss ?? [], 'QualityModeId')?.value).toEqual({
      kind: 'string',
      value: 'Auto'
    })
  })

  test('writes an unmodified save back byte for byte', () => {
    for (const data of [
      hellblade2LowGraphics(),
      hellblade2SystemSettings(true),
      hellblade2SystemSettings(false)
    ]) {
      expect(serializeGvas(parseGvas(data)).equals(data)).toBe(true)
    }
  })

  test('keeps natively serialized structs as raw bytes', () => {
    const file = parseGvas(hellblade2SystemSettings(true))
    expect(findProperty(file.properties, 'TargetRes')?.value).toEqual({
      kind: 'raw',
      data: Buffer.concat([int32(1920), int32(1080)])
    })
  })

  test('recomputes property sizes after an edit', () => {
    const file = parseGvas(hellblade2LowGraphics())
    const preset = structFields(
      findProperty(file.properties, 'GlobalQualityPreset')?.value
    )
    const shadows = findProperty(preset ?? [], 'ShadowQuality')
    if (shadows) shadows.value = { kind: 'string', value: 'MuchLongerValue' }

    const reread = parseGvas(serializeGvas(file))
    const rereadPreset = structFields(
      findProperty(reread.properties, 'GlobalQualityPreset')?.value
    )
    expect(findProperty(rereadPreset ?? [], 'ShadowQuality')?.value).toEqual({
      kind: 'string',
      value: 'MuchLongerValue'
    })
    expect(findProperty(reread.properties, 'DataVersion')?.value).toEqual({
      kind: 'raw',
      data: int32(2)
    })
  })

  test('reads UTF-16 strings', () => {
    const utf16 = Buffer.concat([int32(-3), Buffer.from('Ül\0', 'utf16le')])
    const data = Buffer.concat([
      header(GRAPHICS_CLASS),
      str('Name'),
      str('StrProperty'),
      int32(utf16.length),
      int32(0),
      Buffer.from([0]),
      utf16,
      str('None'),
      int32(0)
    ])
    const file = parseGvas(data)
    expect(file.properties[0].value).toEqual({ kind: 'string', value: 'Ül' })
    expect(serializeGvas(file).equals(data)).toBe(true)
  })

  test('rejects files that are not supported save games', () => {
    expect(() => parseGvas(Buffer.from('not a save'))).toThrow(
      'Not an Unreal Engine save game'
    )
    const unreal54 = Buffer.concat([
      header(GRAPHICS_CLASS, 1012),
      nameProp('A', 'B'),
      str('None')
    ])
    expect(() => parseGvas(unreal54)).toThrow('5.4 or newer')
    const truncated = save(GRAPHICS_CLASS, [nameProp('A', 'B')]).subarray(
      0,
      -12
    )
    expect(() => parseGvas(truncated)).toThrow('Unexpected end')
  })
})
