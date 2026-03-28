import { useContext, useMemo } from 'react'
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
    autoCategoriesCache,
    selectedAutoCategories,
    setSelectedAutoCategories,
    refreshAutoCategories
  } = useContext(ContextProvider)
  const { setShowCategories } = useContext(LibraryContext)
  const { t } = useTranslation()

  const toggleCategory = (category: string) => {
    if (currentCustomCategories.includes(category)) {
      const newCategories = currentCustomCategories.filter(
        (cat) => cat !== category
      )
      setCurrentCustomCategories(newCategories)
    } else {
      setCurrentCustomCategories([...currentCustomCategories, category])
    }
  }

  const setCategoryOnly = (category: string) => {
    setCurrentCustomCategories([category])
    setSelectedAutoCategories([])
  }

  const selectAll = () => {
    setCurrentCustomCategories(
      ['preset_uncategorized'].concat(customCategories.listCategories())
    )
  }

  const toggleGenre = (genre: string) => {
    if (selectedAutoCategories.includes(genre)) {
      setSelectedAutoCategories(
        selectedAutoCategories.filter((g) => g !== genre)
      )
    } else {
      setSelectedAutoCategories([...selectedAutoCategories, genre])
    }
  }

  const setGenreOnly = (genre: string) => {
    setSelectedAutoCategories([genre])
    setCurrentCustomCategories([])
  }

  // Collect all unique genres from the cache
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>()
    for (const genres of Object.values(autoCategoriesCache)) {
      for (const genre of genres) {
        genreSet.add(genre)
      }
    }
    return Array.from(genreSet).sort()
  }, [autoCategoriesCache])

  const selectAllGenres = () => {
    setSelectedAutoCategories([...availableGenres])
  }

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

  const genreToggle = (genre: string) => {
    const toggle = (
      <ToggleSwitch
        htmlId={`genre_${genre}`}
        handleChange={() => toggleGenre(genre)}
        value={selectedAutoCategories.includes(genre)}
        title={genre}
      />
    )

    return toggleWithOnly(toggle, () => setGenreOnly(genre), `genre_${genre}`)
  }

  const categoriesList = customCategories.listCategories()

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
      {availableGenres.length === 0 && (
        <span>
          {t(
            'header.no_genres',
            'No games with genre data available'
          )}
        </span>
      )}
      {availableGenres.map((genre) => genreToggle(genre))}
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
        onClick={() => refreshAutoCategories()}
      >
        {t('header.refresh_genres', 'Refresh Genres')}
      </button>
    </Dropdown>
  )
}
