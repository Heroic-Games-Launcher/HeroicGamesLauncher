import { useCallback, useContext, useMemo } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import ToggleSwitch from '../ToggleSwitch'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import Dropdown from '../Dropdown'

export default function CategoryFilter() {
  const {
    customCategories,
    currentCustomCategories,
    setCurrentCustomCategories,
    genresCache,
    genresLoading,
    selectedGenres,
    setSelectedGenres,
    refreshGenres
  } = useContext(ContextProvider)
  const { setShowCategories } = useContext(LibraryContext)
  const { t } = useTranslation()

  const toggleCategory = useCallback(
    (category: string) => {
      if (currentCustomCategories.includes(category)) {
        setCurrentCustomCategories(
          currentCustomCategories.filter((cat) => cat !== category)
        )
      } else {
        setCurrentCustomCategories([...currentCustomCategories, category])
      }
    },
    [currentCustomCategories, setCurrentCustomCategories]
  )

  const setCategoryOnly = useCallback(
    (category: string) => {
      setCurrentCustomCategories([category])
      setSelectedGenres([])
    },
    [setCurrentCustomCategories, setSelectedGenres]
  )

  const selectAll = useCallback(() => {
    setCurrentCustomCategories(
      ['preset_uncategorized'].concat(customCategories.listCategories())
    )
  }, [customCategories, setCurrentCustomCategories])

  const toggleGenre = useCallback(
    (genre: string) => {
      if (selectedGenres.includes(genre)) {
        setSelectedGenres(selectedGenres.filter((g) => g !== genre))
      } else {
        setSelectedGenres([...selectedGenres, genre])
      }
    },
    [selectedGenres, setSelectedGenres]
  )

  const setGenreOnly = useCallback(
    (genre: string) => {
      setSelectedGenres([genre])
      setCurrentCustomCategories([])
    },
    [setSelectedGenres, setCurrentCustomCategories]
  )

  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>()
    for (const genres of Object.values(genresCache)) {
      for (const genre of genres) {
        genreSet.add(genre)
      }
    }
    return Array.from(genreSet).sort()
  }, [genresCache])

  const selectAllGenres = useCallback(() => {
    setSelectedGenres([...availableGenres])
  }, [availableGenres, setSelectedGenres])

  const toggleWithOnly = (
    toggle: JSX.Element,
    onOnlyClicked: () => void,
    category: string
  ) => {
    return (
      <div className="toggleWithOnly" key={category}>
        {toggle}
        <button className="only" onClick={() => onOnlyClicked()}>
          {t('header.only', 'only')}
        </button>
      </div>
    )
  }

  const categoryToggle = (categoryName: string, categoryValue?: string) => {
    const toggle = (
      <ToggleSwitch
        htmlId={categoryValue || categoryName}
        handleChange={() => toggleCategory(categoryValue || categoryName)}
        value={currentCustomCategories.includes(categoryValue || categoryName)}
        title={categoryName}
      />
    )

    const onOnlyClick = () => {
      setCategoryOnly(categoryValue || categoryName)
    }

    return toggleWithOnly(toggle, onOnlyClick, categoryValue || categoryName)
  }

  const genreToggle = useCallback(
    (genre: string) => {
      const toggle = (
        <ToggleSwitch
          htmlId={`genre_${genre}`}
          handleChange={() => toggleGenre(genre)}
          value={selectedGenres.includes(genre)}
          title={genre}
        />
      )

      return toggleWithOnly(toggle, () => setGenreOnly(genre), `genre_${genre}`)
    },
    [selectedGenres, toggleGenre, setGenreOnly]
  )

  const categoriesList = customCategories.listCategories()

  const genreToggles = useMemo(
    () => availableGenres.map((genre) => genreToggle(genre)),
    [availableGenres, genreToggle]
  )

  return (
    <Dropdown
      buttonClass="selectStyle"
      className="categoriesFilter"
      data-tour="library-categories"
      title={t('header.categories', 'Categories')}
      popUpOnHover
    >
      {categoriesList.length === 0 && (
        <>
          <span>
            {t(
              'header.no_categories',
              'No custom categories. Add categories using each game menu.'
            )}
          </span>
          <hr />
        </>
      )}
      {categoriesList.map((category) => categoryToggle(category))}
      {categoryToggle(
        t('header.uncategorized', 'Uncategorized'),
        'preset_uncategorized'
      )}
      <hr />
      <button
        type="reset"
        className="button is-primary"
        style={{ marginBottom: '0.3rem' }}
        onClick={() => selectAll()}
      >
        {t('header.select_all', 'Select All')}
      </button>
      <button
        className="button is-secondary is-small"
        onClick={() => setShowCategories(true)}
      >
        {t('categories-manager.title', 'Manage Categories')}
      </button>

      <hr />
      <span style={{ fontWeight: 'bold' }}>
        {t('header.genre_categories', 'Genres')}
      </span>
      {genresLoading && (
        <span style={{ fontStyle: 'italic' }}>
          {t('header.loading_genres', 'Loading genres...')}
        </span>
      )}
      {!genresLoading && availableGenres.length === 0 && (
        <span>
          {t('header.no_genres', 'No games with genre data available')}
        </span>
      )}
      <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>{genreToggles}</div>
      {availableGenres.length > 0 && (
        <>
          <hr />
          <button
            type="reset"
            className="button is-primary"
            style={{ marginBottom: '0.3rem' }}
            onClick={() => selectAllGenres()}
          >
            {t('header.select_all_genres', 'Select All Genres')}
          </button>
        </>
      )}
      <button
        className="button is-secondary is-small"
        onClick={() => refreshGenres()}
      >
        {t('header.refresh_genres', 'Refresh Genres')}
      </button>
    </Dropdown>
  )
}
