import './index.scss'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSpinner,
  faSearch,
  faTimes,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons'
import { CachedImage } from 'frontend/components/UI'
import TextInputWithIconField from 'frontend/components/UI/TextInputWithIconField'
import { SGDBGame, SGDBGrid } from 'common/types'

interface Props {
  initialTitle: string
  onSelect: (url: string) => void
  onClose: () => void
}

export default function SteamGridDBPicker({
  initialTitle,
  onSelect,
  onClose
}: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState(initialTitle)
  const [games, setGames] = useState<SGDBGame[]>([])
  const [grids, setGrids] = useState<SGDBGrid[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelectGame = useCallback(
    async (gameId: number) => {
      setSelectedGameId(gameId)
      setLoading(true)
      setError(null)
      setGrids([])
      try {
        const results = await window.api.steamgriddb.getGrids({
          gameId,
          styles: ['material', 'alternate', 'blurred'],
          dimensions: ['600x900', '342x482', '660x930']
        })
        setGrids(results)
        if (results.length === 0) {
          setError(
            t('steamgriddb.error.no-grids', 'No covers found for this game.')
          )
        }
      } catch (err) {
        setError(t('steamgriddb.error.grids', 'Failed to fetch grids'))
        console.error(err)
      } finally {
        setLoading(false)
      }
    },
    [t]
  )

  const searchGames = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery) return
      setLoading(true)
      setError(null)
      setGrids([])
      setGames([])
      setSelectedGameId(null)
      try {
        const results = await window.api.steamgriddb.searchGame(searchQuery)
        setGames(results)
        if (results.length === 1) {
          void handleSelectGame(results[0].id)
        } else if (results.length === 0) {
          setError(t('steamgriddb.error.no-games', 'No games found.'))
        }
      } catch (err) {
        setError(t('steamgriddb.error.search', 'Failed to search for games'))
        console.error(err)
      } finally {
        setLoading(false)
      }
    },
    [t, handleSelectGame]
  )

  const goBack = () => {
    setSelectedGameId(null)
    setGrids([])
    setError(null)
  }

  useEffect(() => {
    if (initialTitle) {
      void searchGames(initialTitle)
    }
  }, [initialTitle, searchGames])

  return (
    <div className="SteamGridDBPicker">
      <div className="SteamGridDBPicker__header">
        <div className="SteamGridDBPicker__title-group">
          {selectedGameId && (
            <button className="button is-ghost" onClick={goBack}>
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
          )}
          <h3>{t('steamgriddb.picker.title', 'SteamGridDB Covers')}</h3>
        </div>
        <button className="button is-ghost" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      {!selectedGameId && (
        <TextInputWithIconField
          htmlId="steamgriddb-search"
          label={t('steamgriddb.picker.search', 'Search Game')}
          value={query}
          onChange={setQuery}
          icon={<FontAwesomeIcon icon={faSearch} />}
          onIconClick={() => void searchGames(query)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void searchGames(query)
            }
          }}
        />
      )}

      {loading && (
        <div className="SteamGridDBPicker__loading">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        </div>
      )}

      {error && <div className="SteamGridDBPicker__error">{error}</div>}

      {!loading && games.length > 1 && !selectedGameId && (
        <div className="SteamGridDBPicker__games">
          <h4>{t('steamgriddb.picker.select-game', 'Select a Game:')}</h4>
          <ul>
            {games.map((game) => (
              <li key={game.id} onClick={() => void handleSelectGame(game.id)}>
                {game.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && grids.length > 0 && (
        <div className="SteamGridDBPicker__grids">
          {grids.map((grid) => (
            <div
              key={grid.id}
              className="SteamGridDBPicker__grid-item"
              onClick={() => onSelect(grid.url)}
            >
              <CachedImage src={grid.thumb} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
