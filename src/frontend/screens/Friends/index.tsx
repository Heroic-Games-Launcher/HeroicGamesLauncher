import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { IconButton, Tab, Tabs, TextField, Tooltip } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useTranslation } from 'react-i18next'

import type {
  EpicFriend,
  EpicFriendsList,
  EpicFriendStatus
} from 'common/types/epic_friends'
import { UpdateComponent } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'

const emptyFriends: EpicFriendsList = {
  friends: [],
  incoming: [],
  outgoing: []
}

export default function Friends() {
  const { t } = useTranslation()
  const { epic } = useContext(ContextProvider)
  const [friends, setFriends] = useState(emptyFriends)
  const [selectedTab, setSelectedTab] = useState<EpicFriendStatus>('accepted')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const loadFriends = useCallback(async () => {
    if (!epic.username) return

    setLoading(true)
    setError(false)
    try {
      setFriends(await window.api.getEpicFriends())
    } catch (loadError) {
      window.api.logError(String(loadError))
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [epic.username])

  useEffect(() => {
    void loadFriends()
  }, [loadFriends])

  const selectedFriends = useMemo(() => {
    const list =
      selectedTab === 'accepted'
        ? friends.friends
        : selectedTab === 'incoming'
          ? friends.incoming
          : friends.outgoing
    const query = search.trim().toLocaleLowerCase()
    return query
      ? list.filter(({ displayName }) =>
          displayName.toLocaleLowerCase().includes(query)
        )
      : list
  }, [friends, search, selectedTab])

  if (!epic.username) {
    return (
      <div className="friendsScreen friendsScreen--message">
        {t(
          'friends.loginRequired',
          'Log in to Epic Games to view your friends.'
        )}
      </div>
    )
  }

  return (
    <div className="friendsScreen">
      <header className="friendsScreen__header">
        <div>
          <h2>{t('friends.title', 'Epic Friends')}</h2>
          <p>{epic.username}</p>
        </div>
        <Tooltip title={t('friends.refresh', 'Refresh friends')}>
          <span>
            <IconButton
              aria-label={t('friends.refresh', 'Refresh friends')}
              disabled={loading}
              onClick={() => void loadFriends()}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </header>

      <div className="friendsScreen__controls">
        <Tabs
          value={selectedTab}
          onChange={(_event, value: EpicFriendStatus) => setSelectedTab(value)}
          variant="scrollable"
        >
          <Tab
            value="accepted"
            label={t('friends.tabs.friends', 'Friends ({{count}})', {
              count: friends.friends.length
            })}
          />
          <Tab
            value="incoming"
            label={t('friends.tabs.incoming', 'Incoming ({{count}})', {
              count: friends.incoming.length
            })}
          />
          <Tab
            value="outgoing"
            label={t('friends.tabs.outgoing', 'Sent ({{count}})', {
              count: friends.outgoing.length
            })}
          />
        </Tabs>
        <TextField
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('friends.search', 'Search friends')}
          inputProps={{ 'aria-label': t('friends.search', 'Search friends') }}
        />
      </div>

      {loading && friends === emptyFriends && (
        <UpdateComponent
          message={t('friends.loading', 'Loading Epic friends...')}
        />
      )}

      {!loading && error && (
        <p className="friendsScreen__message">
          {t(
            'friends.error',
            'Could not load Epic friends. Try refreshing the list.'
          )}
        </p>
      )}

      {!error && !loading && selectedFriends.length === 0 && (
        <p className="friendsScreen__message">
          {search
            ? t('friends.noMatches', 'No friends match your search.')
            : t('friends.empty', 'There is nobody in this list.')}
        </p>
      )}

      {!error && selectedFriends.length > 0 && (
        <div className="friendsScreen__list">
          {selectedFriends.map((friend) => (
            <FriendRow key={friend.accountId} friend={friend} />
          ))}
        </div>
      )}
    </div>
  )
}

function FriendRow({ friend }: { friend: EpicFriend }) {
  const { t } = useTranslation()
  const initial = friend.displayName.charAt(0).toLocaleUpperCase()
  const detail =
    friend.status === 'accepted'
      ? t('friends.mutual', '{{count}} mutual friends', {
          count: friend.mutual
        })
      : friend.status === 'incoming'
        ? t('friends.incomingRequest', 'Incoming request')
        : t('friends.sentRequest', 'Sent request')

  return (
    <div className="friendsScreen__friend">
      <div className="friendsScreen__avatar" aria-hidden="true">
        {initial}
      </div>
      <div className="friendsScreen__friendText">
        <strong>{friend.displayName}</strong>
        <span>{detail}</span>
      </div>
    </div>
  )
}
