import { AppSettings } from 'common/types'
import { shouldUpdateDxvkTools } from '../utils/config_helper'

const settings = (
  autoInstallDxvk: boolean,
  autoInstallVkd3d: boolean,
  autoInstallDxvkNvapi: boolean
): AppSettings =>
  ({
    autoInstallDxvk,
    autoInstallVkd3d,
    autoInstallDxvkNvapi
  }) as AppSettings

describe('shouldUpdateDxvkTools', () => {
  it.each([
    {
      autoInstallDxvk: false,
      autoInstallVkd3d: false,
      autoInstallDxvkNvapi: false,
      expected: false
    },
    {
      autoInstallDxvk: true,
      autoInstallVkd3d: false,
      autoInstallDxvkNvapi: false,
      expected: true
    },
    {
      autoInstallDxvk: false,
      autoInstallVkd3d: true,
      autoInstallDxvkNvapi: false,
      expected: true
    },
    {
      autoInstallDxvk: false,
      autoInstallVkd3d: false,
      autoInstallDxvkNvapi: true,
      expected: true
    },
    {
      autoInstallDxvk: true,
      autoInstallVkd3d: true,
      autoInstallDxvkNvapi: false,
      expected: true
    },
    {
      autoInstallDxvk: true,
      autoInstallVkd3d: false,
      autoInstallDxvkNvapi: true,
      expected: true
    },
    {
      autoInstallDxvk: false,
      autoInstallVkd3d: true,
      autoInstallDxvkNvapi: true,
      expected: true
    },
    {
      autoInstallDxvk: true,
      autoInstallVkd3d: true,
      autoInstallDxvkNvapi: true,
      expected: true
    }
  ])(
    'returns $expected when dxvk=$autoInstallDxvk, vkd3d=$autoInstallVkd3d and nvapi=$autoInstallDxvkNvapi',
    ({ autoInstallDxvk, autoInstallVkd3d, autoInstallDxvkNvapi, expected }) => {
      expect(
        shouldUpdateDxvkTools(
          settings(autoInstallDxvk, autoInstallVkd3d, autoInstallDxvkNvapi)
        )
      ).toBe(expected)
    }
  )

  it('returns false when the flags are missing', () => {
    expect(shouldUpdateDxvkTools({} as AppSettings)).toBe(false)
  })
})
