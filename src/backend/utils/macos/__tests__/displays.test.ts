import {
  describeDisplayLimits,
  parseDisplays,
  type MacDisplay
} from '../displays'

const SCREEN_SHARING = {
  SPDisplaysDataType: [
    {
      _name: 'Apple M4 Max',
      spdisplays_mtlgpufamilysupport: 'spdisplays_metal4',
      spdisplays_ndrvs: [
        {
          _name: 'Screen Sharing Virtual Display',
          _spdisplays_pixels: '3840 x 2160',
          _spdisplays_resolution: '1920 x 1080 @ 60.00Hz',
          spdisplays_main: 'spdisplays_yes',
          spdisplays_online: 'spdisplays_yes'
        }
      ],
      spdisplays_vendor: 'sppci_vendor_Apple',
      sppci_cores: '32',
      sppci_model: 'Apple M4 Max'
    }
  ]
}

const physical = (overrides: Partial<MacDisplay>): MacDisplay => ({
  name: 'Studio Display',
  pixelWidth: 5120,
  pixelHeight: 2880,
  pointWidth: 2560,
  pointHeight: 1440,
  refreshRate: 60,
  isMain: true,
  isVirtual: false,
  ...overrides
})

describe('parseDisplays', () => {
  test('reads pixels, points and refresh rate', () => {
    expect(parseDisplays(SCREEN_SHARING)).toEqual([
      {
        name: 'Screen Sharing Virtual Display',
        pixelWidth: 3840,
        pixelHeight: 2160,
        pointWidth: 1920,
        pointHeight: 1080,
        refreshRate: 60,
        isMain: true,
        isVirtual: true
      }
    ])
  })

  test('tolerates unexpected output', () => {
    expect(parseDisplays(undefined)).toEqual([])
    expect(parseDisplays({ SPDisplaysDataType: [{ _name: 'GPU' }] })).toEqual(
      []
    )
  })
})

describe('describeDisplayLimits', () => {
  test('warns when only a virtual display is attached', () => {
    const lines = describeDisplayLimits(parseDisplays(SCREEN_SHARING), false)
    expect(lines[lines.length - 1]).toMatch(/capped at its 60 Hz/)
  })

  test('explains refresh rate and Retina scaling of physical displays', () => {
    const lines = describeDisplayLimits([physical({})], false)
    expect(lines).toContainEqual(
      expect.stringMatching(/cannot present more than 60 FPS/)
    )
    expect(lines).toContainEqual(
      expect.stringMatching(
        /renders at most 2560x1440 and macOS scales it to 5120x2880/
      )
    )
    expect(describeDisplayLimits([physical({})], true)).toContainEqual(
      expect.stringMatching(/renders up to 5120x2880, 4x the pixels/)
    )
  })

  test('has no warnings for a fast non-scaled display', () => {
    const display = physical({
      pixelWidth: 5120,
      pixelHeight: 1440,
      pointWidth: 5120,
      pointHeight: 1440,
      refreshRate: 240
    })
    expect(describeDisplayLimits([display], false)).toEqual([
      'Display: Studio Display: 5120x1440 @ 240 Hz'
    ])
  })
})
