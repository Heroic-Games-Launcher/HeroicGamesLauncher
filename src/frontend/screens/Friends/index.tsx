import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Tooltip
} from '@mui/material'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PersonIcon from '@mui/icons-material/Person'
import PeopleIcon from '@mui/icons-material/People'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useTranslation } from 'react-i18next'

import type {
  EpicFriend,
  EpicFriendAction,
  EpicFriendDetails,
  EpicFriendSearchResult,
  EpicFriendsList,
  EpicFriendStatus
} from 'common/types/epic_friends'
import { UpdateComponent } from 'frontend/components/UI'
import {
  getCachedEpicFriends,
  loadEpicFriends,
  subscribeToEpicFriends
} from 'frontend/helpers/epicFriends'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'

const emptyFriends: EpicFriendsList = {
  friends: [],
  incoming: [],
  outgoing: [],
  resolvingNames: false,
  watchingPresence: false
}

type SocialMode = 'profile' | 'friends' | 'add'

function avatarGradientIndex(value: string) {
  let hash = 0
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }
  return hash % 9
}

function avatarGradient(value: string) {
  return `friendsScreen__avatar--gradient-${avatarGradientIndex(value)}`
}

function compareByAvatarGradient(first: EpicFriend, second: EpicFriend) {
  return (
    avatarGradientIndex(first.accountId) -
      avatarGradientIndex(second.accountId) ||
    first.displayName.localeCompare(second.displayName)
  )
}

export default function Friends({ panel = false }: { panel?: boolean }) {
  const { t } = useTranslation()
  const { epic } = useContext(ContextProvider)
  const [friends, setFriends] = useState(
    () => getCachedEpicFriends(epic.username) ?? emptyFriends
  )
  const [selectedTab, setSelectedTab] = useState<EpicFriendStatus>('accepted')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [showUnnamedFriends, setShowUnnamedFriends] = useState(false)
  const [showHiddenIdFriends, setShowHiddenIdFriends] = useState(false)
  const [showGeneratedUserFriends, setShowGeneratedUserFriends] =
    useState(false)
  const [selectedFriend, setSelectedFriend] = useState<EpicFriend>()
  const [selectedFriendAnchorY, setSelectedFriendAnchorY] = useState(0)
  const [socialMode, setSocialMode] = useState<SocialMode>('friends')
  const [expandedSocialSections, setExpandedSocialSections] = useState({
    online: true,
    away: true,
    offline: false,
    hidden: false
  })
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<EpicFriendSearchResult[]>(
    []
  )
  const [searchingUsers, setSearchingUsers] = useState(false)
  const openFriend = useCallback((friend: EpicFriend, anchorY: number) => {
    setSelectedFriend(friend)
    setSelectedFriendAnchorY(anchorY)
  }, [])

  const loadFriends = useCallback(async (forceRefresh = false) => {
    if (!epic.username) return

    setLoading(!getCachedEpicFriends(epic.username))
    setError(false)
    try {
      setFriends(await loadEpicFriends(epic.username, forceRefresh))
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

  useEffect(
    () =>
      subscribeToEpicFriends((username, updatedFriends) => {
        if (username === epic.username) setFriends(updatedFriends)
      }),
    [epic.username]
  )

  useEffect(() => {
    if (!panel || socialMode !== 'add' || userSearch.trim().length < 3) {
      setSearchResults([])
      setSearchingUsers(false)
      return
    }

    setSearchingUsers(true)
    const timeout = window.setTimeout(() => {
      void window.api
        .searchEpicUsers(userSearch)
        .then(setSearchResults)
        .catch((searchError) => window.api.logError(String(searchError)))
        .finally(() => setSearchingUsers(false))
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [panel, socialMode, userSearch])

  const selectedFriends = useMemo(() => {
    const list =
      panel
        ? friends.friends
        : selectedTab === 'accepted'
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
  }, [friends, panel, search, selectedTab])
  const [namedFriends, unnamedFriends, hiddenIdFriends, generatedUserFriends] =
    useMemo(() => {
      if (selectedTab !== 'accepted') return [selectedFriends, [], [], []]

      return selectedFriends.reduce<
        [EpicFriend[], EpicFriend[], EpicFriend[], EpicFriend[]]
      >(
        ([named, unnamed, hiddenIds, generatedUsers], friend) => {
          if (friend.displayName.startsWith('Epic user ')) unnamed.push(friend)
          else if (/^HiddenID[A-Z0-9]+$/.test(friend.displayName))
            hiddenIds.push(friend)
          else if (/^User-[A-Za-z0-9]+$/.test(friend.displayName))
            generatedUsers.push(friend)
          else named.push(friend)
          return [named, unnamed, hiddenIds, generatedUsers]
        },
        [[], [], [], []]
      )
    }, [selectedFriends, selectedTab])
  const unnamedFriendsExpanded = showUnnamedFriends || Boolean(search.trim())
  const hiddenIdFriendsExpanded = showHiddenIdFriends || Boolean(search.trim())
  const generatedUserFriendsExpanded =
    showGeneratedUserFriends || Boolean(search.trim())
  const hiddenFriends = [
    ...unnamedFriends,
    ...hiddenIdFriends,
    ...generatedUserFriends
  ]
  const socialFriends = {
    online: namedFriends.filter(({ presenceStatus }) => presenceStatus === 'online'),
    away: namedFriends.filter(({ presenceStatus }) => presenceStatus === 'away'),
    offline: namedFriends.filter(
      ({ presenceStatus }) =>
        presenceStatus === 'offline' || presenceStatus === 'unknown'
    ),
    hidden: hiddenFriends
  }
  const searchActive = Boolean(search.trim())

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
    <div
      className={`friendsScreen ${panel ? 'friendsScreen--panel' : ''}`}
      onClick={(event) => event.stopPropagation()}
    >
      {panel && (
        <nav className="friendsScreen__socialNav">
          <Tooltip title={t('friends.profile', 'Profile')}>
            <IconButton
              className={socialMode === 'profile' ? 'active' : ''}
              onClick={() => setSocialMode('profile')}
            >
              <PersonIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('friends.sidebar', 'Epic Friends')}>
            <IconButton
              className={socialMode === 'friends' ? 'active' : ''}
              onClick={() => setSocialMode('friends')}
            >
              <PeopleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('friends.add', 'Add Friends')}>
            <IconButton
              className={socialMode === 'add' ? 'active' : ''}
              onClick={() => setSocialMode('add')}
            >
              <PersonAddIcon />
              {friends.incoming.length > 0 && (
                <span className="friendsScreen__requestCount">
                  {friends.incoming.length}
                </span>
              )}
            </IconButton>
          </Tooltip>
        </nav>
      )}
      <header className="friendsScreen__header">
        <div>
          <h2>
            {panel
              ? socialMode === 'profile'
                ? t('friends.profile', 'Profile')
                : socialMode === 'add'
                  ? t('friends.add', 'Add Friends')
                  : t('friends.social', 'Social')
              : t('friends.title', 'Epic Friends')}
          </h2>
          {!panel && (
            <p>
              {t('friends.loggedInAs', 'Logged in as: {{username}}', {
                username: epic.username
              })}
            </p>
          )}
        </div>
        {!panel && (
          <div className="friendsScreen__headerActions">
            <Tooltip title={t('friends.refresh', 'Refresh friends')}>
            <IconButton
                aria-label={t('friends.refresh', 'Refresh friends')}
                disabled={loading}
                onClick={() => void loadFriends(true)}
            >
                <RefreshIcon />
            </IconButton>
            </Tooltip>
          </div>
        )}
      </header>

      {panel && socialMode === 'profile' && (
        <section className="friendsScreen__profile">
          <div
            className={`friendsScreen__profileAvatar ${avatarGradient(epic.username)}`}
          >
            {epic.username.charAt(0).toLocaleUpperCase()}
          </div>
          <strong>{epic.username}</strong>
          <span>
            {t('friends.loggedInAs', 'Logged in as: {{username}}', {
              username: epic.username
            })}
          </span>
        </section>
      )}

      {panel && socialMode === 'add' && (
        <AddFriends
          incoming={friends.incoming}
          outgoing={friends.outgoing}
          query={userSearch}
          results={searchResults}
          searching={searchingUsers}
          onQueryChange={setUserSearch}
          onChanged={() => void loadFriends(true)}
        />
      )}

      {(!panel || socialMode === 'friends') && (
      <div className="friendsScreen__controls">
        {!panel && (
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
        )}
        <TextField
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('friends.search', 'Search friends')}
          inputProps={{ 'aria-label': t('friends.search', 'Search friends') }}
        />
      </div>
      )}

      {socialMode !== 'profile' && loading && friends === emptyFriends && (
        <UpdateComponent
          message={t('friends.loading', 'Loading Epic friends...')}
        />
      )}

      {socialMode !== 'profile' && !loading && error && (
        <p className="friendsScreen__message">
          {t(
            'friends.error',
            'Could not load Epic friends. Try refreshing the list.'
          )}
        </p>
      )}

      {(!panel || socialMode === 'friends') &&
        !error &&
        !loading &&
        selectedFriends.length === 0 && (
        <p className="friendsScreen__message">
          {search
            ? t('friends.noMatches', 'No friends match your search.')
            : t('friends.empty', 'There is nobody in this list.')}
        </p>
        )}

      {(!panel || socialMode === 'friends') &&
        !error &&
        selectedFriends.length > 0 && (
        panel ? (
          <div className="friendsScreen__socialSections">
            {(
              [
                ['online', t('friends.presence.online', 'Online')],
                ['away', t('friends.presence.away', 'Away')],
                ['offline', t('friends.presence.offline', 'Offline')],
                ['hidden', t('friends.hidden', 'Hidden')]
              ] as const
            ).map(([section, label]) => (
              <SocialFriendSection
                key={section}
                label={label}
                friends={socialFriends[section]}
                expanded={searchActive || expandedSocialSections[section]}
                onToggle={() =>
                  setExpandedSocialSections((current) => ({
                    ...current,
                    [section]: !current[section]
                  }))
                }
                onOpen={openFriend}
              />
            ))}
          </div>
        ) : (
        <>
          {namedFriends.length > 0 && (
            <div className="friendsScreen__list">
              {namedFriends.map((friend) => (
                <FriendRow
                  key={friend.accountId}
                  friend={friend}
                  onOpen={openFriend}
                />
              ))}
            </div>
          )}
          {selectedTab === 'accepted' && unnamedFriends.length > 0 && (
            <section className="friendsScreen__unnamed">
              <button
                type="button"
                className="friendsScreen__unnamedToggle"
                aria-expanded={unnamedFriendsExpanded}
                onClick={() => setShowUnnamedFriends((expanded) => !expanded)}
              >
                <span>
                  {t(
                    'friends.unnamed',
                    'Unnamed Epic accounts ({{count}})',
                    { count: unnamedFriends.length }
                  )}
                </span>
                {unnamedFriendsExpanded ? (
                  <ExpandLessIcon />
                ) : (
                  <ExpandMoreIcon />
                )}
              </button>
              {unnamedFriendsExpanded && (
                <div className="friendsScreen__list">
                  {unnamedFriends.map((friend) => (
                    <FriendRow
                      key={friend.accountId}
                      friend={friend}
                      onOpen={openFriend}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
          {selectedTab === 'accepted' && hiddenIdFriends.length > 0 && (
            <section className="friendsScreen__unnamed">
              <button
                type="button"
                className="friendsScreen__unnamedToggle"
                aria-expanded={hiddenIdFriendsExpanded}
                onClick={() => setShowHiddenIdFriends((expanded) => !expanded)}
              >
                <span>
                  {t(
                    'friends.hiddenIds',
                    'Hidden Epic accounts ({{count}})',
                    { count: hiddenIdFriends.length }
                  )}
                </span>
                {hiddenIdFriendsExpanded ? (
                  <ExpandLessIcon />
                ) : (
                  <ExpandMoreIcon />
                )}
              </button>
              {hiddenIdFriendsExpanded && (
                <div className="friendsScreen__list">
                  {hiddenIdFriends.map((friend) => (
                    <FriendRow
                      key={friend.accountId}
                      friend={friend}
                      onOpen={openFriend}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
          {selectedTab === 'accepted' && generatedUserFriends.length > 0 && (
            <section className="friendsScreen__unnamed">
              <button
                type="button"
                className="friendsScreen__unnamedToggle"
                aria-expanded={generatedUserFriendsExpanded}
                onClick={() =>
                  setShowGeneratedUserFriends((expanded) => !expanded)
                }
              >
                <span>
                  {t(
                    'friends.generatedUsers',
                    'Generated Epic accounts ({{count}})',
                    { count: generatedUserFriends.length }
                  )}
                </span>
                {generatedUserFriendsExpanded ? (
                  <ExpandLessIcon />
                ) : (
                  <ExpandMoreIcon />
                )}
              </button>
              {generatedUserFriendsExpanded && (
                <div className="friendsScreen__list">
                  {generatedUserFriends.map((friend) => (
                    <FriendRow
                      key={friend.accountId}
                      friend={friend}
                      onOpen={openFriend}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
        )
        )}
      <FriendDetailsDialog
        friend={selectedFriend}
        anchorY={selectedFriendAnchorY}
        onClose={() => setSelectedFriend(undefined)}
        onChanged={() => void loadFriends(true)}
      />
    </div>
  )
}

function SocialFriendSection({
  label,
  friends,
  expanded,
  onToggle,
  onOpen
}: {
  label: string
  friends: EpicFriend[]
  expanded: boolean
  onToggle: () => void
  onOpen: (friend: EpicFriend, anchorY: number) => void
}) {
  if (friends.length === 0) return null

  return (
    <section className="friendsScreen__socialSection">
      <button
        type="button"
        className="friendsScreen__socialSectionToggle"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span>{label}</span>
        <span className="friendsScreen__socialSectionMeta">
          <PeopleIcon />
          {friends.length}
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </span>
      </button>
      {expanded && (
        <div className="friendsScreen__list">
          {friends.map((friend) => (
            <FriendRow
              key={friend.accountId}
              friend={friend}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function AddFriends({
  incoming,
  outgoing,
  query,
  results,
  searching,
  onQueryChange,
  onChanged
}: {
  incoming: EpicFriend[]
  outgoing: EpicFriend[]
  query: string
  results: EpicFriendSearchResult[]
  searching: boolean
  onQueryChange: (query: string) => void
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const [workingAccount, setWorkingAccount] = useState<string>()
  const pendingIds = new Set([
    ...incoming.map(({ accountId }) => accountId),
    ...outgoing.map(({ accountId }) => accountId)
  ])
  const sortedIncoming = [...incoming].sort(compareByAvatarGradient)
  const sortedOutgoing = [...outgoing].sort(compareByAvatarGradient)

  const runAction = async (action: EpicFriendAction) => {
    setWorkingAccount(action.accountId)
    try {
      await window.api.runEpicFriendAction(action)
      onChanged()
    } catch (error) {
      window.api.logError(String(error))
    } finally {
      setWorkingAccount(undefined)
    }
  }
  return (
    <div className="friendsScreen__addFriends">
      <TextField
        fullWidth
        size="small"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={t('friends.searchUsers', 'Search Epic users...')}
      />
      {query.trim().length > 0 && query.trim().length < 3 && (
        <p className="friendsScreen__sectionMessage">
          {t('friends.searchMinimum', 'Enter at least 3 characters.')}
        </p>
      )}
      {searching && (
        <p className="friendsScreen__sectionMessage">
          {t('friends.searching', 'Searching...')}
        </p>
      )}
      {results.length > 0 && (
        <FriendRequestSection
          title={t('friends.searchResults', 'Search results')}
          friends={results.map((result) => ({
            ...result,
            alias: '',
            epicDisplayName: result.displayName,
            status: 'outgoing',
            presenceStatus: 'unknown',
            mutual: 0,
            favorite: false,
            created: ''
          }))}
          actionLabel={(friend) =>
            pendingIds.has(friend.accountId)
              ? t('friends.requestPending', 'Pending')
              : t('friends.sendRequest', 'Add')
          }
          actionDisabled={(friend) => pendingIds.has(friend.accountId)}
          workingAccount={workingAccount}
          onAction={(friend) =>
            runAction({ type: 'add', accountId: friend.accountId })
          }
        />
      )}
      {sortedIncoming.length > 0 && (
        <FriendRequestSection
          title={t('friends.incomingRequests', 'Incoming requests')}
          friends={sortedIncoming}
          actionLabel={() => t('friends.accept', 'Accept')}
          workingAccount={workingAccount}
          onAction={(friend) =>
            runAction({ type: 'add', accountId: friend.accountId })
          }
        />
      )}
      {sortedOutgoing.length > 0 && (
        <FriendRequestSection
          title={t('friends.sentRequests', 'Sent requests')}
          friends={sortedOutgoing}
          actionLabel={() => t('friends.cancelRequest', 'Cancel')}
          workingAccount={workingAccount}
          onAction={(friend) =>
            runAction({ type: 'unfriend', accountId: friend.accountId })
          }
        />
      )}
    </div>
  )
}

function FriendRequestSection({
  title,
  friends,
  actionLabel,
  actionDisabled = () => false,
  workingAccount,
  onAction
}: {
  title: string
  friends: EpicFriend[]
  actionLabel: (friend: EpicFriend) => string
  actionDisabled?: (friend: EpicFriend) => boolean
  workingAccount?: string
  onAction: (friend: EpicFriend) => void
}) {
  return (
    <section className="friendsScreen__requestSection">
      <h3>
        {title} <span>{friends.length}</span>
      </h3>
      {friends.map((friend) => (
        <div className="friendsScreen__request" key={friend.accountId}>
          <div
            className={`friendsScreen__avatar friendsScreen__avatar--request ${avatarGradient(friend.accountId)}`}
          >
            {friend.displayName.charAt(0).toLocaleUpperCase()}
          </div>
          <strong>{friend.displayName}</strong>
          <Button
            disabled={
              workingAccount === friend.accountId || actionDisabled(friend)
            }
            onClick={() => onAction(friend)}
          >
            {actionLabel(friend)}
          </Button>
        </div>
      ))}
    </section>
  )
}

const FriendRow = memo(function FriendRow({
  friend,
  onOpen
}: {
  friend: EpicFriend
  onOpen: (friend: EpicFriend, anchorY: number) => void
}) {
  const { t } = useTranslation()
  const initial = friend.displayName.charAt(0).toLocaleUpperCase()
  const avatarPresence =
    friend.status === 'accepted'
      ? friend.presenceStatus === 'online'
        ? 'online'
        : friend.presenceStatus === 'away'
          ? 'away'
          : 'offline'
      : 'request'
  const detail =
    friend.status === 'accepted'
      ? friend.presenceStatus === 'offline'
        ? t('friends.presence.offline', 'Offline')
        : friend.presenceStatus === 'away'
          ? t('friends.presence.away', 'Away')
          : friend.presenceStatus === 'online'
            ? t('friends.presence.online', 'Online')
            : t('friends.presence.offline', 'Offline')
      : friend.status === 'incoming'
        ? t('friends.incomingRequest', 'Incoming request')
        : t('friends.sentRequest', 'Sent request')

  return (
    <div
      className={`friendsScreen__friend ${
        friend.status === 'accepted' ? 'friendsScreen__friend--clickable' : ''
      }`}
      role={friend.status === 'accepted' ? 'button' : undefined}
      tabIndex={friend.status === 'accepted' ? 0 : undefined}
      onClick={(event) => {
        if (friend.status !== 'accepted') return
        const bounds = event.currentTarget.getBoundingClientRect()
        onOpen(friend, bounds.top + bounds.height / 2)
      }}
      onKeyDown={(event) => {
        if (
          friend.status === 'accepted' &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault()
          const bounds = event.currentTarget.getBoundingClientRect()
          onOpen(friend, bounds.top + bounds.height / 2)
        }
      }}
    >
      <div
        className={`friendsScreen__avatar friendsScreen__avatar--${avatarPresence} ${avatarGradient(friend.accountId)}`}
        aria-hidden="true"
      >
        {initial}
      </div>
      <div className="friendsScreen__friendText">
        <div className="friendsScreen__friendName">
          <strong>{friend.displayName}</strong>
          {friend.alias &&
            friend.epicDisplayName &&
            friend.epicDisplayName !== friend.displayName && (
              <span>{friend.epicDisplayName}</span>
            )}
        </div>
        <span>{detail}</span>
      </div>
    </div>
  )
}, friendsMatch)

function friendsMatch(
  previous: Readonly<{ friend: EpicFriend }>,
  next: Readonly<{ friend: EpicFriend }>
) {
  const first = previous.friend
  const second = next.friend
  return (
    first.accountId === second.accountId &&
    first.displayName === second.displayName &&
    first.epicDisplayName === second.epicDisplayName &&
    first.presenceStatus === second.presenceStatus &&
    first.status === second.status &&
    first.mutual === second.mutual &&
    first.favorite === second.favorite &&
    first.created === second.created
  )
}

function FriendDetailsDialog({
  friend,
  anchorY,
  onClose,
  onChanged
}: {
  friend?: EpicFriend
  anchorY: number
  onClose: () => void
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const [details, setDetails] = useState<EpicFriendDetails>()
  const [alias, setAlias] = useState('')
  const [pendingAction, setPendingAction] = useState<
    Extract<EpicFriendAction, { type: 'block' | 'unfriend' }>['type']
  >()
  const [editingNickname, setEditingNickname] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [working, setWorking] = useState(false)
  const profileRef = useRef<HTMLElement>(null)
  const [profileTop, setProfileTop] = useState(24)

  useEffect(() => {
    setDetails(undefined)
    setAlias(friend?.alias ?? '')
    setPendingAction(undefined)
    setEditingNickname(false)
    setShowMoreOptions(false)
    if (!friend) return

    void window.api
      .getEpicFriendDetails(friend.accountId)
      .then(setDetails)
      .catch((error) => window.api.logError(String(error)))
  }, [friend])

  useLayoutEffect(() => {
    if (!friend) return

    const positionProfile = () => {
      const profile = profileRef.current
      if (!profile) return

      const margin = 24
      const maximumTop = Math.max(
        margin,
        window.innerHeight - profile.offsetHeight - margin
      )
      setProfileTop(
        Math.min(
          Math.max(anchorY - profile.offsetHeight / 2, margin),
          maximumTop
        )
      )
    }

    positionProfile()
    window.addEventListener('resize', positionProfile)
    return () => window.removeEventListener('resize', positionProfile)
  }, [anchorY, details, editingNickname, friend, showMoreOptions])

  if (!friend) return null

  const runAction = async (action: EpicFriendAction) => {
    setWorking(true)
    try {
      await window.api.runEpicFriendAction(action)
      onChanged()
      if (action.type !== 'setAlias') onClose()
    } catch (error) {
      window.api.logError(String(error))
    } finally {
      setWorking(false)
      setPendingAction(undefined)
    }
  }
  const epicDisplayName =
    friend.epicDisplayName ||
    details?.connections.find(({ type }) => type.toLocaleLowerCase() === 'epic')
      ?.displayName
  const externalConnections = details?.connections.filter(
    ({ type }) => type.toLocaleLowerCase() !== 'epic'
  )

  return (
    <>
      <aside
        ref={profileRef}
        className="friendsScreen__friendProfile"
        aria-label={t('friends.actions.open', 'Friend options')}
        style={{ top: profileTop }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="friendsScreen__friendProfileHeader">
          <IconButton
            aria-label={t('button.close', 'Close')}
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        </header>
        <div
          className={`friendsScreen__avatar friendsScreen__avatar--${
            friend.presenceStatus === 'online'
              ? 'online'
              : friend.presenceStatus === 'away'
                ? 'away'
                : 'offline'
          } ${avatarGradient(friend.accountId)}`}
        >
          {friend.displayName.charAt(0).toLocaleUpperCase()}
        </div>
        <h2>{friend.displayName}</h2>
        {friend.alias &&
          epicDisplayName &&
          epicDisplayName !== friend.displayName && (
            <strong>{epicDisplayName}</strong>
          )}
        <span className="friendsScreen__friendProfileStatus">
          {friend.presenceStatus === 'online'
            ? t('friends.presence.online', 'Online')
            : friend.presenceStatus === 'away'
              ? t('friends.presence.away', 'Away')
              : t('friends.presence.offline', 'Offline')}
        </span>
        <div className="friendsScreen__connections">
          {externalConnections?.map((connection) => (
            <Chip
              key={`${connection.type}-${connection.displayName}`}
              label={`${connection.type.toLocaleUpperCase()}: ${connection.displayName}`}
            />
          ))}
        </div>
        <Button
          variant="contained"
          onClick={() => setEditingNickname((editing) => !editing)}
        >
          {t('friends.actions.nickname', 'Change nickname')}
        </Button>
        {editingNickname && (
          <div className="friendsScreen__nicknameEditor">
          <TextField
            fullWidth
            label={t('friends.actions.nickname', 'Nickname')}
            value={alias}
            disabled={working}
            onChange={(event) => setAlias(event.target.value)}
          />
          <Button
            variant="contained"
            disabled={working || alias.trim() === friend.alias}
            onClick={() =>
              void runAction({
                type: 'setAlias',
                accountId: friend.accountId,
                alias
              })
            }
          >
            {t('friends.actions.saveNickname', 'Save nickname')}
          </Button>
          </div>
        )}
        <Button
          variant="contained"
          onClick={() => setShowMoreOptions((expanded) => !expanded)}
        >
          {showMoreOptions
            ? t('friends.actions.fewerOptions', 'Fewer options')
            : t('friends.actions.moreOptions', 'More options')}
        </Button>
        {showMoreOptions && (
          <div className="friendsScreen__moreOptions">
          <Button
            color="error"
            variant="outlined"
            disabled={working}
            onClick={() => setPendingAction('block')}
          >
            {t('friends.actions.block', 'Block')}
          </Button>
          <Button
            color="error"
            variant="outlined"
            disabled={working}
            onClick={() => setPendingAction('unfriend')}
          >
            {t('friends.actions.unfriend', 'Unfriend')}
          </Button>
          </div>
        )}
      </aside>
      <Dialog
        className="friendsScreen__dialog"
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction(undefined)}
      >
        <DialogTitle>
          {pendingAction === 'block'
            ? t('friends.actions.confirmBlock', 'Block this friend?')
            : t('friends.actions.confirmUnfriend', 'Unfriend this person?')}
        </DialogTitle>
        <DialogActions>
          <Button onClick={() => setPendingAction(undefined)}>
            {t('button.cancel', 'Cancel')}
          </Button>
          <Button
            color="error"
            disabled={working || !pendingAction}
            onClick={() =>
              pendingAction &&
              void runAction({ type: pendingAction, accountId: friend.accountId })
            }
          >
            {pendingAction === 'block'
              ? t('friends.actions.block', 'Block')
              : t('friends.actions.unfriend', 'Unfriend')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
