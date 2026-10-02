import { useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import LibraryContext from 'frontend/screens/Library/LibraryContext'
import { CategoryFilterState } from 'frontend/types'
import Dropdown from '../Dropdown'
import TriStateToggle from '../TriStateToggle'

export default function CategoryFilter() {
  const {
    customCategories,
    currentCustomCategories,
    setCurrentCustomCategories
  } = useContext(ContextProvider)
  const { setShowCategories } = useContext(LibraryContext)
  const { t } = useTranslation()

  const cycleCategory = (category: string) => {
    const currentState = currentCustomCategories[category]
    const updated: Record<string, CategoryFilterState> = { ...currentCustomCategories }

    if (!currentState) {
      updated[category] = 'include'
    } else if (currentState === 'include') {
      updated[category] = 'exclude'
    } else {
      delete updated[category]
    }

    setCurrentCustomCategories(updated)
  }

  const setCategoryOnly = (category: string) => {
    setCurrentCustomCategories({ [category]: 'include' })
  }

  const resetAll = () => {
    setCurrentCustomCategories({})
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
    const val = categoryValue || categoryName
    const state = currentCustomCategories[val]

    const toggle = (
      <TriStateToggle
        htmlId={val}
        handleChange={() => cycleCategory(val)}
        value={state}
        title={categoryName}
      />
    )

    const onOnlyClick = () => {
      setCategoryOnly(val)
    }

    return toggleWithOnly(toggle, onOnlyClick, val)
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
        onClick={() => resetAll()}
      >
        {t('header.reset_filters', 'Reset Filters')}
      </button>
      <button
        className="button is-secondary is-small"
        onClick={() => setShowCategories(true)}
      >
        {t('categories-manager.title', 'Manage Categories')}
      </button>
    </Dropdown>
  )
}
