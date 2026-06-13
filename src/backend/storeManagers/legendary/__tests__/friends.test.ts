import { normalizeEpicFriends } from '../friends'

describe('Epic friends', () => {
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
      'Zulu'
    ])
    expect(result.friends[1]).toMatchObject({
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
})
