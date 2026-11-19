import type { GOGClientsResponse } from 'common/types/gog'
import { clientIdFromManifest, parseGOGCloudStorage } from '../save_locations'

const response = {
  content: {
    Windows: {
      overlay: { supported: true },
      cloudStorage: {
        enabled: true,
        locations: [{ name: 'main', location: '<?INSTALL?>/Saves' }]
      }
    },
    MacOS: {
      overlay: { supported: false },
      cloudStorage: { enabled: false, locations: [] }
    },
    cloudStorage: { quota: 0 },
    bases: []
  }
} as unknown as GOGClientsResponse

describe('parseGOGCloudStorage', () => {
  test('reads the locations for the given platform', () => {
    expect(parseGOGCloudStorage(response, 'Windows')).toEqual({
      enabled: true,
      locations: [{ name: 'main', location: '<?INSTALL?>/Saves' }]
    })
    expect(parseGOGCloudStorage(response, 'MacOS')).toEqual({
      enabled: false,
      locations: []
    })
  })

  test('returns undefined for malformed responses', () => {
    expect(parseGOGCloudStorage(undefined, 'Windows')).toBeUndefined()
    expect(
      parseGOGCloudStorage({ content: {} } as GOGClientsResponse, 'Windows')
    ).toBeUndefined()
  })
})

describe('parseGOGCloudStorage (Spec Ops: The Line)', () => {
  test('keeps the documents based save location', () => {
    const specOps = {
      content: {
        Windows: {
          overlay: { supported: true },
          cloudStorage: {
            enabled: true,
            locations: [
              {
                name: 'saves',
                location:
                  '<?DOCUMENTS?>/My Games/SpecOps-TheLine/SRGame/SaveData'
              }
            ]
          }
        },
        MacOS: {
          overlay: { supported: false },
          cloudStorage: { enabled: false, locations: [] }
        },
        cloudStorage: { quota: 0 },
        bases: []
      }
    } as unknown as GOGClientsResponse

    expect(parseGOGCloudStorage(specOps, 'Windows')).toEqual({
      enabled: true,
      locations: [
        {
          name: 'saves',
          location: '<?DOCUMENTS?>/My Games/SpecOps-TheLine/SRGame/SaveData'
        }
      ]
    })
  })
})

describe('clientIdFromManifest', () => {
  test('only accepts gogdl v2 manifests', () => {
    expect(clientIdFromManifest({ version: 2, clientId: 'abc' })).toBe('abc')
    expect(
      clientIdFromManifest({ version: 1, clientId: 'abc' })
    ).toBeUndefined()
    expect(clientIdFromManifest({ version: 2 })).toBeUndefined()
  })
})
