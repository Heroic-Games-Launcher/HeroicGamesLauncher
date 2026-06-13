import axios from 'axios'
import { readFileSync } from 'graceful-fs'
import type { EpicFriend } from 'common/types/epic_friends'
import {
  compareEpicFriends,
  getEpicFriendDetails,
  lookupDisplayName,
  lookupDisplayNames,
  normalizeEpicFriends
} from '../friends'

jest.mock('axios')
jest.mock('graceful-fs')
const mockedAxios = axios as jest.Mocked<typeof axios>
const mockedReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>

describe('Epic friends', () => {
  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  test('normalizes and sorts friends into their respective lists', () => {
    const result = normalizeEpicFriends(
      {
        friends: [
          {
            accountId: 'second-account',
            alias: 'Fallback alias',
            mutual: 4,
            favorite: true,
            created: '2026-01-01'
          },
          { accountId: 'first-account' }
        ],
        incoming: [{ accountId: 'incoming-account' }],
        outgoing: [{ accountId: 'outgoing-account' }]
      },
      new Map([
        ['first-account', 'Alpha'],
        ['second-account', 'Zulu']
      ])
    )

    expect(result.friends.map(({ displayName }) => displayName)).toEqual([
      'Alpha',
      'Fallback alias'
    ])
    expect(result.friends[1]).toMatchObject({
      displayName: 'Fallback alias',
      epicDisplayName: 'Zulu',
      status: 'accepted',
      mutual: 4,
      favorite: true
    })
    expect(result.incoming[0].status).toBe('incoming')
    expect(result.outgoing[0].status).toBe('outgoing')
  })

  test('uses aliases and abbreviated account IDs when names are unavailable', () => {
    const result = normalizeEpicFriends(
      {
        friends: [
          { accountId: '1234567890abcdef', alias: 'My alias' },
          { accountId: 'abcdef1234567890' }
        ],
        incoming: [],
        outgoing: []
      },
      new Map()
    )

    expect(result.friends.map(({ displayName }) => displayName)).toEqual([
      'Epic user abcdef12',
      'My alias'
    ])
  })

  test('sorts online friends above offline friends', () => {
    const friend = (
      displayName: string,
      presenceStatus: EpicFriend['presenceStatus']
    ): EpicFriend => ({
      accountId: displayName,
      displayName,
      epicDisplayName: displayName,
      alias: '',
      status: 'accepted',
      presenceStatus,
      mutual: 0,
      favorite: false,
      created: ''
    })
    const friends = [
      friend('Offline', 'offline'),
      friend('Unavailable', 'unknown'),
      friend('Online', 'online'),
      friend('Away', 'away')
    ]

    expect(friends.sort(compareEpicFriends).map(({ displayName }) => displayName))
      .toEqual(['Online', 'Away', 'Offline', 'Unavailable'])
  })

  test('retries display-name lookups when Epic throttles the request', async () => {
    jest.useFakeTimers()
    mockedAxios.isAxiosError.mockReturnValue(true)
    mockedAxios.get
      .mockRejectedValueOnce({
        response: {
          status: 429,
          headers: { 'retry-after': '1' },
          data: {}
        }
      })
      .mockResolvedValueOnce({
        data: { id: 'account-id', displayName: 'Friend name' }
      })

    const result = lookupDisplayName('account-id', {
      Authorization: 'Bearer test'
    })
    await jest.runAllTimersAsync()

    await expect(result).resolves.toBe('Friend name')
    expect(mockedAxios.get.mock.calls).toHaveLength(2)
  })

  test('returns an empty cacheable name when Epic has no public name', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { id: 'account-id' }
    })

    await expect(
      lookupDisplayName('account-id', { Authorization: 'Bearer test' })
    ).resolves.toBe('')
  })

  test('resolves multiple display names in one request', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        { id: 'first-account', displayName: 'First' },
        { id: 'second-account', displayName: 'Second' }
      ]
    })

    await expect(
      lookupDisplayNames(['first-account', 'second-account'], {
        Authorization: 'Bearer test'
      })
    ).resolves.toHaveLength(2)
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining(
        'accountId=first-account&accountId=second-account'
      ),
      { headers: { Authorization: 'Bearer test' } }
    )
  })

  test('loads linked platform accounts from the external auths endpoint', async () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        access_token: 'test-token',
        account_id: 'own-account'
      })
    )
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { id: 'friend-account', displayName: 'Epic friend' }
      })
      .mockResolvedValueOnce({
        data: [
          {
            type: 'xbl',
            externalDisplayName: 'Xbox friend'
          }
        ]
      })

    await expect(getEpicFriendDetails('friend-account')).resolves.toEqual({
      connections: [
        { type: 'epic', displayName: 'Epic friend' },
        { type: 'xbl', displayName: 'Xbox friend' }
      ]
    })
    expect(mockedAxios.get).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/friend-account/externalAuths'),
      { headers: { Authorization: 'Bearer test-token' } }
    )
  })
})
