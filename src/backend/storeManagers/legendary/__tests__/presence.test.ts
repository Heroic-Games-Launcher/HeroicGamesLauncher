import { parseRawEpicPresence } from '../presence'

describe('Epic presence', () => {
  test('parses an available friend', () => {
    const result = parseRawEpicPresence(
      'IN <presence from="account-id@prod.ol.epicgames.com/resource"><show>away</show><status>{&quot;Status&quot;:&quot;Fortnite - Battle Royale&quot;,&quot;bIsPlaying&quot;:true}</status></presence>'
    )

    expect(result).toEqual({
      accountId: 'account-id',
      presence: {
        presenceStatus: 'away'
      }
    })
  })

  test('parses unavailable friends even when the stanza has no status', () => {
    const result = parseRawEpicPresence(
      "IN <presence from='account-id@prod.ol.epicgames.com/resource' type='unavailable'/>"
    )

    expect(result).toEqual({
      accountId: 'account-id',
      presence: { presenceStatus: 'offline' }
    })
  })

  test('does not depend on activity payloads to mark friends online', () => {
    expect(
      parseRawEpicPresence(
        'IN <presence from="account-id@prod.ol.epicgames.com/resource"><status>not-json</status></presence>'
      )
    ).toEqual({
      accountId: 'account-id',
      presence: { presenceStatus: 'online' }
    })
  })
})
